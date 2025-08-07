const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'HH:mm:ss'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
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

// Middleware de logging
const loggingMiddleware = () => {
  return (req, res, next) => {
    const startTime = Date.now();
    const { method, url, ip } = req;
    
    // Log de entrada del request
    logger.info(`📥 ${method} ${url}`, {
      ip: ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      timestamp: new Date().toISOString()
    });
    
    // Capturar el final de la respuesta
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      
      // Log de salida con diferentes niveles según status
      if (statusCode >= 500) {
        logger.error(`📤 ${method} ${url} - ${statusCode} (${duration}ms)`);
      } else if (statusCode >= 400) {
        logger.warn(`📤 ${method} ${url} - ${statusCode} (${duration}ms)`);
      } else {
        logger.info(`📤 ${method} ${url} - ${statusCode} (${duration}ms)`);
      }
    });
    
    next();
  };
};

module.exports = logger;
module.exports.loggingMiddleware = loggingMiddleware;