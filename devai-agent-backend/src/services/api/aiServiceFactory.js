// src/services/api/aiServiceFactory.js
// ============================================
// 🤖 FACTORY DE SERVICIOS DE IA - CommonJS
// ============================================

const { API_KEYS, DEFAULT_MODEL } = require('../../utils/constants');

// =================================
// 🔧 CONFIGURACIONES POR PROVEEDOR
// =================================

const PROVIDER_CONFIGS = {
  gemini: {
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    models: ['gemini-1.5-flash-latest', 'gemini-1.5-pro'],
    maxTokens: 4096,
    temperature: 0.7
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768'],
    maxTokens: 8192,
    temperature: 0.1
  },
  huggingface: {
    name: 'HuggingFace',
    baseUrl: 'https://api-inference.huggingface.co',
    models: ['microsoft/DialoGPT-medium', 'microsoft/DialoGPT-large'],
    maxTokens: 1000,
    temperature: 0.7
  },
  ollama: {
    name: 'Ollama',
    baseUrl: 'http://localhost:11434',
    models: ['llama3.2:3b', 'llama3.2:1b', 'codellama:7b'],
    maxTokens: 4096,
    temperature: 0.1
  }
};

// =================================
// 🤖 SERVICIOS DE IA INDIVIDUALES
// =================================

/**
 * 🤖 Servicio Gemini
 */
const callGeminiAPI = async (messages, apiKey, model = 'gemini-1.5-flash-latest', options = {}) => {
  if (!apiKey) {
    throw new Error('API Key de Gemini requerida');
  }

  try {
    const response = await fetch(
      `${PROVIDER_CONFIGS.gemini.baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          })),
          generationConfig: {
            temperature: options.temperature || PROVIDER_CONFIGS.gemini.temperature,
            topK: 32,
            topP: 1,
            maxOutputTokens: options.maxTokens || PROVIDER_CONFIGS.gemini.maxTokens
          },
          systemInstruction: {
            parts: [{
              text: "Eres un asistente experto en desarrollo de software. Analiza código, encuentra bugs, sugiere optimizaciones y crea ejemplos funcionales."
            }]
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Formato de respuesta inválido de Gemini');
    }

    return {
      content: data.candidates[0].content.parts[0].text,
      model: model,
      usage: data.usageMetadata || { total_tokens: 'N/A' },
      provider: 'gemini',
      success: true
    };

  } catch (error) {
    console.error('Error en Gemini API:', error.message);
    throw new Error(`Gemini: ${error.message}`);
  }
};

/**
 * ⚡ Servicio Groq
 */
const callGroqAPI = async (messages, apiKey, model = 'llama3-8b-8192', options = {}) => {
  if (!apiKey) {
    throw new Error('API Key de Groq requerida');
  }

  try {
    const response = await fetch(`${PROVIDER_CONFIGS.groq.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente experto en desarrollo de software. Proporciona respuestas técnicas precisas y ejemplos de código funcionales.'
          },
          ...messages
        ],
        model: model,
        temperature: options.temperature || PROVIDER_CONFIGS.groq.temperature,
        max_tokens: options.maxTokens || PROVIDER_CONFIGS.groq.maxTokens,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Formato de respuesta inválido de Groq');
    }

    return {
      content: data.choices[0].message.content,
      model: data.model || model,
      usage: data.usage || { total_tokens: 'N/A' },
      provider: 'groq',
      success: true
    };

  } catch (error) {
    console.error('Error en Groq API:', error.message);
    throw new Error(`Groq: ${error.message}`);
  }
};

/**
 * 🤗 Servicio HuggingFace
 */
const callHuggingFaceAPI = async (messages, apiKey, model = 'microsoft/DialoGPT-medium', options = {}) => {
  if (!apiKey) {
    throw new Error('API Key de HuggingFace requerida');
  }

  try {
    const lastMessage = messages[messages.length - 1];
    
    const response = await fetch(`${PROVIDER_CONFIGS.huggingface.baseUrl}/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: lastMessage.content,
        parameters: {
          max_length: options.maxTokens || PROVIDER_CONFIGS.huggingface.maxTokens,
          temperature: options.temperature || PROVIDER_CONFIGS.huggingface.temperature,
          do_sample: true,
          pad_token_id: 50256
        },
        options: {
          wait_for_model: true,
          use_cache: false
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    let content = '';
    if (Array.isArray(data)) {
      content = data[0]?.generated_text || data[0]?.text || 'Error generando respuesta';
    } else {
      content = data.generated_text || data.text || 'Error generando respuesta';
    }

    // Limpiar respuesta si incluye el input original
    if (content.startsWith(lastMessage.content)) {
      content = content.substring(lastMessage.content.length).trim();
    }

    return {
      content: content || 'Error generando respuesta con HuggingFace',
      model: model,
      usage: { total_tokens: 'N/A' },
      provider: 'huggingface',
      success: true
    };

  } catch (error) {
    console.error('Error en HuggingFace API:', error.message);
    throw new Error(`HuggingFace: ${error.message}`);
  }
};

/**
 * 🏠 Servicio Ollama
 */
const callOllamaAPI = async (messages, model = 'llama3.2:3b', options = {}) => {
  try {
    const response = await fetch(`${PROVIDER_CONFIGS.ollama.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
        options: {
          temperature: options.temperature || PROVIDER_CONFIGS.ollama.temperature,
          top_p: 0.9,
          top_k: 40,
          num_ctx: options.maxTokens || PROVIDER_CONFIGS.ollama.maxTokens
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama no disponible: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.message || !data.message.content) {
      throw new Error('Formato de respuesta inválido de Ollama');
    }

    return {
      content: data.message.content,
      model: model,
      usage: {
        total_tokens: data.eval_count || 'N/A',
        prompt_tokens: data.prompt_eval_count || 'N/A'
      },
      provider: 'ollama',
      success: true
    };

  } catch (error) {
    console.error('Error en Ollama API:', error.message);
    throw new Error(`Ollama: ${error.message}`);
  }
};

// =================================
// 🎯 SERVICIO PRINCIPAL
// =================================

/**
 * 🤖 Llamada principal a servicios de IA
 */
const callFreeAIAPI = async (messages, apiKey, provider = 'gemini', model, isMobile = false) => {
  if (!messages || messages.length === 0) {
    throw new Error('Mensajes requeridos');
  }

  // Configuración optimizada por dispositivo
  const options = {
    maxTokens: isMobile ? 2000 : 4000,
    temperature: 0.1,
    timeout: isMobile ? 15000 : 30000
  };

  try {
    let result;
    
    switch (provider) {
      case 'gemini':
        result = await callGeminiAPI(messages, apiKey, model || 'gemini-1.5-flash-latest', options);
        break;
        
      case 'groq':
        result = await callGroqAPI(messages, apiKey, model || 'llama3-8b-8192', options);
        break;
        
      case 'huggingface':
        result = await callHuggingFaceAPI(messages, apiKey, model || 'microsoft/DialoGPT-medium', options);
        break;
        
      case 'ollama':
        result = await callOllamaAPI(messages, model || 'llama3.2:3b', options);
        break;
        
      default:
        throw new Error(`Proveedor no soportado: ${provider}`);
    }

    return result;

  } catch (error) {
    console.error(`Error en ${provider}:`, error.message);
    throw error;
  }
};

// =================================
// 💬 RESPUESTAS DE FALLBACK
// =================================

/**
 * 🎲 Generar respuesta simulada inteligente
 */
const generateFallbackResponse = (query, provider = 'gemini') => {
  const responses = {
    code: [
      "```javascript\n// Ejemplo de código funcional\nconst ejemplo = () => {\n  console.log('Código generado automáticamente');\n  return 'success';\n};\n\nejemplo();\n```\n\n💡 Este es un ejemplo básico. Proporciona más contexto para código específico.",
      
      "```html\n<!DOCTYPE html>\n<html>\n<head>\n  <title>Ejemplo</title>\n</head>\n<body>\n  <h1>Página de ejemplo</h1>\n  <script>\n    console.log('Página cargada');\n  </script>\n</body>\n</html>\n```\n\n🌐 Estructura HTML básica funcional.",
      
      "```python\n# Ejemplo Python\ndef ejemplo():\n    print('Función de ejemplo')\n    return True\n\nif __name__ == '__main__':\n    resultado = ejemplo()\n    print(f'Resultado: {resultado}')\n```\n\n🐍 Script Python básico ejecutable."
    ],
    
    help: [
      "🚀 **Guía de desarrollo:**\n\n1. **Planificación**: Define objetivos claros\n2. **Estructura**: Organiza tu código en módulos\n3. **Testing**: Prueba cada funcionalidad\n4. **Documentación**: Comenta tu código\n5. **Optimización**: Refactoriza cuando sea necesario\n\n💡 *¿Necesitas ayuda específica con algún paso?*",
      
      "🔧 **Debugging efectivo:**\n\n• Usa `console.log()` para rastrear valores\n• Verifica errores en la consola del navegador\n• Prueba en pequeños incrementos\n• Usa breakpoints en DevTools\n• Revisa la sintaxis paso a paso\n\n🐛 *El debugging es parte del proceso de desarrollo.*"
    ],
    
    general: [
      "🤖 **Respuesta simulada inteligente**\n\nBasándome en tu consulta, puedo sugerir:\n\n• Definir el problema específicamente\n• Buscar ejemplos similares\n• Dividir en pasos pequeños\n• Probar cada parte individualmente\n• Documentar el proceso\n\n💭 *Esta es una respuesta generada por el sistema de fallback.*",
      
      "✨ **Análisis de tu consulta:**\n\nParece que necesitas ayuda con desarrollo. Te recomiendo:\n\n1. **Clarificar objetivos**: ¿Qué quieres lograr?\n2. **Revisar recursos**: Documentación oficial\n3. **Probar ejemplos**: Código funcional\n4. **Iterar**: Mejora gradualmente\n\n🎯 *Proporciona más detalles para ayuda específica.*"
    ]
  };

  // Detectar tipo de consulta
  let category = 'general';
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('código') || lowerQuery.includes('code') || lowerQuery.includes('programar') || 
      lowerQuery.includes('función') || lowerQuery.includes('script') || lowerQuery.includes('html') || 
      lowerQuery.includes('css') || lowerQuery.includes('javascript') || lowerQuery.includes('python')) {
    category = 'code';
  } else if (lowerQuery.includes('ayuda') || lowerQuery.includes('help') || lowerQuery.includes('cómo') || 
             lowerQuery.includes('how') || lowerQuery.includes('guía') || lowerQuery.includes('tutorial')) {
    category = 'help';
  }

  const categoryResponses = responses[category];
  const randomResponse = categoryResponses[Math.floor(Math.random() * categoryResponses.length)];

  return {
    content: randomResponse,
    model: 'fallback-intelligent',
    usage: { total_tokens: 'Simulado' },
    provider: provider + '-fallback',
    success: false,
    fallback: true
  };
};

// =================================
// 🔍 UTILIDADES
// =================================

/**
 * 📊 Verificar disponibilidad de proveedores
 */
const checkProviderAvailability = async (provider) => {
  const startTime = Date.now();
  
  try {
    const testMessages = [{ role: 'user', content: 'test' }];
    
    switch (provider) {
      case 'gemini':
        // Test básico de conectividad
        await fetch(`${PROVIDER_CONFIGS.gemini.baseUrl}/v1beta/models`, { method: 'HEAD' });
        break;
        
      case 'groq':
        await fetch(`${PROVIDER_CONFIGS.groq.baseUrl}/models`, { method: 'HEAD' });
        break;
        
      case 'huggingface':
        await fetch(`${PROVIDER_CONFIGS.huggingface.baseUrl}`, { method: 'HEAD' });
        break;
        
      case 'ollama':
        await fetch(`${PROVIDER_CONFIGS.ollama.baseUrl}/api/tags`);
        break;
        
      default:
        throw new Error('Proveedor desconocido');
    }
    
    return {
      available: true,
      latency: Date.now() - startTime,
      status: 'ready'
    };
    
  } catch (error) {
    return {
      available: false,
      latency: Date.now() - startTime,
      status: 'error',
      error: error.message
    };
  }
};

/**
 * 📋 Obtener configuración de proveedor
 */
const getProviderConfig = (provider) => {
  return PROVIDER_CONFIGS[provider] || null;
};

/**
 * 📝 Obtener modelos disponibles
 */
const getAvailableModels = (provider) => {
  const config = getProviderConfig(provider);
  return config ? config.models : [];
};

// =================================
// EXPORTACIONES
// =================================

module.exports = {
  // Servicios principales
  callFreeAIAPI,
  generateFallbackResponse,
  
  // Servicios individuales
  callGeminiAPI,
  callGroqAPI,
  callHuggingFaceAPI,
  callOllamaAPI,
  
  // Utilidades
  checkProviderAvailability,
  getProviderConfig,
  getAvailableModels,
  PROVIDER_CONFIGS
};