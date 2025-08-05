// ============================================
// 🔑 CONFIGURACIÓN DE VARIABLES DE ENTORNO
// ============================================

export const API_KEYS = {
  gemini: process.env.REACT_APP_GEMINI_API_KEY,
  huggingface: process.env.REACT_APP_HUGGINGFACE_API_KEY,
  groq: process.env.REACT_APP_GROQ_API_KEY,
  ollama: null // Ollama no necesita API key
};

export const DEFAULT_PROVIDER = process.env.REACT_APP_DEFAULT_PROVIDER || 'gemini';
export const DEFAULT_MODEL = process.env.REACT_APP_DEFAULT_MODEL || 'gemini-1.5-flash';

// ============================================
// 🤖 MODELOS DE IA DISPONIBLES
// ============================================

export const FREE_AI_MODELS = {
  gemini: {
    'gemini-1.5-flash': '🏆 Gemini 1.5 Flash (Con Live Preview)',
    'gemini-1.5-pro': '💎 Gemini 1.5 Pro',
  },
  groq: {
    'llama3-8b-8192': '🚀 Llama 3 8B (Ultra rápido)',
    'llama3-70b-8192': '💪 Llama 3 70B (Más potente)'
  },
  huggingface: {
    'microsoft/DialoGPT-medium': '💬 DialoGPT Medium',
    'facebook/blenderbot-400M-distill': '🤖 BlenderBot',
  },
  ollama: {
    'llama3.2:3b': '🦙 Llama 3.2 3B',
    'llama3.2:1b': '⚡ Llama 3.2 1B',
    'codellama:7b': '💻 Code Llama 7B'
  }
};

// ============================================
// 📊 LÍMITES Y CONFIGURACIÓN DE APIS
// ============================================

export const API_LIMITS = {
  gemini: {
    freeLimit: '1,500/día',
    rateLimit: '15/min',
    needsApiKey: true,
    setup: 'https://makersuite.google.com/app/apikey',
    icon: '🏆'
  },
  groq: {
    freeLimit: '6,000 tokens/min',
    rateLimit: '30/min',
    needsApiKey: true,
    setup: 'https://console.groq.com/keys',
    icon: '⚡'
  },
  huggingface: {
    freeLimit: '1,000/mes',
    rateLimit: 'Variable',
    needsApiKey: true,
    setup: 'https://huggingface.co/settings/tokens',
    icon: '🤗'
  },
  ollama: {
    freeLimit: 'Ilimitado',
    rateLimit: 'Hardware',
    needsApiKey: false,
    setup: 'https://ollama.ai/download',
    icon: '🏠'
  }
};

// ============================================
// 🔍 UTILIDADES
// ============================================

// Verificar que las API keys estén configuradas
export const checkEnvKeys = () => {
  const missing = [];
  const available = [];
  
  Object.entries(API_KEYS).forEach(([provider, key]) => {
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
    console.warn('💡 Add these to your .env file:');
    missing.forEach(provider => {
      console.warn(`REACT_APP_${provider}_API_KEY=your_key_here`);
    });
  }
  
  return { missing, available };
};

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