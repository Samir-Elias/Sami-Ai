// ============================================
// ⚙️ SETTINGS PANEL COMPONENT - SIN RESTRICCIONES DE BACKEND
// ============================================

import React from 'react';
import { Eye, X, ExternalLink, Monitor, Smartphone, Zap, CheckCircle, AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { API_LIMITS, FREE_AI_MODELS } from '../../utils/constants';
import { useApp, useBackendStatus, useAPI } from '../../context/AppContext';

/**
 * Panel de configuración SIN restricciones de backend
 * @param {Object} props - Props del componente
 */
const SettingsPanel = ({
  isVisible,
  isMobile,
  currentProvider,
  currentModel,
  apiKey,
  apiStatus,
  liveCodeBlocks,
  onClose,
  onProviderChange,
  onModelChange
}) => {
  // ✅ Context con modo offline
  const { 
    isBackendConnected, 
    connectionStatus, 
    currentProject,
    setCurrentProject,
    offlineMode
  } = useApp();
  
  const { isConnected, reconnect } = useBackendStatus();
  const { api, isLoading, error } = useAPI();

  // ✅ Determinar si podemos usar el sistema (backend O modo offline)
  const canUseSystem = isBackendConnected || offlineMode;

  // Obtener proveedores disponibles según el dispositivo (SIN restricción de backend)
  const getAvailableProviders = () => {
    return isMobile 
      ? { gemini: API_LIMITS.gemini, groq: API_LIMITS.groq }
      : API_LIMITS;
  };

  // Obtener modelos disponibles para el proveedor actual
  const getAvailableModels = () => {
    if (isMobile && (currentProvider === 'huggingface' || currentProvider === 'ollama')) {
      return {};
    }
    return FREE_AI_MODELS[currentProvider] || {};
  };

  if (!isVisible) return null;

  return (
    <div 
      className="animated-settings fade-in-up"
      style={{
        borderBottom: '1px solid rgba(55, 65, 81, 0.5)',
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        backdropFilter: 'blur(12px)',
        maxHeight: isMobile ? '70vh' : '450px',
        overflowY: 'auto'
      }}
    >
      <div style={{ padding: '16px' }}>
        {/* Header con estado de backend */}
        <SettingsHeader 
          onClose={onClose} 
          isMobile={isMobile}
          isBackendConnected={isBackendConnected}
          connectionStatus={connectionStatus}
          onReconnect={reconnect}
          offlineMode={offlineMode}
        />

        {/* Backend Connection Status */}
        <BackendConnectionStatus
          isConnected={isBackendConnected}
          connectionStatus={connectionStatus}
          isLoading={isLoading}
          error={error}
          onReconnect={reconnect}
          offlineMode={offlineMode}
        />

        {/* Project Settings */}
        <ProjectSettings 
          currentProject={currentProject}
          setCurrentProject={setCurrentProject}
        />

        {/* ✅ Provider Selection - SIN RESTRICCIONES */}
        <ProviderSelection
          availableProviders={getAvailableProviders()}
          currentProvider={currentProvider}
          isMobile={isMobile}
          apiStatus={apiStatus}
          onProviderChange={onProviderChange}
          canUseSystem={canUseSystem} // ✅ No depende solo del backend
        />

        {/* ✅ Model Selection - SIN RESTRICCIONES */}
        <ModelSelection
          availableModels={getAvailableModels()}
          currentModel={currentModel}
          currentProvider={currentProvider}
          isMobile={isMobile}
          onModelChange={onModelChange}
          canUseSystem={canUseSystem} // ✅ No depende solo del backend
        />

        {/* API Key Status */}
        <ApiKeyStatus
          provider={currentProvider}
          hasApiKey={!!apiKey}
          apiStatus={apiStatus[currentProvider]}
          canUseSystem={canUseSystem}
        />

        {/* Device & Performance Info */}
        <DeviceInfo isMobile={isMobile} />

        {/* Live Preview Info */}
        {liveCodeBlocks.length > 0 && !isMobile && (
          <LivePreviewInfo liveCodeBlocks={liveCodeBlocks} />
        )}

        {/* Quick Tips - ACTUALIZADOS */}
        <QuickTips 
          currentProvider={currentProvider} 
          isMobile={isMobile}
          isBackendConnected={isBackendConnected}
          offlineMode={offlineMode}
          canUseSystem={canUseSystem}
        />
      </div>
    </div>
  );
};

/**
 * Header del panel de configuración - MEJORADO
 */
const SettingsHeader = ({ 
  onClose, 
  isMobile, 
  isBackendConnected, 
  connectionStatus,
  onReconnect,
  offlineMode 
}) => (
  <div 
    className="animated-card"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '20px'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <h3 
        className="gentle-float"
        style={{ 
          fontSize: isMobile ? '18px' : '20px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: 0
        }}
      >
        ⚙️ Configuración
      </h3>
      
      {/* Backend status indicator MEJORADO */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        padding: '4px 8px',
        borderRadius: '12px',
        backgroundColor: isBackendConnected ? 
          'rgba(16, 185, 129, 0.2)' : 
          offlineMode ? 
            'rgba(245, 158, 11, 0.2)' :
            'rgba(239, 68, 68, 0.2)',
        border: isBackendConnected ? 
          '1px solid rgba(16, 185, 129, 0.3)' : 
          offlineMode ?
            '1px solid rgba(245, 158, 11, 0.3)' :
            '1px solid rgba(239, 68, 68, 0.3)'
      }}>
        {isBackendConnected ? (
          <Wifi style={{ width: '12px', height: '12px', color: '#10b981' }} />
        ) : offlineMode ? (
          <Zap style={{ width: '12px', height: '12px', color: '#f59e0b' }} />
        ) : (
          <WifiOff style={{ width: '12px', height: '12px', color: '#ef4444' }} />
        )}
        <span style={{ 
          color: isBackendConnected ? '#86efac' : offlineMode ? '#fbbf24' : '#fca5a5'
        }}>
          {isBackendConnected ? 'Backend' : offlineMode ? 'Offline' : 'Offline'}
        </span>
      </div>
    </div>
    
    <div style={{ display: 'flex', gap: '4px' }}>
      {!isBackendConnected && !offlineMode && (
        <button
          className="interactive-button"
          onClick={onReconnect}
          style={{
            padding: '4px',
            background: 'transparent',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            color: '#9ca3af',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.color = '#f3f4f6'}
          onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
          title="Reintentar conexión"
        >
          <RefreshCw style={{ width: '16px', height: '16px' }} />
        </button>
      )}
      
      <button
        className="interactive-button"
        onClick={onClose}
        style={{
          padding: '4px',
          background: 'transparent',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          color: '#9ca3af',
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.color = '#f3f4f6'}
        onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
      >
        <X style={{ width: '20px', height: '20px' }} />
      </button>
    </div>
  </div>
);

/**
 * Estado de conexión del backend - MEJORADO
 */
const BackendConnectionStatus = ({ 
  isConnected, 
  connectionStatus, 
  isLoading, 
  error, 
  onReconnect,
  offlineMode
}) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{
      padding: '12px',
      backgroundColor: isConnected ? 
        'rgba(16, 185, 129, 0.2)' : 
        offlineMode ?
          'rgba(245, 158, 11, 0.2)' :
          'rgba(239, 68, 68, 0.2)',
      border: isConnected ? 
        '1px solid rgba(16, 185, 129, 0.3)' : 
        offlineMode ?
          '1px solid rgba(245, 158, 11, 0.3)' :
          '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '8px'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: error ? '8px' : '0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isConnected ? (
            <>
              <CheckCircle style={{ width: '16px', height: '16px', color: '#10b981' }} />
              <span style={{ color: '#86efac', fontSize: '14px', fontWeight: '500' }}>
                Backend Conectado
              </span>
            </>
          ) : offlineMode ? (
            <>
              <Zap style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
              <span style={{ color: '#fbbf24', fontSize: '14px', fontWeight: '500' }}>
                Modo Offline Activo
              </span>
            </>
          ) : (
            <>
              <AlertTriangle style={{ width: '16px', height: '16px', color: '#ef4444' }} />
              <span style={{ color: '#fca5a5', fontSize: '14px', fontWeight: '500' }}>
                Backend Desconectado
              </span>
            </>
          )}
        </div>

        {/* Reconnect button */}
        {!isConnected && (
          <button
            className="interactive-button"
            onClick={onReconnect}
            disabled={isLoading}
            style={{
              padding: '4px 8px',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = '#2563eb')}
            onMouseLeave={(e) => !isLoading && (e.target.style.backgroundColor = '#3b82f6')}
          >
            <RefreshCw style={{ width: '12px', height: '12px' }} />
            {isLoading ? 'Conectando...' : 'Reconectar'}
          </button>
        )}
      </div>

      {/* Connection status text */}
      <div style={{ 
        fontSize: '12px', 
        color: isConnected ? '#86efac' : offlineMode ? '#fbbf24' : '#fca5a5',
        marginLeft: '24px'
      }}>
        {isConnected 
          ? 'Funcionalidad completa disponible'
          : offlineMode
            ? 'Usando API directa - Configurar keys abajo'
            : 'Conecta el backend para funcionalidad completa'
        }
      </div>

      {/* Error message */}
      {error && !offlineMode && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#fca5a5'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  </div>
);

/**
 * Configuración del proyecto actual (sin cambios)
 */
const ProjectSettings = ({ currentProject, setCurrentProject }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ 
      display: 'block', 
      fontSize: '14px', 
      fontWeight: '500', 
      marginBottom: '8px',
      color: '#f3f4f6'
    }}>
      📁 Proyecto Actual
    </label>
    
    <input
      className="animated-button"
      type="text"
      value={currentProject}
      onChange={(e) => setCurrentProject(e.target.value)}
      placeholder="Nombre del proyecto"
      style={{
        width: '100%',
        padding: '10px 12px',
        backgroundColor: 'rgba(55, 65, 81, 0.5)',
        border: '1px solid #4b5563',
        borderRadius: '8px',
        color: 'white',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s'
      }}
      onFocus={(e) => e.target.style.borderColor = '#2563eb'}
      onBlur={(e) => e.target.style.borderColor = '#4b5563'}
    />
    
    <div style={{
      marginTop: '6px',
      fontSize: '12px',
      color: '#9ca3af'
    }}>
      Los archivos subidos se organizarán en este proyecto
    </div>
  </div>
);

/**
 * ✅ Selección de proveedor - SIN RESTRICCIONES DE BACKEND
 */
const ProviderSelection = ({ 
  availableProviders, 
  currentProvider, 
  isMobile, 
  apiStatus,
  onProviderChange,
  canUseSystem // ✅ Ya no solo backend
}) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ 
      display: 'block', 
      fontSize: '14px', 
      fontWeight: '500', 
      marginBottom: '12px',
      color: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      🤖 Proveedor de IA
      {/* ✅ Info mejorada - no restricción de backend */}
      <span style={{
        fontSize: '11px',
        color: canUseSystem ? '#86efac' : '#fbbf24',
        backgroundColor: canUseSystem ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
        padding: '2px 6px',
        borderRadius: '10px'
      }}>
        {canUseSystem ? 'Disponible' : 'Config. API Key'}
      </span>
    </label>
    
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '12px'
    }}>
      {Object.entries(availableProviders).map(([provider, info]) => {
        const status = apiStatus?.[provider];
        const isSelected = currentProvider === provider;
        const hasApiKey = !!localStorage.getItem(`api_key_${provider}`);
        // ✅ Disponible si tiene API key O no la necesita
        const isAvailable = hasApiKey || info.needsApiKey === false;
        
        return (
          <button
            key={provider}
            className="animated-button interactive-button"
            onClick={() => onProviderChange(provider)} // ✅ Sin restricciones
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: `2px solid ${isSelected ? '#2563eb' : '#4b5563'}`,
              backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'rgba(55, 65, 81, 0.5)',
              cursor: 'pointer', // ✅ Siempre clickeable
              transition: 'all 0.2s',
              opacity: 1, // ✅ Sin opacidad reducida
              position: 'relative'
            }}
            onMouseEnter={(e) => !isSelected && (e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.8)')}
            onMouseLeave={(e) => !isSelected && (e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)')}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: isMobile ? '20px' : '24px', 
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                {info.icon}
                {/* ✅ Indicador de estado mejorado */}
                {isAvailable && <span style={{ fontSize: '12px' }}>✅</span>}
                {!isAvailable && info.needsApiKey && <span style={{ fontSize: '12px' }}>🔑</span>}
              </div>
              <div style={{ 
                fontSize: isMobile ? '12px' : '14px', 
                fontWeight: '500', 
                textTransform: 'capitalize',
                marginBottom: '2px'
              }}>
                {provider}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                {info.freeLimit}
              </div>
              
              {/* ✅ Estado de configuración */}
              <div style={{
                marginTop: '4px',
                fontSize: '10px',
                color: isAvailable ? '#86efac' : '#fbbf24',
                fontWeight: '500'
              }}>
                {isAvailable ? 'CONFIGURADO' : 'NECESITA KEY'}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

/**
 * ✅ Selección de modelo - SIN RESTRICCIONES DE BACKEND
 */
const ModelSelection = ({ 
  availableModels, 
  currentModel, 
  currentProvider,
  isMobile, 
  onModelChange,
  canUseSystem
}) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ 
      display: 'block', 
      fontSize: '14px', 
      fontWeight: '500', 
      marginBottom: '8px',
      color: '#f3f4f6'
    }}>
      🧠 Modelo de {currentProvider.toUpperCase()}
    </label>
    
    <select
      className="animated-button"
      value={currentModel}
      onChange={(e) => onModelChange(e.target.value)}
      style={{
        width: '100%',
        padding: '10px 12px',
        backgroundColor: 'rgba(55, 65, 81, 0.5)',
        border: '1px solid #4b5563',
        borderRadius: '8px',
        color: 'white',
        fontSize: '14px',
        outline: 'none',
        cursor: 'pointer', // ✅ Siempre habilitado
        opacity: 1, // ✅ Sin restricciones
        transition: 'border-color 0.2s'
      }}
      onFocus={(e) => e.target.style.borderColor = '#2563eb'}
      onBlur={(e) => e.target.style.borderColor = '#4b5563'}
    >
      {Object.entries(availableModels).map(([model, description]) => (
        <option key={model} value={model} style={{ backgroundColor: '#1f2937' }}>
          {isMobile ? description.split(' ').slice(0, 3).join(' ') : description}
        </option>
      ))}
    </select>
    
    {/* Info del modelo */}
    <div style={{
      marginTop: '8px',
      padding: '8px',
      backgroundColor: 'rgba(17, 24, 39, 0.5)',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#d1d5db'
    }}>
      📊 <strong>Modelo actual:</strong> {currentModel}
      <br />
      💡 <strong>Estado:</strong> {canUseSystem ? 'Listo para usar' : 'Configurar API key'}
    </div>
  </div>
);

/**
 * Estado de la API Key - MEJORADO
 */
const ApiKeyStatus = ({ provider, hasApiKey, apiStatus, canUseSystem }) => {
  if (!API_LIMITS[provider]?.needsApiKey) {
    return (
      <div style={{
        marginBottom: '20px',
        padding: '12px',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <CheckCircle style={{ width: '16px', height: '16px', color: '#10b981' }} />
          <span style={{ color: '#86efac' }}>
            {provider.toUpperCase()} no requiere API Key
          </span>
        </div>
      </div>
    );
  }

  const isConfigured = hasApiKey || !!localStorage.getItem(`api_key_${provider}`);

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        padding: '12px',
        backgroundColor: isConfigured ? 
          'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
        border: isConfigured ? 
          '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          {isConfigured ? (
            <>
              <CheckCircle style={{ width: '16px', height: '16px', color: '#10b981' }} />
              <span style={{ color: '#86efac', fontSize: '14px', fontWeight: '500' }}>
                API Key configurada para {provider.toUpperCase()}
              </span>
            </>
          ) : (
            <>
              <ExternalLink style={{ width: '16px', height: '16px', color: '#eab308' }} />
              <span style={{ color: '#fbbf24', fontSize: '14px', fontWeight: '500' }}>
                API Key requerida para {provider.toUpperCase()}
              </span>
            </>
          )}
        </div>
        
        {!isConfigured && (
          <div>
            <p style={{ fontSize: '12px', color: '#d1d5db', margin: '0 0 8px 0' }}>
              Configura tu API Key gratuita:
            </p>
            <code style={{
              display: 'block',
              padding: '8px',
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#e2e8f0',
              fontFamily: 'Monaco, Consolas, monospace'
            }}>
              REACT_APP_{provider.toUpperCase()}_API_KEY=tu_key_aqui
            </code>
            <a
              href={API_LIMITS[provider].setup}
              target="_blank"
              rel="noopener noreferrer"
              className="animated-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '8px',
                padding: '4px 8px',
                backgroundColor: '#2563eb',
                color: 'white',
                textDecoration: 'none',
                fontSize: '12px',
                borderRadius: '4px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
            >
              <ExternalLink style={{ width: '12px', height: '12px' }} />
              Obtener API Key Gratis
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Información del dispositivo (sin cambios)
 */
const DeviceInfo = ({ isMobile }) => (
  <div style={{ marginBottom: '20px' }}>
    <div className="animated-card" style={{
      padding: '12px',
      backgroundColor: 'rgba(55, 65, 81, 0.3)',
      borderRadius: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
        {isMobile ? (
          <Smartphone style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
        ) : (
          <Monitor style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
        )}
        <span style={{ color: '#93c5fd' }}>
          Dispositivo: {isMobile ? 'Móvil' : 'Desktop'}
        </span>
      </div>
      <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 24px' }}>
        {isMobile 
          ? 'Solo Gemini y Groq disponibles en móvil'
          : 'Todas las APIs disponibles en desktop'
        }
      </p>
    </div>
  </div>
);

/**
 * Información del Live Preview (sin cambios)
 */
const LivePreviewInfo = ({ liveCodeBlocks }) => (
  <div style={{ marginBottom: '20px' }}>
    <div className="animated-card" style={{
      padding: '12px',
      backgroundColor: 'rgba(37, 99, 235, 0.2)',
      border: '1px solid rgba(37, 99, 235, 0.3)',
      borderRadius: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
        <Eye style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
        <span style={{ color: '#93bbfc' }}>
          {liveCodeBlocks.length} bloques de código detectados
        </span>
      </div>
      <p style={{ fontSize: '12px', color: '#93bbfc', margin: '4px 0 0 24px' }}>
        Live Preview disponible para HTML, CSS, JS y React
      </p>
    </div>
  </div>
);

/**
 * ✅ Tips rápidos - ACTUALIZADOS con info de modo offline
 */
const QuickTips = ({ currentProvider, isMobile, isBackendConnected, offlineMode, canUseSystem }) => (
  <div style={{ marginBottom: '8px' }}>
    <div className="animated-card shimmer-effect" style={{
      padding: '12px',
      backgroundColor: 'rgba(124, 58, 237, 0.1)',
      border: '1px solid rgba(124, 58, 237, 0.2)',
      borderRadius: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Zap style={{ width: '16px', height: '16px', color: '#a855f7' }} />
        <span style={{ color: '#c4b5fd', fontSize: '14px', fontWeight: '500' }}>
          Tips para {currentProvider.toUpperCase()}
        </span>
      </div>
      
      <ul style={{ 
        fontSize: '12px', 
        color: '#d1d5db', 
        margin: '0', 
        paddingLeft: '16px',
        lineHeight: '1.4'
      }}>
        {getTipsForProvider(currentProvider, isBackendConnected, offlineMode, canUseSystem).map((tip, index) => (
          <li key={index} style={{ marginBottom: '4px' }}>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

/**
 * ✅ Obtener tips específicos por proveedor - ACTUALIZADOS
 */
const getTipsForProvider = (provider, isBackendConnected, offlineMode, canUseSystem) => {
  const baseTips = {
    gemini: [
      'Mejor para análisis de código y explicaciones detalladas',
      'Excelente integración con Live Preview',
      'Límite: 1,500 requests por día'
    ],
    groq: [
      'Respuestas ultra-rápidas con Llama 3',
      'Ideal para consultas rápidas y debugging',
      'Límite: 6,000 tokens por minuto'
    ],
    huggingface: [
      'Gran variedad de modelos especializados',
      'Solo disponible en desktop',
      'Algunos modelos pueden tardar en cargar'
    ],
    ollama: [
      'Ejecuta modelos localmente (privacidad total)',
      'No requiere internet ni API keys',
      'Necesita Ollama instalado en tu sistema'
    ]
  };

  const tips = baseTips[provider] || ['Configura tu API key para comenzar'];
  
  // ✅ Tips según el estado del sistema
  if (!canUseSystem) {
    return [
      '⚠️ Sistema no configurado',
      'Configura al menos una API key para comenzar',
      ...tips
    ];
  }
  
  if (offlineMode && !isBackendConnected) {
    return [
      '🟡 Modo offline activo - usando API directa',
      'Funcionalidad básica disponible',
      ...tips
    ];
  }

  if (isBackendConnected) {
    return [
      '🟢 Backend conectado - funcionalidad completa',
      ...tips
    ];
  }

  return tips;
};

export default SettingsPanel;