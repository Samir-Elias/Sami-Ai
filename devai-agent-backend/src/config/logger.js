// ============================================
// 📊 LOGGER CONFIGURATION WITH WINSTON
// ============================================

const winston = require('winston');
const path = require('path');

/**
 * 🎨 Formatters personalizados
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Agregar metadata si existe
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    // Agregar stack trace si es un error
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

/**
 * 🌈 Formatter con colores para consola
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    
    // Agregar metadata en desarrollo
    if (process.env.NODE_ENV === 'development' && Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

/**
 * 🎯 Configuración de transports
 */
const transports = [];

// Console transport
transports.push(
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: consoleFormat
  })
);

// File transports (solo en producción o si se especifica)
if (process.env.NODE_ENV === 'production' || process.env.LOG_FILE) {
  const logDir = path.resolve(process.cwd(), 'storage/logs');
  
  // Log general
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      level: 'info',
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  
  // Log de errores
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  
  // Log de debugging (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'debug.log'),
        level: 'debug',
        format: customFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 3
      })
    );
  }
}

/**
 * 🔧 Crear instancia de logger
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {
    service: 'devai-backend',
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  },
  transports,
  
  // No salir en errores no manejados
  exitOnError: false
});

/**
 * 🎯 Logger específico para requests HTTP
 */
const httpLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [HTTP]: ${message} ${JSON.stringify(meta)}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * 🤖 Logger específico para IA
 */
const aiLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, provider, model, tokens, ...meta }) => {
      let log = `${timestamp} [AI-${provider?.toUpperCase() || 'UNKNOWN'}]`;
      if (model) log += ` [${model}]`;
      if (tokens) log += ` [${tokens} tokens]`;
      log += `: ${message}`;
      
      if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
      }
      
      return log;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * 🔒 Logger de seguridad
 */
const securityLogger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ip, userId, ...meta }) => {
      let log = `${timestamp} [SECURITY]`;
      if (ip) log += ` [IP: ${ip}]`;
      if (userId) log += ` [User: ${userId}]`;
      log += `: ${message}`;
      
      if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
      }
      
      return log;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * 📊 Logger de métricas/analytics
 */
const metricsLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, metric, value, labels, ...meta }) => {
      let log = `${timestamp} [METRICS] ${metric}=${value}`;
      
      if (labels && Object.keys(labels).length > 0) {
        const labelStr = Object.entries(labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        log += ` {${labelStr}}`;
      }
      
      if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
      }
      
      return log;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

/**
 * 🎭 Funciones de conveniencia
 */
const log = {
  // Niveles estándar
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // Funciones específicas
  http: (message, meta = {}) => httpLogger.info(message, meta),
  
  ai: (message, { provider, model, tokens, ...meta } = {}) => 
    aiLogger.info(message, { provider, model, tokens, ...meta }),
  
  security: (message, { ip, userId, ...meta } = {}) => 
    securityLogger.warn(message, { ip, userId, ...meta }),
  
  metric: (metric, value, labels = {}, meta = {}) => 
    metricsLogger.info('', { metric, value, labels, ...meta }),
  
  // Funciones de contexto
  request: (req, message, meta = {}) => {
    httpLogger.info(message, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      ...meta
    });
  },
  
  apiCall: (provider, model, tokens, duration, success = true) => {
    aiLogger.info(
      success ? 'API call successful' : 'API call failed',
      {
        provider,
        model,
        tokens,
        duration,
        success
      }
    );
  },
  
  authEvent: (event, req, userId = null, success = true) => {
    securityLogger.warn(`Auth ${event}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId,
      success,
      event
    });
  }
};

/**
 * 🔧 Middleware de logging para Express
 */
const loggingMiddleware = () => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Log de request entrante
    log.request(req, 'Incoming request');
    
    // Interceptar respuesta
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      
      // Log de respuesta
      log.http(`Request completed`, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        contentLength: data?.length || 0
      });
      
      // Métricas
      log.metric('http_request_duration_ms', duration, {
        method: req.method,
        status: res.statusCode.toString(),
        route: req.route?.path || 'unknown'
      });
      
      log.metric('http_requests_total', 1, {
        method: req.method,
        status: res.statusCode.toString()
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * 🚨 Middleware de manejo de errores
 */
const errorLoggingMiddleware = () => {
  return (error, req, res, next) => {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Log del error
    logger.error('Unhandled error', {
      errorId,
      message: error.message,
      stack: error.stack,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      body: req.body,
      query: req.query,
      params: req.params
    });
    
    // Métrica de error
    log.metric('http_errors_total', 1, {
      method: req.method,
      status: error.status || 500,
      type: error.name || 'Error'
    });
    
    next(error);
  };
};

/**
 * 🧪 Configuración para testing
 */
if (process.env.NODE_ENV === 'test') {
  // Silenciar logs en tests
  logger.silent = true;
  httpLogger.silent = true;
  aiLogger.silent = true;
  securityLogger.silent = true;
  metricsLogger.silent = true;
}

// Exportar todo usando CommonJS
module.exports = {
  // Logger principal
  default: logger,
  logger,
  
  // Loggers específicos
  httpLogger,
  aiLogger,
  securityLogger,
  metricsLogger,
  
  // Funciones de conveniencia
  log,
  
  // Middlewares
  loggingMiddleware,
  errorLoggingMiddleware
};

// Hacer que el logger principal sea accesible como default export también
module.exports = logger;
module.exports.httpLogger = httpLogger;
module.exports.aiLogger = aiLogger;
module.exports.securityLogger = securityLogger;
module.exports.metricsLogger = metricsLogger;
module.exports.log = log;
module.exports.loggingMiddleware = loggingMiddleware;
module.exports.errorLoggingMiddleware = errorLoggingMiddleware;