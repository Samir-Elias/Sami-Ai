// ============================================
// ✏️ MESSAGE INPUT COMPONENT
// ============================================

import React, { useRef } from 'react';
import { Send, Upload, Settings, CheckCircle } from 'lucide-react';

/**
 * Componente de input de mensajes
 * @param {Object} props - Props del componente
 */
const MessageInput = ({
  value,
  isLoading,
  currentProject,
  isMobile,
  apiKey,
  currentProvider,
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

  /**
   * Limpiar proyecto actual
   */
  const clearProject = () => {
    if (window.confirm('¿Estás seguro de que quieres limpiar el proyecto actual?')) {
      // Esta función debería ser pasada como prop
      console.log('Limpiar proyecto');
    }
  };

  return (
    <div style={{
      borderTop: '1px solid #374151',
      backgroundColor: 'rgba(31, 41, 55, 0.5)',
      backdropFilter: 'blur(12px)',
      padding: '16px'
    }}>
      <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            {/* Botones superiores */}
            <TopControls
              isMobile={isMobile}
              currentProject={currentProject}
              onFileUpload={() => fileInputRef.current?.click()}
              onClearProject={clearProject}
              onSettingsToggle={onSettingsToggle}
              apiKey={apiKey}
            />
            
            {/* Área de texto */}
            <TextInputArea
              value={value}
              isLoading={isLoading}
              currentProject={currentProject}
              isMobile={isMobile}
              onChange={onChange}
              onKeyDown={handleKeyDown}
              onSend={onSend}
            />
          </div>
          
          {/* Botón de envío - solo en desktop */}
          {!isMobile && (
            <SendButton
              isLoading={isLoading}
              disabled={!value.trim()}
              onClick={onSend}
            />
          )}
        </div>
        
        {/* Información inferior */}
        <BottomInfo
          isMobile={isMobile}
          apiKey={apiKey}
          currentProvider={currentProvider}
          currentProject={currentProject}
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
 * Controles superiores (archivos, proyecto, settings)
 */
const TopControls = ({ 
  isMobile, 
  currentProject, 
  onFileUpload, 
  onClearProject, 
  onSettingsToggle,
  apiKey 
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
      
      {/* Botón limpiar proyecto */}
      {currentProject && (
        <button
          onClick={onClearProject}
          style={{
            padding: isMobile ? '4px 8px' : '6px 12px',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            color: '#fca5a5',
            border: 'none',
            borderRadius: '6px',
            fontSize: isMobile ? '11px' : '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
        >
          {isMobile ? '🗑️' : 'Limpiar Proyecto'}
        </button>
      )}
      
      {/* Botón configuración en móvil */}
      {isMobile && onSettingsToggle && (
        <button
          onClick={onSettingsToggle}
          style={{
            padding: '6px',
            backgroundColor: 'rgba(55, 65, 81, 0.5)',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative'
          }}
          title="Configuración"
        >
          <Settings style={{ width: '14px', height: '14px' }} />
          {!apiKey && (
            <span style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '6px',
              height: '6px',
              backgroundColor: '#eab308',
              borderRadius: '50%'
            }}></span>
          )}
        </button>
      )}
    </div>
  );
};

/**
 * Área de texto principal
 */
const TextInputArea = ({ 
  value, 
  isLoading, 
  currentProject, 
  isMobile, 
  onChange, 
  onKeyDown,
  onSend 
}) => (
  <div style={{ position: 'relative' }}>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={currentProject 
        ? `Pregunta sobre "${currentProject.name}"...`
        : isMobile 
          ? "Pregunta sobre desarrollo..."
          : "Haz una pregunta sobre desarrollo, sube archivos, o pide ayuda con código..."
      }
      style={{
        width: '100%',
        padding: isMobile ? '10px 12px' : '12px 16px',
        paddingRight: isMobile ? '45px' : '16px',
        backgroundColor: '#374151',
        border: '1px solid #4b5563',
        borderRadius: '12px',
        color: 'white',
        fontSize: isMobile ? '16px' : '14px', // 16px previene zoom en iOS
        outline: 'none',
        resize: 'none',
        minHeight: isMobile ? '44px' : '50px',
        maxHeight: isMobile ? '100px' : '120px',
        fontFamily: 'inherit',
        lineHeight: '1.4'
      }}
      onFocus={(e) => e.target.style.borderColor = '#2563eb'}
      onBlur={(e) => e.target.style.borderColor = '#4b5563'}
      rows={isMobile ? 1 : 2}
      disabled={isLoading}
    />
    
    {/* Botón de envío integrado en móvil */}
    {isMobile && (
      <button
        onClick={onSend}
        disabled={isLoading || !value.trim()}
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '8px',
          backgroundColor: isLoading || !value.trim() ? '#6b7280' : '#2563eb',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          cursor: isLoading || !value.trim() ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
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
  </div>
);

/**
 * Botón de envío para desktop
 */
const SendButton = ({ isLoading, disabled, onClick }) => (
  <button
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
      justifyContent: 'center'
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.target.style.backgroundColor = '#1d4ed8';
        e.target.style.transform = 'scale(1.05)';
      }
    }}
    onMouseLeave={(e) => {
      if (!disabled) {
        e.target.style.backgroundColor = '#2563eb';
        e.target.style.transform = 'scale(1)';
      }
    }}
  >
    <Send style={{ 
      width: '20px', 
      height: '20px',
      transform: isLoading ? 'scale(0.9)' : 'scale(1)',
      transition: 'transform 0.2s'
    }} />
  </button>
);

/**
 * Información inferior
 */
const BottomInfo = ({ isMobile, apiKey, currentProvider, currentProject }) => (
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
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{
          width: '8px',
          height: '8px',
          backgroundColor: apiKey ? '#10b981' : '#eab308',
          borderRadius: '50%'
        }}></span>
        <span>{currentProvider?.toUpperCase() || 'AI'}</span>
      </div>
      
      {currentProject && (
        <>
          <span>•</span>
          <span>📁 {currentProject.files?.length || 0} archivos</span>
        </>
      )}
    </div>
    
    {/* Status API - solo desktop */}
    {!isMobile && apiKey && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <CheckCircle style={{ width: '12px', height: '12px', color: '#10b981' }} />
        <span>API configurada</span>
      </div>
    )}
  </div>
);

export default MessageInput;