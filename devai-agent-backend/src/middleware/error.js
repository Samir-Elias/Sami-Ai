// ============================================
// 🚨 ERROR HANDLING MIDDLEWARE
// ============================================

import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { log } from '../config/logger.js';
import { prisma } from '../config/database.js';

/**
 * 🚨 Clase personalizada para errores de la aplicación
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, AppError);
  }
}

/**
 * 🔧 Crear errores comunes
 */
export const createError = {
  badRequest: (message = 'Bad Request', code = 'BAD_REQUEST', details = null) => 
    new AppError(message, 400, code, details),
  
  unauthorized: (message = 'Unauthorized', code = 'UNAUTHORIZED', details = null) => 
    new AppError(message, 401, code, details),
  
  forbidden: (message = 'Forbidden', code = 'FORBIDDEN', details = null) => 
    new AppError(message, 403, code, details),
  
  notFound: (message = 'Not Found', code = 'NOT_FOUND', details = null) => 
    new AppError(message, 404, code, details),
  
  conflict: (message = 'Conflict', code = 'CONFLICT', details = null) => 
    new AppError(message, 409, code, details),
  
  validation: (message = 'Validation Error', code = 'VALIDATION_ERROR', details = null) => 
    new AppError(message, 422, code, details),
  
  tooManyRequests: (message = 'Too Many Requests', code = 'RATE_LIMIT_EXCEEDED', details = null) => 
    new AppError(message, 429, code, details),
  
  internal: (message = 'Internal Server Error', code = 'INTERNAL_ERROR', details = null) => 
    new AppError(message, 500, code, details),
  
  service: (message = 'Service Unavailable', code = 'SERVICE_UNAVAILABLE', details = null) => 
    new AppError(message, 503, code, details)
};

/**
 * 🔍 Detectar tipo de error y convertir a AppError
 */
const handleSpecificErrors = (error) => {
  // Errores de Prisma
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return createError.badRequest(
      'Datos inválidos para la base de datos',
      'DATABASE_VALIDATION_ERROR',
      { originalError: error.message }
    );
  }
  
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return createError.internal(
      'Error desconocido en la base de datos',
      'DATABASE_UNKNOWN_ERROR'
    );
  }
  
  // Errores de Multer (upload)
  if (error instanceof MulterError) {
    return handleMulterError(error);
  }
  
  // Errores de JWT
  if (error instanceof JsonWebTokenError) {
    return handleJwtError(error);
  }
  
  // Errores de Redis
  if (error.code === 'ECONNREFUSED' && error.port === 6379) {
    return createError.service(
      'Servicio de cache no disponible',
      'REDIS_CONNECTION_ERROR'
    );
  }
  
  // Errores de validación de express-validator
  if (error.type === 'validation') {
    return createError.validation(
      error.message,
      'VALIDATION_ERROR',
      error.errors
    );
  }
  
  // Si ya es un AppError, devolverlo tal como está
  if (error instanceof AppError) {
    return error;
  }
  
  // Error genérico
  return createError.internal(
    error.message || 'Error interno del servidor',
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'development' ? error.stack : null
  );
};

/**
 * 🗄️ Manejar errores específicos de Prisma
 */
const handlePrismaError = (error) => {
  switch (error.code) {
    case 'P2002':
      // Violación de constraint único
      const field = error.meta?.target?.[0] || 'campo';
      return createError.conflict(
        `Ya existe un registro con ese ${field}`,
        'DUPLICATE_FIELD',
        { field: error.meta?.target }
      );
      
    case 'P2025':
      // Registro no encontrado
      return createError.notFound(
        'El registro solicitado no existe',
        'RECORD_NOT_FOUND'
      );
      
    case 'P2003':
      // Violación de foreign key
      return createError.badRequest(
        'Referencia inválida a otro registro',
        'INVALID_REFERENCE',
        { field: error.meta?.field_name }
      );
      
    case 'P2021':
      // Tabla no existe
      return createError.internal(
        'Error de configuración de base de datos',
        'DATABASE_SCHEMA_ERROR'
      );
      
    case 'P2024':
      // Timeout de conexión
      return createError.service(
        'Base de datos no disponible temporalmente',
        'DATABASE_TIMEOUT'
      );
      
    default:
      return createError.internal(
        'Error en la base de datos',
        'DATABASE_ERROR',
        { prismaCode: error.code, meta: error.meta }
      );
  }
};

/**
 * 📁 Manejar errores de Multer (upload)
 */
const handleMulterError = (error) => {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return createError.badRequest(
        'El archivo es demasiado grande',
        'FILE_TOO_LARGE',
        { limit: error.limit }
      );
      
    case 'LIMIT_FILE_COUNT':
      return createError.badRequest(
        'Demasiados archivos',
        'TOO_MANY_FILES',
        { limit: error.limit }
      );
      
    case 'LIMIT_UNEXPECTED_FILE':
      return createError.badRequest(
        'Campo de archivo inesperado',
        'UNEXPECTED_FILE_FIELD',
        { field: error.field }
      );
      
    case 'INVALID_FILE_TYPE':
      return createError.badRequest(
        'Tipo de archivo no permitido',
        'INVALID_FILE_TYPE'
      );
      
    default:
      return createError.badRequest(
        'Error en la subida de archivo',
        'UPLOAD_ERROR',
        { multerCode: error.code }
      );
  }
};

/**
 * 🔐 Manejar errores de JWT
 */
const handleJwtError = (error) => {
  if (error instanceof TokenExpiredError) {
    return createError.unauthorized(
      'Token expirado',
      'TOKEN_EXPIRED'
    );
  }
  
  return createError.unauthorized(
    'Token inválido',
    'INVALID_TOKEN'
  );
};

/**
 * 📝 Registrar error en base de datos
 */
const logErrorToDatabase = async (error, req) => {
  try {
    await prisma.errorLog.create({
      data: {
        error: error.name || 'Error',
        message: error.message,
        stack: error.stack,
        level: 'error',
        userId: req.user?.id || null,
        endpoint: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent'),
        requestBody: req.body ? JSON.stringify(req.body) : null,
        query: req.query ? JSON.stringify(req.query) : null,
        params: req.params ? JSON.stringify(req.params) : null
      }
    });
  } catch (dbError) {
    // Si no podemos guardar en BD, al menos loggearlo
    log.error('Failed to save error to database', {
      originalError: error.message,
      dbError: dbError.message
    });
  }
};

/**
 * 🚨 Middleware principal de manejo de errores
 */
export const errorHandler = async (error, req, res, next) => {
  // Si ya se envió una respuesta, pasar al siguiente middleware
  if (res.headersSent) {
    return next(error);
  }

  try {
    // Convertir error a AppError si es necesario
    const appError = handleSpecificErrors(error);
    
    // Generar ID único para el error
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Loggear error
    const logData = {
      errorId,
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      stack: appError.stack,
      userId: req.user?.id,
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      body: req.body,
      query: req.query,
      params: req.params
    };

    // Loggear según el nivel de severidad
    if (appError.statusCode >= 500) {
      log.error('Server error occurred', logData);
      
      // Guardar errores críticos en base de datos
      await logErrorToDatabase(appError, req);
    } else if (appError.statusCode >= 400) {
      log.warn('Client error occurred', logData);
    } else {
      log.info('Non-error exception occurred', logData);
    }

    // Preparar respuesta
    const errorResponse = {
      success: false,
      message: appError.message,
      code: appError.code,
      errorId: errorId
    };

    // Agregar detalles en desarrollo
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = appError.details;
      errorResponse.stack = appError.stack;
    }

    // Agregar detalles específicos para errores de validación
    if (appError.statusCode === 422 && appError.details) {
      errorResponse.errors = appError.details;
    }

    // Enviar respuesta
    res.status(appError.statusCode).json(errorResponse);

  } catch (handlerError) {
    // Error en el manejo de errores - último recurso
    log.error('Error in error handler', {
      originalError: error.message,
      handlerError: handlerError.message,
      stack: handlerError.stack
    });

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      code: 'ERROR_HANDLER_FAILURE',
      errorId: Date.now().toString(36)
    });
  }
};

/**
 * 🚫 Middleware para rutas no encontradas
 */
export const notFoundHandler = (req, res, next) => {
  const error = createError.notFound(
    `Ruta ${req.method} ${req.originalUrl} no encontrada`,
    'ROUTE_NOT_FOUND',
    {
      method: req.method,
      path: req.originalUrl,
      availableRoutes: req.app._router?.stack
        ?.filter(r => r.route)
        ?.map(r => `${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`)
        ?.slice(0, 5) // Solo mostrar las primeras 5 rutas como sugerencia
    }
  );
  
  next(error);
};

/**
 * ⚠️ Middleware para manejar errores asíncronos
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 🔧 Wrapper para controladores async
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * 📊 Middleware para métricas de errores
 */
export const errorMetrics = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Si es una respuesta de error, registrar métrica
    if (res.statusCode >= 400) {
      log.metric('http_errors_total', 1, {
        status_code: res.statusCode.toString(),
        method: req.method,
        route: req.route?.path || 'unknown',
        error_code: data.code || 'unknown'
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * 🧹 Función para limpiar logs de errores antiguos
 */
export const cleanupErrorLogs = async (daysOld = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await prisma.errorLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });
    
    log.info('Error logs cleanup completed', {
      deletedCount: result.count,
      cutoffDate: cutoffDate.toISOString()
    });
    
    return result.count;
  } catch (error) {
    log.error('Error during error logs cleanup', {
      error: error.message
    });
    return 0;
  }
};

/**
 * 📊 Obtener estadísticas de errores
 */
export const getErrorStats = async (timeframe = '24h') => {
  try {
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    const [totalErrors, errorsByLevel, recentErrors] = await Promise.all([
      // Total de errores en el timeframe
      prisma.errorLog.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      }),
      
      // Errores agrupados por nivel
      prisma.errorLog.groupBy({
        by: ['level'],
        where: {
          createdAt: {
            gte: startDate
          }
        },
        _count: true
      }),
      
      // Errores más recientes
      prisma.errorLog.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10,
        select: {
          error: true,
          message: true,
          level: true,
          endpoint: true,
          createdAt: true
        }
      })
    ]);
    
    return {
      timeframe,
      totalErrors,
      errorsByLevel: errorsByLevel.reduce((acc, item) => {
        acc[item.level] = item._count;
        return acc;
      }, {}),
      recentErrors,
      generatedAt: now.toISOString()
    };
  } catch (error) {
    log.error('Error getting error stats', { error: error.message });
    return null;
  }
};

/**
 * 🧪 Funciones para testing
 */
export const testHelpers = {
  // Crear errores de prueba
  createTestError: (type = 'internal', message = 'Test error') => {
    return createError[type](message, `TEST_${type.toUpperCase()}_ERROR`);
  },
  
  // Mock error handler que no loggea
  mockErrorHandler: (error, req, res, next) => {
    if (res.headersSent) return next(error);
    
    const appError = error instanceof AppError ? error : createError.internal(error.message);
    
    res.status(appError.statusCode).json({
      success: false,
      message: appError.message,
      code: appError.code,
      test: true
    });
  },
  
  // Verificar si un error es de cierto tipo
  isErrorType: (error, type) => {
    return error instanceof AppError && error.code.includes(type.toUpperCase());
  }
};

export default {
  AppError,
  createError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  catchAsync,
  errorMetrics,
  cleanupErrorLogs,
  getErrorStats,
  testHelpers
};