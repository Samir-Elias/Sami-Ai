// src/context/APIContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../config/api';

// Crear el contexto
const APIContext = createContext();

// Hook personalizado para usar el contexto
export const useAPI = () => {
  const context = useContext(APIContext);
  if (!context) {
    throw new Error('useAPI debe ser usado dentro de un APIProvider');
  }
  return context;
};

// Provider del contexto
export const APIProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar conexión al backend
  const checkConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const health = await apiClient.checkHealth();
      setIsConnected(health.status === 'OK');
    } catch (err) {
      setIsConnected(false);
      setError(err.message);
      console.warn('Backend no disponible:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Métodos de la API envueltos con manejo de errores
  const api = {
    // Chat con IA
    chatWithAI: async (messages, options = {}) => {
      try {
        setIsLoading(true);
        const response = await apiClient.chatWithAI(messages, options);
        return response;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },

    // Estado de la IA
    getAIStatus: async () => {
      try {
        return await apiClient.getAIStatus();
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },

    // Subir archivos
    uploadFiles: async (files, projectName) => {
      try {
        setIsLoading(true);
        const response = await apiClient.uploadFiles(files, projectName);
        return response;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },

    // Limpiar errores
    clearError: () => setError(null),

    // Reconectar
    reconnect: checkConnection
  };

  // Verificar conexión al montar y cada 30 segundos
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const value = {
    api,
    isConnected,
    isLoading,
    error,
    client: apiClient // Acceso directo si lo necesitas
  };

  return (
    <APIContext.Provider value={value}>
      {children}
    </APIContext.Provider>
  );
};

// Hook para mostrar estado de conexión
export const useConnectionStatus = () => {
  const { isConnected, isLoading, error, api } = useAPI();
  
  return {
    isConnected,
    isLoading, 
    error,
    reconnect: api.reconnect,
    statusText: isLoading ? 'Conectando...' : 
                isConnected ? 'Conectado' : 
                error ? `Error: ${error}` : 'Desconectado'
  };
};