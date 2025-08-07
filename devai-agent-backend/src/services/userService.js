const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const { validateEmail, validatePassword } = require('../utils/validators');

const prisma = new PrismaClient();

// =================================
// SERVICIO DE USUARIOS
// =================================

class UserService {
  /**
   * Buscar usuario por email
   * @param {string} email - Email del usuario
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<Object|null>} Usuario encontrado o null
   */
  async findByEmail(email, options = {}) {
    try {
      const { includeProfile = false, includeStats = false } = options;
      
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          profile: includeProfile,
          ...(includeStats && {
            _count: {
              select: {
                conversations: true,
                projects: true,
                messages: true
              }
            }
          })
        }
      });
      
      return user;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Buscar usuario por ID
   * @param {string} id - ID del usuario
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<Object|null>} Usuario encontrado o null
   */
  async findById(id, options = {}) {
    try {
      const { includeProfile = false, includeStats = false } = options;
      
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          profile: includeProfile,
          ...(includeStats && {
            _count: {
              select: {
                conversations: true,
                projects: true,
                messages: true
              }
            }
          })
        }
      });
      
      return user;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Buscar usuario por username
   * @param {string} username - Username del usuario
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<Object|null>} Usuario encontrado o null
   */
  async findByUsername(username, options = {}) {
    try {
      const { includeProfile = false } = options;
      
      const user = await prisma.user.findUnique({
        where: { username },
        include: {
          profile: includeProfile
        }
      });
      
      return user;
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<Object>} Usuario creado
   */
  async createUser(userData) {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        username,
        role = 'user'
      } = userData;

      // Validaciones
      if (!validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(`Invalid password: ${passwordValidation.issues.join(', ')}`);
      }

      // Verificar usuario existente
      const existingUser = await this.findByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      if (username) {
        const existingUsername = await this.findByUsername(username);
        if (existingUsername) {
          throw new Error('Username is already taken');
        }
      }

      // Hash de contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Crear usuario con perfil
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          username: username || null,
          role,
          isActive: true,
          emailVerified: false,
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

      logger.info(`✅ User created successfully: ${email}`, {
        userId: newUser.id,
        email: newUser.email
      });

      return newUser;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Actualizar usuario
   * @param {string} id - ID del usuario
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Usuario actualizado
   */
  async updateUser(id, updateData) {
    try {
      const { profile: profileData, ...userData } = updateData;
      
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...userData,
          ...(profileData && {
            profile: {
              update: profileData
            }
          })
        },
        include: {
          profile: true
        }
      });

      logger.info(`📝 User updated: ${updatedUser.email}`, {
        userId: id,
        updatedFields: Object.keys(userData)
      });

      return updatedUser;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Cambiar contraseña del usuario
   * @param {string} id - ID del usuario
   * @param {string} currentPassword - Contraseña actual
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise<boolean>} True si se cambió exitosamente
   */
  async changePassword(id, currentPassword, newPassword) {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new Error('User not found');
      }

      // Verificar contraseña actual
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Validar nueva contraseña
      const passwordValidation = validatePassword(newPassword, {
        forbidPersonalInfo: [user.firstName, user.lastName, user.email]
      });
      
      if (!passwordValidation.isValid) {
        throw new Error(`Invalid new password: ${passwordValidation.issues.join(', ')}`);
      }

      // Verificar que no sea la misma contraseña
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new Error('New password must be different from current password');
      }

      // Hash y actualizar
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      await prisma.user.update({
        where: { id },
        data: {
          password: hashedNewPassword,
          refreshToken: null // Invalidar refresh tokens
        }
      });

      logger.info(`🔒 Password changed for user: ${user.email}`, { userId: id });
      return true;
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Desactivar usuario
   * @param {string} id - ID del usuario
   * @param {string} reason - Razón de desactivación
   * @returns {Promise<Object>} Usuario desactivado
   */
  async deactivateUser(id, reason = 'User requested account deactivation') {
    try {
      const deactivatedUser = await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          refreshToken: null,
          deactivatedAt: new Date(),
          deactivationReason: reason
        }
      });

      logger.info(`❌ User deactivated: ${deactivatedUser.email}`, {
        userId: id,
        reason
      });

      return deactivatedUser;
    } catch (error) {
      logger.error('Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * Reactivar usuario
   * @param {string} id - ID del usuario
   * @returns {Promise<Object>} Usuario reactivado
   */
  async reactivateUser(id) {
    try {
      const reactivatedUser = await prisma.user.update({
        where: { id },
        data: {
          isActive: true,
          deactivatedAt: null,
          deactivationReason: null
        }
      });

      logger.info(`✅ User reactivated: ${reactivatedUser.email}`, { userId: id });
      return reactivatedUser;
    } catch (error) {
      logger.error('Error reactivating user:', error);
      throw error;
    }
  }

  /**
   * Actualizar último login
   * @param {string} id - ID del usuario
   * @returns {Promise<Object>} Usuario actualizado
   */
  async updateLastLogin(id) {
    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          lastLoginAt: new Date()
        }
      });

      return updatedUser;
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas del usuario
   * @param {string} id - ID del usuario
   * @returns {Promise<Object>} Estadísticas del usuario
   */
  async getUserStats(id) {
    try {
      const stats = await prisma.user.findUnique({
        where: { id },
        select: {
          _count: {
            select: {
              conversations: true,
              projects: true,
              messages: true
            }
          }
        }
      });

      // Estadísticas adicionales
      const additionalStats = await Promise.all([
        // Conversaciones activas (con mensajes en los últimos 7 días)
        prisma.conversation.count({
          where: {
            userId: id,
            messages: {
              some: {
                createdAt: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                }
              }
            }
          }
        }),
        // Proyectos activos (actualizados en los últimos 30 días)
        prisma.project.count({
          where: {
            userId: id,
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        // Total de tokens utilizados (si tienes tracking de tokens)
        prisma.message.aggregate({
          where: {
            conversation: {
              userId: id
            }
          },
          _sum: {
            tokenCount: true
          }
        })
      ]);

      return {
        ...stats._count,
        activeConversations: additionalStats[0],
        activeProjects: additionalStats[1],
        totalTokensUsed: additionalStats[2]._sum.tokenCount || 0
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Buscar usuarios con filtros
   * @param {Object} filters - Filtros de búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Resultados paginados
   */
  async findUsers(filters = {}, pagination = {}) {
    try {
      const {
        search = '',
        role = '',
        isActive = '',
        emailVerified = ''
      } = filters;

      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = pagination;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

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

      if (role) where.role = role;
      if (isActive !== '') where.isActive = isActive === 'true';
      if (emailVerified !== '') where.emailVerified = emailVerified === 'true';

      // Ejecutar consulta
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            username: true,
            role: true,
            isActive: true,
            emailVerified: true,
            createdAt: true,
            lastLoginAt: true,
            profile: {
              select: {
                displayName: true,
                avatar: true
              }
            }
          },
          skip,
          take: limitNum,
          orderBy: {
            [sortBy]: sortOrder
          }
        }),
        prisma.user.count({ where })
      ]);

      return {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasMore: pageNum < Math.ceil(total / limitNum)
        }
      };
    } catch (error) {
      logger.error('Error finding users:', error);
      throw error;
    }
  }

  /**
   * Limpiar datos sensibles del usuario
   * @param {Object} user - Objeto usuario
   * @returns {Object} Usuario sin datos sensibles
   */
  sanitizeUser(user) {
    if (!user) return null;
    
    const { password, refreshToken, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Verificar si el usuario tiene permisos
   * @param {Object} user - Usuario a verificar
   * @param {string} permission - Permiso requerido
   * @returns {boolean} True si tiene permisos
   */
  hasPermission(user, permission) {
    if (!user || !user.isActive) return false;
    
    const permissions = {
      admin: ['manage_users', 'view_all_data', 'delete_data', 'change_roles'],
      moderator: ['view_users', 'moderate_content'],
      user: ['view_own_data', 'edit_own_data']
    };
    
    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes(permission);
  }
}

// Exportar instancia única del servicio
module.exports = new UserService();