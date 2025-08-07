const logger = require('../config/logger');

// =================================
// CLIENTE DE HUGGINGFACE
// =================================

class HuggingFaceClient {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.baseUrl = 'https://api-inference.huggingface.co';
    this.availableModels = [
      'microsoft/DialoGPT-large',
      'microsoft/DialoGPT-medium',
      'facebook/blenderbot-400M-distill',
      'google/flan-t5-large',
      'google/flan-t5-xl',
      'bigscience/bloom-560m',
      'EleutherAI/gpt-j-6b'
    ];
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 segundos (HuggingFace puede ser más lento)
  }

  /**
   * Verificar si el cliente está disponible
   * @returns {boolean} True si está configurado
   */
  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Obtener información del proveedor
   * @returns {Object} Información del proveedor
   */
  getProviderInfo() {
    return {
      name: 'HuggingFace',
      provider: 'huggingface',
      website: 'https://huggingface.co/',
      description: 'The AI community building the future with open source models'
    };
  }

  /**
   * Obtener modelos disponibles
   * @returns {Array<string>} Lista de modelos
   */
  getAvailableModels() {
    return [...this.availableModels];
  }

  /**
   * Obtener características soportadas
   * @returns {Array<string>} Lista de características
   */
  getSupportedFeatures() {
    return [
      'text-generation',
      'conversation',
      'open-models',
      'community-models',
      'fine-tuning'
    ];
  }

  /**
   * Obtener información de rate limit
   * @returns {string} Información de límite
   */
  getRateLimit() {
    return '100 requests/hour (free tier)';
  }

  /**
   * Verificar si soporta streaming
   * @returns {boolean} False - HuggingFace Inference API no soporta streaming
   */
  supportsStreaming() {
    return false;
  }

  /**
   * Generar respuesta de IA
   * @param {Object} options - Opciones de generación
   * @returns {Promise<Object>} Respuesta de IA
   */
  async generateResponse(options) {
    const {
      model = 'microsoft/DialoGPT-large',
      messages = [],
      settings = {}
    } = options;

    if (!this.isAvailable()) {
      throw new Error('HuggingFace API key is not configured');
    }

    if (!this.availableModels.includes(model)) {
      throw new Error(`Model '${model}' is not available. Available models: ${this.availableModels.join(', ')}`);
    }

    // Preparar input según el tipo de modelo
    const input = this.prepareInput(model, messages, settings);
    const requestBody = this.prepareRequestBody(input, settings);
    
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Verificar si el modelo está cargado
        await this.waitForModelLoad(model);
        
        const response = await this.makeRequest(model, requestBody);
        return this.parseResponse(response, model);
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries && this.isRetryableError(error)) {
          logger.warn(`HuggingFace API attempt ${attempt} failed, retrying...`, {
            error: error.message,
            model,
            attempt
          });
          
          await this.delay(this.retryDelay * attempt);
          continue;
        }
        
        break;
      }
    }

    logger.error('HuggingFace API request failed after all retries:', {
      error: lastError.message,
      model,
      attempts: this.maxRetries
    });

    throw lastError;
  }

  /**
   * Generar respuesta streaming (no soportado)
   * @param {Object} options - Opciones de generación
   * @param {Function} onChunk - Callback para chunks
   * @returns {Promise<Object>} Respuesta simulada
   */
  async generateStreamingResponse(options, onChunk) {
    // HuggingFace Inference API no soporta streaming, simular
    logger.warn('HuggingFace does not support streaming, falling back to regular generation');
    
    const response = await this.generateResponse(options);
    
    // Simular streaming dividiendo la respuesta
    const words = response.content.split(' ');
    for (let i = 0; i < words.length; i++) {
      const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
      onChunk(chunk);
      await this.delay(100); // Simular delay entre chunks
    }
    
    return {
      ...response,
      streaming: false // Indicar que no es streaming real
    };
  }

  /**
   * Preparar input según el tipo de modelo
   * @param {string} model - Modelo a usar
   * @param {Array} messages - Mensajes de la conversación
   * @param {Object} settings - Configuraciones
   * @returns {string} Input preparado
   */
  prepareInput(model, messages, settings) {
    if (model.includes('DialoGPT')) {
      // Para modelos conversacionales, usar el último mensaje del usuario
      const userMessages = messages.filter(msg => msg.role === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1];
      return lastUserMessage ? lastUserMessage.content : '';
    } else if (model.includes('blenderbot')) {
      // Para Blenderbot, también usar conversación
      const conversation = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => msg.content)
        .join('\n');
      return conversation;
    } else if (model.includes('flan-t5') || model.includes('bloom')) {
      // Para modelos de generación general
      const systemMessage = messages.find(msg => msg.role === 'system');
      const userMessages = messages.filter(msg => msg.role === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1];
      
      let prompt = '';
      if (systemMessage) {
        prompt += systemMessage.content + '\n\n';
      }
      if (lastUserMessage) {
        prompt += lastUserMessage.content;
      }
      
      return prompt;
    } else {
      // Fallback genérico
      return messages
        .filter(msg => msg.role !== 'system')
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n') + '\nassistant:';
    }
  }

  /**
   * Preparar cuerpo de la solicitud
   * @param {string} input - Input preparado
   * @param {Object} settings - Configuraciones
   * @returns {Object} Cuerpo de la solicitud
   */
  prepareRequestBody(input, settings) {
    const requestBody = {
      inputs: input,
      parameters: {
        max_length: settings.maxTokens || 200,
        temperature: settings.temperature || 0.7,
        top_p: settings.topP || 0.9,
        do_sample: true,
        ...(settings.stopSequences && { 
          stop_sequence: settings.stopSequences[0] // HuggingFace solo acepta una secuencia
        })
      },
      options: {
        wait_for_model: true,
        use_cache: settings.useCache !== false
      }
    };

    return requestBody;
  }

  /**
   * Verificar y esperar a que el modelo se cargue
   * @param {string} model - Modelo a verificar
   * @returns {Promise<void>}
   */
  async waitForModelLoad(model, maxWaitTime = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await this.makeRequest(model, {
          inputs: 'test',
          parameters: { max_length: 10 },
          options: { wait_for_model: false }
        });
        
        const data = await response.json();
        
        // Si no hay error de modelo cargando, está listo
        if (!data.error || !data.error.includes('loading')) {
          return;
        }
        
        // Esperar antes de verificar de nuevo
        await this.delay(2000);
      } catch (error) {
        // Ignorar errores durante la verificación
        await this.delay(2000);
      }
    }
    
    logger.warn(`Model ${model} may still be loading after ${maxWaitTime}ms`);
  }

  /**
   * Realizar solicitud HTTP
   * @param {string} model - Modelo a usar
   * @param {Object} requestBody - Cuerpo de la solicitud
   * @returns {Promise<Response>} Respuesta HTTP
   */
  async makeRequest(model, requestBody) {
    const fetch = require('node-fetch');
    
    const url = `${this.baseUrl}/models/${model}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DevAI-Agent/1.0.0'
      },
      body: JSON.stringify(requestBody),
      timeout: 120000 // 2 minutos para HuggingFace
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(`HuggingFace API error: ${response.status} - ${errorData.error || response.statusText}`);
      error.status = response.status;
      error.details = errorData;
      throw error;
    }

    return response;
  }

  /**
   * Parsear respuesta
   * @param {Response} response - Respuesta HTTP
   * @param {string} model - Modelo usado
   * @returns {Promise<Object>} Respuesta parseada
   */
  async parseResponse(response, model) {
    const data = await response.json();
    
    // HuggingFace puede devolver diferentes formatos según el modelo
    let content = '';
    
    if (Array.isArray(data)) {
      // Formato típico de generación de texto
      const result = data[0];
      if (result.generated_text) {
        content = result.generated_text;
      } else if (result.response) {
        content = result.response;
      } else {
        content = JSON.stringify(result);
      }
    } else if (data.generated_text) {
      content = data.generated_text;
    } else if (data.response) {
      content = data.response;
    } else if (typeof data === 'string') {
      content = data;
    } else {
      // Fallback para formatos desconocidos
      content = JSON.stringify(data);
    }

    // Limpiar contenido generado
    content = this.cleanGeneratedContent(content, model);
    
    return {
      content,
      usage: this.estimateUsage(content),
      model,
      provider: 'huggingface'
    };
  }

  /**
   * Limpiar contenido generado
   * @param {string} content - Contenido a limpiar
   * @param {string} model - Modelo usado
   * @returns {string} Contenido limpio
   */
  cleanGeneratedContent(content, model) {
    if (!content || typeof content !== 'string') return '';
    
    // Remover prefijos comunes
    content = content.replace(/^(assistant:|bot:|ai:)/i, '').trim();
    
    // Para DialoGPT, puede incluir el input original
    if (model.includes('DialoGPT')) {
      // Intentar extraer solo la respuesta nueva
      const parts = content.split('\n');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.trim()) {
        content = lastPart.trim();
      }
    }
    
    // Remover tokens especiales comunes
    content = content.replace(/<\|.*?\|>/g, '').trim();
    content = content.replace(/\[.*?\]/g, '').trim();
    
    return content;
  }

  /**
   * Estimar uso de tokens
   * @param {string} content - Contenido generado
   * @returns {Object} Información de uso estimada
   */
  estimateUsage(content) {
    const completionTokens = Math.ceil((content || '').length / 4);
    
    return {
      promptTokens: 0, // HuggingFace no proporciona esta información
      completionTokens,
      totalTokens: completionTokens
    };
  }

  /**
   * Verificar si un error es reintentable
   * @param {Error} error - Error a verificar
   * @returns {boolean} True si es reintentable
   */
  isRetryableError(error) {
    // Errores de red
    if (error.code === 'ENOTFOUND' || 
        error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT') {
      return true;
    }

    // Errores HTTP temporales
    if (error.status >= 500 || error.status === 429) {
      return true;
    }

    // Errores específicos de HuggingFace
    if (error.details && error.details.error) {
      const errorMsg = error.details.error.toLowerCase();
      if (errorMsg.includes('loading') || 
          errorMsg.includes('overloaded') || 
          errorMsg.includes('timeout')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Realizar health check
   * @returns {Promise<boolean>} True si está saludable
   */
  async healthCheck() {
    try {
      if (!this.isAvailable()) {
        return false;
      }

      // Hacer una solicitud simple para verificar conectividad
      const testResponse = await this.generateResponse({
        model: 'microsoft/DialoGPT-large',
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        settings: {
          maxTokens: 10,
          temperature: 0
        }
      });

      return !!testResponse.content;
    } catch (error) {
      logger.error('HuggingFace health check failed:', error);
      return false;
    }
  }

  /**
   * Delay helper
   * @param {number} ms - Milisegundos a esperar
   * @returns {Promise} Promise que resuelve después del delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = HuggingFaceClient;