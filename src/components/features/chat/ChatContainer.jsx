// ============================================
// 💬 CHAT CONTAINER COMPONENT
// ============================================

import React, { useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ThinkingIndicator from './ThinkingIndicator';

/**
 * Contenedor principal del chat
 * @param {Object} props - Props del componente
 */
const ChatContainer = ({
  messages,
  input,
  isLoading,
  thinkingProcess,
  currentProject,
  isMobile,
  onInputChange,
  onSendMessage,
  onFileUpload
}) => {
  const messagesEndRef = useRef(null);

  // Auto scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Área de mensajes */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: isMobile ? '8px' : '16px'
      }}>
        <div style={{
          maxWidth: isMobile ? '100%' : '896px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Lista de mensajes */}
          <MessageList 
            messages={messages}
            isMobile={isMobile}
          />

          {/* Indicador de pensamiento */}
          {thinkingProcess && (
            <ThinkingIndicator 
              process={thinkingProcess}
              isMobile={isMobile}
            />
          )}

          {/* Referencia para auto-scroll */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input de mensajes */}
      <MessageInput
        value={input}
        isLoading={isLoading}
        currentProject={currentProject}
        isMobile={isMobile}
        onChange={onInputChange}
        onSend={onSendMessage}
        onFileUpload={onFileUpload}
      />
    </div>
  );
};

export default ChatContainer;