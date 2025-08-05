// ============================================
// 🔍 API STATUS HOOK
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { API_KEYS, API_LIMITS } from '../utils/constants';
import { validateGeminiKey } from '../services/api/geminiService';
import { validateGroqKey } from '../services/api/groqService';
import { validateHuggingFaceKey } from '../services/api/huggingfaceService';
import { checkOllamaStatus } from '../services/api/ollamaService';

/**
 * Hook para verificar el estado de las APIs
 * @param {boolean} isMobile - Si es dispositivo móvil
 * @returns {Object} Estado de las APIs y métodos
 */
export const useApiStatus = (isMobile = false) => {
  const [apiStatus, setApiStatus] = useState({
    gemini: { icon: '🏆', available: false, error: null, lastChecked: null },
    groq: { icon: '⚡', available: false, error: null, lastChecked: null },
    huggingface: { icon: '🤗', available: false, error: null, lastChecked: null },
    ollama: { icon: '🏠', available: false, error: null, lastChecked: null }
  });

  const [isChecking, setIsChecking] = useState(false);
  const [lastGlobalCheck, setLastGlobalCheck] = useState(null);

  /**
   * Verificar el estado de un proveedor específico
   * @param {string} provider - Proveedor a verificar
   */
  const checkProviderStatus = useCallback(async (provider) => {
    const apiKey = API_KEYS[provider];
    const now = new Date();

    try {
      let available = false;
      let error = null;

      switch (provider) {
        case 'gemini':
          if (apiKey) {
            available = await validateGeminiKey(apiKey);
            error = available ? null : 'API Key inválida';
          } else {
            error = 'Sin API Key';
          }
          break;

        case 'groq':
          if (apiKey) {
            available = await validateGroqKey(apiKey);
            error = available ? null : 'API Key inválida';
          } else {
            error = 'Sin API Key';
          }
          break;

        case 'huggingface':
          if (isMobile) {
            error = 'No disponible en móvil';
          } else if (apiKey) {
            available = await validateHuggingFaceKey(apiKey);
            error = available ? null : 'API Key inválida';
          } else {
            error = 'Sin API Key';
          }
          break;

        case 'ollama':
          if (isMobile) {
            error = 'No disponible en móvil';
          } else {
            available = await checkOllamaStatus();
            error = available ? null : 'No ejecutándose';
          }
          break;

        default:
          error = 'Proveedor no soportado';
      }

      setApiStatus(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          available,
          error,
          lastChecked: now,
          icon: available ? '🟢' : (error === 'Sin API Key' ? '🟡' : '🔴')
        }
      }));

    } catch (checkError) {
      console.error(`Error verificando ${provider}:`, checkError);
      setApiStatus(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          available: false,
          error: checkError.message || 'Error de conexión',
          lastChecked: now,
          icon: '🔴'
        }
      }));
    }
  }, [isMobile]);

  /**
   * Verificar el estado de todas las APIs
   */
  const checkAllApis = useCallback(async () => {
    setIsChecking(true);
    const now = new Date();

    try {
      // Determinar qué APIs verificar según el dispositivo
      const apisToCheck = isMobile ? ['gemini', 'groq'] : ['gemini', 'groq', 'huggingface', 'ollama'];

      // Verificar todas las APIs en paralelo
      await Promise.allSettled(
        apisToCheck.map(provider => checkProviderStatus(provider))
      );

      setLastGlobalCheck(now);
    } catch (error) {
      console.error('Error en verificación global:', error);
    } finally {
      setIsChecking(false);
    }
  }, [isMobile, checkProviderStatus]);

  /**
   * Obtener proveedores disponibles
   */
  const getAvailableProviders = useCallback(() => {
    return Object.entries(apiStatus)
      .filter(([provider, status]) => {
        // En móvil, excluir proveedores no compatibles
        if (isMobile && (provider === 'huggingface' || provider === 'ollama')) {
          return false;
        }
        return status.available;
      })
      .map(([provider]) => provider);
  }, [apiStatus, isMobile]);

  /**
   * Obtener el mejor proveedor disponible
   */
  const getBestProvider = useCallback(() => {
    const available = getAvailableProviders();
    
    // Orden de prioridad
    const priority = isMobile ? ['gemini', 'groq'] : ['gemini', 'groq', 'huggingface', 'ollama'];
    
    for (const provider of priority) {
      if (available.includes(provider)) {
        return provider;
      }
    }

    return null;
  }, [getAvailableProviders, isMobile]);

  /**
   * Verificar si hay al menos un proveedor disponible
   */
  const hasAvailableProvider = useCallback(() => {
    return getAvailableProviders().length > 0;
  }, [getAvailableProviders]);

  /**
   * Obtener estadísticas de estado
   */
  const getStatusStats = useCallback(() => {
    const providers = Object.keys(apiStatus);
    const availableCount = providers.filter(p => apiStatus[p].available).length;
    const totalCount = isMobile ? 2 : 4; // Solo contar los relevantes para el dispositivo

    return {
      available: availableCount,
      total: totalCount,
      percentage: Math.round((availableCount / totalCount) * 100),
      allOnline: availableCount === totalCount,
      noneOnline: availableCount === 0
    };
  }, [apiStatus, isMobile]);

  /**
   * Resetear estado de un proveedor
   */
  const resetProviderStatus = useCallback((provider) => {
    setApiStatus(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        available: false,
        error: null,
        lastChecked: null,
        icon: API_LIMITS[provider]?.icon || '❓'
      }
    }));
  }, []);

  /**
   * Actualizar API key y re-verificar
   */
  const updateApiKey = useCallback(async (provider, newApiKey) => {
    // Actualizar la key en el objeto API_KEYS (esto es temporal, en producción se haría diferente)
    API_KEYS[provider] = newApiKey;
    
    // Re-verificar el proveedor
    await checkProviderStatus(provider);
  }, [checkProviderStatus]);

  // Verificación inicial al montar el componente
  useEffect(() => {
    const timer = setTimeout(() => {
      checkAllApis();
    }, 1000); // Pequeño delay para evitar calls inmediatos

    return () => clearTimeout(timer);
  }, [checkAllApis]);

  // Re-verificar cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      checkAllApis();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [checkAllApis]);

  return {
    // Estado
    apiStatus,
    isChecking,
    lastGlobalCheck,

    // Métodos de verificación
    checkProviderStatus,
    checkAllApis,
    updateApiKey,
    resetProviderStatus,

    // Métodos de consulta
    getAvailableProviders,
    getBestProvider,
    hasAvailableProvider,
    getStatusStats
  };
};

/**
 * Hook simplificado para obtener solo el estado de las APIs
 * @param {boolean} isMobile - Si es dispositivo móvil
 * @returns {Object} Estado de las APIs
 */
export const useApiStatusSimple = (isMobile = false) => {
  const { apiStatus, isChecking, hasAvailableProvider } = useApiStatus(isMobile);
  
  return {
    apiStatus,
    isChecking,
    hasAvailableProvider: hasAvailableProvider()
  };
};

/**
 * Hook para verificar si una API específica está disponible
 * @param {string} provider - Proveedor a verificar
 * @param {boolean} isMobile - Si es dispositivo móvil
 * @returns {Object} Estado del proveedor específico
 */
export const useProviderStatus = (provider, isMobile = false) => {
  const { apiStatus, checkProviderStatus } = useApiStatus(isMobile);
  
  const providerStatus = apiStatus[provider] || {
    available: false,
    error: 'Proveedor no encontrado',
    icon: '❓'
  };

  return {
    ...providerStatus,
    refresh: () => checkProviderStatus(provider)
  };
};

/**
 * Utilidades para el estado de APIs
 */
export const apiStatusUtils = {
  /**
   * Convierte el estado a un formato legible
   * @param {Object} status - Estado de la API
   * @returns {string} Estado legible
   */
  getReadableStatus: (status) => {
    if (status.available) return 'Disponible';
    if (status.error === 'Sin API Key') return 'Sin configurar';
    if (status.error === 'No disponible en móvil') return 'No compatible';
    if (status.error === 'No ejecutándose') return 'Desconectado';
    return 'Error';
  },

  /**
   * Obtiene el color del estado
   * @param {Object} status - Estado de la API
   * @returns {string} Color CSS
   */
  getStatusColor: (status) => {
    if (status.available) return '#10b981'; // Verde
    if (status.error === 'Sin API Key') return '#eab308'; // Amarillo
    return '#ef4444'; // Rojo
  },

  /**
   * Determina si se debe mostrar el proveedor en la UI
   * @param {string} provider - Nombre del proveedor
   * @param {boolean} isMobile - Si es dispositivo móvil
   * @returns {boolean} True si se debe mostrar
   */
  shouldShowProvider: (provider, isMobile) => {
    if (isMobile && (provider === 'huggingface' || provider === 'ollama')) {
      return false;
    }
    return true;
  },

  /**
   * Obtiene un mensaje de ayuda para configurar el proveedor
   * @param {string} provider - Nombre del proveedor
   * @param {Object} status - Estado del proveedor
   * @returns {string} Mensaje de ayuda
   */
  getHelpMessage: (provider, status) => {
    if (status.available) {
      return `${provider.toUpperCase()} está funcionando correctamente`;
    }

    if (status.error === 'Sin API Key') {
      return `Configura tu API Key de ${provider.toUpperCase()} en configuración`;
    }

    if (status.error === 'No disponible en móvil') {
      return `${provider.toUpperCase()} solo funciona en dispositivos desktop`;
    }

    if (status.error === 'No ejecutándose') {
      return `Inicia ${provider.toUpperCase()} en tu sistema local`;
    }

    return `Error con ${provider.toUpperCase()}: ${status.error}`;
  }
};