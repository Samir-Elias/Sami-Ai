const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');
const { PROJECT_STATUS, PAGINATION_CONFIG } = require('../utils/constants');
const { generateSlug, cleanObject, calculatePagination } = require('../utils/helpers');

const prisma = new PrismaClient();

// =================================
// SERVICIO DE PROYECTOS
// =================================

class ProjectService {
  /**
   * Buscar proyecto por ID y usuario
   * @param {string} projectId - ID del proyecto
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de consulta
   * @returns {Promise<Object|null>} Proyecto encontrado o null
   */
  async findByIdAndUser(projectId, userId, options = {}) {
    try {
      const { 
        includeConversations = false, 
        includeFiles = false,
        includeStats = false 
      } = options;

      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { userId }, // Propietario
            { isPublic: true } // Público
          ]
        },
        include: {
          ...(includeStats && {
            _count: {
              select: {
                conversations: true,
                files: true
              }
            }
          }),
          ...(includeConversations && {
            conversations: {
              take: 10,
              orderBy: { updatedAt: 'desc' },
              where: { status: { not: 'deleted' } }
            }
          }),
          ...(includeFiles && {
            files: {
              take: 10,
              orderBy: { createdAt: 'desc' },
              where: { status: { not: 'deleted' } }
            }
          })
        }
      });

      return project;
    } catch (error) {
      logger.error('Error finding project by ID and user:', error);
      throw error;
    }
  }

  /**
   * Buscar proyecto por slug y usuario
   * @param {string} slug - Slug del proyecto
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object|null>} Proyecto encontrado o null
   */
  async findBySlugAndUser(slug, userId) {
    try {
      const project = await prisma.project.findFirst({
        where: {
          slug,
          userId
        }
      });

      return project;
    } catch (error) {
      logger.error('Error finding project by slug and user:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo proyecto
   * @param {string} userId - ID del usuario
   * @param {Object} projectData - Datos del proyecto
   * @returns {Promise<Object>} Proyecto creado
   */
  async createProject(userId, projectData) {
    try {
      const {
        name,
        description = null,
        color = '#3B82F6',
        tags = [],
        settings = {},
        isPublic = false
      } = projectData;

      // Validar nombre
      if (!name || name.trim().length === 0) {
        throw new Error('Project name is required');
      }

      if (name.length > 100) {
        throw new Error('Project name must be less than 100 characters');
      }

      // Generar slug único
      const baseSlug = generateSlug(name);
      const slug = await this.generateUniqueSlug(userId, baseSlug);

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

      logger.info(`✅ Project created: ${project.name}`, {
        projectId: project.id,
        userId,
        slug
      });

      return project;
    } catch (error) {
      logger.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Actualizar proyecto
   * @param {string} projectId - ID del proyecto
   * @param {string} userId - ID del usuario
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Proyecto actualizado
   */
  async updateProject(projectId, userId, updateData) {
    try {
      // Verificar que existe y pertenece al usuario
      const existingProject = await this.findByIdAndUser(projectId, userId);
      if (!existingProject || existingProject.userId !== userId) {
        throw new Error('Project not found or access denied');
      }

      // Preparar datos de actualización
      const cleanedData = cleanObject(updateData);

      // Actualizar proyecto
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: cleanedData,
        include: {
          _count: {
            select: {
              conversations: true,
              files: true
            }
          }
        }
      });

      logger.info(`📝 Project updated: ${updatedProject.name}`, {
        projectId,
        userId,
        updatedFields: Object.keys(cleanedData)
      });

      return updatedProject;
    } catch (error) {
      logger.error('Error updating project:', error);
      throw error;
    }
  }

  /**
   * Eliminar proyecto (soft delete o permanente)
   * @param {string} projectId - ID del proyecto
   * @param {string} userId - ID del usuario
   * @param {boolean} permanent - Si es eliminación permanente
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async deleteProject(projectId, userId, permanent = false) {
    try {
      // Verificar que existe y pertenece al usuario
      const existingProject = await this.findByIdAndUser(projectId, userId);
      if (!existingProject || existingProject.userId !== userId) {
        throw new Error('Project not found or access denied');
      }

      if (permanent) {
        // Verificar si tiene contenido asociado
        const [conversationCount, fileCount] = await Promise.all([
          prisma.conversation.count({ where: { projectId } }),
          prisma.file.count({ where: { projectId } })
        ]);

        if (conversationCount > 0 || fileCount > 0) {
          throw new Error(`Project contains ${conversationCount} conversations and ${fileCount} files. Please move or delete them first.`);
        }

        // Eliminación permanente
        await prisma.project.delete({
          where: { id: projectId }
        });

        logger.info(`🗑️ Project permanently deleted: ${existingProject.name}`, {
          projectId,
          userId
        });

        return { deleted: true, permanent: true };
      } else {
        // Soft delete
        const deletedProject = await prisma.project.update({
          where: { id: projectId },
          data: {
            status: PROJECT_STATUS.DELETED,
            deletedAt: new Date()
          }
        });

        logger.info(`📦 Project soft deleted: ${existingProject.name}`, {
          projectId,
          userId
        });

        return { project: deletedProject, permanent: false };
      }
    } catch (error) {
      logger.error('Error deleting project:', error);
      throw error;
    }
  }

  /**
   * Archivar proyecto
   * @param {string} projectId - ID del proyecto
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Proyecto archivado
   */
  async archiveProject(projectId, userId) {
    try {
      const existingProject = await this.findByIdAndUser(projectId, userId);
      if (!existingProject || existingProject.userId !== userId) {
        throw new Error('Project not found or access denied');
      }

      const archivedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          status: PROJECT_STATUS.ARCHIVED,
          archivedAt: new Date()
        }
      });

      logger.info(`📦 Project archived: ${existingProject.name}`, {
        projectId,
        userId
      });

      return archivedProject;
    } catch (error) {
      logger.error('Error archiving project:', error);
      throw error;
    }
  }

  /**
   * Restaurar proyecto archivado o eliminado
   * @param {string} projectId - ID del proyecto
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Proyecto restaurado
   */
  async restoreProject(projectId, userId) {
    try {
      const existingProject = await this.findByIdAndUser(projectId, userId);
      if (!existingProject || existingProject.userId !== userId) {
        throw new Error('Project not found or access denied');
      }

      const restoredProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          status: PROJECT_STATUS.ACTIVE,
          archivedAt: null,
          deletedAt: null
        }
      });

      logger.info(`♻️ Project restored: ${existingProject.name}`, {
        projectId,
        userId
      });

      return restoredProject;
    } catch (error) {
      logger.error('Error restoring project:', error);
      throw error;
    }
  }

  /**
   * Listar proyectos del usuario con filtros y paginación
   * @param {string} userId - ID del usuario
   * @param {Object} filters - Filtros de búsqueda
   * @param {Object} pagination - Opciones de paginación
   * @returns {Promise<Object>} Proyectos paginados
   */
  async listUserProjects(userId, filters = {}, pagination = {}) {
    try {
      const {
        search = '',
        status = '',
        tags = []
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
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(tags.length > 0 && {
          tags: { hasSome: tags }
        })
      };

      // Obtener proyectos y total
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

      // Formatear proyectos con estadísticas
      const formattedProjects = projects.map(project => ({
        ...project,
        stats: {
          conversations: project._count.conversations,
          files: project._count.files
        },
        _count: undefined
      }));

      const paginationInfo = calculatePagination(total, pageNum, limitNum);

      return {
        projects: formattedProjects,
        pagination: paginationInfo
      };
    } catch (error) {
      logger.error('Error listing user projects:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas detalladas de un proyecto
   * @param {string} projectId - ID del proyecto
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Estadísticas del proyecto
   */
  async getProjectStats(projectId, userId) {
    try {
      // Verificar acceso al proyecto
      const project = await this.findByIdAndUser(projectId, userId);
      if (!project) {
        throw new Error('Project not found or access denied');
      }

      // Obtener estadísticas detalladas
      const [conversationStats, fileStats, activityStats] = await Promise.all([
        // Estadísticas de conversaciones
        prisma.conversation.groupBy({
          by: ['status'],
          where: { projectId },
          _count: { status: true }
        }),

        // Estadísticas de archivos
        Promise.all([
          prisma.file.count({ where: { projectId } }),
          prisma.file.aggregate({
            where: { projectId },
            _sum: { size: true }
          }),
          prisma.file.groupBy({
            by: ['type'],
            where: { projectId },
            _count: { type: true }
          })
        ]),

        // Actividad reciente
        Promise.all([
          prisma.conversation.count({
            where: {
              projectId,
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              }
            }
          }),
          prisma.file.count({
            where: {
              projectId,
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              }
            }
          }),
          prisma.message.count({
            where: {
              conversation: { projectId },
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
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

      return {
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
          filesLast30Days: activityStats[1],
          messagesLast7Days: activityStats[2]
        }
      };
    } catch (error) {
      logger.error('Error getting project stats:', error);
      throw error;
    }
  }

  /**
   * Mover conversación a proyecto
   * @param {string} conversationId - ID de la conversación
   * @param {string} projectId - ID del proyecto destino
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Conversación actualizada
   */
  async moveConversationToProject(conversationId, projectId, userId) {
    try {
      // Verificar que la conversación pertenece al usuario
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId }
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Verificar que el proyecto pertenece al usuario (si no es null)
      if (projectId) {
        const project = await this.findByIdAndUser(projectId, userId);
        if (!project || project.userId !== userId) {
          throw new Error('Project not found or access denied');
        }
      }

      // Actualizar conversación
      const updatedConversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: { projectId }
      });

      logger.info(`📁 Conversation moved to project`, {
        conversationId,
        projectId,
        userId,
        previousProjectId: conversation.projectId
      });

      return updatedConversation;
    } catch (error) {
      logger.error('Error moving conversation to project:', error);
      throw error;
    }
  }

  /**
   * Mover archivo a proyecto
   * @param {string} fileId - ID del archivo
   * @param {string} projectId - ID del proyecto destino
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Archivo actualizado
   */
  async moveFileToProject(fileId, projectId, userId) {
    try {
      // Verificar que el archivo pertenece al usuario
      const file = await prisma.file.findFirst({
        where: { id: fileId, userId }
      });

      if (!file) {
        throw new Error('File not found or access denied');
      }

      // Verificar que el proyecto pertenece al usuario (si no es null)
      if (projectId) {
        const project = await this.findByIdAndUser(projectId, userId);
        if (!project || project.userId !== userId) {
          throw new Error('Project not found or access denied');
        }
      }

      // Actualizar archivo
      const updatedFile = await prisma.file.update({
        where: { id: fileId },
        data: { projectId }
      });

      logger.info(`📁 File moved to project`, {
        fileId,
        projectId,
        userId,
        previousProjectId: file.projectId
      });

      return updatedFile;
    } catch (error) {
      logger.error('Error moving file to project:', error);
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
   * Obtener estadísticas generales de proyectos del usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Estadísticas generales
   */
  async getUserProjectStats(userId) {
    try {
      const [totalProjects, statusStats, recentActivity] = await Promise.all([
        // Total de proyectos
        prisma.project.count({
          where: { userId }
        }),

        // Conteo por estado
        prisma.project.groupBy({
          by: ['status'],
          where: { userId },
          _count: { status: true }
        }),

        // Actividad reciente (últimos 30 días)
        prisma.project.count({
          where: {
            userId,
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      const projectsByStatus = {};
      statusStats.forEach(stat => {
        projectsByStatus[stat.status] = stat._count.status;
      });

      return {
        total: totalProjects,
        byStatus: projectsByStatus,
        recentActivity
      };
    } catch (error) {
      logger.error('Error getting user project stats:', error);
      throw error;
    }
  }

  /**
   * Limpiar proyectos eliminados permanentemente
   * @param {number} daysOld - Días de antigüedad para limpiar
   * @returns {Promise<Object>} Resultado de la limpieza
   */
  async cleanupDeletedProjects(daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

      const deletedProjects = await prisma.project.deleteMany({
        where: {
          status: PROJECT_STATUS.DELETED,
          deletedAt: {
            lt: cutoffDate
          }
        }
      });

      logger.info(`🧹 Cleaned up ${deletedProjects.count} old deleted projects`, {
        daysOld,
        count: deletedProjects.count
      });

      return {
        cleaned: deletedProjects.count,
        daysOld
      };
    } catch (error) {
      logger.error('Error cleaning up deleted projects:', error);
      throw error;
    }
  }
}

// Exportar instancia única del servicio
module.exports = new ProjectService();