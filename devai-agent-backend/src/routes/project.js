const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');

// Importar controladores y middleware
const {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  archiveProject,
  restoreProject,
  getProjectStats
} = require('../controllers/projectController');

const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');
const { PROJECT_STATUS, PAGINATION_CONFIG } = require('../utils/constants');

// Crear router
const router = express.Router();

// =================================
// RATE LIMITING ESPECÍFICO
// =================================

// Rate limiting para creación de proyectos
const createProjectLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // 20 proyectos por hora
  message: {
    error: 'Project creation rate limit exceeded',
    message: 'You can only create 20 projects per hour. Please try again later.',
    retryAfter: '1 hour'
  },
  handler: (req, res) => {
    logger.warn('Project creation rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      error: 'Project creation rate limit exceeded',
      message: 'You can only create 20 projects per hour. Please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// Rate limiting para actualizaciones de proyectos
const updateProjectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // 60 actualizaciones por minuto
  message: {
    error: 'Too many project updates',
    message: 'Too many project updates, please slow down.',
    retryAfter: '1 minute'
  }
});

// Rate limiting general
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 requests por minuto
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded for project operations.',
    retryAfter: '1 minute'
  }
});

// =================================
// VALIDACIONES DE INPUT
// =================================

// Validaciones para crear proyecto
const validateCreateProject = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,!?()[\]{}'"]+$/)
    .withMessage('Project name contains invalid characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hexadecimal color (e.g., #3B82F6)'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items')
    .custom((tags) => {
      if (tags) {
        for (const tag of tags) {
          if (typeof tag !== 'string' || tag.trim().length === 0) {
            throw new Error('Each tag must be a non-empty string');
          }
          if (tag.length > 30) {
            throw new Error('Each tag must be less than 30 characters');
          }
        }
      }
      return true;
    }),
  
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be a valid object'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value')
];

// Validaciones para actualizar proyecto
const validateUpdateProject = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,!?()[\]{}'"]+$/)
    .withMessage('Project name contains invalid characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hexadecimal color (e.g., #3B82F6)'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items')
    .custom((tags) => {
      if (tags) {
        for (const tag of tags) {
          if (typeof tag !== 'string' || tag.trim().length === 0) {
            throw new Error('Each tag must be a non-empty string');
          }
          if (tag.length > 30) {
            throw new Error('Each tag must be less than 30 characters');
          }
        }
      }
      return true;
    }),
  
  body('status')
    .optional()
    .isIn(Object.values(PROJECT_STATUS))
    .withMessage(`Status must be one of: ${Object.values(PROJECT_STATUS).join(', ')}`),
  
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be a valid object'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value')
];

// Validaciones para listar proyectos
const validateGetProjects = [
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
    .isIn(Object.values(PROJECT_STATUS))
    .withMessage(`Status must be one of: ${Object.values(PROJECT_STATUS).join(', ')}`),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'updatedAt', 'lastAccessedAt'])
    .withMessage('Sort field must be name, createdAt, updatedAt, or lastAccessedAt'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Validaciones para obtener proyecto por ID
const validateGetProjectById = [
  param('id')
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),
  
  query('includeConversations')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('includeConversations must be true or false'),
  
  query('includeFiles')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('includeFiles must be true or false')
];

// Validación de parámetro ID
const validateProjectId = [
  param('id')
    .isUUID()
    .withMessage('Project ID must be a valid UUID')
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
    
    logger.warn('Validation errors in project request', {
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
// RUTAS DE PROYECTOS
// =================================

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         slug:
 *           type: string
 *         color:
 *           type: string
 *           pattern: '^#[0-9A-Fa-f]{6}$'
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [active, archived, completed, deleted]
 *         isPublic:
 *           type: boolean
 *         settings:
 *           type: object
 *         stats:
 *           type: object
 *           properties:
 *             conversations:
 *               type: integer
 *             files:
 *               type: integer
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
 * /api/v1/projects:
 *   get:
 *     summary: Get user's projects
 *     tags: [Projects]
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
 *         description: Projects per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in project name and description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived, completed, deleted]
 *         description: Filter by project status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt, lastAccessedAt]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Projects retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/',
  authenticate,
  generalLimiter,
  validateGetProjects,
  handleValidationErrors,
  getProjects
);

/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     summary: Create new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *                 default: '#3B82F6'
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 30
 *                 maxItems: 10
 *               settings:
 *                 type: object
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/',
  authenticate,
  createProjectLimiter,
  validateCreateProject,
  handleValidationErrors,
  createProject
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: query
 *         name: includeConversations
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Include project conversations
 *       - in: query
 *         name: includeFiles
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Include project files
 *     responses:
 *       200:
 *         description: Project retrieved successfully
 *       404:
 *         description: Project not found
 */
router.get('/:id',
  authenticate,
  generalLimiter,
  validateGetProjectById,
  handleValidationErrors,
  getProjectById
);

/**
 * @swagger
 * /api/v1/projects/{id}/stats:
 *   get:
 *     summary: Get project statistics
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       404:
 *         description: Project not found
 */
router.get('/:id/stats',
  authenticate,
  generalLimiter,
  validateProjectId,
  handleValidationErrors,
  getProjectStats
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   put:
 *     summary: Update project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 30
 *                 maxItems: 10
 *               status:
 *                 type: string
 *                 enum: [active, archived, completed, deleted]
 *               settings:
 *                 type: object
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       404:
 *         description: Project not found
 *       429:
 *         description: Rate limit exceeded
 */
router.put('/:id',
  authenticate,
  updateProjectLimiter,
  validateProjectId,
  validateUpdateProject,
  handleValidationErrors,
  updateProject
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   delete:
 *     summary: Delete project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Permanent deletion (cannot be recovered)
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       400:
 *         description: Cannot delete project with content
 *       404:
 *         description: Project not found
 */
router.delete('/:id',
  authenticate,
  generalLimiter,
  validateProjectId,
  handleValidationErrors,
  deleteProject
);

/**
 * @swagger
 * /api/v1/projects/{id}/archive:
 *   put:
 *     summary: Archive project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project archived successfully
 *       404:
 *         description: Project not found
 */
router.put('/:id/archive',
  authenticate,
  generalLimiter,
  validateProjectId,
  handleValidationErrors,
  archiveProject
);

/**
 * @swagger
 * /api/v1/projects/{id}/restore:
 *   put:
 *     summary: Restore archived or deleted project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project restored successfully
 *       404:
 *         description: Project not found
 */
router.put('/:id/restore',
  authenticate,
  generalLimiter,
  validateProjectId,
  handleValidationErrors,
  restoreProject
);

// =================================
// RUTA DE INFORMACIÓN
// =================================

/**
 * @swagger
 * /api/v1/projects:
 *   get:
 *     summary: Get projects endpoints information
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: Projects endpoints information
 */
router.get('/', (req, res) => {
  // Esta ruta solo se ejecuta si no hay autenticación
  res.json({
    message: 'DevAI Agent Projects API',
    version: '1.0.0',
    endpoints: {
      list: 'GET /projects',
      create: 'POST /projects',
      getById: 'GET /projects/:id',
      stats: 'GET /projects/:id/stats',
      update: 'PUT /projects/:id',
      delete: 'DELETE /projects/:id',
      archive: 'PUT /projects/:id/archive',
      restore: 'PUT /projects/:id/restore'
    },
    rateLimits: {
      create: '20 projects per hour',
      update: '60 updates per minute',
      general: '100 requests per minute'
    },
    features: [
      'Project organization and management',
      'Color-coded project categorization',
      'Tag-based project filtering',
      'Project statistics and analytics',
      'Public/private project sharing',
      'Archive/restore functionality',
      'Soft delete with recovery',
      'Conversation and file organization',
      'Custom project settings'
    ],
    projectStatuses: Object.values(PROJECT_STATUS),
    limits: {
      nameMaxLength: 100,
      descriptionMaxLength: 500,
      maxTags: 10,
      tagMaxLength: 30
    },
    defaultColor: '#3B82F6'
  });
});

// =================================
// MIDDLEWARE DE ERROR
// =================================

router.use((error, req, res, next) => {
  logger.error('Project route error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip
  });
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: 'Project operation failed',
    message: isDevelopment ? error.message : 'An error occurred while processing your request',
    ...(isDevelopment && { stack: error.stack })
  });
});

module.exports = router;