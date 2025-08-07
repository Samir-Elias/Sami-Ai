// ============================================
// 🌐 CONTEXTO PRINCIPAL UNIFICADO - DevAI Agent
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

  // ============================================
  // 🔧 FUNCIONES DE API
  // ============================================

  /**
   * Verificar conexión con backend
   */
  const checkBackendConnection = useCallback(async () => {
    setConnectionStatus('checking');
    setError(null);
    
    try {
      const health = await apiClient.checkHealth();
      setIsBackendConnected(health.status === 'OK');
      setConnectionStatus('connected');
      return true;
    } catch (err) {
      setIsBackendConnected(false);
      setConnectionStatus('disconnected');
      setError(err.message);
      console.warn('🔴 Backend desconectado:', err.message);
      return false;
    }
  }, []);

  /**
   * Métodos de API centralizados
   */
  const api = {
    // Chat con IA
    chatWithAI: async (messages, options = {}) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await apiClient.chatWithAI(messages, {
          provider: options.provider || currentProvider,
          model: options.model || currentModel,
          ...options
        });
        return response;
      } catch (err) {
        const errorMsg = `Chat Error: ${err.message}`;
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },

    // Estado de IA
    getAIStatus: async () => {
      try {
        const status = await apiClient.getAIStatus();
        return status;
      } catch (err) {
        const errorMsg = `AI Status Error: ${err.message}`;
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    },

    // Subir archivos
    uploadFiles: async (files, projectName) => {
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
    },

    // Obtener conversaciones
    getConversations: async () => {
      try {
        const convs = await apiClient.get('/conversations');
        setConversations(convs);
        return convs;
      } catch (err) {
        console.warn('Error obteniendo conversaciones:', err.message);
        return [];
      }
    },

    // Guardar conversación
    saveConversation: async (conversation) => {
      try {
        const saved = await apiClient.post('/conversations', conversation);
        setConversations(prev => {
          const existing = prev.find(c => c.id === saved.id);
          if (existing) {
            return prev.map(c => c.id === saved.id ? saved : c);
          }
          return [saved, ...prev];
        });
        return saved;
      } catch (err) {
        console.warn('Error guardando conversación:', err.message);
        return null;
      }
    },

    // Limpiar errores
    clearError: () => setError(null),

    // Reconectar
    reconnect: checkBackendConnection
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
  // ⚙️ FUNCIONES DE CONFIGURACIÓN
  // ============================================

  const settings = {
    setProvider: (provider) => setCurrentProvider(provider),
    setModel: (model) => setCurrentModel(model),
    setProject: (project) => setCurrentProject(project),
  };

  // ============================================
  // 📊 ESTADO COMPUTADO
  // ============================================

  const computed = {
    // Estado de conexión con texto legible
    connectionInfo: {
      text: connectionStatus === 'checking' ? '🔄 Verificando...' :
            isBackendConnected ? '🟢 Backend Conectado' : 
            `🔴 Backend Desconectado${error ? ` (${error})` : ''}`,
      isConnected: isBackendConnected,
      canUseAPI: isBackendConnected && !isLoading,
      status: connectionStatus
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

  // Verificar conexión al iniciar y cada 30 segundos
  useEffect(() => {
    checkBackendConnection();
    
    const interval = setInterval(checkBackendConnection, 30000);
    return () => clearInterval(interval);
  }, [checkBackendConnection]);

  // Cargar conversaciones al conectar
  useEffect(() => {
    if (isBackendConnected) {
      api.getConversations();
    }
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

/**
 * Hook para estado de conexión del backend
 */
export const useBackendStatus = () => {
  const { computed, api } = useApp();
  return {
    ...computed.connectionInfo,
    reconnect: api.reconnect
  };
};

/**
 * Hook para métodos de API
 */
export const useAPI = () => {
  const { api, isLoading, error } = useApp();
  return {
    api,
    isLoading,
    error
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
 * Hook para configuraciones
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