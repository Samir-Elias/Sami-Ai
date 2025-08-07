const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const { 
  validateEmail, 
  validateName, 
  validatePassword,
  validateUsername 
} = require('../utils/validators');
const { 
  createSuccessResponse, 
  createErrorResponse,
  createPaginationMeta,
  calculateOffset,
  pick,
  omit
} = require('../utils/helpers');
const { PAGINATION, USER_ROLES } = require('../utils/constants');

const prisma = new PrismaClient();

// =================================
// UTILIDADES
// =================================

// Crear respuesta de usuario (sin datos sensibles)
const createUserResponse = (user) => {
  return omit(user, ['password', 'refreshToken']);
};

// Filtrar usuarios para listado público
const filterUserForPublicList = (user) => {
  return pick(user, [
    'id',
    'firstName', 
    'lastName',
    'username',
    'createdAt',
    'profile'
  ]);
};

// =================================
// CONTROLADORES
// =================================

/**
 * @desc    Obtener lista de usuarios (solo admin/moderador)
 * @route   GET /api/v1/users
 * @access  Private (Admin/Moderator)
 */
const getUsers = async (req, res) => {
  try {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      search = '',
      role = '',
      isActive = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Verificar permisos (solo admin y moderador pueden ver lista completa)
    if (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.MODERATOR) {
      return res.status(403).json(
        createErrorResponse('Access denied', 'INSUFFICIENT_PERMISSIONS')
      );
    }

    // Validar paginación
    const safeLimit = Math.min(PAGINATION.MAX_LIMIT, Math.max(1, parseInt(limit)));
    const offset = calculateOffset(page, safeLimit);

    // Construir filtros
    const where = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== '') {
      where.isActive = isActive === 'true';
    }

    // Construir ordenamiento
    const orderBy = {};
    orderBy[sortBy] = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    // Obtener usuarios con conteo total
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: {
            select: {
              displayName: true,
              bio: true,
              avatar: true
            }
          },
          _count: {
            select: {
              conversations: true,
              projects: true
            }
          }
        },
        orderBy,
        skip: offset,
        take: safeLimit
      }),
      prisma.user.count({ where })
    ]);

    // Filtrar datos sensibles
    const safeUsers = users.map(user => ({
      ...createUserResponse(user),
      stats: user._count
    }));

    // Crear metadata de paginación
    const paginationMeta = createPaginationMeta(page, safeLimit, total);

    logger.info(`👥 Users list requested by ${req.user.email}`, {
      requesterId: req.user.id,
      totalUsers: total,
      filters: { search, role, isActive },
      pagination: { page, limit: safeLimit }
    });

    res.json(
      createSuccessResponse(
        safeUsers,
        'Users retrieved successfully',
        { pagination: paginationMeta }
      )
    );

  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json(
      createErrorResponse('Failed to retrieve users', 'INTERNAL_ERROR')
    );
  }
};

/**
 * @desc    Obtener mi perfil
 * @route   GET /api/v1/users/profile  
 * @access  Private
 */
const getMyProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
        _count: {
          select: {
            conversations: true,
            projects: true,
            files: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json(
        createErrorResponse('User not found', 'USER_NOT_FOUND')
      );
    }

    res.json(
      createSuccessResponse(
        {
          user: createUserResponse(user),
          stats: user._count
        },
        'Profile retrieved successfully'
      )
    );

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json(
      createErrorResponse('Failed to retrieve profile', 'INTERNAL_ERROR')
    );
  }
};

/**
 * @desc    Actualizar mi perfil
 * @route   PUT /api/v1/users/profile
 * @access  Private
 */
const updateMyProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username,
      bio,
      avatar,
      preferences = {}
    } = req.body;

    // Validaciones
    const validationErrors = [];

    if (firstName) {
      const firstNameValidation = validateName(firstName, 'First name');
      if (!firstNameValidation.isValid) {
        validationErrors.push(...firstNameValidation.issues);
      }
    }

    if (lastName) {
      const lastNameValidation = validateName(lastName, 'Last name');
      if (!lastNameValidation.isValid) {
        validationErrors.push(...lastNameValidation.issues);
      }
    }

    if (username) {
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.isValid) {
        validationErrors.push(...usernameValidation.issues);
      }

      // Verificar que el username no esté en uso
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          id: { not: req.user.id }
        }
      });

      if (existingUser) {
        validationErrors.push('Username is already taken');
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json(
        createErrorResponse(
          'Validation failed',
          'VALIDATION_ERROR',
          { validationErrors }
        )
      );
    }

    // Preparar datos para actualizar
    const updateData = {};
    const profileUpdateData = {};

    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (username) updateData.username = username.trim();

    if (bio !== undefined) profileUpdateData.bio = bio ? bio.trim() : null;
    if (avatar !== undefined) profileUpdateData.avatar = avatar;
    
    // Actualizar displayName si cambiaron firstName o lastName
    if (firstName || lastName) {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.id }
      });
      
      const newFirstName = firstName || currentUser.firstName;
      const newLastName = lastName || currentUser.lastName;
      profileUpdateData.displayName = `${newFirstName} ${newLastName || ''}`.trim();
    }

    // Manejar preferencias
    if (Object.keys(preferences).length > 0) {
      const currentProfile = await prisma.profile.findUnique({
        where: { userId: req.user.id }
      });
      
      profileUpdateData.preferences = {
        ...currentProfile?.preferences,
        ...preferences
      };
    }

    // Actualizar usuario y perfil en transacción
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Actualizar usuario
      const user = await tx.user.update({
        where: { id: req.user.id },
        data: updateData
      });

      // Actualizar perfil si hay datos
      if (Object.keys(profileUpdateData).length > 0) {
        await tx.profile.update({
          where: { userId: req.user.id },
          data: profileUpdateData
        });
      }

      // Obtener usuario completo actualizado
      return tx.user.findUnique({
        where: { id: req.user.id },
        include: { profile: true }
      });
    });

    logger.info(`👤 Profile updated: ${req.user.email}`, {
      userId: req.user.id,
      updatedFields: Object.keys({ ...updateData, ...profileUpdateData })
    });

    res.json(
      createSuccessResponse(
        createUserResponse(updatedUser),
        'Profile updated successfully'
      )
    );

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json(
      createErrorResponse('Failed to update profile', 'INTERNAL_ERROR')
    );
  }
};

/**
 * @desc    Cambiar contraseña
 * @route   PUT /api/v1/users/password
 * @access  Private
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json(
        createErrorResponse(
          'Current password and new password are required',
          'MISSING_FIELDS'
        )
      );
    }

    // Obtener usuario actual
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json(
        createErrorResponse('User not found', 'USER_NOT_FOUND')
      );
    }

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json(
        createErrorResponse('Current password is incorrect', 'INVALID_PASSWORD')
      );
    }

    // Validar nueva contraseña
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json(
        createErrorResponse(
          'New password does not meet requirements',
          'INVALID_NEW_PASSWORD',
          {
            requirements: passwordValidation.requirements,
            issues: passwordValidation.issues
          }
        )
      );
    }

    // Verificar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json(
        createErrorResponse(
          'New password must be different from current password',
          'SAME_PASSWORD'
        )
      );
    }

    // Hash de la nueva contraseña
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña e invalidar refresh token por seguridad
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        password: hashedNewPassword,
        refreshToken: null // Invalidar refresh token
      }
    });

    logger.info(`🔒 Password changed: ${req.user.email}`, {
      userId: req.user.id,
      ip: req.ip
    });

    res.json(
      createSuccessResponse(
        null,
        'Password changed successfully. Please log in again.'
      )
    );

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json(
      createErrorResponse('Failed to change password', 'INTERNAL_ERROR')
    );
  }
};

/**
 * @desc    Obtener usuario específico (admin/moderador)
 * @route   GET /api/v1/users/:userId
 * @access  Private (Admin/Moderator)
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verificar permisos
    if (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.MODERATOR) {
      return res.status(403).json(
        createErrorResponse('Access denied', 'INSUFFICIENT_PERMISSIONS')
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        _count: {
          select: {
            conversations: true,
            projects: true,
            files: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json(
        createErrorResponse('User not found', 'USER_NOT_FOUND')
      );
    }

    res.json(
      createSuccessResponse(
        {
          user: createUserResponse(user),
          stats: user._count
        },
        'User retrieved successfully'
      )
    );

  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json(
      createErrorResponse('Failed to retrieve user', 'INTERNAL_ERROR')
    );
  }
};

/**
 * @desc    Actualizar usuario (admin)
 * @route   PUT /api/v1/users/:userId
 * @access  Private (Admin only)
 */
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, isActive, ...otherFields } = req.body;

    // Solo admin puede actualizar otros usuarios
    if (req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json(
        createErrorResponse('Access denied', 'INSUFFICIENT_PERMISSIONS')
      );
    }

    // No permitir que el admin se desactive a sí mismo
    if (userId === req.user.id && isActive === false) {
      return res.status(400).json(
        createErrorResponse(
          'Cannot deactivate your own account',
          'SELF_DEACTIVATION_NOT_ALLOWED'
        )
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json(
        createErrorResponse('User not found', 'USER_NOT_FOUND')
      );
    }

    // Preparar datos de actualización
    const updateData = {};
    
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { profile: true }
    });

    logger.info(`👤 User updated by admin: ${user.email}`, {
      adminId: req.user.id,
      adminEmail: req.user.email,
      targetUserId: userId,
      targetUserEmail: user.email,
      changes: updateData
    });

    res.json(
      createSuccessResponse(
        createUserResponse(updatedUser),
        'User updated successfully'
      )
    );

  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json(
      createErrorResponse('Failed to update user', 'INTERNAL_ERROR')
    );
  }
};

/**
 * @desc    Eliminar mi cuenta
 * @route   DELETE /api/v1/users/profile
 * @access  Private
 */
const deleteMyAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json(
        createErrorResponse('Password is required to delete account', 'PASSWORD_REQUIRED')
      );
    }

    // Verificar contraseña
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json(
        createErrorResponse('Incorrect password', 'INVALID_PASSWORD')
      );
    }

    // Eliminar cuenta (soft delete - cambiar a isActive: false)
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        isActive: false,
        email: `deleted_${Date.now()}_${user.email}`, // Evitar conflictos
        refreshToken: null
      }
    });

    logger.info(`🗑️ Account deleted: ${user.email}`, {
      userId: req.user.id,
      ip: req.ip
    });

    res.json(
      createSuccessResponse(
        null,
        'Account deleted successfully'
      )
    );

  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json(
      createErrorResponse('Failed to delete account', 'INTERNAL_ERROR')
    );
  }
};

/**
 * @desc    Buscar usuarios públicos
 * @route   GET /api/v1/users/search
 * @access  Private
 */
const searchUsers = async (req, res) => {
  try {
    const {
      q = '',
      limit = 10
    } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json(
        createErrorResponse('Search query must be at least 2 characters', 'INVALID_SEARCH_QUERY')
      );
    }

    const safeLimit = Math.min(20, Math.max(1, parseInt(limit)));

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { username: { contains: q, mode: 'insensitive' } }
            ]
          }
        ]
      },
      include: {
        profile: {
          select: {
            displayName: true,
            avatar: true
          }
        }
      },
      take: safeLimit
    });

    // Filtrar para mostrar solo información pública
    const publicUsers = users.map(filterUserForPublicList);

    res.json(
      createSuccessResponse(
        publicUsers,
        'Users found successfully'
      )
    );

  } catch (error) {
    logger.error('Search users error:', error);
    res.status(500).json(
      createErrorResponse('Failed to search users', 'INTERNAL_ERROR')
    );
  }
};

// =================================
// EXPORTAR CONTROLADORES
// =================================

module.exports = {
  getUsers,
  getMyProfile,
  updateMyProfile,
  changePassword,
  getUserById,
  updateUser,
  deleteMyAccount,
  searchUsers
};