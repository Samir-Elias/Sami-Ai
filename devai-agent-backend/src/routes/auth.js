const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Importar controladores y middleware
const {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  verifyToken
} = require('../controllers/authController');

const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

// Crear router
const router = express.Router();

// =================================
// RATE LIMITING ESPECÍFICO
// =================================

// Rate limiting para registro (más restrictivo)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 intentos por hora
  message: {
    error: 'Too many registration attempts',
    message: 'Too many accounts created from this IP, please try again after an hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Registration rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      error: 'Too many registration attempts',
      message: 'Too many accounts created from this IP, please try again after an hour.',
      retryAfter: '1 hour'
    });
  }
});

// Rate limiting para login (menos restrictivo pero aún seguro)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos por 15 minutos
  message: {
    error: 'Too many login attempts',
    message: 'Too many failed login attempts from this IP, please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Login rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Too many failed login attempts from this IP, please try again after 15 minutes.',
      retryAfter: '15 minutes'
    });
  }
});

// Rate limiting para refresh token
const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // 20 refreshes por 5 minutos
  message: {
    error: 'Too many refresh attempts',
    message: 'Too many token refresh attempts, please try again later.',
    retryAfter: '5 minutes'
  }
});

// =================================
// VALIDACIONES DE INPUT
// =================================

// Validaciones para registro
const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage('Email must be less than 254 characters'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('firstName')
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
    .withMessage('Username must start with a letter, end with a letter or number, and contain only letters, numbers, underscores, and dashes')
];

// Validaciones para login
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean value')
];

// Validaciones para refresh token
const validateRefresh = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isJWT()
    .withMessage('Invalid refresh token format')
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
    
    logger.warn('Validation errors in auth request', {
      errors: validationErrors,
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
// RUTAS DE AUTENTICACIÓN
// =================================

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: User ID
 *         email:
 *           type: string
 *           description: User email
 *         firstName:
 *           type: string
 *           description: User first name
 *         lastName:
 *           type: string
 *           description: User last name
 *         username:
 *           type: string
 *           description: Username
 *         role:
 *           type: string
 *           description: User role
 *         isActive:
 *           type: boolean
 *           description: Whether user is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update date
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               username:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
router.post('/register', 
  registerLimiter,
  validateRegister,
  handleValidationErrors,
  register
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               rememberMe:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many attempts
 */
router.post('/login',
  loginLimiter,
  validateLogin,
  handleValidationErrors,
  login
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout',
  authenticate,
  logout
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh',
  refreshLimiter,
  validateRefresh,
  handleValidationErrors,
  refreshToken
);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/profile',
  authenticate,
  getProfile
);

/**
 * @swagger
 * /api/v1/auth/verify:
 *   get:
 *     summary: Verify token validity
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Token is invalid
 */
router.get('/verify',
  authenticate,
  verifyToken
);

// =================================
// RUTA DE INFORMACIÓN
// =================================

/**
 * @swagger
 * /api/v1/auth:
 *   get:
 *     summary: Get authentication endpoints information
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Authentication endpoints information
 */
router.get('/', (req, res) => {
  res.json({
    message: 'DevAI Agent Authentication API',
    version: '1.0.0',
    endpoints: {
      register: 'POST /auth/register',
      login: 'POST /auth/login',
      logout: 'POST /auth/logout',
      refresh: 'POST /auth/refresh',
      profile: 'GET /auth/profile',
      verify: 'GET /auth/verify'
    },
    rateLimits: {
      register: '5 attempts per hour',
      login: '10 attempts per 15 minutes',
      refresh: '20 attempts per 5 minutes'
    },
    security: {
      passwordRequirements: [
        'Minimum 8 characters',
        'At least one uppercase letter',
        'At least one lowercase letter', 
        'At least one number',
        'At least one special character'
      ],
      tokenExpiry: {
        access: process.env.JWT_EXPIRES_IN || '24h',
        refresh: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
      }
    }
  });
});

// =================================
// MIDDLEWARE DE ERROR
// =================================

router.use((error, req, res, next) => {
  logger.error('Auth route error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // No exponer detalles del error en producción
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: 'Authentication error',
    message: isDevelopment ? error.message : 'An error occurred during authentication',
    ...(isDevelopment && { stack: error.stack })
  });
});

module.exports = router;