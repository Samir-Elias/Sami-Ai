const logger = require('../config/logger');

// =================================
// CLIENTE DE OLLAMA
// =================================

class OllamaClient {
  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.availableModels = []; // Se carga dinámicamente
    this.modelsLoaded = false;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  /**
   * Verificar si el cliente está disponible
   * @returns {boolean} True si está configurado
   */
  isAvailable() {
    return !!this.baseUrl;
  }

  /**
   * Obtener información del proveedor
   * @returns {Object} Información del proveedor
   */
  getProviderInfo() {
    return {
      name: 'Ollama',
      provider: 'ollama',
      website: 'https://ollama.ai/',
      description: 'Run large language models locally with privacy and control'
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
   * Cargar lista de modelos disponibles desde Ollama
   * @returns {Promise<Array<string>>} Lista de modelos cargada
   */
  async loadAvailableModels() {
    try {
      const response = await this.makeRequest('/api/tags', {}, 'GET');
      const data = await response.json();
      
      if (data.models && Array.isArray(data.models)) {
        this.availableModels = data.models.map(model => model.name);
        this.modelsLoaded = true;
        
        logger.info(`📦 Loaded ${this.availableModels.length} Ollama models:`, this.availableModels);
      } else {
        logger.warn('No models found in Ollama response');
        this.availableModels = [];
      }
      
      return this.availableModels;
    } catch (error) {
      logger.error('Failed to load Ollama models:', error);
      this.availableModels = [
        // Modelos comunes como fallback
        'llama2',
        'llama2:7b',
        'llama2:13b',
        'codellama',
        'codellama:7b',
        'mistral',
        'mixtral',
        'phi',
        'neural-chat',
        'starling-lm'
      ];
      return this.availableModels;
    }
  }

  /**
   * Obtener características soportadas
   * @returns {Array<string>} Lista de características
   */
  getSupportedFeatures() {
    return [
      'text-generation',
      'local-inference',
      'privacy-focused',
      'streaming',
      'custom-models',
      'offline-capable'
    ];
  }

  /**
   * Obtener información de rate limit
   * @returns {string} Información de límite
   */
  getRateLimit() {
    return 'No limit (local inference)';
  }

  /**
   * Verificar si soporta streaming
   * @returns {boolean} True - Ollama soporta streaming
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
      model = 'llama2',
      messages = [],
      settings = {}
    } = options;

    if (!this.isAvailable()) {
      throw new Error('Ollama URL is not configured');
    }

    // Cargar modelos si no se ha hecho
    if (!this.modelsLoaded) {
      await this.loadAvailableModels();
    }

    // Verificar que el modelo esté disponible
    if (this.availableModels.length > 0 && !this.availableModels.includes(model)) {
      throw new Error(`Model '${model}' is not available. Available models: ${this.availableModels.join(', ')}`);
    }

    const requestBody = this.prepareRequestBody(model, messages, settings, false);
    
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest('/api/chat', requestBody);
        return await this.parseResponse(response);
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries && this.isRetryableError(error)) {
          logger.warn(`Ollama API attempt ${attempt} failed, retrying...`, {
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

    logger.error('Ollama API request failed after all retries:', {
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
      model = 'llama2',
      messages = [],
      settings = {}
    } = options;

    if (!this.isAvailable()) {
      throw new Error('Ollama URL is not configured');
    }

    // Cargar modelos si no se ha hecho
    if (!this.modelsLoaded) {
      await this.loadAvailableModels();
    }

    if (this.availableModels.length > 0 && !this.availableModels.includes(model)) {
      throw new Error(`Model '${model}' is not available`);
    }

    const requestBody = this.prepareRequestBody(model, messages, settings, true);
    
    try {
      const response = await this.makeRequest('/api/chat', requestBody);
      return await this.parseStreamingResponse(response, onChunk);
    } catch (error) {
      logger.error('Ollama streaming request failed:', error);
      throw error;
    }
  }

  /**
   * Preparar cuerpo de la solicitud
   * @param {string} model - Modelo a usar
   * @param {Array} messages - Mensajes de la conversación
   * @param {Object} settings - Configuraciones
   * @param {boolean} streaming - Si es streaming
   * @returns {Object} Cuerpo de la solicitud
   */
  prepareRequestBody(model, messages, settings, streaming = false) {
    // Convertir mensajes al formato de Ollama
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const requestBody = {
      model,
      messages: formattedMessages,
      stream: streaming,
      options: {
        temperature: settings.temperature || 0.7,
        top_p: settings.topP || 0.9,
        top_k: settings.topK || 40,
        num_predict: settings.maxTokens || 2048,
        ...(settings.stopSequences && { stop: settings.stopSequences }),
        ...(settings.seed && { seed: settings.seed })
      }
    };

    return requestBody;
  }

  /**
   * Realizar solicitud HTTP
   * @param {string} endpoint - Endpoint de la API
   * @param {Object} requestBody - Cuerpo de la solicitud
   * @param {string} method - Método HTTP
   * @returns {Promise<Response>} Respuesta HTTP
   */
  async makeRequest(endpoint, requestBody = {}, method = 'POST') {
    const fetch = require('node-fetch');
    
    const url = `${this.baseUrl}${endpoint}`;

    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DevAI-Agent/1.0.0'
      },
      timeout: 120000 // 2 minutos para modelos locales
    };

    if (method === 'POST') {
      config.body = JSON.stringify(requestBody);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch {
        // Si no se puede parsear como JSON, usar texto plano
        errorData.error = await response.text();
      }
      
      const error = new Error(`Ollama API error: ${response.status} - ${errorData.error || response.statusText}`);
      error.status = response.status;
      error.details = errorData;
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
    
    if (!data.message || !data.message.content) {
      throw new Error('Invalid response format from Ollama');
    }

    const content = data.message.content;
    
    return {
      content,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      },
      model: data.model,
      finishReason: data.done ? 'stop' : 'length',
      provider: 'ollama'
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
    let modelName = '';

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const data = JSON.parse(line);
            
            if (data.message && data.message.content) {
              const content = data.message.content;
              fullContent += content;
              onChunk(content);
            }

            // Actualizar información del modelo
            if (data.model) {
              modelName = data.model;
            }

            // Si es el último chunk, obtener estadísticas finales
            if (data.done) {
              totalUsage = {
                promptTokens: data.prompt_eval_count || 0,
                completionTokens: data.eval_count || 0,
                totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
              };
            }
          } catch (parseError) {
            logger.warn('Failed to parse Ollama streaming chunk:', parseError.message);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content: fullContent,
      usage: totalUsage,
      model: modelName,
      provider: 'ollama'
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
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNREFUSED') {
      return true;
    }

    // Errores HTTP temporales
    if (error.status >= 500 || error.status === 429) {
      return true;
    }

    // Errores específicos de Ollama
    if (error.details && error.details.error) {
      const errorMsg = error.details.error.toLowerCase();
      if (errorMsg.includes('model') && errorMsg.includes('not found')) {
        return false; // Error de modelo no reintentable
      }
      if (errorMsg.includes('loading') || errorMsg.includes('busy')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verificar disponibilidad de un modelo específico
   * @param {string} modelName - Nombre del modelo
   * @returns {Promise<boolean>} True si está disponible
   */
  async isModelAvailable(modelName) {
    try {
      if (!this.modelsLoaded) {
        await this.loadAvailableModels();
      }
      return this.availableModels.includes(modelName);
    } catch (error) {
      logger.error(`Error checking model availability: ${modelName}`, error);
      return false;
    }
  }

  /**
   * Descargar un modelo en Ollama
   * @param {string} modelName - Nombre del modelo a descargar
   * @returns {Promise<boolean>} True si se descargó exitosamente
   */
  async downloadModel(modelName) {
    try {
      logger.info(`📥 Starting download of model: ${modelName}`);
      
      const response = await this.makeRequest('/api/pull', {
        name: modelName
      });

      // El endpoint de pull devuelve un stream de progreso
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const progress = JSON.parse(line);
            if (progress.status) {
              logger.info(`📦 Model download progress: ${progress.status}`);
            }
          } catch {
            // Ignorar líneas que no sean JSON válido
          }
        }
      }
      
      // Recargar lista de modelos
      await this.loadAvailableModels();
      
      logger.info(`✅ Model ${modelName} downloaded successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to download model ${modelName}:`, error);
      return false;
    }
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

      // Verificar conectividad básica
      const response = await this.makeRequest('/api/tags', {}, 'GET');
      const data = await response.json();
      
      // Si podemos obtener la lista de modelos, el servicio está funcionando
      return Array.isArray(data.models);
    } catch (error) {
      logger.error('Ollama health check failed:', error);
      return false;
    }
  }

  /**
   * Obtener información del sistema Ollama
   * @returns {Promise<Object>} Información del sistema
   */
  async getSystemInfo() {
    try {
      const response = await this.makeRequest('/api/version', {}, 'GET');
      return await response.json();
    } catch (error) {
      logger.error('Failed to get Ollama system info:', error);
      return null;
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

module.exports = OllamaClient;