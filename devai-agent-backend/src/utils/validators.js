// =================================
// VALIDADORES DE EMAIL
// =================================

/**
 * Validar formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} - True si es válido
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  // Regex más estricto para emails
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  // Validaciones adicionales
  const trimmedEmail = email.trim();
  
  // Longitud máxima (RFC 5321)
  if (trimmedEmail.length > 254) return false;
  
  // Verificar formato básico
  if (!emailRegex.test(trimmedEmail)) return false;
  
  // Verificar que no tenga puntos consecutivos
  if (trimmedEmail.includes('..')) return false;
  
  // Verificar que no empiece o termine con punto
  const [localPart, domain] = trimmedEmail.split('@');
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  
  return true;
};

/**
 * Validar dominio de email (lista de dominios permitidos/bloqueados)
 * @param {string} email - Email a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} - Resultado de validación
 */
const validateEmailDomain = (email, options = {}) => {
  const { allowedDomains = [], blockedDomains = [] } = options;
  
  if (!validateEmail(email)) {
    return { isValid: false, reason: 'Invalid email format' };
  }
  
  const domain = email.split('@')[1].toLowerCase();
  
  // Verificar dominios bloqueados
  if (blockedDomains.length > 0 && blockedDomains.includes(domain)) {
    return { isValid: false, reason: 'Domain not allowed' };
  }
  
  // Verificar dominios permitidos (si se especifica)
  if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
    return { isValid: false, reason: 'Domain not in allowed list' };
  }
  
  return { isValid: true };
};

// =================================
// VALIDADORES DE CONTRASEÑA
// =================================

/**
 * Validar contraseña con múltiples criterios
 * @param {string} password - Contraseña a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} - Resultado de validación detallado
 */
const validatePassword = (password, options = {}) => {
  const defaultOptions = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbidCommonPasswords: true,
    forbidPersonalInfo: []
  };
  
  const opts = { ...defaultOptions, ...options };
  const issues = [];
  const requirements = [];
  
  // Verificar que la contraseña existe
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      issues: ['Password is required'],
      requirements: ['Password must be provided']
    };
  }
  
  // Longitud mínima
  requirements.push(`At least ${opts.minLength} characters`);
  if (password.length < opts.minLength) {
    issues.push(`Password must be at least ${opts.minLength} characters long`);
  }
  
  // Longitud máxima
  if (password.length > opts.maxLength) {
    issues.push(`Password must be no more than ${opts.maxLength} characters long`);
  }
  
  // Letra mayúscula
  if (opts.requireUppercase) {
    requirements.push('At least one uppercase letter');
    if (!/[A-Z]/.test(password)) {
      issues.push('Password must contain at least one uppercase letter');
    }
  }
  
  // Letra minúscula
  if (opts.requireLowercase) {
    requirements.push('At least one lowercase letter');
    if (!/[a-z]/.test(password)) {
      issues.push('Password must contain at least one lowercase letter');
    }
  }
  
  // Números
  if (opts.requireNumbers) {
    requirements.push('At least one number');
    if (!/\d/.test(password)) {
      issues.push('Password must contain at least one number');
    }
  }
  
  // Caracteres especiales
  if (opts.requireSpecialChars) {
    requirements.push('At least one special character (!@#$%^&*)');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      issues.push('Password must contain at least one special character');
    }
  }
  
  // Contraseñas comunes
  if (opts.forbidCommonPasswords && isCommonPassword(password)) {
    issues.push('Password is too common, please choose a more secure password');
  }
  
  // Información personal
  if (opts.forbidPersonalInfo.length > 0) {
    const lowerPassword = password.toLowerCase();
    for (const info of opts.forbidPersonalInfo) {
      if (info && lowerPassword.includes(info.toLowerCase())) {
        issues.push('Password should not contain personal information');
        break;
      }
    }
  }
  
  // Verificar patrones débiles
  const weakPatterns = [
    /^(.)\1+$/, // Todos los caracteres iguales
    /123456|654321|abcdef|qwerty|asdfgh/, // Secuencias comunes
    /^(.{1,2})\1+$/ // Patrones repetitivos cortos
  ];
  
  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      issues.push('Password contains weak patterns');
      break;
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    requirements,
    strength: calculatePasswordStrength(password)
  };
};

/**
 * Calcular fuerza de la contraseña
 * @param {string} password - Contraseña a evaluar
 * @returns {Object} - Información de fuerza
 */
const calculatePasswordStrength = (password) => {
  let score = 0;
  const length = password.length;
  
  // Puntuación base por longitud
  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  if (length >= 16) score += 1;
  
  // Puntuación por tipos de caracteres
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
  
  // Puntuación por variedad
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= length * 0.5) score += 1;
  
  // Determinar nivel
  let level, description;
  if (score <= 2) {
    level = 'weak';
    description = 'Weak password';
  } else if (score <= 4) {
    level = 'fair';
    description = 'Fair password';
  } else if (score <= 6) {
    level = 'good';
    description = 'Good password';
  } else {
    level = 'strong';
    description = 'Strong password';
  }
  
  return {
    score,
    level,
    description,
    percentage: Math.min(100, (score / 8) * 100)
  };
};

/**
 * Verificar si es una contraseña común
 * @param {string} password - Contraseña a verificar
 * @returns {boolean} - True si es común
 */
const isCommonPassword = (password) => {
  const commonPasswords = [
    'password', 'password123', '123456', '123456789', 'qwerty',
    'abc123', 'password1', 'admin', 'letmein', 'welcome',
    'monkey', '1234567890', 'football', 'iloveyou', 'admin123',
    'welcome123', 'password12', 'qwerty123', 'user', 'test',
    'guest', 'demo', 'root', 'administrator', 'pass123'
  ];
  
  return commonPasswords.includes(password.toLowerCase());
};

// =================================
// VALIDADORES DE USUARIO
// =================================

/**
 * Validar nombre de usuario
 * @param {string} username - Username a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} - Resultado de validación
 */
const validateUsername = (username, options = {}) => {
  const defaultOptions = {
    minLength: 3,
    maxLength: 30,
    allowNumbers: true,
    allowUnderscore: true,
    allowDash: true
  };
  
  const opts = { ...defaultOptions, ...options };
  const issues = [];
  
  if (!username || typeof username !== 'string') {
    return {
      isValid: false,
      issues: ['Username is required']
    };
  }
  
  const trimmedUsername = username.trim();
  
  // Longitud
  if (trimmedUsername.length < opts.minLength) {
    issues.push(`Username must be at least ${opts.minLength} characters`);
  }
  
  if (trimmedUsername.length > opts.maxLength) {
    issues.push(`Username must be no more than ${opts.maxLength} characters`);
  }
  
  // Caracteres permitidos
  let allowedPattern = 'a-zA-Z';
  if (opts.allowNumbers) allowedPattern += '0-9';
  if (opts.allowUnderscore) allowedPattern += '_';
  if (opts.allowDash) allowedPattern += '-';
  
  const regex = new RegExp(`^[${allowedPattern}]+$`);
  if (!regex.test(trimmedUsername)) {
    issues.push('Username contains invalid characters');
  }
  
  // No puede empezar con número
  if (/^\d/.test(trimmedUsername)) {
    issues.push('Username cannot start with a number');
  }
  
  // No puede empezar o terminar con guión o guión bajo
  if (/^[-_]|[-_]$/.test(trimmedUsername)) {
    issues.push('Username cannot start or end with dash or underscore');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

/**
 * Validar nombre (firstName, lastName)
 * @param {string} name - Nombre a validar
 * @param {string} fieldName - Nombre del campo para errores
 * @returns {Object} - Resultado de validación
 */
const validateName = (name, fieldName = 'Name') => {
  const issues = [];
  
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      issues: [`${fieldName} is required`]
    };
  }
  
  const trimmedName = name.trim();
  
  // Longitud
  if (trimmedName.length < 1) {
    issues.push(`${fieldName} cannot be empty`);
  }
  
  if (trimmedName.length > 50) {
    issues.push(`${fieldName} must be no more than 50 characters`);
  }
  
  // Solo letras, espacios y algunos caracteres especiales
  if (!/^[a-zA-ZÀ-ÿĀ-žА-я\s'-]+$/.test(trimmedName)) {
    issues.push(`${fieldName} contains invalid characters`);
  }
  
  // No puede empezar o terminar con espacio, apóstrofe o guión
  if (/^[\s'-]|[\s'-]$/.test(trimmedName)) {
    issues.push(`${fieldName} cannot start or end with space, apostrophe, or dash`);
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

// =================================
// VALIDADORES GENERALES
// =================================

/**
 * Validar que un valor no esté vacío
 * @param {any} value - Valor a validar
 * @param {string} fieldName - Nombre del campo
 * @returns {Object} - Resultado de validación
 */
const validateRequired = (value, fieldName = 'Field') => {
  const isEmpty = value === null || 
                  value === undefined || 
                  (typeof value === 'string' && value.trim() === '') ||
                  (Array.isArray(value) && value.length === 0);
  
  return {
    isValid: !isEmpty,
    issues: isEmpty ? [`${fieldName} is required`] : []
  };
};

/**
 * Validar longitud de string
 * @param {string} value - Valor a validar
 * @param {Object} options - Opciones de validación
 * @returns {Object} - Resultado de validación
 */
const validateLength = (value, options = {}) => {
  const { min = 0, max = Infinity, fieldName = 'Field' } = options;
  const issues = [];
  
  if (typeof value !== 'string') {
    return {
      isValid: false,
      issues: [`${fieldName} must be a string`]
    };
  }
  
  const length = value.length;
  
  if (length < min) {
    issues.push(`${fieldName} must be at least ${min} characters`);
  }
  
  if (length > max) {
    issues.push(`${fieldName} must be no more than ${max} characters`);
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

/**
 * Validar que un valor esté en una lista de opciones
 * @param {any} value - Valor a validar
 * @param {Array} options - Opciones válidas
 * @param {string} fieldName - Nombre del campo
 * @returns {Object} - Resultado de validación
 */
const validateEnum = (value, options, fieldName = 'Field') => {
  const isValid = options.includes(value);
  
  return {
    isValid,
    issues: isValid ? [] : [`${fieldName} must be one of: ${options.join(', ')}`]
  };
};

// =================================
// EXPORTAR VALIDADORES
// =================================

module.exports = {
  // Email
  validateEmail,
  validateEmailDomain,
  
  // Contraseña
  validatePassword,
  calculatePasswordStrength,
  isCommonPassword,
  
  // Usuario
  validateUsername,
  validateName,
  
  // Generales
  validateRequired,
  validateLength,
  validateEnum
};