const crypto = require('crypto');
const path = require('path');
const { PAGINATION, FILE_TYPES } = require('./constants');

// =================================
// UTILIDADES DE TEXTO
// =================================

/**
 * Capitalizar la primera letra de una cadena
 * @param {string} str - Cadena a capitalizar
 * @returns {string} - Cadena capitalizada
 */
const capitalize = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convertir a título (cada palabra capitalizada)
 * @param {string} str - Cadena a convertir
 * @returns {string} - Cadena en formato título
 */
const toTitleCase = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

/**
 * Generar slug desde texto
 * @param {string} text - Texto a convertir
 * @returns {string} - Slug generado
 */
const generateSlug = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[áäâàãå]/g, 'a')
    .replace(/[éëêè]/g, 'e')
    .replace(/[íïîì]/g, 'i')
    .replace(/[óöôòõ]/g, 'o')
    .replace(/[úüûù]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^\w\s-]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno
    .replace(/^-|-$/g, ''); // Remover guiones al inicio/final
};

/**
 * Truncar texto a una longitud específica
 * @param {string} text - Texto a truncar
 * @param {number} length - Longitud máxima
 * @param {string} suffix - Sufijo a agregar (default: '...')
 * @returns {string} - Texto truncado
 */
const truncateText = (text, length = 100, suffix = '...') => {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= length) return text;
  
  return text.substring(0, length - suffix.length).trim() + suffix;
};

/**
 * Limpiar y sanitizar texto
 * @param {string} text - Texto a limpiar
 * @returns {string} - Texto limpio
 */
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .trim()
    .replace(/\s+/g, ' ') // Múltiples espacios a uno
    .replace(/[<>]/g, '') // Remover < y >
    .substring(0, 1000); // Limitar longitud
};

// =================================
// UTILIDADES DE VALIDACIÓN
// =================================

/**
 * Verificar si un valor está vacío
 * @param {any} value - Valor a verificar
 * @returns {boolean} - True si está vacío
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Verificar si es un email válido
 * @param {string} email - Email a verificar
 * @returns {boolean} - True si es válido
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Verificar si es un UUID válido
 * @param {string} uuid - UUID a verificar
 * @returns {boolean} - True si es válido
 */
const isValidUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Verificar si es una URL válida
 * @param {string} url - URL a verificar
 * @returns {boolean} - True si es válida
 */
const isValidURL = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// =================================
// UTILIDADES DE OBJETOS
// =================================

/**
 * Remover propiedades undefined/null de un objeto
 * @param {Object} obj - Objeto a limpiar
 * @returns {Object} - Objeto limpio
 */
const cleanObject = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

/**
 * Seleccionar solo ciertas propiedades de un objeto
 * @param {Object} obj - Objeto origen
 * @param {Array} fields - Campos a seleccionar
 * @returns {Object} - Objeto con solo los campos seleccionados
 */
const pick = (obj, fields) => {
  if (!obj || typeof obj !== 'object' || !Array.isArray(fields)) return {};
  
  const result = {};
  for (const field of fields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  return result;
};

/**
 * Omitir ciertas propiedades de un objeto
 * @param {Object} obj - Objeto origen
 * @param {Array} fields - Campos a omitir
 * @returns {Object} - Objeto sin los campos omitidos
 */
const omit = (obj, fields) => {
  if (!obj || typeof obj !== 'object' || !Array.isArray(fields)) return obj;
  
  const result = { ...obj };
  for (const field of fields) {
    delete result[field];
  }
  return result;
};

/**
 * Clonar profundamente un objeto
 * @param {any} obj - Objeto a clonar
 * @returns {any} - Clon del objeto
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
};

// =================================
// UTILIDADES DE ARRAYS
// =================================

/**
 * Remover duplicados de un array
 * @param {Array} arr - Array con posibles duplicados
 * @param {string} key - Clave para objetos (opcional)
 * @returns {Array} - Array sin duplicados
 */
const uniqueArray = (arr, key = null) => {
  if (!Array.isArray(arr)) return [];
  
  if (key) {
    const seen = new Set();
    return arr.filter(item => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }
  
  return [...new Set(arr)];
};

/**
 * Dividir array en chunks
 * @param {Array} arr - Array a dividir
 * @param {number} size - Tamaño de cada chunk
 * @returns {Array} - Array de chunks
 */
const chunkArray = (arr, size) => {
  if (!Array.isArray(arr) || size <= 0) return [];
  
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/**
 * Ordenar array de objetos por una propiedad
 * @param {Array} arr - Array a ordenar
 * @param {string} key - Propiedad por la cual ordenar
 * @param {string} order - 'asc' o 'desc'
 * @returns {Array} - Array ordenado
 */
const sortByProperty = (arr, key, order = 'asc') => {
  if (!Array.isArray(arr)) return [];
  
  return arr.sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

// =================================
// UTILIDADES DE FECHAS
// =================================

/**
 * Formatear fecha
 * @param {Date|string} date - Fecha a formatear
 * @param {string} format - Formato deseado
 * @returns {string} - Fecha formateada
 */
const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * Calcular diferencia entre fechas
 * @param {Date|string} date1 - Primera fecha
 * @param {Date|string} date2 - Segunda fecha
 * @param {string} unit - Unidad ('days', 'hours', 'minutes')
 * @returns {number} - Diferencia en la unidad especificada
 */
const dateDifference = (date1, date2, unit = 'days') => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  
  const diffMs = Math.abs(d2 - d1);
  
  switch (unit) {
    case 'days':
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    case 'hours':
      return Math.floor(diffMs / (1000 * 60 * 60));
    case 'minutes':
      return Math.floor(diffMs / (1000 * 60));
    case 'seconds':
      return Math.floor(diffMs / 1000);
    default:
      return diffMs;
  }
};

/**
 * Verificar si una fecha es hoy
 * @param {Date|string} date - Fecha a verificar
 * @returns {boolean} - True si es hoy
 */
const isToday = (date) => {
  const d = new Date(date);
  const today = new Date();
  
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
};

// =================================
// UTILIDADES DE ARCHIVOS
// =================================

/**
 * Obtener tipo de archivo por extensión
 * @param {string} filename - Nombre del archivo
 * @returns {string} - Tipo de archivo
 */
const getFileType = (filename) => {
  if (!filename || typeof filename !== 'string') return FILE_TYPES.OTHER;
  
  const ext = path.extname(filename).toLowerCase();
  
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const documentExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.md'];
  const codeExts = ['.js', '.ts', '.html', '.css', '.json', '.py', '.java'];
  const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz'];
  
  if (imageExts.includes(ext)) return FILE_TYPES.IMAGE;
  if (documentExts.includes(ext)) return FILE_TYPES.DOCUMENT;
  if (codeExts.includes(ext)) return FILE_TYPES.CODE;
  if (archiveExts.includes(ext)) return FILE_TYPES.ARCHIVE;
  
  return FILE_TYPES.OTHER;
};

/**
 * Formatear tamaño de archivo
 * @param {number} bytes - Tamaño en bytes
 * @param {number} decimals - Decimales a mostrar
 * @returns {string} - Tamaño formateado
 */
const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Generar nombre único para archivo
 * @param {string} originalName - Nombre original
 * @returns {string} - Nombre único
 */
const generateUniqueFilename = (originalName) => {
  if (!originalName) return `file_${Date.now()}`;
  
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  
  const cleanName = name
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30);
  
  return `${timestamp}_${random}_${cleanName}${ext}`;
};

// =================================
// UTILIDADES CRIPTOGRÁFICAS
// =================================

/**
 * Generar hash SHA256
 * @param {string} data - Datos a hashear
 * @returns {string} - Hash generado
 */
const generateHash = (data) => {
  if (!data) return '';
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generar token aleatorio
 * @param {number} length - Longitud del token
 * @returns {string} - Token generado
 */
const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generar ID único
 * @returns {string} - ID único
 */
const generateUniqueId = () => {
  return crypto.randomUUID();
};

// =================================
// UTILIDADES DE PAGINACIÓN
// =================================

/**
 * Calcular offset para paginación
 * @param {number} page - Página actual
 * @param {number} limit - Elementos por página
 * @returns {number} - Offset calculado
 */
const calculateOffset = (page, limit) => {
  const safePage = Math.max(1, parseInt(page) || PAGINATION.DEFAULT_PAGE);
  const safeLimit = Math.min(PAGINATION.MAX_LIMIT, Math.max(1, parseInt(limit) || PAGINATION.DEFAULT_LIMIT));
  
  return (safePage - 1) * safeLimit;
};

/**
 * Crear metadata de paginación
 * @param {number} page - Página actual
 * @param {number} limit - Elementos por página
 * @param {number} total - Total de elementos
 * @returns {Object} - Metadata de paginación
 */
const createPaginationMeta = (page, limit, total) => {
  const safePage = Math.max(1, parseInt(page) || PAGINATION.DEFAULT_PAGE);
  const safeLimit = Math.min(PAGINATION.MAX_LIMIT, Math.max(1, parseInt(limit) || PAGINATION.DEFAULT_LIMIT));
  const totalPages = Math.ceil(total / safeLimit);
  
  return {
    currentPage: safePage,
    itemsPerPage: safeLimit,
    totalItems: total,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
    nextPage: safePage < totalPages ? safePage + 1 : null,
    previousPage: safePage > 1 ? safePage - 1 : null
  };
};

// =================================
// UTILIDADES DE RESPUESTA
// =================================

/**
 * Crear respuesta de éxito estandarizada
 * @param {any} data - Datos de respuesta
 * @param {string} message - Mensaje de éxito
 * @param {Object} meta - Metadata adicional
 * @returns {Object} - Respuesta estandarizada
 */
const createSuccessResponse = (data = null, message = 'Success', meta = {}) => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    ...meta
  };
};

/**
 * Crear respuesta de error estandarizada
 * @param {string} message - Mensaje de error
 * @param {string} code - Código de error
 * @param {any} details - Detalles adicionales
 * @returns {Object} - Respuesta de error
 */
const createErrorResponse = (message = 'Error', code = 'UNKNOWN_ERROR', details = null) => {
  return {
    success: false,
    error: {
      message,
      code,
      details,
      timestamp: new Date().toISOString()
    }
  };
};

// =================================
// UTILIDADES DE TIEMPO
// =================================

/**
 * Pausar ejecución por X milisegundos
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise} - Promise que resuelve después del tiempo
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Medir tiempo de ejecución de una función
 * @param {Function} fn - Función a medir
 * @returns {Object} - Resultado y tiempo de ejecución
 */
const measureExecutionTime = async (fn) => {
  const startTime = Date.now();
  const result = await fn();
  const endTime = Date.now();
  
  return {
    result,
    executionTime: endTime - startTime
  };
};

// =================================
// EXPORTAR FUNCIONES
// =================================

module.exports = {
  // Texto
  capitalize,
  toTitleCase,
  generateSlug,
  truncateText,
  sanitizeText,
  
  // Validación
  isEmpty,
  isValidEmail,
  isValidUUID,
  isValidURL,
  
  // Objetos
  cleanObject,
  pick,
  omit,
  deepClone,
  
  // Arrays
  uniqueArray,
  chunkArray,
  sortByProperty,
  
  // Fechas
  formatDate,
  dateDifference,
  isToday,
  
  // Archivos
  getFileType,
  formatFileSize,
  generateUniqueFilename,
  
  // Criptografía
  generateHash,
  generateRandomToken,
  generateUniqueId,
  
  // Paginación
  calculateOffset,
  createPaginationMeta,
  
  // Respuestas
  createSuccessResponse,
  createErrorResponse,
  
  // Tiempo
  sleep,
  measureExecutionTime
};