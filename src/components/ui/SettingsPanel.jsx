// ============================================
// ⚙️ SETTINGS PANEL COMPONENT
// ============================================

import React from 'react';
import { Eye, X, ExternalLink, Monitor, Smartphone, Zap, CheckCircle } from 'lucide-react';
import { API_LIMITS, FREE_AI_MODELS } from '../../utils/constants';

/**
 * Panel de configuración
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
  // Obtener proveedores disponibles según el dispositivo
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
    <div style={{
      borderBottom: '1px solid rgba(55, 65, 81, 0.5)',
      backgroundColor: 'rgba(31, 41, 55, 0.95)',
      backdropFilter: 'blur(12px)',
      maxHeight: isMobile ? '70vh' : '450px',
      overflowY: 'auto'
    }}>
      <div style={{ padding: '16px' }}>
        {/* Header */}
        <SettingsHeader onClose={onClose} isMobile={isMobile} />

        {/* Provider Selection */}
        <ProviderSelection
          availableProviders={getAvailableProviders()}
          currentProvider={currentProvider}
          isMobile={isMobile}
          apiStatus={apiStatus}
          onProviderChange={onProviderChange}
        />

        {/* Model Selection */}
        <ModelSelection
          availableModels={getAvailableModels()}
          currentModel={currentModel}
          currentProvider={currentProvider}
          isMobile={isMobile}
          onModelChange={onModelChange}
        />

        {/* API Key Status */}
        <ApiKeyStatus
          provider={currentProvider}
          hasApiKey={!!apiKey}
          apiStatus={apiStatus[currentProvider]}
        />

        {/* Device & Performance Info */}
        <DeviceInfo isMobile={isMobile} />

        {/* Live Preview Info */}
        {liveCodeBlocks.length > 0 && !isMobile && (
          <LivePreviewInfo liveCodeBlocks={liveCodeBlocks} />
        )}

        {/* Quick Tips */}
        <QuickTips currentProvider={currentProvider} isMobile={isMobile} />
      </div>
    </div>
  );
};

/**
 * Header del panel de configuración
 */
const SettingsHeader = ({ onClose, isMobile }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px'
  }}>
    <h3 style={{ 
      fontSize: isMobile ? '18px' : '20px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: 0
    }}>
      ⚙️ Configuración
    </h3>
    
    <button
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
);

/**
 * Selección de proveedor de IA
 */
const ProviderSelection = ({ 
  availableProviders, 
  currentProvider, 
  isMobile, 
  apiStatus,
  onProviderChange 
}) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ 
      display: 'block', 
      fontSize: '14px', 
      fontWeight: '500', 
      marginBottom: '12px',
      color: '#f3f4f6'
    }}>
      🤖 Proveedor de IA
    </label>
    
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '12px'
    }}>
      {Object.entries(availableProviders).map(([provider, info]) => {
        const status = apiStatus[provider];
        const isSelected = currentProvider === provider;
        const isAvailable = status?.available || false;
        
        return (
          <button
            key={provider}
            onClick={() => onProviderChange(provider)}
            disabled={!isAvailable && info.needsApiKey}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: `2px solid ${isSelected ? '#2563eb' : '#4b5563'}`,
              backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'rgba(55, 65, 81, 0.5)',
              cursor: (!isAvailable && info.needsApiKey) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: (!isAvailable && info.needsApiKey) ? 0.6 : 1
            }}
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
                {status?.available && <span style={{ fontSize: '12px' }}>✅</span>}
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
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

/**
 * Selección de modelo
 */
const ModelSelection = ({ 
  availableModels, 
  currentModel, 
  currentProvider,
  isMobile, 
  onModelChange 
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
        cursor: 'pointer'
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
    </div>
  </div>
);

/**
 * Estado de la API Key
 */
const ApiKeyStatus = ({ provider, hasApiKey, apiStatus }) => {
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

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        padding: '12px',
        backgroundColor: hasApiKey && apiStatus?.available ? 
          'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
        border: hasApiKey && apiStatus?.available ? 
          '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          {hasApiKey && apiStatus?.available ? (
            <>
              <CheckCircle style={{ width: '16px', height: '16px', color: '#10b981' }} />
              <span style={{ color: '#86efac', fontSize: '14px', fontWeight: '500' }}>
                API Key configurada correctamente
              </span>
            </>
          ) : (
            <>
              <ExternalLink style={{ width: '16px', height: '16px', color: '#eab308' }} />
              <span style={{ color: '#fbbf24', fontSize: '14px', fontWeight: '500' }}>
                {hasApiKey ? 'API Key inválida' : 'API Key requerida'}
              </span>
            </>
          )}
        </div>
        
        {(!hasApiKey || !apiStatus?.available) && (
          <div>
            <p style={{ fontSize: '12px', color: '#d1d5db', margin: '0 0 8px 0' }}>
              Configura tu API Key en el archivo .env:
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
 * Información del dispositivo
 */
const DeviceInfo = ({ isMobile }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{
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
 * Información del Live Preview
 */
const LivePreviewInfo = ({ liveCodeBlocks }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{
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
 * Tips rápidos
 */
const QuickTips = ({ currentProvider, isMobile }) => (
  <div style={{ marginBottom: '8px' }}>
    <div style={{
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
        {getTipsForProvider(currentProvider).map((tip, index) => (
          <li key={index} style={{ marginBottom: '4px' }}>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

/**
 * Obtener tips específicos por proveedor
 */
const getTipsForProvider = (provider) => {
  const tips = {
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

  return tips[provider] || ['Configura tu API key para comenzar'];
};

export default SettingsPanel;