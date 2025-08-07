const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');

// Importar controladores y middleware
const {
  getMessages,
  createMessage,
  getMessageById,
  updateMessage,
  deleteMessage,
  getMessageStats,
  searchMessages
} = require('../controllers/messageController');

const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');
const { MESSAGE_TYPES, PAGINATION_CONFIG } = require('../utils/constants');

// Crear router
const router = express.Router({ mergeParams: true }); // Para capturar params de rutas padre

// =================================
// RATE LIMITING ESPECÍFICO
// =================================

// Rate limiting para creación de mensajes
const createMessageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // 60 mensajes por minuto
  message: {
    error: 'Too many messages sent',
    message: 'You can only send 60 messages per minute. Please slow down.',
    retryAfter: '1 minute'
  },
  handler: (req, res) => {
    logger.warn('Message creation rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      conversationId: req.params.conversationId,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      error: 'Too many messages sent',
      message: 'You can only send 60 messages per minute. Please slow down.',
      retryAfter: '1 minute'
    });
  }
});

// Rate limiting para actualizaciones de mensajes
const updateMessageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 actualizaciones por minuto
  message: {
    error: 'Too many message updates',
    message: 'Too many message updates, please slow down.',
    retryAfter: '1 minute'
  }
});

// Rate limiting para búsquedas
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // 20 búsquedas por minuto
  message: {
    error: 'Too many search requests',
    message: 'Too many search requests, please wait before searching again.',
    retryAfter: '1 minute'
  }
});

// =================================
// VALIDACIONES DE INPUT
// =================================

// Validaciones para crear mensaje
const validateCreateMessage = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message content must be between 1 and 10,000 characters')
    .custom((value) => {
      // Validar que no sea solo espacios en blanco
      if (!value.replace(/\s/g, '').length) {
        throw new Error('Message content cannot be only whitespace');
      }
      return true;
    }),
  
  body('role')
    .optional()
    .isIn(Object.values(MESSAGE_TYPES))
    .withMessage(`Role must be one of: ${Object.values(MESSAGE_TYPES).join(', ')}`),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be a valid object')
    .custom((value) => {
      // Validar que el metadata no sea demasiado grande
      const jsonString = JSON.stringify(value);
      if (jsonString.length > 5000) {
        throw new Error('Metadata is too large (max 5KB)');
      }
      return true;
    }),
  
  body('parentMessageId')
    .optional()
    .isUUID()
    .withMessage('Parent message ID must be a valid UUID')
];

// Validaciones para actualizar mensaje
const validateUpdateMessage = [
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message content must be between 1 and 10,000 characters')
    .custom((value) => {
      if (value && !value.replace(/\s/g, '').length) {
        throw new Error('Message content cannot be only whitespace');
      }
      return true;
    }),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be a valid object')
    .custom((value) => {
      const jsonString = JSON.stringify(value);
      if (jsonString.length > 5000) {
        throw new Error('Metadata is too large (max 5KB)');
      }
      return true;
    })
];

// Validaciones para listar mensajes
const validateGetMessages = [
  param('conversationId')
    .isUUID()
    .withMessage('Conversation ID must be a valid UUID'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: PAGINATION_CONFIG.MIN_LIMIT, max: PAGINATION_CONFIG.MAX_LIMIT })
    .withMessage(`Limit must be between ${PAGINATION_CONFIG.MIN_LIMIT} and ${PAGINATION_CONFIG.MAX_LIMIT}`),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'tokenCount'])
    .withMessage('Sort field must be createdAt, updatedAt, or tokenCount'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  query('role')
    .optional()
    .isIn(Object.values(MESSAGE_TYPES))
    .withMessage(`Role filter must be one of: ${Object.values(MESSAGE_TYPES).join(', ')}`),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters')
];

// Validaciones para búsqueda de mensajes
const validateSearchMessages = [
  param('conversationId')
    .isUUID()
    .withMessage('Conversation ID must be a valid UUID'),
  
  query('query')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('role')
    .optional()
    .isIn(Object.values(MESSAGE_TYPES))
    .withMessage(`Role filter must be one of: ${Object.values(MESSAGE_TYPES).join(', ')}`),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Validación de parámetro ID de mensaje
const validateMessageId = [
  param('id')
    .isUUID()
    .withMessage('Message ID must be a valid UUID')
];

// Validación de ID de conversación
const validateConversationId = [
  param('conversationId')
    .isUUID()
    .withMessage('Conversation ID must be a valid UUID')
];

// =================================
// MIDDLEWARE DE VALIDACIÓN
// =================================

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));
    
    logger.warn('Validation errors in message request', {
      errors: validationErrors,
      ip: req.ip,
      path: req.path,
      userId: req.user?.id,
      conversationId: req.params.conversationId
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input and try again',
      validationErrors
    });
  }
  
  next();
};

// =================================
// RUTAS DE MENSAJES EN CONVERSACIÓN
// =================================

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         conversationId:
 *           type: string
 *           format: uuid
 *         content:
 *           type: string
 *         role:
 *           type: string
 *           enum: [user, assistant, system]
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *         tokenCount:
 *           type: integer
 *         metadata:
 *           type: object
 *         parentMessageId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get messages from conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Messages per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, assistant, system]
 *         description: Filter by message role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in message content
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, tokenCount]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       404:
 *         description: Conversation not found
 */
router.get('/',
  authenticate,
  validateGetMessages,
  handleValidationErrors,
  getMessages
);

/**
 * @swagger
 * /api/v1/conversations/{conversationId}/messages:
 *   post:
 *     summary: Create new message in conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 10000
 *                 description: Message content
 *               role:
 *                 type: string
 *                 enum: [user, assistant, system]
 *                 default: user
 *               metadata:
 *                 type: object
 *                 description: Additional message metadata
 *               parentMessageId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of parent message for threading
 *     responses:
 *       201:
 *         description: Message created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Conversation not found
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/',
  authenticate,
  createMessageLimiter,
  validateConversationId,
  validateCreateMessage,
  handleValidationErrors,
  createMessage
);

/**
 * @swagger
 * /api/v1/conversations/{conversationId}/messages/search:
 *   get:
 *     summary: Search messages in conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation ID
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search query
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, assistant, system]
 *         description: Filter by message role
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum results to return
 *     responses:
 *       200:
 *         description: Search results returned
 *       400:
 *         description: Invalid search query
 *       404:
 *         description: Conversation not found
 *       429:
 *         description: Rate limit exceeded
 */
router.get('/search',
  authenticate,
  searchLimiter,
  validateSearchMessages,
  handleValidationErrors,
  searchMessages
);

/**
 * @swagger
 * /api/v1/conversations/{conversationId}/messages/stats:
 *   get:
 *     summary: Get message statistics for conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       404:
 *         description: Conversation not found
 */
router.get('/stats',
  authenticate,
  validateConversationId,
  handleValidationErrors,
  getMessageStats
);

// =================================
// RUTAS DE MENSAJES INDIVIDUALES
// =================================

/**
 * @swagger
 * /api/v1/messages/{id}:
 *   get:
 *     summary: Get message by ID
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message retrieved successfully
 *       404:
 *         description: Message not found
 */
router.get('/:id',
  authenticate,
  validateMessageId,
  handleValidationErrors,
  getMessageById
);

/**
 * @swagger
 * /api/v1/messages/{id}:
 *   put:
 *     summary: Update message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 10000
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Message updated successfully
 *       403:
 *         description: Cannot edit this message
 *       404:
 *         description: Message not found
 *       429:
 *         description: Rate limit exceeded
 */
router.put('/:id',
  authenticate,
  updateMessageLimiter,
  validateMessageId,
  validateUpdateMessage,
  handleValidationErrors,
  updateMessage
);

/**
 * @swagger
 * /api/v1/messages/{id}:
 *   delete:
 *     summary: Delete message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Permanent deletion (cannot be recovered)
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       403:
 *         description: Cannot delete this message
 *       404:
 *         description: Message not found
 */
router.delete('/:id',
  authenticate,
  validateMessageId,
  handleValidationErrors,
  deleteMessage
);

// =================================
// RUTA DE INFORMACIÓN
// =================================

/**
 * @swagger
 * /api/v1/messages:
 *   get:
 *     summary: Get messages endpoints information
 *     tags: [Messages]
 *     responses:
 *       200:
 *         description: Messages endpoints information
 */
router.get('/', (req, res) => {
  // Esta ruta solo se ejecuta si no hay autenticación
  res.json({
    message: 'DevAI Agent Messages API',
    version: '1.0.0',
    endpoints: {
      // Dentro de conversación
      listInConversation: 'GET /conversations/:conversationId/messages',
      createInConversation: 'POST /conversations/:conversationId/messages',
      searchInConversation: 'GET /conversations/:conversationId/messages/search',
      statsInConversation: 'GET /conversations/:conversationId/messages/stats',
      
      // Mensajes individuales
      getById: 'GET /messages/:id',
      update: 'PUT /messages/:id',
      delete: 'DELETE /messages/:id'
    },
    rateLimits: {
      create: '60 messages per minute',
      update: '30 updates per minute',
      search: '20 searches per minute'
    },
    messageRoles: Object.values(MESSAGE_TYPES),
    features: [
      'Message threading with parent-child relationships',
      'Full-text search within conversations',
      'Token counting and usage statistics',
      'Message editing (user messages only)',
      'Soft delete with recovery options',
      'Metadata support for rich content',
      'Role-based message filtering'
    ],
    limits: {
      contentMaxLength: 10000,
      metadataMaxSize: '5KB',
      searchQueryMaxLength: 100
    }
  });
});

// =================================
// MIDDLEWARE DE ERROR
// =================================

router.use((error, req, res, next) => {
  logger.error('Message route error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    conversationId: req.params?.conversationId,
    messageId: req.params?.id,
    ip: req.ip
  });
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: 'Message operation failed',
    message: isDevelopment ? error.message : 'An error occurred while processing your request',
    ...(isDevelopment && { stack: error.stack })
  });
});

module.exports = router;