// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../config/api';

// Crear contexto
const AppContext = createContext();

// Hook para usar el contexto en cualquier componente
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de AppProvider');
  }
  return context;
};

// Provider principal que envuelve toda la app
export const AppProvider = ({ children }) => {
  // Estados globales
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentProject, setCurrentProject] = useState('AI Dev Agent');
  const [apiStatus, setApiStatus] = useState('checking');

  // Verificar conexión con backend
  const checkBackendConnection = async () => {
    setApiStatus('checking');
    setError(null);
    
    try {
      const health = await apiClient.checkHealth();
      setIsBackendConnected(health.status === 'OK');
      setApiStatus('connected');
    } catch (err) {
      setIsBackendConnected(false);
      setApiStatus('disconnected');
      setError(err.message);
      console.warn('🔴 Backend desconectado:', err.message);
    }
  };

  // API Methods - Métodos que pueden usar todos los componentes
  const api = {
    // Chat con IA
    chatWithAI: async (messages, options = {}) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await apiClient.chatWithAI(messages, {
          provider: options.provider || 'gemini',
          model: options.model || 'gemini-1.5-flash',
          ...options
        });
        return response;
      } catch (err) {
        setError(`Chat Error: ${err.message}`);
        throw err;
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
        setError(`AI Status Error: ${err.message}`);
        throw err;
      }
    },

    // Subir archivos
    uploadFiles: async (files, projectName) => {
      setIsLoading(true);
      try {
        const result = await apiClient.uploadFiles(files, projectName || currentProject);
        return result;
      } catch (err) {
        setError(`Upload Error: ${err.message}`);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },

    // Limpiar errores
    clearError: () => setError(null),

    // Reconectar
    reconnect: checkBackendConnection
  };

  // Estados que se comparten globalmente
  const globalState = {
    // Estados de conexión
    isBackendConnected,
    isLoading,
    error,
    apiStatus,

    // Estados de aplicación
    currentProject,
    setCurrentProject,

    // Métodos API
    api,

    // Estado de conexión con texto legible
    connectionStatus: {
      text: apiStatus === 'checking' ? '🔄 Verificando...' :
            isBackendConnected ? '🟢 Conectado' : 
            `🔴 Desconectado${error ? ` (${error})` : ''}`,
      isConnected: isBackendConnected,
      canUseAPI: isBackendConnected && !isLoading
    }
  };

  // Verificar conexión al iniciar y cada 30 segundos
  useEffect(() => {
    checkBackendConnection();
    
    const interval = setInterval(checkBackendConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={globalState}>
      {children}
    </AppContext.Provider>
  );
};

// Hook específico para el estado de conexión
export const useBackendStatus = () => {
  const { connectionStatus, api } = useApp();
  return {
    ...connectionStatus,
    reconnect: api.reconnect
  };
};

// Hook específico para la API
export const useAPI = () => {
  const { api, isLoading, error } = useApp();
  return {
    api,
    isLoading,
    error
  };
};