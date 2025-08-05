// ============================================
// 👁️ LIVE CODE PREVIEW COMPONENT
// ============================================

import React, { useState, useRef } from 'react';
import { Code, Eye, EyeOff, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import PreviewFrame from './PreviewFrame';

/**
 * Componente principal del Live Code Preview
 * @param {Object} props - Props del componente
 */
const LiveCodePreview = ({ codeBlocks, isVisible, onToggle, isMobile }) => {
  const [selectedBlock, setSelectedBlock] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filtrar bloques de código que se pueden previsualizar
  const previewableBlocks = codeBlocks.filter(block => 
    ['html', 'css', 'javascript', 'js', 'jsx', 'react', 'vue', 'svelte'].includes(
      block.language?.toLowerCase()
    )
  );

  // Si no hay bloques previewables, no mostrar nada
  if (previewableBlocks.length === 0) return null;

  const currentBlock = previewableBlocks[selectedBlock] || previewableBlocks[0];

  /**
   * Refrescar el preview
   */
  const refreshPreview = () => {
    setRefreshKey(prev => prev + 1);
  };

  /**
   * Botón flotante cuando está oculto
   */
  if (!isVisible) {
    return (
      <FloatingToggleButton 
        onToggle={onToggle}
        title="Mostrar Live Preview"
      />
    );
  }

  return (
    <div style={getContainerStyles(isFullscreen, isMobile)}>
      {/* Header del preview */}
      <PreviewHeader
        currentBlock={currentBlock}
        selectedBlock={selectedBlock}
        previewableBlocks={previewableBlocks}
        isFullscreen={isFullscreen}
        onBlockChange={setSelectedBlock}
        onRefresh={refreshPreview}
        onFullscreenToggle={() => setIsFullscreen(!isFullscreen)}
        onToggle={onToggle}
      />

      {/* Información del código */}
      <CodeInfo currentBlock={currentBlock} />

      {/* Preview iframe */}
      <div style={{ flex: 1, backgroundColor: 'white' }}>
        <PreviewFrame 
          block={currentBlock}
          refreshKey={`${selectedBlock}-${refreshKey}`}
        />
      </div>
    </div>
  );
};

/**
 * Botón flotante para mostrar/ocultar preview
 */
const FloatingToggleButton = ({ onToggle, title }) => (
  <button
    onClick={onToggle}
    style={{
      position: 'fixed',
      right: '16px',
      top: '80px',
      zIndex: 30,
      padding: '12px',
      background: '#2563eb',
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => {
      e.target.style.backgroundColor = '#1d4ed8';
      e.target.style.transform = 'scale(1.1)';
    }}
    onMouseLeave={(e) => {
      e.target.style.backgroundColor = '#2563eb';
      e.target.style.transform = 'scale(1)';
    }}
    title={title}
  >
    <Eye style={{ width: '20px', height: '20px', color: 'white' }} />
  </button>
);

/**
 * Header del preview con controles
 */
const PreviewHeader = ({
  currentBlock,
  selectedBlock,
  previewableBlocks,
  isFullscreen,
  onBlockChange,
  onRefresh,
  onFullscreenToggle,
  onToggle
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #374151',
    backgroundColor: '#1f2937'
  }}>
    {/* Título y contador */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#f3f4f6'
    }}>
      <Code style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
      <span>Live Preview</span>
      {previewableBlocks.length > 1 && (
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
          ({selectedBlock + 1}/{previewableBlocks.length})
        </span>
      )}
    </div>
    
    {/* Controles */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {/* Selector de bloque */}
      {previewableBlocks.length > 1 && (
        <BlockSelector
          selectedBlock={selectedBlock}
          previewableBlocks={previewableBlocks}
          onChange={onBlockChange}
        />
      )}
      
      {/* Botones de control */}
      <ControlButton onClick={onRefresh} title="Refrescar preview">
        <RotateCcw style={{ width: '16px', height: '16px' }} />
      </ControlButton>
      
      <ControlButton 
        onClick={onFullscreenToggle} 
        title={isFullscreen ? "Minimizar" : "Pantalla completa"}
      >
        {isFullscreen ? 
          <Minimize2 style={{ width: '16px', height: '16px' }} /> : 
          <Maximize2 style={{ width: '16px', height: '16px' }} />
        }
      </ControlButton>
      
      <ControlButton onClick={onToggle} title="Ocultar preview">
        <EyeOff style={{ width: '16px', height: '16px' }} />
      </ControlButton>
    </div>
  </div>
);

/**
 * Selector de bloque de código
 */
const BlockSelector = ({ selectedBlock, previewableBlocks, onChange }) => (
  <select
    value={selectedBlock}
    onChange={(e) => onChange(Number(e.target.value))}
    style={{
      fontSize: '12px',
      backgroundColor: '#374151',
      border: '1px solid #4b5563',
      borderRadius: '4px',
      padding: '4px 8px',
      color: '#f3f4f6',
      marginRight: '8px',
      cursor: 'pointer'
    }}
  >
    {previewableBlocks.map((block, index) => (
      <option key={index} value={index} style={{ backgroundColor: '#1f2937' }}>
        {block.language?.toUpperCase() || 'CODE'} {index + 1}
      </option>
    ))}
  </select>
);

/**
 * Botón de control genérico
 */
const ControlButton = ({ onClick, title, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px',
      background: 'transparent',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      color: '#9ca3af',
      transition: 'background 0.2s, color 0.2s'
    }}
    onMouseEnter={(e) => {
      e.target.style.backgroundColor = '#374151';
      e.target.style.color = '#f3f4f6';
    }}
    onMouseLeave={(e) => {
      e.target.style.backgroundColor = 'transparent';
      e.target.style.color = '#9ca3af';
    }}
    title={title}
  >
    {children}
  </button>
);

/**
 * Información del código actual
 */
const CodeInfo = ({ currentBlock }) => (
  <div style={{
    padding: '8px 16px',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderBottom: '1px solid #374151',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px'
  }}>
    <span style={{ color: '#9ca3af' }}>
      🔧 {currentBlock.language?.toUpperCase() || 'CODE'}
    </span>
    <span style={{ color: '#6b7280' }}>
      {currentBlock.code.split('\n').length} líneas
    </span>
  </div>
);

/**
 * Obtener estilos del contenedor principal
 */
const getContainerStyles = (isFullscreen, isMobile) => ({
  position: 'fixed',
  top: 0,
  right: 0,
  height: '100vh',
  width: isFullscreen ? '100%' : (isMobile ? '100%' : '50%'),
  backgroundColor: '#111827',
  borderLeft: isFullscreen ? 'none' : '1px solid #374151',
  display: 'flex',
  flexDirection: 'column',
  zIndex: isFullscreen ? 50 : 20,
  transition: 'width 0.3s ease'
});

export default LiveCodePreview;