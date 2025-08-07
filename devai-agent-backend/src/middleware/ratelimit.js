// src/middleware/rateLimit.js - Versión corregida
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * 🔧 Configuración base de rate limiting
 */
const rateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests por ventana
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  
  // Función para generar key personalizada
  keyGenerator: (req) => {
    // Usar user ID si está autenticado, sino IP
    return req.user?.id || req.ip;
  },
  
  // Función para manejar límite excedido
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method
    });

    res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
      error: 'Rate limit exceeded',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000),
      code: 'RATE_LIMIT_EXCEEDED'
    });
  },
  
  // Información en headers
  standardHeaders: true,
  legacyHeaders: false,
  
  // Usar store en memoria por defecto (sin Redis por ahora)
  // store: createRedisStore() // ❌ Desactivar Redis store temporalmente
};

/**
 * 🔴 Store en memoria como fallback
 */
function createMemoryStore() {
  const hits = new Map();
  
  return {
    incr: (key) => {
      const now = Date.now();
      const windowStart = Math.floor(now / rateLimitConfig.windowMs) * rateLimitConfig.windowMs;
      const windowKey = `${key}:${windowStart}`;
      
      let hitData = hits.get(windowKey);
      if (!hitData) {
        hitData = { count: 0, resetTime: windowStart + rateLimitConfig.windowMs };
        hits.set(windowKey, hitData);
      }
      
      hitData.count++;
      
      // Limpiar keys antiguas
      for (const [k, v] of hits.entries()) {
        if (v.resetTime < now) {
          hits.delete(k);
        }
      }
      
      return Promise.resolve({
        totalHits: hitData.count,
        resetTime: hitData.resetTime
      });
    },
    
    decrement: (key) => {
      // Implementación básica
      return Promise.resolve();
    },
    
    resetKey: (key) => {
      const keysToDelete = [];
      for (const k of hits.keys()) {
        if (k.startsWith(key)) {
          keysToDelete.push(k);
        }
      }
      keysToDelete.forEach(k => hits.delete(k));
      return Promise.resolve();
    }
  };
}

/**
 * 🔴 Crear store de Redis (con manejo de errores mejorado)
 */
function createRedisStore() {
  return {
    async incr(key) {
      try {
        // Importar cache de forma segura
        const { cache } = require('../config/redis');
        
        // Verificar que cache y sus métodos existan
        if (!cache || typeof cache.incr !== 'function') {
          logger.warn('Redis cache not available, falling back to memory store');
          throw new Error('Redis cache not properly initialized');
        }
        
        const current = await cache.incr(key);
        
        // Si es la primera vez, establecer TTL
        if (current === 1) {
          await cache.expire(key, Math.ceil(rateLimitConfig.windowMs / 1000));
        }
        
        return {
          totalHits: current,
          resetTime: Date.now() + rateLimitConfig.windowMs
        };
      } catch (error) {
        logger.error('Error in Redis rate limit store:', { 
          error: error.message,
          key: key
        });
        // Fallback: permitir la request si hay error con Redis
        return { totalHits: 1, resetTime: Date.now() + rateLimitConfig.windowMs };
      }
    },
    
    async decrement(key) {
      try {
        const { cache } = require('../config/redis');
        if (cache && typeof cache.incr === 'function') {
          await cache.incr(key, -1);
        }
      } catch (error) {
        logger.error('Error decrementing rate limit counter:', { 
          error: error.message,
          key: key 
        });
      }
    },
    
    async resetKey(key) {
      try {
        const { cache } = require('../config/redis');
        if (cache && typeof cache.del === 'function') {
          await cache.del(key);
        }
      } catch (error) {
        logger.error('Error resetting rate limit key:', { 
          error: error.message,
          key: key 
        });
      }
    }
  };
}

/**
 * 🚦 Rate limiters específicos
 */

// Rate limiter general para toda la API (usando memoria por defecto)
const generalRateLimit = rateLimit({
  ...rateLimitConfig,
  max: 100, // 100 requests por 15 minutos
  message: {
    success: false,
    message: 'Demasiadas solicitudes generales',
    code: 'GENERAL_RATE_LIMIT'
  },
  // Usar store en memoria por seguridad
  store: process.env.REDIS_ENABLED === 'true' ? createRedisStore() : createMemoryStore()
});

// Rate limiter estricto para autenticación
const authRateLimit = rateLimit({
  ...rateLimitConfig,
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Solo 5 intentos de login por IP cada 15 minutos
  keyGenerator: (req) => req.ip, // Solo por IP, no por usuario
  message: {
    success: false,
    message: 'Demasiados intentos de autenticación. Intenta en 15 minutos.',
    code: 'AUTH_RATE_LIMIT'
  },
  store: createMemoryStore(), // Siempre usar memoria para auth por seguridad
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl
    });

    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de autenticación. Intenta en 15 minutos.',
      retryAfter: 900, // 15 minutos
      code: 'AUTH_RATE_LIMIT'
    });
  }
});

// Rate limiter para upload de archivos
const uploadRateLimit = rateLimit({
  ...rateLimitConfig,
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 uploads por hora
  store: createMemoryStore(),
  message: {
    success: false,
    message: 'Límite de uploads alcanzado. Intenta en una hora.',
    code: 'UPLOAD_RATE_LIMIT'
  }
});

// Rate limiter para APIs de IA
const aiRateLimit = rateLimit({
  ...rateLimitConfig,
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // 20 requests de IA por minuto
  store: createMemoryStore(),
  message: {
    success: false,
    message: 'Límite de requests de IA alcanzado. Intenta en un minuto.',
    code: 'AI_RATE_LIMIT'
  }
});

/**
 * 🧪 Funciones para testing
 */
const testHelpers = {
  // Rate limiter mock que siempre permite
  allowAllRateLimit: (req, res, next) => next(),
  
  // Rate limiter mock que siempre bloquea
  blockAllRateLimit: (req, res, next) => {
    res.status(429).json({
      success: false,
      message: 'Rate limit mock - blocked',
      code: 'TEST_RATE_LIMIT'
    });
  },
  
  // Obtener configuración de rate limit
  getConfig: () => rateLimitConfig
};

module.exports = {
  generalRateLimit,
  authRateLimit,
  uploadRateLimit,
  aiRateLimit,
  testHelpers
};