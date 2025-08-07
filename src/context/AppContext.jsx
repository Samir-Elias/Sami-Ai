// ============================================
// 🌐 CONTEXTO PRINCIPAL UNIFICADO - DevAI Agent CORREGIDO
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../config/api';

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
  const [canUseOffline, setCanUseOffline] = useState(true); // ✅ Permitir uso offline

  // Estados de aplicación
  const [currentProject, setCurrentProject] = useState('AI Dev Agent');
  const [currentProvider, setCurrentProvider] = useState('gemini');
  const [currentModel, setCurrentModel] = useState('gemini-1.5-flash');
  
  // Estados de UI
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Estados de conversación
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);

  // ✅ Estado para modo degradado sin backend
  const [offlineMode, setOfflineMode] = useState(false);

  // ============================================
  // 🔧 FUNCIONES DE API
  // ============================================

  /**
   * Verificar conexión con backend (no bloquear si falla)
   */
  const checkBackendConnection = useCallback(async () => {
    setConnectionStatus('checking');
    setError(null);
    
    try {
      const health = await apiClient.checkHealth();
      setIsBackendConnected(health.status === 'OK');
      setConnectionStatus('connected');
      setOfflineMode(false);
      return true;
    } catch (err) {
      setIsBackendConnected(false);
      setConnectionStatus('disconnected');
      setOfflineMode(true); // ✅ Activar modo offline
      setError(err.message);
      console.warn('🟡 Backend desconectado, usando modo offline:', err.message);
      return false;
    }
  }, []);

  /**
   * Métodos de API centralizados (con fallback offline)
   */
  const api = {
    // Chat con IA (con fallback a API directa)
    chatWithAI: async (messages, options = {}) => {
      setIsLoading(true);
      setError(null);
      
      try {
        // ✅ Intentar backend primero, luego API directa
        if (isBackendConnected) {
          const response = await apiClient.chatWithAI(messages, {
            provider: options.provider || currentProvider,
            model: options.model || currentModel,
            ...options
          });
          return response;
        } else {
          // ✅ Fallback a API directa (importar el service factory)
          const { callFreeAIAPI } = await import('../services/api/aiServiceFactory');
          const { API_KEYS } = await import('../utils/constants');
          
          const provider = options.provider || currentProvider;
          const apiKey = API_KEYS[provider];
          
          if (!apiKey && provider !== 'ollama') {
            throw new Error(`Configura tu API Key para ${provider.toUpperCase()} en Settings`);
          }
          
          const response = await callFreeAIAPI(
            messages,
            apiKey,
            provider,
            options.model || currentModel,
            false // isMobile
          );
          
          return response;
        }
      } catch (err) {
        const errorMsg = `Chat Error: ${err.message}`;
        setError(errorMsg);
        
        // ✅ Generar respuesta de fallback si todo falla
        const { generateFallbackResponse } = await import('../services/api/aiServiceFactory');
        const lastMessage = messages[messages.length - 1];
        const fallbackResponse = generateFallbackResponse(lastMessage?.content || 'Error', currentProvider);
        
        return fallbackResponse;
      } finally {
        setIsLoading(false);
      }
    },

    // Estado de IA
    getAIStatus: async () => {
      try {
        if (isBackendConnected) {
          const status = await apiClient.getAIStatus();
          return status;
        } else {
          // ✅ Status offline
          return {
            status: 'offline',
            providers: {
              [currentProvider]: {
                available: !!localStorage.getItem(`api_key_${currentProvider}`),
                mode: 'direct_api'
              }
            }
          };
        }
      } catch (err) {
        const errorMsg = `AI Status Error: ${err.message}`;
        setError(errorMsg);
        return { status: 'error', error: errorMsg };
      }
    },

    // Subir archivos (opcional si no hay backend)
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
        return await processFiles(files, { maxFiles: 10 });
      }
    },

    // Obtener conversaciones (local si no hay backend)
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
        return conversations; // Devolver las que ya tenemos
      }
    },

    // Guardar conversación (local si no hay backend)
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
          localStorage.setItem('devai_conversations', JSON.stringify(updated.slice(0, 50)));
          
          return conversationWithId;
        }
      } catch (err) {
        console.warn('Error guardando conversación:', err.message);
        return null;
      }
    },

    // Limpiar errores
    clearError: () => setError(null),

    // Reconectar (intentar salir del modo offline)
    reconnect: async () => {
      console.log('🔄 Intentando reconectar...');
      const connected = await checkBackendConnection();
      if (connected) {
        await api.getConversations(); // Sincronizar conversaciones
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
      setMessages(prev => [...prev, {
        ...message,
        id: Date.now(),
        timestamp: new Date()
      }]);
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
  // ⚙️ FUNCIONES DE CONFIGURACIÓN (sin restricciones)
  // ============================================

  const settings = {
    setProvider: (provider) => {
      console.log('🔄 Cambiando proveedor a:', provider);
      setCurrentProvider(provider);
      
      // ✅ Guardar configuración localmente
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
    
    // ✅ Nueva función para configurar API keys
    setApiKey: (provider, apiKey) => {
      localStorage.setItem(`api_key_${provider}`, apiKey);
      console.log(`✅ API Key configurada para ${provider.toUpperCase()}`);
    }
  };

  // ============================================
  // 📊 ESTADO COMPUTADO
  // ============================================

  const computed = {
    // Estado de conexión con texto legible
    connectionInfo: {
      text: connectionStatus === 'checking' ? '🔄 Verificando...' :
            isBackendConnected ? '🟢 Backend Conectado' : 
            offlineMode ? '🟡 Modo Offline (API Directa)' :
            `🔴 Backend Desconectado${error ? ` (${error})` : ''}`,
      isConnected: isBackendConnected,
      canUseAPI: isBackendConnected || canUseOffline, // ✅ Permitir API directa
      status: connectionStatus,
      offlineMode
    },

    // Información del proyecto
    projectInfo: {
      name: currentProject,
      messageCount: messages.length,
      hasMessages: messages.length > 0,
      currentProvider,
      currentModel
    },

    // Estado de UI
    uiState: {
      showSettings,
      showSidebar,
      showLivePreview,
      isLoading,
      hasError: !!error
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
    offlineMode, // ✅ Exponer modo offline
    
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

    // Métodos directos más usados (para compatibilidad)
    checkBackendConnection,
    chatWithAI: api.chatWithAI,
    reconnect: api.reconnect
  };

  // ============================================
  // 🚀 EFECTOS
  // ============================================

  // Cargar configuración guardada al iniciar
  useEffect(() => {
    const savedProvider = localStorage.getItem('devai_provider');
    const savedModel = localStorage.getItem('devai_model');
    const savedProject = localStorage.getItem('devai_project');
    
    if (savedProvider) setCurrentProvider(savedProvider);
    if (savedModel) setCurrentModel(savedModel);
    if (savedProject) setCurrentProject(savedProject);
  }, []);

  // Verificar conexión al iniciar (no bloquear)
  useEffect(() => {
    checkBackendConnection();
    
    // ✅ Verificar cada 30 segundos solo si estamos offline
    const interval = setInterval(() => {
      if (!isBackendConnected) {
        checkBackendConnection();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [checkBackendConnection, isBackendConnected]);

  // Cargar conversaciones al conectar o al iniciar
  useEffect(() => {
    api.getConversations();
  }, [isBackendConnected]); // Cargar tanto online como offline

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// ============================================
// 🎣 HOOKS ESPECIALIZADOS (actualizados)
// ============================================

/**
 * Hook para estado de conexión del backend
 */
export const useBackendStatus = () => {
  const { computed, api, offlineMode } = useApp();
  return {
    ...computed.connectionInfo,
    reconnect: api.reconnect,
    offlineMode
  };
};

/**
 * Hook para métodos de API
 */
export const useAPI = () => {
  const { api, isLoading, error, offlineMode } = useApp();
  return {
    api,
    isLoading,
    error,
    offlineMode
  };
};

/**
 * Hook para manejo de conversaciones
 */
export const useConversations = () => {
  const { conversation, messages, conversations, currentConversationId } = useApp();
  return {
    messages,
    conversations,
    currentConversationId,
    ...conversation
  };
};

/**
 * Hook para configuraciones (sin restricciones)
 */
export const useSettings = () => {
  const { settings, currentProvider, currentModel, currentProject, ui } = useApp();
  return {
    currentProvider,
    currentModel,
    currentProject,
    ...settings,
    toggleSettings: ui.toggleSettings,
    openSettings: ui.openSettings,
    closeSettings: ui.closeSettings
  };
};

/**
 * Hook para UI state
 */
export const useUI = () => {
  const { ui, computed } = useApp();
  return {
    ...computed.uiState,
    ...ui
  };
};