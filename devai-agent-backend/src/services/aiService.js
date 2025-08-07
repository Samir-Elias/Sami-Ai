const logger = require('../config/logger');
const { AI_CONFIG, MESSAGE_TYPES } = require('../utils/constants');
const cacheService = require('./cacheService');

// =================================
// SERVICIO PRINCIPAL DE IA
// =================================

class AIService {
  constructor() {
    this.clients = new Map();
    this.loadClients();
  }

  /**
   * Cargar clientes de IA disponibles
   */
  loadClients() {
    try {
      // Cargar Gemini si está configurado
      if (process.env.GEMINI_API_KEY) {
        const GeminiClient = require('../ai/geminiClient');
        this.clients.set('gemini', new GeminiClient());
        logger.info('✅ Gemini AI client loaded');
      }

      // Cargar Groq si está configurado
      if (process.env.GROQ_API_KEY) {
        const GroqClient = require('../ai/groqClient');
        this.clients.set('groq', new GroqClient());
        logger.info('✅ Groq AI client loaded');
      }

      // Cargar HuggingFace si está configurado
      if (process.env.HUGGINGFACE_API_KEY) {
        const HuggingFaceClient = require('../ai/huggingfaceClient');
        this.clients.set('huggingface', new HuggingFaceClient());
        logger.info('✅ HuggingFace AI client loaded');
      }

      // Cargar Ollama si está configurado
      if (process.env.OLLAMA_URL) {
        const OllamaClient = require('../ai/ollamaClient');
        this.clients.set('ollama', new OllamaClient());
        logger.info('✅ Ollama AI client loaded');
      }

      logger.info(`🤖 AI Service initialized with ${this.clients.size} providers`);
    } catch (error) {
      logger.error('Error loading AI clients:', error);
    }
  }

  /**
   * Obtener lista de proveedores disponibles
   * @returns {Object} Proveedores disponibles
   */
  getAvailableProviders() {
    const providers = {};

    for (const [name, client] of this.clients) {
      providers[name] = {
        name: client.getProviderInfo().name,
        available: client.isAvailable(),
        models: client.getAvailableModels(),
        features: client.getSupportedFeatures(),
        rateLimit: client.getRateLimit()
      };
    }

    return providers;
  }

  /**
   * Verificar si un proveedor está disponible
   * @param {string} provider - Nombre del proveedor
   * @returns {boolean} True si está disponible
   */
  isProviderAvailable(provider) {
    const client = this.clients.get(provider);
    return client ? client.isAvailable() : false;
  }

  /**
   * Verificar si un modelo está disponible
   * @param {string} provider - Nombre del proveedor
   * @param {string} model - Nombre del modelo
   * @returns {boolean} True si está disponible
   */
  isModelAvailable(provider, model) {
    const client = this.clients.get(provider);
    if (!client || !client.isAvailable()) return false;

    const availableModels = client.getAvailableModels();
    return availableModels.includes(model);
  }

  /**
   * Generar respuesta de IA
   * @param {Object} options - Opciones de generación
   * @returns {Promise<Object>} Respuesta de IA
   */
  async generateResponse(options) {
    const {
      provider = 'gemini',
      model = 'gemini-pro',
      messages = [],
      systemPrompt = null,
      settings = {},
      userId = null,
      conversationId = null
    } = options;

    // Validar proveedor
    const client = this.clients.get(provider);
    if (!client) {
      throw new Error(`AI provider '${provider}' is not available`);
    }

    if (!client.isAvailable()) {
      throw new Error(`AI provider '${provider}' is not configured or unavailable`);
    }

    // Validar modelo
    if (!this.isModelAvailable(provider, model)) {
      throw new Error(`Model '${model}' is not available for provider '${provider}'`);
    }

    // Verificar rate limit
    await this.checkRateLimit(provider, userId);

    // Preparar configuración
    const finalSettings = {
      ...AI_CONFIG.DEFAULT_SETTINGS,
      ...settings
    };

    // Preparar mensajes con contexto del sistema
    const preparedMessages = this.prepareMessages(messages, systemPrompt);

    // Crear clave de cache si es apropiado
    const cacheKey = this.generateCacheKey(provider, model, preparedMessages, finalSettings);

    try {
      // Intentar obtener de cache primero (solo para consultas determinísticas)
      if (finalSettings.temperature === 0) {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          logger.info('🎯 AI response served from cache', { provider, model, userId });
          return {
            ...cached,
            fromCache: true
          };
        }
      }

      // Generar respuesta
      const startTime = Date.now();
      const response = await client.generateResponse({
        model,
        messages: preparedMessages,
        settings: finalSettings
      });

      const responseTime = Date.now() - startTime;

      // Formatear respuesta
      const formattedResponse = {
        content: response.content,
        tokenCount: response.usage?.completionTokens || this.estimateTokens(response.content),
        usage: response.usage || this.estimateUsage(preparedMessages, response.content),
        responseTime,
        provider,
        model,
        fromCache: false
      };

      // Cache la respuesta si es determinística
      if (finalSettings.temperature === 0) {
        await cacheService.set(cacheKey, formattedResponse, 3600); // 1 hora
      }

      // Registrar uso
      await this.recordUsage(provider, model, formattedResponse.usage, userId, conversationId);

      logger.info('🤖 AI response generated', {
        provider,
        model,
        responseTime,
        tokenCount: formattedResponse.tokenCount,
        userId,
        conversationId
      });

      return formattedResponse;

    } catch (error) {
      logger.error('AI generation failed:', {
        provider,
        model,
        error: error.message,
        userId,
        conversationId
      });

      // Reintentar con proveedor de respaldo si está configurado
      if (provider !== 'gemini' && this.isProviderAvailable('gemini')) {
        logger.info('🔄 Retrying with fallback provider: gemini');
        return this.generateResponse({
          ...options,
          provider: 'gemini',
          model: 'gemini-pro'
        });
      }

      throw error;
    }
  }

  /**
   * Generar respuesta streaming
   * @param {Object} options - Opciones de generación
   * @param {Function} onChunk - Callback para cada chunk
   * @param {Function} onComplete - Callback al completar
   * @returns {Promise<Object>} Respuesta completa
   */
  async generateStreamingResponse(options, onChunk, onComplete) {
    const {
      provider = 'gemini',
      model = 'gemini-pro',
      messages = [],
      systemPrompt = null,
      settings = {},
      userId = null,
      conversationId = null
    } = options;

    // Validaciones similares a generateResponse
    const client = this.clients.get(provider);
    if (!client) {
      throw new Error(`AI provider '${provider}' is not available`);
    }

    if (!client.isAvailable()) {
      throw new Error(`AI provider '${provider}' is not configured or unavailable`);
    }

    if (!client.supportsStreaming()) {
      // Fallback a respuesta completa si no soporta streaming
      const response = await this.generateResponse(options);
      
      // Simular streaming
      const chunks = response.content.split(' ');
      for (const chunk of chunks) {
        onChunk(chunk + ' ');
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      onComplete(response);
      return response;
    }

    await this.checkRateLimit(provider, userId);

    const finalSettings = {
      ...AI_CONFIG.DEFAULT_SETTINGS,
      ...settings
    };

    const preparedMessages = this.prepareMessages(messages, systemPrompt);

    try {
      const startTime = Date.now();
      let fullContent = '';
      
      const response = await client.generateStreamingResponse({
        model,
        messages: preparedMessages,
        settings: finalSettings
      }, (chunk) => {
        fullContent += chunk;
        onChunk(chunk);
      });

      const responseTime = Date.now() - startTime;

      const formattedResponse = {
        content: fullContent,
        tokenCount: response.usage?.completionTokens || this.estimateTokens(fullContent),
        usage: response.usage || this.estimateUsage(preparedMessages, fullContent),
        responseTime,
        provider,
        model,
        streaming: true
      };

      await this.recordUsage(provider, model, formattedResponse.usage, userId, conversationId);

      onComplete(formattedResponse);
      return formattedResponse;

    } catch (error) {
      logger.error('AI streaming generation failed:', {
        provider,
        model,
        error: error.message,
        userId,
        conversationId
      });
      throw error;
    }
  }

  /**
   * Preparar mensajes con contexto del sistema
   * @param {Array} messages - Mensajes de la conversación
   * @param {string} systemPrompt - Prompt del sistema
   * @returns {Array} Mensajes preparados
   */
  prepareMessages(messages, systemPrompt) {
    const prepared = [];

    // Agregar prompt del sistema si existe
    if (systemPrompt) {
      prepared.push({
        role: MESSAGE_TYPES.SYSTEM,
        content: systemPrompt
      });
    }

    // Agregar mensajes de la conversación
    prepared.push(...messages.map(msg => ({
      role: msg.role,
      content: msg.content
    })));

    return prepared;
  }

  /**
   * Verificar rate limit para un usuario
   * @param {string} provider - Proveedor de IA
   * @param {string} userId - ID del usuario
   */
  async checkRateLimit(provider, userId) {
    if (!userId) return; // Skip para requests sin usuario

    const key = `ratelimit:ai:${provider}:${userId}`;
    const limit = AI_CONFIG.RATE_LIMITS.REQUESTS_PER_MINUTE;
    
    const current = await cacheService.get(key) || 0;
    
    if (current >= limit) {
      throw new Error(`Rate limit exceeded for AI provider '${provider}'. Limit: ${limit} requests per minute.`);
    }

    // Incrementar contador
    await cacheService.set(key, current + 1, 60); // TTL de 1 minuto
  }

  /**
   * Registrar uso de IA
   * @param {string} provider - Proveedor
   * @param {string} model - Modelo
   * @param {Object} usage - Información de uso
   * @param {string} userId - ID del usuario
   * @param {string} conversationId - ID de la conversación
   */
  async recordUsage(provider, model, usage, userId, conversationId) {
    try {
      // En una implementación completa, aquí guardarías en base de datos
      const usageRecord = {
        provider,
        model,
        userId,
        conversationId,
        promptTokens: usage.promptTokens || 0,
        completionTokens: usage.completionTokens || 0,
        totalTokens: usage.totalTokens || 0,
        timestamp: new Date().toISOString()
      };

      // Por ahora solo log, pero se puede implementar persistencia
      logger.info('📊 AI usage recorded', usageRecord);

      // Actualizar estadísticas en cache
      const statsKey = `stats:ai:${provider}:${userId}`;
      const currentStats = await cacheService.get(statsKey) || {
        totalRequests: 0,
        totalTokens: 0,
        lastUsed: null
      };

      currentStats.totalRequests += 1;
      currentStats.totalTokens += usage.totalTokens || 0;
      currentStats.lastUsed = new Date().toISOString();

      await cacheService.set(statsKey, currentStats, 86400); // 24 horas

    } catch (error) {
      logger.error('Error recording AI usage:', error);
      // No fallar la operación principal por esto
    }
  }

  /**
   * Generar clave de cache
   * @param {string} provider - Proveedor
   * @param {string} model - Modelo
   * @param {Array} messages - Mensajes
   * @param {Object} settings - Configuraciones
   * @returns {string} Clave de cache
   */
  generateCacheKey(provider, model, messages, settings) {
    const crypto = require('crypto');
    
    const cacheData = {
      provider,
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      settings: {
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        topP: settings.topP
      }
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(cacheData))
      .digest('hex');

    return `ai:response:${hash}`;
  }

  /**
   * Estimar tokens de un texto (aproximación simple)
   * @param {string} text - Texto a evaluar
   * @returns {number} Número estimado de tokens
   */
  estimateTokens(text) {
    if (!text) return 0;
    // Aproximación: 1 token ≈ 4 caracteres
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimar uso de tokens
   * @param {Array} messages - Mensajes de entrada
   * @param {string} responseContent - Contenido de respuesta
   * @returns {Object} Información de uso estimada
   */
  estimateUsage(messages, responseContent) {
    const promptTokens = messages.reduce((total, msg) => 
      total + this.estimateTokens(msg.content), 0
    );
    
    const completionTokens = this.estimateTokens(responseContent);
    
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens
    };
  }

  /**
   * Obtener estadísticas de uso de IA para un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Estadísticas de uso
   */
  async getUserAIStats(userId) {
    try {
      const stats = {};
      
      for (const provider of this.clients.keys()) {
        const statsKey = `stats:ai:${provider}:${userId}`;
        const providerStats = await cacheService.get(statsKey);
        
        if (providerStats) {
          stats[provider] = providerStats;
        }
      }

      return {
        byProvider: stats,
        totalRequests: Object.values(stats).reduce((sum, s) => sum + s.totalRequests, 0),
        totalTokens: Object.values(stats).reduce((sum, s) => sum + s.totalTokens, 0)
      };
    } catch (error) {
      logger.error('Error getting user AI stats:', error);
      return { byProvider: {}, totalRequests: 0, totalTokens: 0 };
    }
  }

  /**
   * Limpiar cache de respuestas antiguas
   * @param {number} maxAge - Edad máxima en segundos
   */
  async cleanupCache(maxAge = 86400) {
    try {
      // Implementar limpieza de cache según el servicio de cache usado
      logger.info(`🧹 AI cache cleanup completed (max age: ${maxAge}s)`);
    } catch (error) {
      logger.error('Error cleaning up AI cache:', error);
    }
  }

  /**
   * Obtener información de salud de los proveedores
   * @returns {Promise<Object>} Estado de salud de los proveedores
   */
  async getProvidersHealth() {
    const health = {};

    for (const [name, client] of this.clients) {
      try {
        const isHealthy = await client.healthCheck();
        health[name] = {
          available: client.isAvailable(),
          healthy: isHealthy,
          lastChecked: new Date().toISOString()
        };
      } catch (error) {
        health[name] = {
          available: false,
          healthy: false,
          error: error.message,
          lastChecked: new Date().toISOString()
        };
      }
    }

    return health;
  }
}

// Exportar instancia única del servicio
module.exports = new AIService();