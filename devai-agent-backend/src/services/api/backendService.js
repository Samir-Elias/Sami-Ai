// src/services/api/backendService.js
// ============================================
// 🔗 SERVICIO DE BACKEND PARA FRONTEND - CommonJS
// ============================================

const { BACKEND_CONFIG } = require('../../utils/constants');

// =================================
// 🌐 CLIENTE HTTP PARA BACKEND
// =================================

class BackendHTTPClient {
  constructor() {
    this.baseUrl = BACKEND_CONFIG.BASE_URL;
    this.timeout = BACKEND_CONFIG.TIMEOUT;
    this.retryAttempts = BACKEND_CONFIG.RETRY_ATTEMPTS;
    this.retryDelay = BACKEND_CONFIG.RETRY_DELAY;
  }

  /**
   * Request HTTP con reintentos
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    };

    let lastError;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...config,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          error.status = response.status;
          error.response = errorData;
          throw error;
        }

        const data = await response.json();
        return data;

      } catch (error) {
        lastError = error;
        
        // No reintentar en ciertos errores
        if (
          error.name === 'AbortError' ||
          error.status === 400 ||
          error.status === 401 ||
          error.status === 403 ||
          error.status === 404 ||
          attempt === this.retryAttempts - 1
        ) {
          break;
        }

        // Esperar antes del siguiente intento
        await new Promise(resolve => 
          setTimeout(resolve, this.retryDelay * Math.pow(2, attempt))
        );
      }
    }

    throw lastError;
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(fullEndpoint, { method: 'GET' });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

const httpClient = new BackendHTTPClient();

// =================================
// 🏥 VERIFICACIÓN DE SALUD
// =================================

/**
 * Verificar si el backend está disponible
 */
const isBackendAvailable = async () => {
  try {
    const response = await httpClient.get('/health');
    return response && response.status === 'ok';
  } catch (error) {
    console.warn('Backend no disponible:', error.message);
    return false;
  }
};

/**
 * Obtener estado completo del backend
 */
const checkBackendHealth = async () => {
  try {
    const health = await httpClient.get('/health');
    return {
      isHealthy: health.status === 'ok',
      data: health
    };
  } catch (error) {
    return {
      isHealthy: false,
      error: error.message,
      data: null
    };
  }
};

// =================================
// 🤖 SERVICIOS DE IA
// =================================

/**
 * Enviar mensaje de chat al backend
 */
const sendChatMessage = async (messages, options = {}) => {
  try {
    const response = await httpClient.post('/api/ai/chat', {
      messages,
      provider: options.provider || 'gemini',
      model: options.model,
      apiKey: options.apiKey,
      options: {
        maxTokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.7,
        timeout: options.timeout || 30000
      }
    });

    if (response.success) {
      return {
        success: true,
        content: response.content,
        model: response.model,
        usage: response.usage,
        provider: response.provider,
        source: 'backend'
      };
    } else {
      throw new Error(response.error || 'Error desconocido del backend');
    }
  } catch (error) {
    console.error('Error en sendChatMessage:', error.message);
    throw new Error(`Backend AI Error: ${error.message}`);
  }
};

/**
 * Obtener estado de proveedores de IA
 */
const getApiStatus = async () => {
  try {
    const response = await httpClient.get('/api/ai/providers/status');
    return response.providers || {};
  } catch (error) {
    console.warn('Error obteniendo estado de APIs:', error.message);
    return {};
  }
};

/**
 * Probar conexión con proveedor específico
 */
const testProviderConnection = async (provider) => {
  try {
    const response = await httpClient.post('/api/ai/providers/test', {
      provider
    });
    
    return {
      available: response.available,
      latency: response.latency,
      error: response.error
    };
  } catch (error) {
    return {
      available: false,
      latency: null,
      error: error.message
    };
  }
};

// =================================
// 📁 SERVICIOS DE ARCHIVOS
// =================================

/**
 * Subir archivos al backend
 */
const uploadFiles = async (files, projectName) => {
  try {
    const formData = new FormData();
    
    // Agregar archivos
    Array.from(files).forEach((file, index) => {
      formData.append(`files`, file);
    });
    
    // Agregar metadatos
    formData.append('projectName', projectName);
    formData.append('uploadedAt', new Date().toISOString());

    const response = await httpClient.request('/api/files/upload', {
      method: 'POST',
      body: formData,
      headers: {
        // No establecer Content-Type para FormData
      }
    });

    if (response.success) {
      return {
        success: true,
        project: response.project,
        source: 'backend'
      };
    } else {
      throw new Error(response.error || 'Error subiendo archivos');
    }
  } catch (error) {
    console.error('Error en uploadFiles:', error.message);
    throw new Error(`Upload Error: ${error.message}`);
  }
};

/**
 * Analizar archivos existentes
 */
const analyzeFiles = async (projectId, options = {}) => {
  try {
    const response = await httpClient.post(`/api/files/analyze/${projectId}`, {
      options
    });

    return response.analysis || {};
  } catch (error) {
    console.error('Error analizando archivos:', error.message);
    throw new Error(`Analysis Error: ${error.message}`);
  }
};

// =================================
// 💾 SERVICIOS DE CONVERSACIONES
// =================================

/**
 * Guardar conversación en el backend
 */
const saveConversation = async (messages, metadata = {}) => {
  try {
    const response = await httpClient.post('/api/conversations', {
      messages,
      title: metadata.title || generateConversationTitle(messages),
      metadata
    });

    if (response.success) {
      return {
        id: response.conversation.id,
        ...response.conversation
      };
    } else {
      throw new Error(response.error || 'Error guardando conversación');
    }
  } catch (error) {
    console.error('Error en saveConversation:', error.message);
    return null; // Fallback silencioso
  }
};

/**
 * Obtener conversaciones del backend
 */
const getConversations = async (options = {}) => {
  try {
    const params = {
      page: options.page || 1,
      limit: options.limit || 50,
      sortBy: options.sortBy || 'updatedAt',
      sortOrder: options.sortOrder || 'desc'
    };

    const response = await httpClient.get('/api/conversations', params);
    return response.conversations || [];
  } catch (error) {
    console.error('Error obteniendo conversaciones:', error.message);
    return [];
  }
};

/**
 * Obtener conversación específica
 */
const getConversation = async (conversationId) => {
  try {
    const response = await httpClient.get(`/api/conversations/${conversationId}`);
    return response.conversation || null;
  } catch (error) {
    console.error('Error obteniendo conversación:', error.message);
    return null;
  }
};

/**
 * Eliminar conversación
 */
const deleteConversation = async (conversationId) => {
  try {
    const response = await httpClient.delete(`/api/conversations/${conversationId}`);
    return response.success || false;
  } catch (error) {
    console.error('Error eliminando conversación:', error.message);
    return false;
  }
};

/**
 * Actualizar conversación
 */
const updateConversation = async (conversationId, updates) => {
  try {
    const response = await httpClient.put(`/api/conversations/${conversationId}`, updates);
    return response.success ? response.conversation : null;
  } catch (error) {
    console.error('Error actualizando conversación:', error.message);
    return null;
  }
};

// =================================
// ⚙️ SERVICIOS DE CONFIGURACIÓN
// =================================

/**
 * Obtener configuración del usuario
 */
const getUserSettings = async () => {
  try {
    const response = await httpClient.get('/api/settings');
    return response.settings || {};
  } catch (error) {
    console.error('Error obteniendo configuración:', error.message);
    return {};
  }
};

/**
 * Guardar configuración del usuario
 */
const saveUserSettings = async (settings) => {
  try {
    const response = await httpClient.post('/api/settings', { settings });
    return response.success || false;
  } catch (error) {
    console.error('Error guardando configuración:', error.message);
    return false;
  }
};

// =================================
// 📊 SERVICIOS DE MÉTRICAS
// =================================

/**
 * Enviar métricas de uso
 */
const sendMetrics = async (metrics) => {
  try {
    await httpClient.post('/api/metrics', { metrics });
    return true;
  } catch (error) {
    // Fallar silenciosamente para métricas
    console.warn('Error enviando métricas:', error.message);
    return false;
  }
};

/**
 * Obtener estadísticas del usuario
 */
const getUserStats = async () => {
  try {
    const response = await httpClient.get('/api/stats');
    return response.stats || {};
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error.message);
    return {};
  }
};

// =================================
// 🔧 UTILIDADES
// =================================

/**
 * Generar título de conversación
 */
const generateConversationTitle = (messages) => {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (!firstUserMessage) return 'Nueva Conversación';
  
  const content = firstUserMessage.content.substring(0, 50).trim();
  return content.length < firstUserMessage.content.length 
    ? `${content}...` 
    : content;
};

/**
 * Verificar conectividad básica
 */
const ping = async () => {
  try {
    const start = Date.now();
    await httpClient.get('/ping');
    return Date.now() - start;
  } catch (error) {
    throw new Error(`Ping failed: ${error.message}`);
  }
};

/**
 * Obtener información del servidor
 */
const getServerInfo = async () => {
  try {
    const response = await httpClient.get('/info');
    return response;
  } catch (error) {
    console.error('Error obteniendo info del servidor:', error.message);
    return {
      version: 'unknown',
      status: 'error',
      uptime: 0
    };
  }
};

// =================================
// EXPORTACIONES
// =================================

module.exports = {
  // Cliente HTTP
  BackendHTTPClient,
  httpClient,
  
  // Salud del sistema
  isBackendAvailable,
  checkBackendHealth,
  ping,
  getServerInfo,
  
  // Servicios de IA
  sendChatMessage,
  getApiStatus,
  testProviderConnection,
  
  // Servicios de archivos
  uploadFiles,
  analyzeFiles,
  
  // Servicios de conversaciones
  saveConversation,
  getConversations,
  getConversation,
  deleteConversation,
  updateConversation,
  
  // Configuración
  getUserSettings,
  saveUserSettings,
  
  // Métricas
  sendMetrics,
  getUserStats,
  
  // Utilidades
  generateConversationTitle
};