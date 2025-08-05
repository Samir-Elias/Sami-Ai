// ============================================
// 💬 CHAT CONTAINER COMPONENT (ACTUALIZADO)
// ============================================

import React, { useRef, useEffect } from 'react';
import { Send, Upload, Sparkles, HelpCircle } from 'lucide-react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ThinkingIndicator from './ThinkingIndicator';

/**
 * Contenedor principal del chat con estado vacío centrado
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
        padding: isMobile ? '8px' : '16px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Estado vacío centrado o mensajes */}
        {messages.length === 0 && !isLoading ? (
          <CenteredEmptyState 
            isMobile={isMobile}
            currentProject={currentProject}
            onFileUpload={onFileUpload}
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
        )}
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

/**
 * ✨ Estado vacío centrado en la pantalla
 */
const CenteredEmptyState = ({ isMobile, currentProject, onFileUpload }) => {
  // Crear referencia para el input de archivos
  const fileInputRef = useRef(null);

  // Función para manejar clic en botón de archivo
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
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
        background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
        borderRadius: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
        animation: 'pulse 2s infinite'
      }}>
        <Sparkles style={{ 
          width: isMobile ? '40px' : '60px', 
          height: isMobile ? '40px' : '60px',
          color: 'white'
        }} />
      </div>

      {/* Mensaje principal */}
      <h2 style={{
        fontSize: isMobile ? '24px' : '32px',
        fontWeight: 'bold',
        marginBottom: '12px',
        background: 'linear-gradient(135deg, #60a5fa, #a855f7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        margin: '0 0 12px 0'
      }}>
        {currentProject ? 
          `¡Hola! Pregúntame sobre ${currentProject.name}` : 
          '¡Hola! ¿En qué puedo ayudarte?'
        }
      </h2>

      <p style={{
        fontSize: isMobile ? '16px' : '18px',
        color: '#9ca3af',
        marginBottom: '32px',
        maxWidth: '500px',
        lineHeight: '1.5',
        margin: '0 0 32px 0'
      }}>
        {currentProject ? 
          `Tengo acceso a ${currentProject.files.length} archivos de tu proyecto. Puedo ayudarte con código, bugs, optimizaciones y más.` :
          'Escribe tu pregunta abajo o sube un proyecto para comenzar.'
        }
      </p>

      {/* Ejemplos rápidos */}
      <QuickExamples 
        isMobile={isMobile} 
        currentProject={currentProject}
        onFileUpload={handleFileButtonClick}
      />

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
    // Para los ejemplos de texto, podrías agregar una función para auto-completar el input
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

export default ChatContainer;