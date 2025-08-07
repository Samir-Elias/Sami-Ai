// ============================================
// ✏️ MESSAGE INPUT COMPONENT - SIN RESTRICCIONES
// ============================================

import React, { useRef } from 'react';
import { Send, Upload, Settings, CheckCircle, Zap, Wifi, WifiOff } from 'lucide-react';

/**
 * ✅ Componente de input de mensajes SIN RESTRICCIONES
 * @param {Object} props - Props del componente
 */
const MessageInput = ({
  value,
  isLoading,
  currentProject,
  isMobile,
  canUseChat = true, // ✅ Ya no depende solo del backend
  isBackendConnected = false,
  onChange,
  onSend,
  onFileUpload,
  onSettingsToggle
}) => {
  const fileInputRef = useRef(null);

  /**
   * Manejar teclas presionadas
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // ✅ Enviar si hay texto Y se puede usar el chat
      if (value.trim() && canUseChat) {
        onSend();
      }
    }
  };

  /**
   * Manejar envío
   */
  const handleSend = () => {
    if (value.trim() && canUseChat && onSend) {
      onSend();
    }
  };

  /**
   * Manejar subida de archivos
   */
  const handleFileUpload = (event) => {
    if (onFileUpload) {
      onFileUpload(event);
    }
    // Limpiar el input para permitir subir el mismo archivo de nuevo
    event.target.value = '';
  };

  return (
    <div 
      className="animated-progress-bar" // ✅ Barra morada animada
      style={{
        borderTop: '1px solid #374151',
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        backdropFilter: 'blur(12px)',
        padding: '16px',
        position: 'relative'
      }}
    >
      <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            {/* ✅ Botones superiores - MEJORADOS */}
            <TopControls
              isMobile={isMobile}
              currentProject={currentProject}
              onFileUpload={() => fileInputRef.current?.click()}
              onSettingsToggle={onSettingsToggle}
              canUseChat={canUseChat}
              isBackendConnected={isBackendConnected}
            />
            
            {/* ✅ Área de texto - SIEMPRE ACTIVA */}
            <TextInputArea
              value={value}
              isLoading={isLoading}
              currentProject={currentProject}
              isMobile={isMobile}
              canUseChat={canUseChat}
              onChange={onChange}
              onKeyDown={handleKeyDown}
              onSend={handleSend}
            />
          </div>
          
          {/* ✅ Botón de envío - solo en desktop */}
          {!isMobile && (
            <SendButton
              isLoading={isLoading}
              disabled={!value.trim() || !canUseChat}
              onClick={handleSend}
              canUseChat={canUseChat}
            />
          )}
        </div>
        
        {/* ✅ Información inferior - MEJORADA */}
        <BottomInfo
          isMobile={isMobile}
          canUseChat={canUseChat}
          currentProject={currentProject}
          isBackendConnected={isBackendConnected}
        />
      </div>

      {/* Input de archivos oculto */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".js,.jsx,.ts,.tsx,.py,.html,.css,.json,.md,.txt,.php,.java,.cpp,.c,.cs,.rb,.go,.rs,.swift,.kt,.dart,.vue,.svelte,.astro"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
};

/**
 * ✅ Controles superiores - MEJORADOS
 */
const TopControls = ({ 
  isMobile, 
  currentProject, 
  onFileUpload, 
  onSettingsToggle,
  canUseChat,
  isBackendConnected
}) => {
  if (isMobile && currentProject) return null; // Ocultar en móvil si hay proyecto

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      marginBottom: '8px',
      flexWrap: 'wrap'
    }}>
      {/* Botón subir archivos */}
      <button
        className="interactive-button animated-button"
        onClick={onFileUpload}
        style={{
          padding: isMobile ? '6px' : '8px',
          backgroundColor: 'rgba(55, 65, 81, 0.5)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: isMobile ? '12px' : '14px'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#374151'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'}
        title="Subir archivos del proyecto"
      >
        <Upload style={{ width: isMobile ? '14px' : '16px', height: isMobile ? '14px' : '16px' }} />
        {!isMobile && 'Subir'}
      </button>
      
      {/* ✅ Estado del sistema */}
      <SystemStatusChip 
        isBackendConnected={isBackendConnected}
        canUseChat={canUseChat}
        isMobile={isMobile}
      />
      
      {/* Botón configuración */}
      {onSettingsToggle && (
        <button
          className="interactive-button"
          onClick={onSettingsToggle}
          style={{
            padding: isMobile ? '6px' : '8px',
            backgroundColor: canUseChat ? 'rgba(55, 65, 81, 0.5)' : 'rgba(245, 158, 11, 0.3)',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative'
          }}
          title="Configuración"
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = canUseChat ? '#374151' : 'rgba(245, 158, 11, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = canUseChat ? 'rgba(55, 65, 81, 0.5)' : 'rgba(245, 158, 11, 0.3)';
          }}
        >
          <Settings style={{ width: isMobile ? '14px' : '16px', height: isMobile ? '14px' : '16px' }} />
          {!canUseChat && (
            <span 
              className="subtle-pulse"
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '6px',
                height: '6px',
                backgroundColor: '#eab308',
                borderRadius: '50%'
              }}
            />
          )}
        </button>
      )}
    </div>
  );
};

/**
 * ✅ Chip de estado del sistema
 */
const SystemStatusChip = ({ isBackendConnected, canUseChat, isMobile }) => {
  const getStatus = () => {
    if (isBackendConnected) {
      return {
        icon: <Wifi style={{ width: '12px', height: '12px' }} />,
        text: 'Backend',
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.2)'
      };
    } else if (canUseChat) {
      return {
        icon: <Zap style={{ width: '12px', height: '12px' }} />,
        text: 'Direct',
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.2)'
      };
    } else {
      return {
        icon: <WifiOff style={{ width: '12px', height: '12px' }} />,
        text: 'Config',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.2)'
      };
    }
  };

  const status = getStatus();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      backgroundColor: status.bgColor,
      borderRadius: '12px',
      fontSize: isMobile ? '10px' : '11px',
      color: status.color,
      fontWeight: '500',
      border: `1px solid ${status.color}40`
    }}>
      {status.icon}
      <span>{status.text}</span>
    </div>
  );
};

/**
 * ✅ Área de texto principal - MEJORADA
 */
const TextInputArea = ({ 
  value, 
  isLoading, 
  currentProject, 
  isMobile, 
  canUseChat,
  onChange, 
  onKeyDown,
  onSend 
}) => {
  const getPlaceholder = () => {
    if (!canUseChat) {
      return "Configura una API key en Settings para comenzar...";
    }
    if (currentProject && currentProject !== 'AI Dev Agent') {
      return `Pregunta sobre "${currentProject}"...`;
    }
    return isMobile 
      ? "Pregunta sobre desarrollo..."
      : "Haz una pregunta sobre desarrollo, código, o cualquier tema técnico...";
  };

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        className="animated-button"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={getPlaceholder()}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: isMobile ? '10px 12px' : '12px 16px',
          paddingRight: isMobile ? '45px' : '16px',
          backgroundColor: canUseChat ? '#374151' : 'rgba(55, 65, 81, 0.3)',
          border: `1px solid ${canUseChat ? '#4b5563' : 'rgba(245, 158, 11, 0.5)'}`,
          borderRadius: '12px',
          color: canUseChat ? 'white' : '#d1d5db',
          fontSize: isMobile ? '16px' : '14px', // 16px previene zoom en iOS
          outline: 'none',
          resize: 'none',
          minHeight: isMobile ? '44px' : '50px',
          maxHeight: isMobile ? '100px' : '120px',
          fontFamily: 'inherit',
          lineHeight: '1.4',
          transition: 'border-color 0.2s, background-color 0.2s',
          cursor: canUseChat ? 'text' : 'not-allowed'
        }}
        onFocus={(e) => {
          if (canUseChat) {
            e.target.style.borderColor = '#2563eb';
            e.target.style.backgroundColor = '#374151';
          }
        }}
        onBlur={(e) => {
          e.target.style.borderColor = canUseChat ? '#4b5563' : 'rgba(245, 158, 11, 0.5)';
          e.target.style.backgroundColor = canUseChat ? '#374151' : 'rgba(55, 65, 81, 0.3)';
        }}
        rows={isMobile ? 1 : 2}
      />
      
      {/* ✅ Botón de envío integrado en móvil - MEJORADO */}
      {isMobile && (
        <button
          className="interactive-button"
          onClick={onSend}
          disabled={isLoading || !value.trim() || !canUseChat}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '8px',
            backgroundColor: (isLoading || !value.trim() || !canUseChat) ? '#6b7280' : '#2563eb',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: (isLoading || !value.trim() || !canUseChat) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (canUseChat && value.trim() && !isLoading) {
              e.target.style.backgroundColor = '#1d4ed8';
              e.target.style.transform = 'translateY(-50%) scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (canUseChat && value.trim() && !isLoading) {
              e.target.style.backgroundColor = '#2563eb';
              e.target.style.transform = 'translateY(-50%) scale(1)';
            }
          }}
        >
          <Send style={{ 
            width: '16px', 
            height: '16px',
            transform: isLoading ? 'scale(0.9)' : 'scale(1)',
            transition: 'transform 0.2s'
          }} />
        </button>
      )}

      {/* ✅ Indicador de estado si no se puede usar */}
      {!canUseChat && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          fontSize: '12px',
          color: '#f59e0b',
          fontWeight: '500',
          background: 'rgba(245, 158, 11, 0.1)',
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid rgba(245, 158, 11, 0.3)'
        }}>
          ⚙️ Configuración requerida
        </div>
      )}
    </div>
  );
};

/**
 * ✅ Botón de envío para desktop - MEJORADO
 */
const SendButton = ({ isLoading, disabled, onClick, canUseChat }) => (
  <button
    className="interactive-button animated-button"
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '12px',
      backgroundColor: disabled ? '#4b5563' : '#2563eb',
      border: 'none',
      borderRadius: '12px',
      color: 'white',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s',
      minWidth: '48px',
      height: '50px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      boxShadow: disabled ? 'none' : '0 2px 8px rgba(37, 99, 235, 0.3)'
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.target.style.backgroundColor = '#1d4ed8';
        e.target.style.transform = 'scale(1.05)';
        e.target.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.5)';
      }
    }}
    onMouseLeave={(e) => {
      if (!disabled) {
        e.target.style.backgroundColor = '#2563eb';
        e.target.style.transform = 'scale(1)';
        e.target.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.3)';
      }
    }}
  >
    <Send style={{ 
      width: '20px', 
      height: '20px',
      transform: isLoading ? 'scale(0.9)' : 'scale(1)',
      transition: 'transform 0.2s'
    }} />
    
    {/* Loading indicator */}
    {isLoading && (
      <div style={{
        position: 'absolute',
        width: '16px',
        height: '16px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: 'white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
    )}
  </button>
);

/**
 * ✅ Información inferior - MEJORADA
 */
const BottomInfo = ({ 
  isMobile, 
  canUseChat, 
  currentProject, 
  isBackendConnected 
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: isMobile ? 'center' : 'space-between',
    marginTop: '8px',
    fontSize: isMobile ? '11px' : '12px',
    color: '#9ca3af',
    flexWrap: 'wrap',
    gap: '8px'
  }}>
    {/* Info principal */}
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: isMobile ? '8px' : '16px',
      flexWrap: 'wrap',
      justifyContent: isMobile ? 'center' : 'flex-start'
    }}>
      {!isMobile && (
        <span>Enter para enviar • Shift+Enter nueva línea</span>
      )}
      
      {/* ✅ Estado del sistema */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{
          width: '8px',
          height: '8px',
          backgroundColor: canUseChat ? '#10b981' : '#eab308',
          borderRadius: '50%'
        }} />
        <span>{canUseChat ? 'Listo para usar' : 'Configurar API'}</span>
      </div>
      
      {/* Estado de conexión */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{
          width: '8px',
          height: '8px',
          backgroundColor: isBackendConnected ? '#10b981' : '#f59e0b',
          borderRadius: '50%'
        }} />
        <span>{isBackendConnected ? 'Backend' : 'Directo'}</span>
      </div>
      
      {currentProject && currentProject !== 'AI Dev Agent' && (
        <>
          <span>•</span>
          <span>📁 {currentProject}</span>
        </>
      )}
    </div>
    
    {/* Status adicional - solo desktop */}
    {!isMobile && canUseChat && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <CheckCircle style={{ width: '12px', height: '12px', color: '#10b981' }} />
        <span>Sistema activo</span>
      </div>
    )}
  </div>
);

export default MessageInput;