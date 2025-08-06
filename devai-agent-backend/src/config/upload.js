// ============================================
// 📁 UPLOAD CONFIGURATION WITH MULTER
// ============================================

import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { log } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 🔧 Configuración de upload
 */
const uploadConfig = {
  // Directorios
  uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'storage/uploads'),
  tempDir: process.env.TEMP_DIR || path.resolve(process.cwd(), 'storage/temp'),
  
  // Límites
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  maxFiles: parseInt(process.env.MAX_FILES_PER_UPLOAD) || 20,
  
  // Tipos de archivo permitidos
  allowedMimeTypes: {
    // Código fuente
    code: [
      'text/plain',
      'text/javascript',
      'text/html',
      'text/css',
      'application/json',
      'application/xml',
      'text/xml'
    ],
    
    // Imágenes
    images: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ],
    
    // Documentos
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/markdown'
    ],
    
    // Archivos comprimidos
    archives: [
      'application/zip',
      'application/x-zip-compressed',
      'application/gzip',
      'application/x-tar'
    ]
  },
  
  // Extensiones permitidas
  allowedExtensions: [
    // Código
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
    '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.dart',
    '.html', '.css', '.scss', '.sass', '.vue', '.svelte',
    '.json', '.xml', '.yaml', '.yml', '.toml', '.ini',
    '.md', '.txt', '.sql', '.sh', '.bash', '.ps1', '.bat',
    '.dockerfile', '.env', '.gitignore',
    
    // Imágenes
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    
    // Documentos
    '.pdf', '.doc', '.docx', '.md',
    
    // Archivos comprimidos
    '.zip', '.tar', '.gz', '.rar'
  ]
};

/**
 * 🎯 Configuración de almacenamiento
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      let uploadPath = uploadConfig.uploadDir;
      
      // Crear subdirectorios según el tipo de archivo
      const fileType = getFileCategory(file.mimetype, file.originalname);
      uploadPath = path.join(uploadPath, fileType);
      
      // Crear directorio si no existe
      await ensureDirectoryExists(uploadPath);
      
      cb(null, uploadPath);
    } catch (error) {
      log.error('Error setting upload destination', { error: error.message });
      cb(error);
    }
  },
  
  filename: (req, file, cb) => {
    try {
      // Generar nombre único manteniendo la extensión original
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${uuidv4()}${ext}`;
      
      // Agregar información al request para uso posterior
      if (!req.uploadedFiles) {
        req.uploadedFiles = [];
      }
      
      req.uploadedFiles.push({
        originalName: file.originalname,
        filename: uniqueName,
        mimetype: file.mimetype,
        size: file.size
      });
      
      cb(null, uniqueName);
    } catch (error) {
      log.error('Error generating filename', { error: error.message });
      cb(error);
    }
  }
});

/**
 * 🔍 Filtro de archivos
 */
const fileFilter = (req, file, cb) => {
  try {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;
    
    // Verificar extensión
    if (!uploadConfig.allowedExtensions.includes(ext)) {
      const error = new Error(`Extensión de archivo no permitida: ${ext}`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    
    // Verificar MIME type
    const allAllowedMimes = Object.values(uploadConfig.allowedMimeTypes).flat();
    if (!allAllowedMimes.includes(mimetype) && mimetype !== 'application/octet-stream') {
      const error = new Error(`Tipo MIME no permitido: ${mimetype}`);
      error.code = 'INVALID_MIME_TYPE';
      return cb(error, false);
    }
    
    // Verificar tamaño de archivo individual
    if (file.size > uploadConfig.maxFileSize) {
      const error = new Error(`Archivo demasiado grande: ${file.originalname}`);
      error.code = 'FILE_TOO_LARGE';
      return cb(error, false);
    }
    
    log.debug('File passed filter validation', {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    cb(null, true);
  } catch (error) {
    log.error('Error in file filter', { error: error.message });
    cb(error, false);
  }
};

/**
 * 🔧 Configuración principal de Multer
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: uploadConfig.maxFileSize,
    files: uploadConfig.maxFiles,
    fields: 10,
    fieldNameSize: 50,
    fieldSize: 1024
  }
});

/**
 * 📁 Middleware específicos
 */
export const uploadMiddleware = {
  // Upload múltiple de archivos de proyecto
  projectFiles: upload.array('files', uploadConfig.maxFiles),
  
  // Upload de un solo archivo
  singleFile: upload.single('file'),
  
  // Upload de avatar/imagen de perfil
  avatar: upload.single('avatar'),
  
  // Upload de múltiples imágenes
  images: upload.array('images', 10),
  
  // Upload con campos específicos
  mixed: upload.fields([
    { name: 'files', maxCount: uploadConfig.maxFiles },
    { name: 'avatar', maxCount: 1 },
    { name: 'screenshots', maxCount: 5 }
  ])
};

/**
 * 🎨 Procesador de imágenes
 */
export class ImageProcessor {
  constructor() {
    this.sizes = {
      thumbnail: { width: 150, height: 150 },
      small: { width: 300, height: 300 },
      medium: { width: 600, height: 600 },
      large: { width: 1200, height: 1200 }
    };
  }

  /**
   * 🖼️ Procesar imagen subida
   */
  async processImage(filePath, options = {}) {
    try {
      const {
        generateThumbnails = true,
        quality = 80,
        format = 'jpeg',
        removeOriginal = false
      } = options;

      const results = [];
      const filename = path.basename(filePath, path.extname(filePath));
      const dir = path.dirname(filePath);

      // Procesar imagen original
      const image = sharp(filePath);
      const metadata = await image.metadata();

      log.debug('Processing image', {
        filename: filename,
        originalSize: metadata.width + 'x' + metadata.height,
        format: metadata.format
      });

      // Generar diferentes tamaños si se requiere
      if (generateThumbnails) {
        for (const [sizeName, dimensions] of Object.entries(this.sizes)) {
          const outputPath = path.join(dir, `${filename}_${sizeName}.${format}`);
          
          await image
            .resize(dimensions.width, dimensions.height, { 
              fit: 'cover',
              position: 'center'
            })
            .jpeg({ quality })
            .toFile(outputPath);

          results.push({
            size: sizeName,
            path: outputPath,
            url: this.getFileUrl(outputPath),
            dimensions: dimensions
          });
        }
      }

      // Optimizar imagen original si es necesario
      if (metadata.format !== format || quality < 100) {
        const optimizedPath = path.join(dir, `${filename}_optimized.${format}`);
        
        await image
          .jpeg({ quality })
          .toFile(optimizedPath);

        results.unshift({
          size: 'original',
          path: optimizedPath,
          url: this.getFileUrl(optimizedPath),
          dimensions: { width: metadata.width, height: metadata.height }
        });
      }

      // Eliminar archivo original si se requiere
      if (removeOriginal) {
        await fs.unlink(filePath);
      }

      return results;
    } catch (error) {
      log.error('Error processing image', { 
        error: error.message,
        filePath 
      });
      throw error;
    }
  }

  /**
   * 🔗 Obtener URL del archivo
   */
  getFileUrl(filePath) {
    const relativePath = path.relative(uploadConfig.uploadDir, filePath);
    return `/uploads/${relativePath.replace(/\\/g, '/')}`;
  }
}

/**
 * 📁 Servicio de gestión de archivos
 */
export class FileService {
  constructor() {
    this.imageProcessor = new ImageProcessor();
  }

  /**
   * 📊 Analizar archivo subido
   */
  async analyzeFile(filePath, originalName) {
    try {
      const stats = await fs.stat(filePath);
      const ext = path.extname(originalName).toLowerCase();
      const category = getFileCategory('', originalName);

      const analysis = {
        filename: originalName,
        size: stats.size,
        extension: ext,
        category: category,
        uploadedAt: new Date(),
        path: filePath,
        url: this.getPublicUrl(filePath)
      };

      // Análisis específico por tipo de archivo
      if (category === 'code') {
        analysis.codeAnalysis = await this.analyzeCodeFile(filePath, ext);
      } else if (category === 'images') {
        analysis.imageAnalysis = await this.analyzeImageFile(filePath);
      }

      return analysis;
    } catch (error) {
      log.error('Error analyzing file', { 
        error: error.message,
        filePath,
        originalName 
      });
      throw error;
    }
  }

  /**
   * 💻 Analizar archivo de código
   */
  async analyzeCodeFile(filePath, extension) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      return {
        lineCount: lines.length,
        charCount: content.length,
        language: this.detectLanguage(extension),
        hasComments: /\/\*[\s\S]*?\*\/|\/\/.*$/m.test(content),
        complexity: this.calculateComplexity(content),
        imports: this.extractImports(content, extension)
      };
    } catch (error) {
      log.error('Error analyzing code file', { error: error.message });
      return { error: error.message };
    }
  }

  /**
   * 🖼️ Analizar archivo de imagen
   */
  async analyzeImageFile(filePath) {
    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
        density: metadata.density
      };
    } catch (error) {
      log.error('Error analyzing image file', { error: error.message });
      return { error: error.message };
    }
  }

  /**
   * 🔍 Detectar lenguaje de programación
   */
  detectLanguage(extension) {
    const languageMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.dart': 'dart',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.vue': 'vue',
      '.svelte': 'svelte'
    };

    return languageMap[extension] || 'unknown';
  }

  /**
   * 📊 Calcular complejidad básica
   */
  calculateComplexity(content) {
    const complexityIndicators = [
      /if\s*\(/g,
      /for\s*\(/g,
      /while\s*\(/g,
      /switch\s*\(/g,
      /catch\s*\(/g,
      /function\s+\w+/g,
      /=>\s*{/g
    ];

    let complexity = 1; // Complejidad base
    
    complexityIndicators.forEach(regex => {
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  /**
   * 📥 Extraer imports/dependencias
   */
  extractImports(content, extension) {
    const imports = [];

    try {
      if (['.js', '.jsx', '.ts', '.tsx'].includes(extension)) {
        // Imports de ES6
        const es6Imports = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
        if (es6Imports) {
          es6Imports.forEach(imp => {
            const match = imp.match(/from\s+['"]([^'"]+)['"]/);
            if (match) imports.push(match[1]);
          });
        }

        // Requires de CommonJS
        const requires = content.match(/require\(['"]([^'"]+)['"]\)/g);
        if (requires) {
          requires.forEach(req => {
            const match = req.match(/require\(['"]([^'"]+)['"]\)/);
            if (match) imports.push(match[1]);
          });
        }
      }
    } catch (error) {
      log.error('Error extracting imports', { error: error.message });
    }

    return imports;
  }

  /**
   * 🔗 Obtener URL pública
   */
  getPublicUrl(filePath) {
    const relativePath = path.relative(uploadConfig.uploadDir, filePath);
    return `/uploads/${relativePath.replace(/\\/g, '/')}`;
  }

  /**
   * 🗑️ Eliminar archivo
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      log.info('File deleted', { filePath });
      return true;
    } catch (error) {
      log.error('Error deleting file', { error: error.message, filePath });
      return false;
    }
  }

  /**
   * 📁 Limpiar archivos temporales
   */
  async cleanupTempFiles(olderThanHours = 24) {
    try {
      const tempDir = uploadConfig.tempDir;
      const files = await fs.readdir(tempDir);
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }
      
      log.info('Temp files cleanup completed', { deletedCount });
      return deletedCount;
    } catch (error) {
      log.error('Error cleaning temp files', { error: error.message });
      return 0;
    }
  }
}

/**
 * 🔧 Funciones utilitarias
 */

/**
 * 📂 Obtener categoría del archivo
 */
function getFileCategory(mimetype, filename) {
  const ext = path.extname(filename).toLowerCase();
  
  if (uploadConfig.allowedMimeTypes.images.includes(mimetype) || 
      ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
    return 'images';
  }
  
  if (uploadConfig.allowedMimeTypes.documents.includes(mimetype) ||
      ['.pdf', '.doc', '.docx', '.md'].includes(ext)) {
    return 'documents';
  }
  
  if (uploadConfig.allowedMimeTypes.archives.includes(mimetype) ||
      ['.zip', '.tar', '.gz', '.rar'].includes(ext)) {
    return 'archives';
  }
  
  return 'code';
}

/**
 * 📁 Asegurar que el directorio existe
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(dirPath, { recursive: true });
      log.info('Directory created', { dirPath });
    } else {
      throw error;
    }
  }
}

/**
 * 🎯 Instancias globales
 */
export const fileService = new FileService();
export const imageProcessor = new ImageProcessor();

/**
 * 🚀 Inicializar directorios de upload
 */
export const initializeUploadDirectories = async () => {
  try {
    const directories = [
      uploadConfig.uploadDir,
      uploadConfig.tempDir,
      path.join(uploadConfig.uploadDir, 'code'),
      path.join(uploadConfig.uploadDir, 'images'),
      path.join(uploadConfig.uploadDir, 'documents'),
      path.join(uploadConfig.uploadDir, 'archives')
    ];

    for (const dir of directories) {
      await ensureDirectoryExists(dir);
    }

    log.info('Upload directories initialized successfully');
  } catch (error) {
    log.error('Error initializing upload directories', { error: error.message });
    throw error;
  }
};

export { uploadConfig };
export default upload;