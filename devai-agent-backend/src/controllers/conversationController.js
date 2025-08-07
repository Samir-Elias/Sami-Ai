const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const { CONVERSATION_STATUS, PAGINATION_CONFIG, ERROR_MESSAGES } = require('../utils/constants');
const { calculatePagination, generateSlug, cleanObject } = require('../utils/helpers');

const prisma = new PrismaClient();

// =================================
// UTILIDADES
// =================================

// Limpiar datos sensibles de la conversación
const sanitizeConversation = (conversation) => {
  if (!conversation) return null;
  
  return {
    ...conversation,
    messages: conversation.messages?.map(message => ({
      ...message,
      // No incluir datos sensibles si es necesario
    }))
  };
};

// =================================
// CONTROLADORES DE CONVERSACIONES
// =================================

/**
 * @desc    Obtener conversaciones del usuario
 * @route   GET /api/v1/conversations
 * @access  Private
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = PAGINATION_CONFIG.DEFAULT_PAGE,
      limit = PAGINATION_CONFIG.DEFAULT_LIMIT,
      search = '',
      status = '',
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

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
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
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

    // Obtener conversaciones con paginación
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

    const pagination = calculatePagination(total, pageNum, limitNum);

    // Formatear respuesta
    const formattedConversations = conversations.map(conv => ({
      ...sanitizeConversation(conv),
      messageCount: conv._count.messages,
      lastMessage: conv.messages[0] || null
    }));

    logger.info(`📋 User ${req.user.email} retrieved ${conversations.length} conversations`, {
      userId,
      total,
      page: pageNum,
      limit: limitNum
    });

    res.json({
      conversations: formattedConversations,
      pagination,
      filters: {
        search,
        status,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    logger.error('Get conversations error:', error);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Crear nueva conversación
 * @route   POST /api/v1/conversations
 * @access  Private
 */
const createConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      title, 
      description = null,
      aiProvider = 'gemini',
      modelName = 'gemini-pro',
      systemPrompt = null,
      metadata = {}
    } = req.body;

    // Validaciones
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Title is required'
      });
    }

    if (title.length > 200) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Title must be less than 200 characters'
      });
    }

    // Generar slug único
    const baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    // Verificar unicidad del slug para este usuario
    while (await prisma.conversation.findFirst({
      where: { userId, slug }
    })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

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

    logger.info(`💬 New conversation created: ${conversation.title}`, {
      conversationId: conversation.id,
      userId,
      aiProvider,
      modelName
    });

    res.status(201).json({
      message: 'Conversation created successfully',
      conversation: {
        ...sanitizeConversation(conversation),
        messageCount: 0
      }
    });

  } catch (error) {
    logger.error('Create conversation error:', error);
    res.status(500).json({
      error: 'Failed to create conversation',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Obtener conversación por ID
 * @route   GET /api/v1/conversations/:id
 * @access  Private
 */
const getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { includeMessages = 'false', messageLimit = 50 } = req.query;

    const includeMessagesFlag = includeMessages === 'true';
    const messageLimitNum = Math.min(100, Math.max(1, parseInt(messageLimit)));

    // Buscar conversación
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId // Solo puede acceder el propietario
      },
      include: {
        _count: {
          select: {
            messages: true
          }
        },
        ...(includeMessagesFlag && {
          messages: {
            take: messageLimitNum,
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

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        message: 'Conversation with specified ID does not exist or you do not have access'
      });
    }

    // Actualizar último acceso
    await prisma.conversation.update({
      where: { id },
      data: { lastAccessedAt: new Date() }
    });

    // Formatear respuesta
    const response = {
      ...sanitizeConversation(conversation),
      messageCount: conversation._count.messages
    };

    // Ordenar mensajes cronológicamente si se incluyen
    if (includeMessagesFlag && conversation.messages) {
      response.messages = conversation.messages.reverse();
    }

    logger.info(`📖 User accessed conversation: ${conversation.title}`, {
      conversationId: id,
      userId,
      includeMessages: includeMessagesFlag
    });

    res.json({
      conversation: response
    });

  } catch (error) {
    logger.error('Get conversation by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch conversation',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Actualizar conversación
 * @route   PUT /api/v1/conversations/:id
 * @access  Private
 */
const updateConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { 
      title, 
      description, 
      systemPrompt,
      metadata,
      status
    } = req.body;

    // Verificar que la conversación existe y pertenece al usuario
    const existingConversation = await prisma.conversation.findFirst({
      where: { id, userId }
    });

    if (!existingConversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        message: 'Conversation with specified ID does not exist or you do not have access'
      });
    }

    // Preparar datos de actualización
    const updateData = {};

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Title cannot be empty'
        });
      }
      if (title.length > 200) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Title must be less than 200 characters'
        });
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (systemPrompt !== undefined) {
      updateData.systemPrompt = systemPrompt?.trim() || null;
    }

    if (metadata !== undefined) {
      updateData.metadata = cleanObject(metadata);
    }

    if (status !== undefined) {
      if (!Object.values(CONVERSATION_STATUS).includes(status)) {
        return res.status(400).json({
          error: 'Validation failed',
          message: `Status must be one of: ${Object.values(CONVERSATION_STATUS).join(', ')}`
        });
      }
      updateData.status = status;
    }

    // Actualizar conversación
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    logger.info(`✏️ Conversation updated: ${updatedConversation.title}`, {
      conversationId: id,
      userId,
      updatedFields: Object.keys(updateData)
    });

    res.json({
      message: 'Conversation updated successfully',
      conversation: {
        ...sanitizeConversation(updatedConversation),
        messageCount: updatedConversation._count.messages
      }
    });

  } catch (error) {
    logger.error('Update conversation error:', error);
    res.status(500).json({
      error: 'Failed to update conversation',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Eliminar conversación
 * @route   DELETE /api/v1/conversations/:id
 * @access  Private
 */
const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { permanent = 'false' } = req.query;

    const isPermanent = permanent === 'true';

    // Verificar que la conversación existe y pertenece al usuario
    const existingConversation = await prisma.conversation.findFirst({
      where: { id, userId }
    });

    if (!existingConversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        message: 'Conversation with specified ID does not exist or you do not have access'
      });
    }

    if (isPermanent) {
      // Eliminación permanente
      await prisma.conversation.delete({
        where: { id }
      });

      logger.info(`🗑️ Conversation permanently deleted: ${existingConversation.title}`, {
        conversationId: id,
        userId
      });

      res.json({
        message: 'Conversation permanently deleted'
      });
    } else {
      // Soft delete - cambiar estado a DELETED
      const deletedConversation = await prisma.conversation.update({
        where: { id },
        data: {
          status: CONVERSATION_STATUS.DELETED,
          deletedAt: new Date()
        }
      });

      logger.info(`🗑️ Conversation soft deleted: ${existingConversation.title}`, {
        conversationId: id,
        userId
      });

      res.json({
        message: 'Conversation moved to trash',
        conversation: sanitizeConversation(deletedConversation)
      });
    }

  } catch (error) {
    logger.error('Delete conversation error:', error);
    res.status(500).json({
      error: 'Failed to delete conversation',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Archivar conversación
 * @route   PUT /api/v1/conversations/:id/archive
 * @access  Private
 */
const archiveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId }
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        message: 'Conversation with specified ID does not exist or you do not have access'
      });
    }

    const archivedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        status: CONVERSATION_STATUS.ARCHIVED,
        archivedAt: new Date()
      }
    });

    logger.info(`📦 Conversation archived: ${conversation.title}`, {
      conversationId: id,
      userId
    });

    res.json({
      message: 'Conversation archived successfully',
      conversation: sanitizeConversation(archivedConversation)
    });

  } catch (error) {
    logger.error('Archive conversation error:', error);
    res.status(500).json({
      error: 'Failed to archive conversation',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Restaurar conversación archivada
 * @route   PUT /api/v1/conversations/:id/restore
 * @access  Private
 */
const restoreConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId }
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        message: 'Conversation with specified ID does not exist or you do not have access'
      });
    }

    const restoredConversation = await prisma.conversation.update({
      where: { id },
      data: {
        status: CONVERSATION_STATUS.ACTIVE,
        archivedAt: null,
        deletedAt: null
      }
    });

    logger.info(`♻️ Conversation restored: ${conversation.title}`, {
      conversationId: id,
      userId
    });

    res.json({
      message: 'Conversation restored successfully',
      conversation: sanitizeConversation(restoredConversation)
    });

  } catch (error) {
    logger.error('Restore conversation error:', error);
    res.status(500).json({
      error: 'Failed to restore conversation',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

// =================================
// EXPORTAR CONTROLADORES
// =================================

module.exports = {
  getConversations,
  createConversation,
  getConversationById,
  updateConversation,
  deleteConversation,
  archiveConversation,
  restoreConversation
};