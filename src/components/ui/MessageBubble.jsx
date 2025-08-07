// ============================================
// 💬 MESSAGE BUBBLE COMPONENT - CON API CONTEXT
// ============================================

import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Zap,
  Bot,
  User,
  Wifi,
  WifiOff
} from 'lucide-react';
import { renderMessageContent } from '../../utils/messageRenderer';
import { useApp, useBackendStatus } from '../../context/AppContext';

/**
 * Componente de burbuja de mensaje reutilizable
 * @param {Object} props - Props del componente
 */
const MessageBubble = ({
  message,
  index,
  isMobile,
  showTimestamp = true,
  showThinking = true,
  showCopy = true,
  variant = 'default' // 'default', 'compact', 'minimal'
}) => {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Context integration
  const { connectionStatus } = useApp();
  const { isConnected } = useBackendStatus();

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';

  /**
   * Copiar contenido al portapapeles
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Error copiando texto:', err);
    }
  };

  /**
   * Toggle del panel de pensamiento
   */
  const toggleThinking = () => {
    setIsThinkingExpanded(!isThinkingExpanded);
  };

  // Diferentes variantes del componente
  if (variant === 'compact') {
    return <CompactMessageBubble message={message} isMobile={isMobile} />;
  }

  if (variant === 'minimal') {
    return <MinimalMessageBubble message={message} isMobile={isMobile} />;
  }

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '4px'
    }}>
      {/* Contenido del mensaje */}
      <div style={{
        maxWidth: isMobile ? '85%' : '768px',
        order: isUser ? 2 : 1,
        position: 'relative'
      }}>
        {/* Header para mensajes del asistente */}
        {isAssistant && (
          <MessageHeader 
            message={message}
            isMobile={isMobile}
            showTimestamp={showTimestamp}
            showCopy={showCopy}
            isCopied={isCopied}
            onCopy={handleCopy}
            isConnected={isConnected}
            connectionStatus={connectionStatus}
          />
        )}
        
        {/* Burbuja principal */}
        <div style={{
          borderRadius: getBubbleRadius(isUser, isAssistant),
          padding: getBubblePadding(isMobile),
          backgroundColor: getBubbleBackground(isUser, isSystem),
          border: getBubbleBorder(isUser),
          wordBreak: 'break-word',
          position: 'relative',
          boxShadow: isUser ? '0 2px 8px rgba(37, 99, 235, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          {/* Contenido renderizado */}
          <div style={{ 
            fontSize: isMobile ? '14px' : '15px', 
            lineHeight: '1.6',
            color: isUser ? 'white' : '#f3f4f6'
          }}>
            {renderMessageContent(message.content)}
          </div>

          {/* Metadatos del mensaje */}
          {(isUser && showTimestamp) && (
            <MessageMetadata message={message} isMobile={isMobile} />
          )}

          {/* Panel de pensamiento */}
          {message.thinking && showThinking && (
            <ThinkingPanel
              thinking={message.thinking}
              isExpanded={isThinkingExpanded}
              onToggle={toggleThinking}
            />
          )}

          {/* Indicador de estado de conexión para mensajes de IA */}
          {isAssistant && message.provider && (
            <ConnectionIndicator 
              provider={message.provider}
              isConnected={isConnected}
              connectionStatus={connectionStatus}
            />
          )}
        </div>
      </div>
      
      {/* Avatar */}
      <MessageAvatar 
        isUser={isUser}
        isSystem={isSystem}
        message={message}
        order={isUser ? 1 : 2}
        isConnected={isConnected}
      />
    </div>
  );
};

/**
 * Header del mensaje con información del agente
 */
const MessageHeader = ({ 
  message, 
  isMobile, 
  showTimestamp, 
  showCopy, 
  isCopied, 
  onCopy,
  isConnected,
  connectionStatus
}) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: '6px',
    paddingLeft: '2px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '18px',
        height: '18px',
        background: isConnected ? 
          'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)' : 
          'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Sparkles style={{ width: '10px', height: '10px' }} />
      </div>
      
      <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>
        {message.agent || 'AI Assistant'}
      </span>
      
      {message.provider && (
        <span style={{ 
          fontSize: '10px', 
          color: '#6b7280',
          padding: '2px 6px',
          backgroundColor: isConnected ? 
            'rgba(55, 65, 81, 0.5)' : 
            'rgba(239, 68, 68, 0.2)',
          borderRadius: '8px'
        }}>
          {message.provider.toUpperCase()}
          {!isConnected && ' ❌'}
        </span>
      )}
      
      {message.timestamp && showTimestamp && !isMobile && (
        <span style={{ fontSize: '11px', color: '#6b7280' }}>
          {message.timestamp.toLocaleTimeString()}
        </span>
      )}

      {/* Connection status indicator */}
      <ConnectionStatusBadge isConnected={isConnected} connectionStatus={connectionStatus} />
    </div>

    {/* Acciones */}
    {showCopy && (
      <div style={{ display: 'flex', gap: '4px' }}>
        <ActionButton
          onClick={onCopy}
          icon={isCopied ? <Check style={{ width: '12px', height: '12px' }} /> : <Copy style={{ width: '12px', height: '12px' }} />}
          title={isCopied ? "¡Copiado!" : "Copiar mensaje"}
          variant={isCopied ? 'success' : 'default'}
        />
      </div>
    )}
  </div>
);

/**
 * Indicador de estado de conexión
 */
const ConnectionStatusBadge = ({ isConnected, connectionStatus }) => {
  if (!connectionStatus) return null;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '10px',
      color: isConnected ? '#10b981' : '#ef4444'
    }}>
      {isConnected ? 
        <Wifi style={{ width: '10px', height: '10px' }} /> : 
        <WifiOff style={{ width: '10px', height: '10px' }} />
      }
    </div>
  );
};

/**
 * Indicador de conexión en la burbuja
 */
const ConnectionIndicator = ({ provider, isConnected, connectionStatus }) => (
  <div style={{
    position: 'absolute',
    bottom: '4px',
    right: '8px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: isConnected ? '#10b981' : '#ef4444',
    border: '1px solid rgba(255,255,255,0.2)',
    opacity: 0.8
  }}
  title={isConnected ? 
    `Conectado a ${provider.toUpperCase()}` : 
    `Desconectado de ${provider.toUpperCase()}`
  } />
);

/**
 * Botón de acción genérico
 */
const ActionButton = ({ onClick, icon, title, variant = 'default' }) => {
  const variants = {
    default: { color: '#9ca3af', hoverColor: '#d1d5db' },
    success: { color: '#10b981', hoverColor: '#34d399' }
  };

  const style = variants[variant];

  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px',
        background: 'transparent',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        color: style.color,
        transition: 'color 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onMouseEnter={(e) => e.target.style.color = style.hoverColor}
      onMouseLeave={(e) => e.target.style.color = style.color}
      title={title}
    >
      {icon}
    </button>
  );
};

/**
 * Avatar del mensaje
 */
const MessageAvatar = ({ isUser, isSystem, message, order, isConnected }) => {
  let backgroundColor, icon;

  if (isUser) {
    backgroundColor = '#2563eb';
    icon = <User style={{ width: '12px', height: '12px' }} />;
  } else if (isSystem) {
    backgroundColor = '#6b7280';
    icon = <AlertCircle style={{ width: '12px', height: '12px' }} />;
  } else {
    backgroundColor = isConnected ? 
      'rgba(55, 65, 81, 0.8)' : 
      'rgba(239, 68, 68, 0.8)';
    icon = <Bot style={{ width: '12px', height: '12px' }} />;
  }

  return (
    <div style={{
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      backgroundColor: backgroundColor,
      order: order,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: isConnected ? 
        '2px solid rgba(255,255,255,0.1)' : 
        '2px solid rgba(239, 68, 68, 0.3)',
      position: 'relative'
    }}>
      {icon}
      
      {/* Connection indicator */}
      {!isUser && !isSystem && (
        <div style={{
          position: 'absolute',
          bottom: '-2px',
          right: '-2px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#10b981' : '#ef4444',
          border: '1px solid white'
        }} />
      )}
    </div>
  );
};

/**
 * Metadatos del mensaje
 */
const MessageMetadata = ({ message, isMobile }) => (
  <div style={{
    fontSize: '11px',
    color: 'rgba(255,255,255,0.7)',
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}>
    {message.timestamp && (
      <>
        <Clock style={{ width: '10px', height: '10px' }} />
        <span>{message.timestamp.toLocaleTimeString()}</span>
      </>
    )}
    
    {message.usage?.total_tokens && (
      <>
        <span>•</span>
        <Zap style={{ width: '10px', height: '10px' }} />
        <span>{message.usage.total_tokens} tokens</span>
      </>
    )}

    {message.provider && (
      <>
        <span>•</span>
        <span>{message.provider.toUpperCase()}</span>
      </>
    )}
  </div>
);

/**
 * Panel expansible de proceso de pensamiento
 */
const ThinkingPanel = ({ thinking, isExpanded, onToggle }) => (
  <div style={{ 
    marginTop: '12px', 
    paddingTop: '12px', 
    borderTop: '1px solid rgba(55, 65, 81, 0.5)' 
  }}>
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'none',
        border: 'none',
        color: '#9ca3af',
        cursor: 'pointer',
        fontSize: '12px',
        padding: '4px 0',
        transition: 'color 0.2s',
        width: '100%',
        textAlign: 'left'
      }}
      onMouseEnter={(e) => e.target.style.color = '#d1d5db'}
      onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
    >
      <AlertCircle style={{ width: '12px', height: '12px' }} />
      <span style={{ flex: 1 }}>Proceso de análisis</span>
      {isExpanded ? 
        <ChevronUp style={{ width: '12px', height: '12px' }} /> : 
        <ChevronDown style={{ width: '12px', height: '12px' }} />
      }
    </button>
    
    {isExpanded && (
      <div style={{
        marginTop: '8px',
        padding: '12px',
        backgroundColor: 'rgba(17, 24, 39, 0.5)',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#d1d5db',
        whiteSpace: 'pre-wrap',
        fontFamily: 'Monaco, Consolas, monospace',
        border: '1px solid rgba(55, 65, 81, 0.3)',
        lineHeight: '1.4'
      }}>
        {thinking}
      </div>
    )}
  </div>
);

/**
 * Variante compacta del mensaje
 */
const CompactMessageBubble = ({ message, isMobile }) => {
  const isUser = message.role === 'user';
  const { isConnected } = useBackendStatus();
  
  return (
    <div style={{
      display: 'flex',
      gap: '6px',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '2px'
    }}>
      <div style={{
        maxWidth: isMobile ? '90%' : '80%',
        padding: '8px 12px',
        borderRadius: '12px',
        backgroundColor: isUser ? '#2563eb' : 
          isConnected ? 'rgba(55, 65, 81, 0.8)' : 'rgba(239, 68, 68, 0.8)',
        fontSize: '13px',
        lineHeight: '1.4',
        order: isUser ? 2 : 1,
        border: !isUser && !isConnected ? '1px solid rgba(239, 68, 68, 0.3)' : 'none'
      }}>
        {renderMessageContent(message.content)}
      </div>
      
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: isUser ? '#2563eb' : 
          isConnected ? '#6b7280' : '#ef4444',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        order: isUser ? 1 : 2
      }}>
        {isUser ? 
          <User style={{ width: '10px', height: '10px' }} /> : 
          <Bot style={{ width: '10px', height: '10px' }} />
        }
      </div>
    </div>
  );
};

/**
 * Variante mínima del mensaje
 */
const MinimalMessageBubble = ({ message, isMobile }) => {
  const isUser = message.role === 'user';
  const { isConnected } = useBackendStatus();
  
  return (
    <div style={{
      marginBottom: '8px',
      paddingLeft: isUser ? '20px' : '0',
      paddingRight: isUser ? '0' : '20px'
    }}>
      {!isUser && (
        <div style={{
          fontSize: '11px',
          color: isConnected ? '#9ca3af' : '#ef4444',
          marginBottom: '2px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          AI Assistant
          {!isConnected && <WifiOff style={{ width: '10px', height: '10px' }} />}
        </div>
      )}
      
      <div style={{
        padding: '6px 0',
        fontSize: '14px',
        lineHeight: '1.5',
        color: isUser ? '#e2e8f0' : 
          isConnected ? '#f3f4f6' : '#fecaca'
      }}>
        {renderMessageContent(message.content)}
      </div>
    </div>
  );
};

/**
 * Funciones auxiliares para estilos
 */
const getBubbleRadius = (isUser, isAssistant) => {
  if (isUser) return '16px 16px 4px 16px';
  if (isAssistant) return '16px 16px 16px 4px';
  return '12px';
};

const getBubblePadding = (isMobile) => {
  return isMobile ? '10px 14px' : '12px 16px';
};

const getBubbleBackground = (isUser, isSystem) => {
  if (isUser) return 'linear-gradient(135deg, #2563eb, #1d4ed8)';
  if (isSystem) return 'rgba(107, 114, 128, 0.5)';
  return 'rgba(31, 41, 55, 0.8)';
};

const getBubbleBorder = (isUser) => {
  return isUser ? 'none' : '1px solid rgba(55, 65, 81, 0.5)';
};

export default MessageBubble;