// src/services/integrationAdapter.js - Adaptador para integración backend/frontend
import { 
  sendChatMessage as backendChat,
  checkBackendHealth,
  isBackendAvailable,
  uploadFiles as backendUpload,
  getApiStatus as backendApiStatus,
  testProviderConnection,
  saveConversation as backendSaveConversation,
  getConversations as backendGetConversations,
  deleteConversation as backendDeleteConversation
} from './api/backendService';

// Importar servicios directos como fallback
import { callFreeAIAPI as directCallFreeAI, generateFallbackResponse } from './api/aiServiceFactory';
import { processFiles } from './fileService';

/**
 * 🎯 ADAPTADOR PRINCIPAL PARA CHAT
 * Intenta backend primero, fallback a servicios directos
 */
export const callFreeAIAPI = async (messages, apiKey, provider, model, isMobile = false) => {
  let backendAvailable = false;
  
  try {
    // Verificar rápidamente si el backend está disponible
    backendAvailable = await isBackendAvailable();
  } catch (error) {
    console.log('Backend no disponible, usando servicios directos');
  }

  if (backendAvailable) {
    try {
      console.log('🔗 Usando backend para IA...');
      const backendResponse = await backendChat(messages, {
        provider,
        model,
        apiKey,
        maxTokens: isMobile ? 2000 : 4000,
        temperature: 0.7
      });
      
      if (backendResponse.success && !backendResponse.fallback) {
        console.log('✅ Respuesta exitosa del backend');
        return backendResponse;
      }
    } catch (error) {
      console.warn('❌ Backend falló, usando servicios directos:', error.message);
    }
  }
  
  // Fallback a servicios directos
  try {
    console.log('🔄 Usando servicios directos de IA...');
    return await directCallFreeAI(messages, apiKey, provider, model, isMobile);
  } catch (error) {
    console.error('❌ Servicios directos fallaron, usando respuesta simulada');
    
    // Último fallback: respuesta simulada
    const lastMessage = messages[messages.length - 1];
    const fallback = generateFallbackResponse(lastMessage?.content || '', provider);
    
    return {
      success: false,
      content: `❌ **Error de conectividad**\n\n*Tanto el backend como los servicios directos están fallando.*\n\n---\n\n${fallback.content}`,
      error: error.message,
      fallback: true,
      ...fallback
    };
  }
};

/**
 * 📁 ADAPTADOR PARA SUBIDA DE ARCHIVOS
 * Intenta backend primero, fallback a procesamiento local
 */
export const handleFileUpload = async (files, projectName, isMobile = false) => {
  let backendAvailable = false;
  
  try {
    backendAvailable = await isBackendAvailable();
  } catch (error) {
    console.log('Backend no disponible para archivos, procesando localmente');
  }

  if (backendAvailable) {
    try {
      console.log('📤 Subiendo archivos al backend...');
      const response = await backendUpload(files, projectName);
      
      if (response.success) {
        console.log('✅ Archivos subidos al backend exitosamente');
        return {
          success: true,
          project: response.project,
          source: 'backend'
        };
      }
    } catch (error) {
      console.warn('❌ Error subiendo al backend, procesando localmente:', error.message);
    }
  }

  // Fallback a procesamiento local
  try {
    console.log('🔧 Procesando archivos localmente...');
    const options = {
      maxFiles: isMobile ? 5 : 20,
      maxTotalSize: isMobile ? 10 * 1024 * 1024 : 50 * 1024 * 1024,
      skipLargeFiles: true
    };

    const project = await processFiles(files, options);
    
    return {
      success: true,
      project: project,
      source: 'local'
    };
  } catch (error) {
    console.error('❌ Error procesando archivos localmente:', error);
    return {
      success: false,
      error: error.message,
      source: 'none'
    };
  }
};

/**
 * 📊 ADAPTADOR PARA ESTADO DE APIs
 * Combina información del backend y verificación directa
 */
export const useApiStatus = (isMobile = false) => {
  const [apiStatus, setApiStatus] = React.useState({});
  const [isLoading, setIsLoading] = React.useState(false);

  const checkAllApis = React.useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      let backendStatus = {};
      
      // Intentar obtener estado del backend
      try {
        backendStatus = await backendApiStatus();
        console.log('📊 Estado de APIs desde backend:', backendStatus);
      } catch (error) {
        console.log('No se pudo obtener estado desde backend');
      }
      
      // Si el backend no tiene info, verificar directamente
      if (Object.keys(backendStatus).length === 0) {
        console.log('🔍 Verificando APIs directamente...');
        
        const providers = isMobile ? ['gemini', 'groq'] : ['gemini', 'groq', 'huggingface', 'ollama'];
        const directStatus = {};
        
        for (const provider of providers) {
          try {
            const result = await testProviderConnection(provider);
            directStatus[provider] = {
              available: result.available,
              status: result.available ? 'ready' : 'error',
              error: result.error,
              latency: result.latency
            };
          } catch (error) {
            directStatus[provider] = {
              available: false,
              status: 'error',
              error: error.message
            };
          }
        }
        
        setApiStatus(directStatus);
      } else {
        setApiStatus(backendStatus);
      }
      
    } catch (error) {
      console.error('Error verificando estado de APIs:', error);
      
      // Status de fallback
      const fallbackStatus = {
        gemini: { available: false, status: 'unknown', error: 'No verificado' },
        groq: { available: false, status: 'unknown', error: 'No verificado' }
      };
      
      if (!isMobile) {
        fallbackStatus.huggingface = { available: false, status: 'unknown', error: 'No verificado' };
        fallbackStatus.ollama = { available: false, status: 'unknown', error: 'No verificado' };
      }
      
      setApiStatus(fallbackStatus);
    } finally {
      setIsLoading(false);
    }
  }, [isMobile, isLoading]);

  return {
    apiStatus,
    isLoading,
    checkAllApis
  };
};

/**
 * 💾 ADAPTADOR PARA CONVERSACIONES
 * Intenta backend primero, fallback a localStorage
 */
export const useConversations = () => {
  const [conversations, setConversations] = React.useState([]);
  const [currentConversationId, setCurrentConversationId] = React.useState(null);
  const [isBackendMode, setIsBackendMode] = React.useState(false);

  // Verificar si podemos usar el backend
  React.useEffect(() => {
    checkBackendAvailability();
  }, []);

  const checkBackendAvailability = async () => {
    try {
      const available = await isBackendAvailable();
      setIsBackendMode(available);
      
      if (available) {
        loadConversationsFromBackend();
      } else {
        loadConversationsFromLocal();
      }
    } catch (error) {
      setIsBackendMode(false);
      loadConversationsFromLocal();
    }
  };

  const loadConversationsFromBackend = async () => {
    try {
      const backendConversations = await backendGetConversations();
      setConversations(backendConversations || []);
    } catch (error) {
      console.warn('Error cargando conversaciones del backend:', error);
      loadConversationsFromLocal();
    }
  };

  const loadConversationsFromLocal = () => {
    try {
      const stored = localStorage.getItem('devai_conversations');
      const localConversations = stored ? JSON.parse(stored) : [];
      setConversations(localConversations);
    } catch (error) {
      console.error('Error cargando conversaciones locales:', error);
      setConversations([]);
    }
  };

  const saveConversation = async (messages, metadata = {}) => {
    if (isBackendMode) {
      try {
        const saved = await backendSaveConversation(messages, metadata);
        if (saved) {
          await loadConversationsFromBackend();
          return saved.id;
        }
      } catch (error) {
        console.warn('Error guardando en backend, usando localStorage');
      }
    }

    // Fallback a localStorage
    try {
      const conversation = {
        id: Date.now().toString(),
        title: metadata.title || generateTitle(messages),
        messages: messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...metadata
      };

      const updated = [...conversations.filter(c => c.id !== conversation.id), conversation];
      setConversations(updated);
      localStorage.setItem('devai_conversations', JSON.stringify(updated));
      
      return conversation.id;
    } catch (error) {
      console.error('Error guardando conversación:', error);
      return null;
    }
  };

  const deleteConversation = async (conversationId) => {
    if (isBackendMode) {
      try {
        const deleted = await backendDeleteConversation(conversationId);
        if (deleted) {
          await loadConversationsFromBackend();
          return true;
        }
      } catch (error) {
        console.warn('Error eliminando del backend, usando localStorage');
      }
    }

    // Fallback a localStorage
    try {
      const updated = conversations.filter(c => c.id !== conversationId);
      setConversations(updated);
      localStorage.setItem('devai_conversations', JSON.stringify(updated));
      
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
      }
      
      return true;
    } catch (error) {
      console.error('Error eliminando conversación:', error);
      return false;
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
  };

  const loadConversation = (conversation) => {
    setCurrentConversationId(conversation.id);
  };

  const exportConversations = () => {
    return JSON.stringify(conversations, null, 2);
  };

  const importConversations = (jsonData) => {
    try {
      const importedConversations = JSON.parse(jsonData);
      if (Array.isArray(importedConversations)) {
        setConversations(importedConversations);
        localStorage.setItem('devai_conversations', JSON.stringify(importedConversations));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importando conversaciones:', error);
      return false;
    }
  };

  const generateTitle = (messages) => {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'Nueva Conversación';
    
    const content = firstUserMessage.content.substring(0, 50).trim();
    return content.length < firstUserMessage.content.length 
      ? `${content}...` 
      : content;
  };

  return {
    conversations,
    currentConversationId,
    isBackendMode,
    saveConversation,
    deleteConversation,
    startNewConversation,
    loadConversation,
    exportConversations,
    importConversations
  };
};

/**
 * 🏥 VERIFICADOR DE SALUD DEL SISTEMA
 */
export const getSystemHealth = async () => {
  try {
    const health = await checkBackendHealth();
    return {
      backend: {
        available: health.isHealthy,
        uptime: health.data?.uptime,
        version: health.data?.version,
        memory: health.data?.memory
      },
      frontend: {
        version: process.env.REACT_APP_VERSION || '1.0.0',
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      backend: {
        available: false,
        error: error.message
      },
      frontend: {
        version: process.env.REACT_APP_VERSION || '1.0.0',
        timestamp: new Date().toISOString()
      }
    };
  }
};

/**
 * 🔧 UTILIDADES DE CONFIGURACIÓN
 */
export const getOptimalConfiguration = async (isMobile = false) => {
  const health = await getSystemHealth();
  
  const config = {
    preferBackend: health.backend.available,
    maxFiles: isMobile ? 5 : (health.backend.available ? 50 : 20),
    maxFileSize: isMobile ? 2 * 1024 * 1024 : 5 * 1024 * 1024,
    maxTokens: isMobile ? 2000 : 4000,
    availableProviders: isMobile ? ['gemini', 'groq'] : ['gemini', 'groq', 'huggingface', 'ollama'],
    features: {
      fileUpload: true,
      livePreview: !isMobile,
      conversationSync: health.backend.available,
      advancedAnalysis: health.backend.available
    }
  };

  return config;
};

export default {
  callFreeAIAPI,
  handleFileUpload,
  useApiStatus,
  useConversations,
  getSystemHealth,
  getOptimalConfiguration
};