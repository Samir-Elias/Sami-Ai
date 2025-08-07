const logger = require('../config/logger');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('./constants');

// =================================
// UTILIDADES DE RESPUESTA HTTP
// =================================

/**
 * Crear respuesta exitosa estándar
 * @param {Object} res - Objeto response de Express
 * @param {Object} data - Datos a enviar
 * @param {string} message - Mensaje de éxito
 * @param {number} statusCode - Código de estado HTTP (default: 200)
 * @param {Object} meta - Metadata adicional
 * @returns {Object} Response
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, meta = {}) => {
  const response = {
    success: true,
    message,
    ...(data && { data }),
    ...meta,
    timestamp: new Date().toISOString()
  };

  logger.info(`✅ Success response: ${message}`, {
    statusCode,
    hasData: !!data,
    endpoint: res.req?.originalUrl,
    method: res.req?.method,
    userId: res.req?.user?.id
  });

  return res.status(statusCode).json(response);
};

/**
 * Crear respuesta de error estándar
 * @param {Object} res - Objeto response de Express
 * @param {string} error - Tipo de error
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código de estado HTTP (default: 500)
 * @param {Object} details - Detalles adicionales del error
 * @returns {Object} Response
 */
const sendError = (res, error = 'Internal Server Error', message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR, statusCode = 500, details = null) => {
  const response = {
    success: false,
    error,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };

  // Solo incluir stack trace en desarrollo
  if (process.env.NODE_ENV === 'development' && details?.stack) {
    response.stack = details.stack;
  }

  logger.error(`❌ Error response: ${error}`, {
    statusCode,
    message,
    endpoint: res.req?.originalUrl,
    method: res.req?.method,
    userId: res.req?.user?.id,
    ip: res.req?.ip,
    ...(details && { errorDetails: details })
  });

  return res.status(statusCode).json(response);
};

/**
 * Crear respuesta de validación fallida
 * @param {Object} res - Objeto response de Express
 * @param {Array} validationErrors - Array de errores de validación
 * @param {string} message - Mensaje principal
 * @returns {Object} Response
 */
const sendValidationError = (res, validationErrors = [], message = 'Validation failed') => {
  const response = {
    success: false,
    error: 'Validation Error',
    message,
    validationErrors,
    timestamp: new Date().toISOString()
  };

  logger.warn(`⚠️ Validation error response`, {
    endpoint: res.req?.originalUrl,
    method: res.req?.method,
    userId: res.req?.user?.id,
    errorsCount: validationErrors.length,
    errors: validationErrors
  });

  return res.status(400).json(response);
};

/**
 * Crear respuesta de no autorizado
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @returns {Object} Response
 */
const sendUnauthorized = (res, message = ERROR_MESSAGES.UNAUTHORIZED) => {
  return sendError(res, 'Unauthorized', message, 401);
};

/**
 * Crear respuesta de prohibido
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @returns {Object} Response
 */
const sendForbidden = (res, message = ERROR_MESSAGES.FORBIDDEN) => {
  return sendError(res, 'Forbidden', message, 403);
};

/**
 * Crear respuesta de no encontrado
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @returns {Object} Response
 */
const sendNotFound = (res, message = ERROR_MESSAGES.NOT_FOUND) => {
  return sendError(res, 'Not Found', message, 404);
};

/**
 * Crear respuesta de conflicto
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @returns {Object} Response
 */
const sendConflict = (res, message = 'Resource conflict') => {
  return sendError(res, 'Conflict', message, 409);
};

/**
 * Crear respuesta de límite de tasa excedido
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de error
 * @param {Object} rateLimitInfo - Información del rate limit
 * @returns {Object} Response
 */
const sendRateLimitExceeded = (res, message = 'Rate limit exceeded', rateLimitInfo = {}) => {
  const response = {
    success: false,
    error: 'Rate Limit Exceeded',
    message,
    rateLimitInfo: {
      limit: rateLimitInfo.limit,
      window: rateLimitInfo.window,
      retryAfter: rateLimitInfo.retryAfter,
      ...rateLimitInfo
    },
    timestamp: new Date().toISOString()
  };

  logger.warn(`🚦 Rate limit exceeded`, {
    endpoint: res.req?.originalUrl,
    method: res.req?.method,
    userId: res.req?.user?.id,
    ip: res.req?.ip,
    rateLimitInfo
  });

  return res.status(429).json(response);
};

// =================================
// UTILIDADES DE RESPUESTA CON DATOS
// =================================

/**
 * Crear respuesta paginada
 * @param {Object} res - Objeto response de Express
 * @param {Array} data - Array de datos
 * @param {Object} pagination - Información de paginación
 * @param {string} message - Mensaje de éxito
 * @returns {Object} Response
 */
const sendPaginated = (res, data = [], pagination = {}, message = 'Data retrieved successfully') => {
  const response = {
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      total: pagination.total || data.length,
      totalPages: pagination.totalPages || 1,
      hasMore: pagination.hasMore || false,
      hasPrevious: pagination.hasPrevious || false
    },
    timestamp: new Date().toISOString()
  };

  logger.info(`📄 Paginated response: ${message}`, {
    itemsCount: data.length,
    ...pagination,
    endpoint: res.req?.originalUrl,
    userId: res.req?.user?.id
  });

  return res.status(200).json(response);
};

/**
 * Crear respuesta de creación exitosa
 * @param {Object} res - Objeto response de Express
 * @param {Object} data - Objeto creado
 * @param {string} message - Mensaje de éxito
 * @returns {Object} Response
 */
const sendCreated = (res, data = null, message = 'Resource created successfully') => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Crear respuesta de actualización exitosa
 * @param {Object} res - Objeto response de Express
 * @param {Object} data - Objeto actualizado
 * @param {string} message - Mensaje de éxito
 * @returns {Object} Response
 */
const sendUpdated = (res, data = null, message = 'Resource updated successfully') => {
  return sendSuccess(res, data, message, 200);
};

/**
 * Crear respuesta de eliminación exitosa
 * @param {Object} res - Objeto response de Express
 * @param {string} message - Mensaje de éxito
 * @returns {Object} Response
 */
const sendDeleted = (res, message = 'Resource deleted successfully') => {
  return sendSuccess(res, null, message, 200);
};

// =================================
// UTILIDADES DE RESPUESTA ESPECIALIZADAS
// =================================

/**
 * Crear respuesta de autenticación exitosa
 * @param {Object} res - Objeto response de Express
 * @param {Object} user - Datos del usuario
 * @param {Object} tokens - Tokens de autenticación
 * @param {string} message - Mensaje de éxito
 * @returns {Object} Response
 */
const sendAuthSuccess = (res, user, tokens, message = SUCCESS_MESSAGES.LOGIN_SUCCESS) => {
  const response = {
    success: true,
    message,
    user,
    tokens: {
      accessToken: tokens.accessToken,
      ...(tokens.refreshToken && { refreshToken: tokens.refreshToken }),
      expiresIn: tokens.expiresIn || process.env.JWT_EXPIRES_IN || '24h'
    },
    timestamp: new Date().toISOString()
  };

  logger.info(`🔐 Authentication success for user: ${user.email}`, {
    userId: user.id,
    hasRefreshToken: !!tokens.refreshToken,
    ip: res.req?.ip
  });

  return res.status(200).json(response);
};

/**
 * Crear respuesta de archivo subido
 * @param {Object} res - Objeto response de Express
 * @param {Object} fileInfo - Información del archivo
 * @param {string} message - Mensaje de éxito
 * @returns {Object} Response
 */
const sendFileUploaded = (res, fileInfo, message = SUCCESS_MESSAGES.FILE_UPLOADED) => {
  const response = {
    success: true,
    message,
    file: {
      id: fileInfo.id,
      originalName: fileInfo.originalName,
      filename: fileInfo.filename,
      size: fileInfo.size,
      mimetype: fileInfo.mimetype,
      type: fileInfo.type,
      uploadedAt: fileInfo.uploadedAt,
      url: fileInfo.url
    },
    timestamp: new Date().toISOString()
  };

  logger.info(`📁 File uploaded successfully: ${fileInfo.originalName}`, {
    fileId: fileInfo.id,
    size: fileInfo.size,
    type: fileInfo.type,
    userId: res.req?.user?.id
  });

  return res.status(201).json(response);
};

/**
 * Crear respuesta de estadísticas
 * @param {Object} res - Objeto response de Express
 * @param {Object} stats - Datos de estadísticas
 * @param {string} message - Mensaje de éxito
 * @returns {Object} Response
 */
const sendStats = (res, stats = {}, message = 'Statistics retrieved successfully') => {
  const response = {
    success: true,
    message,
    stats,
    generatedAt: new Date().toISOString(),
    timestamp: new Date().toISOString()
  };

  logger.info(`📊 Statistics response: ${message}`, {
    statsKeys: Object.keys(stats),
    userId: res.req?.user?.id,
    endpoint: res.req?.originalUrl
  });

  return res.status(200).json(response);
};

// =================================
// UTILIDADES DE RESPUESTA STREAMING
// =================================

/**
 * Configurar respuesta de streaming SSE
 * @param {Object} res - Objeto response de Express
 * @param {Object} options - Opciones de configuración
 */
const setupSSE = (res, options = {}) => {
  const {
    keepAlive = 30000,
    retry = 3000
  } = options;

  // Configurar headers para SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Enviar configuración inicial
  res.write(`retry: ${retry}\n\n`);

  // Keep alive
  const keepAliveInterval = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, keepAlive);

  // Limpiar al cerrar conexión
  res.on('close', () => {
    clearInterval(keepAliveInterval);
    logger.info('🔌 SSE connection closed', {
      endpoint: res.req?.originalUrl,
      userId: res.req?.user?.id
    });
  });

  logger.info('🔌 SSE connection established', {
    endpoint: res.req?.originalUrl,
    userId: res.req?.user?.id
  });

  return res;
};

/**
 * Enviar evento SSE
 * @param {Object} res - Objeto response de Express
 * @param {string} event - Nombre del evento
 * @param {Object} data - Datos a enviar
 * @param {string} id - ID del evento (opcional)
 */
const sendSSE = (res, event, data, id = null) => {
  let message = '';
  
  if (id) {
    message += `id: ${id}\n`;
  }
  
  if (event) {
    message += `event: ${event}\n`;
  }
  
  message += `data: ${JSON.stringify(data)}\n\n`;
  
  res.write(message);
};

// =================================
// MIDDLEWARE DE RESPUESTA
// =================================

/**
 * Middleware para agregar utilidades de respuesta al objeto res
 */
const addResponseUtils = (req, res, next) => {
  // Agregar métodos de utilidad al objeto response
  res.sendSuccess = (data, message, statusCode, meta) => sendSuccess(res, data, message, statusCode, meta);
  res.sendError = (error, message, statusCode, details) => sendError(res, error, message, statusCode, details);
  res.sendValidationError = (validationErrors, message) => sendValidationError(res, validationErrors, message);
  res.sendUnauthorized = (message) => sendUnauthorized(res, message);
  res.sendForbidden = (message) => sendForbidden(res, message);
  res.sendNotFound = (message) => sendNotFound(res, message);
  res.sendConflict = (message) => sendConflict(res, message);
  res.sendRateLimitExceeded = (message, rateLimitInfo) => sendRateLimitExceeded(res, message, rateLimitInfo);
  res.sendPaginated = (data, pagination, message) => sendPaginated(res, data, pagination, message);
  res.sendCreated = (data, message) => sendCreated(res, data, message);
  res.sendUpdated = (data, message) => sendUpdated(res, data, message);
  res.sendDeleted = (message) => sendDeleted(res, message);
  res.sendAuthSuccess = (user, tokens, message) => sendAuthSuccess(res, user, tokens, message);
  res.sendFileUploaded = (fileInfo, message) => sendFileUploaded(res, fileInfo, message);
  res.sendStats = (stats, message) => sendStats(res, stats, message);
  res.setupSSE = (options) => setupSSE(res, options);
  res.sendSSE = (event, data, id) => sendSSE(res, event, data, id);

  next();
};

// =================================
// UTILIDADES DE FORMATO
// =================================

/**
 * Formatear error para respuesta
 * @param {Error} error - Error a formatear
 * @returns {Object} Error formateado
 */
const formatError = (error) => {
  return {
    name: error.name,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
};

/**
 * Sanitizar datos para respuesta (remover campos sensibles)
 * @param {Object} data - Datos a sanitizar
 * @param {Array} sensitiveFields - Campos a remover
 * @returns {Object} Datos sanitizados
 */
const sanitizeData = (data, sensitiveFields = ['password', 'token', 'secret', 'key']) => {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, sensitiveFields));
  }

  const sanitized = { ...data };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field] !== undefined) {
      delete sanitized[field];
    }
  });

  // Sanitizar objetos anidados
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] && typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key], sensitiveFields);
    }
  });

  return sanitized;
};

// =================================
// EXPORTAR UTILIDADES
// =================================

module.exports = {
  // Respuestas básicas
  sendSuccess,
  sendError,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendRateLimitExceeded,

  // Respuestas con datos
  sendPaginated,
  sendCreated,
  sendUpdated,
  sendDeleted,

  // Respuestas especializadas
  sendAuthSuccess,
  sendFileUploaded,
  sendStats,

  // Streaming
  setupSSE,
  sendSSE,

  // Middleware
  addResponseUtils,

  // Utilidades
  formatError,
  sanitizeData
};