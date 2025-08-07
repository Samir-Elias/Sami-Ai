const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const { MESSAGE_TYPES, MESSAGE_STATUS, PAGINATION_CONFIG } = require('../utils/constants');
const { calculatePagination, cleanObject } = require('../utils/helpers');

const prisma = new PrismaClient();

// =================================
// SERVICIO DE MENSAJES
// =================================

class MessageService {
  /**
   * Buscar mensaje por ID y verificar acceso del usuario
   * @param {string} messageId - ID del mensaje
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<Object|null>} Mensaje encontrado o null
   */
  async findByIdAndUser(messageId, userId, options = {}) {
    try {
      const { includeConversation = false, includeReplies = false } = options;

      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          conversation: {
            userId // Solo puede acceder si es propietario de la conversación
          }
        },
        include: {
          ...(includeConversation && {
            conversation: {
              select: {
                id: true,
                title: true,
                userId: true
              }
            }
          }),
          parentMessage: {
            select: {
              id: true,
              content: true,
              role: true,
              createdAt: true
            }
          },
          ...(includeReplies && {
            replies: {
              select: {
                id: true,
                content: true,
                role: true,
                createdAt: true
              },
              orderBy: {
                createdAt: 'asc'
              }
            }
          })
        }
      });

      return message;
    } catch (error) {
      logger.error('Error finding message by ID and user:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo mensaje
   * @param {string} conversationId - ID de la conversación
   * @param {string} userId - ID del usuario
   * @param {Object} messageData - Datos del mensaje
   * @returns {Promise<Object>} Mensaje creado
   */
  async createMessage(conversationId, userId, messageData) {
    try {
      const {
        content,
        role = MESSAGE_TYPES.USER,
        metadata = {},
        parentMessageId = null
      } = messageData;

      // Validar contenido
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new Error('Message content is required');
      }

      const trimmedContent = content.trim();
      if (trimmedContent.length > 10000) {
        throw new Error('Message content is too long (max 10,000 characters)');
      }

      // Validar rol
      if (!Object.values(MESSAGE_TYPES).includes(role)) {
        throw new Error(`Invalid message role: ${role}`);
      }

      // Verificar que la conversación existe y pertenece al usuario
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId
        }
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Verificar mensaje padre si se especifica
      if (parentMessageId) {
        const parentMessage = await prisma.message.findFirst({
          where: {
            id: parentMessageId,
            conversationId
          }
        });

        if (!parentMessage) {
          throw new Error('Parent message not found in this conversation');
        }
      }

      // Calcular tokens (estimación simple: 1 token ≈ 4 caracteres)
      const tokenCount = Math.ceil(trimmedContent.length / 4);

      // Crear mensaje en transacción
      const result = await prisma.$transaction(async (tx) => {
        // Crear mensaje
        const message = await tx.message.create({
          data: {
            conversationId,
            content: trimmedContent,
            role,
            status: MESSAGE_STATUS.COMPLETED,
            tokenCount,
            metadata: cleanObject(metadata),
            parentMessageId
          }
        });

        // Actualizar conversación
        await tx.conversation.update({
          where: { id: conversationId },
          data: {
            updatedAt: new Date(),
            lastAccessedAt: new Date()
          }
        });

        return message;
      });

      logger.info(`📝 Message created successfully`, {
        messageId: result.id,
        conversationId,
        userId,
        role,
        tokenCount,
        contentLength: trimmedContent.length
      });

      return result;
    } catch (error) {
      logger.error('Error creating message:', error);
      throw error;
    }
  }

  /**
   * Actualizar mensaje
   * @param {string} messageId - ID del mensaje
   * @param {string} userId - ID del usuario
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Mensaje actualizado
   */
  async updateMessage(messageId, userId, updateData) {
    try {
      // Verificar que el mensaje existe y el usuario tiene acceso
      const existingMessage = await this.findByIdAndUser(messageId, userId);
      if (!existingMessage) {
        throw new Error('Message not found or access denied');
      }

      // Solo permitir editar mensajes del usuario
      if (existingMessage.role !== MESSAGE_TYPES.USER) {
        throw new Error('You can only edit your own messages');
      }

      // Preparar datos de actualización
      const cleanedUpdateData = cleanObject(updateData);

      // Si se actualiza el contenido, recalcular tokens
      if (cleanedUpdateData.content) {
        const trimmedContent = cleanedUpdateData.content.trim();
        if (trimmedContent.length === 0) {
          throw new Error('Message content cannot be empty');
        }
        if (trimmedContent.length > 10000) {
          throw new Error('Message content is too long (max 10,000 characters)');
        }
        cleanedUpdateData.content = trimmedContent;
        cleanedUpdateData.tokenCount = Math.ceil(trimmedContent.length / 4);
      }

      // Actualizar mensaje
      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: cleanedUpdateData
      });

      logger.info(`✏️ Message updated successfully`, {
        messageId,
        userId,
        updatedFields: Object.keys(cleanedUpdateData)
      });

      return updatedMessage;
    } catch (error) {
      logger.error('Error updating message:', error);
      throw error;
    }
  }

  /**
   * Eliminar mensaje (soft delete o permanente)
   * @param {string} messageId - ID del mensaje
   * @param {string} userId - ID del usuario
   * @param {boolean} permanent - Si es eliminación permanente
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async deleteMessage(messageId, userId, permanent = false) {
    try {
      // Verificar que el mensaje existe y el usuario tiene acceso
      const existingMessage = await this.findByIdAndUser(messageId, userId);
      if (!existingMessage) {
        throw new Error('Message not found or access denied');
      }

      // Solo permitir eliminar mensajes del usuario
      if (existingMessage.role !== MESSAGE_TYPES.USER) {
        throw new Error('You can only delete your own messages');
      }

      if (permanent) {
        // Eliminación permanente
        await prisma.message.delete({
          where: { id: messageId }
        });

        logger.info(`🗑️ Message permanently deleted`, {
          messageId,
          userId,
          conversationId: existingMessage.conversationId
        });

        return { deleted: true, permanent: true };
      } else {
        // Soft delete - marcar como eliminado
        const deletedMessage = await prisma.message.update({
          where: { id: messageId },
          data: {
            content: '[Message deleted]',
            metadata: {
              ...existingMessage.metadata,
              deleted: true,
              deletedAt: new Date().toISOString()
            }
          }
        });

        logger.info(`📦 Message soft deleted`, {
          messageId,
          userId,
          conversationId: existingMessage.conversationId
        });

        return { message: deletedMessage, permanent: false };
      }
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Listar mensajes de una conversación con filtros y paginación
   * @param {string} conversationId - ID de la conversación
   * @param {string} userId - ID del usuario
   * @param {Object} filters - Filtros de búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Mensajes paginados
   */
  async listConversationMessages(conversationId, userId, filters = {}, pagination = {}) {
    try {
      // Verificar acceso a la conversación
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId
        }
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      const {
        search = '',
        role = ''
      } = filters;

      const {
        page = PAGINATION_CONFIG.DEFAULT_PAGE,
        limit = PAGINATION_CONFIG.DEFAULT_LIMIT,
        sortBy = 'createdAt',
        sortOrder = 'asc'
      } = pagination;

      // Validar parámetros
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(
        PAGINATION_CONFIG.MAX_LIMIT,
        Math.max(PAGINATION_CONFIG.MIN_LIMIT, parseInt(limit))
      );

      // Construir filtros
      const where = {
        conversationId,
        ...(role && Object.values(MESSAGE_TYPES).includes(role) && { role }),
        ...(search && {
          content: { contains: search, mode: 'insensitive' }
        })
      };

      // Obtener mensajes y total
      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where,
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: {
            [sortBy]: sortOrder
          },
          include: {
            parentMessage: {
              select: {
                id: true,
                content: true,
                role: true
              }
            }
          }
        }),
        prisma.message.count({ where })
      ]);

      const paginationInfo = calculatePagination(total, pageNum, limitNum);

      return {
        messages,
        pagination: paginationInfo
      };
    } catch (error) {
      logger.error('Error listing conversation messages:', error);
      throw error;
    }
  }

  /**
   * Buscar mensajes en una conversación
   * @param {string} conversationId - ID de la conversación
   * @param {string} userId - ID del usuario
   * @param {Object} searchOptions - Opciones de búsqueda
   * @returns {Promise<Array>} Mensajes encontrados
   */
  async searchMessages(conversationId, userId, searchOptions) {
    try {
      const { query, role = '', limit = 20 } = searchOptions;

      if (!query || query.trim().length === 0) {
        throw new Error('Search query is required');
      }

      // Verificar acceso a la conversación
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId
        }
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

      // Construir filtros de búsqueda
      const where = {
        conversationId,
        content: { contains: query.trim(), mode: 'insensitive' },
        ...(role && Object.values(MESSAGE_TYPES).includes(role) && { role })
      };

      // Buscar mensajes
      const messages = await prisma.message.findMany({
        where,
        take: limitNum,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          parentMessage: {
            select: {
              id: true,
              content: true,
              role: true
            }
          }
        }
      });

      logger.info(`🔍 Message search performed`, {
        conversationId,
        userId,
        query,
        results: messages.length
      });

      return messages;
    } catch (error) {
      logger.error('Error searching messages:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de mensajes de una conversación
   * @param {string} conversationId - ID de la conversación
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Estadísticas
   */
  async getConversationMessageStats(conversationId, userId) {
    try {
      // Verificar acceso a la conversación
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId
        }
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Obtener estadísticas
      const [totalMessages, roleStats, tokenStats] = await Promise.all([
        // Total de mensajes
        prisma.message.count({
          where: { conversationId }
        }),

        // Conteo por rol
        prisma.message.groupBy({
          by: ['role'],
          where: { conversationId },
          _count: { role: true }
        }),

        // Estadísticas de tokens
        prisma.message.aggregate({
          where: { conversationId },
          _sum: { tokenCount: true },
          _avg: { tokenCount: true },
          _max: { tokenCount: true },
          _min: { tokenCount: true }
        })
      ]);

      // Formatear estadísticas por rol
      const messagesByRole = {};
      roleStats.forEach(stat => {
        messagesByRole[stat.role] = stat._count.role;
      });

      return {
        totalMessages,
        messagesByRole,
        tokens: {
          total: tokenStats._sum.tokenCount || 0,
          average: Math.round(tokenStats._avg.tokenCount || 0),
          max: tokenStats._max.tokenCount || 0,
          min: tokenStats._min.tokenCount || 0
        }
      };
    } catch (error) {
      logger.error('Error getting conversation message stats:', error);
      throw error;
    }
  }

  /**
   * Obtener cadena de mensajes (hilo de conversación)
   * @param {string} messageId - ID del mensaje
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} Cadena de mensajes
   */
  async getMessageThread(messageId, userId) {
    try {
      // Verificar acceso al mensaje
      const message = await this.findByIdAndUser(messageId, userId);
      if (!message) {
        throw new Error('Message not found or access denied');
      }

      const conversationId = message.conversationId;

      // Encontrar mensaje raíz
      let rootMessage = message;
      while (rootMessage.parentMessageId) {
        const parent = await prisma.message.findFirst({
          where: {
            id: rootMessage.parentMessageId,
            conversationId
          }
        });
        if (!parent) break;
        rootMessage = parent;
      }

      // Obtener toda la cadena desde el mensaje raíz
      const buildThread = async (messageId, depth = 0) => {
        if (depth > 10) return []; // Evitar bucles infinitos

        const currentMessage = await prisma.message.findUnique({
          where: { id: messageId }
        });

        if (!currentMessage) return [];

        const children = await prisma.message.findMany({
          where: {
            parentMessageId: messageId,
            conversationId
          },
          orderBy: { createdAt: 'asc' }
        });

        const thread = [currentMessage];
        for (const child of children) {
          const childThread = await buildThread(child.id, depth + 1);
          thread.push(...childThread);
        }

        return thread;
      };

      const thread = await buildThread(rootMessage.id);

      logger.info(`🧵 Message thread retrieved`, {
        messageId,
        rootMessageId: rootMessage.id,
        threadLength: thread.length,
        userId
      });

      return thread;
    } catch (error) {
      logger.error('Error getting message thread:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas generales de mensajes del usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Estadísticas generales
   */
  async getUserMessageStats(userId) {
    try {
      const [totalMessages, roleStats, recentActivity, tokenUsage] = await Promise.all([
        // Total de mensajes del usuario
        prisma.message.count({
          where: {
            conversation: { userId }
          }
        }),

        // Conteo por rol
        prisma.message.groupBy({
          by: ['role'],
          where: {
            conversation: { userId }
          },
          _count: { role: true }
        }),

        // Actividad reciente (últimos 7 días)
        prisma.message.count({
          where: {
            conversation: { userId },
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),

        // Uso de tokens
        prisma.message.aggregate({
          where: {
            conversation: { userId }
          },
          _sum: { tokenCount: true },
          _avg: { tokenCount: true }
        })
      ]);

      const messagesByRole = {};
      roleStats.forEach(stat => {
        messagesByRole[stat.role] = stat._count.role;
      });

      return {
        totalMessages,
        messagesByRole,
        recentActivity,
        tokenUsage: {
          total: tokenUsage._sum.tokenCount || 0,
          average: Math.round(tokenUsage._avg.tokenCount || 0)
        }
      };
    } catch (error) {
      logger.error('Error getting user message stats:', error);
      throw error;
    }
  }

  /**
   * Limpiar mensajes antiguos eliminados
   * @param {number} daysOld - Días de antigüedad para limpiar
   * @returns {Promise<Object>} Resultado de la limpieza
   */
  async cleanupDeletedMessages(daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const deletedMessages = await prisma.message.deleteMany({
        where: {
          metadata: {
            path: ['deleted'],
            equals: true
          },
          updatedAt: {
            lt: cutoffDate
          }
        }
      });

      logger.info(`🧹 Cleaned up ${deletedMessages.count} old deleted messages`, {
        daysOld,
        count: deletedMessages.count
      });

      return {
        cleaned: deletedMessages.count,
        daysOld
      };
    } catch (error) {
      logger.error('Error cleaning up deleted messages:', error);
      throw error;
    }
  }
}

// Exportar instancia única del servicio
module.exports = new MessageService();