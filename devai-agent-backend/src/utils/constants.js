// src/utils/constants.js
// ============================================
// 🔧 CONSTANTES GLOBALES DEL SISTEMA - CommonJS
// ============================================

// =================================
// 🤖 CONFIGURACIÓN DE APIS DE IA
// =================================

const API_KEYS = {
  gemini: process.env.REACT_APP_GEMINI_API_KEY || '',
  groq: process.env.REACT_APP_GROQ_API_KEY || '',
  huggingface: process.env.REACT_APP_HUGGINGFACE_API_KEY || '',
  ollama: '' // No requiere API key para localhost
};

const DEFAULT_PROVIDER = process.env.REACT_APP_DEFAULT_AI_PROVIDER || 'gemini';
const DEFAULT_MODEL = process.env.REACT_APP_DEFAULT_MODEL || 'gemini-1.5-flash-latest';

// =================================
// 🌐 CONFIGURACIÓN DE BACKEND
// =================================

const BACKEND_CONFIG = {
  BASE_URL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001',
  API_VERSION: process.env.REACT_APP_API_VERSION || 'v1',
  TIMEOUT: parseInt(process.env.REACT_APP_API_TIMEOUT) || 30000,
  RETRY_ATTEMPTS: parseInt(process.env.REACT_APP_RETRY_ATTEMPTS) || 2,
  RETRY_DELAY: parseInt(process.env.REACT_APP_RETRY_DELAY) || 1000
};

// =================================
// 📱 CONFIGURACIÓN DE DISPOSITIVOS
// =================================

const DEVICE_CONFIGS = {
  mobile: {
    maxFiles: 5,
    maxFileSize: 2 * 1024 * 1024, // 2MB
    maxTotalSize: 10 * 1024 * 1024, // 10MB
    maxTokens: 2000,
    timeout: 15000,
    supportedProviders: ['gemini', 'groq'],
    features: {
      fileUpload: true,
      livePreview: false,
      multipleChats: true,
      advancedAnalysis: false
    }
  },
  desktop: {
    maxFiles: 50,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxTotalSize: 100 * 1024 * 1024, // 100MB
    maxTokens: 4000,
    timeout: 30000,
    supportedProviders: ['gemini', 'groq', 'huggingface', 'ollama'],
    features: {
      fileUpload: true,
      livePreview: true,
      multipleChats: true,
      advancedAnalysis: true
    }
  }
};

// =================================
// 📁 CONFIGURACIÓN DE ARCHIVOS
// =================================

const FILE_CONFIGS = {
  supportedExtensions: [
    // Código
    '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.astro',
    '.py', '.java', '.cpp', '.c', '.cs', '.rb', '.go', '.rs', '.swift', '.kt', '.dart',
    '.php', '.scala', '.clj', '.hs', '.elm', '.f90', '.r', '.m', '.pl',
    
    // Web
    '.html', '.htm', '.css', '.scss', '.sass', '.less', '.xml', '.svg',
    
    // Datos
    '.json', '.yaml', '.yml', '.toml', '.ini', '.env', '.config',
    
    // Documentación
    '.md', '.mdx', '.txt', '.rst', '.tex',
    
    // Build/Config
    '.dockerfile', '.gitignore', '.npmrc', '.eslintrc', '.prettierrc',
    'package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.js'
  ],
  
  maxSizePerFile: {
    mobile: 2 * 1024 * 1024, // 2MB
    desktop: 5 * 1024 * 1024  // 5MB
  },
  
  maxTotalSize: {
    mobile: 10 * 1024 * 1024,  // 10MB
    desktop: 100 * 1024 * 1024 // 100MB
  },
  
  maxFilesPerUpload: {
    mobile: 5,
    desktop: 50
  },
  
  processingTimeout: {
    mobile: 10000,  // 10 segundos
    desktop: 30000  // 30 segundos
  }
};

// =================================
// 🎨 CONFIGURACIÓN DE UI
// =================================

const UI_CONFIGS = {
  theme: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc'
  },
  
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280,
    wide: 1536
  },
  
  animations: {
    fast: 150,
    normal: 300,
    slow: 500
  },
  
  limits: {
    conversationTitle: 50,
    messagePreview: 100,
    maxConversations: 100,
    maxMessagesPerConversation: 200
  }
};

// =================================
// 🚀 CONFIGURACIÓN DE PERFORMANCE
// =================================

const PERFORMANCE_CONFIGS = {
  debounceDelay: 300,
  throttleDelay: 100,
  cacheTimeout: 5 * 60 * 1000, // 5 minutos
  retryDelays: [1000, 2000, 4000], // Backoff exponencial
  maxConcurrentRequests: 3,
  
  lazy: {
    imageLoading: true,
    componentLoading: true,
    routeLoading: true
  },
  
  optimization: {
    virtualScrolling: true,
    memoization: true,
    bundleSplitting: true,
    compression: true
  }
};

// =================================
// 🔒 CONFIGURACIÓN DE SEGURIDAD
// =================================

const SECURITY_CONFIGS = {
  maxRequestSize: 50 * 1024 * 1024, // 50MB
  allowedDomains: [
    'localhost',
    '127.0.0.1',
    process.env.REACT_APP_ALLOWED_DOMAIN
  ].filter(Boolean),
  
  sanitization: {
    enableHtmlSanitization: true,
    allowedTags: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li'],
    stripScripts: true
  },
  
  rateLimit: {
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 1000,
    blockDuration: 15 * 60 * 1000 // 15 minutos
  }
};

// =================================
// 📊 CONFIGURACIÓN DE MÉTRICAS
// =================================

const METRICS_CONFIGS = {
  enabled: process.env.NODE_ENV === 'production',
  
  tracking: {
    apiCalls: true,
    userInteractions: true,
    performance: true,
    errors: true
  },
  
  retention: {
    errorLogs: 7 * 24 * 60 * 60 * 1000,    // 7 días
    performanceLogs: 24 * 60 * 60 * 1000,  // 1 día
    userLogs: 30 * 24 * 60 * 60 * 1000     // 30 días
  }
};

// =================================
// 🌍 CONFIGURACIÓN DE LOCALIZACIÓN
// =================================

const LOCALE_CONFIGS = {
  defaultLocale: 'es-AR',
  supportedLocales: ['es-AR', 'es-ES', 'en-US', 'pt-BR'],
  
  dateFormat: {
    'es-AR': 'dd/MM/yyyy',
    'es-ES': 'dd/MM/yyyy', 
    'en-US': 'MM/dd/yyyy',
    'pt-BR': 'dd/MM/yyyy'
  },
  
  timeFormat: {
    'es-AR': 'HH:mm',
    'es-ES': 'HH:mm',
    'en-US': 'hh:mm a',
    'pt-BR': 'HH:mm'
  }
};

// =================================
// 🔧 CONFIGURACIÓN DE DESARROLLO
// =================================

const DEV_CONFIGS = {
  enableDebugLogs: process.env.NODE_ENV === 'development',
  enableDevTools: process.env.NODE_ENV === 'development',
  mockApis: process.env.REACT_APP_MOCK_APIS === 'true',
  
  features: {
    hotReload: process.env.NODE_ENV === 'development',
    sourceMap: process.env.NODE_ENV === 'development',
    profiling: process.env.REACT_APP_ENABLE_PROFILING === 'true'
  },
  
  debugging: {
    showAPIResponses: process.env.REACT_APP_DEBUG_API === 'true',
    showStateChanges: process.env.REACT_APP_DEBUG_STATE === 'true',
    showRenderTimes: process.env.REACT_APP_DEBUG_RENDER === 'true'
  }
};

// =================================
// 📦 CONFIGURACIÓN DE STORAGE
// =================================

const STORAGE_CONFIGS = {
  prefix: 'devai_',
  
  keys: {
    conversations: 'conversations',
    settings: 'settings',
    apiKeys: 'api_keys',
    userPreferences: 'user_prefs',
    cache: 'cache'
  },
  
  limits: {
    maxConversations: 100,
    maxCacheSize: 10 * 1024 * 1024, // 10MB
    maxSettingsSize: 1024 * 1024     // 1MB
  },
  
  encryption: {
    enabled: true,
    algorithm: 'AES-256-GCM',
    saltLength: 32
  }
};

// =================================
// 📡 URLS Y ENDPOINTS
// =================================

const API_ENDPOINTS = {
  // Backend endpoints
  health: '/health',
  chat: '/api/ai/chat',
  upload: '/api/files/upload',
  analyze: '/api/files/analyze',
  conversations: '/api/conversations',
  settings: '/api/settings',
  
  // Servicios externos
  gemini: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  huggingface: (model) => `https://api-inference.huggingface.co/models/${model}`,
  ollama: {
    chat: 'http://localhost:11434/api/chat',
    models: 'http://localhost:11434/api/tags',
    generate: 'http://localhost:11434/api/generate'
  }
};

// =================================
// 🎯 CONFIGURACIÓN DE FEATURES
// =================================

const FEATURE_FLAGS = {
  // Core features
  chatEnabled: true,
  fileUploadEnabled: true,
  conversationsEnabled: true,
  settingsEnabled: true,
  
  // Advanced features
  livePreviewEnabled: !process.env.REACT_APP_IS_MOBILE,
  multiProviderEnabled: true,
  backendIntegrationEnabled: true,
  offlineModeEnabled: false,
  
  // Experimental features
  voiceInputEnabled: false,
  imageAnalysisEnabled: false,
  collaborationEnabled: false,
  pluginSystemEnabled: false,
  
  // Beta features
  advancedAnalysisEnabled: process.env.REACT_APP_ENABLE_ADVANCED_ANALYSIS === 'true',
  codeExecutionEnabled: process.env.REACT_APP_ENABLE_CODE_EXECUTION === 'true',
  aiAssistantEnabled: process.env.REACT_APP_ENABLE_AI_ASSISTANT === 'true'
};

// =================================
// 🎲 CONSTANTES DE FALLBACK
// =================================

const FALLBACK_RESPONSES = {
  connection_error: "❌ **Error de conexión**\n\nNo se pudo conectar con el servicio de IA. Verifica tu conexión a internet e intenta nuevamente.",
  
  api_key_missing: "🔑 **API Key requerida**\n\nNecesitas configurar una API Key válida en la configuración para usar este proveedor.",
  
  rate_limit: "⏱️ **Límite de uso alcanzado**\n\nHas alcanzado el límite de consultas. Espera unos minutos antes de intentar nuevamente.",
  
  invalid_request: "⚠️ **Solicitud inválida**\n\nHay un problema con tu solicitud. Verifica el formato e intenta nuevamente.",
  
  service_unavailable: "🚧 **Servicio no disponible**\n\nEl servicio de IA está temporalmente no disponible. Intenta con otro proveedor.",
  
  generic_error: "💥 **Error inesperado**\n\nOcurrió un error inesperado. Intenta nuevamente o contacta soporte si el problema persiste."
};

// =================================
// 📝 PLANTILLAS DE MENSAJES
// =================================

const MESSAGE_TEMPLATES = {
  welcome: {
    title: "¡Bienvenido a DevAI Agent! 🚀",
    subtitle: "Tu asistente inteligente para desarrollo de software",
    features: [
      "Análisis de código inteligente",
      "Generación de ejemplos funcionales", 
      "Debug y optimización",
      "Soporte múltiples lenguajes",
      "Preview en tiempo real"
    ]
  },
  
  setup: {
    title: "Configuración inicial ⚙️",
    description: "Para comenzar, necesitas configurar al menos un proveedor de IA.",
    steps: [
      "Selecciona tu proveedor preferido",
      "Ingresa tu API Key",
      "Verifica la conexión",
      "¡Comienza a chatear!"
    ]
  },
  
  project_loaded: {
    title: "Proyecto cargado exitosamente ✅",
    template: "📁 **{projectName}**\n📊 {fileCount} archivos procesados\n💾 {totalSize} total\n\n🧠 **Contexto disponible para consultas**\n{fileList}\n\n💡 *Ahora puedes preguntarme sobre tu código!*"
  },
  
  error_generic: {
    title: "Error inesperado ❌",
    template: "Ha ocurrido un error inesperado: {error}\n\n💡 *Intenta nuevamente o contacta soporte si persiste.*"
  }
};

// =================================
// 🎯 CONFIGURACIÓN POR DEFECTO
// =================================

const DEFAULT_SETTINGS = {
  provider: DEFAULT_PROVIDER,
  model: DEFAULT_MODEL,
  theme: 'dark',
  language: 'es',
  autoSave: true,
  notifications: true,
  compactMode: false,
  showTimestamps: true,
  enableSounds: false,
  maxTokens: 4000,
  temperature: 0.7
};

// =================================
// 🔍 EXPRESIONES REGULARES
// =================================

const REGEX_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  apiKey: /^[a-zA-Z0-9_-]{20,}$/,
  hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  semver: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
};

// =================================
// 🌐 CONFIGURACIÓN DE URLS
// =================================

const EXTERNAL_URLS = {
  documentation: 'https://docs.devai-agent.com',
  github: 'https://github.com/devai-agent/frontend',
  issues: 'https://github.com/devai-agent/frontend/issues',
  changelog: 'https://github.com/devai-agent/frontend/releases',
  support: 'https://support.devai-agent.com',
  
  // APIs externas
  geminiDocs: 'https://ai.google.dev/docs',
  groqDocs: 'https://console.groq.com/docs',
  huggingfaceDocs: 'https://huggingface.co/docs/api-inference',
  ollamaDocs: 'https://github.com/ollama/ollama'
};

// =================================
// 🎨 CONFIGURACIÓN DE TEMAS
// =================================

const THEME_CONFIG = {
  dark: {
    name: 'Oscuro',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textSecondary: '#94a3b8',
      border: '#334155',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      accent: '#06b6d4'
    }
  },
  light: {
    name: 'Claro',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      accent: '#06b6d4'
    }
  }
};

// =================================
// EXPORTACIONES
// =================================

module.exports = {
  // Configuración principal
  API_KEYS,
  DEFAULT_PROVIDER,
  DEFAULT_MODEL,
  BACKEND_CONFIG,
  
  // Configuración por dispositivo
  DEVICE_CONFIGS,
  
  // Archivos
  FILE_CONFIGS,
  
  // UI
  UI_CONFIGS,
  THEME_CONFIG,
  
  // Performance
  PERFORMANCE_CONFIGS,
  
  // Seguridad
  SECURITY_CONFIGS,
  
  // Métricas
  METRICS_CONFIGS,
  
  // Localización
  LOCALE_CONFIGS,
  
  // Desarrollo
  DEV_CONFIGS,
  
  // Storage
  STORAGE_CONFIGS,
  
  // APIs
  API_ENDPOINTS,
  EXTERNAL_URLS,
  
  // Features
  FEATURE_FLAGS,
  
  // Fallbacks
  FALLBACK_RESPONSES,
  
  // Templates
  MESSAGE_TEMPLATES,
  
  // Configuración por defecto
  DEFAULT_SETTINGS,
  
  // Patrones
  REGEX_PATTERNS
};