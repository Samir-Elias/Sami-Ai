const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');

// Importar controladores y middleware
const {
  uploadFile,
  getFiles,
  getFileById,
  downloadFile,
  updateFile,
  deleteFile,
  getFileStats
} = require('../controllers/fileController');

const { authenticate } = require('../middleware/auth');
const { uploadSingle, processUpload, handleUploadError } = require('../middleware/upload');
const logger = require('../config/logger');
const { FILE_STATUS, PAGINATION_CONFIG } = require('../utils/constants');

// Crear router
const router = express.Router();

// =================================
// RATE LIMITING ESPECÍFICO
// =================================

// Rate limiting para uploads (más restrictivo)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50, // 50 uploads por hora
  message: {
    error: 'Upload rate limit exceeded',
    message: 'You can only upload 50 files per hour. Please try again later.',
    retryAfter: '1 hour'
  },
  handler: (req, res) => {
    logger.warn('File upload rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      error: 'Upload rate limit exceeded',
      message: 'You can only upload 50 files per hour. Please try again later.',
      retryAfter: '1 hour'
    });
  }
});

// Rate limiting para descargas
const downloadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 descargas por minuto
  message: {
    error: 'Download rate limit exceeded',
    message: 'Too many download requests, please slow down.',
    retryAfter: '1 minute'
  }
});

// Rate limiting general
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // 60 requests por minuto
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded for file operations.',
    retryAfter: '1 minute'
  }
});

// =================================
// VALIDACIONES DE INPUT
// =================================

// Validaciones para actualizar archivo
const validateUpdateFile = [
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('tags')
    .optional()
    .custom((value) => {
      let tags;
      try {
        tags = Array.isArray(value) ? value : JSON.parse(value);
      } catch {
        tags = typeof value === 'string' ? [value] : [];
      }
      
      if (!Array.isArray(tags)) {
        throw new Error('Tags must be an array');
      }
      
      if (tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      
      for (const tag of tags) {
        if (typeof tag !== 'string' || tag.trim().length === 0) {
          throw new Error('Each tag must be a non-empty string');
        }
        if (tag.length > 50) {
          throw new Error('Each tag must be less than 50 characters');
        }
      }
      
      return true;
    }),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value')
];

// Validaciones para subir archivo
const validateUpload = [
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('tags')
    .optional()
    .custom((value) => {
      if (!value) return true;
      
      let tags;
      try {
        tags = Array.isArray(value) ? value : JSON.parse(value);
      } catch {
        tags = typeof value === 'string' ? [value] : [];
      }
      
      if (!Array.isArray(tags)) {
        throw new Error('Tags must be an array');
      }
      
      if (tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      
      return true;
    }),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value')
];

// Validaciones para listar archivos
const validateGetFiles = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: PAGINATION_CONFIG.MIN_LIMIT, max: PAGINATION_CONFIG.MAX_LIMIT })
    .withMessage(`Limit must be between ${PAGINATION_CONFIG.MIN_LIMIT} and ${PAGINATION_CONFIG.MAX_LIMIT}`),
  
  query('type')
    .optional()
    .isIn(['image', 'code', 'document', 'archive', 'other'])
    .withMessage('Type must be image, code, document, archive, or other'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'originalName', 'size'])
    .withMessage('Sort field must be createdAt, updatedAt, originalName, or size'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Validación de parámetro ID
const validateFileId = [
  param('id')
    .isUUID()
    .withMessage('File ID must be a valid UUID')
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
    
    logger.warn('Validation errors in file request', {
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
// RUTAS DE ARCHIVOS
// =================================

/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         originalName:
 *           type: string
 *         filename:
 *           type: string
 *         size:
 *           type: integer
 *         mimetype:
 *           type: string
 *         type:
 *           type: string
 *           enum: [image, code, document, archive, other]
 *         description:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         isPublic:
 *           type: boolean
 *         status:
 *           type: string
 *           enum: [uploading, uploaded, processing, processed, failed, deleted]
 *         url:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/files/upload:
 *   post:
 *     summary: Upload a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (max 50MB)
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: File description
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *                 description: File tags (max 10)
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *                 description: Whether file is publicly accessible
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 file:
 *                   $ref: '#/components/schemas/File'
 *       400:
 *         description: Validation error or no file uploaded
 *       413:
 *         description: File too large
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/upload',
  authenticate,
  uploadLimiter,
  uploadSingle('file'),
  processUpload,
  validateUpload,
  handleValidationErrors,
  uploadFile,
  handleUploadError
);

/**
 * @swagger
 * /api/v1/files:
 *   get:
 *     summary: Get user's files
 *     tags: [Files]
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
 *         description: Files per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, code, document, archive, other]
 *         description: Filter by file type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in filename and description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, originalName, size]
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 files:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/File'
 *                 pagination:
 *                   type: object
 *                 filters:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/',
  authenticate,
  generalLimiter,
  validateGetFiles,
  handleValidationErrors,
  getFiles
);

/**
 * @swagger
 * /api/v1/files/stats:
 *   get:
 *     summary: Get file statistics
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalFiles:
 *                       type: integer
 *                     filesByType:
 *                       type: object
 *                     storage:
 *                       type: object
 *                       properties:
 *                         totalBytes:
 *                           type: integer
 *                         totalFormatted:
 *                           type: string
 *                         averageSize:
 *                           type: integer
 *                         averageFormatted:
 *                           type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/stats',
  authenticate,
  generalLimiter,
  getFileStats
);

/**
 * @swagger
 * /api/v1/files/{id}:
 *   get:
 *     summary: Get file by ID
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *     responses:
 *       200:
 *         description: File retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 file:
 *                   $ref: '#/components/schemas/File'
 *       404:
 *         description: File not found
 */
router.get('/:id',
  authenticate,
  generalLimiter,
  validateFileId,
  handleValidationErrors,
  getFileById
);

/**
 * @swagger
 * /api/v1/files/{id}/download:
 *   get:
 *     summary: Download file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *     responses:
 *       200:
 *         description: File download
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 *       429:
 *         description: Rate limit exceeded
 */
router.get('/:id/download',
  authenticate,
  downloadLimiter,
  validateFileId,
  handleValidationErrors,
  downloadFile
);

/**
 * @swagger
 * /api/v1/files/{id}:
 *   put:
 *     summary: Update file information
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: File updated successfully
 *       404:
 *         description: File not found
 *       403:
 *         description: Access denied (not owner)
 */
router.put('/:id',
  authenticate,
  generalLimiter,
  validateFileId,
  validateUpdateFile,
  handleValidationErrors,
  updateFile
);

/**
 * @swagger
 * /api/v1/files/{id}:
 *   delete:
 *     summary: Delete file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Permanent deletion (cannot be recovered)
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 *       403:
 *         description: Access denied (not owner)
 */
router.delete('/:id',
  authenticate,
  generalLimiter,
  validateFileId,
  handleValidationErrors,
  deleteFile
);

// =================================
// RUTA DE INFORMACIÓN
// =================================

/**
 * @swagger
 * /api/v1/files:
 *   get:
 *     summary: Get files endpoints information
 *     tags: [Files]
 *     responses:
 *       200:
 *         description: Files endpoints information
 */
router.get('/', (req, res) => {
  // Esta ruta solo se ejecuta si no hay autenticación
  res.json({
    message: 'DevAI Agent Files API',
    version: '1.0.0',
    endpoints: {
      upload: 'POST /files/upload',
      list: 'GET /files',
      stats: 'GET /files/stats',
      getById: 'GET /files/:id',
      download: 'GET /files/:id/download',
      update: 'PUT /files/:id',
      delete: 'DELETE /files/:id'
    },
    rateLimits: {
      upload: '50 files per hour',
      download: '100 downloads per minute',
      general: '60 requests per minute'
    },
    supportedTypes: ['image', 'code', 'document', 'archive', 'other'],
    limits: {
      maxFileSize: '50MB',
      maxFilesPerUpload: 1,
      maxTagsPerFile: 10,
      maxTagLength: 50,
      maxDescriptionLength: 500
    },
    features: [
      'Secure file upload with validation',
      'File type detection and categorization',
      'Public/private file sharing',
      'File tagging and search',
      'Download tracking and statistics',
      'Soft delete with recovery',
      'Automatic cleanup of orphaned files'
    ],
    supportedExtensions: {
      images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
      code: ['.js', '.ts', '.html', '.css', '.json', '.md', '.txt'],
      documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
      archives: ['.zip', '.rar', '.tar', '.gz', '.7z']
    }
  });
});

// =================================
// MIDDLEWARE DE ERROR
// =================================

router.use((error, req, res, next) => {
  logger.error('File route error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip
  });
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Errores específicos de archivos
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: 'File size exceeds the maximum limit of 50MB',
      maxSize: '50MB'
    });
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Too many files',
      message: 'You can only upload one file at a time',
      maxFiles: 1
    });
  }
  
  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'This file type is not supported',
      supportedTypes: ['images', 'code', 'documents', 'archives']
    });
  }
  
  res.status(error.status || 500).json({
    error: 'File operation failed',
    message: isDevelopment ? error.message : 'An error occurred while processing your file request',
    ...(isDevelopment && { stack: error.stack })
  });
});

module.exports = router;