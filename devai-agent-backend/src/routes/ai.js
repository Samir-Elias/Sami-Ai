const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');

// Importar controladores y middleware
const {
  getProviders,
  getModels,
  chat,
  regenerateResponse
} = require('../controllers/aiController');

const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');
const { AI_CONFIG, MESSAGE_TYPES } = require('../utils/constants');

// Crear router
const router = express.Router();

// =================================
// RATE LIMITING ESPECÍFICO
// =================================

// Rate limiting para requests de chat (más restrictivo)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 chats por minuto
  message: {
    error: 'AI chat rate limit exceeded',
    message: 'You can only send 30 AI chat requests per minute. Please wait before trying again.',
    retryAfter: '1 minute'
  },
  handler: (req, res) => {
    logger.warn('AI chat rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      error: 'AI chat rate limit exceeded',
      message: 'You can only send 30 AI chat requests per minute. Please wait before trying again.',
      retryAfter: '1 minute',
      rateLimitInfo: {
        current: 'exceeded',
        limit: 30,
        window: '1 minute'
      }
    });
  }
});

// Rate limiting para regeneración (más restrictivo)
const regenerateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // 10 regeneraciones por 5 minutos
  message: {
    error: 'Regeneration rate limit exceeded',
    message: 'You can only regenerate 10 responses per 5 minutes.',
    retryAfter: '5 minutes'
  },
  handler: (req, res) => {
    logger.warn('AI regeneration rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      error: 'Regeneration rate limit exceeded',
      message: 'You can only regenerate 10 responses per 5 minutes.',
      retryAfter: '5 minutes'
    });
  }
});

// Rate limiting general para endpoints de información
const infoLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // 60 requests por minuto
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded for AI information endpoints.',
    retryAfter: '1 minute'
  }
});

// =================================
// VALIDACIONES DE INPUT
// =================================

// Validaciones para chat
const validateChat = [
  body('conversationId')
    .isUUID()
    .withMessage('Conversation ID must be a valid UUID'),
  
  body('message')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message must be between 1 and 10,000 characters')
    .custom((value) => {
      if (!value.replace(/\s/g, '').length) {
        throw new Error('Message cannot be only whitespace');
      }
      return true;
    }),
  
  body('provider')
    .optional()
    .isIn(Object.values(AI_CONFIG.PROVIDERS))
    .withMessage(`Provider must be one of: ${Object.values(AI_CONFIG.PROVIDERS).join(', ')}`),
  
  body('model')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Model name must be between 1 and 100 characters'),
  
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object')
    .custom((value) => {
      if (value) {
        // Validar configuraciones específicas
        if (value.temperature !== undefined) {
          if (typeof value.temperature !== 'number' || value.temperature < 0 || value.temperature > 2) {
            throw new Error('Temperature must be a number between 0 and 2');
          }
        }
        if (value.maxTokens !== undefined) {
          if (!Number.isInteger(value.maxTokens) || value.maxTokens < 1 || value.maxTokens > 8000) {
            throw new Error('Max tokens must be an integer between 1 and 8000');
          }
        }
        if (value.topP !== undefined) {
          if (typeof value.topP !== 'number' || value.topP < 0 || value.topP > 1) {
            throw new Error('Top P must be a number between 0 and 1');
          }
        }
      }
      return true;
    }),
  
  body('systemPrompt')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('System prompt must be less than 2000 characters'),
  
  body('stream')
    .optional()
    .isBoolean()
    .withMessage('Stream must be a boolean value')
];

// Validaciones para regeneración
const validateRegenerate = [
  param('messageId')
    .isUUID()
    .withMessage('Message ID must be a valid UUID'),
  
  body('provider')
    .optional()
    .isIn(Object.values(AI_CONFIG.PROVIDERS))
    .withMessage(`Provider must be one of: ${Object.values(AI_CONFIG.PROVIDERS).join(', ')}`),
  
  body('model')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Model name must be between 1 and 100 characters'),
  
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object')
];

// Validaciones para obtener modelos
const validateGetModels = [
  query('provider')
    .optional()
    .custom((value) => {
      if (value && value !== 'all' && !Object.values(AI_CONFIG.PROVIDERS).includes(value)) {
        throw new Error(`Provider must be 'all' or one of: ${Object.values(AI_CONFIG.PROVIDERS).join(', ')}`);
      }
      return true;
    })
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
    
    logger.warn('Validation errors in AI request', {
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
// RUTAS DE IA
// =================================

/**
 * @swagger
 * components:
 *   schemas:
 *     AIProvider:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         available:
 *           type: boolean
 *         models:
 *           type: array
 *           items:
 *             type: string
 *         features:
 *           type: array
 *           items:
 *             type: string
 *         rateLimit:
 *           type: string
 *     
 *     AIModel:
 *       type: object
 *       properties:
 *         maxTokens:
 *           type: integer
 *         cost:
 *           type: number
 *         provider:
 *           type: string
 *         available:
 *           type: boolean
 *     
 *     ChatRequest:
 *       type: object
 *       required:
 *         - conversationId
 *         - message
 *       properties:
 *         conversationId:
 *           type: string
 *           format: uuid
 *         message:
 *           type: string
 *           maxLength: 10000
 *         provider:
 *           type: string
 *           enum: [gemini, groq, huggingface, ollama]
 *           default: gemini
 *         model:
 *           type: string
 *           default: gemini-pro
 *         settings:
 *           type: object
 *           properties:
 *             temperature:
 *               type: number
 *               minimum: 0
 *               maximum: 2
 *               default: 0.7
 *             maxTokens:
 *               type: integer
 *               minimum: 1
 *               maximum: 8000
 *               default: 2000
 *             topP:
 *               type: number
 *               minimum: 0
 *               maximum: 1
 *               default: 0.9
 *         systemPrompt:
 *           type: string
 *           maxLength: 2000
 *         stream:
 *           type: boolean
 *           default: false
 */

/**
 * @swagger
 * /api/v1/ai/providers:
 *   get:
 *     summary: Get available AI providers
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI providers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 providers:
 *                   type: object
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/AIProvider'
 *                 defaultProvider:
 *                   type: string
 *                 totalProviders:
 *                   type: integer
 *                 availableProviders:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/providers',
  authenticate,
  infoLimiter,
  getProviders
);

/**
 * @swagger
 * /api/v1/ai/models:
 *   get:
 *     summary: Get available AI models
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *           enum: [all, gemini, groq, huggingface, ollama]
 *         description: Filter models by provider
 *     responses:
 *       200:
 *         description: AI models retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 models:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     additionalProperties:
 *                       $ref: '#/components/schemas/AIModel'
 *                 defaultSettings:
 *                   type: object
 *                 rateLimits:
 *                   type: object
 *       400:
 *         description: Invalid provider
 *       401:
 *         description: Unauthorized
 */
router.get('/models',
  authenticate,
  infoLimiter,
  validateGetModels,
  handleValidationErrors,
  getModels
);

/**
 * @swagger
 * /api/v1/ai/chat:
 *   post:
 *     summary: Chat with AI
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *     responses:
 *       200:
 *         description: Chat response generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userMessage:
 *                   $ref: '#/components/schemas/Message'
 *                 assistantMessage:
 *                   $ref: '#/components/schemas/Message'
 *                 usage:
 *                   type: object
 *                   properties:
 *                     promptTokens:
 *                       type: integer
 *                     completionTokens:
 *                       type: integer
 *                     totalTokens:
 *                       type: integer
 *       400:
 *         description: Validation error or provider not available
 *       404:
 *         description: Conversation not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: AI service error
 */
router.post('/chat',
  authenticate,
  chatLimiter,
  validateChat,
  handleValidationErrors,
  chat
);

/**
 * @swagger
 * /api/v1/ai/regenerate/{messageId}:
 *   post:
 *     summary: Regenerate AI response for a message
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the assistant message to regenerate
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [gemini, groq, huggingface, ollama]
 *               model:
 *                 type: string
 *               settings:
 *                 type: object
 *                 properties:
 *                   temperature:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 2
 *                   maxTokens:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 8000
 *                   topP:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *     responses:
 *       200:
 *         description: Response regenerated successfully
 *       400:
 *         description: Invalid message type or validation error
 *       404:
 *         description: Message not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: AI service error
 */
router.post('/regenerate/:messageId',
  authenticate,
  regenerateLimiter,
  validateRegenerate,
  handleValidationErrors,
  regenerateResponse
);

// =================================
// RUTA DE INFORMACIÓN
// =================================

/**
 * @swagger
 * /api/v1/ai:
 *   get:
 *     summary: Get AI endpoints information
 *     tags: [AI]
 *     responses:
 *       200:
 *         description: AI endpoints information
 */
router.get('/', (req, res) => {
  // Esta ruta solo se ejecuta si no hay autenticación
  res.json({
    message: 'DevAI Agent AI API',
    version: '1.0.0',
    endpoints: {
      providers: 'GET /ai/providers',
      models: 'GET /ai/models',
      chat: 'POST /ai/chat',
      regenerate: 'POST /ai/regenerate/:messageId'
    },
    rateLimits: {
      chat: '30 requests per minute',
      regenerate: '10 requests per 5 minutes',
      info: '60 requests per minute'
    },
    supportedProviders: Object.values(AI_CONFIG.PROVIDERS),
    features: [
      'Multi-provider AI integration',
      'Streaming responses',
      'Conversation context awareness',
      'Response regeneration',
      'Custom system prompts',
      'Configurable AI settings',
      'Token usage tracking',
      'Rate limiting per provider'
    ],
    defaultSettings: AI_CONFIG.DEFAULT_SETTINGS,
    limits: {
      messageMaxLength: 10000,
      systemPromptMaxLength: 2000,
      maxTokensLimit: 8000,
      temperatureRange: [0, 2],
      topPRange: [0, 1]
    },
    streaming: {
      supported: true,
      format: 'Server-Sent Events (SSE)',
      contentType: 'text/event-stream'
    }
  });
});

// =================================
// MIDDLEWARE DE ERROR
// =================================

router.use((error, req, res, next) => {
  logger.error('AI route error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip
  });
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Errores específicos de IA
  if (error.code === 'AI_PROVIDER_ERROR') {
    return res.status(502).json({
      error: 'AI service unavailable',
      message: 'The AI provider is currently unavailable. Please try again later.',
      provider: error.provider,
      ...(isDevelopment && { details: error.message })
    });
  }
  
  if (error.code === 'AI_QUOTA_EXCEEDED') {
    return res.status(429).json({
      error: 'AI quota exceeded',
      message: 'AI usage quota has been exceeded. Please try again later.',
      ...(isDevelopment && { details: error.message })
    });
  }
  
  if (error.code === 'AI_MODEL_NOT_FOUND') {
    return res.status(400).json({
      error: 'AI model not available',
      message: 'The requested AI model is not available.',
      ...(isDevelopment && { details: error.message })
    });
  }
  
  res.status(error.status || 500).json({
    error: 'AI operation failed',
    message: isDevelopment ? error.message : 'An error occurred while processing your AI request',
    ...(isDevelopment && { stack: error.stack })
  });
});

module.exports = router;