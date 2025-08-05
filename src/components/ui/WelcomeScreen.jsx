// ============================================
// 🎉 WELCOME SCREEN COMPONENT
// ============================================

import React from 'react';
import { Upload, Settings, Sparkles, Code, Zap, Smartphone } from 'lucide-react';

/**
 * Pantalla de bienvenida
 * @param {Object} props - Props del componente
 */
const WelcomeScreen = ({
  isMobile,
  onFileUpload,
  onSettingsOpen,
  hasApiKey,
  currentProvider
}) => {
  return (
    <div style={{ 
      textAlign: 'center', 
      padding: isMobile ? '32px 16px' : '48px 32px',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Logo y título principal */}
      <div style={{
        width: isMobile ? '64px' : '80px',
        height: isMobile ? '64px' : '80px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)'
      }}>
        <Sparkles style={{ 
          width: isMobile ? '32px' : '40px', 
          height: isMobile ? '32px' : '40px' 
        }} />
      </div>

      <h1 style={{ 
        fontSize: isMobile ? '24px' : '32px', 
        fontWeight: 'bold', 
        marginBottom: '8px',
        background: 'linear-gradient(135deg, #60a5fa, #a855f7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        ¡Bienvenido a DevAI Agent!
      </h1>

      <p style={{ 
        fontSize: isMobile ? '16px' : '20px', 
        color: '#d1d5db', 
        marginBottom: '32px',
        lineHeight: '1.5'
      }}>
        Tu asistente de desarrollo con IA y Live Preview en tiempo real
      </p>

      {/* Features cards - solo en desktop */}
      {!isMobile && (
        <FeatureCards />
      )}

      {/* Action buttons */}
      <ActionButtons
        isMobile={isMobile}
        hasApiKey={hasApiKey}
        onFileUpload={onFileUpload}
        onSettingsOpen={onSettingsOpen}
      />

      {/* Status info */}
      <StatusInfo 
        isMobile={isMobile}
        hasApiKey={hasApiKey}
        currentProvider={currentProvider}
      />

      {/* Quick tips for mobile */}
      {isMobile && (
        <MobileQuickTips />
      )}
    </div>
  );
};

/**
 * Cards de características principales
 */
const FeatureCards = () => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '32px',
    maxWidth: '600px',
    margin: '0 auto 32px'
  }}>
    <FeatureCard
      icon="🏆"
      title="APIs Gratuitas"
      description="Gemini, Groq, HuggingFace y Ollama"
    />
    <FeatureCard
      icon="👁️"
      title="Live Preview"
      description="HTML, CSS, JS y React en tiempo real"
    />
    <FeatureCard
      icon="📱"
      title="Responsive"
      description="Optimizado para móvil y desktop"
    />
  </div>
);

/**
 * Card individual de característica
 */
const FeatureCard = ({ icon, title, description }) => (
  <div style={{
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(55, 65, 81, 0.5)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  }}>
    <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
    <h3 style={{ 
      fontSize: '16px', 
      fontWeight: '600', 
      margin: '0 0 8px 0',
      color: '#f3f4f6'
    }}>
      {title}
    </h3>
    <p style={{ 
      fontSize: '14px', 
      color: '#9ca3af', 
      margin: 0,
      lineHeight: '1.4'
    }}>
      {description}
    </p>
  </div>
);

/**
 * Botones de acción principales
 */
const ActionButtons = ({ isMobile, hasApiKey, onFileUpload, onSettingsOpen }) => (
  <div style={{
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    gap: '16px',
    justifyContent: 'center',
    marginBottom: '32px'
  }}>
    <ActionButton
      icon={<Upload style={{ width: '20px', height: '20px' }} />}
      text="Subir Proyecto"
      variant="primary"
      onClick={onFileUpload}
      fullWidth={isMobile}
    />
    
    <ActionButton
      icon={<Settings style={{ width: '20px', height: '20px' }} />}
      text={hasApiKey ? "Configuración" : "Configurar API"}
      variant={hasApiKey ? "secondary" : "warning"}
      onClick={onSettingsOpen}
      fullWidth={isMobile}
      badge={!hasApiKey}
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
  badge = false
}) => {
  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      hoverBackground: 'linear-gradient(135deg, #2563eb, #1e40af)',
    },
    secondary: {
      background: 'rgba(55, 65, 81, 0.5)',
      hoverBackground: 'rgba(55, 65, 81, 0.8)',
    },
    warning: {
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      hoverBackground: 'linear-gradient(135deg, #eab308, #ca8a04)',
    }
  };

  const style = variants[variant];

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '14px 24px',
        background: style.background,
        border: 'none',
        borderRadius: '12px',
        color: 'white',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontSize: '16px',
        fontWeight: '500',
        width: fullWidth ? '100%' : 'auto',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}
      onMouseEnter={(e) => {
        e.target.style.background = style.hoverBackground;
        e.target.style.transform = 'translateY(-1px)';
        e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        e.target.style.background = style.background;
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }}
    >
      {icon}
      <span>{text}</span>
      {badge && (
        <span style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '12px',
          height: '12px',
          backgroundColor: '#ef4444',
          borderRadius: '50%',
          border: '2px solid white'
        }}></span>
      )}
    </button>
  );
};

/**
 * Información de estado
 */
const StatusInfo = ({ isMobile, hasApiKey, currentProvider }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  }}>
    <StatusBadge
      icon={hasApiKey ? '🟢' : '🟡'}
      text={hasApiKey ? 'API Configurada' : 'API Pendiente'}
      color={hasApiKey ? '#10b981' : '#eab308'}
    />
    
    <StatusBadge
      icon={isMobile ? '📱' : '💻'}
      text={isMobile ? 'Móvil' : 'Desktop'}
      color="#60a5fa"
    />
    
    <StatusBadge
      icon="🤖"
      text={currentProvider?.toUpperCase() || 'AI'}
      color="#a855f7"
    />
  </div>
);

/**
 * Badge de estado
 */
const StatusBadge = ({ icon, text, color }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    border: `1px solid ${color}40`,
    borderRadius: '20px',
    fontSize: '14px',
    color: color
  }}>
    <span>{icon}</span>
    <span>{text}</span>
  </div>
);

/**
 * Tips rápidos para móvil
 */
const MobileQuickTips = () => (
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
 * Variante compacta para cuando hay poco espacio
 */
export const CompactWelcomeScreen = ({ 
  isMobile, 
  onFileUpload, 
  onSettingsOpen, 
  hasApiKey 
}) => (
  <div style={{
    textAlign: 'center',
    padding: isMobile ? '20px 16px' : '32px',
    maxWidth: '500px',
    margin: '0 auto'
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
      boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
    }}>
      <Sparkles style={{ width: '24px', height: '24px' }} />
    </div>

    <h2 style={{
      fontSize: isMobile ? '20px' : '24px',
      fontWeight: 'bold',
      marginBottom: '8px',
      color: '#f3f4f6'
    }}>
      DevAI Agent
    </h2>

    <p style={{
      fontSize: isMobile ? '14px' : '16px',
      color: '#9ca3af',
      marginBottom: '20px'
    }}>
      {hasApiKey 
        ? 'Sube un proyecto o haz una pregunta para comenzar'
        : 'Configura tu API key para comenzar'
      }
    </p>

    <div style={{
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
      flexDirection: isMobile ? 'column' : 'row'
    }}>
      {hasApiKey && (
        <button
          onClick={onFileUpload}
          style={{
            padding: '10px 16px',
            backgroundColor: '#2563eb',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
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
          padding: '10px 16px',
          backgroundColor: hasApiKey ? 'rgba(55, 65, 81, 0.5)' : '#f59e0b',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = hasApiKey ? '#374151' : '#eab308';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = hasApiKey ? 'rgba(55, 65, 81, 0.5)' : '#f59e0b';
        }}
      >
        ⚙️ {hasApiKey ? 'Configuración' : 'Configurar API'}
      </button>
    </div>
  </div>
);

/**
 * Welcome screen específico para cuando no hay API key
 */
export const SetupWelcomeScreen = ({ 
  isMobile, 
  onSettingsOpen,
  availableProviders = ['gemini', 'groq', 'huggingface', 'ollama']
}) => (
  <div style={{
    textAlign: 'center',
    padding: isMobile ? '32px 16px' : '48px 32px',
    maxWidth: '600px',
    margin: '0 auto'
  }}>
    {/* Warning icon */}
    <div style={{
      width: isMobile ? '64px' : '80px',
      height: isMobile ? '64px' : '80px',
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 20px',
      boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)'
    }}>
      <Settings style={{ 
        width: isMobile ? '32px' : '40px', 
        height: isMobile ? '32px' : '40px' 
      }} />
    </div>

    <h1 style={{
      fontSize: isMobile ? '24px' : '28px',
      fontWeight: 'bold',
      marginBottom: '12px',
      color: '#f59e0b'
    }}>
      ¡Configuración Necesaria!
    </h1>

    <p style={{
      fontSize: isMobile ? '16px' : '18px',
      color: '#d1d5db',
      marginBottom: '24px',
      lineHeight: '1.5'
    }}>
      Para usar DevAI Agent necesitas configurar al menos una API key
    </p>

    {/* Available providers */}
    <div style={{
      backgroundColor: 'rgba(31, 41, 55, 0.5)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
      border: '1px solid rgba(55, 65, 81, 0.5)'
    }}>
      <h3 style={{
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '12px',
        color: '#f3f4f6'
      }}>
        🆓 APIs Gratuitas Disponibles:
      </h3>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: '8px',
        fontSize: '14px',
        color: '#d1d5db'
      }}>
        {availableProviders.map(provider => (
          <div key={provider} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px'
          }}>
            <span>✅</span>
            <span style={{ textTransform: 'capitalize' }}>{provider}</span>
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
        gap: '12px',
        padding: '16px 32px',
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        border: 'none',
        borderRadius: '12px',
        color: 'white',
        cursor: 'pointer',
        fontSize: '18px',
        fontWeight: '600',
        margin: '0 auto',
        transition: 'all 0.2s',
        boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)'
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'translateY(-2px)';
        e.target.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = '0 4px 16px rgba(245, 158, 11, 0.3)';
      }}
    >
      <Settings style={{ width: '20px', height: '20px' }} />
      <span>Configurar API Keys</span>
    </button>

    {/* Help text */}
    <p style={{
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '16px',
      lineHeight: '1.4'
    }}>
      💡 Todas las APIs tienen planes gratuitos generosos.<br />
      Solo necesitas una para comenzar.
    </p>
  </div>
);

export default WelcomeScreen;