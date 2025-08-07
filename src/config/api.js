// src/config/api.js - Configuración de API para tu React
import { useState, useEffect } from 'react';

const API_CONFIG = {
  // Backend URL
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  
  // Endpoints
  ENDPOINTS: {
    // IA
    AI_CHAT: '/ai/chat',
    AI_STATUS: '/ai/status', 
    AI_MODELS: '/ai/models',
    
    // Archivos
    FILES_UPLOAD: '/files/upload',
    FILES_ANALYZE: '/files/analyze',
    
    // Conversaciones
    CONVERSATIONS: '/conversations',
    
    // Sistema
    HEALTH: '/health'
  },
  
  // Headers por defecto
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // Timeouts
  TIMEOUT: 30000, // 30 segundos
  
  // Configuración por ambiente
  DEVELOPMENT: {
    BASE_URL: 'http://localhost:5000',
    CORS_ENABLED: true,
    LOG_REQUESTS: true
  },
  
  PRODUCTION: {
    BASE_URL: 'https://tu-backend-en-produccion.com',
    CORS_ENABLED: false,
    LOG_REQUESTS: false
  }
};

// Cliente HTTP mejorado
export class APIClient {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      ...options,
      headers: {
        ...API_CONFIG.DEFAULT_HEADERS,
        ...options.headers
      }
    };

    // Log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ API Response: ${endpoint}`, data);
      }
      
      return data;
    } catch (error) {
      console.error(`❌ API Error: ${endpoint}`, error);
      throw error;
    }
  }

  // Métodos de conveniencia
  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Métodos específicos para tu app
  async chatWithAI(messages, options = {}) {
    return this.post(API_CONFIG.ENDPOINTS.AI_CHAT, {
      messages,
      provider: options.provider || 'gemini',
      model: options.model || 'gemini-1.5-flash',
      apiKey: options.apiKey,
      ...options
    });
  }

  async getAIStatus() {
    return this.get(API_CONFIG.ENDPOINTS.AI_STATUS);
  }

  async uploadFiles(files, projectName) {
    const formData = new FormData();
    
    // Agregar archivos
    files.forEach(file => {
      formData.append('files', file);
    });
    
    // Agregar metadata
    formData.append('projectName', projectName);
    
    return this.request(API_CONFIG.ENDPOINTS.FILES_UPLOAD, {
      method: 'POST',
      body: formData,
      headers: {} // No establecer Content-Type para FormData
    });
  }

  async checkHealth() {
    return this.get(API_CONFIG.ENDPOINTS.HEALTH);
  }
}

// 🔥 ESTA ES LA LÍNEA CLAVE QUE FALTABA:
// Crear e exportar la instancia singleton
export const apiClient = new APIClient();

// Hook React para verificar conexión con backend
export const useBackendConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState(null);

  const checkConnection = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const health = await apiClient.checkHealth();
      setIsConnected(health.status === 'OK');
    } catch (err) {
      setIsConnected(false);
      setError(err.message);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Verificar cada 30 segundos
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  return { isConnected, isChecking, error, checkConnection };
};

// Exportaciones
export default API_CONFIG;

// También puedes exportar métodos específicos si los necesitas
export const { 
  chatWithAI, 
  getAIStatus, 
  uploadFiles, 
  checkHealth 
} = apiClient;