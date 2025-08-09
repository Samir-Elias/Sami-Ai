// ============================================
// 🔧 CONSTANTS - CONFIGURACIÓN GLOBAL
// ============================================

/**
 * Obtener API Keys desde localStorage (dinámicamente)
 * Esto evita problemas de inicialización y permite cambios en tiempo real
 */
export const getApiKeys = () => {
  if (typeof window === 'undefined') return {
    gemini: '',
    groq: '',
    huggingface: '',
    ollama: ''
  };
  
  return {
    gemini: localStorage.getItem('api_key_gemini') || '',
    groq: localStorage.getItem('api_key_groq') || '',
    huggingface: localStorage.getItem('api_key_huggingface') || '',
    ollama: '' // No necesita API key
  };
};

/**
 * API Keys estático para compatibilidad (se actualiza automáticamente)
 */
export const API_KEYS = new Proxy({}, {
  get(target, prop) {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`api_key_${prop}`) || '';
    }
    return '';
  },
  set(target, prop, value) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`api_key_${prop}`, value);
    }
    return true;
  }
});

// ============================================
// 🤖 MODELOS DE IA DISPONIBLES
// ============================================

export const FREE_AI_MODELS = {
  gemini: {
    'gemini-1.5-flash-latest': '🏆 Gemini 1.5 Flash (Con Live Preview)',
    'gemini-1.5-pro-latest': '💎 Gemini 1.5 Pro',
    'gemini-1.0-pro': '📋 Gemini 1.0 Pro'
  },
  groq: {
    'llama3-8b-8192': '🚀 Llama 3 8B (Ultra rápido)',
    'llama3-70b-8192': '💪 Llama 3 70B (Más potente)',
    'mixtral-8x7b-32768': '🌟 Mixtral 8x7B',
    'gemma-7b-it': '💡 Gemma 7B'
  },
  huggingface: {
    'microsoft/DialoGPT-medium': '💬 DialoGPT Medium',
    'facebook/blenderbot-400M-distill': '🤖 BlenderBot',
    'microsoft/DialoGPT-large': '🎯 DialoGPT Large'
  },
  ollama: {
    'llama3.2:3b': '🦙 Llama 3.2 3B',
    'llama3.2:1b': '⚡ Llama 3.2 1B',
    'gemma2:2b': '💎 Gemma 2 2B',
    'qwen2:1.5b': '🚀 Qwen 2 1.5B',
    'phi3:mini': '🧠 Phi-3 Mini'
  }
};

// ============================================
// 📊 LÍMITES Y CONFIGURACIÓN DE APIS
// ============================================

export const API_LIMITS = {
  gemini: {
    icon: '🏆',
    name: 'Google Gemini',
    maxTokens: 4096,
    rateLimit: '60 req/min',
    models: [
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
      'gemini-1.0-pro'
    ],
    defaultModel: 'gemini-1.5-flash-latest',
    pricing: 'Gratis hasta límite',
    docs: 'https://ai.google.dev/docs',
    freeLimit: '1,500/día',
    needsApiKey: true,
    setup: 'https://makersuite.google.com/app/apikey'
  },
  groq: {
    icon: '⚡',
    name: 'Groq',
    maxTokens: 8192,
    rateLimit: '100 req/min',
    models: [
      'llama3-8b-8192',
      'llama3-70b-8192',
      'mixtral-8x7b-32768',
      'gemma-7b-it'
    ],
    defaultModel: 'llama3-8b-8192',
    pricing: 'Gratis hasta límite',
    docs: 'https://groq.com/docs',
    freeLimit: '6,000 tokens/min',
    needsApiKey: true,
    setup: 'https://console.groq.com/keys'
  },
  huggingface: {
    icon: '🤗',
    name: 'Hugging Face',
    maxTokens: 1024,
    rateLimit: '30 req/min',
    models: [
      'microsoft/DialoGPT-medium',
      'facebook/blenderbot-400M-distill',
      'microsoft/DialoGPT-large'
    ],
    defaultModel: 'microsoft/DialoGPT-medium',
    pricing: 'Gratis con límites',
    docs: 'https://huggingface.co/docs',
    mobileSupport: false,
    freeLimit: '1,000/mes',
    needsApiKey: true,
    setup: 'https://huggingface.co/settings/tokens'
  },
  ollama: {
    icon: '🏠',
    name: 'Ollama Local',
    maxTokens: 4096,
    rateLimit: 'Ilimitado',
    models: [
      'llama3.2:3b',
      'llama3.2:1b',
      'gemma2:2b',
      'qwen2:1.5b',
      'phi3:mini'
    ],
    defaultModel: 'llama3.2:3b',
    pricing: 'Gratis (local)',
    docs: 'https://ollama.ai/docs',
    mobileSupport: false,
    requiresLocalInstall: true,
    freeLimit: 'Ilimitado',
    needsApiKey: false,
    setup: 'https://ollama.ai/download'
  }
};

/**
 * Configuración de modelos específicos
 */
export const MODELS_CONFIG = {
  // Gemini Models
  'gemini-1.5-flash-latest': {
    provider: 'gemini',
    displayName: 'Gemini 1.5 Flash',
    description: 'Modelo rápido y eficiente',
    contextWindow: 1000000,
    strengths: ['Velocidad', 'Eficiencia', 'Multimodal']
  },
  'gemini-1.5-pro-latest': {
    provider: 'gemini',
    displayName: 'Gemini 1.5 Pro',
    description: 'Modelo más potente',
    contextWindow: 2000000,
    strengths: ['Razonamiento', 'Análisis complejo', 'Creatividad']
  },
  
  // Groq Models
  'llama3-8b-8192': {
    provider: 'groq',
    displayName: 'Llama 3 8B',
    description: 'Equilibrio perfecto velocidad/calidad',
    contextWindow: 8192,
    strengths: ['Velocidad extrema', 'Código', 'Conversación']
  },
  'llama3-70b-8192': {
    provider: 'groq',
    displayName: 'Llama 3 70B',
    description: 'Modelo más potente de Groq',
    contextWindow: 8192,
    strengths: ['Razonamiento avanzado', 'Tareas complejas']
  },
  
  // Ollama Models
  'llama3.2:3b': {
    provider: 'ollama',
    displayName: 'Llama 3.2 3B',
    description: 'Modelo local eficiente',
    contextWindow: 4096,
    strengths: ['Privacidad', 'Sin límites', 'Offline']
  }
};

/**
 * URLs y endpoints
 */
export const API_ENDPOINTS = {
  // Backend API (será configurado por variable de entorno)
  backend: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  
  // APIs directas (fallback)
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  huggingface: 'https://api-inference.huggingface.co/models',
  ollama: 'http://localhost:11434/api'
};

/**
 * Configuración de la aplicación
 */
export const APP_CONFIG = {
  name: 'DevAI Agent',
  version: '2.0.0',
  description: 'Asistente IA para desarrollo',
  
  // Límites generales
  maxFiles: 20,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxTotalSize: 50 * 1024 * 1024, // 50MB
  maxMessages: 100,
  
  // Configuración de UI
  defaultProvider: 'gemini',
  autoPreview: true,
  saveConversations: true,
  maxConversations: 50,
  
  // Timeouts
  apiTimeout: 30000, // 30 segundos
  connectionCheckInterval: 30000, // 30 segundos
  
  // Features
  features: {
    livePreview: true,
    fileUpload: true,
    conversationHistory: true,
    multiProvider: true,
    offlineMode: true
  }
};

/**
 * Mensajes de error comunes
 */
export const ERROR_MESSAGES = {
  NO_API_KEY: (provider) => `Configura tu API Key para ${provider.toUpperCase()} en Configuración`,
  API_KEY_INVALID: (provider) => `API Key inválida para ${provider.toUpperCase()}`,
  PROVIDER_OFFLINE: (provider) => `${provider.toUpperCase()} no está disponible`,
  MOBILE_NOT_SUPPORTED: (provider) => `${provider.toUpperCase()} no está disponible en móvil`,
  FILE_TOO_LARGE: (filename, limit) => `El archivo ${filename} excede el límite de ${limit}MB`,
  NO_MESSAGES: 'No hay mensajes para enviar',
  NETWORK_ERROR: 'Error de conexión de red',
  TIMEOUT_ERROR: 'La solicitud tardó demasiado tiempo',
  RATE_LIMIT: (provider) => `Límite de velocidad alcanzado para ${provider.toUpperCase()}`,
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado'
};

/**
 * Patrones y validaciones
 */
export const VALIDATION_PATTERNS = {
  apiKey: {
    gemini: /^AIza[0-9A-Za-z_-]{35}$/,
    groq: /^gsk_[a-zA-Z0-9]{48,}$/,
    huggingface: /^hf_[a-zA-Z0-9]{34,}$/
  }
};

/**
 * Tipos de archivo soportados para vista previa
 */
export const PREVIEW_LANGUAGES = [
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

// ============================================
// 🎨 ESTILOS Y CONFIGURACIÓN UI
// ============================================

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200
};

export const COLORS = {
  primary: '#3b82f6',
  secondary: '#7c3aed',
  success: '#10b981',
  warning: '#eab308',
  error: '#ef4444',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};

/**
 * Utilidades para trabajar con las constantes
 */
export const constantsUtils = {
  /**
   * Obtener API keys (función requerida por el hook)
   */
  getApiKeys: () => getApiKeys(),

  /**
   * Verificar si un proveedor está disponible
   */
  isProviderAvailable: (provider, isMobile = false) => {
    if (isMobile && (provider === 'huggingface' || provider === 'ollama')) {
      return false;
    }
    
    if (provider === 'ollama') {
      return true; // Se verifica conexión por separado
    }
    
    const apiKey = API_KEYS[provider];
    return !!apiKey;
  },

  /**
   * Obtener proveedores disponibles según dispositivo
   */
  getAvailableProviders: (isMobile = false) => {
    const allProviders = Object.keys(API_LIMITS);
    
    return allProviders.filter(provider => {
      if (isMobile && !API_LIMITS[provider].mobileSupport !== false) {
        return provider === 'gemini' || provider === 'groq';
      }
      return true;
    });
  },

  /**
   * Validar formato de API Key
   */
  validateApiKeyFormat: (provider, apiKey) => {
    const pattern = VALIDATION_PATTERNS.apiKey[provider];
    if (!pattern) return true; // Si no hay patrón, asumimos válido
    return pattern.test(apiKey);
  },

  /**
   * Obtener configuración completa de un proveedor
   */
  getProviderConfig: (provider) => {
    return {
      ...API_LIMITS[provider],
      apiKey: API_KEYS[provider],
      isConfigured: !!API_KEYS[provider],
      endpoint: API_ENDPOINTS[provider]
    };
  },

  /**
   * Obtener el mejor proveedor disponible
   */
  getBestAvailableProvider: (isMobile = false) => {
    const priority = isMobile ? ['gemini', 'groq'] : ['gemini', 'groq', 'huggingface', 'ollama'];
    
    for (const provider of priority) {
      if (constantsUtils.isProviderAvailable(provider, isMobile)) {
        return provider;
      }
    }
    
    return 'gemini'; // Fallback
  }
};

// ============================================
// 🔍 UTILIDADES ADICIONALES
// ============================================

// Verificar que las API keys estén configuradas
export const checkEnvKeys = () => {
  const missing = [];
  const available = [];
  
  const apiKeys = getApiKeys();
  Object.entries(apiKeys).forEach(([provider, key]) => {
    if (provider !== 'ollama') {
      if (!key) {
        missing.push(provider.toUpperCase());
      } else {
        available.push(provider.toUpperCase());
      }
    }
  });
  
  console.log('🔑 API Keys Status:');
  console.log('✅ Available:', available.join(', '));
  if (missing.length > 0) {
    console.warn('❌ Missing:', missing.join(', '));
    console.warn('💡 Configure these in Settings Panel');
  }
  
  return { missing, available };
};

// Variables adicionales para compatibilidad
export const DEFAULT_PROVIDER = 'gemini';
export const DEFAULT_MODEL = 'gemini-1.5-flash-latest';

// Exportación por defecto
export default {
  API_KEYS,
  API_LIMITS,
  MODELS_CONFIG,
  API_ENDPOINTS,
  APP_CONFIG,
  ERROR_MESSAGES,
  VALIDATION_PATTERNS,
  PREVIEW_LANGUAGES,
  FREE_AI_MODELS,
  BREAKPOINTS,
  COLORS,
  constantsUtils,
  getApiKeys,
  checkEnvKeys,
  DEFAULT_PROVIDER,
  DEFAULT_MODEL
};