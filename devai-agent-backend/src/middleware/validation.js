// ============================================
// ✅ VALIDATION MIDDLEWARE
// ============================================

import { body, query, param, validationResult } from 'express-validator';
import { log } from '../config/logger.js';

/**
 * 🔧 Middleware para manejar errores de validación
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    log.debug('Validation errors', {
      errors: formattedErrors,
      url: req.originalUrl,
      method: req.method
    });

    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: formattedErrors,
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
};

// ============================================
// 🔐 VALIDACIONES DE AUTENTICACIÓN
// ============================================

export const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
  
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('El username debe tener entre 3 y 30 caracteres')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('El username solo puede contener letras, números, guiones y guiones bajos'),
  
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),
  
  handleValidationErrors
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  
  body('password')
    .notEmpty()
    .withMessage('Contraseña requerida'),
  
  handleValidationErrors
];

export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token requerido'),
  
  handleValidationErrors
];

export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Contraseña actual requerida'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    }),
  
  handleValidationErrors
];

export const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  
  handleValidationErrors
];

export const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Token de reset requerido'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
  
  handleValidationErrors
];

// ============================================
// 👤 VALIDACIONES DE USUARIO
// ============================================

export const validateUpdateProfile = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('El username debe tener entre 3 y 30 caracteres')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('El username solo puede contener letras, números, guiones y guiones bajos'),
  
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Las preferencias deben ser un objeto'),
  
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark'])
    .withMessage('El tema debe ser light o dark'),
  
  body('preferences.language')
    .optional()
    .isIn(['es', 'en'])
    .withMessage('El idioma debe ser es o en'),
  
  body('settings')
    .optional()
    .isObject()
    .withMessage('La configuración debe ser un objeto'),
  
  handleValidationErrors
];

// ============================================
// 💬 VALIDACIONES DE CONVERSACIONES
// ============================================

export const validateCreateConversation = [
  body('title')
    .notEmpty()
    .withMessage('Título requerido')
    .isLength({ min: 1, max: 200 })
    .withMessage('El título debe tener entre 1 y 200 caracteres')
    .trim(),
  
  body('projectId')
    .optional()
    .isString()
    .withMessage('ID de proyecto inválido'),
  
  body('aiProvider')
    .optional()
    .isIn(['gemini', 'groq', 'huggingface', 'ollama'])
    .withMessage('Proveedor de IA inválido'),
  
  body('aiModel')
    .optional()
    .isString()
    .withMessage('Modelo de IA inválido'),
  
  handleValidationErrors
];

export const validateUpdateConversation = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('El título debe tener entre 1 y 200 caracteres')
    .trim(),
  
  body('isPinned')
    .optional()
    .isBoolean()
    .withMessage('isPinned debe ser boolean'),
  
  body('isArchived')
    .optional()
    .isBoolean()
    .withMessage('isArchived debe ser boolean'),
  
  handleValidationErrors
];

// ============================================
// 📨 VALIDACIONES DE MENSAJES
// ============================================

export const validateCreateMessage = [
  body('conversationId')
    .notEmpty()
    .withMessage('ID de conversación requerido')
    .isString()
    .withMessage('ID de conversación inválido'),
  
  body('content')
    .notEmpty()
    .withMessage('Contenido del mensaje requerido')
    .isLength({ min: 1, max: 10000 })
    .withMessage('El contenido debe tener entre 1 y 10000 caracteres')
    .trim(),
  
  body('aiProvider')
    .optional()
    .isIn(['gemini', 'groq', 'huggingface', 'ollama'])
    .withMessage('Proveedor de IA inválido'),
  
  body('aiModel')
    .optional()
    .isString()
    .withMessage('Modelo de IA inválido'),
  
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Los adjuntos deben ser un array'),
  
  handleValidationErrors
];

export const validateUpdateMessage = [
  body('content')
    .optional()
    .isLength({ min: 1, max: 10000 })
    .withMessage('El contenido debe tener entre 1 y 10000 caracteres')
    .trim(),
  
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación debe ser entre 1 y 5'),
  
  body('feedback')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('El feedback debe tener máximo 1000 caracteres')
    .trim(),
  
  handleValidationErrors
];

// ============================================
// 📁 VALIDACIONES DE PROYECTOS
// ============================================

export const validateCreateProject = [
  body('name')
    .notEmpty()
    .withMessage('Nombre del proyecto requerido')
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre debe tener entre 1 y 100 caracteres')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción debe tener máximo 500 caracteres')
    .trim(),
  
  handleValidationErrors
];

export const validateUpdateProject = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre debe tener entre 1 y 100 caracteres')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción debe tener máximo 500 caracteres')
    .trim(),
  
  body('isArchived')
    .optional()
    .isBoolean()
    .withMessage('isArchived debe ser boolean'),
  
  handleValidationErrors
];

// ============================================
// 🔑 VALIDACIONES DE API KEYS
// ============================================

export const validateCreateApiKey = [
  body('provider')
    .notEmpty()
    .withMessage('Proveedor requerido')
    .isIn(['gemini', 'groq', 'huggingface', 'openai'])
    .withMessage('Proveedor inválido'),
  
  body('apiKey')
    .notEmpty()
    .withMessage('API key requerida')
    .isLength({ min: 10 })
    .withMessage('API key muy corta'),
  
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre debe tener entre 1 y 100 caracteres')
    .trim(),
  
  handleValidationErrors
];

export const validateUpdateApiKey = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre debe tener entre 1 y 100 caracteres')
    .trim(),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser boolean'),
  
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault debe ser boolean'),
  
  handleValidationErrors
];

// ============================================
// 🤖 VALIDACIONES DE IA
// ============================================

export const validateAiChat = [
  body('messages')
    .isArray({ min: 1 })
    .withMessage('Se requiere al menos un mensaje'),
  
  body('messages.*.role')
    .isIn(['user', 'assistant', 'system'])
    .withMessage('Rol de mensaje inválido'),
  
  body('messages.*.content')
    .notEmpty()
    .withMessage('Contenido del mensaje requerido')
    .isLength({ max: 10000 })
    .withMessage('Contenido muy largo'),
  
  body('provider')
    .optional()
    .isIn(['gemini', 'groq', 'huggingface', 'ollama'])
    .withMessage('Proveedor de IA inválido'),
  
  body('model')
    .optional()
    .isString()
    .withMessage('Modelo inválido'),
  
  body('stream')
    .optional()
    .isBoolean()
    .withMessage('Stream debe ser boolean'),
  
  handleValidationErrors
];

// ============================================
// 📊 VALIDACIONES DE QUERY PARAMETERS
// ============================================

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser entre 1 y 100')
    .toInt(),
  
  query('sort')
    .optional()
    .isString()
    .withMessage('Campo de ordenamiento inválido'),
  
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('El orden debe ser asc o desc'),
  
  handleValidationErrors
];

export const validateSearch = [
  query('q')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('La búsqueda debe tener entre 1 y 100 caracteres')
    .trim(),
  
  query('category')
    .optional()
    .isString()
    .withMessage('Categoría inválida'),
  
  query('language')
    .optional()
    .isString()
    .withMessage('Idioma inválido'),
  
  handleValidationErrors
];

// ============================================
// 🔧 VALIDACIONES DE PARÁMETROS
// ============================================

export const validateId = [
  param('id')
    .notEmpty()
    .withMessage('ID requerido')
    .isString()
    .withMessage('ID inválido'),
  
  handleValidationErrors
];

export const validateUserId = [
  param('userId')
    .notEmpty()
    .withMessage('ID de usuario requerido')
    .isString()
    .withMessage('ID de usuario inválido'),
  
  handleValidationErrors
];

export const validateConversationId = [
  param('conversationId')
    .notEmpty()
    .withMessage('ID de conversación requerido')
    .isString()
    .withMessage('ID de conversación inválido'),
  
  handleValidationErrors
];

export const validateProjectId = [
  param('projectId')
    .notEmpty()
    .withMessage('ID de proyecto requerido')
    .isString()
    .withMessage('ID de proyecto inválido'),
  
  handleValidationErrors
];

// ============================================
// 🧪 FUNCIONES AUXILIARES Y TESTING
// ============================================

/**
 * 🔧 Crear validador personalizado
 */
export const createCustomValidator = (validationRules) => {
  return [...validationRules, handleValidationErrors];
};

/**
 * 🔍 Validador condicional
 */
export const conditionalValidation = (condition, validator) => {
  return (req, res, next) => {
    if (condition(req)) {
      return validator(req, res, next);
    }
    next();
  };
};

/**
 * 📝 Validar contenido de archivo
 */
export const validateFileContent = [
  body('filename')
    .notEmpty()
    .withMessage('Nombre de archivo requerido')
    .matches(/\.(js|jsx|ts|tsx|py|java|cpp|c|cs|php|rb|go|rs|swift|kt|dart|html|css|json|md|txt)$/i)
    .withMessage('Tipo de archivo no soportado'),
  
  body('content')
    .notEmpty()
    .withMessage('Contenido del archivo requerido')
    .isLength({ max: 1048576 }) // 1MB
    .withMessage('Archivo muy grande (máximo 1MB)'),
  
  handleValidationErrors
];

/**
 * 📊 Validar datos de analytics
 */
export const validateAnalyticsEvent = [
  body('event')
    .notEmpty()
    .withMessage('Evento requerido')
    .isString()
    .withMessage('Evento inválido'),
  
  body('category')
    .notEmpty()
    .withMessage('Categoría requerida')
    .isString()
    .withMessage('Categoría inválida'),
  
  body('action')
    .notEmpty()
    .withMessage('Acción requerida')
    .isString()
    .withMessage('Acción inválida'),
  
  body('properties')
    .optional()
    .isObject()
    .withMessage('Las propiedades deben ser un objeto'),
  
  handleValidationErrors
];

/**
 * 🧪 Helper para testing
 */
export const mockValidationSuccess = (req, res, next) => {
  next();
};

export const mockValidationError = (errors = []) => (req, res, next) => {
  return res.status(400).json({
    success: false,
    message: 'Validation error (mock)',
    errors: errors,
    code: 'VALIDATION_ERROR'
  });
};

export default {
  handleValidationErrors,
  
  // Auth validations
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
  
  // User validations
  validateUpdateProfile,
  
  // Conversation validations
  validateCreateConversation,
  validateUpdateConversation,
  
  // Message validations
  validateCreateMessage,
  validateUpdateMessage,
  
  // Project validations
  validateCreateProject,
  validateUpdateProject,
  
  // API Key validations
  validateCreateApiKey,
  validateUpdateApiKey,
  
  // AI validations
  validateAiChat,
  
  // Query validations
  validatePagination,
  validateSearch,
  
  // Param validations
  validateId,
  validateUserId,
  validateConversationId,
  validateProjectId,
  
  // File validations
  validateFileContent,
  
  // Analytics validations
  validateAnalyticsEvent,
  
  // Utilities
  createCustomValidator,
  conditionalValidation,
  mockValidationSuccess,
  mockValidationError
};