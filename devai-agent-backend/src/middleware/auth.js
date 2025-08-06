// ============================================
// 🔐 AUTHENTICATION MIDDLEWARE
// ============================================

import { jwtService } from '../config/jwt.js';
import { prisma } from '../config/database.js';
import { log } from '../config/logger.js';
import { cache } from '../config/redis.js';

/**
 * 🔐 Middleware de autenticación principal
 */
export const authenticate = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remover 'Bearer '

    // Verificar token
    const decoded = await jwtService.verifyAccessToken(token);

    // Obtener usuario del cache primero
    let user = await cache.get(`user:${decoded.userId}`);
    
    if (!user) {
      // Si no está en cache, obtener de la base de datos
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatar: true,
          isActive: true,
          preferences: true,
          settings: true,
          lastLoginAt: true
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        });
      }

      // Guardar en cache por 15 minutos
      await cache.set(`user:${user.id}`, user, 900);
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta de usuario desactivada',
        code: 'USER_INACTIVE'
      });
    }

    // Agregar información del usuario y token al request
    req.user = user;
    req.token = token;
    req.tokenPayload = decoded;

    // Log de actividad de autenticación
    log.debug('User authenticated', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    next();
  } catch (error) {
    log.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * 🔐 Middleware de autenticación opcional
 * Permite acceso sin token pero agrega info del usuario si está presente
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = await jwtService.verifyAccessToken(token);
        
        let user = await cache.get(`user:${decoded.userId}`);
        
        if (!user) {
          user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
              id: true,
              email: true,
              username: true,
              name: true,
              avatar: true,
              isActive: true,
              preferences: true
            }
          });
          
          if (user && user.isActive) {
            await cache.set(`user:${user.id}`, user, 900);
          }
        }
        
        if (user && user.isActive) {
          req.user = user;
          req.token = token;
          req.tokenPayload = decoded;
        }
      } catch (error) {
        // Token inválido, pero permitir continuar sin autenticación
        log.debug('Optional auth failed, continuing without user', {
          error: error.message
        });
      }
    }
    
    next();
  } catch (error) {
    log.error('Error in optional auth middleware', {
      error: error.message
    });
    next();
  }
};

/**
 * 👑 Middleware para verificar roles/permisos
 */
export const requireRole = (roles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Autenticación requerida',
          code: 'AUTH_REQUIRED'
        });
      }

      // Por ahora, todos los usuarios autenticados tienen acceso
      // En el futuro se pueden agregar roles específicos
      const userRole = req.user.role || 'user';
      
      if (roles.length > 0 && !roles.includes(userRole)) {
        log.security('Access denied - insufficient role', {
          userId: req.user.id,
          userRole: userRole,
          requiredRoles: roles,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'Permisos insuficientes',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      next();
    } catch (error) {
      log.error('Error in role middleware', {
        error: error.message,
        userId: req.user?.id
      });

      return res.status(500).json({
        success: false,
        message: 'Error verificando permisos',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

/**
 * 🔒 Middleware para verificar ownership de recursos
 */
export const requireOwnership = (resourceType, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Autenticación requerida',
          code: 'AUTH_REQUIRED'
        });
      }

      const resourceId = req.params[resourceIdParam];
      const userId = req.user.id;

      let resource;

      switch (resourceType) {
        case 'conversation':
          resource = await prisma.conversation.findUnique({
            where: { id: resourceId },
            select: { userId: true }
          });
          break;
          
        case 'project':
          resource = await prisma.project.findUnique({
            where: { id: resourceId },
            select: { userId: true }
          });
          break;
          
        case 'message':
          resource = await prisma.message.findUnique({
            where: { id: resourceId },
            include: {
              conversation: {
                select: { userId: true }
              }
            }
          });
          if (resource) {
            resource.userId = resource.conversation.userId;
          }
          break;
          
        default:
          return res.status(500).json({
            success: false,
            message: 'Tipo de recurso no soportado',
            code: 'UNSUPPORTED_RESOURCE_TYPE'
          });
      }

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      if (resource.userId !== userId) {
        log.security('Access denied - resource ownership violation', {
          userId: userId,
          resourceType: resourceType,
          resourceId: resourceId,
          ownerId: resource.userId,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este recurso',
          code: 'RESOURCE_OWNERSHIP_DENIED'
        });
      }

      // Agregar el recurso al request para evitar otra consulta
      req.resource = resource;
      
      next();
    } catch (error) {
      log.error('Error in ownership middleware', {
        error: error.message,
        userId: req.user?.id,
        resourceType: resourceType,
        resourceId: req.params[resourceIdParam]
      });

      return res.status(500).json({
        success: false,
        message: 'Error verificando ownership',
        code: 'OWNERSHIP_CHECK_ERROR'
      });
    }
  };
};

/**
 * 🔄 Middleware para refresh token
 */
export const authenticateRefresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token requerido',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    // Verificar refresh token
    const decoded = await jwtService.verifyRefreshToken(refreshToken);

    // Obtener usuario
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta de usuario desactivada',
        code: 'USER_INACTIVE'
      });
    }

    req.user = user;
    req.refreshToken = refreshToken;
    req.refreshPayload = decoded;

    next();
  } catch (error) {
    log.warn('Refresh token authentication failed', {
      error: error.message,
      ip: req.ip
    });

    return res.status(401).json({
      success: false,
      message: 'Refresh token inválido o expirado',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
};

/**
 * 🚪 Middleware para logout
 */
export const authenticateForLogout = async (req, res, next) => {
  try {
    // Intentar obtener token del header o body
    let token = null;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.body.token) {
      token = req.body.token;
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token requerido para logout',
        code: 'TOKEN_REQUIRED'
      });
    }

    // Intentar decodificar el token (aunque esté expirado)
    const decoded = jwtService.decodeToken(token);
    
    if (!decoded || !decoded.payload.userId) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }

    req.token = token;
    req.userId = decoded.payload.userId;
    
    next();
  } catch (error) {
    log.error('Error in logout authentication', {
      error: error.message,
      ip: req.ip
    });

    return res.status(500).json({
      success: false,
      message: 'Error procesando logout',
      code: 'LOGOUT_ERROR'
    });
  }
};

/**
 * 📊 Middleware para actualizar última actividad
 */
export const updateLastActivity = async (req, res, next) => {
  if (req.user) {
    try {
      // Actualizar en cache primero
      const cacheKey = `user:${req.user.id}`;
      const cachedUser = await cache.get(cacheKey);
      
      if (cachedUser) {
        cachedUser.lastLoginAt = new Date();
        await cache.set(cacheKey, cachedUser, 900);
      }

      // Actualizar en BD de forma asíncrona (no bloquear request)
      prisma.user.update({
        where: { id: req.user.id },
        data: { lastLoginAt: new Date() }
      }).catch(error => {
        log.error('Error updating last activity', {
          error: error.message,
          userId: req.user.id
        });
      });

    } catch (error) {
      log.error('Error in updateLastActivity middleware', {
        error: error.message,
        userId: req.user.id
      });
    }
  }
  
  next();
};

/**
 * 🛡️ Middleware para validar API key de usuario
 */
export const validateApiKey = (provider) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Autenticación requerida',
          code: 'AUTH_REQUIRED'
        });
      }

      // Buscar API key del usuario para el proveedor especificado
      const apiKey = await prisma.apiKey.findFirst({
        where: {
          userId: req.user.id,
          provider: provider,
          isActive: true
        }
      });

      if (!apiKey) {
        return res.status(400).json({
          success: false,
          message: `API key para ${provider} no configurada`,
          code: 'API_KEY_NOT_CONFIGURED'
        });
      }

      // Agregar la API key al request (sin exponer el hash completo)
      req.apiKey = {
        id: apiKey.id,
        provider: apiKey.provider,
        name: apiKey.name
      };

      next();
    } catch (error) {
      log.error('Error validating API key', {
        error: error.message,
        userId: req.user?.id,
        provider: provider
      });

      return res.status(500).json({
        success: false,
        message: 'Error validando API key',
        code: 'API_KEY_VALIDATION_ERROR'
      });
    }
  };
};

/**
 * 🧪 Funciones para testing
 */
export const testHelpers = {
  // Crear mock user para testing
  createMockUser: () => ({
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    isActive: true
  }),
  
  // Simular autenticación en tests
  mockAuth: (user) => (req, res, next) => {
    req.user = user || testHelpers.createMockUser();
    next();
  },
  
  // Simular ownership en tests
  mockOwnership: (resource) => (req, res, next) => {
    req.resource = resource;
    next();
  }
};

export default {
  authenticate,
  optionalAuth,
  requireRole,
  requireOwnership,
  authenticateRefresh,
  authenticateForLogout,
  updateLastActivity,
  validateApiKey,
  testHelpers
};