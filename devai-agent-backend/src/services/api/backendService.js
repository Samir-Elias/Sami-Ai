// devai-agent-backend/src/services/api/backendService.js - Servicio del backend
const logger = require('../../config/logger');

/**
 * 🔧 Cliente HTTP base para comunicación interna del backend
 */
class InternalAPIClient {
  constructor() {
    this.timeout = 30000; // 30 segundos
    this.retryCount = 2;
    this.retryDelay = 1000;
  }

  /**
   * Request HTTP interno con reintentos
   */
  async request(url, options = {}) {
    const config = {
      timeout: this.timeout,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DevAI-Backend-Client/1.0',
        ...options.headers
      }
    };

    let lastError;
    
    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        logger.info(`🌐 Internal API Request [${attempt + 1}/${this.retryCount + 1}]: ${config.method || 'GET'} ${url}`);
        
        const response = await fetch(url, config);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(
            errorData.error || 
            errorData.message || 
            `HTTP ${response.status}: ${response.statusText}`
          );
          error.status = response.status;
          error.response = errorData;
          throw error;
        }
        
        const data = await response.json();
        logger.info(`✅ Internal API Success: ${url}`);
        
        return data;
        
      } catch (error) {
        lastError = error;
        logger.warn(`❌ Internal API Error [${attempt + 1}/${this.retryCount + 1}]: ${url}`, error.message);
        
        // No reintentar en ciertos errores
        if (
          error.name === 'AbortError' ||
          error.status === 400 ||
          error.status === 401 ||
          error.status === 403 ||
          error.status === 404 ||
          attempt === this.retryCount
        ) {
          break;
        }
        
        // Esperar antes del siguiente intento
        await new Promise(resolve => 
          setTimeout(resolve, this.retryDelay * Math.pow(2, attempt))
        );
      }
    }
    
    throw lastError;
  }

  async get(url, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    return this.request(fullUrl, { method: 'GET' });
  }

  async post(url, data = {}) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// =================================
// 🤖 SERVICIOS DE IA EXTERNA
// =================================

/**
 * 🤖 Llamar a Gemini API
 */
const callGeminiAPI = async (messages, apiKey, model = 'gemini-1.5-flash-latest') => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        generationConfig: { 
          temperature: 0.1, 
          topK: 32, 
          topP: 1, 
          maxOutputTokens: 4096 
        },
        systemInstruction: {
          parts: [{
            text: "Eres un asistente experto en desarrollo de software. Cuando generes código, incluye ejemplos completos y funcionales. Para HTML, CSS y JavaScript, crea código que se pueda ejecutar directamente. Para React, usa componentes funcionales con hooks. Siempre explica el código generado."
          }]
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Formato de respuesta inválido de Gemini API');
    }

    return {
      success: true,
      content: data.candidates[0].content.parts[0].text,
      usage: data.usageMetadata || { total_tokens: 'N/A' },
      model: model,
      provider: 'gemini'
    };
  } catch (error) {
    logger.error('Error llamando Gemini API:', error);
    return {
      success: false,
      error: error.message,
      provider: 'gemini'
    };
  }
};

/**
 * ⚡ Llamar a Groq API
 */
const callGroqAPI = async (messages, apiKey, model = 'llama3-8b-8192') => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente experto en desarrollo de software. Analiza código, encuentra bugs, sugiere optimizaciones y explica conceptos técnicos de manera clara.'
          },
          ...messages
        ],
        model: model,
        temperature: 0.1,
        max_tokens: 4096,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Formato de respuesta inválido de Groq API');
    }

    return {
      success: true,
      content: data.choices[0].message.content,
      usage: data.usage || { total_tokens: 'N/A' },
      model: data.model || model,
      provider: 'groq'
    };
  } catch (error) {
    logger.error('Error llamando Groq API:', error);
    return {
      success: false,
      error: error.message,
      provider: 'groq'
    };
  }
};

/**
 * 🤗 Llamar a HuggingFace API
 */
const callHuggingFaceAPI = async (messages, apiKey, model = 'microsoft/DialoGPT-medium') => {
  try {
    const lastMessage = messages[messages.length - 1];
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: lastMessage.content,
        parameters: {
          max_length: 1000,
          temperature: 0.7,
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
      const errorData = await response.json();
      throw new Error(`HuggingFace API Error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    let content = '';
    if (Array.isArray(data)) {
      content = data[0]?.generated_text || data[0]?.text || 'Error generando respuesta';
    } else {
      content = data.generated_text || data.text || 'Error generando respuesta';
    }

    // Limpiar la respuesta si incluye el input original
    if (content.startsWith(lastMessage.content)) {
      content = content.substring(lastMessage.content.length).trim();
    }

    return {
      success: true,
      content: content || 'Error generando respuesta',
      usage: { total_tokens: 'N/A' },
      model: model,
      provider: 'huggingface'
    };
  } catch (error) {
    logger.error('Error llamando HuggingFace API:', error);
    return {
      success: false,
      error: error.message,
      provider: 'huggingface'
    };
  }
};

/**
 * 🏠 Llamar a Ollama API
 */
const callOllamaAPI = async (messages, model = 'llama3.2:3b') => {
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          top_k: 40
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.message || !data.message.content) {
      throw new Error('Formato de respuesta inválido de Ollama API');
    }

    return {
      success: true,
      content: data.message.content,
      usage: { 
        total_tokens: data.eval_count || 'N/A',
        prompt_tokens: data.prompt_eval_count || 'N/A'
      },
      model: model,
      provider: 'ollama'
    };
  } catch (error) {
    logger.error('Error llamando Ollama API:', error);
    return {
      success: false,
      error: error.message,
      provider: 'ollama'
    };
  }
};

// =================================
// 🎯 SERVICIO PRINCIPAL DE IA
// =================================

/**
 * 🤖 Servicio principal para llamadas de IA
 */
const processAIRequest = async (messages, provider = 'gemini', model, apiKey, options = {}) => {
  try {
    logger.info(`🤖 Procesando solicitud de IA: ${provider} - ${model}`);
    
    // Limpiar mensajes del sistema si existen
    const cleanMessages = messages.filter(msg => msg.role !== 'system');
    
    let result;
    
    switch (provider) {
      case 'gemini':
        result = await callGeminiAPI(cleanMessages, apiKey, model || 'gemini-1.5-flash-latest');
        break;
      
      case 'groq':
        result = await callGroqAPI(cleanMessages, apiKey, model || 'llama3-8b-8192');
        break;
      
      case 'huggingface':
        result = await callHuggingFaceAPI(cleanMessages, apiKey, model || 'microsoft/DialoGPT-medium');
        break;
      
      case 'ollama':
        result = await callOllamaAPI(cleanMessages, model || 'llama3.2:3b');
        break;
      
      default:
        throw new Error(`Proveedor no soportado: ${provider}`);
    }

    if (result.success) {
      logger.info(`✅ Respuesta exitosa de ${provider}`);
    } else {
      logger.warn(`❌ Error en ${provider}: ${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    logger.error(`Error procesando solicitud de IA (${provider}):`, error);
    return {
      success: false,
      error: error.message,
      provider: provider
    };
  }
};

/**
 * 📊 Verificar estado de proveedores de IA
 */
const checkProvidersStatus = async () => {
  const providers = ['gemini', 'groq', 'huggingface', 'ollama'];
  const status = {};
  
  for (const provider of providers) {
    try {
      const testMessages = [{ role: 'user', content: 'test' }];
      const startTime = Date.now();
      
      let result;
      switch (provider) {
        case 'gemini':
          // Test con API key de ejemplo (fallará pero sabremos si está accesible)
          result = await callGeminiAPI(testMessages, 'test_key');
          break;
        case 'groq':
          result = await callGroqAPI(testMessages, 'test_key');
          break;
        case 'huggingface':
          result = await callHuggingFaceAPI(testMessages, 'test_key');
          break;
        case 'ollama':
          result = await callOllamaAPI(testMessages);
          break;
      }
      
      const latency = Date.now() - startTime;
      
      status[provider] = {
        available: true, // Si llega aquí es que al menos la API es accesible
        status: 'ready',
        latency: latency,
        error: result.error || null
      };
      
    } catch (error) {
      status[provider] = {
        available: false,
        status: 'error',
        error: error.message,
        latency: null
      };
    }
  }
  
  return status;
};

// =================================
// EXPORTACIONES
// =================================

module.exports = {
  // Cliente interno
  InternalAPIClient,
  
  // Servicios de IA individuales
  callGeminiAPI,
  callGroqAPI,
  callHuggingFaceAPI,
  callOllamaAPI,
  
  // Servicio principal
  processAIRequest,
  checkProvidersStatus
};