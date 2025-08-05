// ============================================
// 🎯 DEVAI AGENT - APLICACIÓN PRINCIPAL MODULAR
// ============================================

import React, { useState, useRef, useEffect } from 'react';

// 🎣 Hooks personalizados
import { useIsMobile } from './hooks/useResponsive';
import { useConversations } from './hooks/useConversations';
import { useApiStatus } from './hooks/useApiStatus';
import { useLivePreview } from './hooks/useLivePreview';

// 🧩 Componentes principales
import Header from './components/ui/Header';
import Sidebar from './components/ui/Sidebar';
import SettingsPanel from './components/ui/SettingsPanel';
import WelcomeScreen, { SetupWelcomeScreen } from './components/ui/WelcomeScreen';
import ChatContainer from './components/features/chat/ChatContainer';
import LiveCodePreview from './components/features/LiveCodePreview/LiveCodePreview';

// 🔧 Servicios y utilidades
import { callFreeAIAPI, generateFallbackResponse } from './services/api/aiServiceFactory';
import { API_KEYS, DEFAULT_PROVIDER, DEFAULT_MODEL } from './utils/constants';

/**
 * 🎯 Componente principal de DevAI Agent
 */
const DevAIAgent = () => {
  // ═══════════════════════════════════════════
  // 📱 ESTADO PRINCIPAL
  // ═══════════════════════════════════════════
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingProcess, setThinkingProcess] = useState('');
  
  // Configuración de IA
  const [currentProvider, setCurrentProvider] = useState(DEFAULT_PROVIDER);
  const [currentModel, setCurrentModel] = useState(DEFAULT_MODEL);
  const [apiKey, setApiKey] = useState(API_KEYS[DEFAULT_PROVIDER] || '');
  
  // Estados de UI
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentProject, setCurrentProject] = useState(null);
  
  // Referencias
  const fileInputRef = useRef(null);

  // ═══════════════════════════════════════════
  // 🎣 HOOKS PERSONALIZADOS
  // ═══════════════════════════════════════════
  
  const isMobile = useIsMobile();
  const { apiStatus, checkAllApis } = useApiStatus(isMobile);
  const { 
    conversations, 
    currentConversationId,
    saveConversation,
    startNewConversation,
    loadConversation,
    deleteConversation,
    exportConversations,
    importConversations
  } = useConversations();
  
  const {
    showPreview,
    previewableBlocks,
    togglePreview,
    hasPreviewableCode
  } = useLivePreview(messages, isMobile);

  // ═══════════════════════════════════════════
  // 🔧 EFECTOS Y CONFIGURACIÓN
  // ═══════════════════════════════════════════
  
  // Verificar APIs al inicializar
  useEffect(() => {
    checkAllApis();
  }, [checkAllApis]);

  // Auto-cambiar API key cuando cambia el proveedor
  useEffect(() => {
    const newApiKey = API_KEYS[currentProvider] || '';
    setApiKey(newApiKey);
  }, [currentProvider]);

  // Ocultar welcome cuando hay mensajes
  useEffect(() => {
    if (messages.length > 0) {
      setShowWelcome(false);
    }
  }, [messages.length]);

  // ═══════════════════════════════════════════
  // 📨 FUNCIONES DE MENSAJERÍA
  // ═══════════════════════════════════════════
  
  /**
   * Enviar mensaje a la IA
   */
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const currentInput = input;
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowWelcome(false);

    // Preparar contexto del proyecto si existe
    let contextualMessages = [...messages, userMessage];
    if (currentProject?.files?.length > 0) {
      const projectContext = generateProjectContext(currentProject, currentInput);
      contextualMessages = [{ role: 'user', content: projectContext }];
    }

    try {
      // Simular proceso de pensamiento
      await simulateThinkingProcess(currentProvider);

      // Llamar a la API real
      const response = await callFreeAIAPI(
        contextualMessages, 
        apiKey, 
        currentProvider, 
        currentModel, 
        isMobile
      );

      const aiResponse = {
        role: 'assistant',
        content: response.content,
        agent: `${currentProvider.toUpperCase()}`,
        thinking: generateThinkingReport(currentProvider, response, currentProject),
        timestamp: new Date(),
        usage: response.usage,
        provider: currentProvider
      };

      setMessages(prev => [...prev, aiResponse]);
      
      // Guardar conversación
      setTimeout(() => {
        saveConversation([...messages, userMessage, aiResponse], {
          provider: currentProvider,
          model: response.model,
          totalTokens: response.usage?.total_tokens
        });
      }, 500);

    } catch (error) {
      console.warn('API falló, usando respuesta simulada:', error.message);
      
      // Fallback con respuesta inteligente
      const fallbackResponse = generateFallbackResponse(currentInput, currentProvider);
      const aiResponse = {
        role: 'assistant',
        content: `❌ **Error con ${currentProvider.toUpperCase()}**: ${error.message}\n\n---\n\n*Usando respuesta simulada inteligente:*\n\n${fallbackResponse.content}`,
        agent: `${currentProvider.toUpperCase()} (Simulado)`,
        thinking: `Error: ${error.message}\nUsando respuesta simulada inteligente.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } finally {
      setThinkingProcess('');
      setIsLoading(false);
    }
  };

  /**
   * Simular proceso de pensamiento
   */
  const simulateThinkingProcess = async (provider) => {
    const thinkingSteps = {
      gemini: ['🔗 Conectando con Gemini...', '🧠 Procesando consulta...', '✨ Generando respuesta...'],
      groq: ['⚡ Conectando con Groq...', '🚀 Procesamiento ultra-rápido...', '✨ Listo...'],
      huggingface: ['🤗 Conectando con HF...', '💡 Procesando modelo...', '✨ Completado...'],
      ollama: ['🏠 Conectando localmente...', '⚡ Procesando con Ollama...', '✨ Respuesta lista...']
    };

    const steps = thinkingSteps[provider] || thinkingSteps.gemini;
    
    for (let i = 0; i < steps.length; i++) {
      setThinkingProcess(steps[i]);
      const delay = isMobile ? 400 : 800;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  };

  /**
   * Generar contexto del proyecto
   */
  const generateProjectContext = (project, query) => {
    return `CONTEXTO DEL PROYECTO:
- Nombre: ${project.name}
- Archivos: ${project.files.length}
- Tipos: ${[...new Set(project.files.map(f => f.type))].join(', ')}

ARCHIVOS RELEVANTES (primeros 2):
${project.files.slice(0, 2).map(file => 
  `📁 ${file.name} (${file.type})\n\`\`\`${file.type.replace('.', '')}\n${file.content.substring(0, 500)}${file.content.length > 500 ? '\n...[truncado]' : ''}\n\`\`\``
).join('\n\n')}

CONSULTA: ${query}`;
  };

  /**
   * Generar reporte de pensamiento
   */
  const generateThinkingReport = (provider, response, project) => {
    return `Procesé tu consulta usando ${provider.toUpperCase()}
• Modelo: ${response.model || currentModel}
• Tokens: ${response.usage?.total_tokens || 'N/A'}${project ? `
• Consideré el contexto de ${project.files.length} archivos` : ''}
• Estado: ${response.model ? 'API Real' : 'Simulado'}
• Tiempo: ${new Date().toLocaleTimeString()}`;
  };

  // ═══════════════════════════════════════════
  // 📁 FUNCIONES DE ARCHIVOS
  // ═══════════════════════════════════════════
  
  /**
   * Manejar subida de archivos
   */
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsLoading(true);
    const projectFiles = [];
    
    try {
      for (const file of files.slice(0, isMobile ? 3 : 10)) {
        if (file.size < 2000000) { // 2MB max
          const content = await file.text();
          projectFiles.push({
            name: file.name,
            content: content,
            size: file.size,
            type: '.' + file.name.split('.').pop()
          });
        }
      }

      const projectName = files[0].webkitRelativePath ? 
        files[0].webkitRelativePath.split('/')[0] : 
        `Proyecto ${new Date().toLocaleDateString()}`;

      setCurrentProject({
        name: projectName,
        files: projectFiles,
        uploadedAt: new Date()
      });

      // Mensaje de confirmación
      const confirmationMessage = {
        role: 'assistant',
        content: `✅ **Proyecto cargado exitosamente**\n\n📁 **${projectName}**\n📊 ${projectFiles.length} archivos procesados\n💾 ${Math.round(projectFiles.reduce((acc, f) => acc + f.size, 0) / 1024)} KB total\n\n🧠 **Contexto disponible para consultas:**\n${projectFiles.map(f => `• ${f.name} (${f.type})`).join('\n')}\n\n💡 *Ahora puedes preguntarme sobre tu código, encontrar bugs, pedir optimizaciones, etc.*`,
        agent: 'Sistema',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, confirmationMessage]);
      setShowWelcome(false);

    } catch (error) {
      console.error('Error cargando archivos:', error);
      const errorMessage = {
        role: 'assistant',
        content: `❌ **Error cargando proyecto**: ${error.message}\n\n💡 **Sugerencias:**\n- Asegúrate de que los archivos sean de texto\n- Verifica que no excedan 2MB por archivo\n- Intenta con menos archivos si es un proyecto grande`,
        agent: 'Sistema',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // ═══════════════════════════════════════════
  // 🎛️ FUNCIONES DE CONFIGURACIÓN
  // ═══════════════════════════════════════════
  
  /**
   * Cambiar proveedor de IA
   */
  const handleProviderChange = (provider) => {
    setCurrentProvider(provider);
    // El useEffect se encargará de cambiar la API key
  };

  /**
   * Cambiar modelo
   */
  const handleModelChange = (model) => {
    setCurrentModel(model);
  };

  /**
   * Exportar conversaciones
   */
  const handleExportConversations = () => {
    try {
      const data = exportConversations();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devai-conversations-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando conversaciones:', error);
    }
  };

  /**
   * Importar conversaciones
   */
  const handleImportConversations = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (file) {
          const text = await file.text();
          const success = importConversations(text);
          if (success) {
            alert('Conversaciones importadas exitosamente');
          } else {
            alert('Error importando conversaciones. Verifica el formato del archivo.');
          }
        }
      } catch (error) {
        console.error('Error importando conversaciones:', error);
        alert('Error importando conversaciones.');
      }
    };
    input.click();
  };

  // ═══════════════════════════════════════════
  // 🎨 RENDERIZADO PRINCIPAL
  // ═══════════════════════════════════════════
  
  // Determinar si necesita configuración
  const needsSetup = !apiKey && currentProvider !== 'ollama';
  
  return (
    <div className="gradient-bg full-height flex flex-col">
      {/* 📱 Header */}
      <Header
        isMobile={isMobile}
        currentProvider={currentProvider}
        currentProject={currentProject}
        liveCodeBlocks={previewableBlocks}
        showPreview={showPreview}
        apiStatus={apiStatus}
        apiKey={apiKey}
        onMenuClick={() => setShowSidebar(true)}
        onSettingsClick={() => setShowSettings(!showSettings)}
        onPreviewToggle={togglePreview}
      />

      {/* 👁️ Live Code Preview - Solo desktop */}
      {!isMobile && hasPreviewableCode && (
        <LiveCodePreview 
          codeBlocks={previewableBlocks}
          isVisible={showPreview}
          onToggle={togglePreview}
          isMobile={isMobile}
        />
      )}

      {/* 📋 Sidebar */}
      <Sidebar
        isVisible={showSidebar}
        isMobile={isMobile}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onClose={() => setShowSidebar(false)}
        onNewConversation={() => {
          startNewConversation();
          setMessages([]);
          setShowWelcome(true);
          setShowSidebar(false);
        }}
        onLoadConversation={(conv) => {
          loadConversation(conv);
          setMessages(conv.messages || []);
          setShowWelcome(false);
          setShowSidebar(false);
        }}
        onDeleteConversation={deleteConversation}
        onExportConversations={handleExportConversations}
        onImportConversations={handleImportConversations}
      />

      {/* ⚙️ Settings Panel */}
      <SettingsPanel
        isVisible={showSettings}
        isMobile={isMobile}
        currentProvider={currentProvider}
        currentModel={currentModel}
        apiKey={apiKey}
        apiStatus={apiStatus}
        liveCodeBlocks={previewableBlocks}
        onClose={() => setShowSettings(false)}
        onProviderChange={handleProviderChange}
        onModelChange={handleModelChange}
      />

      {/* 🏠 Área de contenido principal */}
      <div style={{
        flex: 1,
        marginRight: showPreview && !isMobile ? '50%' : 0,
        transition: 'margin-right 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Contenido condicional */}
        {needsSetup ? (
          /* 🔧 Pantalla de configuración inicial */
          <SetupWelcomeScreen
            isMobile={isMobile}
            onSettingsOpen={() => setShowSettings(true)}
            availableProviders={['gemini', 'groq', 'huggingface', 'ollama']}
          />
        ) : showWelcome && messages.length === 0 ? (
          /* 🎉 Pantalla de bienvenida */
          <WelcomeScreen
            isMobile={isMobile}
            onFileUpload={() => fileInputRef.current?.click()}
            onSettingsOpen={() => setShowSettings(true)}
            hasApiKey={!!apiKey}
            currentProvider={currentProvider}
          />
        ) : (
          /* 💬 Chat principal */
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
        )}
      </div>

      {/* 📁 Input de archivos oculto */}
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
  );
};

export default DevAIAgent;