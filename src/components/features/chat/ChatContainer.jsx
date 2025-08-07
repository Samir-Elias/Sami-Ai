// ============================================
// 💬 CHAT CONTAINER COMPONENT - SIN RESTRICCIONES DE ARCHIVOS
// ============================================

import React, { useRef, useEffect, useState } from 'react';
import { Send, Upload, Sparkles, HelpCircle, AlertCircle } from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ThinkingIndicator from './ThinkingIndicator';

// ✅ CONTEXTO ACTUALIZADO
import { useApp, useBackendStatus, useAPI } from '../../../context/AppContext';

/**
 * Contenedor principal del chat - FUNCIONA SIN ARCHIVOS
 */
const ChatContainer = ({
  messages = [],
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
  const [localInput, setLocalInput] = useState(input);

  // ✅ CONTEXTO ACTUALIZADO - permite uso offline
  const appContext = useApp();
  const { 
    messages: contextMessages = [],
    conversation,
    currentProvider = 'gemini',
    offlineMode
  } = appContext || {};

  const { isConnected: isBackendConnected = false } = useBackendStatus() || {};
  const { api, isLoading: apiLoading = false, error } = useAPI() || {};

  // ✅ Usar mensajes del contexto si no hay props
  const displayMessages = messages.length > 0 ? messages : contextMessages;
  const displayLoading = isLoading || apiLoading;
  const canUseChat = isBackendConnected || offlineMode; // ✅ Permitir chat offline

  // Auto scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayMessages, displayLoading, thinkingProcess]);

  // Sincronizar input local con prop
  useEffect(() => {
    setLocalInput(input);
  }, [input]);

  // ✅ HANDLER MEJORADO - funciona sin backend
  const handleSendMessage = async () => {
    const messageText = localInput.trim();
    if (!messageText) return;

    // ✅ Validación mínima - no requiere archivos
    if (!canUseChat) {
      alert('No se puede enviar mensajes. Configura una API key en Settings.');
      return;
    }

    try {
      // Limpiar input inmediatamente
      setLocalInput('');
      if (onInputChange) onInputChange('');

      // Agregar mensaje del usuario
      const userMessage = {
        role: 'user',
        content: messageText,
        timestamp: new Date(),
        id: Date.now()
      };

      if (conversation?.addMessage) {
        conversation.addMessage(userMessage);
      }

      // Preparar mensajes para la API
      const chatMessages = [...displayMessages, userMessage];

      // ✅ Llamar a la API (backend o directa)
      if (onSendMessage && typeof onSendMessage === 'function') {
        // Usar handler personalizado si existe
        await onSendMessage();
      } else {
        // ✅ Usar API directamente desde el contexto
        const response = await api.chatWithAI(chatMessages, {
          provider: currentProvider
        });

        // Agregar respuesta de la IA
        const assistantMessage = {
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
          id: Date.now() + 1,
          provider: response.provider,
          model: response.model,
          usage: response.usage
        };

        if (conversation?.addMessage) {
          conversation.addMessage(assistantMessage);
        }
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      
      // Restaurar input si hay error
      setLocalInput(messageText);
      if (onInputChange) onInputChange(messageText);
      
      // Mostrar error al usuario
      if (conversation?.addMessage) {
        const errorMessage = {
          role: 'assistant',
          content: `❌ Error: ${error.message}`,
          timestamp: new Date(),
          id: Date.now() + 2,
          isError: true
        };
        conversation.addMessage(errorMessage);
      }
    }
  };

  // ✅ Handler para cambios en el input
  const handleInputChange = (value) => {
    setLocalInput(value);
    if (onInputChange) onInputChange(value);
  };

  return (
    <div 
      className="fade-in-up"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Área de mensajes */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: isMobile ? '8px' : '16px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* ✅ SIEMPRE MOSTRAR CHAT - no requiere archivos */}
        {displayMessages.length === 0 && !displayLoading ? (
          <CenteredEmptyState 
            isMobile={isMobile}
            currentProject={currentProject}
            onFileUpload={onFileUpload}
            canUseChat={canUseChat}
            isBackendConnected={isBackendConnected}
            offlineMode={offlineMode}
            onStartChat={() => {
              // Focus en el input para comenzar a escribir
              const inputElement = document.querySelector('textarea');
              if (inputElement) inputElement.focus();
            }}
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

      {/* ✅ INPUT SIEMPRE VISIBLE */}
      <MessageInput
        value={localInput}
        isLoading={displayLoading}
        currentProject={currentProject}
        isMobile={isMobile}
        canUseChat={canUseChat}
        isBackendConnected={isBackendConnected}
        onChange={handleInputChange}
        onSend={handleSendMessage}
        onFileUpload={onFileUpload}
      />
    </div>
  );
};

/**
 * ✅ Estado vacío MEJORADO - permite chat sin archivos
 */
const CenteredEmptyState = ({ 
  isMobile, 
  currentProject, 
  onFileUpload,
  canUseChat,
  isBackendConnected,
  offlineMode,
  onStartChat
}) => {
  const fileInputRef = useRef(null);

  const handleFileButtonClick = () => {
    if (onFileUpload && typeof onFileUpload === 'function') {
      onFileUpload();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div 
      className="animated-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
        padding: isMobile ? '20px' : '40px',
        maxWidth: '600px',
        margin: '0 auto'
      }}
    >
      {/* Logo animado */}
      <div 
        className="animated-logo main-logo"
        style={{
          width: isMobile ? '80px' : '120px',
          height: isMobile ? '80px' : '120px',
          background: canUseChat
            ? 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)'
            : 'linear-gradient(135deg, #6b7280 0%, #374151 100%)',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          position: 'relative'
        }}
      >
        <Sparkles style={{ 
          width: isMobile ? '40px' : '60px', 
          height: isMobile ? '40px' : '60px',
          color: 'white'
        }} />
        
        {/* Indicador de estado */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: isBackendConnected ? '#10b981' : offlineMode ? '#f59e0b' : '#ef4444',
          border: '2px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }} />
      </div>

      {/* Mensaje principal */}
      <h2 
        className="gentle-float"
        style={{
          fontSize: isMobile ? '24px' : '32px',
          fontWeight: 'bold',
          marginBottom: '12px',
          background: canUseChat
            ? 'linear-gradient(135deg, #60a5fa, #a855f7)'
            : 'linear-gradient(135deg, #9ca3af, #6b7280)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: '0 0 12px 0'
        }}
      >
        {canUseChat 
          ? '¡Hola! ¿En qué puedo ayudarte?'
          : 'Configura tu API para comenzar'
        }
      </h2>

      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        color: canUseChat ? '#9ca3af' : '#ef4444',
        marginBottom: '32px',
        maxWidth: '500px',
        lineHeight: '1.5',
        margin: '0 0 32px 0'
      }}>
        {!canUseChat 
          ? 'Necesitas configurar al menos una API key para usar el chat'
          : isBackendConnected
            ? 'Escribe tu pregunta abajo o sube archivos para análisis de código'
            : offlineMode
              ? 'Modo offline activo - usando API directa. Escribe tu pregunta abajo.'
              : 'Escribe tu pregunta para comenzar'
        }
      </p>

      {/* ✅ EJEMPLOS Y ACCIONES */}
      {canUseChat ? (
        <QuickExamples 
          isMobile={isMobile} 
          currentProject={currentProject}
          onFileUpload={handleFileButtonClick}
          onStartChat={onStartChat}
          isBackendConnected={isBackendConnected}
          offlineMode={offlineMode}
        />
      ) : (
        <ConfigurationNeeded />
      )}

      {/* Input de archivos oculto */}
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
    </div>
  );
};

/**
 * Estado cuando no hay configuración
 */
const ConfigurationNeeded = () => (
  <div 
    className="animated-card"
    style={{
      padding: '20px',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '2px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '12px',
      maxWidth: '400px'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <AlertCircle style={{ width: '24px', height: '24px', color: '#ef4444' }} />
      <h3 style={{ margin: 0, fontSize: '18px', color: '#fca5a5' }}>
        Configuración Requerida
      </h3>
    </div>
    <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#fca5a5' }}>
      Para usar DevAI Agent necesitas configurar al menos una API key gratuita.
    </p>
    <p style={{ margin: '0', fontSize: '12px', color: '#9ca3af' }}>
      💡 Ve a Settings ⚙️ para configurar Gemini, Groq, HuggingFace u Ollama
    </p>
  </div>
);

/**
 * ✅ Ejemplos rápidos MEJORADOS - permiten chat directo
 */
const QuickExamples = ({ 
  isMobile, 
  currentProject, 
  onFileUpload, 
  onStartChat,
  isBackendConnected,
  offlineMode
}) => {
  const examples = currentProject ? [
    "¿Qué hace este código?",
    "Encuentra posibles bugs", 
    "Optimiza el rendimiento",
    "Explica esta función"
  ] : [
    { text: "Crea una landing page moderna", type: "chat" },
    { text: "Explica qué es React", type: "chat" },
    { text: "Ayúdame con JavaScript", type: "chat" },
    { text: "📁 Subir proyecto", type: "upload" }
  ];

  const handleItemClick = (item) => {
    if (typeof item === 'string') return; // Para el caso con proyecto
    
    if (item.type === 'upload' && onFileUpload) {
      onFileUpload();
    } else if (item.type === 'chat' && onStartChat) {
      // ✅ Llenar el input con el ejemplo
      const inputElement = document.querySelector('textarea');
      if (inputElement) {
        inputElement.value = item.text;
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.focus();
      }
      onStartChat();
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
        const isChat = !isString && example.type === 'chat';
        
        return (
          <div
            key={index}
            onClick={() => handleItemClick(example)}
            className="animated-button interactive-button"
            style={{
              padding: '12px 16px',
              background: isUpload 
                ? 'rgba(59, 130, 246, 0.1)' 
                : isChat
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'rgba(31, 41, 55, 0.5)',
              border: isUpload 
                ? '1px solid rgba(59, 130, 246, 0.3)' 
                : isChat
                  ? '1px solid rgba(34, 197, 94, 0.3)'
                  : '1px solid rgba(55, 65, 81, 0.5)',
              borderRadius: '8px',
              fontSize: '13px',
              color: isUpload 
                ? '#60a5fa' 
                : isChat
                  ? '#86efac'
                  : '#d1d5db',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isString ? `💡 ${text}` : text}
          </div>
        );
      })}
      
      {/* ✅ Estado de conexión */}
      <div style={{
        gridColumn: isMobile ? '1' : '1 / -1',
        padding: '8px 12px',
        backgroundColor: isBackendConnected 
          ? 'rgba(16, 185, 129, 0.1)' 
          : offlineMode
            ? 'rgba(245, 158, 11, 0.1)'
            : 'rgba(107, 114, 128, 0.1)',
        border: isBackendConnected
          ? '1px solid rgba(16, 185, 129, 0.3)'
          : offlineMode
            ? '1px solid rgba(245, 158, 11, 0.3)'
            : '1px solid rgba(107, 114, 128, 0.3)',
        borderRadius: '6px',
        fontSize: '12px',
        textAlign: 'center',
        color: isBackendConnected ? '#86efac' : offlineMode ? '#fbbf24' : '#9ca3af'
      }}>
        {isBackendConnected 
          ? '🟢 Backend conectado - Funcionalidad completa'
          : offlineMode
            ? '🟡 Modo offline - API directa activa'
            : '🔴 Configuración necesaria'
        }
      </div>
    </div>
  );
};

/**
 * Componente de error
 */
const ErrorMessage = ({ error, isMobile }) => (
  <div 
    className="message-bubble"
    style={{
      padding: '12px 16px',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      maxWidth: isMobile ? '100%' : '600px',
      margin: '0 auto'
    }}
  >
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