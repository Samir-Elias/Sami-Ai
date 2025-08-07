const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../config/logger');
const { FILE_STATUS, PAGINATION_CONFIG, ERROR_MESSAGES } = require('../utils/constants');
const { calculatePagination, formatFileSize } = require('../utils/helpers');

const prisma = new PrismaClient();

// =================================
// UTILIDADES
// =================================

// Crear respuesta de archivo sin datos sensibles
const sanitizeFile = (file) => {
  if (!file) return null;
  
  const { path: filePath, ...safeFile } = file;
  return {
    ...safeFile,
    url: `/api/v1/files/${file.id}/download`
  };
};

// Obtener tipo de archivo basado en extensión
const getFileTypeFromExtension = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
    return 'image';
  } else if (['.js', '.ts', '.html', '.css', '.json', '.md', '.txt'].includes(ext)) {
    return 'code';
  } else if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext)) {
    return 'document';
  } else if (['.zip', '.rar', '.tar', '.gz', '.7z'].includes(ext)) {
    return 'archive';
  } else {
    return 'other';
  }
};

// =================================
// CONTROLADORES DE ARCHIVOS
// =================================

/**
 * @desc    Subir archivo
 * @route   POST /api/v1/files/upload
 * @access  Private
 */
const uploadFile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    const file = req.file;
    const { description = null, tags = [], isPublic = false } = req.body;

    // Procesar tags si vienen como string
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
      } catch {
        parsedTags = typeof tags === 'string' ? [tags] : [];
      }
    }

    // Determinar tipo de archivo
    const fileType = getFileTypeFromExtension(file.originalname);

    // Crear registro en base de datos
    const fileRecord = await prisma.file.create({
      data: {
        userId,
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        type: fileType,
        description: description || null,
        tags: parsedTags,
        isPublic: Boolean(isPublic),
        status: FILE_STATUS.UPLOADED,
        metadata: {
          uploadedAt: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      }
    });

    logger.info(`📁 File uploaded successfully: ${file.originalname}`, {
      fileId: fileRecord.id,
      userId,
      size: file.size,
      type: fileType,
      originalName: file.originalname
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      file: sanitizeFile(fileRecord)
    });

  } catch (error) {
    logger.error('File upload error:', error);
    
    // Limpiar archivo físico si falló la base de datos
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
        logger.info('🧹 Cleaned up failed upload file:', req.file.path);
      } catch (cleanupError) {
        logger.error('Failed to cleanup file:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'File upload failed',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Obtener lista de archivos del usuario
 * @route   GET /api/v1/files
 * @access  Private
 */
const getFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = PAGINATION_CONFIG.DEFAULT_PAGE,
      limit = PAGINATION_CONFIG.DEFAULT_LIMIT,
      type = '',
      search = '',
      sortBy = 'createdAt',
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
      status: { not: FILE_STATUS.DELETED },
      ...(type && { type }),
      ...(search && {
        OR: [
          { originalName: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    // Obtener archivos y total
    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.file.count({ where })
    ]);

    const pagination = calculatePagination(total, pageNum, limitNum);

    logger.info(`📂 User ${req.user.email} retrieved ${files.length} files`, {
      userId,
      total,
      page: pageNum,
      limit: limitNum,
      type,
      search
    });

    res.json({
      files: files.map(sanitizeFile),
      pagination,
      filters: {
        type,
        search,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    logger.error('Get files error:', error);
    res.status(500).json({
      error: 'Failed to fetch files',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Obtener archivo por ID
 * @route   GET /api/v1/files/:id
 * @access  Private
 */
const getFileById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Buscar archivo
    const file = await prisma.file.findFirst({
      where: {
        id,
        OR: [
          { userId }, // Propietario
          { isPublic: true } // Público
        ],
        status: { not: FILE_STATUS.DELETED }
      }
    });

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        message: 'File with specified ID does not exist or you do not have access'
      });
    }

    logger.info(`📄 File accessed: ${file.originalName}`, {
      fileId: id,
      userId,
      ownerId: file.userId,
      isOwner: file.userId === userId
    });

    res.json({
      file: sanitizeFile(file)
    });

  } catch (error) {
    logger.error('Get file by ID error:', error);
    res.status(500).json({
      error: 'Failed to fetch file',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Descargar archivo
 * @route   GET /api/v1/files/:id/download
 * @access  Private
 */
const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Buscar archivo
    const file = await prisma.file.findFirst({
      where: {
        id,
        OR: [
          { userId }, // Propietario
          { isPublic: true } // Público
        ],
        status: { not: FILE_STATUS.DELETED }
      }
    });

    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        message: 'File with specified ID does not exist or you do not have access'
      });
    }

    // Verificar que el archivo físico existe
    try {
      await fs.access(file.path);
    } catch {
      logger.error(`File not found on disk: ${file.path}`, {
        fileId: id,
        originalName: file.originalName
      });
      
      return res.status(404).json({
        error: 'File not found',
        message: 'File is no longer available'
      });
    }

    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
    res.setHeader('Content-Length', file.size);

    // Stream del archivo
    const fileStream = require('fs').createReadStream(file.path);
    
    fileStream.on('error', (error) => {
      logger.error(`File stream error for ${file.originalName}:`, error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'File download failed',
          message: 'An error occurred while downloading the file'
        });
      }
    });

    // Actualizar estadísticas de descarga
    prisma.file.update({
      where: { id },
      data: {
        metadata: {
          ...file.metadata,
          downloadCount: (file.metadata?.downloadCount || 0) + 1,
          lastDownloadedAt: new Date().toISOString(),
          lastDownloadedBy: userId
        }
      }
    }).catch(error => {
      logger.error('Failed to update download stats:', error);
    });

    logger.info(`📥 File downloaded: ${file.originalName}`, {
      fileId: id,
      userId,
      size: file.size,
      ownerId: file.userId
    });

    fileStream.pipe(res);

  } catch (error) {
    logger.error('Download file error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'File download failed',
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      });
    }
  }
};

/**
 * @desc    Actualizar información de archivo
 * @route   PUT /api/v1/files/:id
 * @access  Private
 */
const updateFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { description, tags, isPublic } = req.body;

    // Buscar archivo (solo propietario puede editar)
    const existingFile = await prisma.file.findFirst({
      where: {
        id,
        userId,
        status: { not: FILE_STATUS.DELETED }
      }
    });

    if (!existingFile) {
      return res.status(404).json({
        error: 'File not found',
        message: 'File with specified ID does not exist or you do not have access'
      });
    }

    // Preparar datos de actualización
    const updateData = {};

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (tags !== undefined) {
      let parsedTags = [];
      try {
        parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
      } catch {
        parsedTags = typeof tags === 'string' ? [tags] : [];
      }
      updateData.tags = parsedTags;
    }

    if (isPublic !== undefined) {
      updateData.isPublic = Boolean(isPublic);
    }

    // Actualizar archivo
    const updatedFile = await prisma.file.update({
      where: { id },
      data: {
        ...updateData,
        metadata: {
          ...existingFile.metadata,
          updatedAt: new Date().toISOString()
        }
      }
    });

    logger.info(`✏️ File updated: ${updatedFile.originalName}`, {
      fileId: id,
      userId,
      updatedFields: Object.keys(updateData)
    });

    res.json({
      message: 'File updated successfully',
      file: sanitizeFile(updatedFile)
    });

  } catch (error) {
    logger.error('Update file error:', error);
    res.status(500).json({
      error: 'Failed to update file',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Eliminar archivo
 * @route   DELETE /api/v1/files/:id
 * @access  Private
 */
const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { permanent = 'false' } = req.query;

    const isPermanent = permanent === 'true';

    // Buscar archivo (solo propietario puede eliminar)
    const existingFile = await prisma.file.findFirst({
      where: {
        id,
        userId,
        status: { not: FILE_STATUS.DELETED }
      }
    });

    if (!existingFile) {
      return res.status(404).json({
        error: 'File not found',
        message: 'File with specified ID does not exist or you do not have access'
      });
    }

    if (isPermanent) {
      // Eliminación permanente
      try {
        // Eliminar archivo físico
        await fs.unlink(existingFile.path);
        logger.info(`🗑️ Physical file deleted: ${existingFile.path}`);
      } catch (unlinkError) {
        logger.warn(`Failed to delete physical file: ${existingFile.path}`, unlinkError);
      }

      // Eliminar registro de base de datos
      await prisma.file.delete({
        where: { id }
      });

      logger.info(`🗑️ File permanently deleted: ${existingFile.originalName}`, {
        fileId: id,
        userId
      });

      res.json({
        message: 'File permanently deleted'
      });
    } else {
      // Soft delete
      const deletedFile = await prisma.file.update({
        where: { id },
        data: {
          status: FILE_STATUS.DELETED,
          metadata: {
            ...existingFile.metadata,
            deletedAt: new Date().toISOString()
          }
        }
      });

      logger.info(`📦 File soft deleted: ${existingFile.originalName}`, {
        fileId: id,
        userId
      });

      res.json({
        message: 'File moved to trash',
        file: sanitizeFile(deletedFile)
      });
    }

  } catch (error) {
    logger.error('Delete file error:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Obtener estadísticas de archivos del usuario
 * @route   GET /api/v1/files/stats
 * @access  Private
 */
const getFileStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener estadísticas
    const [totalFiles, typeStats, sizeStats] = await Promise.all([
      // Total de archivos
      prisma.file.count({
        where: {
          userId,
          status: { not: FILE_STATUS.DELETED }
        }
      }),

      // Conteo por tipo
      prisma.file.groupBy({
        by: ['type'],
        where: {
          userId,
          status: { not: FILE_STATUS.DELETED }
        },
        _count: { type: true }
      }),

      // Estadísticas de tamaño
      prisma.file.aggregate({
        where: {
          userId,
          status: { not: FILE_STATUS.DELETED }
        },
        _sum: { size: true },
        _avg: { size: true },
        _max: { size: true }
      })
    ]);

    // Formatear estadísticas por tipo
    const filesByType = {};
    typeStats.forEach(stat => {
      filesByType[stat.type] = stat._count.type;
    });

    const stats = {
      totalFiles,
      filesByType,
      storage: {
        totalBytes: sizeStats._sum.size || 0,
        totalFormatted: formatFileSize(sizeStats._sum.size || 0),
        averageSize: Math.round(sizeStats._avg.size || 0),
        averageFormatted: formatFileSize(Math.round(sizeStats._avg.size || 0)),
        largestFile: sizeStats._max.size || 0,
        largestFormatted: formatFileSize(sizeStats._max.size || 0)
      }
    };

    logger.info(`📊 File stats retrieved for user`, {
      userId,
      totalFiles
    });

    res.json({
      stats
    });

  } catch (error) {
    logger.error('Get file stats error:', error);
    res.status(500).json({
      error: 'Failed to get file statistics',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

// =================================
// EXPORTAR CONTROLADORES
// =================================

module.exports = {
  uploadFile,
  getFiles,
  getFileById,
  downloadFile,
  updateFile,
  deleteFile,
  getFileStats
};