// ============================================
// 🚦 RATE LIMITING MIDDLEWARE
// ============================================

const rateLimit = require('express-rate-limit');
const { cache } = require('../config/redis');
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
  
  // Store personalizado con Redis
  store: createRedisStore()
};

/**
 * 🔴 Crear store de Redis para rate limiting
 */
function createRedisStore() {
  return {
    async incr(key) {
      try {
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
        logger.error('Error in Redis rate limit store', { error: error.message });
        // Fallback: permitir la request si hay error con Redis
        return { totalHits: 1, resetTime: Date.now() + rateLimitConfig.windowMs };
      }
    },
    
    async decrement(key) {
      try {
        await cache.incr(key, -1);
      } catch (error) {
        logger.error('Error decrementing rate limit counter', { error: error.message });
      }
    },
    
    async resetKey(key) {
      try {
        await cache.del(key);
      } catch (error) {
        logger.error('Error resetting rate limit key', { error: error.message });
      }
    }
  };
}

/**
 * 🚦 Rate limiters específicos
 */

// Rate limiter general para toda la API
const generalRateLimit = rateLimit({
  ...rateLimitConfig,
  max: 100, // 100 requests por 15 minutos
  message: {
    success: false,
    message: 'Demasiadas solicitudes generales',
    code: 'GENERAL_RATE_LIMIT'
  }
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
  message: {
    success: false,
    message: 'Límite de requests de IA alcanzado. Intenta en un minuto.',
    code: 'AI_RATE_LIMIT'
  }
});

// Rate limiter para creación de recursos
const createRateLimit = rateLimit({
  ...rateLimitConfig,
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 creaciones por minuto
  message: {
    success: false,
    message: 'Límite de creación de recursos alcanzado.',
    code: 'CREATE_RATE_LIMIT'
  }
});

// Rate limiter muy permisivo para lectura
const readRateLimit = rateLimit({
  ...rateLimitConfig,
  max: 200, // 200 requests de lectura por 15 minutos
  message: {
    success: false,
    message: 'Límite de lectura alcanzado.',
    code: 'READ_RATE_LIMIT'
  }
});

/**
 * 🎯 Rate limiters adaptativos basados en usuario
 */

// Rate limiter premium para usuarios autenticados
const authenticatedRateLimit = rateLimit({
  ...rateLimitConfig,
  max: (req) => {
    // Usuarios autenticados obtienen más requests
    if (req.user) {
      return 200; // 200 requests para usuarios autenticados
    }
    return 50; // 50 requests para usuarios anónimos
  },
  keyGenerator: (req) => {
    return req.user?.id || `anon:${req.ip}`;
  },
  message: (req) => ({
    success: false,
    message: req.user 
      ? 'Límite para usuario autenticado alcanzado' 
      : 'Límite para usuario anónimo alcanzado. Inicia sesión para más requests.',
    code: req.user ? 'AUTH_USER_RATE_LIMIT' : 'ANON_USER_RATE_LIMIT'
  })
});

/**
 * 🔧 Middleware personalizado para rate limiting avanzado
 */
const createCustomRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    keyGenerator = (req) => req.user?.id || req.ip,
    message = 'Rate limit exceeded',
    skipIf = () => false,
    onLimitReached = () => {},
    points = 1 // Puntos a consumir por request
  } = options;

  return async (req, res, next) => {
    try {
      // Verificar si debe saltarse el rate limiting
      if (skipIf(req)) {
        return next();
      }

      const key = `rate_limit:${keyGenerator(req)}`;
      const window = Math.floor(Date.now() / windowMs);
      const windowKey = `${key}:${window}`;

      // Obtener conteo actual
      const current = await cache.get(windowKey) || 0;

      // Verificar si excede el límite
      if (current >= max) {
        // Callback cuando se alcanza el límite
        onLimitReached(req, res);

        logger.warn('Custom rate limit exceeded', {
          key: key,
          current: current,
          max: max,
          ip: req.ip,
          userId: req.user?.id
        });

        return res.status(429).json({
          success: false,
          message: typeof message === 'function' ? message(req) : message,
          current: current,
          max: max,
          resetTime: (window + 1) * windowMs,
          code: 'CUSTOM_RATE_LIMIT'
        });
      }

      // Incrementar contador
      const newCount = await cache.incr(windowKey, points);
      
      // Establecer TTL si es la primera vez
      if (newCount === points) {
        await cache.expire(windowKey, Math.ceil(windowMs / 1000));
      }

      // Agregar headers informativos
      res.set({
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': Math.max(0, max - newCount),
        'X-RateLimit-Reset': new Date((window + 1) * windowMs).toISOString()
      });

      next();
    } catch (error) {
      logger.error('Error in custom rate limit middleware', {
        error: error.message,
        ip: req.ip,
        userId: req.user?.id
      });
      
      // En caso de error, permitir la request
      next();
    }
  };
};

/**
 * 🛡️ Rate limiter basado en puntos para diferentes acciones
 */
const pointsRateLimit = createCustomRateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 puntos por minuto
  keyGenerator: (req) => req.user?.id || req.ip,
  message: 'Límite de puntos de actividad alcanzado',
  points: (req) => {
    // Diferentes acciones consumen diferentes puntos
    const method = req.method.toLowerCase();
    const path = req.path.toLowerCase();
    
    if (path.includes('/ai/')) return 10; // AI requests cuestan 10 puntos
    if (path.includes('/upload')) return 20; // Uploads cuestan 20 puntos
    if (method === 'post') return 5; // POST requests cuestan 5 puntos
    if (method === 'put' || method === 'patch') return 3; // Updates cuestan 3 puntos
    if (method === 'delete') return 2; // DELETE cuesta 2 puntos
    return 1; // GET requests cuestan 1 punto
  }
});

/**
 * 🔄 Rate limiter con burst allowance
 */
const burstRateLimit = createCustomRateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // 60 requests por minuto normalmente
  keyGenerator: (req) => req.user?.id || req.ip,
  skipIf: async (req) => {
    // Permitir burst de hasta 20 requests adicionales si el usuario
    // ha estado inactivo por más de 5 minutos
    const key = `last_activity:${req.user?.id || req.ip}`;
    const lastActivity = await cache.get(key);
    const now = Date.now();
    
    if (!lastActivity || (now - lastActivity) > 5 * 60 * 1000) {
      // Actualizar última actividad
      await cache.set(key, now, 600); // 10 minutos TTL
      return false; // No saltarse, pero permitir burst
    }
    
    return false;
  }
});

/**
 * 📊 Middleware para métricas de rate limiting
 */
const rateLimitMetrics = () => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      // Si es un error de rate limit, registrar métrica
      if (res.statusCode === 429) {
        logger.info('Rate limit hit', {
          endpoint: req.originalUrl,
          method: req.method,
          userId: req.user?.id || 'anonymous',
          ip: req.ip
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * 🧹 Función de limpieza para keys de rate limiting
 */
const cleanupRateLimitKeys = async () => {
  try {
    const keys = await cache.keys('rate_limit:*');
    let cleanedCount = 0;
    
    for (const key of keys) {
      const ttl = await cache.client.ttl(key);
      
      // Si la key no tiene TTL o ya expiró, eliminarla
      if (ttl <= 0) {
        await cache.del(key);
        cleanedCount++;
      }
    }
    
    logger.info('Rate limit keys cleanup completed', {
      totalKeys: keys.length,
      cleanedKeys: cleanedCount
    });
    
    return cleanedCount;
  } catch (error) {
    logger.error('Error cleaning up rate limit keys', {
      error: error.message
    });
    return 0;
  }
};

/**
 * 🔍 Obtener estadísticas de rate limiting
 */
const getRateLimitStats = async (userId = null, ip = null) => {
  try {
    const keys = [];
    
    if (userId) {
      keys.push(`rate_limit:${userId}:*`);
    }
    if (ip) {
      keys.push(`rate_limit:${ip}:*`);
    }
    
    const stats = {};
    
    for (const pattern of keys) {
      const matchingKeys = await cache.keys(pattern);
      
      for (const key of matchingKeys) {
        const value = await cache.get(key);
        const ttl = await cache.client.ttl(key);
        
        stats[key] = {
          current: value,
          ttl: ttl,
          expiresAt: new Date(Date.now() + (ttl * 1000))
        };
      }
    }
    
    return stats;
  } catch (error) {
    logger.error('Error getting rate limit stats', {
      error: error.message,
      userId: userId,
      ip: ip
    });
    return {};
  }
};

/**
 * 🧪 Funciones para testing
 */
const testHelpers = {
  // Resetear rate limits para testing
  resetRateLimit: async (key) => {
    try {
      const keys = await cache.keys(`rate_limit:${key}:*`);
      for (const k of keys) {
        await cache.del(k);
      }
    } catch (error) {
      console.error('Error resetting rate limit:', error);
    }
  },
  
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
  createRateLimit,
  readRateLimit,
  authenticatedRateLimit,
  pointsRateLimit,
  burstRateLimit,
  createCustomRateLimit,
  rateLimitMetrics,
  cleanupRateLimitKeys,
  getRateLimitStats,
  testHelpers
};