import React, { useState, useRef, useEffect } from 'react';
import { Upload, Github, Send, Settings, FolderOpen, MessageSquare, Code, Trash2, Sparkles, Plus, Menu, X } from 'lucide-react';

const DevAIAgent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [currentProject, setCurrentProject] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentAgent, setCurrentAgent] = useState('claude-sonnet-4');
  const [thinkingProcess, setThinkingProcess] = useState('');
  const [expandedThinking, setExpandedThinking] = useState({});
  const [showWelcome, setShowWelcome] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Estados para el historial de conversaciones
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Cargar conversaciones guardadas al inicializar
  useEffect(() => {
    try {
      const saved = localStorage.getItem('devai_conversations');
      if (saved) {
        setConversations(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
    }
  }, []);

  // Guardar conversaciones cuando cambien
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('devai_conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generar título para la conversación
  const generateTitle = (firstMessage) => {
    const msg = firstMessage.toLowerCase();
    if (msg.includes('react')) return '⚛️ Consulta React';
    if (msg.includes('python')) return '🐍 Proyecto Python';
    if (msg.includes('bug') || msg.includes('error')) return '🐛 Resolución de Bugs';
    if (msg.includes('css') || msg.includes('style')) return '🎨 Estilos & UI';
    if (msg.includes('api')) return '🔗 API & Backend';
    return `💬 ${firstMessage.substring(0, 25)}...`;
  };

  // Guardar conversación actual
  const saveConversation = () => {
    if (messages.length === 0) return;

    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return;

    const now = new Date();
    const conversationData = {
      id: currentConversationId || Date.now(),
      title: generateTitle(userMessages[0].content),
      messages: messages,
      project: currentProject,
      createdAt: now,
      messageCount: messages.length,
      preview: userMessages[userMessages.length - 1]?.content.substring(0, 50) + '...'
    };

    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== conversationData.id);
      return [conversationData, ...filtered].slice(0, 20); // Máximo 20 conversaciones
    });

    setCurrentConversationId(conversationData.id);
  };

  // Cargar conversación
  const loadConversation = (conversation) => {
    if (messages.length > 0) {
      saveConversation();
    }
    
    setMessages(conversation.messages);
    setCurrentProject(conversation.project);
    setCurrentConversationId(conversation.id);
    setShowWelcome(false);
    setShowSidebar(false);
  };

  // Nueva conversación
  const startNewConversation = () => {
    if (messages.length > 0) {
      saveConversation();
    }
    
    setMessages([]);
    setCurrentProject(null);
    setCurrentConversationId(null);
    setShowWelcome(true);
    setShowSidebar(false);
  };

  // Eliminar conversación
  const deleteConversation = (id, event) => {
    event.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversationId === id) {
      startNewConversation();
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowWelcome(false);

    // Simular proceso de pensamiento
    const thinkingSteps = [
      '🔍 Analizando tu consulta...',
      '🧠 Procesando contexto...',
      '⚡ Generando respuesta...',
      '✨ Finalizando...'
    ];

    for (let i = 0; i < thinkingSteps.length; i++) {
      setThinkingProcess(thinkingSteps[i]);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // Generar respuesta contextual
    let responseContent = `Te ayudo con tu consulta: "${input}"

Aquí tienes algunas recomendaciones basadas en tu pregunta:`;

    if (currentProject && currentProject.files.length > 0) {
      responseContent = `Basándome en tu proyecto (${currentProject.files.length} archivos), aquí tienes la respuesta a: "${input}"

**Análisis de tu código:**`;
    }

    const codeExample = `\`\`\`javascript
// Ejemplo de solución optimizada
const OptimizedComponent = React.memo(({ data }) => {
  const memoizedValue = useMemo(() => {
    return expensiveCalculation(data);
  }, [data]);

  const handleClick = useCallback((id) => {
    onItemClick(id);
  }, [onItemClick]);

  return (
    <div className="optimized-component">
      {memoizedValue.map(item => (
        <div key={item.id} onClick={() => handleClick(item.id)}>
          {item.name}
        </div>
      ))}
    </div>
  );
});
\`\`\``;

    const aiResponse = { 
      role: 'assistant', 
      content: responseContent + '\n\n' + codeExample + '\n\n**Puntos clave:**\n- Memoización para optimizar renders\n- Callbacks estables\n- Mejores prácticas aplicadas\n\n¿Te gustaría que profundice en algún aspecto?',
      agent: currentAgent,
      thinking: `Procesé tu consulta considerando:\n• ${currentProject ? `Proyecto con ${currentProject.files.length} archivos` : 'Consulta general'}\n• Mejores prácticas de desarrollo\n• Optimizaciones específicas para tu caso`,
      timestamp: new Date()
    };

    setTimeout(() => {
      setMessages(prev => [...prev, aiResponse]);
      setThinkingProcess('');
      setIsLoading(false);
      
      // Auto-guardar después de la respuesta
      setTimeout(saveConversation, 500);
    }, 1000);
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setIsLoading(true);
    const projectFiles = [];
    
    try {
      for (const file of files) {
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

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ **Proyecto "${projectName}" cargado**\n\n📁 ${projectFiles.length} archivos analizados\n📊 Tamaño total: ${Math.round(projectFiles.reduce((acc, f) => acc + f.size, 0) / 1024)}KB\n\n¿En qué puedo ayudarte con tu código?`
      }]);
      
      setShowWelcome(false);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error al cargar archivos: ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Formatear tiempo relativo
  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  // Sugerencias para la pantalla de bienvenida
  const suggestions = [
    { icon: "🔍", text: "Analizar mi código React", action: () => setInput("¿Puedes revisar mi código React y sugerir optimizaciones?") },
    { icon: "🐛", text: "Encontrar bugs", action: () => setInput("Ayúdame a encontrar posibles bugs en mi código") },
    { icon: "⚡", text: "Mejorar rendimiento", action: () => setInput("¿Cómo puedo mejorar el rendimiento de mi aplicación?") },
    { icon: "🎨", text: "Refactorizar código", action: () => setInput("Necesito refactorizar este código para que sea más limpio") }
  ];

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-80 bg-gray-50 border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Code className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">DevAI</span>
            </div>
            <button
              onClick={startNewConversation}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title="Nueva conversación"
            >
              <Plus className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Conversaciones */}
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay conversaciones</p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors group relative ${
                      currentConversationId === conv.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{conv.title}</h3>
                        <p className="text-sm text-gray-600 truncate mt-1">{conv.preview}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>💬 {conv.messageCount}</span>
                          <span>{formatTime(conv.createdAt)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="h-5 w-5 text-gray-600" />
              <span className="text-gray-700">Configuración</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay móvil */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium text-gray-900">{currentAgent}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentProject && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                <FolderOpen className="h-4 w-4" />
                <span>{currentProject.files.length} archivos</span>
              </div>
            )}
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Upload className="h-5 w-5 text-gray-600" />
            </button>
            
            <button
              onClick={startNewConversation}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Trash2 className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </header>

        {/* Panel de configuración */}
        {showSettings && (
          <div className="border-b border-gray-200 bg-gray-50 p-4">
            <div className="max-w-2xl space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
                <select
                  value={currentAgent}
                  onChange={(e) => setCurrentAgent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="claude-sonnet-4">Claude Sonnet 4</option>
                  <option value="claude-opus-4">Claude Opus 4</option>
                  <option value="gpt-4">GPT-4</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto">
          {(messages.length === 0 && showWelcome) ? (
            /* Pantalla de bienvenida */
            <div className="h-full flex flex-col items-center justify-center p-8 max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  ¿En qué puedo ayudarte hoy?
                </h1>
                <p className="text-lg text-gray-600 max-w-2xl">
                  Soy tu asistente de desarrollo. Puedo analizar código, resolver problemas y ayudarte a optimizar tus proyectos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={suggestion.action}
                    className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{suggestion.icon}</span>
                      <span className="text-gray-700 group-hover:text-blue-700 font-medium">
                        {suggestion.text}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Mensajes del chat */
            <div className="max-w-3xl mx-auto p-4 space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm'
                    } p-4`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">AI</span>
                        </div>
                        <span className="text-sm font-medium text-gray-600">{message.agent}</span>
                      </div>
                    )}
                    
                    <div className="prose prose-sm max-w-none">
                      {message.content.includes('```') ? (
                        <div className="space-y-3">
                          {message.content.split('```').map((part, partIndex) => {
                            if (partIndex % 2 === 0) {
                              return part.trim() && (
                                <div key={partIndex} className="whitespace-pre-wrap">
                                  {part}
                                </div>
                              );
                            } else {
                              const lines = part.split('\n');
                              const language = lines[0] || 'code';
                              const code = lines.slice(1).join('\n');
                              
                              return (
                                <div key={partIndex} className="bg-gray-900 rounded-lg overflow-hidden">
                                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-300 text-sm">
                                    <span>{language}</span>
                                    <button 
                                      onClick={() => navigator.clipboard.writeText(code)}
                                      className="hover:text-white"
                                    >
                                      Copiar
                                    </button>
                                  </div>
                                  <pre className="p-4 text-sm text-gray-100 overflow-x-auto">
                                    <code>{code}</code>
                                  </pre>
                                </div>
                              );
                            }
                          })}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                    </div>
                    
                    {message.thinking && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => setExpandedThinking(prev => ({
                            ...prev,
                            [index]: !prev[index]
                          }))}
                          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700"
                        >
                          <span>💭</span>
                          <span>{expandedThinking[index] ? 'Ocultar' : 'Ver'} razonamiento</span>
                        </button>
                        
                        {expandedThinking[index] && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                              {message.thinking}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%]">
                    {thinkingProcess && (
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl rounded-bl-sm p-4 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">AI</span>
                          </div>
                          <span className="text-sm text-blue-700">{thinkingProcess}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-gray-100 rounded-2xl rounded-bl-sm p-4">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Área de input */}
        <div className="border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Escribe tu mensaje aquí..."
                disabled={isLoading}
                rows={1}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Input de archivos oculto */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".js,.jsx,.ts,.tsx,.py,.html,.css,.json,.md,.txt"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
    </div>
  );
};

export default DevAIAgent;