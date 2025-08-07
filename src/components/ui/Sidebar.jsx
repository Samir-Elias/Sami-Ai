// ============================================
// 📋 SIDEBAR COMPONENT - CON API CONTEXT
// ============================================

import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  MessageSquare, 
  Clock, 
  Trash2, 
  Search,
  Download,
  Upload,
  Filter,
  MoreVertical,
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useApp, useBackendStatus, useAPI } from '../../context/AppContext';

/**
 * Componente Sidebar para navegación y conversaciones con API Context
 * @param {Object} props - Props del componente
 */
const Sidebar = ({
  isVisible,
  isMobile,
  conversations,
  currentConversationId,
  onClose,
  onNewConversation,
  onLoadConversation,
  onDeleteConversation,
  onExportConversations,
  onImportConversations
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'today', 'week', 'month'

  // Context integration
  const { 
    isBackendConnected, 
    connectionStatus, 
    currentProject,
    setCurrentProject 
  } = useApp();
  
  const { isConnected, reconnect } = useBackendStatus();
  const { api, isLoading, error } = useAPI();

  // Filtrar conversaciones
  const filteredConversations = conversations.filter(conv => {
    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = conv.title.toLowerCase().includes(term) ||
                           conv.preview.toLowerCase().includes(term);
      if (!matchesSearch) return false;
    }

    // Filtro por fecha
    if (filterBy !== 'all') {
      const now = new Date();
      const convDate = new Date(conv.updatedAt);
      const daysDiff = Math.floor((now - convDate) / (1000 * 60 * 60 * 24));

      switch (filterBy) {
        case 'today':
          return daysDiff === 0;
        case 'week':
          return daysDiff <= 7;
        case 'month':
          return daysDiff <= 30;
        default:
          return true;
      }
    }

    return true;
  });

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay para móvil */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40
          }}
          onClick={onClose}
        />
      )}

      {/* Sidebar principal */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: isMobile ? '100%' : '320px',
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid rgba(55, 65, 81, 0.5)',
        transform: isVisible ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <SidebarHeader 
          isMobile={isMobile}
          showSearch={showSearch}
          searchTerm={searchTerm}
          onClose={onClose}
          onSearchToggle={() => setShowSearch(!showSearch)}
          onSearchChange={setSearchTerm}
          isBackendConnected={isBackendConnected}
          connectionStatus={connectionStatus}
          onReconnect={reconnect}
        />

        {/* Backend Status */}
        <BackendStatus 
          isBackendConnected={isBackendConnected}
          connectionStatus={connectionStatus}
          error={error}
          isLoading={isLoading}
          onReconnect={reconnect}
        />

        {/* Project Info */}
        <ProjectInfo 
          currentProject={currentProject}
          setCurrentProject={setCurrentProject}
        />

        {/* Controls */}
        <SidebarControls
          filterBy={filterBy}
          onFilterChange={setFilterBy}
          onNewConversation={onNewConversation}
          onExport={onExportConversations}
          onImport={onImportConversations}
          isBackendConnected={isBackendConnected}
        />

        {/* Conversations List */}
        <ConversationsList
          conversations={filteredConversations}
          currentConversationId={currentConversationId}
          searchTerm={searchTerm}
          onLoadConversation={onLoadConversation}
          onDeleteConversation={onDeleteConversation}
          isBackendConnected={isBackendConnected}
        />

        {/* Footer Stats */}
        <SidebarFooter 
          conversations={conversations}
          isBackendConnected={isBackendConnected}
        />
      </div>
    </>
  );
};

/**
 * Header del sidebar con estado de backend
 */
const SidebarHeader = ({ 
  isMobile, 
  showSearch, 
  searchTerm, 
  onClose, 
  onSearchToggle, 
  onSearchChange,
  isBackendConnected,
  connectionStatus,
  onReconnect
}) => (
  <div style={{
    padding: '16px',
    borderBottom: '1px solid rgba(55, 65, 81, 0.5)',
    flexShrink: 0
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: showSearch ? '12px' : '0'
    }}>
      <h2 style={{ 
        fontSize: isMobile ? '18px' : '20px', 
        fontWeight: 'bold', 
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        💬 Conversaciones
        {/* Backend indicator */}
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isBackendConnected ? '#10b981' : '#ef4444'
        }} />
      </h2>
      
      <div style={{ display: 'flex', gap: '4px' }}>
        {!isBackendConnected && (
          <button
            onClick={onReconnect}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#ef4444',
              transition: 'background 0.2s'
            }}
            title="Reconectar backend"
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <RefreshCw style={{ width: '16px', height: '16px' }} />
          </button>
        )}
        
        <button
          onClick={onSearchToggle}
          style={{
            padding: '8px',
            background: showSearch ? '#2563eb' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'white',
            transition: 'background 0.2s'
          }}
          title="Buscar conversaciones"
        >
          <Search style={{ width: '16px', height: '16px' }} />
        </button>
        
        <button
          onClick={onClose}
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
        >
          <X style={{ width: '20px', height: '20px' }} />
        </button>
      </div>
    </div>

    {/* Barra de búsqueda */}
    {showSearch && (
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Buscar conversaciones..."
        style={{
          width: '100%',
          padding: '8px 12px',
          backgroundColor: 'rgba(55, 65, 81, 0.5)',
          border: '1px solid #4b5563',
          borderRadius: '8px',
          color: 'white',
          fontSize: '14px',
          outline: 'none'
        }}
        onFocus={(e) => e.target.style.borderColor = '#2563eb'}
        onBlur={(e) => e.target.style.borderColor = '#4b5563'}
        autoFocus
      />
    )}
  </div>
);

/**
 * Estado del backend
 */
const BackendStatus = ({ 
  isBackendConnected, 
  connectionStatus, 
  error, 
  isLoading, 
  onReconnect 
}) => (
  <div style={{ 
    padding: '12px 16px',
    borderBottom: '1px solid rgba(55, 65, 81, 0.3)'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      backgroundColor: isBackendConnected ? 
        'rgba(16, 185, 129, 0.1)' : 
        'rgba(239, 68, 68, 0.1)',
      borderRadius: '6px',
      border: isBackendConnected ?
        '1px solid rgba(16, 185, 129, 0.2)' :
        '1px solid rgba(239, 68, 68, 0.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isBackendConnected ? (
          <>
            <Wifi style={{ width: '14px', height: '14px', color: '#10b981' }} />
            <span style={{ fontSize: '12px', color: '#86efac' }}>
              Backend Online
            </span>
          </>
        ) : (
          <>
            <WifiOff style={{ width: '14px', height: '14px', color: '#ef4444' }} />
            <span style={{ fontSize: '12px', color: '#fca5a5' }}>
              Backend Offline
            </span>
          </>
        )}
      </div>

      {!isBackendConnected && (
        <button
          onClick={onReconnect}
          disabled={isLoading}
          style={{
            padding: '4px 6px',
            backgroundColor: '#ef4444',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            fontSize: '10px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            transition: 'opacity 0.2s'
          }}
        >
          {isLoading ? '...' : 'Retry'}
        </button>
      )}
    </div>

    {error && (
      <div style={{
        marginTop: '6px',
        fontSize: '11px',
        color: '#fca5a5',
        padding: '4px 8px',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '4px'
      }}>
        {error}
      </div>
    )}
  </div>
);

/**
 * Información del proyecto actual
 */
const ProjectInfo = ({ currentProject, setCurrentProject }) => (
  <div style={{ 
    padding: '12px 16px',
    borderBottom: '1px solid rgba(55, 65, 81, 0.3)'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '6px'
    }}>
      <Database style={{ width: '14px', height: '14px', color: '#60a5fa' }} />
      <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>
        Proyecto Actual
      </span>
    </div>
    
    <input
      type="text"
      value={currentProject}
      onChange={(e) => setCurrentProject(e.target.value)}
      placeholder="Nombre del proyecto"
      style={{
        width: '100%',
        padding: '6px 8px',
        backgroundColor: 'rgba(55, 65, 81, 0.3)',
        border: '1px solid #4b5563',
        borderRadius: '4px',
        color: '#f3f4f6',
        fontSize: '12px',
        outline: 'none'
      }}
      onFocus={(e) => e.target.style.borderColor = '#2563eb'}
      onBlur={(e) => e.target.style.borderColor = '#4b5563'}
    />
  </div>
);

/**
 * Controles del sidebar
 */
const SidebarControls = ({ 
  filterBy, 
  onFilterChange, 
  onNewConversation, 
  onExport, 
  onImport,
  isBackendConnected
}) => (
  <div style={{ padding: '16px', borderBottom: '1px solid rgba(55, 65, 81, 0.5)' }}>
    {/* Botón nueva conversación */}
    <button
      onClick={onNewConversation}
      disabled={!isBackendConnected}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px',
        backgroundColor: isBackendConnected ? '#2563eb' : '#6b7280',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        cursor: isBackendConnected ? 'pointer' : 'not-allowed',
        transition: 'background 0.2s',
        marginBottom: '12px',
        fontSize: '14px',
        fontWeight: '500',
        opacity: isBackendConnected ? 1 : 0.6
      }}
      onMouseEnter={(e) => isBackendConnected && (e.target.style.backgroundColor = '#1d4ed8')}
      onMouseLeave={(e) => isBackendConnected && (e.target.style.backgroundColor = '#2563eb')}
    >
      <Plus style={{ width: '16px', height: '16px' }} />
      Nueva Conversación
      {!isBackendConnected && (
        <AlertCircle style={{ width: '14px', height: '14px', marginLeft: 'auto' }} />
      )}
    </button>

    {/* Filtros y acciones */}
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {/* Filtro por fecha */}
      <select
        value={filterBy}
        onChange={(e) => onFilterChange(e.target.value)}
        style={{
          flex: 1,
          padding: '6px 8px',
          backgroundColor: 'rgba(55, 65, 81, 0.5)',
          border: '1px solid #4b5563',
          borderRadius: '6px',
          color: 'white',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        <option value="all">Todas</option>
        <option value="today">Hoy</option>
        <option value="week">Esta semana</option>
        <option value="month">Este mes</option>
      </select>

      {/* Botón de opciones */}
      <OptionsDropdown 
        onExport={onExport} 
        onImport={onImport}
        isBackendConnected={isBackendConnected}
      />
    </div>
  </div>
);

/**
 * Dropdown de opciones
 */
const OptionsDropdown = ({ onExport, onImport, isBackendConnected }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '6px',
          backgroundColor: 'rgba(55, 65, 81, 0.5)',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          color: 'white',
          transition: 'background 0.2s'
        }}
        title="Más opciones"
      >
        <MoreVertical style={{ width: '16px', height: '16px' }} />
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 5
            }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 10,
            minWidth: '150px'
          }}>
            <button
              onClick={() => {
                onExport();
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#374151'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <Download style={{ width: '14px', height: '14px' }} />
              Exportar
            </button>
            
            <button
              onClick={() => {
                onImport();
                setIsOpen(false);
              }}
              disabled={!isBackendConnected}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'none',
                border: 'none',
                color: isBackendConnected ? 'white' : '#6b7280',
                cursor: isBackendConnected ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s',
                opacity: isBackendConnected ? 1 : 0.6
              }}
              onMouseEnter={(e) => isBackendConnected && (e.target.style.backgroundColor = '#374151')}
              onMouseLeave={(e) => isBackendConnected && (e.target.style.backgroundColor = 'transparent')}
            >
              <Upload style={{ width: '14px', height: '14px' }} />
              Importar
              {!isBackendConnected && (
                <AlertCircle style={{ width: '12px', height: '12px', marginLeft: 'auto' }} />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Lista de conversaciones
 */
const ConversationsList = ({ 
  conversations, 
  currentConversationId, 
  searchTerm,
  onLoadConversation, 
  onDeleteConversation,
  isBackendConnected
}) => (
  <div style={{ 
    flex: 1, 
    overflowY: 'auto', 
    padding: '0 16px' 
  }}>
    {conversations.length === 0 ? (
      <EmptyState 
        searchTerm={searchTerm} 
        isBackendConnected={isBackendConnected}
      />
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px' }}>
        {conversations.map(conv => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={currentConversationId === conv.id}
            onLoad={() => onLoadConversation(conv)}
            onDelete={(e) => onDeleteConversation(conv.id, e)}
            isBackendConnected={isBackendConnected}
          />
        ))}
      </div>
    )}
  </div>
);

/**
 * Item individual de conversación
 */
const ConversationItem = ({ conversation, isActive, onLoad, onDelete, isBackendConnected }) => (
  <div
    onClick={onLoad}
    style={{
      padding: '12px',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'background 0.2s',
      backgroundColor: isActive ? '#2563eb' : 'rgba(55, 65, 81, 0.5)',
      border: isActive ? '1px solid #3b82f6' : '1px solid transparent',
      opacity: isBackendConnected ? 1 : 0.7,
      position: 'relative'
    }}
    onMouseEnter={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.8)')}
    onMouseLeave={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.5)')}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ 
          fontWeight: '500',
          fontSize: '14px',
          margin: '0 0 4px 0',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: isActive ? 'white' : '#f3f4f6'
        }}>
          {conversation.title}
        </h3>
        
        <p style={{ 
          fontSize: '12px',
          color: isActive ? '#e2e8f0' : '#9ca3af',
          margin: '0 0 6px 0',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {conversation.preview}
        </p>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          fontSize: '11px', 
          color: isActive ? '#cbd5e1' : '#6b7280'
        }}>
          <MessageSquare style={{ width: '12px', height: '12px' }} />
          <span>{conversation.messageCount}</span>
          <Clock style={{ width: '12px', height: '12px', marginLeft: '4px' }} />
          <span>{new Date(conversation.updatedAt).toLocaleDateString()}</span>
          
          {/* Provider indicator */}
          {conversation.provider && (
            <>
              <span>•</span>
              <span style={{ 
                fontSize: '10px',
                textTransform: 'uppercase',
                fontWeight: '500'
              }}>
                {conversation.provider}
              </span>
            </>
          )}
        </div>
      </div>

      <button
        onClick={onDelete}
        style={{
          padding: '4px',
          background: 'transparent',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          color: '#ef4444',
          transition: 'background 0.2s',
          flexShrink: 0
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        title="Eliminar conversación"
      >
        <Trash2 style={{ width: '16px', height: '16px' }} />
      </button>
    </div>

    {/* Backend connection indicator */}
    {!isBackendConnected && (
      <div style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#ef4444',
        border: '1px solid white'
      }} />
    )}
  </div>
);

/**
 * Estado vacío
 */
const EmptyState = ({ searchTerm, isBackendConnected }) => (
  <div style={{
    padding: '40px 20px',
    textAlign: 'center',
    color: '#9ca3af'
  }}>
    <MessageSquare style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
    <h3 style={{ fontSize: '16px', margin: '0 0 8px 0' }}>
      {searchTerm ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
    </h3>
    <p style={{ fontSize: '14px', margin: 0, lineHeight: '1.4' }}>
      {searchTerm 
        ? 'Intenta con otros términos de búsqueda'
        : !isBackendConnected 
          ? 'Conecta el backend para crear conversaciones'
          : 'Inicia una nueva conversación para comenzar'
      }
    </p>
  </div>
);

/**
 * Footer con estadísticas
 */
const SidebarFooter = ({ conversations, isBackendConnected }) => {
  const totalMessages = conversations.reduce((acc, conv) => acc + conv.messageCount, 0);
  const providersUsed = [...new Set(conversations.map(conv => conv.provider).filter(Boolean))];
  
  return (
    <div style={{
      padding: '16px',
      borderTop: '1px solid rgba(55, 65, 81, 0.5)',
      fontSize: '12px',
      color: '#6b7280'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '8px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '500', color: '#9ca3af' }}>{conversations.length}</div>
          <div>Conversaciones</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '500', color: '#9ca3af' }}>{totalMessages}</div>
          <div>Mensajes</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '500', color: '#9ca3af' }}>{providersUsed.length}</div>
          <div>Proveedores</div>
        </div>
      </div>

      {/* Backend status footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '6px',
        backgroundColor: isBackendConnected ? 
          'rgba(16, 185, 129, 0.1)' : 
          'rgba(239, 68, 68, 0.1)',
        borderRadius: '4px',
        marginTop: '8px'
      }}>
        {isBackendConnected ? (
          <Wifi style={{ width: '12px', height: '12px', color: '#10b981' }} />
        ) : (
          <WifiOff style={{ width: '12px', height: '12px', color: '#ef4444' }} />
        )}
        <span style={{ 
          fontSize: '11px',
          color: isBackendConnected ? '#86efac' : '#fca5a5'
        }}>
          API {isBackendConnected ? 'Conectada' : 'Desconectada'}
        </span>
      </div>
    </div>
  );
};

export default Sidebar;