const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

// =================================
// MIDDLEWARE DE REQUEST LOGGING
// =================================

const requestLogger = (req, res, next) => {
  // Generar ID único para el request
  req.requestId = uuidv4();
  
  // Agregar request ID a los headers de respuesta
  res.setHeader('X-Request-ID', req.requestId);
  
  // Capturar información del request
  const startTime = Date.now();
  const { method, url, ip, headers } = req;
  
  // Log inicial del request
  const requestInfo = {
    requestId: req.requestId,
    method,
    url,
    ip: ip || req.connection?.remoteAddress || 'unknown',
    userAgent: headers['user-agent'] || 'unknown',
    contentType: headers['content-type'],
    contentLength: headers['content-length'],
    authorization: headers.authorization ? '[PRESENT]' : '[NOT_PRESENT]',
    timestamp: new Date().toISOString()
  };

  // No logear rutas de health check en producción para evitar spam
  if (process.env.NODE_ENV === 'production' && (url.includes('/health') || url.includes('/status'))) {
    return next();
  }

  logger.info(`📥 Incoming ${method} ${url}`, requestInfo);

  // Capturar el final del response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    
    // Información del response
    const responseInfo = {
      requestId: req.requestId,
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      responseSize: Buffer.byteLength(data || '', 'utf8'),
      timestamp: new Date().toISOString()
    };

    // Log según el status code
    if (statusCode >= 500) {
      logger.error(`📤 Response ${statusCode} for ${method} ${url}`, responseInfo);
    } else if (statusCode >= 400) {
      logger.warn(`📤 Response ${statusCode} for ${method} ${url}`, responseInfo);
    } else {
      logger.info(`📤 Response ${statusCode} for ${method} ${url}`, responseInfo);
    }

    // Log requests lentos (más de 1 segundo)
    if (duration > 1000) {
      logger.warn(`🐌 Slow request detected`, {
        ...responseInfo,
        warning: 'Request took longer than 1 second'
      });
    }

    // Restaurar función original y enviar respuesta
    return originalSend.call(this, data);
  };

  next();
};

// =================================
// MIDDLEWARE DE ERROR LOGGING
// =================================

const errorLogger = (error, req, res, next) => {
  // Información del error
  const errorInfo = {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status || error.statusCode
    },
    body: req.body && Object.keys(req.body).length > 0 ? '[PRESENT]' : '[EMPTY]',
    timestamp: new Date().toISOString()
  };

  // Log diferentes tipos de errores
  if (error.status >= 500 || !error.status) {
    logger.error(`💥 Server Error in ${req.method} ${req.url}`, errorInfo);
  } else if (error.status >= 400) {
    logger.warn(`⚠️ Client Error in ${req.method} ${req.url}`, errorInfo);
  } else {
    logger.info(`ℹ️ Request Error in ${req.method} ${req.url}`, errorInfo);
  }

  next(error);
};

// =================================
// MIDDLEWARE DE AUDIT LOGGING
// =================================

const auditLogger = (req, res, next) => {
  // Solo auditar ciertas rutas críticas
  const auditRoutes = [
    '/auth/login',
    '/auth/register', 
    '/auth/logout',
    '/users',
    '/projects',
    '/ai/chat'
  ];

  const shouldAudit = auditRoutes.some(route => req.url.includes(route));
  
  if (shouldAudit) {
    const auditInfo = {
      requestId: req.requestId,
      action: `${req.method} ${req.url}`,
      userId: req.user?.id || 'anonymous',
      userEmail: req.user?.email || 'unknown',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };

    logger.info(`🔍 Audit: ${auditInfo.action}`, auditInfo);
  }

  next();
};

// =================================
// MIDDLEWARE DE PERFORMANCE LOGGING
// =================================

const performanceLogger = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convertir a ms
    
    // Log requests que toman más de cierto tiempo
    if (duration > 500) { // Más de 500ms
      const perfInfo = {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      };

      if (duration > 2000) {
        logger.error(`🚨 Very slow request detected`, perfInfo);
      } else if (duration > 1000) {
        logger.warn(`⏱️ Slow request detected`, perfInfo);
      } else {
        logger.info(`⚡ Performance alert`, perfInfo);
      }
    }
  });

  next();
};

// =================================
// MIDDLEWARE DE SECURITY LOGGING
// =================================

const securityLogger = (req, res, next) => {
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS
    /union\s+select/i,  // SQL injection
    /exec\(/i,  // Code injection
    /eval\(/i   // Code injection
  ];

  const requestContent = JSON.stringify({
    url: req.url,
    query: req.query,
    body: req.body,
    headers: req.headers
  });

  const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
    pattern.test(requestContent)
  );

  if (hasSuspiciousContent) {
    const securityAlert = {
      requestId: req.requestId,
      type: 'SUSPICIOUS_REQUEST',
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      query: req.query,
      suspiciousContent: '[DETECTED]',
      timestamp: new Date().toISOString()
    };

    logger.warn(`🚨 Security Alert: Suspicious request detected`, securityAlert);
  }

  next();
};

// =================================
// EXPORTAR MIDDLEWARES
// =================================

module.exports = {
  requestLogger,
  errorLogger,
  auditLogger,
  performanceLogger,
  securityLogger
};