// ============================================
// 📝 CODE BLOCK EXTRACTOR UTILITY
// ============================================

/**
 * Extrae bloques de código de los mensajes del chat
 * @param {Array} messages - Array de mensajes
 * @returns {Array} Array de objetos con language y code
 */
export const extractCodeBlocks = (messages) => {
  if (!messages || !Array.isArray(messages)) return [];

  const codeBlocks = [];
  
  messages.forEach((message, messageIndex) => {
    if (message.role === 'assistant' && message.content) {
      const blocks = parseCodeBlocks(message.content, messageIndex);
      codeBlocks.push(...blocks);
    }
  });

  return codeBlocks;
};

/**
 * Parsea bloques de código de un texto
 * @param {string} content - Contenido del mensaje
 * @param {number} messageIndex - Índice del mensaje
 * @returns {Array} Array de bloques de código
 */
export const parseCodeBlocks = (content, messageIndex = 0) => {
  const codeBlocks = [];
  const regex = /```(\w+)?\n?([\s\S]*?)```/g;
  let match;
  let blockIndex = 0;

  while ((match = regex.exec(content)) !== null) {
    const language = match[1] || 'text';
    const code = match[2].trim();
    
    // Solo incluir código significativo (más de 10 caracteres)
    if (code.length > 10) {
      codeBlocks.push({
        id: `${messageIndex}-${blockIndex}`,
        language: language.toLowerCase(),
        code: code,
        messageIndex: messageIndex,
        blockIndex: blockIndex,
        isPreviewable: isPreviewableLanguage(language),
        lineCount: code.split('\n').length,
        charCount: code.length
      });
      blockIndex++;
    }
  }

  return codeBlocks;
};

/**
 * Determina si un lenguaje es previsualizable
 * @param {string} language - Lenguaje de programación
 * @returns {boolean} True si es previsualizable
 */
export const isPreviewableLanguage = (language) => {
  const previewableLanguages = [
    'html',
    'css', 
    'javascript',
    'js',
    'jsx',
    'react',
    'vue',
    'svelte',
    'typescript',
    'ts',
    'tsx'
  ];

  return previewableLanguages.includes(language?.toLowerCase());
};

/**
 * Filtra solo bloques previewables
 * @param {Array} codeBlocks - Array de bloques de código
 * @returns {Array} Solo bloques previewables
 */
export const getPreviewableBlocks = (codeBlocks) => {
  return codeBlocks.filter(block => block.isPreviewable);
};

/**
 * Agrupa bloques de código por lenguaje
 * @param {Array} codeBlocks - Array de bloques de código
 * @returns {Object} Objeto agrupado por lenguaje
 */
export const groupBlocksByLanguage = (codeBlocks) => {
  return codeBlocks.reduce((groups, block) => {
    const lang = block.language;
    if (!groups[lang]) {
      groups[lang] = [];
    }
    groups[lang].push(block);
    return groups;
  }, {});
};

/**
 * Obtiene estadísticas de los bloques de código
 * @param {Array} codeBlocks - Array de bloques de código
 * @returns {Object} Estadísticas
 */
export const getCodeBlockStats = (codeBlocks) => {
  const languageCount = {};
  let totalLines = 0;
  let totalChars = 0;
  let previewableCount = 0;

  codeBlocks.forEach(block => {
    // Contar por lenguaje
    const lang = block.language;
    languageCount[lang] = (languageCount[lang] || 0) + 1;

    // Totales
    totalLines += block.lineCount;
    totalChars += block.charCount;

    // Previewables
    if (block.isPreviewable) {
      previewableCount++;
    }
  });

  return {
    totalBlocks: codeBlocks.length,
    totalLines,
    totalChars,
    previewableCount,
    languages: Object.keys(languageCount).length,
    languageBreakdown: languageCount,
    mostUsedLanguage: Object.entries(languageCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none'
  };
};

/**
 * Busca bloques de código por contenido
 * @param {Array} codeBlocks - Array de bloques de código
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Array} Bloques que coinciden
 */
export const searchCodeBlocks = (codeBlocks, searchTerm) => {
  if (!searchTerm.trim()) return codeBlocks;

  const term = searchTerm.toLowerCase();
  
  return codeBlocks.filter(block => 
    block.language.toLowerCase().includes(term) ||
    block.code.toLowerCase().includes(term)
  );
};

/**
 * Obtiene el tipo de archivo sugerido para un bloque
 * @param {Object} block - Bloque de código
 * @returns {string} Extensión de archivo sugerida
 */
export const getSuggestedFileExtension = (block) => {
  const extensions = {
    'html': '.html',
    'css': '.css',
    'javascript': '.js',
    'js': '.js',
    'jsx': '.jsx',
    'react': '.jsx',
    'typescript': '.ts',
    'ts': '.ts',
    'tsx': '.tsx',
    'vue': '.vue',
    'svelte': '.svelte',
    'python': '.py',
    'py': '.py',
    'java': '.java',
    'cpp': '.cpp',
    'c': '.c',
    'php': '.php',
    'ruby': '.rb',
    'go': '.go',
    'rust': '.rs',
    'swift': '.swift',
    'kotlin': '.kt',
    'dart': '.dart',
    'json': '.json',
    'yaml': '.yaml',
    'yml': '.yml',
    'xml': '.xml',
    'sql': '.sql',
    'shell': '.sh',
    'bash': '.sh'
  };

  return extensions[block.language] || '.txt';
};

/**
 * Convierte un bloque a archivo descargable
 * @param {Object} block - Bloque de código
 * @param {string} filename - Nombre del archivo (opcional)
 * @returns {Object} Objeto con datos del archivo
 */
export const blockToFile = (block, filename = null) => {
  const suggestedName = filename || `code-${block.id}${getSuggestedFileExtension(block)}`;
  
  return {
    name: suggestedName,
    content: block.code,
    type: 'text/plain',
    size: new Blob([block.code]).size,
    language: block.language
  };
};

/**
 * Extrae imports/dependencias de un bloque de código
 * @param {Object} block - Bloque de código
 * @returns {Array} Array de dependencias encontradas
 */
export const extractDependencies = (block) => {
  const dependencies = [];
  const { code, language } = block;

  switch (language) {
    case 'javascript':
    case 'js':
    case 'jsx':
    case 'react':
    case 'typescript':
    case 'ts':
    case 'tsx':
      // Buscar imports de ES6
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      let importMatch;
      while ((importMatch = importRegex.exec(code)) !== null) {
        dependencies.push({
          type: 'import',
          name: importMatch[1],
          line: code.substring(0, importMatch.index).split('\n').length
        });
      }

      // Buscar requires de CommonJS
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
      let requireMatch;
      while ((requireMatch = requireRegex.exec(code)) !== null) {
        dependencies.push({
          type: 'require',
          name: requireMatch[1],
          line: code.substring(0, requireMatch.index).split('\n').length
        });
      }
      break;

    case 'python':
    case 'py':
      // Buscar imports de Python
      const pythonImportRegex = /(?:from\s+(\S+)\s+)?import\s+([^\n]+)/g;
      let pythonMatch;
      while ((pythonMatch = pythonImportRegex.exec(code)) !== null) {
        dependencies.push({
          type: 'import',
          name: pythonMatch[1] || pythonMatch[2].split(',')[0].trim(),
          line: code.substring(0, pythonMatch.index).split('\n').length
        });
      }
      break;

    case 'html':
      // Buscar scripts y links en HTML
      const scriptRegex = /<script[^>]*src=['"]([^'"]+)['"]/g;
      const linkRegex = /<link[^>]*href=['"]([^'"]+)['"]/g;
      
      let scriptMatch;
      while ((scriptMatch = scriptRegex.exec(code)) !== null) {
        dependencies.push({
          type: 'script',
          name: scriptMatch[1],
          line: code.substring(0, scriptMatch.index).split('\n').length
        });
      }

      let linkMatch;
      while ((linkMatch = linkRegex.exec(code)) !== null) {
        dependencies.push({
          type: 'stylesheet',
          name: linkMatch[1],
          line: code.substring(0, linkMatch.index).split('\n').length
        });
      }
      break;
  }

  return dependencies;
};

/**
 * Valida la sintaxis de un bloque de código
 * @param {Object} block - Bloque de código
 * @returns {Object} Resultado de validación
 */
export const validateCodeBlock = (block) => {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };

  const { code, language } = block;

  try {
    switch (language) {
      case 'javascript':
      case 'js':
        // Validación básica de sintaxis JS
        new Function(code);
        break;

      case 'json':
        // Validar JSON
        JSON.parse(code);
        break;

      case 'html':
        // Validaciones básicas de HTML
        if (!code.includes('<') || !code.includes('>')) {
          result.warnings.push('El código HTML no contiene etiquetas válidas');
        }
        break;

      case 'css':
        // Validaciones básicas de CSS
        if (!code.includes('{') || !code.includes('}')) {
          result.warnings.push('El código CSS no contiene reglas válidas');
        }
        break;
    }
  } catch (error) {
    result.isValid = false;
    result.errors.push({
      message: error.message,
      line: null // Podríamos implementar detección de línea
    });
  }

  return result;
};

/**
 * Combina múltiples bloques en un proyecto
 * @param {Array} codeBlocks - Array de bloques de código
 * @returns {Object} Proyecto combinado
 */
export const combineBlocksToProject = (codeBlocks) => {
  const project = {
    name: `Generated Project ${new Date().toISOString().split('T')[0]}`,
    files: [],
    dependencies: new Set(),
    stats: getCodeBlockStats(codeBlocks)
  };

  codeBlocks.forEach((block, index) => {
    const file = blockToFile(block, `file-${index + 1}${getSuggestedFileExtension(block)}`);
    project.files.push(file);

    // Agregar dependencias
    const deps = extractDependencies(block);
    deps.forEach(dep => project.dependencies.add(dep.name));
  });

  project.dependencies = Array.from(project.dependencies);
  
  return project;
};