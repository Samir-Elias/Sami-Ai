const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const { PROJECT_STATUS, PAGINATION_CONFIG, ERROR_MESSAGES } = require('../utils/constants');
const { calculatePagination, generateSlug, cleanObject } = require('../utils/helpers');

const prisma = new PrismaClient();

// =================================
// UTILIDADES
// =================================

// Limpiar datos sensibles del proyecto
const sanitizeProject = (project) => {
  if (!project) return null;
  
  return {
    ...project,
    // No remover nada por ahora, todos los campos son seguros
  };
};

// =================================
// CONTROLADORES DE PROYECTOS
// =================================

/**
 * @desc    Obtener proyectos del usuario
 * @route   GET /api/v1/projects
 * @access  Private
 */
const getProjects = async (req, res) => {
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

    // Validar parámetros
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
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    // Obtener proyectos con estadísticas
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          _count: {
            select: {
              conversations: true,
              files: true
            }
          }
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.project.count({ where })
    ]);

    const pagination = calculatePagination(total, pageNum, limitNum);

    // Formatear proyectos con estadísticas
    const formattedProjects = projects.map(project => ({
      ...sanitizeProject(project),
      stats: {
        conversations: project._count.conversations,
        files: project._count.files
      },
      _count: undefined
    }));

    logger.info(`📋 User ${req.user.email} retrieved ${projects.length} projects`, {
      userId,
      total,
      page: pageNum,
      limit: limitNum
    });

    res.json({
      projects: formattedProjects,
      pagination,
      filters: {
        search,
        status,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({
      error: 'Failed to fetch projects',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Crear nuevo proyecto
 * @route   POST /api/v1/projects
 * @access  Private
 */
const createProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description = null,
      color = '#3B82F6', // Azul por defecto
      tags = [],
      settings = {},
      isPublic = false
    } = req.body;

    // Validaciones
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Project name is required'
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Project name must be less than 100 characters'
      });
    }

    // Generar slug único
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    // Verificar unicidad del slug para este usuario
    while (await prisma.project.findFirst({
      where: { userId, slug }
    })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Crear proyecto
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        slug,
        userId,
        color: color || '#3B82F6',
        tags: Array.isArray(tags) ? tags : [],
        settings: cleanObject(settings),
        status: PROJECT_STATUS.ACTIVE,
        isPublic: Boolean(isPublic)
      },
      include: {
        _count: {
          select: {
            conversations: true,
            files: true
          }
        }
      }
    });

    logger.info(`📁 New project created: ${project.name}`, {
      projectId: project.id,
      userId,
      slug: project.slug
    });

    res.status(201).json({
      message: 'Project created successfully',
      project: {
        ...sanitizeProject(project),
        stats: {
          conversations: 0,
          files: 0
        },
        _count: undefined
      }
    });

  } catch (error) {
    logger.error('Create project error:', error);
    res.status(500).json({
      error: 'Failed to create project',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Obtener proyecto por ID
 * @route   GET /api/v1/projects/:id
 * @access  Private
 */
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { includeConversations = 'false', includeFiles = 'false' } = req.query;

    // Buscar proyecto
    const project = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          { userId }, // Propietario
          { isPublic: true } // Público
        ]
      },
      include: {
        _count: {
          select: {
            conversations: true,
            files: true
          }
        },
        ...(includeConversations === 'true' && {
          conversations: {
            take: 10,
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }),
        ...(includeFiles === 'true' && {
          files: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              originalName: true,
              type: true,
              size: true,
              createdAt: true
            }
          }
        })
      }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: 'Project with specified ID does not exist or you do not have access'
      });
    }

    // Actualizar último acceso si es el propietario
    if (project.userId === userId) {
      prisma.project.update({
        where: { id },
        data: { lastAccessedAt: new Date() }
      }).catch(error => {
        logger.error('Failed to update last access:', error);
      });
    }

    logger.info(`📂 Project accessed: ${project.name}`, {
      projectId: id,
      userId,
      ownerId: project.userId,
      isOwner: project.userId === userId
    });

    res.json({
      project: {
        ...sanitizeProject(project),
        stats: {
          conversations: project._count.conversations,
          files: project._count.files
        },
        isOwner: project.userId === userId,
        _count: undefined
      }
    });

  } catch (error) {
    logger.error('Get project by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch project',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Actualizar proyecto
 * @route   PUT /api/v1/projects/:id
 * @access  Private
 */
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      name,
      description,
      color,
      tags,
      settings,
      status,
      isPublic
    } = req.body;

    // Verificar que el proyecto existe y pertenece al usuario
    const existingProject = await prisma.project.findFirst({
      where: { id, userId }
    });

    if (!existingProject) {
      return res.status(404).json({
        error: 'Project not found',
        message: 'Project with specified ID does not exist or you do not have access'
      });
    }

    // Preparar datos de actualización
    const updateData = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Project name cannot be empty'
        });
      }
      if (name.length > 100) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Project name must be less than 100 characters'
        });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (color !== undefined) {
      // Validar formato de color hexadecimal
      if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Color must be a valid hexadecimal color (e.g., #3B82F6)'
        });
      }
      updateData.color = color || '#3B82F6';
    }

    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags : [];
    }

    if (settings !== undefined) {
      updateData.settings = cleanObject(settings);
    }

    if (status !== undefined) {
      if (!Object.values(PROJECT_STATUS).includes(status)) {
        return res.status(400).json({
          error: 'Validation failed',
          message: `Status must be one of: ${Object.values(PROJECT_STATUS).join(', ')}`
        });
      }
      updateData.status = status;
    }

    if (isPublic !== undefined) {
      updateData.isPublic = Boolean(isPublic);
    }

    // Actualizar proyecto
    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            conversations: true,
            files: true
          }
        }
      }
    });

    logger.info(`✏️ Project updated: ${updatedProject.name}`, {
      projectId: id,
      userId,
      updatedFields: Object.keys(updateData)
    });

    res.json({
      message: 'Project updated successfully',
      project: {
        ...sanitizeProject(updatedProject),
        stats: {
          conversations: updatedProject._count.conversations,
          files: updatedProject._count.files
        },
        _count: undefined
      }
    });

  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({
      error: 'Failed to update project',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Eliminar proyecto
 * @route   DELETE /api/v1/projects/:id
 * @access  Private
 */
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { permanent = 'false' } = req.query;

    const isPermanent = permanent === 'true';

    // Verificar que el proyecto existe y pertenece al usuario
    const existingProject = await prisma.project.findFirst({
      where: { id, userId }
    });

    if (!existingProject) {
      return res.status(404).json({
        error: 'Project not found',
        message: 'Project with specified ID does not exist or you do not have access'
      });
    }

    if (isPermanent) {
      // Verificar si tiene contenido asociado
      const [conversationCount, fileCount] = await Promise.all([
        prisma.conversation.count({ where: { projectId: id } }),
        prisma.file.count({ where: { projectId: id } })
      ]);

      if (conversationCount > 0 || fileCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete project',
          message: `Project contains ${conversationCount} conversations and ${fileCount} files. Please move or delete them first.`,
          details: {
            conversations: conversationCount,
            files: fileCount
          }
        });
      }

      // Eliminación permanente
      await prisma.project.delete({
        where: { id }
      });

      logger.info(`🗑️ Project permanently deleted: ${existingProject.name}`, {
        projectId: id,
        userId
      });

      res.json({
        message: 'Project permanently deleted'
      });
    } else {
      // Soft delete
      const deletedProject = await prisma.project.update({
        where: { id },
        data: {
          status: PROJECT_STATUS.DELETED,
          deletedAt: new Date()
        }
      });

      logger.info(`📦 Project soft deleted: ${existingProject.name}`, {
        projectId: id,
        userId
      });

      res.json({
        message: 'Project moved to trash',
        project: sanitizeProject(deletedProject)
      });
    }

  } catch (error) {
    logger.error('Delete project error:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Archivar proyecto
 * @route   PUT /api/v1/projects/:id/archive
 * @access  Private
 */
const archiveProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const project = await prisma.project.findFirst({
      where: { id, userId }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: 'Project with specified ID does not exist or you do not have access'
      });
    }

    const archivedProject = await prisma.project.update({
      where: { id },
      data: {
        status: PROJECT_STATUS.ARCHIVED,
        archivedAt: new Date()
      }
    });

    logger.info(`📦 Project archived: ${project.name}`, {
      projectId: id,
      userId
    });

    res.json({
      message: 'Project archived successfully',
      project: sanitizeProject(archivedProject)
    });

  } catch (error) {
    logger.error('Archive project error:', error);
    res.status(500).json({
      error: 'Failed to archive project',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Restaurar proyecto
 * @route   PUT /api/v1/projects/:id/restore
 * @access  Private
 */
const restoreProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const project = await prisma.project.findFirst({
      where: { id, userId }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: 'Project with specified ID does not exist or you do not have access'
      });
    }

    const restoredProject = await prisma.project.update({
      where: { id },
      data: {
        status: PROJECT_STATUS.ACTIVE,
        archivedAt: null,
        deletedAt: null
      }
    });

    logger.info(`♻️ Project restored: ${project.name}`, {
      projectId: id,
      userId
    });

    res.json({
      message: 'Project restored successfully',
      project: sanitizeProject(restoredProject)
    });

  } catch (error) {
    logger.error('Restore project error:', error);
    res.status(500).json({
      error: 'Failed to restore project',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Obtener estadísticas del proyecto
 * @route   GET /api/v1/projects/:id/stats
 * @access  Private
 */
const getProjectStats = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar acceso al proyecto
    const project = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { isPublic: true }
        ]
      }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        message: 'Project with specified ID does not exist or you do not have access'
      });
    }

    // Obtener estadísticas detalladas
    const [conversationStats, fileStats, activityStats] = await Promise.all([
      // Estadísticas de conversaciones
      prisma.conversation.groupBy({
        by: ['status'],
        where: { projectId: id },
        _count: { status: true }
      }),

      // Estadísticas de archivos
      Promise.all([
        prisma.file.count({ where: { projectId: id } }),
        prisma.file.aggregate({
          where: { projectId: id },
          _sum: { size: true }
        }),
        prisma.file.groupBy({
          by: ['type'],
          where: { projectId: id },
          _count: { type: true }
        })
      ]),

      // Actividad reciente (últimos 30 días)
      Promise.all([
        prisma.conversation.count({
          where: {
            projectId: id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        prisma.file.count({
          where: {
            projectId: id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ])
    ]);

    // Formatear estadísticas
    const conversationsByStatus = {};
    conversationStats.forEach(stat => {
      conversationsByStatus[stat.status] = stat._count.status;
    });

    const filesByType = {};
    fileStats[2].forEach(stat => {
      filesByType[stat.type] = stat._count.type;
    });

    const stats = {
      conversations: {
        total: Object.values(conversationsByStatus).reduce((sum, count) => sum + count, 0),
        byStatus: conversationsByStatus
      },
      files: {
        total: fileStats[0],
        totalSize: fileStats[1]._sum.size || 0,
        byType: filesByType
      },
      activity: {
        conversationsLast30Days: activityStats[0],
        filesLast30Days: activityStats[1]
      }
    };

    logger.info(`📊 Project stats retrieved: ${project.name}`, {
      projectId: id,
      userId
    });

    res.json({
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug
      },
      stats
    });

  } catch (error) {
    logger.error('Get project stats error:', error);
    res.status(500).json({
      error: 'Failed to get project statistics',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

// =================================
// EXPORTAR CONTROLADORES
// =================================

module.exports = {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  archiveProject,
  restoreProject,
  getProjectStats
};