const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const { validateEmail, validatePassword } = require('../utils/validators');

const prisma = new PrismaClient();

// =================================
// CONFIGURACIÓN JWT
// =================================

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// =================================
// UTILIDADES
// =================================

// Generar tokens JWT
const generateTokens = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role || 'user'
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'devai-agent',
    audience: 'devai-agent-client'
  });

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'devai-agent',
      audience: 'devai-agent-client'
    }
  );

  return { accessToken, refreshToken };
};

// Crear respuesta de usuario (sin datos sensibles)
const createUserResponse = (user) => {
  const { password, refreshToken, ...userResponse } = user;
  return userResponse;
};

// =================================
// CONTROLADORES
// =================================

/**
 * @desc    Registrar nuevo usuario
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, username } = req.body;

    // Validaciones básicas
    if (!email || !password || !firstName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, password, and firstName are required',
        required: ['email', 'password', 'firstName']
      });
    }

    // Validar formato de email
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      });
    }

    // Validar contraseña
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password does not meet requirements',
        requirements: passwordValidation.requirements,
        issues: passwordValidation.issues
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          ...(username ? [{ username }] : [])
        ]
      }
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({
        error: 'User already exists',
        message: `A user with this ${field} already exists`,
        field
      });
    }

    // Hash de la contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        username: username || null,
        role: 'user',
        isActive: true,
        emailVerified: false, // En el futuro implementar verificación por email
        profile: {
          create: {
            displayName: `${firstName} ${lastName || ''}`.trim(),
            bio: null,
            avatar: null,
            preferences: {
              theme: 'light',
              language: 'en',
              notifications: {
                email: true,
                push: true
              }
            }
          }
        }
      },
      include: {
        profile: true
      }
    });

    // Generar tokens
    const { accessToken, refreshToken } = generateTokens(newUser);

    // Guardar refresh token en la base de datos
    await prisma.user.update({
      where: { id: newUser.id },
      data: { refreshToken }
    });

    // Log del registro
    logger.info(`👤 New user registered: ${email}`, {
      userId: newUser.id,
      email: newUser.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Respuesta
    res.status(201).json({
      message: 'User registered successfully',
      user: createUserResponse(newUser),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
};

/**
 * @desc    Iniciar sesión
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Contact support.'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Log intento fallido
      logger.warn(`🚨 Failed login attempt for: ${email}`, {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Generar tokens
    const tokens = generateTokens(user);
    const { accessToken, refreshToken } = tokens;

    // Actualizar último login y refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        refreshToken: rememberMe ? refreshToken : null
      }
    });

    // Log del login exitoso
    logger.info(`✅ User logged in: ${email}`, {
      userId: user.id,
      email: user.email,
      rememberMe,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Respuesta
    res.json({
      message: 'Login successful',
      user: createUserResponse(user),
      tokens: {
        accessToken,
        ...(rememberMe && { refreshToken }),
        expiresIn: JWT_EXPIRES_IN
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
};

/**
 * @desc    Cerrar sesión
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    const userId = req.user.id;

    // Invalidar refresh token
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });

    // Log del logout
    logger.info(`👋 User logged out: ${req.user.email}`, {
      userId,
      ip: req.ip
    });

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
};

/**
 * @desc    Renovar token de acceso
 * @route   POST /api/v1/auth/refresh
 * @access  Public (requiere refresh token)
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({
        error: 'Missing refresh token',
        message: 'Refresh token is required'
      });
    }

    // Verificar refresh token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid or expired'
      });
    }

    // Verificar que sea un refresh token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Invalid token type',
        message: 'Token is not a refresh token'
      });
    }

    // Buscar usuario y verificar refresh token
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.id,
        refreshToken: token,
        isActive: true
      },
      include: { profile: true }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token not found or user inactive'
      });
    }

    // Generar nuevos tokens
    const newTokens = generateTokens(user);

    // Actualizar refresh token en la base de datos
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newTokens.refreshToken }
    });

    logger.info(`🔄 Token refreshed for user: ${user.email}`, {
      userId: user.id
    });

    res.json({
      message: 'Token refreshed successfully',
      tokens: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresIn: JWT_EXPIRES_IN
      }
    });

  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: 'An error occurred while refreshing token'
    });
  }
};

/**
 * @desc    Obtener perfil del usuario actual
 * @route   GET /api/v1/auth/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
        _count: {
          select: {
            conversations: true,
            projects: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    res.json({
      user: createUserResponse(user),
      stats: user._count
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'An error occurred while fetching profile'
    });
  }
};

/**
 * @desc    Verificar estado del token
 * @route   GET /api/v1/auth/verify
 * @access  Private
 */
const verifyToken = async (req, res) => {
  try {
    // Si llegamos aquí, el token es válido (middleware de auth ya lo verificó)
    res.json({
      valid: true,
      user: createUserResponse(req.user),
      expiresAt: new Date(req.user.exp * 1000).toISOString()
    });

  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'An error occurred during token verification'
    });
  }
};

// =================================
// EXPORTAR CONTROLADORES
// =================================

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  verifyToken
};