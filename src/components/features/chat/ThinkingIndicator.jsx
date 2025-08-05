// ============================================
// 🤔 THINKING INDICATOR COMPONENT
// ============================================

import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Indicador de proceso de pensamiento mientras la IA procesa
 * @param {Object} props - Props del componente
 */
const ThinkingIndicator = ({ process, isMobile }) => {
  if (!process) return null;

  return (
    <div style={{ 
      display: 'flex', 
      gap: '8px', 
      justifyContent: 'flex-start' 
    }}>
      <div style={{ maxWidth: isMobile ? '85%' : '768px' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '4px' 
        }}>
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
            Procesando...
          </span>
        </div>
        
        {/* Bubble con indicador de carga */}
        <div style={{
          backgroundColor: 'rgba(31, 41, 55, 0.5)',
          border: '1px solid rgba(55, 65, 81, 0.5)',
          borderRadius: '16px',
          padding: '12px 16px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px' 
          }}>
            {/* Spinner animado */}
            <LoadingSpinner />
            
            {/* Texto del proceso */}
            <ProcessText process={process} />
          </div>
          
          {/* Barra de progreso opcional */}
          <ProgressBar />
        </div>
      </div>
      
      {/* Avatar del asistente */}
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: 'rgba(55, 65, 81, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Sparkles style={{ width: '12px', height: '12px' }} />
      </div>
    </div>
  );
};

/**
 * Spinner de carga animado
 */
const LoadingSpinner = () => (
  <div style={{
    width: '16px',
    height: '16px',
    border: '2px solid rgba(59, 130, 246, 0.3)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    flexShrink: 0
  }}>
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

/**
 * Texto del proceso con animación de typing
 */
const ProcessText = ({ process }) => (
  <span style={{ 
    color: '#d1d5db', 
    fontSize: '14px',
    flex: 1,
    minWidth: 0
  }}>
    <TypingText text={process} />
  </span>
);

/**
 * Efecto de texto escribiéndose
 */
const TypingText = ({ text }) => {
  return (
    <span>
      {text}
      <span style={{
        opacity: 0,
        animation: 'blink 1s infinite',
        marginLeft: '2px'
      }}>
        |
      </span>
      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}
      </style>
    </span>
  );
};

/**
 * Barra de progreso animada
 */
const ProgressBar = () => (
  <div style={{
    width: '100%',
    height: '2px',
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    borderRadius: '1px',
    marginTop: '8px',
    overflow: 'hidden'
  }}>
    <div style={{
      height: '100%',
      background: 'linear-gradient(90deg, #3b82f6, #7c3aed)',
      borderRadius: '1px',
      animation: 'progress 2s ease-in-out infinite',
      transformOrigin: 'left'
    }}>
      <style>
        {`
          @keyframes progress {
            0% { transform: scaleX(0); }
            50% { transform: scaleX(0.7); }
            100% { transform: scaleX(0); }
          }
        `}
      </style>
    </div>
  </div>
);

/**
 * Variante con puntos animados
 */
export const ThinkingDots = ({ isMobile }) => (
  <div style={{ 
    display: 'flex', 
    gap: '8px', 
    justifyContent: 'flex-start' 
  }}>
    <div style={{ maxWidth: isMobile ? '85%' : '768px' }}>
      <div style={{
        backgroundColor: 'rgba(31, 41, 55, 0.5)',
        border: '1px solid rgba(55, 65, 81, 0.5)',
        borderRadius: '16px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ color: '#d1d5db', fontSize: '14px' }}>
          Pensando
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: '6px',
                height: '6px',
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`
              }}
            >
              <style>
                {`
                  @keyframes bounce {
                    0%, 80%, 100% { 
                      transform: scale(0);
                      opacity: 0.5;
                    } 
                    40% { 
                      transform: scale(1);
                      opacity: 1;
                    }
                  }
                `}
              </style>
            </div>
          ))}
        </div>
      </div>
    </div>
    
    <div style={{
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      backgroundColor: 'rgba(55, 65, 81, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}>
      <Sparkles style={{ width: '12px', height: '12px' }} />
    </div>
  </div>
);

/**
 * Variante compacta para móvil
 */
export const CompactThinkingIndicator = ({ process }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    borderRadius: '20px',
    fontSize: '12px',
    color: '#d1d5db',
    margin: '8px auto',
    width: 'fit-content'
  }}>
    <LoadingSpinner />
    <span>{process || 'Procesando...'}</span>
  </div>
);

export default ThinkingIndicator;