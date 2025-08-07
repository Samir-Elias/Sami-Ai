const logger = require('../config/logger');
const { MESSAGE_TYPES, MESSAGE_STATUS, AI_CONFIG, ERROR_MESSAGES } = require('../utils/constants');
const conversationService = require('../services/conversationService');
const messageService = require('../services/messageService');

// =================================
// CONTROLADOR DE IA
// =================================

/**
 * @desc    Obtener proveedores de IA disponibles
 * @route   GET /api/v1/ai/providers
 * @access  Private
 */
const getProviders = async (req, res) => {
  try {
    const providers = {};

    // Verificar disponibilidad de cada proveedor
    if (process.env.GEMINI_API_KEY) {
      providers.gemini = {
        name: 'Google Gemini',
        available: true,
        models: Object.keys(AI_CONFIG.MODELS.GEMINI || {}),
        features: ['text', 'vision', 'multimodal'],
        rateLimit: '60 requests/minute'
      };
    }

    if (process.env.GROQ_API_KEY) {
      providers.groq = {
        name: 'Groq',
        available: true,
        models: Object.keys(AI_CONFIG.MODELS.GROQ || {}),
        features: ['text', 'fast-inference'],
        rateLimit: '30 requests/minute'
      };
    }

    if (process.env.HUGGINGFACE_API_KEY) {
      providers.huggingface = {
        name: 'HuggingFace',
        available: true,
        models: Object.keys(AI_CONFIG.MODELS.HUGGINGFACE || {}),
        features: ['text', 'open-models'],
        rateLimit: '100 requests/hour'
      };
    }

    if (process.env.OLLAMA_URL) {
      try {
        // Verificar si Ollama está disponible
        const fetch = require('node-fetch');
        const response = await fetch(`${process.env.OLLAMA_URL}/api/tags`, {
          timeout: 5000
        });
        
        if (response.ok) {
          const models = await response.json();
          providers.ollama = {
            name: 'Ollama',
            available: true,
            models: models.models?.map(m => m.name) || [],
            features: ['local', 'privacy', 'offline'],
            rateLimit: 'No limit (local)'
          };
        }
      } catch (error) {
        logger.warn('Ollama not available:', error.message);
        providers.ollama = {
          name: 'Ollama',
          available: false,
          error: 'Service not reachable'
        };
      }
    }

    logger.info(`🤖 AI providers queried`, {
      userId: req.user.id,
      availableProviders: Object.keys(providers).filter(p => providers[p].available)
    });

    res.json({
      providers,
      defaultProvider: 'gemini',
      totalProviders: Object.keys(providers).length,
      availableProviders: Object.keys(providers).filter(p => providers[p].available).length
    });

  } catch (error) {
    logger.error('Get AI providers error:', error);
    res.status(500).json({
      error: 'Failed to fetch AI providers',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Obtener modelos disponibles
 * @route   GET /api/v1/ai/models
 * @access  Private
 */
const getModels = async (req, res) => {
  try {
    const { provider } = req.query;

    let models = {};

    if (!provider || provider === 'all') {
      // Obtener todos los modelos
      models = AI_CONFIG.MODELS;
    } else if (AI_CONFIG.MODELS[provider.toUpperCase()]) {
      // Obtener modelos de un proveedor específico
      models[provider] = AI_CONFIG.MODELS[provider.toUpperCase()];
    } else {
      return res.status(400).json({
        error: 'Invalid provider',
        message: `Provider must be one of: ${Object.keys(AI_CONFIG.PROVIDERS).join(', ')}`
      });
    }

    // Formatear respuesta con información detallada
    const formattedModels = {};
    for (const [providerName, providerModels] of Object.entries(models)) {
      formattedModels[providerName.toLowerCase()] = {};
      
      for (const [modelName, modelInfo] of Object.entries(providerModels)) {
        formattedModels[providerName.toLowerCase()][modelName] = {
          ...modelInfo,
          provider: providerName.toLowerCase(),
          available: await isModelAvailable(providerName.toLowerCase(), modelName)
        };
      }
    }

    logger.info(`🧠 AI models queried`, {
      userId: req.user.id,
      provider,
      modelCount: Object.values(formattedModels).reduce((acc, p) => acc + Object.keys(p).length, 0)
    });

    res.json({
      models: formattedModels,
      defaultSettings: AI_CONFIG.DEFAULT_SETTINGS,
      rateLimits: AI_CONFIG.RATE_LIMITS
    });

  } catch (error) {
    logger.error('Get AI models error:', error);
    res.status(500).json({
      error: 'Failed to fetch AI models',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Chat con IA (crear mensaje y obtener respuesta)
 * @route   POST /api/v1/ai/chat
 * @access  Private
 */
const chat = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      conversationId,
      message,
      provider = 'gemini',
      model = 'gemini-pro',
      settings = {},
      systemPrompt,
      stream = false
    } = req.body;

    // Validaciones básicas
    if (!conversationId) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Conversation ID is required'
      });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Message content is required'
      });
    }

    if (message.trim().length > 10000) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Message is too long (max 10,000 characters)'
      });
    }

    // Verificar que la conversación existe y pertenece al usuario
    const conversation = await conversationService.findByIdAndUser(conversationId, userId);
    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
        message: 'Conversation with specified ID does not exist or you do not have access'
      });
    }

    // Verificar que el proveedor esté disponible
    if (!await isProviderAvailable(provider)) {
      return res.status(400).json({
        error: 'Provider not available',
        message: `AI provider '${provider}' is not configured or unavailable`
      });
    }

    // Crear mensaje del usuario
    const userMessage = await messageService.createMessage(conversationId, userId, {
      content: message.trim(),
      role: MESSAGE_TYPES.USER,
      metadata: {
        provider,
        model,
        settings
      }
    });

    // Preparar mensaje de respuesta (inicialmente en estado processing)
    const assistantMessage = await messageService.createMessage(conversationId, userId, {
      content: '',
      role: MESSAGE_TYPES.ASSISTANT,
      metadata: {
        provider,
        model,
        status: MESSAGE_STATUS.PROCESSING,
        parentMessageId: userMessage.id
      }
    });

    try {
      // Obtener historial de la conversación para contexto
      const conversationHistory = await getConversationHistory(conversationId, 20);
      
      // Preparar configuración de IA
      const aiSettings = {
        ...AI_CONFIG.DEFAULT_SETTINGS,
        ...settings
      };

      // Generar respuesta de IA
      let aiResponse;
      if (stream) {
        // Para streaming, configurar SSE
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });

        aiResponse = await generateStreamingResponse({
          provider,
          model,
          messages: conversationHistory,
          systemPrompt: systemPrompt || conversation.systemPrompt,
          settings: aiSettings,
          onChunk: (chunk) => {
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
          },
          onComplete: (fullResponse) => {
            res.write(`data: ${JSON.stringify({ type: 'complete', messageId: assistantMessage.id })}\n\n`);
            res.end();
          }
        });
      } else {
        // Respuesta completa
        aiResponse = await generateResponse({
          provider,
          model,
          messages: conversationHistory,
          systemPrompt: systemPrompt || conversation.systemPrompt,
          settings: aiSettings
        });
      }

      // Actualizar mensaje del asistente con la respuesta
      const updatedAssistantMessage = await messageService.updateMessage(
        assistantMessage.id,
        userId,
        {
          content: aiResponse.content,
          metadata: {
            provider,
            model,
            status: MESSAGE_STATUS.COMPLETED,
            tokenCount: aiResponse.tokenCount,
            usage: aiResponse.usage,
            responseTime: aiResponse.responseTime,
            parentMessageId: userMessage.id
          }
        }
      );

      if (!stream) {
        logger.info(`🤖 AI chat response generated`, {
          userId,
          conversationId,
          provider,
          model,
          userMessageLength: message.trim().length,
          responseLength: aiResponse.content.length,
          responseTime: aiResponse.responseTime
        });

        res.json({
          message: 'Chat response generated successfully',
          userMessage,
          assistantMessage: updatedAssistantMessage,
          usage: aiResponse.usage
        });
      }

    } catch (aiError) {
      logger.error('AI response generation failed:', aiError);

      // Actualizar mensaje del asistente con error
      await messageService.updateMessage(assistantMessage.id, userId, {
        content: 'Sorry, I encountered an error while generating a response. Please try again.',
        metadata: {
          provider,
          model,
          status: MESSAGE_STATUS.FAILED,
          error: aiError.message,
          parentMessageId: userMessage.id
        }
      });

      if (!stream) {
        res.status(500).json({
          error: 'AI response generation failed',
          message: 'The AI service encountered an error. Please try again.',
          userMessage,
          assistantMessageId: assistantMessage.id
        });
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'AI response generation failed' })}\n\n`);
        res.end();
      }
    }

  } catch (error) {
    logger.error('AI chat error:', error);
    res.status(500).json({
      error: 'Chat request failed',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

/**
 * @desc    Regenerar respuesta de IA para un mensaje
 * @route   POST /api/v1/ai/regenerate/:messageId
 * @access  Private
 */
const regenerateResponse = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const { provider, model, settings = {} } = req.body;

    // Buscar el mensaje del asistente a regenerar
    const message = await messageService.findByIdAndUser(messageId, userId, {
      includeConversation: true
    });

    if (!message) {
      return res.status(404).json({
        error: 'Message not found',
        message: 'Message with specified ID does not exist or you do not have access'
      });
    }

    if (message.role !== MESSAGE_TYPES.ASSISTANT) {
      return res.status(400).json({
        error: 'Invalid message type',
        message: 'Can only regenerate assistant messages'
      });
    }

    const conversationId = message.conversationId;
    const selectedProvider = provider || message.metadata?.provider || 'gemini';
    const selectedModel = model || message.metadata?.model || 'gemini-pro';

    // Verificar disponibilidad del proveedor
    if (!await isProviderAvailable(selectedProvider)) {
      return res.status(400).json({
        error: 'Provider not available',
        message: `AI provider '${selectedProvider}' is not configured or unavailable`
      });
    }

    // Marcar mensaje como procesando
    await messageService.updateMessage(messageId, userId, {
      metadata: {
        ...message.metadata,
        status: MESSAGE_STATUS.PROCESSING,
        regeneratedAt: new Date().toISOString()
      }
    });

    try {
      // Obtener historial hasta el mensaje anterior
      const conversationHistory = await getConversationHistory(conversationId, 20, messageId);
      
      // Configuración de IA
      const aiSettings = {
        ...AI_CONFIG.DEFAULT_SETTINGS,
        ...settings
      };

      // Generar nueva respuesta
      const aiResponse = await generateResponse({
        provider: selectedProvider,
        model: selectedModel,
        messages: conversationHistory,
        systemPrompt: message.conversation.systemPrompt,
        settings: aiSettings
      });

      // Actualizar mensaje con nueva respuesta
      const updatedMessage = await messageService.updateMessage(messageId, userId, {
        content: aiResponse.content,
        metadata: {
          ...message.metadata,
          provider: selectedProvider,
          model: selectedModel,
          status: MESSAGE_STATUS.COMPLETED,
          tokenCount: aiResponse.tokenCount,
          usage: aiResponse.usage,
          responseTime: aiResponse.responseTime,
          regeneratedAt: new Date().toISOString()
        }
      });

      logger.info(`🔄 AI response regenerated`, {
        userId,
        messageId,
        conversationId,
        provider: selectedProvider,
        model: selectedModel
      });

      res.json({
        message: 'Response regenerated successfully',
        data: updatedMessage,
        usage: aiResponse.usage
      });

    } catch (aiError) {
      logger.error('AI regeneration failed:', aiError);

      await messageService.updateMessage(messageId, userId, {
        metadata: {
          ...message.metadata,
          status: MESSAGE_STATUS.FAILED,
          error: aiError.message,
          regenerationFailedAt: new Date().toISOString()
        }
      });

      res.status(500).json({
        error: 'Response regeneration failed',
        message: 'The AI service encountered an error. Please try again.'
      });
    }

  } catch (error) {
    logger.error('Regenerate response error:', error);
    res.status(500).json({
      error: 'Failed to regenerate response',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
};

// =================================
// FUNCIONES AUXILIARES
// =================================

/**
 * Verificar si un proveedor está disponible
 */
async function isProviderAvailable(provider) {
  switch (provider) {
    case 'gemini':
      return !!process.env.GEMINI_API_KEY;
    case 'groq':
      return !!process.env.GROQ_API_KEY;
    case 'huggingface':
      return !!process.env.HUGGINGFACE_API_KEY;
    case 'ollama':
      return !!process.env.OLLAMA_URL;
    default:
      return false;
  }
}

/**
 * Verificar si un modelo está disponible
 */
async function isModelAvailable(provider, model) {
  const isProviderOk = await isProviderAvailable(provider);
  if (!isProviderOk) return false;

  const providerModels = AI_CONFIG.MODELS[provider.toUpperCase()];
  return providerModels && providerModels[model];
}

/**
 * Obtener historial de conversación para contexto
 */
async function getConversationHistory(conversationId, limit = 20, excludeMessageId = null) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(excludeMessageId && { id: { not: excludeMessageId } })
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        role: true,
        content: true,
        createdAt: true
      }
    });

    return messages.reverse(); // Orden cronológico
  } catch (error) {
    logger.error('Error getting conversation history:', error);
    return [];
  }
}

/**
 * Generar respuesta de IA (función mock - implementar con proveedores reales)
 */
async function generateResponse({ provider, model, messages, systemPrompt, settings }) {
  // Esta es una implementación mock
  // En la implementación real, aquí se haría la llamada al proveedor de IA correspondiente
  
  const startTime = Date.now();
  
  // Simular tiempo de respuesta
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const responseTime = Date.now() - startTime;
  const mockResponse = `This is a mock response from ${provider} using model ${model}. In a real implementation, this would be the actual AI response based on the conversation history and system prompt.`;
  
  return {
    content: mockResponse,
    tokenCount: Math.ceil(mockResponse.length / 4),
    usage: {
      promptTokens: messages.reduce((acc, msg) => acc + Math.ceil(msg.content.length / 4), 0),
      completionTokens: Math.ceil(mockResponse.length / 4),
      totalTokens: Math.ceil(mockResponse.length / 4) + messages.reduce((acc, msg) => acc + Math.ceil(msg.content.length / 4), 0)
    },
    responseTime
  };
}

/**
 * Generar respuesta de IA con streaming (función mock)
 */
async function generateStreamingResponse({ provider, model, messages, systemPrompt, settings, onChunk, onComplete }) {
  const mockResponse = `This is a streaming mock response from ${provider} using model ${model}. `;
  const chunks = mockResponse.split(' ');
  
  let fullResponse = '';
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i] + (i < chunks.length - 1 ? ' ' : '');
    fullResponse += chunk;
    onChunk(chunk);
    await new Promise(resolve => setTimeout(resolve, 100)); // Simular streaming
  }
  
  onComplete(fullResponse);
  
  return {
    content: fullResponse,
    tokenCount: Math.ceil(fullResponse.length / 4),
    usage: {
      promptTokens: messages.reduce((acc, msg) => acc + Math.ceil(msg.content.length / 4), 0),
      completionTokens: Math.ceil(fullResponse.length / 4),
      totalTokens: Math.ceil(fullResponse.length / 4) + messages.reduce((acc, msg) => acc + Math.ceil(msg.content.length / 4), 0)
    }
  };
}

// =================================
// EXPORTAR CONTROLADORES
// =================================

module.exports = {
  getProviders,
  getModels,
  chat,
  regenerateResponse
};