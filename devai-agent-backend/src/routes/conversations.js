const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');

// Importar controladores y middleware
const {
  getConversations,
  createConversation,
  getConversationById,
  updateConversation,
  deleteConversation,
  archiveConversation,
  restoreConversation
} = require('../controllers/conversationController');

const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');
const { CONVERSATION_STATUS, PAGINATION_CONFIG } = require('../utils/constants');

// Crear router
const router = express.Router();

// =================================
// RATE LIMITING ESPECÍFICO
// =================================

// Rate limiting para creación de conversaciones
const createConversationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 conversaciones por minuto
  message: {
    error: 'Too many conversations created',
    message: 'You can only create 10 conversations per minute. Please wait before creating more.',
    retryAfter: '1 minute'
  },
  handler: (req, res) => {
    logger.warn('Conversation creation rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      error: 'Too many conversations created',
      message: 'You can only create 10 conversations per minute. Please wait before creating more.',
      retryAfter: '1 minute'
    });
  }
});

// Rate limiting para actualizaciones de conversaciones
const updateConversationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 actualizaciones por minuto
  message: {
    error: 'Too many conversation updates',
    message: 'Too many conversation updates, please slow down.',
    retryAfter: '1 minute'
  }
});

// =================================
// VALIDACIONES DE INPUT
// =================================

// Validaciones para crear conversación
const validateCreateConversation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,!?()[\]{}'"]+$/)
    .withMessage('Title contains invalid characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  
  body('aiProvider')
    .optional()
    .isIn(['gemini', 'groq', 'huggingface', 'ollama'])
    .withMessage('AI provider must be one of: gemini, groq, huggingface, ollama'),
  
  body('modelName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Model name must be between 1 and 100 characters'),
  
  body('systemPrompt')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('System prompt must be less than 2000 characters'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be a valid object')
];

// Validaciones para actualizar conversación
const validateUpdateConversation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,!?()[\]{}'"]+$/)
    .withMessage('Title contains invalid characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  
  body('systemPrompt')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('System prompt must be less than 2000 characters'),
  
  body('status')
    .optional()
    .isIn(Object.values(CONVERSATION_STATUS))
    .withMessage(`Status must be one of: ${Object.values(CONVERSATION_STATUS).join(', ')}`),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be a valid object')
];

// Validaciones para listar conversaciones
const validateGetConversations = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: PAGINATION_CONFIG.MIN_LIMIT, max: PAGINATION_CONFIG.MAX_LIMIT })
    .withMessage(`Limit must be between ${PAGINATION_CONFIG.MIN_LIMIT} and ${PAGINATION_CONFIG.MAX_LIMIT}`),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters'),
  
  query('status')
    .optional()
    .isIn(Object.values(CONVERSATION_STATUS))
    .withMessage(`Status must be one of: ${Object.values(CONVERSATION_STATUS).join(', ')}`),
  
  query('sortBy')
    .optional()
    .isIn(['title', 'createdAt', 'updatedAt', 'lastAccessedAt'])
    .withMessage('Sort field must be title, createdAt, updatedAt, or lastAccessedAt'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Validaciones para obtener conversación por ID
const validateGetConversationById = [
  param('id')
    .isUUID()
    .withMessage('Conversation ID must be a valid UUID'),
  
  query('includeMessages')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('includeMessages must be true or false'),
  
  query('messageLimit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Message limit must be between 1 and 100')
];

// Validación de parámetro ID
const validateConversationId = [
  param('id')
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
    
    logger.warn('Validation errors in conversation request', {
      errors: validationErrors,
      ip: req.ip,
      path: req.path,
      userId: req.user?.id
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
// RUTAS DE CONVERSACIONES
// =================================

/**
 * @swagger
 * components:
 *   schemas:
 *     Conversation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         slug:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, archived, deleted]
 *         aiProvider:
 *           type: string
 *         modelName:
 *           type: string
 *         systemPrompt:
 *           type: string
 *         metadata:
 *           type: object
 *         messageCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         lastAccessedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/conversations:
 *   get:
 *     summary: Get user's conversations
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and messages
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived, deleted]
 *         description: Filter by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, createdAt, updatedAt, lastAccessedAt]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/',
  authenticate,
  validateGetConversations,
  handleValidationErrors,
  getConversations
);

/**
 * @swagger
 * /api/v1/conversations:
 *   post:
 *     summary: Create new conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               aiProvider:
 *                 type: string
 *                 enum: [gemini, groq, huggingface, ollama]
 *                 default: gemini
 *               modelName:
 *                 type: string
 *                 default: gemini-pro
 *               systemPrompt:
 *                 type: string
 *                 maxLength: 2000
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *       400:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/',
  authenticate,
  createConversationLimiter,
  validateCreateConversation,
  handleValidationErrors,
  createConversation
);

/**
 * @swagger
 * /api/v1/conversations/{id}:
 *   get:
 *     summary: Get conversation by ID
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation ID
 *       - in: query
 *         name: includeMessages
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Include conversation messages
 *       - in: query
 *         name: messageLimit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of messages to include
 *     responses:
 *       200:
 *         description: Conversation retrieved successfully
 *       404:
 *         description: Conversation not found
 */
router.get('/:id',
  authenticate,
  validateGetConversationById,
  handleValidationErrors,
  getConversationById
);

/**
 * @swagger
 * /api/v1/conversations/{id}:
 *   put:
 *     summary: Update conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               systemPrompt:
 *                 type: string
 *                 maxLength: 2000
 *               status:
 *                 type: string
 *                 enum: [active, archived, deleted]
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Conversation updated successfully
 *       404:
 *         description: Conversation not found
 *       429:
 *         description: Rate limit exceeded
 */
router.put('/:id',
  authenticate,
  updateConversationLimiter,
  validateConversationId,
  validateUpdateConversation,
  handleValidationErrors,
  updateConversation
);

/**
 * @swagger
 * /api/v1/conversations/{id}:
 *   delete:
 *     summary: Delete conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation ID
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Permanent deletion (cannot be recovered)
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *       404:
 *         description: Conversation not found
 */
router.delete('/:id',
  authenticate,
  validateConversationId,
  handleValidationErrors,
  deleteConversation
);

/**
 * @swagger
 * /api/v1/conversations/{id}/archive:
 *   put:
 *     summary: Archive conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation archived successfully
 *       404:
 *         description: Conversation not found
 */
router.put('/:id/archive',
  authenticate,
  validateConversationId,
  handleValidationErrors,
  archiveConversation
);

/**
 * @swagger
 * /api/v1/conversations/{id}/restore:
 *   put:
 *     summary: Restore archived or deleted conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation restored successfully
 *       404:
 *         description: Conversation not found
 */
router.put('/:id/restore',
  authenticate,
  validateConversationId,
  handleValidationErrors,
  restoreConversation
);

// =================================
// RUTA DE INFORMACIÓN
// =================================

/**
 * @swagger
 * /api/v1/conversations:
 *   get:
 *     summary: Get conversations endpoints information
 *     tags: [Conversations]
 *     responses:
 *       200:
 *         description: Conversations endpoints information
 */
router.get('/', (req, res) => {
  // Esta ruta solo se ejecuta si no hay autenticación
  res.json({
    message: 'DevAI Agent Conversations API',
    version: '1.0.0',
    endpoints: {
      list: 'GET /conversations',
      create: 'POST /conversations',
      getById: 'GET /conversations/:id',
      update: 'PUT /conversations/:id',
      delete: 'DELETE /conversations/:id',
      archive: 'PUT /conversations/:id/archive',
      restore: 'PUT /conversations/:id/restore'
    },
    rateLimits: {
      create: '10 conversations per minute',
      update: '30 updates per minute'
    },
    features: [
      'Conversation management',
      'AI provider selection',
      'System prompts',
      'Archive/restore functionality',
      'Full-text search',
      'Soft delete with recovery'
    ]
  });
});

// =================================
// MIDDLEWARE DE ERROR
// =================================

router.use((error, req, res, next) => {
  logger.error('Conversation route error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip
  });
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: 'Conversation operation failed',
    message: isDevelopment ? error.message : 'An error occurred while processing your request',
    ...(isDevelopment && { stack: error.stack })
  });
});

module.exports = router;