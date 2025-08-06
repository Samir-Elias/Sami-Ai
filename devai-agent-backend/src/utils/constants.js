// =================================
// CONSTANTES DE LA APLICACIÓN
// =================================

// Información de la aplicación
const APP_INFO = {
  NAME: 'DevAI Agent Backend',
  VERSION: '1.0.0',
  DESCRIPTION: 'Backend API para aplicaciones de IA con múltiples proveedores',
  AUTHOR: 'DevAI Team',
  LICENSE: 'MIT'
};

// =================================
// CÓDIGOS DE ESTADO HTTP
// =================================

const HTTP_STATUS = {
  // Éxito
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Redirección
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  // Errores del cliente
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Errores del servidor
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

// =================================
// ROLES DE USUARIO
// =================================

const USER_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest'
};

// Jerarquía de roles (mayor número = más permisos)
const ROLE_HIERARCHY = {
  [USER_ROLES.GUEST]: 0,
  [USER_ROLES.USER]: 1,
  [USER_ROLES.MODERATOR]: 2,
  [USER_ROLES.ADMIN]: 3
};

// =================================
// PROVEEDORES DE IA
// =================================

const AI_PROVIDERS = {
  GEMINI: 'gemini',
  GROQ: 'groq',
  HUGGINGFACE: 'huggingface',
  OLLAMA: 'ollama',
  OPENAI: 'openai', // Para futuro
  ANTHROPIC: 'anthropic' // Para futuro
};

// Configuración de proveedores
const AI_PROVIDER_CONFIG = {
  [AI_PROVIDERS.GEMINI]: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    models: ['gemini-pro', 'gemini-pro-vision'],
    maxTokens: 32768,
    supportsStreaming: true,
    supportsVision: true
  },
  [AI_PROVIDERS.GROQ]: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com',
    models: ['mixtral-8x7b-32768', 'llama2-70b-4096'],
    maxTokens: 32768,
    supportsStreaming: true,
    supportsVision: false
  },
  [AI_PROVIDERS.HUGGINGFACE]: {
    name: 'Hugging Face',
    baseUrl: 'https://api-inference.huggingface.co',
    models: ['meta-llama/Llama-2-70b-chat-hf'],
    maxTokens: 4096,
    supportsStreaming: false,
    supportsVision: false
  },
  [AI_PROVIDERS.OLLAMA]: {
    name: 'Ollama',
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    models: ['llama2', 'codellama', 'mistral'],
    maxTokens: 4096,
    supportsStreaming: true,
    supportsVision: false
  }
};

// =================================
// TIPOS DE ARCHIVOS
// =================================

const FILE_TYPES = {
  IMAGE: 'image',
  DOCUMENT: 'document',
  CODE: 'code',
  ARCHIVE: 'archive',
  AUDIO: 'audio',
  VIDEO: 'video',
  OTHER: 'other'
};

// Extensiones permitidas por tipo
const ALLOWED_FILE_EXTENSIONS = {
  [FILE_TYPES.IMAGE]: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'],
  [FILE_TYPES.DOCUMENT]: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.csv'],
  [FILE_TYPES.CODE]: [
    '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte',
    '.html', '.css', '.scss', '.sass', '.less',
    '.json', '.xml', '.yaml', '.yml',
    '.py', '.rb', '.php', '.java', '.c', '.cpp', '.cs',
    '.go', '.rs', '.swift', '.kt', '.scala',
    '.sh', '.bash', '.ps1', '.bat',
    '.sql', '.graphql', '.prisma'
  ],
  [FILE_TYPES.ARCHIVE]: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
  [FILE_TYPES.AUDIO]: ['.mp3', '.wav', '.ogg', '.m4a', '.aac'],
  [FILE_TYPES.VIDEO]: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm']
};

// Tamaños máximos por tipo (en bytes)
const MAX_FILE_SIZES = {
  [FILE_TYPES.IMAGE]: 10 * 1024 * 1024, // 10MB
  [FILE_TYPES.DOCUMENT]: 50 * 1024 * 1024, // 50MB
  [FILE_TYPES.CODE]: 5 * 1024 * 1024, // 5MB
  [FILE_TYPES.ARCHIVE]: 100 * 1024 * 1024, // 100MB
  [FILE_TYPES.AUDIO]: 50 * 1024 * 1024, // 50MB
  [FILE_TYPES.VIDEO]: 200 * 1024 * 1024, // 200MB
  [FILE_TYPES.OTHER]: 25 * 1024 * 1024 // 25MB
};

// =================================
// TIPOS DE MENSAJES
// =================================

const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  FUNCTION: 'function',
  ERROR: 'error'
};

// =================================
// ESTADOS DE CONVERSACIÓN
// =================================

const CONVERSATION_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
  PAUSED: 'paused'
};

// =================================
// ESTADOS DE PROYECTO
// =================================

const PROJECT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
  DELETED: 'deleted'
};

// =================================
// NIVELES DE LOG
// =================================

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly'
};

// =================================
// CONFIGURACIONES DE RATE LIMITING
// =================================

const RATE_LIMITS = {
  // Autenticación
  AUTH_REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5 // 5 registros por hora
  },
  AUTH_LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10 // 10 intentos por 15 minutos
  },
  AUTH_REFRESH: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 20 // 20 refreshes por 5 minutos
  },
  
  // API General
  API_GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000 // 1000 requests por 15 minutos
  },
  
  // IA Chat
  AI_CHAT: {
    windowMs: 60 * 1000, // 1 minuto
    max: 30 // 30 mensajes por minuto
  },
  
  // Upload de archivos
  FILE_UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 100 // 100 uploads por hora
  }
};

// =================================
// CONFIGURACIONES JWT
// =================================

const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: process.env.JWT_EXPIRES_IN || '24h',
  REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  ISSUER: 'devai-agent',
  AUDIENCE: 'devai-agent-client',
  ALGORITHM: 'HS256'
};

// =================================
// CONFIGURACIONES DE PAGINACIÓN
// =================================

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
};

// =================================
// CONFIGURACIONES DE CACHE
// =================================

const CACHE_TTL = {
  SHORT: 5 * 60, // 5 minutos
  MEDIUM: 30 * 60, // 30 minutos
  LONG: 2 * 60 * 60, // 2 horas
  VERY_LONG: 24 * 60 * 60 // 24 horas
};

// Llaves de cache
const CACHE_KEYS = {
  USER_PROFILE: (userId) => `user:profile:${userId}`,
  USER_CONVERSATIONS: (userId) => `user:conversations:${userId}`,
  CONVERSATION_MESSAGES: (convId) => `conversation:messages:${convId}`,
  AI_MODELS: (provider) => `ai:models:${provider}`,
  ANALYTICS_DASHBOARD: (userId) => `analytics:dashboard:${userId}`,
  FILE_METADATA: (fileId) => `file:metadata:${fileId}`
};

// =================================
// PATRONES DE VALIDACIÓN
// =================================

const VALIDATION_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  USERNAME: /^[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9]$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
};

// =================================
// CONFIGURACIONES DE SEGURIDAD
// =================================

const SECURITY_CONFIG = {
  // Configuración de bcrypt
  BCRYPT_ROUNDS: 12,
  
  // Longitudes mínimas
  MIN_PASSWORD_LENGTH: 8,
  MIN_USERNAME_LENGTH: 3,
  
  // Intentos máximos
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCK_TIME: 30 * 60 * 1000, // 30 minutos
  
  // Headers de seguridad
  SECURITY_HEADERS: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }
};

// =================================
// CONFIGURACIONES DE EMAIL
// =================================

const EMAIL_TYPES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
  NOTIFICATION: 'notification',
  WEEKLY_SUMMARY: 'weekly_summary'
};

const EMAIL_TEMPLATES = {
  [EMAIL_TYPES.WELCOME]: {
    subject: 'Welcome to DevAI Agent!',
    template: 'welcome'
  },
  [EMAIL_TYPES.PASSWORD_RESET]: {
    subject: 'Reset your password',
    template: 'password-reset'
  },
  [EMAIL_TYPES.EMAIL_VERIFICATION]: {
    subject: 'Verify your email address',
    template: 'email-verification'
  }
};

// =================================
// CONFIGURACIONES DE NOTIFICACIONES
// =================================

const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

// =================================
// MENSAJES DE ERROR COMUNES
// =================================

const ERROR_MESSAGES = {
  // Autenticación
  UNAUTHORIZED: 'Access denied. Please log in.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  TOKEN_EXPIRED: 'Token has expired. Please log in again.',
  INVALID_TOKEN: 'Invalid token provided.',
  
  // Usuarios
  USER_NOT_FOUND: 'User not found.',
  USER_ALREADY_EXISTS: 'User already exists with this email.',
  USER_INACTIVE: 'User account is inactive.',
  
  // Validación
  VALIDATION_ERROR: 'Validation failed. Please check your input.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_FORMAT: 'Invalid format provided.',
  
  // Archivos
  FILE_TOO_LARGE: 'File size exceeds maximum allowed size.',
  FILE_TYPE_NOT_ALLOWED: 'File type not allowed.',
  FILE_NOT_FOUND: 'File not found.',
  
  // General
  INTERNAL_ERROR: 'An internal server error occurred.',
  NOT_FOUND: 'Resource not found.',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
  MAINTENANCE_MODE: 'System is under maintenance. Please try again later.'
};

// =================================
// CONFIGURACIONES DEL SISTEMA
// =================================

const SYSTEM_CONFIG = {
  // Configuraciones de tiempo
  TIMEZONE: process.env.TZ || 'UTC',
  DATE_FORMAT: 'YYYY-MM-DD',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
  
  // Configuraciones de desarrollo
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',
  
  // URLs
  BASE_URL: process.env.BASE_URL || 'http://localhost:3001',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Configuraciones de servidor
  DEFAULT_PORT: 3001,
  DEFAULT_HOST: '0.0.0.0'
};

// =================================
// EXPORTAR CONSTANTES
// =================================

module.exports = {
  APP_INFO,
  HTTP_STATUS,
  USER_ROLES,
  ROLE_HIERARCHY,
  AI_PROVIDERS,
  AI_PROVIDER_CONFIG,
  FILE_TYPES,
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILE_SIZES,
  MESSAGE_TYPES,
  CONVERSATION_STATUS,
  PROJECT_STATUS,
  LOG_LEVELS,
  RATE_LIMITS,
  JWT_CONFIG,
  PAGINATION,
  CACHE_TTL,
  CACHE_KEYS,
  VALIDATION_PATTERNS,
  SECURITY_CONFIG,
  EMAIL_TYPES,
  EMAIL_TEMPLATES,
  NOTIFICATION_TYPES,
  ERROR_MESSAGES,
  SYSTEM_CONFIG
};