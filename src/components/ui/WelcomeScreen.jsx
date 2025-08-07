// ============================================
// 🎉 WELCOME SCREEN COMPONENT - SIN RESTRICCIONES Y CON ANIMACIONES
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
  Database,
  MessageSquare,
  Play
} from 'lucide-react';
import { useApp, useBackendStatus, useAPI } from '../../context/AppContext';

/**
 * ✅ Pantalla de bienvenida SIN RESTRICCIONES - permite chat directo
 * @param {Object} props - Props del componente
 */
const WelcomeScreen = ({
  isMobile,
  onFileUpload,
  onSettingsOpen,
  hasApiKey,
  currentProvider
}) => {
  // ✅ Context integration con modo offline
  const { 
    isBackendConnected, 
    connectionStatus, 
    currentProject,
    offlineMode
  } = useApp();
  
  const { isConnected, reconnect } = useBackendStatus();
  const { api, isLoading, error } = useAPI();

  // ✅ Determinar si podemos usar el chat
  const canUseChat = hasApiKey || (offlineMode && hasApiKey) || isBackendConnected;
  const needsConfiguration = !hasApiKey && !isBackendConnected;

  // Determinar el zoom base para PC (más grande)
  const baseScale = isMobile ? 1 : 1.15;
  
  return (
    <div 
      className="fade-in-up"
      style={{ 
        textAlign: 'center', 
        padding: isMobile ? '32px 16px' : '56px 40px',
        maxWidth: isMobile ? '100%' : '900px',
        margin: '0 auto',
        transform: `scale(${baseScale})`,
        transformOrigin: 'center top'
      }}
    >
      {/* ✅ Connection Status Banner - NO BLOQUEA EL USO */}
      <ConnectionStatusBanner 
        isConnected={isBackendConnected}
        connectionStatus={connectionStatus}
        isLoading={isLoading}
        error={error}
        onReconnect={reconnect}
        isMobile={isMobile}
        offlineMode={offlineMode}
        showWarning={!isBackendConnected && !offlineMode}
      />

      {/* ✅ Logo y título principal CON ANIMACIONES */}
      <div 
        className="animated-logo main-logo"
        style={{
          width: isMobile ? '64px' : '96px',
          height: isMobile ? '64px' : '96px',
          background: canUseChat ? 
            'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)' :
            'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          position: 'relative'
        }}
      >
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
          backgroundColor: isBackendConnected ? '#10b981' : offlineMode ? '#f59e0b' : '#ef4444',
          border: '2px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }} />
      </div>

      <h1 
        className="gentle-float"
        style={{ 
          fontSize: isMobile ? '24px' : '40px',
          fontWeight: 'bold', 
          marginBottom: '12px',
          background: canUseChat ?
            'linear-gradient(135deg, #60a5fa, #a855f7)' :
            'linear-gradient(135deg, #9ca3af, #6b7280)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        ¡Bienvenido a DevAI Agent!
      </h1>

      <p 
        className="shimmer-effect"
        style={{ 
          fontSize: isMobile ? '16px' : '24px',
          color: canUseChat ? '#d1d5db' : '#9ca3af', 
          marginBottom: '40px',
          lineHeight: '1.5'
        }}
      >
        Tu asistente de desarrollo con IA y Live Preview en tiempo real
      </p>

      {/* Project Info */}
      <ProjectInfo 
        currentProject={currentProject}
        canUseChat={canUseChat}
        isMobile={isMobile}
      />

      {/* ✅ Feature cards - SIEMPRE VISIBLES en desktop */}
      {!isMobile && (
        <FeatureCards 
          canUseChat={canUseChat} 
          isBackendConnected={isBackendConnected}
          offlineMode={offlineMode}
        />
      )}

      {/* ✅ Action buttons - SIN RESTRICCIONES */}
      <ActionButtons
        isMobile={isMobile}
        hasApiKey={hasApiKey}
        canUseChat={canUseChat}
        needsConfiguration={needsConfiguration}
        onFileUpload={onFileUpload}
        onSettingsOpen={onSettingsOpen}
        onReconnect={reconnect}
        isLoading={isLoading}
        onStartChat={() => {
          // ✅ Focus en el input para empezar a escribir
          setTimeout(() => {
            const inputElement = document.querySelector('textarea');
            if (inputElement) {
              inputElement.focus();
              inputElement.placeholder = 'Escribe tu pregunta aquí...';
            }
          }, 100);
        }}
      />

      {/* Status info */}
      <StatusInfo 
        isMobile={isMobile}
        hasApiKey={hasApiKey}
        currentProvider={currentProvider}
        isBackendConnected={isBackendConnected}
        connectionStatus={connectionStatus}
        offlineMode={offlineMode}
        canUseChat={canUseChat}
      />

      {/* Quick tips for mobile */}
      {isMobile && (
        <MobileQuickTips 
          canUseChat={canUseChat}
          isBackendConnected={isBackendConnected}
          offlineMode={offlineMode}
        />
      )}

      {/* Desktop tips */}
      {!isMobile && (
        <DesktopQuickTips 
          canUseChat={canUseChat}
          hasApiKey={hasApiKey}
          isBackendConnected={isBackendConnected}
          offlineMode={offlineMode}
        />
      )}
    </div>
  );
};

/**
 * ✅ Banner de estado de conexión - NO BLOQUEA
 */
const ConnectionStatusBanner = ({ 
  isConnected, 
  connectionStatus, 
  isLoading, 
  error, 
  onReconnect,
  isMobile,
  offlineMode,
  showWarning
}) => {
  // Solo mostrar si hay problemas graves
  if (isConnected || offlineMode) return null;

  return (
    <div 
      className="animated-card"
      style={{
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: 'rgba(245, 158, 11, 0.1)', // Cambiado a warning en vez de error
        border: '2px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <WifiOff style={{ width: '24px', height: '24px', color: '#f59e0b' }} />
        <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#fbbf24',
            marginBottom: '4px'
          }}>
            Backend Offline - Modo Directo Disponible
          </div>
          <div style={{ fontSize: '14px', color: '#d1d5db' }}>
            Puedes usar las APIs directamente configurando las keys
          </div>
        </div>
      </div>

      <button
        className="interactive-button animated-button"
        onClick={onReconnect}
        disabled={isLoading}
        style={{
          padding: '12px 20px',
          backgroundColor: '#f59e0b',
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
        onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = '#d97706')}
        onMouseLeave={(e) => !isLoading && (e.target.style.backgroundColor = '#f59e0b')}
      >
        <RefreshCw style={{ 
          width: '16px', 
          height: '16px',
          animation: isLoading ? 'spin 1s linear infinite' : 'none'
        }} />
        {isLoading ? 'Conectando...' : 'Reconectar Backend'}
      </button>
    </div>
  );
};

/**
 * Información del proyecto actual
 */
const ProjectInfo = ({ currentProject, canUseChat, isMobile }) => (
  <div 
    className="animated-card"
    style={{
      marginBottom: '32px',
      padding: '16px',
      backgroundColor: 'rgba(31, 41, 55, 0.5)',
      borderRadius: '12px',
      border: '1px solid rgba(55, 65, 81, 0.5)'
    }}
  >
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
        color: canUseChat ? '#60a5fa' : '#6b7280'
      }} />
      <span style={{ 
        fontSize: isMobile ? '16px' : '18px',
        fontWeight: '600',
        color: canUseChat ? '#f3f4f6' : '#9ca3af'
      }}>
        Proyecto Actual
      </span>
    </div>
    
    <div style={{
      fontSize: isMobile ? '18px' : '22px',
      fontWeight: '700',
      color: canUseChat ? '#60a5fa' : '#6b7280'
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
 * ✅ Cards de características principales - SIEMPRE ACTIVAS
 */
const FeatureCards = ({ canUseChat, isBackendConnected, offlineMode }) => (
  <div 
    className="fade-in-up delay-1"
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '24px',
      marginBottom: '40px',
      maxWidth: '720px',
      margin: '0 auto 40px'
    }}
  >
    <FeatureCard
      icon="🤖"
      title="Chat con IA"
      description={canUseChat ? "Gemini, Groq, HuggingFace y más" : "Configura API keys"}
      isActive={canUseChat}
    />
    <FeatureCard
      icon="👁️"
      title="Live Preview"
      description="HTML, CSS, JS y React en tiempo real"
      isActive={canUseChat}
    />
    <FeatureCard
      icon="📱"
      title="Modo Flexible"
      description={isBackendConnected ? "Backend completo" : offlineMode ? "API directa" : "Configuración"}
      isActive={true} // Siempre disponible
    />
  </div>
);

/**
 * Card individual de característica
 */
const FeatureCard = ({ icon, title, description, isActive }) => (
  <div 
    className="animated-card hover-lift"
    style={{
      backgroundColor: 'rgba(31, 41, 55, 0.5)',
      borderRadius: '16px',
      padding: '28px',
      border: `2px solid ${isActive ? 'rgba(59, 130, 246, 0.3)' : 'rgba(55, 65, 81, 0.5)'}`,
      transition: 'all 0.3s ease',
      cursor: 'default',
      opacity: isActive ? 1 : 0.7
    }}
  >
    <div style={{ fontSize: '40px', marginBottom: '16px' }}>{icon}</div>
    <h3 style={{ 
      fontSize: '18px',
      fontWeight: '600', 
      margin: '0 0 12px 0',
      color: isActive ? '#f3f4f6' : '#9ca3af'
    }}>
      {title}
    </h3>
    <p style={{ 
      fontSize: '16px',
      color: isActive ? '#9ca3af' : '#6b7280', 
      margin: 0,
      lineHeight: '1.5'
    }}>
      {description}
    </p>
  </div>
);

/**
 * ✅ Botones de acción principales - SIN RESTRICCIONES
 */
const ActionButtons = ({ 
  isMobile, 
  hasApiKey,
  canUseChat,
  needsConfiguration,
  onFileUpload, 
  onSettingsOpen,
  onReconnect,
  isLoading,
  onStartChat
}) => (
  <div style={{
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    gap: '20px',
    justifyContent: 'center',
    marginBottom: '40px'
  }}>
    {/* ✅ CHAT DIRECTO - Siempre primera opción */}
    <ActionButton
      icon={<MessageSquare style={{ width: '24px', height: '24px' }} />}
      text={canUseChat ? "Comenzar Chat" : "Configurar Chat"}
      variant={canUseChat ? "primary" : "warning"}
      onClick={canUseChat ? onStartChat : onSettingsOpen}
      fullWidth={isMobile}
      size="large"
      priority={1}
    />

    {/* Subir proyecto */}
    <ActionButton
      icon={<Upload style={{ width: '24px', height: '24px' }} />}
      text="Subir Proyecto"
      variant="secondary"
      onClick={onFileUpload}
      fullWidth={isMobile}
      size="large"
    />
    
    {/* Configuración */}
    <ActionButton
      icon={<Settings style={{ width: '24px', height: '24px' }} />}
      text="Configuración"
      variant="secondary"
      onClick={onSettingsOpen}
      fullWidth={isMobile}
      badge={needsConfiguration}
      size="large"
    />
  </div>
);

/**
 * Botón de acción reutilizable
 */
const ActionButton = ({ 
  icon, 
  text, 
  variant = 'primary', 
  onClick, 
  fullWidth = false,
  badge = false,
  disabled = false,
  size = 'normal',
  priority = 0
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
    large: { padding: '18px 32px', fontSize: '18px' }
  };

  const style = variants[variant];
  const sizeStyle = sizes[size];

  return (
    <button
      className={`animated-button interactive-button ${priority === 1 ? 'subtle-pulse' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: sizeStyle.padding,
        background: style.background,
        border: 'none',
        borderRadius: '14px',
        color: disabled ? '#6b7280' : 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: sizeStyle.fontSize,
        fontWeight: '600',
        width: fullWidth ? '100%' : 'auto',
        position: 'relative',
        boxShadow: disabled ? 
          'none' : 
          '0 6px 16px rgba(0,0,0,0.15)',
        opacity: disabled ? 0.6 : 1,
        order: priority === 1 ? -1 : 0
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
    </button>
  );
};

/**
 * ✅ Información de estado - MEJORADA
 */
const StatusInfo = ({ 
  isMobile, 
  hasApiKey, 
  currentProvider, 
  isBackendConnected, 
  connectionStatus,
  offlineMode,
  canUseChat
}) => (
  <div 
    className="animated-card delay-2"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      marginBottom: '32px',
      flexWrap: 'wrap'
    }}
  >
    <StatusBadge
      icon={isBackendConnected ? <Wifi style={{ width: '16px', height: '16px' }} /> : offlineMode ? <Zap style={{ width: '16px', height: '16px' }} /> : <WifiOff style={{ width: '16px', height: '16px' }} />}
      text={isBackendConnected ? 'Backend OK' : offlineMode ? 'Modo Directo' : 'Offline'}
      color={isBackendConnected ? '#10b981' : offlineMode ? '#f59e0b' : '#ef4444'}
      size="large"
    />
    
    <StatusBadge
      icon={canUseChat ? <CheckCircle style={{ width: '16px', height: '16px' }} /> : <AlertCircle style={{ width: '16px', height: '16px' }} />}
      text={canUseChat ? 'Chat Listo' : 'Config. Needed'}
      color={canUseChat ? '#10b981' : '#eab308'}
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
 * Badge de estado
 */
const StatusBadge = ({ icon, text, color, size = 'normal' }) => {
  const sizes = {
    normal: { padding: '6px 12px', fontSize: '14px' },
    large: { padding: '10px 16px', fontSize: '16px' }
  };

  const sizeStyle = sizes[size];

  return (
    <div 
      className="subtle-pulse"
      style={{
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
      }}
    >
      {typeof icon === 'string' ? <span>{icon}</span> : icon}
      <span>{text}</span>
    </div>
  );
};

/**
 * ✅ Tips rápidos para móvil - ACTUALIZADOS
 */
const MobileQuickTips = ({ canUseChat, isBackendConnected, offlineMode }) => (
  <div 
    className="animated-card"
    style={{
      backgroundColor: 'rgba(124, 58, 237, 0.1)',
      border: '1px solid rgba(124, 58, 237, 0.2)',
      borderRadius: '12px',
      padding: '20px',
      marginTop: '24px',
      textAlign: 'left'
    }}
  >
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
      {!canUseChat ? (
        <>
          <li style={{ marginBottom: '8px', color: '#fbbf24' }}>
            ⚙️ Configura una API key en Settings primero
          </li>
          <li style={{ marginBottom: '8px' }}>
            🆓 Todas las APIs tienen planes gratuitos
          </li>
        </>
      ) : (
        <>
          <li style={{ marginBottom: '8px', color: '#86efac' }}>
            ✅ Ya puedes comenzar a chatear
          </li>
          <li style={{ marginBottom: '8px' }}>
            Usa Gemini o Groq para mejor rendimiento en móvil
          </li>
          <li style={{ marginBottom: '8px' }}>
            Enter para enviar, Shift+Enter para nueva línea
          </li>
        </>
      )}
      <li style={{ marginBottom: '8px' }}>
        Las conversaciones se guardan automáticamente
      </li>
      <li>
        El Live Preview no está disponible en móvil
      </li>
    </ul>
  </div>
);

/**
 * ✅ Tips rápidos para desktop - ACTUALIZADOS
 */
const DesktopQuickTips = ({ 
  canUseChat, 
  hasApiKey, 
  isBackendConnected, 
  offlineMode 
}) => (
  <div 
    className="animated-card delay-3"
    style={{
      backgroundColor: 'rgba(124, 58, 237, 0.1)',
      border: '2px solid rgba(124, 58, 237, 0.2)',
      borderRadius: '16px',
      padding: '28px',
      marginTop: '32px',
      textAlign: 'left',
      maxWidth: '600px',
      margin: '32px auto 0'
    }}
  >
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
          🚀 Estado actual:
        </h4>
        <ul style={{
          fontSize: '14px',
          color: '#d1d5db',
          margin: 0,
          paddingLeft: '16px',
          lineHeight: '1.6'
        }}>
          {canUseChat ? (
            <li style={{ color: '#86efac', marginBottom: '6px' }}>
              ✅ Chat listo para usar
            </li>
          ) : (
            <li style={{ color: '#fbbf24', marginBottom: '6px' }}>
              ⚙️ Configura API keys en Settings
            </li>
          )}
          
          {isBackendConnected ? (
            <li style={{ color: '#86efac', marginBottom: '6px' }}>
              ✅ Backend conectado (completo)
            </li>
          ) : offlineMode ? (
            <li style={{ color: '#fbbf24', marginBottom: '6px' }}>
              🟡 Modo offline (API directa)
            </li>
          ) : (
            <li style={{ color: '#9ca3af', marginBottom: '6px' }}>
              ⚪ Backend offline (opcional)
            </li>
          )}
          
          <li style={{ marginBottom: '6px' }}>
            3. 📁 Sube proyectos (opcional)
          </li>
          <li>
            4. 👁️ Disfruta del Live Preview
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
          💡 Características:
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
            ⚡ Funciona con/sin backend
          </li>
          <li style={{ marginBottom: '6px' }}>
            🔄 Conversaciones persistentes
          </li>
          <li>
            🎨 Live Preview automático
          </li>
        </ul>
      </div>
    </div>
  </div>
);

export default WelcomeScreen;