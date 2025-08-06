// ============================================
// 🔐 JWT CONFIGURATION
// ============================================

import jwt from 'jsonwebtoken';
import { cache } from './redis.js';
import { log } from './logger.js';

/**
 * 🔧 Configuración JWT
 */
const jwtConfig = {
  secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  issuer: 'devai-agent',
  audience: 'devai-users',
  algorithm: 'HS256'
};

/**
 * 🎯 Clase JWT Service
 */
export class JWTService {
  constructor() {
    this.blacklistPrefix = 'jwt:blacklist:';
    this.refreshPrefix = 'jwt:refresh:';
    
    // Validar configuración en producción
    if (process.env.NODE_ENV === 'production') {
      this.validateProductionConfig();
    }
  }

  /**
   * ✅ Validar configuración para producción
   */
  validateProductionConfig() {
    if (jwtConfig.secret === 'fallback-secret-change-in-production') {
      throw new Error('JWT_SECRET debe ser configurado en producción');
    }
    
    if (jwtConfig.refreshSecret === 'fallback-refresh-secret') {
      throw new Error('JWT_REFRESH_SECRET debe ser configurado en producción');
    }
    
    if (jwtConfig.secret.length < 32) {
      throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
    }
  }

  /**
   * 🎫 Generar token de acceso
   */
  generateAccessToken(payload) {
    try {
      const tokenPayload = {
        ...payload,
        type: 'access',
        iat: Math.floor(Date.now() / 1000)
      };

      const token = jwt.sign(tokenPayload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        algorithm: jwtConfig.algorithm
      });

      log.debug('Access token generated', {
        userId: payload.userId,
        expiresIn: jwtConfig.expiresIn
      });

      return token;
    } catch (error) {
      log.error('Error generating access token', { error: error.message });
      throw new Error('Token generation failed');
    }
  }

  /**
   * 🔄 Generar refresh token
   */
  generateRefreshToken(payload) {
    try {
      const tokenPayload = {
        userId: payload.userId,
        email: payload.email,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000)
      };

      const refreshToken = jwt.sign(tokenPayload, jwtConfig.refreshSecret, {
        expiresIn: jwtConfig.refreshExpiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        algorithm: jwtConfig.algorithm
      });

      // Guardar refresh token en Redis
      this.storeRefreshToken(payload.userId, refreshToken);

      log.debug('Refresh token generated', {
        userId: payload.userId,
        expiresIn: jwtConfig.refreshExpiresIn
      });

      return refreshToken;
    } catch (error) {
      log.error('Error generating refresh token', { error: error.message });
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * 🎫 Generar par de tokens
   */
  generateTokenPair(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      isActive: user.isActive
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
      expiresIn: jwtConfig.expiresIn,
      tokenType: 'Bearer'
    };
  }

  /**
   * 🔍 Verificar token de acceso
   */
  async verifyAccessToken(token) {
    try {
      // Verificar si el token está en blacklist
      if (await this.isTokenBlacklisted(token)) {
        throw new Error('Token is blacklisted');
      }

      const decoded = jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        algorithms: [jwtConfig.algorithm]
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      log.debug('Access token verified', {
        userId: decoded.userId,
        exp: new Date(decoded.exp * 1000)
      });

      return decoded;
    } catch (error) {
      log.warn('Access token verification failed', {
        error: error.message,
        token: token.substring(0, 20) + '...'
      });
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * 🔄 Verificar refresh token
   */
  async verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, jwtConfig.refreshSecret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        algorithms: [jwtConfig.algorithm]
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Verificar si el refresh token existe en Redis
      const storedToken = await this.getStoredRefreshToken(decoded.userId);
      if (storedToken !== token) {
        throw new Error('Refresh token not found or invalid');
      }

      log.debug('Refresh token verified', {
        userId: decoded.userId,
        exp: new Date(decoded.exp * 1000)
      });

      return decoded;
    } catch (error) {
      log.warn('Refresh token verification failed', {
        error: error.message,
        token: token.substring(0, 20) + '...'
      });
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * 🔄 Renovar tokens
   */
  async refreshTokens(refreshToken) {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken);
      
      // Crear nuevo par de tokens
      const newTokens = this.generateTokenPair({
        id: decoded.userId,
        email: decoded.email,
        username: decoded.username,
        name: decoded.name,
        isActive: true
      });

      // Invalidar el refresh token anterior
      await this.revokeRefreshToken(decoded.userId);

      log.info('Tokens refreshed successfully', { userId: decoded.userId });

      return newTokens;
    } catch (error) {
      log.error('Token refresh failed', { error: error.message });
      throw error;
    }
  }

  /**
   * 🚫 Agregar token a blacklist
   */
  async blacklistToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return false;
      }

      const key = `${this.blacklistPrefix}${token}`;
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);

      if (ttl > 0) {
        await cache.set(key, true, ttl);
        log.info('Token blacklisted', {
          userId: decoded.userId,
          exp: new Date(decoded.exp * 1000)
        });
      }

      return true;
    } catch (error) {
      log.error('Error blacklisting token', { error: error.message });
      return false;
    }
  }

  /**
   * 🔍 Verificar si token está en blacklist
   */
  async isTokenBlacklisted(token) {
    try {
      const key = `${this.blacklistPrefix}${token}`;
      const result = await cache.get(key);
      return result !== null;
    } catch (error) {
      log.error('Error checking token blacklist', { error: error.message });
      return false;
    }
  }

  /**
   * 💾 Almacenar refresh token
   */
  async storeRefreshToken(userId, refreshToken) {
    try {
      const key = `${this.refreshPrefix}${userId}`;
      const decoded = jwt.decode(refreshToken);
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);

      if (ttl > 0) {
        await cache.set(key, refreshToken, ttl);
      }
    } catch (error) {
      log.error('Error storing refresh token', { error: error.message });
    }
  }

  /**
   * 📥 Obtener refresh token almacenado
   */
  async getStoredRefreshToken(userId) {
    try {
      const key = `${this.refreshPrefix}${userId}`;
      return await cache.get(key);
    } catch (error) {
      log.error('Error getting stored refresh token', { error: error.message });
      return null;
    }
  }

  /**
   * 🗑️ Revocar refresh token
   */
  async revokeRefreshToken(userId) {
    try {
      const key = `${this.refreshPrefix}${userId}`;
      await cache.del(key);
      log.info('Refresh token revoked', { userId });
    } catch (error) {
      log.error('Error revoking refresh token', { error: error.message });
    }
  }

  /**
   * 🚪 Logout - revocar todos los tokens
   */
  async logout(accessToken, userId) {
    try {
      // Blacklist del access token
      await this.blacklistToken(accessToken);
      
      // Revocar refresh token
      await this.revokeRefreshToken(userId);
      
      log.info('User logged out successfully', { userId });
    } catch (error) {
      log.error('Error during logout', { error: error.message, userId });
    }
  }

  /**
   * 🧹 Limpiar tokens expirados (función de mantenimiento)
   */
  async cleanupExpiredTokens() {
    try {
      // Redis TTL maneja esto automáticamente
      // Esta función puede usarse para limpieza adicional si es necesario
      log.info('Token cleanup completed');
    } catch (error) {
      log.error('Error during token cleanup', { error: error.message });
    }
  }

  /**
   * 📊 Obtener estadísticas de tokens
   */
  async getTokenStats() {
    try {
      const blacklistKeys = await cache.keys(`${this.blacklistPrefix}*`);
      const refreshKeys = await cache.keys(`${this.refreshPrefix}*`);

      return {
        blacklistedTokens: blacklistKeys.length,
        activeRefreshTokens: refreshKeys.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      log.error('Error getting token stats', { error: error.message });
      return null;
    }
  }

  /**
   * 🔍 Decodificar token sin verificar
   */
  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      log.error('Error decoding token', { error: error.message });
      return null;
    }
  }

  /**
   * ⏰ Obtener tiempo de expiración
   */
  getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      log.error('Error getting token expiration', { error: error.message });
      return null;
    }
  }
}

/**
 * 🎯 Instancia global del servicio JWT
 */
export const jwtService = new JWTService();

/**
 * 🔧 Funciones de conveniencia
 */
export const jwt_utils = {
  // Generar tokens
  generateTokens: (user) => jwtService.generateTokenPair(user),
  
  // Verificar tokens
  verifyAccess: (token) => jwtService.verifyAccessToken(token),
  verifyRefresh: (token) => jwtService.verifyRefreshToken(token),
  
  // Renovar tokens
  refresh: (refreshToken) => jwtService.refreshTokens(refreshToken),
  
  // Logout
  logout: (accessToken, userId) => jwtService.logout(accessToken, userId),
  
  // Utilidades
  decode: (token) => jwtService.decodeToken(token),
  getExpiration: (token) => jwtService.getTokenExpiration(token),
  isExpired: (token) => {
    const exp = jwtService.getTokenExpiration(token);
    return exp ? exp < new Date() : true;
  }
};

/**
 * 🧪 Configuración para testing
 */
export const createTestTokens = (user) => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('createTestTokens solo puede usarse en entorno de test');
  }
  
  return jwtService.generateTokenPair(user);
};

export default jwtService;