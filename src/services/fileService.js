// ============================================
// 📁 FILE SERVICE
// ============================================

/**
 * Servicio para manejo de archivos y proyectos
 */

/**
 * Tipos de archivo soportados
 */
export const SUPPORTED_FILE_TYPES = {
  // Código
  '.js': { type: 'javascript', icon: '📄', color: '#f7df1e' },
  '.jsx': { type: 'react', icon: '⚛️', color: '#61dafb' },
  '.ts': { type: 'typescript', icon: '📘', color: '#3178c6' },
  '.tsx': { type: 'react-typescript', icon: '⚛️', color: '#3178c6' },
  '.py': { type: 'python', icon: '🐍', color: '#3776ab' },
  '.java': { type: 'java', icon: '☕', color: '#ed8b00' },
  '.cpp': { type: 'cpp', icon: '⚙️', color: '#00599c' },
  '.c': { type: 'c', icon: '⚙️', color: '#a8b9cc' },
  '.cs': { type: 'csharp', icon: '💜', color: '#239120' },
  '.php': { type: 'php', icon: '🐘', color: '#777bb4' },
  '.rb': { type: 'ruby', icon: '💎', color: '#cc342d' },
  '.go': { type: 'go', icon: '🐹', color: '#00add8' },
  '.rs': { type: 'rust', icon: '🦀', color: '#000000' },
  '.swift': { type: 'swift', icon: '🍎', color: '#fa7343' },
  '.kt': { type: 'kotlin', icon: '📱', color: '#7f52ff' },
  '.dart': { type: 'dart', icon: '🎯', color: '#0175c2' },
  
  // Web
  '.html': { type: 'html', icon: '🌐', color: '#e34f26' },
  '.css': { type: 'css', icon: '🎨', color: '#1572b6' },
  '.scss': { type: 'scss', icon: '🎨', color: '#cf649a' },
  '.sass': { type: 'sass', icon: '🎨', color: '#cf649a' },
  '.vue': { type: 'vue', icon: '💚', color: '#4fc08d' },
  '.svelte': { type: 'svelte', icon: '🧡', color: '#ff3e00' },
  
  // Configuración
  '.json': { type: 'json', icon: '📋', color: '#000000' },
  '.yaml': { type: 'yaml', icon: '📋', color: '#cb171e' },
  '.yml': { type: 'yaml', icon: '📋', color: '#cb171e' },
  '.xml': { type: 'xml', icon: '📄', color: '#e37933' },
  '.toml': { type: 'toml', icon: '📋', color: '#9c4221' },
  '.ini': { type: 'ini', icon: '⚙️', color: '#6d6d6d' },
  
  // Documentación
  '.md': { type: 'markdown', icon: '📝', color: '#000000' },
  '.txt': { type: 'text', icon: '📄', color: '#6d6d6d' },
  '.rst': { type: 'restructuredtext', icon: '📝', color: '#3a4148' },
  
  // Scripts
  '.sh': { type: 'shell', icon: '🐚', color: '#4eaa25' },
  '.bash': { type: 'bash', icon: '🐚', color: '#4eaa25' },
  '.ps1': { type: 'powershell', icon: '💙', color: '#012456' },
  '.bat': { type: 'batch', icon: '⚫', color: '#000000' },
  
  // Bases de datos
  '.sql': { type: 'sql', icon: '🗄️', color: '#e38c00' },
  
  // Otros
  '.env': { type: 'env', icon: '🔐', color: '#ecd53f' },
  '.gitignore': { type: 'gitignore', icon: '🚫', color: '#f05032' },
  '.dockerfile': { type: 'dockerfile', icon: '🐳', color: '#2496ed' }
};

/**
 * Validar archivo antes de procesarlo
 * @param {File} file - Archivo a validar
 * @returns {Object} Resultado de validación
 */
export const validateFile = (file) => {
  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    fileInfo: null
  };

  // Verificar tamaño (máximo 5MB)
  if (file.size > 5 * 1024 * 1024) {
    result.isValid = false;
    result.errors.push(`El archivo ${file.name} excede el límite de 5MB`);
    return result;
  }

  // Verificar tipo de archivo
  const extension = getFileExtension(file.name);
  const fileType = SUPPORTED_FILE_TYPES[extension];
  
  if (!fileType) {
    result.warnings.push(`Tipo de archivo no reconocido: ${extension}`);
  }

  // Información del archivo
  result.fileInfo = {
    name: file.name,
    size: file.size,
    extension: extension,
    type: fileType?.type || 'unknown',
    icon: fileType?.icon || '📄',
    color: fileType?.color || '#6d6d6d'
  };

  return result;
};

/**
 * Procesar archivo individual
 * @param {File} file - Archivo a procesar
 * @returns {Promise<Object>} Archivo procesado
 */
export const processFile = async (file) => {
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }

  try {
    const content = await readFileContent(file);
    const extension = getFileExtension(file.name);
    const fileType = SUPPORTED_FILE_TYPES[extension];

    return {
      name: file.name,
      content: content,
      size: file.size,
      type: extension,
      language: fileType?.type || 'text',
      icon: fileType?.icon || '📄',
      color: fileType?.color || '#6d6d6d',
      lineCount: content.split('\n').length,
      charCount: content.length,
      processedAt: new Date(),
      validation: validation
    };
  } catch (error) {
    throw new Error(`Error procesando archivo ${file.name}: ${error.message}`);
  }
};

/**
 * Procesar múltiples archivos
 * @param {FileList} files - Lista de archivos
 * @param {Object} options - Opciones de procesamiento
 * @returns {Promise<Object>} Proyecto procesado
 */
export const processFiles = async (files, options = {}) => {
  const {
    maxFiles = 20,
    maxTotalSize = 50 * 1024 * 1024, // 50MB
    skipLargeFiles = true,
    onProgress = null
  } = options;

  const fileArray = Array.from(files);
  const processedFiles = [];
  let totalSize = 0;
  let skippedFiles = [];
  let errors = [];

  // Limitar número de archivos
  const filesToProcess = fileArray.slice(0, maxFiles);
  if (fileArray.length > maxFiles) {
    console.warn(`Limitando a ${maxFiles} archivos de ${fileArray.length} total`);
  }

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    
    try {
      // Verificar tamaño total
      if (totalSize + file.size > maxTotalSize) {
        if (skipLargeFiles) {
          skippedFiles.push({
            name: file.name,
            reason: 'Excede límite total de tamaño',
            size: file.size
          });
          continue;
        } else {
          throw new Error(`El tamaño total excede ${maxTotalSize / 1024 / 1024}MB`);
        }
      }

      const processedFile = await processFile(file);
      processedFiles.push(processedFile);
      totalSize += file.size;

      // Callback de progreso
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: filesToProcess.length,
          file: processedFile,
          progress: ((i + 1) / filesToProcess.length) * 100
        });
      }

    } catch (error) {
      errors.push({
        file: file.name,
        error: error.message
      });
    }
  }

  // Determinar nombre del proyecto
  const projectName = determineProjectName(files, processedFiles);

  return {
    name: projectName,
    files: processedFiles,
    totalFiles: processedFiles.length,
    totalSize: totalSize,
    skippedFiles: skippedFiles,
    errors: errors,
    stats: generateProjectStats(processedFiles),
    processedAt: new Date()
  };
};

/**
 * Leer contenido de archivo
 * @param {File} file - Archivo a leer
 * @returns {Promise<string>} Contenido del archivo
 */
const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    
    reader.onerror = () => {
      reject(new Error(`Error leyendo archivo: ${file.name}`));
    };

    // Intentar leer como texto
    reader.readAsText(file, 'UTF-8');
  });
};

/**
 * Obtener extensión de archivo
 * @param {string} filename - Nombre del archivo
 * @returns {string} Extensión del archivo
 */
const getFileExtension = (filename) => {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
};

/**
 * Determinar nombre del proyecto
 * @param {FileList} originalFiles - Archivos originales
 * @param {Array} processedFiles - Archivos procesados
 * @returns {string} Nombre del proyecto
 */
const determineProjectName = (originalFiles, processedFiles) => {
  // Si hay archivos con webkitRelativePath, usar el directorio raíz
  for (const file of originalFiles) {
    if (file.webkitRelativePath) {
      const pathParts = file.webkitRelativePath.split('/');
      if (pathParts.length > 1) {
        return pathParts[0];
      }
    }
  }

  // Buscar archivos de configuración comunes
  const configFiles = ['package.json', 'composer.json', 'pom.xml', 'Cargo.toml', 'requirements.txt'];
  for (const configFile of configFiles) {
    if (processedFiles.some(f => f.name === configFile)) {
      return `Proyecto ${configFile.split('.')[0]}`;
    }
  }

  // Usar fecha como fallback
  const date = new Date().toLocaleDateString('es-ES');
  return `Proyecto ${date}`;
};

/**
 * Generar estadísticas del proyecto
 * @param {Array} files - Archivos procesados
 * @returns {Object} Estadísticas
 */
const generateProjectStats = (files) => {
  const stats = {
    totalFiles: files.length,
    totalLines: 0,
    totalChars: 0,
    languages: {},
    fileTypes: {},
    largestFile: null,
    smallestFile: null
  };

  let maxSize = 0;
  let minSize = Infinity;

  files.forEach(file => {
    // Contadores generales
    stats.totalLines += file.lineCount;
    stats.totalChars += file.charCount;

    // Conteo por lenguaje
    const lang = file.language;
    stats.languages[lang] = (stats.languages[lang] || 0) + 1;

    // Conteo por tipo de archivo
    const type = file.type;
    stats.fileTypes[type] = (stats.fileTypes[type] || 0) + 1;

    // Archivo más grande
    if (file.size > maxSize) {
      maxSize = file.size;
      stats.largestFile = {
        name: file.name,
        size: file.size,
        lines: file.lineCount
      };
    }

    // Archivo más pequeño
    if (file.size < minSize) {
      minSize = file.size;
      stats.smallestFile = {
        name: file.name,
        size: file.size,
        lines: file.lineCount
      };
    }
  });

  // Lenguaje más usado
  stats.primaryLanguage = Object.entries(stats.languages)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';

  return stats;
};

/**
 * Exportar proyecto como ZIP (simulado)
 * @param {Object} project - Proyecto a exportar
 * @returns {Object} Información de exportación
 */
export const exportProject = (project) => {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;

  // En una implementación real, aquí se crearía un ZIP
  const exportData = {
    filename: filename,
    format: 'json', // Por ahora solo JSON
    data: JSON.stringify({
      projectInfo: {
        name: project.name,
        exportedAt: new Date().toISOString(),
        totalFiles: project.files.length,
        stats: project.stats
      },
      files: project.files.map(file => ({
        name: file.name,
        content: file.content,
        type: file.type,
        language: file.language
      }))
    }, null, 2)
  };

  return exportData;
};

/**
 * Buscar archivos por contenido
 * @param {Array} files - Archivos donde buscar
 * @param {string} searchTerm - Término de búsqueda
 * @param {Object} options - Opciones de búsqueda
 * @returns {Array} Resultados de búsqueda
 */
export const searchInFiles = (files, searchTerm, options = {}) => {
  const {
    caseSensitive = false,
    wholeWord = false,
    useRegex = false,
    fileTypes = null
  } = options;

  const results = [];

  files.forEach(file => {
    // Filtrar por tipo si se especifica
    if (fileTypes && !fileTypes.includes(file.language)) {
      return;
    }

    let searchPattern;
    
    if (useRegex) {
      try {
        searchPattern = new RegExp(searchTerm, caseSensitive ? 'g' : 'gi');
      } catch (e) {
        // Si el regex es inválido, usar búsqueda normal
        searchPattern = searchTerm;
      }
    } else {
      const flags = caseSensitive ? 'g' : 'gi';
      const term = wholeWord ? `\\b${searchTerm}\\b` : searchTerm;
      searchPattern = new RegExp(term, flags);
    }

    const lines = file.content.split('\n');
    const matches = [];

    lines.forEach((line, lineIndex) => {
      let match;
      while ((match = searchPattern.exec(line)) !== null) {
        matches.push({
          line: lineIndex + 1,
          column: match.index + 1,
          text: line.trim(),
          match: match[0]
        });
        
        // Evitar loop infinito con regex global
        if (!searchPattern.global) break;
      }
    });

    if (matches.length > 0) {
      results.push({
        file: file,
        matches: matches,
        matchCount: matches.length
      });
    }
  });

  return results.sort((a, b) => b.matchCount - a.matchCount);
};

/**
 * Obtener información resumida de archivos
 * @param {Array} files - Lista de archivos
 * @returns {Object} Resumen
 */
export const getFilesSummary = (files) => {
  if (!files || files.length === 0) {
    return {
      isEmpty: true,
      message: 'No hay archivos cargados'
    };
  }

  const stats = generateProjectStats(files);
  
  return {
    isEmpty: false,
    totalFiles: files.length,
    primaryLanguage: stats.primaryLanguage,
    totalLines: stats.totalLines,
    languages: Object.keys(stats.languages).slice(0, 3), // Top 3 lenguajes
    largestFile: stats.largestFile?.name,
    message: `${files.length} archivos • ${stats.primaryLanguage} • ${stats.totalLines.toLocaleString()} líneas`
  };
};

export default {
  validateFile,
  processFile,
  processFiles,
  exportProject,
  searchInFiles,
  getFilesSummary,
  SUPPORTED_FILE_TYPES
};