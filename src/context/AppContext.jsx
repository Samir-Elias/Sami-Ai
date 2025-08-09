// ============================================
// 🌐 CONTEXTO PRINCIPAL CORREGIDO - DevAI Agent
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../config/api';
import { constantsUtils, ERROR_MESSAGES, APP_CONFIG } from '../utils/constants';

// Crear el contexto principal
const AppContext = createContext();

// Hook principal para usar el contexto
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de AppProvider');
  }
  return context;
};

// Provider principal que maneja todo el estado global
export const AppProvider = ({ children }) => {
  // ============================================
  // 🔄 ESTADOS PRINCIPALES
  // ============================================
  
  // Estados de conexión y API
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Estados de aplicación
  const [currentProject, setCurrentProject] = useState(APP_CONFIG.name);
  const [currentProvider, setCurrentProvider] = useState(APP_CONFIG.defaultProvider);
  const [currentModel, setCurrentModel] = useState('gemini-1.5-flash-latest');
  
  // Estados de UI
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Estados de conversación
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);

  // Estado para modo offline
  const [offlineMode, setOfflineMode] = useState(false);

  // ============================================
  // 🔧 FUNCIÓN PRINCIPAL DE API (ÚNICA)
  // ============================================

  /**
   * Función centralizada para chat con IA - EVITA DUPLICACIÓN
   */
  const chatWithAI = useCallback(async (messages, options = {}) => {
    console.log('🎯 AppContext.chatWithAI called with:', messages.length, 'messages');
    
    setIsLoading(true);
    setError(null);

    try {
      // Validar mensajes
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error(ERROR_MESSAGES.NO_MESSAGES);
      }

      // Limpiar mensajes
      const cleanMessages = messages.filter(msg => msg?.role && msg?.content?.trim());
      if (cleanMessages.length === 0) {
        throw new Error(ERROR_MESSAGES.NO_MESSAGES);
      }

      console.log('📤 Enviando', cleanMessages.length, 'mensajes limpios');

      let response;
      
      // ✅ OPCIÓN 1: Intentar backend primero
      if (isBackendConnected) {
        console.log('🔄 Usando backend conectado');
        try {
          response = await apiClient.chatWithAI(cleanMessages, {
            provider: options.provider || currentProvider,
            model: options.model || currentModel,
            ...options
          });
          console.log('✅ Respuesta del backend:', response);
        } catch (backendError) {
          console.warn('⚠️ Backend falló, cambiando a API directa:', backendError.message);
          // Fallback a API directa
          response = await callDirectAPI(cleanMessages, options);
        }
      } else {
        // ✅ OPCIÓN 2: API directa (sin backend)
        console.log('🔄 Usando API directa (sin backend)');
        response = await callDirectAPI(cleanMessages, options);
      }

      console.log('✅ Respuesta final:', response);
      return response;

    } catch (error) {
      console.error('❌ Error en chatWithAI:', error);
      const errorMsg = `Error: ${error.message}`;
      setError(errorMsg);
      
      // ✅ Generar respuesta de fallback si todo falla
      console.log('🔄 Generando respuesta de fallback');
      const fallbackResponse = generateFallbackResponse(
        cleanMessages[cleanMessages.length - 1]?.content || 'Error', 
        options.provider || currentProvider
      );
      
      return fallbackResponse;
    } finally {
      setIsLoading(false);
    }
  }, [isBackendConnected, currentProvider, currentModel]);

  /**
   * Llamada directa a API (importación dinámica para evitar problemas de inicialización)
   */
  const callDirectAPI = async (messages, options = {}) => {
    const provider = options.provider || currentProvider;
    const model = options.model || currentModel;
    
    console.log(`🏭 Llamando API directa: ${provider} con modelo ${model}`);

    try {
      // Importación dinámica del factory
      const { callFreeAIAPI } = await import('../services/api/aiServiceFactory');
      
      // Obtener API key actual
      const apiKey = localStorage.getItem(`api_key_${provider}`) || '';
      
      // Validar API key (excepto para Ollama)
      if (!apiKey && provider !== 'ollama') {
        throw new Error(ERROR_MESSAGES.NO_API_KEY(provider));
      }

      console.log(`🔑 Usando API key para ${provider}:`, apiKey ? '✅ Configurada' : '❌ Faltante');

      // Llamar API
      const response = await callFreeAIAPI(
        messages,
        apiKey,
        provider,
        model,
        false // isMobile - se detecta automáticamente en el factory
      );

      return response;
    } catch (error) {
      console.error(`❌ Error en API directa (${provider}):`, error);
      throw error;
    }
  };

  /**
   * Generar respuesta de fallback cuando todo falla
   */
  const generateFallbackResponse = (input, provider) => {
    console.log('🆘 Generando respuesta de fallback para:', input.substring(0, 50) + '...');
    
    // Respuesta básica de fallback
    return {
      content: `Lo siento, no pude conectar con ${provider.toUpperCase()} en este momento. 

**Posibles soluciones:**

1. **Verifica tu API Key** - Ve a ⚙️ Configuración y asegúrate de que tu API Key esté configurada correctamente
2. **Cambia de proveedor** - Prueba con otro proveedor disponible
3. **Revisa tu conexión** - Verifica que tengas acceso a internet

**Tu consulta era:** "${input}"

Una vez solucionado el problema, puedes repetir tu pregunta y obtendré una respuesta completa.

---
*⚠️ Esta es una respuesta de fallback porque ${provider} no está disponible.*`,
      usage: { total_tokens: 'N/A' },
      model: 'fallback',
      provider: 'sistema'
    };
  };

  // ============================================
  // 🔧 VERIFICACIÓN DE BACKEND (SIN BLOQUEAR)
  // ============================================

  const checkBackendConnection = useCallback(async () => {
    setConnectionStatus('checking');
    setError(null);
    
    try {
      const health = await apiClient.checkHealth();
      const isConnected = health.status === 'OK';
      
      setIsBackendConnected(isConnected);
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      setOfflineMode(!isConnected);
      
      if (isConnected) {
        console.log('✅ Backend conectado');
      } else {
        console.log('🟡 Backend desconectado, usando modo API directa');
      }
      
      return isConnected;
    } catch (err) {
      setIsBackendConnected(false);
      setConnectionStatus('disconnected');
      setOfflineMode(true);
      setError(`Backend error: ${err.message}`);
      console.warn('🔴 Backend no disponible:', err.message);
      return false;
    }
  }, []);

  // ============================================
  // 🔧 OTROS MÉTODOS DE API
  // ============================================

  const api = {
    // ✅ Método principal - evita duplicación
    chatWithAI,

    // Estado de IA
    getAIStatus: async () => {
      try {
        if (isBackendConnected) {
          const status = await apiClient.getAIStatus();
          return status;
        } else {
          // Status offline basado en API keys locales
          const availableProviders = constantsUtils.getAvailableProviders();
          const providers = {};
          
          availableProviders.forEach(provider => {
            providers[provider] = {
              available: constantsUtils.isProviderAvailable(provider),
              mode: 'direct_api'
            };
          });

          return {
            status: 'offline',
            providers
          };
        }
      } catch (err) {
        setError(`AI Status Error: ${err.message}`);
        return { status: 'error', error: err.message };
      }
    },

    // Subir archivos
    uploadFiles: async (files, projectName) => {
      if (isBackendConnected) {
        setIsLoading(true);
        try {
          const result = await apiClient.uploadFiles(files, projectName || currentProject);
          return result;
        } catch (err) {
          const errorMsg = `Upload Error: ${err.message}`;
          setError(errorMsg);
          throw new Error(errorMsg);
        } finally {
          setIsLoading(false);
        }
      } else {
        // ✅ Procesar archivos localmente
        const { processFiles } = await import('../services/fileService');
        return await processFiles(files, { maxFiles: APP_CONFIG.maxFiles });
      }
    },

    // Obtener conversaciones
    getConversations: async () => {
      try {
        if (isBackendConnected) {
          const convs = await apiClient.get('/conversations');
          setConversations(convs);
          return convs;
        } else {
          // ✅ Cargar conversaciones del localStorage
          const saved = localStorage.getItem('devai_conversations');
          const convs = saved ? JSON.parse(saved) : [];
          setConversations(convs);
          return convs;
        }
      } catch (err) {
        console.warn('Error obteniendo conversaciones:', err.message);
        return conversations;
      }
    },

    // Guardar conversación
    saveConversation: async (conversation) => {
      try {
        if (isBackendConnected) {
          const saved = await apiClient.post('/conversations', conversation);
          setConversations(prev => {
            const existing = prev.find(c => c.id === saved.id);
            if (existing) {
              return prev.map(c => c.id === saved.id ? saved : c);
            }
            return [saved, ...prev];
          });
          return saved;
        } else {
          // ✅ Guardar localmente
          const conversationWithId = {
            ...conversation,
            id: conversation.id || Date.now(),
            savedAt: new Date().toISOString()
          };
          
          const updated = [conversationWithId, ...conversations.filter(c => c.id !== conversationWithId.id)];
          setConversations(updated);
          localStorage.setItem('devai_conversations', JSON.stringify(updated.slice(0, APP_CONFIG.maxConversations)));
          
          return conversationWithId;
        }
      } catch (err) {
        console.warn('Error guardando conversación:', err.message);
        return null;
      }
    },

    // Limpiar errores
    clearError: () => setError(null),

    // Reconectar
    reconnect: async () => {
      console.log('🔄 Intentando reconectar...');
      const connected = await checkBackendConnection();
      if (connected) {
        await api.getConversations();
      }
      return connected;
    }
  };

  // ============================================
  // 🎛️ FUNCIONES DE UI
  // ============================================

  const ui = {
    toggleSettings: () => setShowSettings(prev => !prev),
    toggleSidebar: () => setShowSidebar(prev => !prev),
    toggleLivePreview: () => setShowLivePreview(prev => !prev),
    
    openSettings: () => setShowSettings(true),
    closeSettings: () => setShowSettings(false),
    
    openSidebar: () => setShowSidebar(true),
    closeSidebar: () => setShowSidebar(false),
  };

  // ============================================
  // 🔄 FUNCIONES DE CONVERSACIÓN
  // ============================================

  const conversation = {
    addMessage: (message) => {
      const newMessage = {
        ...message,
        id: message.id || Date.now(),
        timestamp: message.timestamp || new Date()
      };
      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    },

    clearMessages: () => setMessages([]),
    
    setMessages: (newMessages) => setMessages(newMessages),

    startNewConversation: () => {
      setCurrentConversationId(null);
      setMessages([]);
    },

    loadConversation: (conv) => {
      setCurrentConversationId(conv.id);
      setMessages(conv.messages || []);
    }
  };

  // ============================================
  // ⚙️ FUNCIONES DE CONFIGURACIÓN
  // ============================================

  const settings = {
    setProvider: (provider) => {
      console.log('🔄 Cambiando proveedor a:', provider);
      setCurrentProvider(provider);
      localStorage.setItem('devai_provider', provider);
    },
    
    setModel: (model) => {
      console.log('🧠 Cambiando modelo a:', model);
      setCurrentModel(model);
      localStorage.setItem('devai_model', model);
    },
    
    setProject: (project) => {
      setCurrentProject(project);
      localStorage.setItem('devai_project', project);
    },
    
    // ✅ Configurar API keys
    setApiKey: (provider, apiKey) => {
      console.log(`🔑 Configurando API Key para ${provider.toUpperCase()}`);
      localStorage.setItem(`api_key_${provider}`, apiKey);
      
      // Limpiar errores previos al configurar nueva key
      setError(null);
    },

    // ✅ Obtener API key actual
    getApiKey: (provider) => {
      return localStorage.getItem(`api_key_${provider}`) || '';
    },

    // ✅ Verificar si provider está configurado
    isProviderConfigured: (provider) => {
      if (provider === 'ollama') return true; // No necesita API key
      const apiKey = localStorage.getItem(`api_key_${provider}`);
      return !!apiKey && apiKey.length > 10;
    }
  };

  // ============================================
  // 📊 ESTADO COMPUTADO
  // ============================================

  const computed = {
    connectionInfo: {
      text: connectionStatus === 'checking' ? '🔄 Verificando...' :
            isBackendConnected ? '🟢 Backend Conectado' : 
            offlineMode ? '🟡 Modo API Directa' :
            `🔴 Desconectado${error ? ` (${error})` : ''}`,
      isConnected: isBackendConnected,
      canUseAPI: true, // ✅ Siempre permitir uso (backend o API directa)
      status: connectionStatus,
      offlineMode
    },

    projectInfo: {
      name: currentProject,
      messageCount: messages.length,
      hasMessages: messages.length > 0,
      currentProvider,
      currentModel
    },

    uiState: {
      showSettings,
      showSidebar,
      showLivePreview,
      isLoading,
      hasError: !!error
    },

    // ✅ Estado de proveedores
    providersInfo: {
      current: currentProvider,
      isCurrentConfigured: settings.isProviderConfigured(currentProvider),
      available: constantsUtils.getAvailableProviders(),
      configured: Object.keys(constantsUtils.getApiKeys()).filter(provider => 
        constantsUtils.isProviderAvailable(provider)
      )
    }
  };

  // ============================================
  // 🎯 VALOR DEL CONTEXTO
  // ============================================

  const contextValue = {
    // Estados principales
    isBackendConnected,
    isLoading,
    error,
    connectionStatus,
    offlineMode,
    
    // Estados de aplicación
    currentProject,
    setCurrentProject,
    currentProvider,
    setCurrentProvider,
    currentModel,
    setCurrentModel,

    // Estados de UI
    showSettings,
    showSidebar,
    showLivePreview,

    // Estados de conversación
    messages,
    conversations,
    currentConversationId,

    // Métodos agrupados
    api,
    ui,
    conversation,
    settings,
    computed,

    // ✅ Método principal para compatibilidad
    chatWithAI,
    
    // Otros métodos directos
    checkBackendConnection
  };

  // ============================================
  // 🚀 EFECTOS
  // ============================================

  // Cargar configuración guardada al iniciar
  useEffect(() => {
    const savedProvider = localStorage.getItem('devai_provider');
    const savedModel = localStorage.getItem('devai_model');
    const savedProject = localStorage.getItem('devai_project');
    
    if (savedProvider && constantsUtils.getAvailableProviders().includes(savedProvider)) {
      setCurrentProvider(savedProvider);
    }
    if (savedModel) {
      setCurrentModel(savedModel);
    }
    if (savedProject) {
      setCurrentProject(savedProject);
    }
  }, []);

  // Verificar conexión al iniciar (no bloquear)
  useEffect(() => {
    checkBackendConnection();
    
    // ✅ Verificar cada 30 segundos solo si estamos offline
    const interval = setInterval(() => {
      if (!isBackendConnected) {
        checkBackendConnection();
      }
    }, APP_CONFIG.connectionCheckInterval);
    
    return () => clearInterval(interval);
  }, [checkBackendConnection, isBackendConnected]);

  // Cargar conversaciones al conectar o al iniciar
  useEffect(() => {
    api.getConversations();
  }, [isBackendConnected]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// ============================================
// 🎣 HOOKS ESPECIALIZADOS
// ============================================

export const useBackendStatus = () => {
  const { computed, api, offlineMode } = useApp();
  return {
    ...computed.connectionInfo,
    reconnect: api.reconnect,
    offlineMode
  };
};

export const useAPI = () => {
  const { api, isLoading, error, offlineMode } = useApp();
  return {
    ...api,
    isLoading,
    error,
    offlineMode
  };
};

export const useConversations = () => {
  const { conversation, messages, conversations, currentConversationId } = useApp();
  return {
    messages,
    conversations,
    currentConversationId,
    ...conversation
  };
};

export const useSettings = () => {
  const { settings, computed, ui } = useApp();
  return {
    ...settings,
    ...computed.providersInfo,
    toggleSettings: ui.toggleSettings,
    openSettings: ui.openSettings,
    closeSettings: ui.closeSettings
  };
};

export const useUI = () => {
  const { ui, computed } = useApp();
  return {
    ...computed.uiState,
    ...ui
  };
};