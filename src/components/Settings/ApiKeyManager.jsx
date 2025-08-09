// ============================================
// 🔑 API KEY MANAGER - COMPONENTE PARA GESTIONAR KEYS
// ============================================

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { constantsUtils, VALIDATION_PATTERNS, API_LIMITS } from '../../../devai-agent-backend/src/utils/constants';
import { testApiConfiguration } from '../../../devai-agent-backend/src/services/api/aiServiceFactory';

const ApiKeyManager = ({ isMobile = false }) => {
  const { settings, computed, currentProvider } = useApp();
  const [keys, setKeys] = useState({});
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  const [showKeys, setShowKeys] = useState({});

  // Cargar keys existentes al montar
  useEffect(() => {
    const availableProviders = constantsUtils.getAvailableProviders(isMobile);
    const currentKeys = {};
    
    availableProviders.forEach(provider => {
      currentKeys[provider] = settings.getApiKey(provider);
    });
    
    setKeys(currentKeys);
  }, [isMobile, settings]);

  // Manejar cambio de key
  const handleKeyChange = (provider, value) => {
    setKeys(prev => ({
      ...prev,
      [provider]: value
    }));
  };

  // Guardar key
  const saveKey = async (provider) => {
    const key = keys[provider]?.trim();
    
    if (!key) {
      alert('Por favor ingresa una API Key válida');
      return;
    }

    // Validar formato si hay patrón disponible
    const pattern = VALIDATION_PATTERNS.apiKey[provider];
    if (pattern && !pattern.test(key)) {
      alert(`Formato de API Key inválido para ${provider.toUpperCase()}`);
      return;
    }

    try {
      settings.setApiKey(provider, key);
      
      // Auto-test después de guardar
      await testKey(provider);
      
      alert(`✅ API Key para ${provider.toUpperCase()} guardada correctamente`);
    } catch (error) {
      alert(`❌ Error guardando API Key: ${error.message}`);
    }
  };

  // Testear key
  const testKey = async (provider) => {
    const key = keys[provider]?.trim();
    
    if (!key && provider !== 'ollama') {
      setTestResults(prev => ({
        ...prev,
        [provider]: { success: false, error: 'No hay API Key configurada' }
      }));
      return;
    }

    setTesting(prev => ({ ...prev, [provider]: true }));

    try {
      const result = await testApiConfiguration(provider, key);
      setTestResults(prev => ({
        ...prev,
        [provider]: result
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [provider]: { success: false, error: error.message }
      }));
    } finally {
      setTesting(prev => ({ ...prev, [provider]: false }));
    }
  };

  // Toggle visibilidad de key
  const toggleKeyVisibility = (provider) => {
    setShowKeys(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  // Obtener proveedores disponibles para este dispositivo
  const availableProviders = constantsUtils.getAvailableProviders(isMobile);

  return (
    <div className="api-key-manager">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          🔑 Configuración de API Keys
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Configura tus API Keys para acceder a los diferentes proveedores de IA
        </p>
      </div>

      <div className="space-y-6">
        {availableProviders.map(provider => {
          const config = API_LIMITS[provider];
          const isConfigured = settings.isProviderConfigured(provider);
          const isCurrent = provider === currentProvider;
          const testResult = testResults[provider];
          const isTestingProvider = testing[provider];

          return (
            <div
              key={provider}
              className={`p-4 border rounded-lg transition-all duration-200 ${
                isCurrent 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              {/* Header del proveedor */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {config.name}
                      {isCurrent && (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded">
                          Actual
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {config.pricing} • {config.rateLimit}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isConfigured && (
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  )}
                  {testResult && (
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        testResult.success
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {testResult.success ? '✅ Funciona' : '❌ Error'}
                    </span>
                  )}
                </div>
              </div>

              {/* Input de API Key (solo si no es Ollama) */}
              {provider !== 'ollama' && (
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <input
                        type={showKeys[provider] ? 'text' : 'password'}
                        value={keys[provider] || ''}
                        onChange={(e) => handleKeyChange(provider, e.target.value)}
                        placeholder={`Ingresa tu API Key de ${config.name}`}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => toggleKeyVisibility(provider)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showKeys[provider] ? '🙈' : '👁️'}
                      </button>
                    </div>
                    
                    <button
                      onClick={() => saveKey(provider)}
                      disabled={!keys[provider]?.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Guardar
                    </button>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => testKey(provider)}
                      disabled={(!keys[provider]?.trim() && provider !== 'ollama') || isTestingProvider}
                      className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isTestingProvider ? '🔄 Testando...' : '🧪 Probar'}
                    </button>

                    <a
                      href={config.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                    >
                      📖 Docs
                    </a>
                  </div>
                </div>
              )}

              {/* Ollama específico */}
              {provider === 'ollama' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Ollama se ejecuta localmente. No necesita API Key.
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => testKey(provider)}
                      disabled={isTestingProvider}
                      className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 transition-colors"
                    >
                      {isTestingProvider ? '🔄 Verificando...' : '🏠 Verificar Conexión'}
                    </button>
                    <a
                      href={config.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                    >
                      📖 Instalar Ollama
                    </a>
                  </div>
                </div>
              )}

              {/* Resultado del test */}
              {testResult && (
                <div className={`mt-3 p-3 rounded-md text-sm ${
                  testResult.success
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                }`}>
                  {testResult.success ? (
                    <div>
                      <p>✅ Conexión exitosa</p>
                      {testResult.model && (
                        <p>🧠 Modelo: {testResult.model}</p>
                      )}
                      {testResult.responseTime && (
                        <p>⏱️ Tiempo: {testResult.responseTime}ms</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p>❌ Error de conexión</p>
                      <p className="text-xs mt-1">{testResult.error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Modelos disponibles */}
              {isConfigured && config.models && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Modelos disponibles:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {config.models.slice(0, 3).map(model => (
                      <span
                        key={model}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                      >
                        {model}
                      </span>
                    ))}
                    {config.models.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                        +{config.models.length - 3} más
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Información adicional */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          💡 Consejos para obtener API Keys:
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>🏆 <strong>Gemini:</strong> Gratis en ai.google.dev - Excelente para uso general</li>
          <li>⚡ <strong>Groq:</strong> Muy rápido en groq.com - Perfecto para respuestas instantáneas</li>
          {!isMobile && (
            <>
              <li>🤗 <strong>HuggingFace:</strong> Gratis en huggingface.co - Modelos especializados</li>
              <li>🏠 <strong>Ollama:</strong> Local y privado - Descarga desde ollama.ai</li>
            </>
          )}
        </ul>
      </div>

      {/* Status del dispositivo */}
      {isMobile && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            📱 <strong>Modo Móvil:</strong> Solo Gemini y Groq están disponibles en dispositivos móviles.
            HuggingFace y Ollama requieren desktop.
          </p>
        </div>
      )}
    </div>
  );
};

export default ApiKeyManager;