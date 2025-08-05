// ============================================
// 📝 MESSAGE LIST COMPONENT
// ============================================

import React, { useState } from 'react';
import { Sparkles, AlertCircle, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { renderMessageContent } from '../../../utils/messageRenderer';

/**
 * Lista de mensajes del chat
 * @param {Object} props - Props del componente
 */
const MessageList = ({ messages, isMobile }) => {
  const [expandedThinking, setExpandedThinking] = useState({});

  /**
   * Toggle del panel de pensamiento
   */
  const toggleThinking = (messageIndex) => {
    setExpandedThinking(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }));
  };

  /**
   * Copiar contenido al portapapeles
   */
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Texto copiado al portapapeles');
    }).catch(err => {
      console.error('Error copiando texto:', err);
    });
  };

  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <>
      {messages.map((message, index) => (
        <MessageBubble
          key={index}
          message={message}
          index={index}
          isMobile={isMobile}
          isThinkingExpanded={expandedThinking[index]}
          onToggleThinking={() => toggleThinking(index)}
          onCopy={() => copyToClipboard(message.content)}
        />
      ))}
    </>
  );
};

/**
 * Componente individual de burbuja de mensaje
 */
const MessageBubble = ({ 
  message, 
  index, 
  isMobile, 
  isThinkingExpanded, 
  onToggleThinking, 
  onCopy 
}) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      justifyContent: isUser ? 'flex-end' : 'flex-start'
    }}>
      {/* Contenido del mensaje */}
      <div style={{
        maxWidth: isMobile ? '85%' : '768px',
        order: isUser ? 2 : 1
      }}>
        {/* Header para mensajes del asistente */}
        {isAssistant && (
          <MessageHeader 
            message={message}
            isMobile={isMobile}
            onCopy={onCopy}
          />
        )}
        
        {/* Burbuja principal */}
        <div style={{
          borderRadius: '16px',
          padding: '12px 16px',
          backgroundColor: isUser ? '#2563eb' : 'rgba(31, 41, 55, 0.5)',
          border: isUser ? 'none' : '1px solid rgba(55, 65, 81, 0.5)',
          wordBreak: 'break-word',
          position: 'relative'
        }}>
          {/* Contenido renderizado */}
          <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
            {renderMessageContent(message.content)}
          </div>

          {/* Panel de pensamiento */}
          {message.thinking && (
            <ThinkingPanel
              thinking={message.thinking}
              isExpanded={isThinkingExpanded}
              onToggle={onToggleThinking}
            />
          )}
        </div>
      </div>
      
      {/* Avatar */}
      <MessageAvatar 
        isUser={isUser}
        order={isUser ? 1 : 2}
      />
    </div>
  );
};

/**
 * Header del mensaje con información del agente
 */
const MessageHeader = ({ message, isMobile, onCopy }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: '4px' 
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '20px',
        height: '20px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Sparkles style={{ width: '12px', height: '12px' }} />
      </div>
      
      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
        {message.agent || 'AI Assistant'}
      </span>
      
      {message.timestamp && !isMobile && (
        <span style={{ fontSize: '11px', color: '#6b7280' }}>
          {message.timestamp.toLocaleTimeString()}
        </span>
      )}
    </div>

    {/* Botón copiar */}
    <button
      onClick={onCopy}
      style={{
        padding: '4px',
        background: 'transparent',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        color: '#9ca3af',
        transition: 'color 0.2s'
      }}
      onMouseEnter={(e) => e.target.style.color = '#d1d5db'}
      onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
      title="Copiar mensaje"
    >
      <Copy style={{ width: '12px', height: '12px' }} />
    </button>
  </div>
);

/**
 * Avatar del mensaje
 */
const MessageAvatar = ({ isUser, order }) => (
  <div style={{
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: isUser ? '#2563eb' : 'rgba(55, 65, 81, 0.5)',
    order: order
  }}>
    {isUser ? (
      <span style={{ fontSize: '11px', fontWeight: '500' }}>Tú</span>
    ) : (
      <Sparkles style={{ width: '12px', height: '12px' }} />
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
        padding: 0,
        transition: 'color 0.2s'
      }}
      onMouseEnter={(e) => e.target.style.color = '#d1d5db'}
      onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
    >
      <AlertCircle style={{ width: '12px', height: '12px' }} />
      <span>Proceso de análisis</span>
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
        fontFamily: 'Monaco, Consolas, monospace'
      }}>
        {thinking}
      </div>
    )}
  </div>
);

export default MessageList;