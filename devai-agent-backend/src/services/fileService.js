// src/services/fileService.js
// ============================================
// 📁 SERVICIO DE PROCESAMIENTO DE ARCHIVOS - CommonJS
// ============================================

const { FILE_CONFIGS, DEVICE_CONFIGS } = require('../utils/constants');

// =================================
// 🔧 UTILIDADES DE ARCHIVOS
// =================================

/**
 * Obtener tipo de archivo por extensión
 */
const getFileType = (filename) => {
  const ext = '.' + filename.split('.').pop().toLowerCase();
  
  const typeMap = {
    // Código
    '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
    '.py': 'python', '.java': 'java', '.cpp': 'cpp', '.c': 'c', '.cs': 'csharp',
    '.rb': 'ruby', '.go': 'go', '.rs': 'rust', '.swift': 'swift', '.kt': 'kotlin',
    '.php': 'php', '.scala': 'scala', '.clj': 'clojure', '.hs': 'haskell',
    
    // Web
    '.html': 'html', '.htm': 'html', '.css': 'css', '.scss': 'scss', '.sass': 'sass',
    '.less': 'less', '.xml': 'xml', '.svg': 'xml',
    
    // Datos
    '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
    '.ini': 'ini', '.env': 'bash', '.config': 'text',
    
    // Documentación
    '.md': 'markdown', '.mdx': 'markdown', '.txt': 'text', '.rst': 'rst',
    
    // Build/Config
    '.dockerfile': 'dockerfile', '.gitignore': 'text', '.npmrc': 'text',
    '.eslintrc': 'json', '.prettierrc': 'json'
  };

  return typeMap[ext] || 'text';
};

/**
 * Verificar si un archivo es soportado
 */
const isFileSupported = (filename) => {
  const ext = '.' + filename.split('.').pop().toLowerCase();
  return FILE_CONFIGS.supportedExtensions.includes(ext) || 
         ['package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.js'].includes(filename);
};

/**
 * Obtener configuración de límites por dispositivo
 */
const getDeviceConfig = (isMobile = false) => {
  return isMobile ? DEVICE_CONFIGS.mobile : DEVICE_CONFIGS.desktop;
};

/**
 * Formatear tamaño de archivo
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validar archivo individual
 */
const validateFile = (file, config) => {
  const errors = [];
  
  // Verificar extensión
  if (!isFileSupported(file.name)) {
    errors.push(`Tipo de archivo no soportado: ${file.name}`);
  }
  
  // Verificar tamaño
  if (file.size > config.maxFileSize) {
    errors.push(`Archivo muy grande: ${file.name} (${formatFileSize(file.size)} > ${formatFileSize(config.maxFileSize)})`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// =================================
// 📁 PROCESAMIENTO PRINCIPAL
// =================================

/**
 * Procesar lista de archivos
 */
const processFiles = async (fileList, options = {}) => {
  const files = Array.from(fileList);
  const config = getDeviceConfig(options.isMobile);
  
  // Configuración con defaults
  const processingConfig = {
    maxFiles: options.maxFiles || config.maxFiles,
    maxTotalSize: options.maxTotalSize || config.maxTotalSize,
    skipLargeFiles: options.skipLargeFiles !== false,
    includeContent: options.includeContent !== false,
    ...options
  };

  const result = {
    success: false,
    project: null,
    stats: {
      totalFiles: files.length,
      processedFiles: 0,
      skippedFiles: 0,
      errors: 0,
      totalSize: 0,
      processedSize: 0
    },
    errors: [],
    warnings: []
  };

  try {
    // Validar cantidad de archivos
    if (files.length > processingConfig.maxFiles) {
      result.warnings.push(`Demasiados archivos (${files.length}), procesando solo los primeros ${processingConfig.maxFiles}`);
      files.splice(processingConfig.maxFiles);
    }

    // Calcular tamaño total inicial
    result.stats.totalSize = files.reduce((sum, file) => sum + file.size, 0);

    // Filtrar y validar archivos
    const validFiles = [];
    const skippedFiles = [];

    for (const file of files) {
      const validation = validateFile(file, processingConfig);
      
      if (validation.valid) {
        validFiles.push(file);
      } else {
        if (processingConfig.skipLargeFiles && 
            validation.errors.some(err => err.includes('muy grande'))) {
          skippedFiles.push({
            name: file.name,
            size: file.size,
            reason: 'Archivo muy grande - omitido automáticamente'
          });
          result.stats.skippedFiles++;
        } else {
          result.errors.push(...validation.errors);
          result.stats.errors++;
        }
      }
    }

    // Verificar tamaño total
    const validTotalSize = validFiles.reduce((sum, file) => sum + file.size, 0);
    if (validTotalSize > processingConfig.maxTotalSize) {
      // Ordenar por tamaño y tomar los más pequeños hasta el límite
      validFiles.sort((a, b) => a.size - b.size);
      
      let accumulatedSize = 0;
      const selectedFiles = [];
      
      for (const file of validFiles) {
        if (accumulatedSize + file.size <= processingConfig.maxTotalSize) {
          selectedFiles.push(file);
          accumulatedSize += file.size;
        } else {
          skippedFiles.push({
            name: file.name,
            size: file.size,
            reason: 'Excede límite total - omitido'
          });
          result.stats.skippedFiles++;
        }
      }
      
      validFiles.length = 0;
      validFiles.push(...selectedFiles);
      
      result.warnings.push(`Tamaño total muy grande, seleccionando archivos hasta ${formatFileSize(processingConfig.maxTotalSize)}`);
    }

    // Procesar archivos válidos
    const processedFiles = [];
    let currentSize = 0;

    for (const file of validFiles) {
      try {
        const processedFile = await processFile(file, processingConfig);
        processedFiles.push(processedFile);
        currentSize += file.size;
        result.stats.processedFiles++;
      } catch (error) {
        console.error(`Error procesando archivo ${file.name}:`, error);
        result.errors.push(`Error procesando ${file.name}: ${error.message}`);
        result.stats.errors++;
      }
    }

    result.stats.processedSize = currentSize;

    // Generar proyecto
    if (processedFiles.length > 0) {
      result.project = generateProjectStructure(processedFiles, files[0], {
        skippedFiles,
        warnings: result.warnings,
        totalOriginalFiles: result.stats.totalFiles,
        totalProcessedFiles: result.stats.processedFiles
      });
      
      result.success = true;
    } else {
      result.errors.push('No se pudo procesar ningún archivo');
    }

    return result;

  } catch (error) {
    console.error('Error en procesamiento de archivos:', error);
    result.errors.push(`Error general: ${error.message}`);
    return result;
  }
};

/**
 * Procesar archivo individual
 */
const processFile = async (file, config) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        const fileType = getFileType(file.name);
        
        // Validar contenido si es necesario
        if (config.includeContent && !content) {
          throw new Error('Contenido vacío');
        }

        // Analizar contenido básico
        const analysis = analyzeFileContent(content, fileType);

        const processedFile = {
          name: file.name,
          type: fileType,
          size: file.size,
          content: config.includeContent ? content : null,
          lastModified: new Date(file.lastModified),
          path: file.webkitRelativePath || file.name,
          analysis,
          metadata: {
            lines: content ? content.split('\n').length : 0,
            characters: content ? content.length : 0,
            isEmpty: !content || content.trim().length === 0
          }
        };

        resolve(processedFile);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error leyendo archivo'));
    };

    // Leer como texto
    reader.readAsText(file);
  });
};

/**
 * Analizar contenido del archivo
 */
const analyzeFileContent = (content, fileType) => {
  if (!content) return { type: fileType, features: [] };

  const analysis = {
    type: fileType,
    features: [],
    complexity: 'low',
    imports: [],
    exports: [],
    functions: [],
    classes: []
  };

  try {
    // Análisis básico por tipo
    switch (fileType) {
      case 'javascript':
      case 'typescript':
        analyzeJavaScript(content, analysis);
        break;
      
      case 'python':
        analyzePython(content, analysis);
        break;
      
      case 'html':
        analyzeHTML(content, analysis);
        break;
      
      case 'css':
      case 'scss':
      case 'sass':
        analyzeCSS(content, analysis);
        break;
      
      case 'json':
        analyzeJSON(content, analysis);
        break;
      
      default:
        analyzeGeneric(content, analysis);
    }
  } catch (error) {
    console.warn(`Error analizando ${fileType}:`, error.message);
    analysis.features.push('analysis-error');
  }

  return analysis;
};

/**
 * Análisis específico para JavaScript/TypeScript
 */
const analyzeJavaScript = (content, analysis) => {
  // Imports/Exports
  const importMatches = content.match(/import .+ from .+/g) || [];
  const exportMatches = content.match(/export .+/g) || [];
  
  analysis.imports = importMatches.slice(0, 10); // Limitar para performance
  analysis.exports = exportMatches.slice(0, 10);
  
  // Funciones
  const functionMatches = content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*\{/g) || [];
  analysis.functions = functionMatches.slice(0, 20);
  
  // Clases
  const classMatches = content.match(/class\s+\w+/g) || [];
  analysis.classes = classMatches.slice(0, 10);
  
  // Features
  if (content.includes('React')) analysis.features.push('react');
  if (content.includes('useState') || content.includes('useEffect')) analysis.features.push('hooks');
  if (content.includes('async') || content.includes('await')) analysis.features.push('async');
  if (content.includes('TypeScript') || content.includes(': string') || content.includes(': number')) analysis.features.push('typescript');
  
  // Complejidad básica
  const complexityScore = (importMatches.length * 1) + (functionMatches.length * 2) + (classMatches.length * 3);
  analysis.complexity = complexityScore > 50 ? 'high' : complexityScore > 20 ? 'medium' : 'low';
};

/**
 * Análisis específico para Python
 */
const analyzePython = (content, analysis) => {
  // Imports
  const importMatches = content.match(/^import .+|^from .+ import .+/gm) || [];
  analysis.imports = importMatches.slice(0, 10);
  
  // Funciones
  const functionMatches = content.match(/^def \w+/gm) || [];
  analysis.functions = functionMatches.slice(0, 20);
  
  // Clases
  const classMatches = content.match(/^class \w+/gm) || [];
  analysis.classes = classMatches.slice(0, 10);
  
  // Features
  if (content.includes('pandas') || content.includes('numpy')) analysis.features.push('data-science');
  if (content.includes('flask') || content.includes('django')) analysis.features.push('web-framework');
  if (content.includes('async def') || content.includes('await')) analysis.features.push('async');
  
  const complexityScore = (importMatches.length * 1) + (functionMatches.length * 2) + (classMatches.length * 3);
  analysis.complexity = complexityScore > 40 ? 'high' : complexityScore > 15 ? 'medium' : 'low';
};

/**
 * Análisis específico para HTML
 */
const analyzeHTML = (content, analysis) => {
  // Tags
  const tagMatches = content.match(/<\w+/g) || [];
  const uniqueTags = [...new Set(tagMatches.map(tag => tag.replace('<', '')))];
  
  // Features
  if (content.includes('<script>') || content.includes('<script ')) analysis.features.push('javascript');
  if (content.includes('<style>') || content.includes('<link')) analysis.features.push('css');
  if (content.includes('bootstrap') || content.includes('tailwind')) analysis.features.push('css-framework');
  if (content.includes('react') || content.includes('vue') || content.includes('angular')) analysis.features.push('spa');
  
  analysis.metadata = {
    ...analysis.metadata,
    uniqueTags: uniqueTags.slice(0, 20),
    tagCount: tagMatches.length
  };
};

/**
 * Análisis específico para CSS
 */
const analyzeCSS = (content, analysis) => {
  // Selectores
  const selectorMatches = content.match(/[^{}]+(?=\s*\{)/g) || [];
  
  // Features
  if (content.includes('@media')) analysis.features.push('responsive');
  if (content.includes('@keyframes') || content.includes('animation')) analysis.features.push('animations');
  if (content.includes('grid') || content.includes('flex')) analysis.features.push('modern-layout');
  if (content.includes('var(') || content.includes('--')) analysis.features.push('css-variables');
  
  analysis.metadata = {
    ...analysis.metadata,
    selectors: selectorMatches.slice(0, 30).map(s => s.trim()),
    selectorCount: selectorMatches.length
  };
};

/**
 * Análisis específico para JSON
 */
const analyzeJSON = (content, analysis) => {
  try {
    const jsonData = JSON.parse(content);
    
    // Detectar tipo de JSON
    if (jsonData.name && jsonData.version && (jsonData.dependencies || jsonData.scripts)) {
      analysis.features.push('package-json');
    } else if (jsonData.compilerOptions) {
      analysis.features.push('tsconfig');
    } else if (jsonData.rules || jsonData.extends) {
      analysis.features.push('eslint-config');
    }
    
    analysis.metadata = {
      ...analysis.metadata,
      keys: Object.keys(jsonData).slice(0, 20),
      keyCount: Object.keys(jsonData).length,
      depth: getObjectDepth(jsonData)
    };
  } catch (error) {
    analysis.features.push('invalid-json');
  }
};

/**
 * Análisis genérico para otros tipos
 */
const analyzeGeneric = (content, analysis) => {
  // Análisis básico
  const lines = content.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  
  analysis.metadata = {
    ...analysis.metadata,
    totalLines: lines.length,
    nonEmptyLines: nonEmptyLines.length,
    avgLineLength: nonEmptyLines.reduce((sum, line) => sum + line.length, 0) / nonEmptyLines.length || 0
  };
  
  // Features básicas
  if (content.includes('TODO') || content.includes('FIXME')) analysis.features.push('has-todos');
  if (content.includes('http://') || content.includes('https://')) analysis.features.push('has-urls');
};

/**
 * Calcular profundidad de objeto
 */
const getObjectDepth = (obj, depth = 0) => {
  if (!obj || typeof obj !== 'object') return depth;
  
  return Math.max(depth, ...Object.values(obj).map(value => 
    getObjectDepth(value, depth + 1)
  ));
};

/**
 * Generar estructura de proyecto
 */
const generateProjectStructure = (files, firstFile, metadata) => {
  // Detectar nombre del proyecto
  const projectName = detectProjectName(files, firstFile);
  
  // Agrupar archivos por directorio
  const filesByDirectory = groupFilesByDirectory(files);
  
  // Estadísticas
  const stats = {
    totalFiles: files.length,
    totalSize: files.reduce((sum, file) => sum + file.size, 0),
    filesByType: getFileTypeStats(files),
    complexity: calculateProjectComplexity(files),
    languages: getUniqueLanguages(files)
  };

  return {
    name: projectName,
    files: files,
    structure: filesByDirectory,
    stats: stats,
    metadata: {
      createdAt: new Date().toISOString(),
      source: 'local-processing',
      ...metadata
    },
    // Propiedades para compatibilidad
    totalFiles: files.length,
    totalSize: stats.totalSize
  };
};

/**
 * Detectar nombre del proyecto
 */
const detectProjectName = (files, firstFile) => {
  // Buscar package.json
  const packageFile = files.find(f => f.name === 'package.json');
  if (packageFile && packageFile.content) {
    try {
      const packageData = JSON.parse(packageFile.content);
      if (packageData.name) return packageData.name;
    } catch (error) {
      // Ignorar error de JSON
    }
  }
  
  // Usar directorio raíz si está disponible
  if (firstFile.webkitRelativePath) {
    return firstFile.webkitRelativePath.split('/')[0];
  }
  
  // Nombre por defecto
  return `Proyecto ${new Date().toLocaleDateString()}`;
};

/**
 * Agrupar archivos por directorio
 */
const groupFilesByDirectory = (files) => {
  const directories = {};
  
  files.forEach(file => {
    const path = file.path || file.name;
    const dirPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '/';
    
    if (!directories[dirPath]) {
      directories[dirPath] = [];
    }
    
    directories[dirPath].push(file);
  });
  
  return directories;
};

/**
 * Obtener estadísticas por tipo de archivo
 */
const getFileTypeStats = (files) => {
  const stats = {};
  
  files.forEach(file => {
    const type = file.type || 'unknown';
    stats[type] = (stats[type] || 0) + 1;
  });
  
  return stats;
};

/**
 * Calcular complejidad del proyecto
 */
const calculateProjectComplexity = (files) => {
  const complexityScores = files.map(file => {
    const analysis = file.analysis || {};
    switch (analysis.complexity) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  });
  
  const avgComplexity = complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length;
  
  return avgComplexity > 2.5 ? 'high' : avgComplexity > 1.5 ? 'medium' : 'low';
};

/**
 * Obtener lenguajes únicos
 */
const getUniqueLanguages = (files) => {
  const languages = new Set();
  
  files.forEach(file => {
    if (file.type && file.type !== 'text') {
      languages.add(file.type);
    }
  });
  
  return Array.from(languages);
};

// =================================
// EXPORTACIONES
// =================================

module.exports = {
  // Función principal
  processFiles,
  
  // Utilidades
  getFileType,
  isFileSupported,
  validateFile,
  formatFileSize,
  getDeviceConfig,
  
  // Análisis
  analyzeFileContent,
  analyzeJavaScript,
  analyzePython,
  analyzeHTML,
  analyzeCSS,
  analyzeJSON,
  analyzeGeneric,
  
  // Estructura
  generateProjectStructure,
  detectProjectName,
  groupFilesByDirectory,
  getFileTypeStats,
  calculateProjectComplexity,
  getUniqueLanguages
};