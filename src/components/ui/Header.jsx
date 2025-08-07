// ============================================
// 📱 HEADER COMPONENT (Con API Context Integrado)
// ============================================

import React from 'react';
import { Menu, Settings, Sparkles, Eye, EyeOff, FolderOpen } from 'lucide-react';
import { API_LIMITS } from '../../utils/constants';
// 🔥 NUEVAS IMPORTACIONES - Integración con contexto global
import { useApp, useBackendStatus, useAPI } from '../../context/Appcontext';

/**
 * Componente Header responsivo con integración de API Context
 * @param {Object} props - Props del componente
 */
const Header = ({
  isMobile,
  currentProvider,
  liveCodeBlocks,
  showPreview,
  apiKey,
  onMenuClick,
  onSettingsClick,
  onPreviewToggle
}) => {
  // 🔥 USAR CONTEXTO GLOBAL - Acceso a estado y API
  const { 
    currentProject: globalProject,
    setCurrentProject,
    isLoading: globalLoading 
  } = useApp();
  
  const { 
    isConnected: backendConnected,
    canUseAPI,
    text: connectionText 
  } = useBackendStatus();
  
  const { api } = useAPI();

  // 🔥 FUNCIÓN MEJORADA - Verificar estado de APIs
  const handleCheckAPIStatus = async () => {
    if (!canUseAPI) return;
    
    try {
      const aiStatus = await api.getAIStatus();
      console.log('🤖 Estado AI:', aiStatus);
      // Podrías mostrar un toast o actualizar la UI aquí
    } catch (err) {
      console.error('❌ Error verificando APIs:', err);
    }
  };

  // 🔥 STATUS MEJORADO - Combina API original + backend status
  const enhancedApiStatus = {
    // Tu API status original (pasado como prop)
    backend: {
      icon: backendConnected ? '🟢' : '🔴',
      status: backendConnected ? 'connected' : 'disconnected',
      error: !backendConnected ? 'Backend offline' : null
    },
    // Aquí puedes agregar más APIs si las tienes como props
    ...(API_LIMITS && Object.keys(API_LIMITS).reduce((acc, provider) => {
      acc[provider] = {
        icon: API_LIMITS[provider]?.icon || '🤖',
        status: 'unknown', // Podrías verificar esto con api.getAIStatus()
        error: null
      };
      return acc;
    }, {}))
  };

  return (
    <header style={{
      height: isMobile ? '56px' : '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 12px' : '0 16px',
      borderBottom: '1px solid rgba(55, 65, 81, 0.5)',
      backgroundColor: 'rgba(31, 41, 55, 0.95)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      {/* Left Section */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: isMobile ? '8px' : '12px', 
        flex: 1, 
        minWidth: 0 
      }}>
        {/* Menu Button */}
        <MenuButton 
          isMobile={isMobile}
          onClick={onMenuClick}
        />
        
        {/* Logo and Title - CON ESTADO DE BACKEND */}
        <LogoSection 
          isMobile={isMobile}
          currentProvider={currentProvider}
          backendConnected={backendConnected}
          connectionText={connectionText}
        />
      </div>

      {/* Right Section */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: isMobile ? '4px' : '8px', 
        flexShrink: 0 
      }}>
        {/* Live Preview Toggle - Solo en desktop */}
        {liveCodeBlocks && liveCodeBlocks.length > 0 && !isMobile && (
          <PreviewToggleButton 
            showPreview={showPreview}
            onClick={onPreviewToggle}
          />
        )}

        {/* Status Indicators - MEJORADO CON BACKEND STATUS */}
        {!isMobile && (
          <StatusIndicators 
            apiStatus={enhancedApiStatus}
            onStatusClick={handleCheckAPIStatus}
            canUseAPI={canUseAPI}
            globalLoading={globalLoading}
          />
        )}

        {/* Project Indicator - USANDO PROYECTO GLOBAL */}
        {globalProject && (
          <ProjectIndicator 
            project={globalProject}
            isMobile={isMobile}
          />
        )}

        {/* Settings Button - CON INDICADOR DE BACKEND */}
        <SettingsButton 
          isMobile={isMobile}
          hasApiKey={!!apiKey}
          backendConnected={backendConnected}
          onClick={onSettingsClick}
        />
      </div>
    </header>
  );
};

/**
 * Botón de menú hamburguesa (sin cambios)
 */
const MenuButton = ({ isMobile, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px',
      background: 'transparent',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      color: 'white',
      transition: 'background 0.2s'
    }}
    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'}
    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
    title="Abrir menú"
  >
    <Menu style={{ 
      width: isMobile ? '16px' : '20px', 
      height: isMobile ? '16px' : '20px' 
    }} />
  </button>
);

/**
 * Sección de logo y título - MEJORADA CON ESTADO BACKEND
 */
const LogoSection = ({ isMobile, currentProvider, backendConnected, connectionText }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px', 
    minWidth: 0 
  }}>
    {/* Logo - Con indicador de conexión */}
    <div style={{
      width: isMobile ? '24px' : '32px',
      height: isMobile ? '24px' : '32px',
      background: backendConnected 
        ? 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)'
        : 'linear-gradient(135deg, #6b7280 0%, #374151 100%)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      position: 'relative'
    }}>
      <Sparkles style={{ 
        width: isMobile ? '12px' : '16px', 
        height: isMobile ? '12px' : '16px',
        color: backendConnected ? 'white' : '#9ca3af'
      }} />
      
      {/* Indicador de conexión */}
      <div style={{
        position: 'absolute',
        bottom: '-2px',
        right: '-2px',
        width: '8px',
        height: '8px',
        backgroundColor: backendConnected ? '#10b981' : '#ef4444',
        borderRadius: '50%',
        border: '2px solid rgba(31, 41, 55, 0.95)'
      }} />
    </div>

    {/* Title and Subtitle */}
    <div style={{ minWidth: 0 }}>
      <h1 style={{ 
        fontSize: isMobile ? '14px' : '18px', 
        fontWeight: 'bold',
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: backendConnected ? 'white' : '#9ca3af'
      }}>
        DevAI Agent
      </h1>
      
      {!isMobile && (
        <p style={{ 
          fontSize: '12px', 
          color: backendConnected ? '#9ca3af' : '#6b7280',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {backendConnected ? (
            <>
              {API_LIMITS[currentProvider]?.icon} {currentProvider?.toUpperCase() || 'API'} • Live Preview
            </>
          ) : (
            '🔴 Backend Offline'
          )}
        </p>
      )}
    </div>
  </div>
);

/**
 * Botón de toggle del Live Preview (sin cambios)
 */
const PreviewToggleButton = ({ showPreview, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: showPreview ? '#2563eb' : 'transparent',
      color: 'white'
    }}
    onMouseEnter={(e) => !showPreview && (e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)')}
    onMouseLeave={(e) => !showPreview && (e.target.style.backgroundColor = 'transparent')}
    title={showPreview ? "Ocultar Live Preview" : "Mostrar Live Preview"}
  >
    {showPreview ? 
      <EyeOff style={{ width: '16px', height: '16px' }} /> : 
      <Eye style={{ width: '16px', height: '16px' }} />
    }
  </button>
);

/**
 * Indicadores de estado de las APIs - MEJORADO CON INTERACTIVIDAD
 */
const StatusIndicators = ({ apiStatus, onStatusClick, canUseAPI, globalLoading }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '4px' 
  }}>
    {Object.entries(apiStatus).slice(0, 3).map(([provider, status]) => (
      <div
        key={provider}
        onClick={provider === 'backend' ? onStatusClick : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          backgroundColor: status.error 
            ? 'rgba(239, 68, 68, 0.2)' 
            : 'rgba(34, 197, 94, 0.2)',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: provider === 'backend' && canUseAPI ? 'pointer' : 'default',
          transition: 'all 0.2s',
          border: `1px solid ${status.error 
            ? 'rgba(239, 68, 68, 0.3)' 
            : 'rgba(34, 197, 94, 0.3)'}`
        }}
        title={`${provider}: ${status.error || 'Disponible'} ${provider === 'backend' && canUseAPI ? '(Click para verificar)' : ''}`}
        onMouseEnter={(e) => {
          if (provider === 'backend' && canUseAPI) {
            e.target.style.backgroundColor = status.error 
              ? 'rgba(239, 68, 68, 0.3)' 
              : 'rgba(34, 197, 94, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = status.error 
            ? 'rgba(239, 68, 68, 0.2)' 
            : 'rgba(34, 197, 94, 0.2)';
        }}
      >
        <span>{globalLoading && provider === 'backend' ? '🔄' : status.icon}</span>
        {!globalLoading && (
          <span style={{ 
            color: status.error ? '#fca5a5' : '#bbf7d0',
            textTransform: 'uppercase',
            fontSize: '10px'
          }}>
            {provider}
          </span>
        )}
      </div>
    ))}
  </div>
);

/**
 * Indicador de proyecto actual - USANDO PROYECTO GLOBAL
 */
const ProjectIndicator = ({ project, isMobile }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '8px',
    maxWidth: isMobile ? '80px' : 'none'
  }}>
    <FolderOpen style={{ 
      width: '12px', 
      height: '12px', 
      color: '#86efac', 
      flexShrink: 0 
    }} />
    <span style={{
      fontSize: isMobile ? '12px' : '14px',
      color: '#bbf7d0',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }}>
      {/* Soporte para project como string o objeto */}
      {isMobile 
        ? (typeof project === 'object' ? `${project.files?.length || 0}` : '1') 
        : (typeof project === 'object' ? project.name : project)
      }
    </span>
  </div>
);

/**
 * Botón de configuración - CON INDICADOR DE BACKEND
 */
const SettingsButton = ({ isMobile, hasApiKey, backendConnected, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px',
      background: 'transparent',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      color: 'white',
      transition: 'background 0.2s',
      position: 'relative',
      flexShrink: 0
    }}
    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'}
    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
    title="Configuración"
  >
    <Settings style={{ 
      width: isMobile ? '16px' : '20px', 
      height: isMobile ? '16px' : '20px' 
    }} />
    
    {/* Indicador de falta de API key O backend desconectado */}
    {(!hasApiKey || !backendConnected) && (
      <span style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        width: '8px',
        height: '8px',
        backgroundColor: !backendConnected ? '#ef4444' : '#eab308',
        borderRadius: '50%',
        animation: !backendConnected ? 'pulse 2s infinite' : 'none'
      }}></span>
    )}
  </button>
);

export default Header;