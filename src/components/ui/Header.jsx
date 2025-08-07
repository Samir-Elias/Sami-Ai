// ============================================
// 📱 HEADER COMPONENT - CON ANIMACIONES Y SIN RESTRICCIONES
// ============================================

import React from 'react';
import { Menu, Settings, Sparkles, Eye, EyeOff, FolderOpen } from 'lucide-react';
import { API_LIMITS } from '../../utils/constants';

// ✅ IMPORT CORRECTO - Contexto unificado actualizado
import { useApp, useBackendStatus, useAPI } from '../../context/AppContext';

/**
 * Componente Header responsivo con animaciones y sin restricciones
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
  // ✅ HOOKS ACTUALIZADOS - Contexto permite uso offline
  const { 
    currentProject,
    computed: { connectionInfo, projectInfo },
    offlineMode
  } = useApp();
  
  const { 
    isConnected: backendConnected,
    reconnect
  } = useBackendStatus();
  
  const { api } = useAPI();

  // ✅ Estado combinado (backend + modo offline)
  const canUseSystem = backendConnected || offlineMode;

  return (
    <header 
      className="header-with-animated-bar" // ✅ Clase de animación CSS
      style={{
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
      }}
    >
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
        
        {/* Logo and Title - CON ANIMACIONES */}
        <LogoSection 
          isMobile={isMobile}
          currentProvider={currentProvider}
          backendConnected={backendConnected}
          connectionText={connectionInfo.text}
          offlineMode={offlineMode}
          canUseSystem={canUseSystem}
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

        {/* Status Indicators - MEJORADO SIN RESTRICCIONES */}
        {!isMobile && (
          <StatusIndicators 
            backendConnected={backendConnected}
            offlineMode={offlineMode}
            canUseSystem={canUseSystem}
            currentProvider={currentProvider}
          />
        )}

        {/* Project Indicator */}
        {currentProject && (
          <ProjectIndicator 
            project={currentProject}
            isMobile={isMobile}
            projectInfo={projectInfo}
          />
        )}

        {/* Settings Button - SIN RESTRICCIONES */}
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
    className="interactive-button"
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
 * Sección de logo y título - CON ANIMACIONES
 */
const LogoSection = ({ 
  isMobile, 
  currentProvider, 
  backendConnected, 
  connectionText, 
  offlineMode, 
  canUseSystem 
}) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px', 
    minWidth: 0 
  }}>
    {/* Logo - CON ANIMACIÓN DE SHADOW */}
    <div 
      className="animated-logo main-logo" // ✅ Clases de animación
      style={{
        width: isMobile ? '24px' : '32px',
        height: isMobile ? '24px' : '32px',
        background: canUseSystem 
          ? 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)'
          : 'linear-gradient(135deg, #6b7280 0%, #374151 100%)',
        borderRadius: isMobile ? '6px' : '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative'
      }}
    >
      <Sparkles style={{ 
        width: isMobile ? '12px' : '16px', 
        height: isMobile ? '12px' : '16px',
        color: canUseSystem ? 'white' : '#9ca3af'
      }} />
      
      {/* Indicador de conexión mejorado */}
      <div style={{
        position: 'absolute',
        bottom: '-2px',
        right: '-2px',
        width: '8px',
        height: '8px',
        backgroundColor: backendConnected ? '#10b981' : offlineMode ? '#f59e0b' : '#ef4444',
        borderRadius: '50%',
        border: '2px solid rgba(31, 41, 55, 0.95)'
      }} />
    </div>

    {/* Title and Subtitle */}
    <div style={{ minWidth: 0 }}>
      <h1 className="gentle-float" style={{ 
        fontSize: isMobile ? '14px' : '18px', 
        fontWeight: 'bold',
        margin: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: canUseSystem ? 'white' : '#9ca3af'
      }}>
        DevAI Agent
      </h1>
      
      {!isMobile && (
        <p style={{ 
          fontSize: '12px', 
          color: canUseSystem ? '#9ca3af' : '#6b7280',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {backendConnected ? (
            <>
              {API_LIMITS[currentProvider]?.icon} {currentProvider?.toUpperCase() || 'API'} • Backend
            </>
          ) : offlineMode ? (
            <>
              {API_LIMITS[currentProvider]?.icon} {currentProvider?.toUpperCase() || 'API'} • Directo
            </>
          ) : (
            '🔴 Desconectado'
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
    className="interactive-button"
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
 * Indicadores de estado - SIN RESTRICCIONES
 */
const StatusIndicators = ({ 
  backendConnected, 
  offlineMode, 
  canUseSystem, 
  currentProvider 
}) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '4px' 
  }}>
    {/* Indicador de Backend */}
    <div
      className="subtle-pulse"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        backgroundColor: backendConnected 
          ? 'rgba(34, 197, 94, 0.2)' 
          : offlineMode 
            ? 'rgba(245, 158, 11, 0.2)'
            : 'rgba(239, 68, 68, 0.2)',
        borderRadius: '4px',
        fontSize: '12px',
        border: backendConnected 
          ? '1px solid rgba(34, 197, 94, 0.3)' 
          : offlineMode
            ? '1px solid rgba(245, 158, 11, 0.3)'
            : '1px solid rgba(239, 68, 68, 0.3)'
      }}
      title={backendConnected 
        ? 'Backend conectado' 
        : offlineMode 
          ? 'Modo offline - API directa'
          : 'Backend desconectado'
      }
    >
      <span>{backendConnected ? '🟢' : offlineMode ? '🟡' : '🔴'}</span>
      <span style={{ 
        color: backendConnected ? '#bbf7d0' : offlineMode ? '#fbbf24' : '#fca5a5',
        textTransform: 'uppercase',
        fontSize: '10px'
      }}>
        {backendConnected ? 'BACKEND' : offlineMode ? 'DIRECT' : 'OFF'}
      </span>
    </div>

    {/* Indicador de API actual */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        backgroundColor: canUseSystem 
          ? 'rgba(59, 130, 246, 0.2)' 
          : 'rgba(107, 114, 128, 0.2)',
        borderRadius: '4px',
        fontSize: '12px',
        border: canUseSystem 
          ? '1px solid rgba(59, 130, 246, 0.3)' 
          : '1px solid rgba(107, 114, 128, 0.3)'
      }}
      title={`API: ${currentProvider?.toUpperCase()}`}
    >
      <span>{API_LIMITS[currentProvider]?.icon || '🤖'}</span>
      <span style={{ 
        color: canUseSystem ? '#93c5fd' : '#9ca3af',
        textTransform: 'uppercase',
        fontSize: '10px'
      }}>
        {currentProvider?.substring(0, 4) || 'API'}
      </span>
    </div>
  </div>
);

/**
 * Indicador de proyecto actual (con animación)
 */
const ProjectIndicator = ({ project, isMobile, projectInfo }) => (
  <div 
    className="shimmer-effect animated-card"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      borderRadius: '8px',
      maxWidth: isMobile ? '80px' : 'none'
    }}
  >
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
      {isMobile 
        ? `${projectInfo?.messageCount || 0}` 
        : (typeof project === 'object' ? project.name : project)
      }
    </span>
  </div>
);

/**
 * Botón de configuración - SIN RESTRICCIONES DE BACKEND
 */
const SettingsButton = ({ isMobile, hasApiKey, backendConnected, onClick }) => (
  <button
    className="interactive-button animated-button"
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
    
    {/* Indicador solo si NO hay API key (no importa el backend) */}
    {!hasApiKey && (
      <span 
        className="subtle-pulse"
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '8px',
          height: '8px',
          backgroundColor: '#eab308',
          borderRadius: '50%'
        }}
      />
    )}
  </button>
);

export default Header;