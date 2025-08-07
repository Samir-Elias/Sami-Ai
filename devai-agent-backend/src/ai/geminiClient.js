const logger = require('../config/logger');

// =================================
// CLIENTE DE GOOGLE GEMINI
// =================================

class GeminiClient {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.availableModels = [
      'gemini-pro',
      'gemini-pro-vision',
      'gemini-1.5-pro',
      'gemini-1.5-flash'
    ];
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 segundo
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
      name: 'Google Gemini',
      provider: 'gemini',
      website: 'https://ai.google.dev/',
      description: 'Google\'s most capable multimodal AI model'
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
      'multimodal',
      'vision',
      'streaming',
      'system-instructions',
      'function-calling'
    ];
  }

  /**
   * Obtener información de rate limit
   * @returns {string} Información de límite
   */
  getRateLimit() {
    return '60 requests/minute (free tier)';
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
      model = 'gemini-pro',
      messages = [],
      settings = {}
    } = options;

    if (!this.isAvailable()) {
      throw new Error('Gemini API key is not configured');
    }

    if (!this.availableModels.includes(model)) {
      throw new Error(`Model '${model}' is not available. Available models: ${this.availableModels.join(', ')}`);
    }

    const requestBody = this.prepareRequestBody(messages, settings);
    
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(model, requestBody, false);
        return this.parseResponse(response);
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries && this.isRetryableError(error)) {
          logger.warn(`Gemini API attempt ${attempt} failed, retrying...`, {
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

    logger.error('Gemini API request failed after all retries:', {
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
      model = 'gemini-pro',
      messages = [],
      settings = {}
    } = options;

    if (!this.isAvailable()) {
      throw new Error('Gemini API key is not configured');
    }

    if (!this.availableModels.includes(model)) {
      throw new Error(`Model '${model}' is not available`);
    }

    const requestBody = this.prepareRequestBody(messages, settings);
    
    try {
      const response = await this.makeRequest(model, requestBody, true);
      return await this.parseStreamingResponse(response, onChunk);
    } catch (error) {
      logger.error('Gemini streaming request failed:', error);
      throw error;
    }
  }

  /**
   * Preparar cuerpo de la solicitud
   * @param {Array} messages - Mensajes de la conversación
   * @param {Object} settings - Configuraciones
   * @returns {Object} Cuerpo de la solicitud
   */
  prepareRequestBody(messages, settings) {
    // Convertir mensajes al formato de Gemini
    const contents = this.convertMessagesToGeminiFormat(messages);
    
    // Configuraciones de generación
    const generationConfig = {
      temperature: settings.temperature || 0.7,
      topK: settings.topK || 40,
      topP: settings.topP || 0.9,
      maxOutputTokens: settings.maxTokens || 2048,
      ...(settings.stopSequences && { stopSequences: settings.stopSequences })
    };

    const requestBody = {
      contents,
      generationConfig
    };

    // Agregar instrucciones del sistema si existen
    const systemMessage = messages.find(msg => msg.role === 'system');
    if (systemMessage) {
      requestBody.systemInstruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    return requestBody;
  }

  /**
   * Convertir mensajes al formato de Gemini
   * @param {Array} messages - Mensajes originales
   * @returns {Array} Mensajes en formato Gemini
   */
  convertMessagesToGeminiFormat(messages) {
    const contents = [];
    
    for (const message of messages) {
      // Saltar mensajes del sistema (se manejan por separado)
      if (message.role === 'system') continue;
      
      // Convertir roles
      let role;
      if (message.role === 'user') {
        role = 'user';
      } else if (message.role === 'assistant') {
        role = 'model';
      } else {
        continue; // Saltar roles desconocidos
      }

      contents.push({
        role,
        parts: [{ text: message.content }]
      });
    }

    return contents;
  }

  /**
   * Realizar solicitud HTTP
   * @param {string} model - Modelo a usar
   * @param {Object} requestBody - Cuerpo de la solicitud
   * @param {boolean} streaming - Si es streaming
   * @returns {Promise<Response>} Respuesta HTTP
   */
  async makeRequest(model, requestBody, streaming = false) {
    const fetch = require('node-fetch');
    
    const endpoint = streaming ? 'streamGenerateContent' : 'generateContent';
    const url = `${this.baseUrl}/models/${model}:${endpoint}?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DevAI-Agent/1.0.0'
      },
      body: JSON.stringify(requestBody),
      timeout: 60000 // 60 segundos
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      error.status = response.status;
      error.code = errorData.error?.code;
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
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No candidates in Gemini response');
    }

    const candidate = data.candidates[0];
    
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      logger.warn('Gemini generation finished with reason:', candidate.finishReason);
    }

    const content = candidate.content?.parts?.[0]?.text || '';
    
    return {
      content,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      },
      finishReason: candidate.finishReason || 'STOP'
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
          
          const jsonStr = line.substring(6); // Remover "data: "
          if (jsonStr.trim() === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr);
            
            if (data.candidates && data.candidates.length > 0) {
              const candidate = data.candidates[0];
              const content = candidate.content?.parts?.[0]?.text || '';
              
              if (content) {
                fullContent += content;
                onChunk(content);
              }

              // Actualizar uso de tokens si está disponible
              if (data.usageMetadata) {
                totalUsage = {
                  promptTokens: data.usageMetadata.promptTokenCount || 0,
                  completionTokens: data.usageMetadata.candidatesTokenCount || 0,
                  totalTokens: data.usageMetadata.totalTokenCount || 0
                };
              }
            }
          } catch (parseError) {
            logger.warn('Failed to parse Gemini streaming chunk:', parseError.message);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: fullContent,
      usage: totalUsage
    };
  }

  /**
   * Verificar si un error es reintentable
   * @param {Error} error - Error a verificar
   * @returns {boolean} True si es reintentable
   */
  isRetryableError(error) {
    // Errores de red o temporales del servidor
    if (error.code === 'ENOTFOUND' || 
        error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT') {
      return true;
    }

    // Errores HTTP temporales
    if (error.status >= 500 || error.status === 429) {
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
        model: 'gemini-pro',
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
      logger.error('Gemini health check failed:', error);
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

module.exports = GeminiClient;