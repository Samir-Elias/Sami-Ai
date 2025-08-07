const logger = require('../config/logger');

// =================================
// CLIENTE DE GROQ
// =================================

class GroqClient {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseUrl = 'https://api.groq.com/openai/v1';
    this.availableModels = [
      'mixtral-8x7b-32768',
      'llama2-70b-4096',
      'llama3-8b-8192',
      'llama3-70b-8192',
      'gemma-7b-it',
      'gemma2-9b-it'
    ];
    this.maxRetries = 3;
    this.retryDelay = 1000;
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
      name: 'Groq',
      provider: 'groq',
      website: 'https://groq.com/',
      description: 'Ultra-fast AI inference with LPU technology'
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
      'fast-inference',
      'streaming',
      'function-calling',
      'json-mode'
    ];
  }

  /**
   * Obtener información de rate limit
   * @returns {string} Información de límite
   */
  getRateLimit() {
    return '30 requests/minute (free tier)';
  }

  /**
   * Verificar si soporta streaming
   * @returns {boolean} True si soporta streaming
   */
  supportsStreaming() {
    return true;
  }

  /**
   * Generar respuesta de IA
   * @param {Object} options - Opciones de generación
   * @returns {Promise<Object>} Respuesta de IA
   */
  async generateResponse(options) {
    const {
      model = 'mixtral-8x7b-32768',
      messages = [],
      settings = {}
    } = options;

    if (!this.isAvailable()) {
      throw new Error('Groq API key is not configured');
    }

    if (!this.availableModels.includes(model)) {
      throw new Error(`Model '${model}' is not available. Available models: ${this.availableModels.join(', ')}`);
    }

    const requestBody = this.prepareRequestBody(messages, settings, model);
    
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest('/chat/completions', requestBody);
        return this.parseResponse(response);
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries && this.isRetryableError(error)) {
          logger.warn(`Groq API attempt ${attempt} failed, retrying...`, {
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

    logger.error('Groq API request failed after all retries:', {
      error: lastError.message,
      model,
      attempts: this.maxRetries
    });

    throw lastError;
  }

  /**
   * Generar respuesta streaming
   * @param {Object} options - Opciones de generación
   * @param {Function} onChunk - Callback para cada chunk
   * @returns {Promise<Object>} Respuesta completa
   */
  async generateStreamingResponse(options, onChunk) {
    const {
      model = 'mixtral-8x7b-32768',
      messages = [],
      settings = {}
    } = options;

    if (!this.isAvailable()) {
      throw new Error('Groq API key is not configured');
    }

    if (!this.availableModels.includes(model)) {
      throw new Error(`Model '${model}' is not available`);
    }

    const requestBody = this.prepareRequestBody(messages, settings, model, true);
    
    try {
      const response = await this.makeRequest('/chat/completions', requestBody, true);
      return await this.parseStreamingResponse(response, onChunk);
    } catch (error) {
      logger.error('Groq streaming request failed:', error);
      throw error;
    }
  }

  /**
   * Preparar cuerpo de la solicitud
   * @param {Array} messages - Mensajes de la conversación
   * @param {Object} settings - Configuraciones
   * @param {string} model - Modelo a usar
   * @param {boolean} streaming - Si es streaming
   * @returns {Object} Cuerpo de la solicitud
   */
  prepareRequestBody(messages, settings, model, streaming = false) {
    // Convertir mensajes al formato OpenAI compatible
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : msg.role,
      content: msg.content
    }));

    const requestBody = {
      model,
      messages: formattedMessages,
      max_tokens: settings.maxTokens || 2048,
      temperature: settings.temperature || 0.7,
      top_p: settings.topP || 0.9,
      stream: streaming,
      ...(settings.stopSequences && { stop: settings.stopSequences }),
      ...(settings.responseFormat && { response_format: settings.responseFormat })
    };

    return requestBody;
  }

  /**
   * Realizar solicitud HTTP
   * @param {string} endpoint - Endpoint de la API
   * @param {Object} requestBody - Cuerpo de la solicitud
   * @param {boolean} streaming - Si es streaming
   * @returns {Promise<Response>} Respuesta HTTP
   */
  async makeRequest(endpoint, requestBody, streaming = false) {
    const fetch = require('node-fetch');
    
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'DevAI-Agent/1.0.0'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      timeout: 60000
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      error.status = response.status;
      error.code = errorData.error?.code;
      error.type = errorData.error?.type;
      throw error;
    }

    return response;
  }

  /**
   * Parsear respuesta normal
   * @param {Response} response - Respuesta HTTP
   * @returns {Promise<Object>} Respuesta parseada
   */
  async parseResponse(response) {
    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No choices in Groq response');
    }

    const choice = data.choices[0];
    const content = choice.message?.content || '';
    
    return {
      content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      finishReason: choice.finish_reason || 'stop',
      model: data.model
    };
  }

  /**
   * Parsear respuesta streaming
   * @param {Response} response - Respuesta HTTP
   * @param {Function} onChunk - Callback para chunks
   * @returns {Promise<Object>} Respuesta completa
   */
  async parseStreamingResponse(response, onChunk) {
    let fullContent = '';
    let totalUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };
    let finishReason = 'stop';

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() === '' || !line.startsWith('data: ')) continue;
          
          const jsonStr = line.substring(6);
          if (jsonStr.trim() === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr);
            
            if (data.choices && data.choices.length > 0) {
              const choice = data.choices[0];
              
              if (choice.delta?.content) {
                const content = choice.delta.content;
                fullContent += content;
                onChunk(content);
              }

              if (choice.finish_reason) {
                finishReason = choice.finish_reason;
              }

              // Actualizar uso de tokens si está disponible
              if (data.usage) {
                totalUsage = {
                  promptTokens: data.usage.prompt_tokens || 0,
                  completionTokens: data.usage.completion_tokens || 0,
                  totalTokens: data.usage.total_tokens || 0
                };
              }
            }
          } catch (parseError) {
            logger.warn('Failed to parse Groq streaming chunk:', parseError.message);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Si no obtuvimos uso de tokens del stream, estimarlo
    if (totalUsage.totalTokens === 0) {
      totalUsage.completionTokens = Math.ceil(fullContent.length / 4);
      totalUsage.totalTokens = totalUsage.promptTokens + totalUsage.completionTokens;
    }

    return {
      content: fullContent,
      usage: totalUsage,
      finishReason
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

    // Errores específicos de Groq que son reintentables
    if (error.type === 'server_error' || error.type === 'rate_limit_exceeded') {
      return true;
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
        model: 'mixtral-8x7b-32768',
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
      logger.error('Groq health check failed:', error);
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

module.exports = GroqClient;