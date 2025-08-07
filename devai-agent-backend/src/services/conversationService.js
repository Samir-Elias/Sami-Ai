const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const { CONVERSATION_STATUS, PAGINATION_CONFIG } = require('../utils/constants');
const { generateSlug, cleanObject, calculatePagination } = require('../utils/helpers');

const prisma = new PrismaClient();

// =================================
// SERVICIO DE CONVERSACIONES
// =================================

class ConversationService {
  /**
   * Buscar conversación por ID y usuario
   * @param {string} conversationId - ID de la conversación
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<Object|null>} Conversación encontrada o null
   */
  async findByIdAndUser(conversationId, userId, options = {}) {
    try {
      const { 
        includeMessages = false, 
        messageLimit = 50,
        includeStats = false 
      } = options;

      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId
        },
        include: {
          ...(includeStats && {
            _count: {
              select: {
                messages: true
              }
            }
          }),
          ...(includeMessages && {
            messages: {
              take: messageLimit,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                content: true,
                role: true,
                tokenCount: true,
                metadata: true,
                createdAt: true,
                updatedAt: true
              }
            }
          })
        }
      });

      return conversation;
    } catch (error) {
      logger.error('Error finding conversation by ID and user:', error);
      throw error;
    }
  }

  /**
   * Buscar conversación por slug y usuario
   * @param {string} slug - Slug de la conversación
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object|null>} Conversación encontrada o null
   */
  async findBySlugAndUser(slug, userId) {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          slug,
          userId
        }
      });

      return conversation;
    } catch (error) {
      logger.error('Error finding conversation by slug and user:', error);
      throw error;
    }
  }

  /**
   * Crear nueva conversación
   * @param {string} userId - ID del usuario
   * @param {Object} conversationData - Datos de la conversación
   * @returns {Promise<Object>} Conversación creada
   */
  async createConversation(userId, conversationData) {
    try {
      const {
        title,
        description = null,
        aiProvider = 'gemini',
        modelName = 'gemini-pro',
        systemPrompt = null,
        metadata = {}
      } = conversationData;

      // Validar título
      if (!title || title.trim().length === 0) {
        throw new Error('Title is required');
      }

      if (title.length > 200) {
        throw new Error('Title must be less than 200 characters');
      }

      // Generar slug único
      const baseSlug = generateSlug(title);
      const slug = await this.generateUniqueSlug(userId, baseSlug);

      // Crear conversación
      const conversation = await prisma.conversation.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          slug,
          userId,
          aiProvider,
          modelName,
          systemPrompt: systemPrompt?.trim() || null,
          status: CONVERSATION_STATUS.ACTIVE,
          metadata: cleanObject(metadata)
        },
        include: {
          _count: {
            select: {
              messages: true
            }
          }
        }
      });

      logger.info(`✅ Conversation created: ${conversation.title}`, {
        conversationId: conversation.id,
        userId,
        aiProvider,
        modelName
      });

      return conversation;
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Actualizar conversación
   * @param {string} conversationId - ID de la conversación
   * @param {string} userId - ID del usuario
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Conversación actualizada
   */
  async updateConversation(conversationId, userId, updateData) {
    try {
      // Verificar que existe y pertenece al usuario
      const existingConversation = await this.findByIdAndUser(conversationId, userId);
      if (!existingConversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Preparar datos de actualización
      const cleanedData = cleanObject(updateData);

      // Actualizar conversación
      const updatedConversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: cleanedData,
        include: {
          _count: {
            select: {
              messages: true
            }
          }
        }
      });

      logger.info(`📝 Conversation updated: ${updatedConversation.title}`, {
        conversationId,
        userId,
        updatedFields: Object.keys(cleanedData)
      });

      return updatedConversation;
    } catch (error) {
      logger.error('Error updating conversation:', error);
      throw error;
    }
  }

  /**
   * Eliminar conversación (soft delete o permanente)
   * @param {string} conversationId - ID de la conversación
   * @param {string} userId - ID del usuario
   * @param {boolean} permanent - Si es eliminación permanente
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async deleteConversation(conversationId, userId, permanent = false) {
    try {
      // Verificar que existe y pertenece al usuario
      const existingConversation = await this.findByIdAndUser(conversationId, userId);
      if (!existingConversation) {
        throw new Error('Conversation not found or access denied');
      }

      if (permanent) {
        // Eliminación permanente - también elimina mensajes asociados
        await prisma.conversation.delete({
          where: { id: conversationId }
        });

        logger.info(`🗑️ Conversation permanently deleted: ${existingConversation.title}`, {
          conversationId,
          userId
        });

        return { deleted: true, permanent: true };
      } else {
        // Soft delete
        const deletedConversation = await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            status: CONVERSATION_STATUS.DELETED,
            deletedAt: new Date()
          }
        });

        logger.info(`📦 Conversation soft deleted: ${existingConversation.title}`, {
          conversationId,
          userId
        });

        return { conversation: deletedConversation, permanent: false };
      }
    } catch (error) {
      logger.error('Error deleting conversation:', error);
      throw error;
    }
  }

  /**
   * Archivar conversación
   * @param {string} conversationId - ID de la conversación
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Conversación archivada
   */
  async archiveConversation(conversationId, userId) {
    try {
      const existingConversation = await this.findByIdAndUser(conversationId, userId);
      if (!existingConversation) {
        throw new Error('Conversation not found or access denied');
      }

      const archivedConversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: CONVERSATION_STATUS.ARCHIVED,
          archivedAt: new Date()
        }
      });

      logger.info(`📦 Conversation archived: ${existingConversation.title}`, {
        conversationId,
        userId
      });

      return archivedConversation;
    } catch (error) {
      logger.error('Error archiving conversation:', error);
      throw error;
    }
  }

  /**
   * Restaurar conversación archivada o eliminada
   * @param {string} conversationId - ID de la conversación
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Conversación restaurada
   */
  async restoreConversation(conversationId, userId) {
    try {
      const existingConversation = await this.findByIdAndUser(conversationId, userId);
      if (!existingConversation) {
        throw new Error('Conversation not found or access denied');
      }

      const restoredConversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: CONVERSATION_STATUS.ACTIVE,
          archivedAt: null,
          deletedAt: null
        }
      });

      logger.info(`♻️ Conversation restored: ${existingConversation.title}`, {
        conversationId,
        userId
      });

      return restoredConversation;
    } catch (error) {
      logger.error('Error restoring conversation:', error);
      throw error;
    }
  }

  /**
   * Listar conversaciones del usuario con filtros y paginación
   * @param {string} userId - ID del usuario
   * @param {Object} filters - Filtros de búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Conversaciones paginadas
   */
  async listUserConversations(userId, filters = {}, pagination = {}) {
    try {
      const {
        search = '',
        status = '',
        aiProvider = ''
      } = filters;

      const {
        page = PAGINATION_CONFIG.DEFAULT_PAGE,
        limit = PAGINATION_CONFIG.DEFAULT_LIMIT,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = pagination;

      // Validar y limpiar parámetros
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(
        PAGINATION_CONFIG.MAX_LIMIT,
        Math.max(PAGINATION_CONFIG.MIN_LIMIT, parseInt(limit))
      );

      // Construir filtros
      const where = {
        userId,
        ...(status && { status }),
        ...(aiProvider && { aiProvider }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            {
              messages: {
                some: {
                  content: { contains: search, mode: 'insensitive' }
                }
              }
            }
          ]
        })
      };

      // Obtener conversaciones y total
      const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
          where,
          include: {
            _count: {
              select: {
                messages: true
              }
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                content: true,
                role: true,
                createdAt: true
              }
            }
          },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: {
            [sortBy]: sortOrder
          }
        }),
        prisma.conversation.count({ where })
      ]);

      // Formatear conversaciones
      const formattedConversations = conversations.map(conv => ({
        ...conv,
        messageCount: conv._count.messages,
        lastMessage: conv.messages[0] || null,
        messages: undefined, // Remover messages del array principal
        _count: undefined // Remover _count
      }));

      const paginationInfo = calculatePagination(total, pageNum, limitNum);

      return {
        conversations: formattedConversations,
        pagination: paginationInfo
      };
    } catch (error) {
      logger.error('Error listing user conversations:', error);
      throw error;
    }
  }

  /**
   * Actualizar último acceso a la conversación
   * @param {string} conversationId - ID de la conversación
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Conversación actualizada
   */
  async updateLastAccess(conversationId, userId) {
    try {
      const updatedConversation = await prisma.conversation.updateMany({
        where: {
          id: conversationId,
          userId
        },
        data: {
          lastAccessedAt: new Date()
        }
      });

      if (updatedConversation.count === 0) {
        throw new Error('Conversation not found or access denied');
      }

      return { updated: true };
    } catch (error) {
      logger.error('Error updating last access:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de conversaciones del usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Estadísticas
   */
  async getUserConversationStats(userId) {
    try {
      const [totalConversations, statusCounts, providerCounts, recentActivity] = await Promise.all([
        // Total de conversaciones
        prisma.conversation.count({
          where: { userId }
        }),
        
        // Conteo por estado
        prisma.conversation.groupBy({
          by: ['status'],
          where: { userId },
          _count: { status: true }
        }),
        
        // Conteo por proveedor de IA
        prisma.conversation.groupBy({
          by: ['aiProvider'],
          where: { userId },
          _count: { aiProvider: true }
        }),
        
        // Actividad reciente (últimos 30 días)
        prisma.conversation.count({
          where: {
            userId,
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      // Formatear estadísticas
      const statusStats = {};
      statusCounts.forEach(item => {
        statusStats[item.status] = item._count.status;
      });

      const providerStats = {};
      providerCounts.forEach(item => {
        providerStats[item.aiProvider] = item._count.aiProvider;
      });

      return {
        total: totalConversations,
        byStatus: statusStats,
        byProvider: providerStats,
        recentActivity
      };
    } catch (error) {
      logger.error('Error getting user conversation stats:', error);
      throw error;
    }
  }

  /**
   * Generar slug único para el usuario
   * @param {string} userId - ID del usuario
   * @param {string} baseSlug - Slug base
   * @returns {Promise<string>} Slug único
   */
  async generateUniqueSlug(userId, baseSlug) {
    let slug = baseSlug;
    let counter = 1;

    while (await this.findBySlugAndUser(slug, userId)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Limpiar conversaciones eliminadas permanentemente
   * @param {number} daysOld - Días de antigüedad para limpiar
   * @returns {Promise<Object>} Resultado de la limpieza
   */
  async cleanupDeletedConversations(daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const deletedConversations = await prisma.conversation.deleteMany({
        where: {
          status: CONVERSATION_STATUS.DELETED,
          deletedAt: {
            lt: cutoffDate
          }
        }
      });

      logger.info(`🧹 Cleaned up ${deletedConversations.count} old deleted conversations`, {
        daysOld,
        count: deletedConversations.count
      });

      return {
        cleaned: deletedConversations.count,
        daysOld
      };
    } catch (error) {
      logger.error('Error cleaning up deleted conversations:', error);
      throw error;
    }
  }

  /**
   * Duplicar conversación (crear copia)
   * @param {string} conversationId - ID de la conversación original
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de duplicación
   * @returns {Promise<Object>} Conversación duplicada
   */
  async duplicateConversation(conversationId, userId, options = {}) {
    try {
      const { includeMessages = false, newTitle = null } = options;

      // Obtener conversación original
      const originalConversation = await this.findByIdAndUser(
        conversationId, 
        userId, 
        { includeMessages, includeStats: false }
      );

      if (!originalConversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Preparar datos para la nueva conversación
      const title = newTitle || `${originalConversation.title} (Copy)`;
      const slug = await this.generateUniqueSlug(userId, generateSlug(title));

      // Crear conversación duplicada
      const duplicatedConversation = await prisma.conversation.create({
        data: {
          title,
          description: originalConversation.description,
          slug,
          userId,
          aiProvider: originalConversation.aiProvider,
          modelName: originalConversation.modelName,
          systemPrompt: originalConversation.systemPrompt,
          status: CONVERSATION_STATUS.ACTIVE,
          metadata: originalConversation.metadata || {}
        }
      });

      // Duplicar mensajes si se solicita
      if (includeMessages && originalConversation.messages?.length > 0) {
        const messagesToCreate = originalConversation.messages.map(message => ({
          conversationId: duplicatedConversation.id,
          content: message.content,
          role: message.role,
          tokenCount: message.tokenCount,
          metadata: message.metadata || {}
        }));

        await prisma.message.createMany({
          data: messagesToCreate
        });
      }

      logger.info(`📋 Conversation duplicated: ${originalConversation.title} -> ${title}`, {
        originalId: conversationId,
        newId: duplicatedConversation.id,
        userId,
        includeMessages
      });

      return duplicatedConversation;
    } catch (error) {
      logger.error('Error duplicating conversation:', error);
      throw error;
    }
  }
}

// Exportar instancia única del servicio
module.exports = new ConversationService();