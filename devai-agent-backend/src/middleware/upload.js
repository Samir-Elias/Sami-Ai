const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const logger = require('../config/logger');

// =================================
// CONFIGURACIÓN DE ALMACENAMIENTO
// =================================

// Configuración de almacenamiento personalizado
const storage = multer.diskStorage({
  // Configurar destino dinámico basado en tipo de archivo
  destination: async (req, file, cb) => {
    try {
      let uploadPath;
      
      // Determinar carpeta según tipo de archivo
      const fileType = getFileType(file.mimetype, file.originalname);
      
      switch (fileType) {
        case 'image':
          uploadPath = path.join(__dirname, '../../storage/uploads/images');
          break;
        case 'code':
          uploadPath = path.join(__dirname, '../../storage/uploads/code');
          break;
        case 'document':
          uploadPath = path.join(__dirname, '../../storage/uploads/documents');
          break;
        case 'archive':
          uploadPath = path.join(__dirname, '../../storage/uploads/archives');
          break;
        default:
          uploadPath = path.join(__dirname, '../../storage/uploads');
      }
      
      // Crear directorio si no existe
      await fs.mkdir(uploadPath, { recursive: true });
      
      cb(null, uploadPath);
    } catch (error) {
      logger.error('Error creating upload directory:', error);
      cb(error);
    }
  },
  
  // Configurar nombre de archivo único
  filename: (req, file, cb) => {
    try {
      // Generar hash único basado en tiempo y contenido
      const timestamp = Date.now();
      const randomBytes = crypto.randomBytes(6).toString('hex');
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const baseName = path.basename(file.originalname, fileExtension)
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 30);
      
      const uniqueFileName = `${timestamp}_${randomBytes}_${baseName}${fileExtension}`;
      
      // Guardar información del archivo en el request
      req.uploadInfo = {
        originalName: file.originalname,
        generatedName: uniqueFileName,
        timestamp,
        type: getFileType(file.mimetype, file.originalname)
      };
      
      cb(null, uniqueFileName);
    } catch (error) {
      logger.error('Error generating filename:', error);
      cb(error);
    }
  }
});

// =================================
// FILTROS DE ARCHIVOS
// =================================

// Tipos de archivo permitidos
const allowedFileTypes = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/json'
  ],
  code: [
    'text/plain',
    'text/javascript',
    'text/html',
    'text/css',
    'application/json',
    'application/xml',
    'text/xml'
  ],
  archives: [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-tar',
    'application/gzip',
    'application/x-7z-compressed'
  ]
};

// Extensiones permitidas para archivos de código
const codeExtensions = [
  '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte',
  '.html', '.css', '.scss', '.sass', '.less',
  '.json', '.xml', '.yaml', '.yml',
  '.md', '.txt', '.log',
  '.py', '.rb', '.php', '.java', '.c', '.cpp', '.cs',
  '.go', '.rs', '.swift', '.kt', '.scala',
  '.sh', '.bash', '.ps1', '.bat',
  '.sql', '.graphql', '.prisma'
];

// Función para determinar tipo de archivo
function getFileType(mimetype, filename) {
  const extension = path.extname(filename).toLowerCase();
  
  if (allowedFileTypes.images.includes(mimetype)) {
    return 'image';
  } else if (codeExtensions.includes(extension)) {
    return 'code';
  } else if (allowedFileTypes.archives.includes(mimetype)) {
    return 'archive';
  } else if (allowedFileTypes.documents.includes(mimetype)) {
    return 'document';
  }
  
  return 'other';
}

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  try {
    const fileType = getFileType(file.mimetype, file.originalname);
    const isAllowed = fileType !== 'other';
    
    if (!isAllowed) {
      const error = new Error(`File type not allowed: ${file.mimetype}`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    
    // Validaciones adicionales de seguridad
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (suspiciousExtensions.includes(fileExtension)) {
      const error = new Error(`Potentially dangerous file type: ${fileExtension}`);
      error.code = 'DANGEROUS_FILE_TYPE';
      return cb(error, false);
    }
    
    cb(null, true);
  } catch (error) {
    logger.error('Error in file filter:', error);
    cb(error, false);
  }
};

// =================================
// CONFIGURACIONES DE MULTER
// =================================

// Configuración base
const uploadConfig = {
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB por archivo
    files: 10, // Máximo 10 archivos por request
    fields: 20, // Máximo 20 campos de formulario
    fieldNameSize: 100, // Máximo 100 bytes para nombres de campo
    fieldSize: 1024 * 1024 // Máximo 1MB por campo de texto
  }
};

// =================================
// MIDDLEWARES ESPECÍFICOS
// =================================

// Upload simple (un archivo)
const uploadSingle = (fieldName = 'file') => {
  return multer(uploadConfig).single(fieldName);
};

// Upload múltiple (varios archivos, mismo campo)
const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  return multer(uploadConfig).array(fieldName, maxCount);
};

// Upload de campos múltiples (diferentes campos)
const uploadFields = (fields) => {
  return multer(uploadConfig).fields(fields);
};

// Upload de cualquier archivo
const uploadAny = () => {
  return multer(uploadConfig).any();
};

// =================================
// MIDDLEWARE DE PROCESAMIENTO POST-UPLOAD
// =================================

const processUpload = async (req, res, next) => {
  try {
    if (!req.file && !req.files) {
      return next();
    }
    
    const files = req.files || [req.file];
    const processedFiles = [];
    
    for (const file of files) {
      if (!file) continue;
      
      // Información del archivo procesado
      const fileInfo = {
        id: crypto.randomUUID(),
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        type: getFileType(file.mimetype, file.originalname),
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user?.id || 'anonymous'
      };
      
      // Validaciones adicionales de seguridad
      await validateFileContent(file);
      
      processedFiles.push(fileInfo);
      
      logger.info(`📁 File uploaded successfully: ${file.originalname}`, {
        filename: file.filename,
        size: file.size,
        type: fileInfo.type,
        uploadedBy: fileInfo.uploadedBy
      });
    }
    
    // Agregar información de archivos al request
    req.uploadedFiles = processedFiles;
    
    next();
  } catch (error) {
    logger.error('Error processing uploaded files:', error);
    
    // Limpiar archivos si hubo error
    if (req.file) {
      await cleanupFile(req.file.path);
    }
    if (req.files) {
      for (const file of req.files) {
        await cleanupFile(file.path);
      }
    }
    
    next(error);
  }
};

// =================================
// UTILIDADES
// =================================

// Validar contenido del archivo
async function validateFileContent(file) {
  try {
    // Leer los primeros bytes para validar el tipo real
    const buffer = await fs.readFile(file.path);
    const firstBytes = buffer.slice(0, 4);
    
    // Validaciones básicas de contenido vs extensión
    const fileSignatures = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
      'application/zip': [0x50, 0x4B, 0x03, 0x04]
    };
    
    // Si tenemos una firma conocida, validar
    if (fileSignatures[file.mimetype]) {
      const signature = fileSignatures[file.mimetype];
      const matches = signature.every((byte, index) => firstBytes[index] === byte);
      
      if (!matches) {
        throw new Error(`File content doesn't match declared type: ${file.mimetype}`);
      }
    }
    
    return true;
  } catch (error) {
    logger.error('File validation failed:', error);
    throw error;
  }
}

// Limpiar archivo en caso de error
async function cleanupFile(filePath) {
  try {
    await fs.unlink(filePath);
    logger.info(`🗑️ Cleaned up file: ${filePath}`);
  } catch (error) {
    logger.error(`Error cleaning up file ${filePath}:`, error);
  }
}

// =================================
// MIDDLEWARE DE MANEJO DE ERRORES
// =================================

const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message;
    let statusCode = 400;
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Maximum size is 50MB.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Maximum is 10 files per request.';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields in form.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field.';
        break;
      default:
        message = `Upload error: ${error.message}`;
    }
    
    logger.warn('Upload error:', { code: error.code, message: error.message });
    
    return res.status(statusCode).json({
      error: 'Upload failed',
      message,
      code: error.code
    });
  }
  
  if (error.code === 'INVALID_FILE_TYPE' || error.code === 'DANGEROUS_FILE_TYPE') {
    logger.warn('Invalid file type upload attempt:', error.message);
    
    return res.status(400).json({
      error: 'Invalid file type',
      message: error.message,
      code: error.code
    });
  }
  
  next(error);
};

// =================================
// EXPORTAR MIDDLEWARES
// =================================

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadAny,
  processUpload,
  handleUploadError,
  
  // Utilidades
  getFileType,
  validateFileContent,
  cleanupFile
};