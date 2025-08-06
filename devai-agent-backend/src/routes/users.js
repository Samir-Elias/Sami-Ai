const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');

// Importar controladores y middleware
const {
  getUsers,
  getMyProfile,
  updateMyProfile,
  changePassword,
  getUserById,
  updateUser,
  deleteMyAccount,
  searchUsers
} = require('../controllers/userController');

const { authenticate, requireRole } = require('../middleware/auth');
const logger = require('../config/logger');
const { USER_ROLES } = require('../utils/constants');

// Crear router
const router = express.Router();

// =================================
// RATE LIMITING ESPECÍFICO
// =================================

// Rate limiting para cambio de contraseña
const passwordChangeLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 cambios de contraseña por hora
  message: {
    error: 'Too many password change attempts',
    message: 'Too many password changes from this account, please try again after an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Password change rate limit exceeded', {
      userId: req.user?.id,
      email: req.user?.email,
      ip: req.ip
    });
    res.status(429).json({
      error: 'Too many password change attempts',
      message: 'Too many password changes from this account, please try again after an hour.',
      retryAfter: '1 hour'
    });
  }
});

// Rate limiting para eliminación de cuenta
const deleteAccountLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max: 1, // 1 intento por día
  message: {
    error: 'Account deletion attempt limit exceeded',
    message: 'Only one account deletion attempt allowed per day.',
    retryAfter: '24 hours'
  }
});

// Rate limiting para búsqueda de usuarios
const searchLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 búsquedas por minuto
  message: {
    error: 'Too many search requests',
    message: 'Too many search requests, please try again later.',
    retryAfter: '1 minute'
  }
});

// =================================
// VALIDACIONES DE INPUT
// =================================

// Validaciones para actualización de perfil
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-ZÀ-ÿĀ-žА-я\s'-]+$/)
    .withMessage('First name contains invalid characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters')
    .matches(/^[a-zA-ZÀ-ÿĀ-žА-я\s'-]+$/)
    .withMessage('Last name contains invalid characters'),
  
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9]$/)
    .withMessage('Username must start with a letter, end with a letter or number, and contain only letters, numbers, underscores, and dashes'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be light, dark, or auto'),
  
  body('preferences.language')
    .optional()
    .isIn(['en', 'es', 'fr', 'de', 'it', 'pt'])
    .withMessage('Language must be a supported language code'),
  
  body('preferences.notifications')
    .optional()
    .isObject()
    .withMessage('Notifications preferences must be an object')
];

// Validaciones para cambio de contraseña
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Validaciones para eliminación de cuenta
const validateAccountDeletion = [
  body('password')
    .notEmpty()
    .withMessage('Password is required to delete account')
];

// Validaciones para actualización de usuario (admin)
const validateUserUpdate = [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID format'),
  
  body('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage(`Role must be one of: ${Object.values(USER_ROLES).join(', ')}`),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Validaciones para obtener usuario por ID
const validateGetUserById = [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID format')
];

// Validaciones para búsqueda
const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Search query must be between 2 and 50 characters'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
];

// Validaciones para paginación
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must be less than 100 characters'),
  
  query('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage(`Role must be one of: ${Object.values(USER_ROLES).join(', ')}`),
  
  query('isActive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isActive must be true or false'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'email', 'firstName', 'lastName'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
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
    
    logger.warn('Validation errors in user request', {
      errors: validationErrors,
      userId: req.user?.id,
      ip: req.ip,
      path: req.path
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
// RUTAS DE USUARIOS
// =================================

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         displayName:
 *           type: string
 *         bio:
 *           type: string
 *         avatar:
 *           type: string
 *         preferences:
 *           type: object
 *     UserUpdate:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         username:
 *           type: string
 *         bio:
 *           type: string
 *         avatar:
 *           type: string
 *         preferences:
 *           type: object
 */

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get list of users (Admin/Moderator only)
 *     tags: [Users]
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
 *         description: Search query
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, moderator, user, guest]
 *         description: Filter by role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/',
  authenticate,
  requireRole([USER_ROLES.ADMIN, USER_ROLES.MODERATOR]),
  validatePagination,
  handleValidationErrors,
  getUsers
);

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get my profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile',
  authenticate,
  getMyProfile
);

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update my profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 */
router.put('/profile',
  authenticate,
  validateProfileUpdate,
  handleValidationErrors,
  updateMyProfile
);

/**
 * @swagger
 * /api/v1/users/password:
 *   put:
 *     summary: Change password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid password
 */
router.put('/password',
  authenticate,
  passwordChangeLimit,
  validatePasswordChange,
  handleValidationErrors,
  changePassword
);

/**
 * @swagger
 * /api/v1/users/profile:
 *   delete:
 *     summary: Delete my account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: Invalid password
 */
router.delete('/profile',
  authenticate,
  deleteAccountLimit,
  validateAccountDeletion,
  handleValidationErrors,
  deleteMyAccount
);

/**
 * @swagger
 * /api/v1/users/search:
 *   get:
 *     summary: Search users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *         description: Maximum results
 *     responses:
 *       200:
 *         description: Users found successfully
 *       400:
 *         description: Invalid search query
 */
router.get('/search',
  authenticate,
  searchLimit,
  validateSearch,
  handleValidationErrors,
  searchUsers
);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   get:
 *     summary: Get user by ID (Admin/Moderator only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.get('/:userId',
  authenticate,
  requireRole([USER_ROLES.ADMIN, USER_ROLES.MODERATOR]),
  validateGetUserById,
  handleValidationErrors,
  getUserById
);

/**
 * @swagger
 * /api/v1/users/{userId}:
 *   put:
 *     summary: Update user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, moderator, user, guest]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.put('/:userId',
  authenticate,
  requireRole([USER_ROLES.ADMIN]),
  validateUserUpdate,
  handleValidationErrors,
  updateUser
);

// =================================
// RUTA DE INFORMACIÓN
// =================================

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get users endpoints information
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Users endpoints information
 */
router.get('/', (req, res) => {
  res.json({
    message: 'DevAI Agent Users API',
    version: '1.0.0',
    endpoints: {
      list: 'GET /users (Admin/Moderator)',
      profile: 'GET /users/profile',
      updateProfile: 'PUT /users/profile',
      changePassword: 'PUT /users/password',
      deleteAccount: 'DELETE /users/profile',
      search: 'GET /users/search',
      getById: 'GET /users/:userId (Admin/Moderator)',
      updateUser: 'PUT /users/:userId (Admin)'
    },
    rateLimits: {
      passwordChange: '3 attempts per hour',
      accountDeletion: '1 attempt per day',
      search: '30 requests per minute'
    },
    permissions: {
      admin: 'Full access to all user operations',
      moderator: 'View users, search, get by ID',
      user: 'Manage own profile, search users',
      guest: 'Limited access'
    }
  });
});

// =================================
// MIDDLEWARE DE ERROR
// =================================

router.use((error, req, res, next) => {
  logger.error('User route error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip
  });
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: 'User operation error',
    message: isDevelopment ? error.message : 'An error occurred during user operation',
    ...(isDevelopment && { stack: error.stack })
  });
});

module.exports = router;