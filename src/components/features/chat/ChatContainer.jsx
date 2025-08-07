// ============================================
// 💬 CHAT CONTAINER COMPONENT - COMPLETAMENTE FUNCIONAL
// ============================================

import React, { useRef, useEffect, useState } from 'react';
import { Send, Upload, Sparkles, HelpCircle, AlertCircle } from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ThinkingIndicator from './ThinkingIndicator';

// Contexto unificado
import { useApp, useBackendStatus, useAPI } from '../../../context/AppContext';

/**
 * Contenedor principal del chat con estado vacío centrado
 */
const ChatContainer = ({
  messages = [], // ✅ Valor por defecto
  input = '',
  isLoading = false,
  thinkingProcess = '',
  currentProject = '',
  isMobile = false,
  onInputChange,
  onSendMessage,
  onFileUpload
}) => {
  const messagesEndRef = useRef(null);
  const [localMessages, setLocalMessages] = useState(messages);

  // ✅ Usar contexto unificado como backup
  const appContext = useApp();
  const { 
    messages: contextMessages = [],
    conversation,
    currentProvider = 'gemini'
  } = appContext || {};

  const { isConnected: isBackendConnected = false } = useBackendStatus() || {};
  const { api, isLoading: apiLoading = false, error } = useAPI() || {};

  // ✅ Usar mensajes del contexto si no hay props
  const displayMessages = messages.length > 0 ? messages : contextMessages;
  const displayLoading = isLoading || apiLoading;

  // Auto scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayMessages, displayLoading, thinkingProcess]);

  // ✅ Sincronizar mensajes locales
  useEffect(() => {
    setLocalMessages(displayMessages);
  }, [displayMessages]);

  // ✅ Handler de envío con validación
  const handleSendMessage = async () => {
    if (typeof onSendMessage === 'function') {
      await onSendMessage();
    } else if (conversation?.addMessage && api?.chatWithAI) {
      // Fallback usando contexto directamente
      await handleDirectSend();
    }
  };

  // ✅ Envío directo usando contexto
  const handleDirectSend = async () => {
    if (!input.trim() || displayLoading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    // Agregar mensaje del usuario
    if (conversation?.addMessage) {
      conversation.addMessage(userMessage);
    }

    try {
      // Llamar a la API
      const response = await api.chatWithAI([...displayMessages, userMessage], {
        provider: currentProvider
      });

      // Agregar respuesta
      const assistantMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        provider: response.provider,
        model: response.model
      };

      if (conversation?.addMessage) {
        conversation.addMessage(assistantMessage);
      }

    } catch (error) {
      console.error('Error en chat:', error);
      
      // Agregar mensaje de error
      const errorMessage = {
        role: 'assistant',
        content: `❌ Error: ${error.message}`,
        timestamp: new Date(),
        isError: true
      };

      if (conversation?.addMessage) {
        conversation.addMessage(errorMessage);
      }
    }
  };

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
        padding: isMobile ? '8px' : '16px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Estado vacío centrado o mensajes */}
        {displayMessages.length === 0 && !displayLoading ? (
          <CenteredEmptyState 
            isMobile={isMobile}
            currentProject={currentProject}
            onFileUpload={onFileUpload}
            isBackendConnected={isBackendConnected}
          />
        ) : (
          <div style={{
            maxWidth: isMobile ? '100%' : '896px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '100%'
          }}>
            {/* Lista de mensajes */}
            <MessageList 
              messages={displayMessages}
              isMobile={isMobile}
            />

            {/* Indicador de pensamiento */}
            {(thinkingProcess || displayLoading) && (
              <ThinkingIndicator 
                process={thinkingProcess || 'Procesando...'}
                isMobile={isMobile}
              />
            )}

            {/* Error display */}
            {error && (
              <ErrorMessage 
                error={error}
                isMobile={isMobile}
              />
            )}

            {/* Referencia para auto-scroll */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input de mensajes */}
      <MessageInput
        value={input}
        isLoading={displayLoading}
        currentProject={currentProject}
        isMobile={isMobile}
        isBackendConnected={isBackendConnected}
        onChange={onInputChange}
        onSend={handleSendMessage}
        onFileUpload={onFileUpload}
      />
    </div>
  );
};

/**
 * ✨ Estado vacío centrado en la pantalla
 */
const CenteredEmptyState = ({ 
  isMobile, 
  currentProject, 
  onFileUpload,
  isBackendConnected 
}) => {
  // Crear referencia para el input de archivos
  const fileInputRef = useRef(null);

  // Función para manejar clic en botón de archivo
  const handleFileButtonClick = () => {
    if (onFileUpload && typeof onFileUpload === 'function') {
      onFileUpload();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      textAlign: 'center',
      padding: isMobile ? '20px' : '40px',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      {/* Logo animado */}
      <div style={{
        width: isMobile ? '80px' : '120px',
        height: isMobile ? '80px' : '120px',
        background: isBackendConnected
          ? 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)'
          : 'linear-gradient(135deg, #6b7280 0%, #374151 100%)',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: isBackendConnected
          ? '0 8px 32px rgba(59, 130, 246, 0.3)'
          : '0 8px 32px rgba(107, 114, 128, 0.3)',
        animation: 'pulse 2s infinite',
        position: 'relative'
      }}>
        <Sparkles style={{ 
          width: isMobile ? '40px' : '60px', 
          height: isMobile ? '40px' : '60px',
          color: 'white'
        }} />
        
        {/* Indicador de conexión */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: isBackendConnected ? '#10b981' : '#ef4444',
          border: '2px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }} />
      </div>

      {/* Mensaje principal */}
      <h2 style={{
        fontSize: isMobile ? '24px' : '32px',
        fontWeight: 'bold',
        marginBottom: '12px',
        background: isBackendConnected
          ? 'linear-gradient(135deg, #60a5fa, #a855f7)'
          : 'linear-gradient(135deg, #9ca3af, #6b7280)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        margin: '0 0 12px 0'
      }}>
        {currentProject ? 
          `¡Hola! Pregúntame sobre ${currentProject}` : 
          isBackendConnected 
            ? '¡Hola! ¿En qué puedo ayudarte?'
            : 'Backend desconectado'
        }
      </h2>

      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        color: isBackendConnected ? '#9ca3af' : '#ef4444',
        marginBottom: '32px',
        maxWidth: '500px',
        lineHeight: '1.5',
        margin: '0 0 32px 0'
      }}>
        {!isBackendConnected 
          ? 'Conecta el backend para comenzar a chatear con la IA'
          : currentProject 
            ? `Tengo acceso a los archivos de tu proyecto. Puedo ayudarte con código, bugs, optimizaciones y más.`
            : 'Escribe tu pregunta abajo o sube un proyecto para comenzar.'
        }
      </p>

      {/* Ejemplos rápidos o estado de error */}
      {isBackendConnected ? (
        <QuickExamples 
          isMobile={isMobile} 
          currentProject={currentProject}
          onFileUpload={handleFileButtonClick}
        />
      ) : (
        <BackendErrorState />
      )}

      {/* Input de archivos oculto para EmptyState */}
      {!currentProject && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".js,.jsx,.ts,.tsx,.py,.html,.css,.json,.md,.txt,.php,.java,.cpp,.c,.cs,.rb,.go,.rs,.swift,.kt,.dart,.vue,.svelte,.astro"
          onChange={onFileUpload}
          style={{ display: 'none' }}
          webkitdirectory=""
        />
      )}

      {/* CSS para animaciones */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

/**
 * Estado de error del backend
 */
const BackendErrorState = () => (
  <div style={{
    padding: '20px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '2px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    maxWidth: '400px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <AlertCircle style={{ width: '24px', height: '24px', color: '#ef4444' }} />
      <h3 style={{ margin: 0, fontSize: '18px', color: '#fca5a5' }}>
        Backend Offline
      </h3>
    </div>
    <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#fca5a5' }}>
      Para usar DevAI Agent necesitas iniciar el servidor backend.
    </p>
    <div style={{
      padding: '12px',
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#e2e8f0',
      fontFamily: 'Monaco, Consolas, monospace'
    }}>
      npm run server<br />
      # o<br />
      node server.js
    </div>
  </div>
);

/**
 * Ejemplos rápidos para el usuario
 */
const QuickExamples = ({ isMobile, currentProject, onFileUpload }) => {
  const examples = currentProject ? [
    "¿Qué hace este código?",
    "Encuentra posibles bugs", 
    "Optimiza el rendimiento",
    "Explica esta función"
  ] : [
    { text: "Crea una landing page moderna", type: "example" },
    { text: "Explica qué es React", type: "example" },
    { text: "Ayúdame con CSS Grid", type: "example" },
    { text: "📁 Subir proyecto", type: "upload" }
  ];

  const handleItemClick = (item) => {
    if (typeof item === 'string') return; // Para el caso con proyecto
    
    if (item.type === 'upload' && onFileUpload) {
      onFileUpload();
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '12px',
      maxWidth: '400px',
      width: '100%'
    }}>
      {examples.map((example, index) => {
        const isString = typeof example === 'string';
        const text = isString ? example : example.text;
        const isUpload = !isString && example.type === 'upload';
        
        return (
          <div
            key={index}
            onClick={() => handleItemClick(example)}
            style={{
              padding: '12px 16px',
              background: isUpload ? 'rgba(59, 130, 246, 0.1)' : 'rgba(31, 41, 55, 0.5)',
              border: isUpload ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(55, 65, 81, 0.5)',
              borderRadius: '8px',
              fontSize: '13px',
              color: isUpload ? '#60a5fa' : '#d1d5db',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (isUpload) {
                e.target.style.background = 'rgba(59, 130, 246, 0.2)';
                e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
              } else {
                e.target.style.background = 'rgba(55, 65, 81, 0.7)';
                e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (isUpload) {
                e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
              } else {
                e.target.style.background = 'rgba(31, 41, 55, 0.5)';
                e.target.style.borderColor = 'rgba(55, 65, 81, 0.5)';
              }
            }}
          >
            {isString ? `💡 ${text}` : text}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Componente de error
 */
const ErrorMessage = ({ error, isMobile }) => (
  <div style={{
    padding: '12px 16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: isMobile ? '100%' : '600px',
    margin: '0 auto'
  }}>
    <AlertCircle style={{ 
      width: '20px', 
      height: '20px', 
      color: '#ef4444',
      flexShrink: 0 
    }} />
    <div>
      <div style={{ 
        fontSize: '14px', 
        fontWeight: '500', 
        color: '#fca5a5',
        marginBottom: '4px'
      }}>
        Error en la comunicación
      </div>
      <div style={{ fontSize: '12px', color: '#f87171' }}>
        {typeof error === 'string' ? error : error?.message || 'Error desconocido'}
      </div>
    </div>
  </div>
);

export default ChatContainer;