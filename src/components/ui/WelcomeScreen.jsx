// ============================================
// 🎉 WELCOME SCREEN COMPONENT - CON API CONTEXT Y ZOOM PARA PC
// ============================================

import React from 'react';
import { 
  Upload, 
  Settings, 
  Sparkles, 
  Code, 
  Zap, 
  Smartphone, 
  Monitor,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Database
} from 'lucide-react';
import { useApp, useBackendStatus, useAPI } from '../../context/AppContext';

/**
 * Pantalla de bienvenida con API Context integrado
 * @param {Object} props - Props del componente
 */
const WelcomeScreen = ({
  isMobile,
  onFileUpload,
  onSettingsOpen,
  hasApiKey,
  currentProvider
}) => {
  // Context integration
  const { 
    isBackendConnected, 
    connectionStatus, 
    currentProject 
  } = useApp();
  
  const { isConnected, reconnect } = useBackendStatus();
  const { api, isLoading, error } = useAPI();

  // Determinar el zoom base para PC (más grande)
  const baseScale = isMobile ? 1 : 1.15; // 15% más grande en PC
  
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: isMobile ? '32px 16px' : '56px 40px', // Más padding en PC
      maxWidth: isMobile ? '100%' : '900px', // Más ancho en PC
      margin: '0 auto',
      transform: `scale(${baseScale})`,
      transformOrigin: 'center top'
    }}>
      {/* Backend Connection Status */}
      <BackendConnectionBanner 
        isConnected={isBackendConnected}
        connectionStatus={connectionStatus}
        isLoading={isLoading}
        error={error}
        onReconnect={reconnect}
        isMobile={isMobile}
      />

      {/* Logo y título principal */}
      <div style={{
        width: isMobile ? '64px' : '96px', // Más grande en PC
        height: isMobile ? '64px' : '96px',
        background: isBackendConnected ? 
          'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)' :
          'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
        borderRadius: '18px', // Más redondeado
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        boxShadow: isBackendConnected ? 
          '0 12px 40px rgba(59, 130, 246, 0.4)' :
          '0 8px 32px rgba(107, 114, 128, 0.3)',
        position: 'relative'
      }}>
        <Sparkles style={{ 
          width: isMobile ? '32px' : '48px', 
          height: isMobile ? '32px' : '48px'
        }} />
        
        {/* Connection indicator */}
        <div style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: isBackendConnected ? '#10b981' : '#ef4444',
          border: '2px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }} />
      </div>

      <h1 style={{ 
        fontSize: isMobile ? '24px' : '40px', // Más grande en PC
        fontWeight: 'bold', 
        marginBottom: '12px',
        background: isBackendConnected ?
          'linear-gradient(135deg, #60a5fa, #a855f7)' :
          'linear-gradient(135deg, #9ca3af, #6b7280)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        ¡Bienvenido a DevAI Agent!
      </h1>

      <p style={{ 
        fontSize: isMobile ? '16px' : '24px', // Más grande en PC
        color: isBackendConnected ? '#d1d5db' : '#9ca3af', 
        marginBottom: '40px',
        lineHeight: '1.5'
      }}>
        Tu asistente de desarrollo con IA y Live Preview en tiempo real
      </p>

      {/* Project Info */}
      <ProjectInfo 
        currentProject={currentProject}
        isBackendConnected={isBackendConnected}
        isMobile={isMobile}
      />

      {/* Features cards - solo en desktop */}
      {!isMobile && (
        <FeatureCards isBackendConnected={isBackendConnected} />
      )}

      {/* Action buttons */}
      <ActionButtons
        isMobile={isMobile}
        hasApiKey={hasApiKey}
        isBackendConnected={isBackendConnected}
        onFileUpload={onFileUpload}
        onSettingsOpen={onSettingsOpen}
        onReconnect={reconnect}
        isLoading={isLoading}
      />

      {/* Status info */}
      <StatusInfo 
        isMobile={isMobile}
        hasApiKey={hasApiKey}
        currentProvider={currentProvider}
        isBackendConnected={isBackendConnected}
        connectionStatus={connectionStatus}
      />

      {/* Quick tips for mobile */}
      {isMobile && (
        <MobileQuickTips isBackendConnected={isBackendConnected} />
      )}

      {/* Desktop tips */}
      {!isMobile && (
        <DesktopQuickTips 
          isBackendConnected={isBackendConnected}
          hasApiKey={hasApiKey}
        />
      )}
    </div>
  );
};

/**
 * Banner de estado de conexión del backend
 */
const BackendConnectionBanner = ({ 
  isConnected, 
  connectionStatus, 
  isLoading, 
  error, 
  onReconnect,
  isMobile 
}) => {
  if (isConnected) return null; // Solo mostrar si hay problemas

  return (
    <div style={{
      marginBottom: '24px',
      padding: '16px',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '2px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexDirection: isMobile ? 'column' : 'row',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <WifiOff style={{ width: '24px', height: '24px', color: '#ef4444' }} />
        <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#fca5a5',
            marginBottom: '4px'
          }}>
            Backend Desconectado
          </div>
          <div style={{ fontSize: '14px', color: '#9ca3af' }}>
            {error || 'El servidor de backend no está disponible'}
          </div>
        </div>
      </div>

      <button
        onClick={onReconnect}
        disabled={isLoading}
        style={{
          padding: '12px 20px',
          backgroundColor: '#ef4444',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s',
          minWidth: '140px',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = '#dc2626')}
        onMouseLeave={(e) => !isLoading && (e.target.style.backgroundColor = '#ef4444')}
      >
        <RefreshCw style={{ 
          width: '16px', 
          height: '16px',
          animation: isLoading ? 'spin 1s linear infinite' : 'none'
        }} />
        {isLoading ? 'Conectando...' : 'Reconectar'}
      </button>
    </div>
  );
};

/**
 * Información del proyecto actual
 */
const ProjectInfo = ({ currentProject, isBackendConnected, isMobile }) => (
  <div style={{
    marginBottom: '32px',
    padding: '16px',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: '12px',
    border: '1px solid rgba(55, 65, 81, 0.5)'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      marginBottom: '8px'
    }}>
      <Database style={{ 
        width: '20px', 
        height: '20px', 
        color: isBackendConnected ? '#60a5fa' : '#6b7280'
      }} />
      <span style={{ 
        fontSize: isMobile ? '16px' : '18px',
        fontWeight: '600',
        color: isBackendConnected ? '#f3f4f6' : '#9ca3af'
      }}>
        Proyecto Actual
      </span>
    </div>
    
    <div style={{
      fontSize: isMobile ? '18px' : '22px',
      fontWeight: '700',
      color: isBackendConnected ? '#60a5fa' : '#6b7280'
    }}>
      {currentProject}
    </div>
    
    <div style={{
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '4px'
    }}>
      Los archivos se organizarán en este proyecto
    </div>
  </div>
);

/**
 * Cards de características principales (más grandes en PC)
 */
const FeatureCards = ({ isBackendConnected }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px', // Más espacio
    marginBottom: '40px',
    maxWidth: '720px', // Más ancho
    margin: '0 auto 40px'
  }}>
    <FeatureCard
      icon="🏆"
      title="APIs Gratuitas"
      description="Gemini, Groq, HuggingFace y Ollama"
      isActive={isBackendConnected}
    />
    <FeatureCard
      icon="👁️"
      title="Live Preview"
      description="HTML, CSS, JS y React en tiempo real"
      isActive={isBackendConnected}
    />
    <FeatureCard
      icon="📱"
      title="Responsive"
      description="Optimizado para móvil y desktop"
      isActive={isBackendConnected}
    />
  </div>
);

/**
 * Card individual de característica (más grande)
 */
const FeatureCard = ({ icon, title, description, isActive }) => (
  <div style={{
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: '16px', // Más redondeado
    padding: '28px', // Más padding
    border: `2px solid ${isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(55, 65, 81, 0.5)'}`,
    transition: 'all 0.3s ease',
    cursor: 'default',
    opacity: isActive ? 1 : 0.7
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.boxShadow = isActive ? 
      '0 12px 32px rgba(59, 130, 246, 0.2)' : 
      '0 8px 25px rgba(0,0,0,0.2)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  }}>
    <div style={{ fontSize: '40px', marginBottom: '16px' }}>{icon}</div>
    <h3 style={{ 
      fontSize: '18px', // Más grande
      fontWeight: '600', 
      margin: '0 0 12px 0',
      color: isActive ? '#f3f4f6' : '#9ca3af'
    }}>
      {title}
    </h3>
    <p style={{ 
      fontSize: '16px', // Más grande
      color: isActive ? '#9ca3af' : '#6b7280', 
      margin: 0,
      lineHeight: '1.5'
    }}>
      {description}
    </p>
  </div>
);

/**
 * Botones de acción principales (más grandes)
 */
const ActionButtons = ({ 
  isMobile, 
  hasApiKey, 
  isBackendConnected, 
  onFileUpload, 
  onSettingsOpen,
  onReconnect,
  isLoading
}) => (
  <div style={{
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    gap: '20px', // Más espacio
    justifyContent: 'center',
    marginBottom: '40px'
  }}>
    {/* Reconectar backend (si está desconectado) */}
    {!isBackendConnected && (
      <ActionButton
        icon={<RefreshCw style={{ 
          width: '24px', 
          height: '24px',
          animation: isLoading ? 'spin 1s linear infinite' : 'none'
        }} />}
        text={isLoading ? "Conectando..." : "Conectar Backend"}
        variant="warning"
        onClick={onReconnect}
        fullWidth={isMobile}
        disabled={isLoading}
        size="large"
      />
    )}

    {/* Subir proyecto */}
    <ActionButton
      icon={<Upload style={{ width: '24px', height: '24px' }} />}
      text="Subir Proyecto"
      variant="primary"
      onClick={onFileUpload}
      fullWidth={isMobile}
      disabled={!isBackendConnected}
      size="large"
    />
    
    {/* Configuración */}
    <ActionButton
      icon={<Settings style={{ width: '24px', height: '24px' }} />}
      text={hasApiKey ? "Configuración" : "Configurar API"}
      variant={hasApiKey ? "secondary" : "warning"}
      onClick={onSettingsOpen}
      fullWidth={isMobile}
      badge={!hasApiKey}
      size="large"
    />
  </div>
);

/**
 * Botón de acción reutilizable (más grande)
 */
const ActionButton = ({ 
  icon, 
  text, 
  variant = 'primary', 
  onClick, 
  fullWidth = false,
  badge = false,
  disabled = false,
  size = 'normal'
}) => {
  const variants = {
    primary: {
      background: disabled ? 
        'rgba(55, 65, 81, 0.5)' :
        'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      hoverBackground: 'linear-gradient(135deg, #2563eb, #1e40af)',
    },
    secondary: {
      background: 'rgba(55, 65, 81, 0.5)',
      hoverBackground: 'rgba(55, 65, 81, 0.8)',
    },
    warning: {
      background: disabled ?
        'rgba(55, 65, 81, 0.5)' :
        'linear-gradient(135deg, #f59e0b, #d97706)',
      hoverBackground: 'linear-gradient(135deg, #eab308, #ca8a04)',
    }
  };

  const sizes = {
    normal: { padding: '14px 24px', fontSize: '16px' },
    large: { padding: '18px 32px', fontSize: '18px' } // Más grande
  };

  const style = variants[variant];
  const sizeStyle = sizes[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px', // Más espacio
        padding: sizeStyle.padding,
        background: style.background,
        border: 'none',
        borderRadius: '14px', // Más redondeado
        color: disabled ? '#6b7280' : 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        fontSize: sizeStyle.fontSize,
        fontWeight: '600',
        width: fullWidth ? '100%' : 'auto',
        position: 'relative',
        boxShadow: disabled ? 
          'none' : 
          '0 6px 16px rgba(0,0,0,0.15)',
        opacity: disabled ? 0.6 : 1
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.target.style.background = style.hoverBackground;
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.25)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.target.style.background = style.background;
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
        }
      }}
    >
      {icon}
      <span>{text}</span>
      {badge && (
        <span style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          width: '16px',
          height: '16px',
          backgroundColor: '#ef4444',
          borderRadius: '50%',
          border: '3px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}></span>
      )}
      
      {disabled && (
        <AlertCircle style={{ 
          width: '20px', 
          height: '20px', 
          marginLeft: 'auto',
          color: '#6b7280'
        }} />
      )}
    </button>
  );
};

/**
 * Información de estado (más grande)
 */
const StatusInfo = ({ 
  isMobile, 
  hasApiKey, 
  currentProvider, 
  isBackendConnected, 
  connectionStatus 
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px', // Más espacio
    marginBottom: '32px',
    flexWrap: 'wrap'
  }}>
    <StatusBadge
      icon={isBackendConnected ? <Wifi style={{ width: '16px', height: '16px' }} /> : <WifiOff style={{ width: '16px', height: '16px' }} />}
      text={isBackendConnected ? 'Backend OK' : 'Backend OFF'}
      color={isBackendConnected ? '#10b981' : '#ef4444'}
      size="large"
    />
    
    <StatusBadge
      icon={hasApiKey ? <CheckCircle style={{ width: '16px', height: '16px' }} /> : <AlertCircle style={{ width: '16px', height: '16px' }} />}
      text={hasApiKey ? 'API Configurada' : 'API Pendiente'}
      color={hasApiKey ? '#10b981' : '#eab308'}
      size="large"
    />
    
    <StatusBadge
      icon={isMobile ? <Smartphone style={{ width: '16px', height: '16px' }} /> : <Monitor style={{ width: '16px', height: '16px' }} />}
      text={isMobile ? 'Móvil' : 'Desktop'}
      color="#60a5fa"
      size="large"
    />
    
    <StatusBadge
      icon="🤖"
      text={currentProvider?.toUpperCase() || 'AI'}
      color="#a855f7"
      size="large"
    />
  </div>
);

/**
 * Badge de estado (más grande)
 */
const StatusBadge = ({ icon, text, color, size = 'normal' }) => {
  const sizes = {
    normal: { padding: '6px 12px', fontSize: '14px' },
    large: { padding: '10px 16px', fontSize: '16px' } // Más grande
  };

  const sizeStyle = sizes[size];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: sizeStyle.padding,
      backgroundColor: 'rgba(31, 41, 55, 0.6)',
      border: `2px solid ${color}40`,
      borderRadius: '24px',
      fontSize: sizeStyle.fontSize,
      color: color,
      fontWeight: '500'
    }}>
      {typeof icon === 'string' ? <span>{icon}</span> : icon}
      <span>{text}</span>
    </div>
  );
};

/**
 * Tips rápidos para móvil
 */
const MobileQuickTips = ({ isBackendConnected }) => (
  <div style={{
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    border: '1px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '24px',
    textAlign: 'left'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '12px'
    }}>
      <Zap style={{ width: '16px', height: '16px', color: '#a855f7' }} />
      <span style={{ color: '#c4b5fd', fontSize: '16px', fontWeight: '500' }}>
        Tips para móvil
      </span>
    </div>
    
    <ul style={{
      fontSize: '14px',
      color: '#d1d5db',
      margin: 0,
      paddingLeft: '16px',
      lineHeight: '1.5'
    }}>
      {!isBackendConnected && (
        <li style={{ marginBottom: '8px', color: '#fca5a5' }}>
          ⚠️ Conecta el backend primero
        </li>
      )}
      <li style={{ marginBottom: '8px' }}>
        Usa Gemini o Groq para mejor rendimiento
      </li>
      <li style={{ marginBottom: '8px' }}>
        El Live Preview no está disponible en móvil
      </li>
      <li style={{ marginBottom: '8px' }}>
        Presiona Enter para enviar, Shift+Enter para nueva línea
      </li>
      <li>
        Las conversaciones se guardan automáticamente
      </li>
    </ul>
  </div>
);

/**
 * Tips rápidos para desktop (más grandes)
 */
const DesktopQuickTips = ({ isBackendConnected, hasApiKey }) => (
  <div style={{
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    border: '2px solid rgba(124, 58, 237, 0.2)',
    borderRadius: '16px',
    padding: '28px',
    marginTop: '32px',
    textAlign: 'left',
    maxWidth: '600px',
    margin: '32px auto 0'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '20px'
    }}>
      <Zap style={{ width: '24px', height: '24px', color: '#a855f7' }} />
      <span style={{ color: '#c4b5fd', fontSize: '20px', fontWeight: '600' }}>
        Guía de inicio rápido
      </span>
    </div>
    
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div>
        <h4 style={{ 
          fontSize: '16px', 
          color: '#e2e8f0', 
          margin: '0 0 8px 0',
          fontWeight: '600'
        }}>
          🚀 Para comenzar:
        </h4>
        <ul style={{
          fontSize: '14px',
          color: '#d1d5db',
          margin: 0,
          paddingLeft: '16px',
          lineHeight: '1.6'
        }}>
          {!isBackendConnected ? (
            <li style={{ color: '#fca5a5', marginBottom: '6px' }}>
              1. ⚠️ Inicia el servidor backend
            </li>
          ) : (
            <li style={{ color: '#86efac', marginBottom: '6px' }}>
              1. ✅ Backend conectado
            </li>
          )}
          
          {!hasApiKey ? (
            <li style={{ color: '#fbbf24', marginBottom: '6px' }}>
              2. 🔑 Configura al menos una API key
            </li>
          ) : (
            <li style={{ color: '#86efac', marginBottom: '6px' }}>
              2. ✅ API configurada
            </li>
          )}
          
          <li style={{ marginBottom: '6px' }}>
            3. 📁 Sube un proyecto o haz una pregunta
          </li>
          <li>
            4. 👁️ Disfruta del Live Preview automático
          </li>
        </ul>
      </div>
      
      <div>
        <h4 style={{ 
          fontSize: '16px', 
          color: '#e2e8f0', 
          margin: '0 0 8px 0',
          fontWeight: '600'
        }}>
          💡 Características destacadas:
        </h4>
        <ul style={{
          fontSize: '14px',
          color: '#d1d5db',
          margin: 0,
          paddingLeft: '16px',
          lineHeight: '1.6'
        }}>
          <li style={{ marginBottom: '6px' }}>
            🆓 4 APIs gratuitas disponibles
          </li>
          <li style={{ marginBottom: '6px' }}>
            ⚡ Respuestas en tiempo real
          </li>
          <li style={{ marginBottom: '6px' }}>
            🔄 Conversaciones persistentes
          </li>
          <li>
            🎨 Visualización de código en vivo
          </li>
        </ul>
      </div>
    </div>
  </div>
);

/**
 * Variante compacta para cuando hay poco espacio (más grande en PC)
 */
export const CompactWelcomeScreen = ({ 
  isMobile, 
  onFileUpload, 
  onSettingsOpen, 
  hasApiKey 
}) => {
  const { isBackendConnected } = useApp();
  const baseScale = isMobile ? 1 : 1.1;

  return (
    <div style={{
      textAlign: 'center',
      padding: isMobile ? '20px 16px' : '40px',
      maxWidth: '600px',
      margin: '0 auto',
      transform: `scale(${baseScale})`,
      transformOrigin: 'center top'
    }}>
      <div style={{
        width: isMobile ? '48px' : '64px',
        height: isMobile ? '48px' : '64px',
        background: isBackendConnected ? 
          'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)' :
          'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        boxShadow: isBackendConnected ? 
          '0 6px 20px rgba(59, 130, 246, 0.4)' :
          '0 4px 16px rgba(107, 114, 128, 0.3)'
      }}>
        <Sparkles style={{ 
          width: isMobile ? '24px' : '32px', 
          height: isMobile ? '24px' : '32px'
        }} />
      </div>

      <h2 style={{
        fontSize: isMobile ? '20px' : '28px',
        fontWeight: 'bold',
        marginBottom: '12px',
        color: '#f3f4f6'
      }}>
        DevAI Agent
      </h2>

      <p style={{
        fontSize: isMobile ? '14px' : '18px',
        color: '#9ca3af',
        marginBottom: '24px'
      }}>
        {hasApiKey && isBackendConnected
          ? 'Sube un proyecto o haz una pregunta para comenzar'
          : !isBackendConnected 
            ? 'Conecta el backend para comenzar'
            : 'Configura tu API key para comenzar'
        }
      </p>

      <div style={{
        display: 'flex',
        gap: '16px',
        justifyContent: 'center',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        {hasApiKey && isBackendConnected && (
          <button
            onClick={onFileUpload}
            style={{
              padding: isMobile ? '12px 18px' : '16px 24px',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              cursor: 'pointer',
              fontSize: isMobile ? '14px' : '16px',
              fontWeight: '500',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
          >
            📁 Subir Proyecto
          </button>
        )}
        
        <button
          onClick={onSettingsOpen}
          style={{
            padding: isMobile ? '12px 18px' : '16px 24px',
            backgroundColor: (hasApiKey && isBackendConnected) ? 'rgba(55, 65, 81, 0.5)' : '#f59e0b',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            cursor: 'pointer',
            fontSize: isMobile ? '14px' : '16px',
            fontWeight: '500',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = (hasApiKey && isBackendConnected) ? '#374151' : '#eab308';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = (hasApiKey && isBackendConnected) ? 'rgba(55, 65, 81, 0.5)' : '#f59e0b';
          }}
        >
          ⚙️ {(hasApiKey && isBackendConnected) ? 'Configuración' : 'Configurar'}
        </button>
      </div>
    </div>
  );
};

/**
 * Welcome screen específico para cuando no hay API key (más grande)
 */
export const SetupWelcomeScreen = ({ 
  isMobile, 
  onSettingsOpen,
  availableProviders = ['gemini', 'groq', 'huggingface', 'ollama']
}) => {
  const { isBackendConnected } = useApp();
  const baseScale = isMobile ? 1 : 1.2;

  return (
    <div style={{
      textAlign: 'center',
      padding: isMobile ? '32px 16px' : '64px 48px',
      maxWidth: '700px',
      margin: '0 auto',
      transform: `scale(${baseScale})`,
      transformOrigin: 'center top'
    }}>
      {/* Warning icon */}
      <div style={{
        width: isMobile ? '64px' : '96px',
        height: isMobile ? '64px' : '96px',
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        borderRadius: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        boxShadow: '0 12px 40px rgba(245, 158, 11, 0.4)'
      }}>
        <Settings style={{ 
          width: isMobile ? '32px' : '48px', 
          height: isMobile ? '32px' : '48px'
        }} />
      </div>

      <h1 style={{
        fontSize: isMobile ? '24px' : '36px',
        fontWeight: 'bold',
        marginBottom: '16px',
        color: '#f59e0b'
      }}>
        ¡Configuración Necesaria!
      </h1>

      <p style={{
        fontSize: isMobile ? '16px' : '22px',
        color: '#d1d5db',
        marginBottom: '32px',
        lineHeight: '1.5'
      }}>
        Para usar DevAI Agent necesitas {!isBackendConnected ? 'backend y ' : ''}configurar al menos una API key
      </p>

      {/* Backend warning */}
      {!isBackendConnected && (
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'center'
          }}>
            <WifiOff style={{ width: '20px', height: '20px' }} />
            Backend Requerido
          </h3>
          <p style={{ fontSize: '14px', color: '#d1d5db', margin: 0 }}>
            Inicia tu servidor backend antes de configurar las APIs
          </p>
        </div>
      )}

      {/* Available providers */}
      <div style={{
        backgroundColor: 'rgba(31, 41, 55, 0.6)',
        borderRadius: '16px',
        padding: '28px',
        marginBottom: '32px',
        border: '2px solid rgba(55, 65, 81, 0.5)'
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          marginBottom: '16px',
          color: '#f3f4f6'
        }}>
          🆓 APIs Gratuitas Disponibles:
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: '12px',
          fontSize: '16px',
          color: '#d1d5db'
        }}>
          {availableProviders.map(provider => (
            <div key={provider} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px'
            }}>
              <span>✅</span>
              <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>
                {provider}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Setup button */}
      <button
        onClick={onSettingsOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '20px 40px',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          border: 'none',
          borderRadius: '16px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '20px',
          fontWeight: '600',
          margin: '0 auto',
          transition: 'all 0.3s ease',
          boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-3px)';
          e.target.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
        }}
      >
        <Settings style={{ width: '24px', height: '24px' }} />
        <span>Configurar {!isBackendConnected ? 'Backend y ' : ''}APIs</span>
      </button>

      {/* Help text */}
      <p style={{
        fontSize: '14px',
        color: '#6b7280',
        marginTop: '20px',
        lineHeight: '1.5'
      }}>
        💡 Todas las APIs tienen planes gratuitos generosos.<br />
        {isBackendConnected ? 'Solo necesitas una para comenzar.' : 'Primero conecta el backend, luego configura las APIs.'}
      </p>
    </div>
  );
};

// Añadir keyframes para la animación de spin
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default WelcomeScreen;