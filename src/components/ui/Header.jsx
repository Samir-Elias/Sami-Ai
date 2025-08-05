// ============================================
// 📱 HEADER COMPONENT
// ============================================

import React from 'react';
import { Menu, Settings, Sparkles, Eye, EyeOff, FolderOpen } from 'lucide-react';
import { API_LIMITS } from '../../utils/constants';

/**
 * Componente Header responsivo
 * @param {Object} props - Props del componente
 */
const Header = ({
  isMobile,
  currentProvider,
  currentProject,
  liveCodeBlocks,
  showPreview,
  apiStatus,
  apiKey,
  onMenuClick,
  onSettingsClick,
  onPreviewToggle
}) => {
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
        
        {/* Logo and Title */}
        <LogoSection 
          isMobile={isMobile}
          currentProvider={currentProvider}
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
        {liveCodeBlocks.length > 0 && !isMobile && (
          <PreviewToggleButton 
            showPreview={showPreview}
            onClick={onPreviewToggle}
          />
        )}

        {/* Status Indicators - Solo en desktop */}
        {!isMobile && (
          <StatusIndicators apiStatus={apiStatus} />
        )}

        {/* Project Indicator */}
        {currentProject && (
          <ProjectIndicator 
            project={currentProject}
            isMobile={isMobile}
          />
        )}

        {/* Settings Button */}
        <SettingsButton 
          isMobile={isMobile}
          hasApiKey={!!apiKey}
          onClick={onSettingsClick}
        />
      </div>
    </header>
  );
};

/**
 * Botón de menú hamburguesa
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
 * Sección de logo y título
 */
const LogoSection = ({ isMobile, currentProvider }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px', 
    minWidth: 0 
  }}>
    {/* Logo */}
    <div style={{
      width: isMobile ? '24px' : '32px',
      height: isMobile ? '24px' : '32px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}>
      <Sparkles style={{ 
        width: isMobile ? '12px' : '16px', 
        height: isMobile ? '12px' : '16px' 
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
        textOverflow: 'ellipsis'
      }}>
        DevAI Agent
      </h1>
      
      {!isMobile && (
        <p style={{ 
          fontSize: '12px', 
          color: '#9ca3af',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {API_LIMITS[currentProvider]?.icon} {currentProvider.toUpperCase()} • Live Preview
        </p>
      )}
    </div>
  </div>
);

/**
 * Botón de toggle del Live Preview
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
 * Indicadores de estado de las APIs
 */
const StatusIndicators = ({ apiStatus }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '4px' 
  }}>
    {Object.entries(apiStatus).slice(0, 2).map(([provider, status]) => (
      <div
        key={provider}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          backgroundColor: 'rgba(55, 65, 81, 0.5)',
          borderRadius: '4px',
          fontSize: '12px'
        }}
        title={`${provider}: ${status.error || 'Disponible'}`}
      >
        <span>{status.icon}</span>
      </div>
    ))}
  </div>
);

/**
 * Indicador de proyecto actual
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
      {isMobile ? `${project.files.length}` : project.name}
    </span>
  </div>
);

/**
 * Botón de configuración
 */
const SettingsButton = ({ isMobile, hasApiKey, onClick }) => (
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
    
    {/* Indicador de falta de API key */}
    {!hasApiKey && (
      <span style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        width: '8px',
        height: '8px',
        backgroundColor: '#eab308',
        borderRadius: '50%'
      }}></span>
    )}
  </button>
);

export default Header;