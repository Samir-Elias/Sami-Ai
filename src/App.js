// ============================================
// 🚀 APP PRINCIPAL - DevAI Agent - VERSIÓN FINAL FUNCIONAL
// ============================================

import React, { useState, useRef, useEffect } from 'react';
import { AppProvider, useApp, useBackendStatus, useAPI, useUI } from './context/AppContext';
import { useResponsive } from './hooks/useResponsive';
import { useLivePreview } from './hooks/useLivePreview';
import { useConversations as useConversationsHook } from './hooks/useConversations';

// Componentes principales
import Header from './components/ui/Header';
import Sidebar from './components/ui/Sidebar';
import SettingsPanel from './components/ui/SettingsPanel';
import WelcomeScreen from './components/ui/WelcomeScreen';
import ChatContainer from './components/features/chat/ChatContainer';
import LiveCodePreview from './components/features/LiveCodePreview/LiveCodePreview';

// Servicios y utilidades
import { callFreeAIAPI, generateFallbackResponse } from './services/api/aiServiceFactory';
import { processFiles } from './services/fileService';
import { API_KEYS, checkEnvKeys } from './utils/constants';

// Estilos globales
import './index.css';

/**
 * Componente principal de la aplicación envuelto en el Provider
 */
function App() {
  return (
    <AppProvider>
      <DevAIAgent />
    </AppProvider>
  );
}

/**
 * Componente principal de la aplicación
 */
const DevAIAgent = () => {
  // ============================================
  // 🎣 HOOKS Y ESTADO
  // ============================================

  // Estados locales principales
  const [input, setInput] = useState('');
  const [thinkingProcess, setThinkingProcess] = useState('');
  const [apiKey, setApiKey] = useState('');

  // Referencias
  const fileInputRef = useRef(null);

  // Hooks de contexto con manejo seguro
  const appContext = useApp();
  const { 
    currentProject = 'AI Dev Agent',
    currentProvider = 'gemini', 
    currentModel = 'gemini-1.5-flash',
    messages = [],
    showSettings = false,
    showSidebar = false,
    showLivePreview = false,
    api,
    conversation,
    settings,
    ui
  } = appContext || {};

  const backendStatus = useBackendStatus();
  const { isConnected: isBackendConnected = false, reconnect } = backendStatus || {};
  
  const apiContext = useAPI();
  const { api: apiMethods, isLoading = false, error } = apiContext || {};

  // Hooks personalizados
  const { isMobile } = useResponsive();
  const livePreview = useLivePreview(messages, isMobile);
  const conversationsHook = useConversationsHook();

  // ============================================
  // 🔧 EFECTOS E INICIALIZACIÓN
  // ============================================

  // Verificar API keys al iniciar
  useEffect(() => {
    try {
      checkEnvKeys();
    } catch (error) {
      console.warn('Error verificando API keys:', error);
    }
  }, []);

  // Actualizar API key cuando cambie el proveedor
  useEffect(() => {
    if (currentProvider && API_KEYS) {
      try {
        const newApiKey = API_KEYS[currentProvider] || '';
        setApiKey(newApiKey);
      } catch (error) {
        console.warn('Error actualizando API key:', error);
        setApiKey('');
      }
    }
  }, [currentProvider]);

  // ============================================
  // 🎯 HANDLERS PRINCIPALES
  // ============================================

  /**
   * 🔥 HANDLER PARA CLICKS DEL MENÚ HAMBURGUESA
   */
  const handleMenuClick = () => {
    console.log('🍔 Menu clicked!');
    if (ui && ui.toggleSidebar) {
      ui.toggleSidebar();
    } else {
      console.warn('ui.toggleSidebar no disponible');
    }
  };

  /**
   * 🔥 HANDLER PARA CLICKS DE CONFIGURACIÓN
   */
  const handleSettingsClick = () => {
    console.log('⚙️ Settings clicked!');
    if (ui && ui.toggleSettings) {
      ui.toggleSettings();
    } else {
      console.warn('ui.toggleSettings no disponible');
    }
  };

  /**
   * 🔥 HANDLER PARA TOGGLE DE LIVE PREVIEW
   */
  const handlePreviewToggle = () => {
    console.log('👁️ Preview toggle clicked!');
    if (ui && ui.toggleLivePreview) {
      ui.toggleLivePreview();
    } else if (livePreview && livePreview.togglePreview) {
      livePreview.togglePreview();
    } else {
      console.warn('Toggle preview no disponible');
    }
  };

  /**
   * Enviar mensaje al chat
   */
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    if (!conversation?.addMessage) {
      console.error('Función addMessage no disponible');
      return;
    }

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    // Agregar mensaje del usuario
    conversation.addMessage(userMessage);
    setInput('');

    // Preparar mensajes para la API
    const chatMessages = [...(messages || []), userMessage];

    try {
      setThinkingProcess('Procesando tu solicitud...');

      let response;
      
      if (isBackendConnected && apiMethods?.chatWithAI) {
        // Usar backend si está conectado
        response = await apiMethods.chatWithAI(chatMessages, {
          provider: currentProvider,
          model: currentModel,
          apiKey: apiKey
        });
      } else {
        // Usar API directa como fallback
        if (!apiKey && currentProvider !== 'ollama') {
          throw new Error(`API Key requerida para ${currentProvider.toUpperCase()}`);
        }

        response = await callFreeAIAPI(
          chatMessages,
          apiKey,
          currentProvider,
          currentModel,
          isMobile
        );
      }

      // Agregar respuesta de la IA
      const assistantMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        provider: response.provider,
        model: response.model,
        usage: response.usage
      };

      conversation.addMessage(assistantMessage);

      // Guardar conversación si el backend está disponible
      if (isBackendConnected && conversationsHook?.saveConversation) {
        await conversationsHook.saveConversation([...chatMessages, assistantMessage], {
          provider: response.provider,
          model: response.model,
          totalTokens: response.usage?.total_tokens
        });
      }

    } catch (error) {
      console.error('❌ Error en chat:', error);

      // Generar respuesta de fallback
      const fallbackResponse = generateFallbackResponse(input, currentProvider);
      
      const errorMessage = {
        role: 'assistant',
        content: fallbackResponse.content,
        timestamp: new Date(),
        provider: 'fallback',
        model: fallbackResponse.model,
        isError: true
      };

      if (conversation?.addMessage) {
        conversation.addMessage(errorMessage);
      }
    } finally {
      setThinkingProcess('');
    }
  };

  /**
   * Manejar subida de archivos
   */
  const handleFileUpload = async (event) => {
    const files = event?.target?.files;
    if (!files || files.length === 0) return;

    if (!settings?.setProject || !conversation?.addMessage) {
      console.error('Funciones de contexto no disponibles para subida de archivos');
      return;
    }

    try {
      setThinkingProcess('Procesando archivos...');

      const project = await processFiles(files, {
        maxFiles: 20,
        onProgress: (progress) => {
          setThinkingProcess(`Procesando archivos... ${Math.round(progress.progress)}%`);
        }
      });

      // Actualizar proyecto actual
      settings.setProject(project.name);

      // Generar mensaje de análisis
      const analysisMessage = {
        role: 'assistant',
        content: generateProjectAnalysis(project),
        timestamp: new Date(),
        provider: 'sistema',
        model: 'file-analyzer'
      };

      conversation.addMessage(analysisMessage);

      console.log('✅ Proyecto cargado:', project);

    } catch (error) {
      console.error('❌ Error procesando archivos:', error);
      
      const errorMessage = {
        role: 'assistant',
        content: `❌ Error procesando archivos: ${error.message}`,
        timestamp: new Date(),
        provider: 'sistema',
        isError: true
      };

      if (conversation?.addMessage) {
        conversation.addMessage(errorMessage);
      }
    } finally {
      setThinkingProcess('');
    }

    // Limpiar el input
    if (event?.target) {
      event.target.value = '';
    }
  };

  /**
   * 🔥 HANDLER PARA CERRAR SIDEBAR
   */
  const handleCloseSidebar = () => {
    console.log('❌ Sidebar close clicked!');
    if (ui && ui.closeSidebar) {
      ui.closeSidebar();
    }
  };

  /**
   * 🔥 HANDLER PARA CERRAR SETTINGS
   */
  const handleCloseSettings = () => {
    console.log('❌ Settings close clicked!');
    if (ui && ui.closeSettings) {
      ui.closeSettings();
    }
  };

  /**
   * 🔥 HANDLER PARA NUEVA CONVERSACIÓN
   */
  const handleNewConversation = () => {
    console.log('➕ Nueva conversación');
    if (conversation?.startNewConversation) {
      conversation.startNewConversation();
    }
    if (conversationsHook?.startNewConversation) {
      conversationsHook.startNewConversation();
    }
    if (isMobile && ui?.closeSidebar) {
      ui.closeSidebar();
    }
  };

  /**
   * 🔥 HANDLER PARA CARGAR CONVERSACIÓN
   */
  const handleLoadConversation = (conv) => {
    console.log('📂 Cargando conversación:', conv?.title);
    if (conversation?.loadConversation) {
      conversation.loadConversation(conv);
    }
    if (conversationsHook?.loadConversation) {
      conversationsHook.loadConversation(conv);
    }
    if (isMobile && ui?.closeSidebar) {
      ui.closeSidebar();
    }
  };

  /**
   * 🔥 HANDLER PARA CAMBIAR PROVEEDOR
   */
  const handleProviderChange = (provider) => {
    console.log('🔄 Cambiando proveedor a:', provider);
    if (settings?.setProvider) {
      settings.setProvider(provider);
    }
  };

  /**
   * 🔥 HANDLER PARA CAMBIAR MODELO
   */
  const handleModelChange = (model) => {
    console.log('🧠 Cambiando modelo a:', model);
    if (settings?.setModel) {
      settings.setModel(model);
    }
  };

  // ============================================
  // 🛡️ VALIDACIONES ANTES DEL RENDERIZADO
  // ============================================

  if (!appContext || !backendStatus || !apiContext) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1e293b',
        color: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>⚠️ Error de inicialización</h2>
          <p>Los contextos de la aplicación no se cargaron correctamente.</p>
          <p>Intenta recargar la página.</p>
        </div>
      </div>
    );
  }

  // ============================================
  // 🎨 RENDERIZADO
  // ============================================

  const hasMessages = messages && messages.length > 0;
  const hasApiKey = !!apiKey;

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1e293b',
      color: '#f8fafc',
      overflow: 'hidden'
    }}>
      {/* Header con handlers corregidos */}
      <Header
        isMobile={isMobile}
        currentProvider={currentProvider}
        liveCodeBlocks={livePreview?.previewableBlocks || []}
        showPreview={showLivePreview}
        apiKey={apiKey}
        onMenuClick={handleMenuClick} // 🔥 Handler corregido
        onSettingsClick={handleSettingsClick} // 🔥 Handler corregido
        onPreviewToggle={handlePreviewToggle} // 🔥 Handler corregido
      />

      {/* Settings Panel con handlers corregidos */}
      {showSettings && (
        <SettingsPanel
          isVisible={showSettings}
          isMobile={isMobile}
          currentProvider={currentProvider}
          currentModel={currentModel}
          apiKey={apiKey}
          apiStatus={getApiStatus(currentProvider, apiKey)}
          liveCodeBlocks={livePreview?.previewableBlocks || []}
          onClose={handleCloseSettings} // 🔥 Handler corregido
          onProviderChange={handleProviderChange} // 🔥 Handler corregido
          onModelChange={handleModelChange} // 🔥 Handler corregido
        />
      )}

      {/* Layout principal */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Sidebar con handlers corregidos */}
        <Sidebar
          isVisible={showSidebar}
          isMobile={isMobile}
          conversations={conversationsHook?.conversations || []}
          currentConversationId={conversationsHook?.currentConversationId}
          onClose={handleCloseSidebar} // 🔥 Handler corregido
          onNewConversation={handleNewConversation} // 🔥 Handler corregido
          onLoadConversation={handleLoadConversation} // 🔥 Handler corregido
          onDeleteConversation={conversationsHook?.deleteConversation || (() => {})}
          onExportConversations={() => {
            if (conversationsHook?.exportConversations) {
              const exported = conversationsHook.exportConversations();
              downloadFile(exported, `conversaciones_${new Date().toISOString().split('T')[0]}.json`);
            }
          }}
          onImportConversations={() => {
            console.log('Import conversations - implementar');
          }}
        />

        {/* Área principal */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          marginLeft: showSidebar && !isMobile ? '320px' : '0',
          transition: 'margin-left 0.3s ease'
        }}>
          {/* Contenido principal */}
          {hasMessages ? (
            <ChatContainer
              messages={messages}
              input={input}
              isLoading={isLoading}
              thinkingProcess={thinkingProcess}
              currentProject={currentProject}
              isMobile={isMobile}
              onInputChange={setInput}
              onSendMessage={handleSendMessage}
              onFileUpload={handleFileUpload}
            />
          ) : (
            <WelcomeScreen
              isMobile={isMobile}
              onFileUpload={() => fileInputRef.current?.click()}
              onSettingsOpen={handleSettingsClick} // 🔥 Handler corregido
              hasApiKey={hasApiKey}
              currentProvider={currentProvider}
            />
          )}

          {/* Input de archivos oculto */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".js,.jsx,.ts,.tsx,.py,.html,.css,.json,.md,.txt,.php,.java,.cpp,.c,.cs,.rb,.go,.rs,.swift,.kt,.dart,.vue,.svelte,.astro"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            webkitdirectory=""
          />
        </div>

        {/* Live Preview */}
        {livePreview?.hasPreviewableCode && !isMobile && (
          <LiveCodePreview
            codeBlocks={livePreview.previewableBlocks}
            isVisible={showLivePreview}
            onToggle={handlePreviewToggle} // 🔥 Handler corregido
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Overlay para móvil cuando el sidebar está abierto */}
      {isMobile && showSidebar && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 45
          }}
          onClick={handleCloseSidebar} // 🔥 Handler corregido
        />
      )}
    </div>
  );
};

// ============================================
// 🛠️ FUNCIONES AUXILIARES
// ============================================

/**
 * Generar análisis del proyecto cargado
 */
const generateProjectAnalysis = (project) => {
  if (!project || !project.files) {
    return '❌ Error: Proyecto inválido';
  }

  const { files, stats = {} } = project;
  
  return `## 📁 Proyecto "${project.name}" cargado exitosamente

**📊 Estadísticas:**
- 📄 **${files.length} archivos** procesados
- 📝 **${(stats.totalLines || 0).toLocaleString()} líneas** de código
- 🔤 **${(stats.totalChars || 0).toLocaleString()} caracteres**
- 🗣️ **Lenguaje principal:** ${stats.primaryLanguage || 'Desconocido'}

**🏗️ Estructura detectada:**
${stats.languages ? Object.entries(stats.languages)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 5)
  .map(([lang, count]) => `- ${lang}: ${count} archivo${count > 1 ? 's' : ''}`)
  .join('\n') : 'No disponible'}

${files.length > 10 ? `\n**Nota:** Mostrando estadísticas de los ${files.length} archivos más relevantes.` : ''}

¡Ahora puedo ayudarte con análisis de código, debugging, optimizaciones y explicaciones! 🚀

**💡 Ejemplos de lo que puedes preguntar:**
- "Analiza este proyecto y encuentra posibles mejoras"
- "¿Hay algún patrón de código problemático?"
- "Explícame qué hace cada archivo principal"
- "Sugiere optimizaciones de rendimiento"`;
};

/**
 * Obtener estado de las APIs
 */
const getApiStatus = (provider, apiKey) => {
  if (!provider) return {};
  
  return {
    [provider]: {
      available: !!apiKey || provider === 'ollama',
      error: !apiKey && provider !== 'ollama' ? 'Sin API Key' : null
    }
  };
};

/**
 * Descargar archivo
 */
const downloadFile = (content, filename) => {
  try {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error descargando archivo:', error);
  }
};

export default App;