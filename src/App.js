import React, { useState, useRef, useEffect } from 'react';
import { Upload, Github, Send, Settings, FolderOpen, MessageSquare, Code, Trash2, Sparkles, Plus, Menu, X, AlertCircle, CheckCircle, Wifi, WifiOff, Copy, Clock, Zap } from 'lucide-react';

// ============================================
// 🆓 FUNCIONES DE APIS GRATUITAS
// ============================================

// 1. 🏆 GOOGLE GEMINI API (RECOMENDADA - 1,500 requests/día GRATIS)
const callGeminiAPI = async (messages, apiKey) => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096
        },
        systemInstruction: {
          parts: [{
            text: "Eres un asistente experto en desarrollo de software. Analiza código, encuentra bugs, sugiere optimizaciones y explica conceptos técnicos de manera clara y práctica. Siempre proporciona ejemplos de código cuando sea relevante."
          }]
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text,
      usage: data.usageMetadata,
      model: 'gemini-1.5-flash'
    };
  } catch (error) {
    console.error('Error llamando Gemini API:', error);
    throw error;
  }
};

// 2. 🤗 HUGGING FACE API (GRATIS con límites)
const callHuggingFaceAPI = async (messages, apiKey, model = 'microsoft/DialoGPT-medium') => {
  try {
    const lastMessage = messages[messages.length - 1];
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: lastMessage.content,
        parameters: {
          max_length: 1000,
          temperature: 0.7,
          do_sample: true
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HuggingFace API Error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data[0]?.generated_text || data.generated_text || 'Error generando respuesta',
      usage: { total_tokens: 'N/A' },
      model: model
    };
  } catch (error) {
    console.error('Error llamando HuggingFace API:', error);
    throw error;
  }
};

// 3. 🏠 OLLAMA LOCAL (100% GRATIS - Ejecuta modelos localmente)
const callOllamaAPI = async (messages, model = 'llama3.2:3b') => {
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.message.content,
      usage: { total_tokens: 'N/A' },
      model: model
    };
  } catch (error) {
    console.error('Error llamando Ollama API:', error);
    throw error;
  }
};

// 4. 🆓 GROQ API (GRATIS - Ultra rápido con Llama)
const callGroqAPI = async (messages, apiKey, model = 'llama3-8b-8192') => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente experto en desarrollo de software. Analiza código, encuentra bugs, sugiere optimizaciones y explica conceptos técnicos de manera clara.'
          },
          ...messages
        ],
        model: model,
        temperature: 0.1,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
      model: data.model
    };
  } catch (error) {
    console.error('Error llamando Groq API:', error);
    throw error;
  }
};

// ============================================
// 🎯 FUNCIÓN PRINCIPAL MULTI-API GRATUITA
// ============================================

const callFreeAIAPI = async (messages, apiKey, provider = 'gemini', model = null) => {
  const cleanMessages = messages.filter(msg => msg.role !== 'system');

  switch (provider) {
    case 'gemini':
      return await callGeminiAPI(cleanMessages, apiKey);
    
    case 'huggingface':
      return await callHuggingFaceAPI(cleanMessages, apiKey, model || 'microsoft/DialoGPT-medium');
    
    case 'ollama':
      return await callOllamaAPI(cleanMessages, model || 'llama3.2:3b');
    
    case 'groq':
      return await callGroqAPI(cleanMessages, apiKey, model || 'llama3-8b-8192');
    
    default:
      throw new Error(`Proveedor no soportado: ${provider}`);
  }
};

// ============================================
// 🔧 CONFIGURACIÓN DE MODELOS GRATUITOS
// ============================================

const FREE_AI_MODELS = {
  gemini: {
    'gemini-1.5-flash': '🏆 Gemini 1.5 Flash (1,500/día GRATIS)',
    'gemini-1.5-pro': '💎 Gemini 1.5 Pro (50/día GRATIS)',
    'gemini-pro': '⚡ Gemini Pro (Clásico)'
  },
  huggingface: {
    'microsoft/DialoGPT-medium': '💬 DialoGPT Medium (Conversacional)',
    'facebook/blenderbot-400M-distill': '🤖 BlenderBot (Distilled)',
    'microsoft/DialoGPT-large': '🚀 DialoGPT Large (Más potente)',
    'EleutherAI/gpt-neo-2.7B': '🧠 GPT-Neo 2.7B'
  },
  ollama: {
    'llama3.2:3b': '🦙 Llama 3.2 3B (Rápido)',
    'llama3.2:1b': '⚡ Llama 3.2 1B (Ultra rápido)',
    'codellama:7b': '💻 Code Llama 7B (Para código)',
    'mistral:7b': '🎯 Mistral 7B (Balanceado)',
    'phi3:mini': '🔥 Phi 3 Mini (Eficiente)'
  },
  groq: {
    'llama3-8b-8192': '🚀 Llama 3 8B (Ultra rápido)',
    'llama3-70b-8192': '💪 Llama 3 70B (Más potente)',
    'mixtral-8x7b-32768': '🎨 Mixtral 8x7B (Experto)',
    'gemma-7b-it': '💎 Gemma 7B (Google)'
  }
};

const API_LIMITS = {
  gemini: {
    freeLimit: '1,500 requests/día',
    rateLimit: '15 requests/minuto',
    needsApiKey: true,
    setup: 'https://makersuite.google.com/app/apikey',
    icon: '🏆'
  },
  huggingface: {
    freeLimit: '1,000 requests/mes aprox',
    rateLimit: 'Variable según modelo',
    needsApiKey: true,
    setup: 'https://huggingface.co/settings/tokens',
    icon: '🤗'
  },
  ollama: {
    freeLimit: 'Ilimitado (local)',
    rateLimit: 'Solo limitado por tu hardware',
    needsApiKey: false,
    setup: 'https://ollama.ai/download',
    icon: '🏠'
  },
  groq: {
    freeLimit: '6,000 tokens/minuto gratis',
    rateLimit: '30 requests/minuto',
    needsApiKey: true,
    setup: 'https://console.groq.com/keys',
    icon: '⚡'
  }
};

const DevAIAgent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [currentProject, setCurrentProject] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentAgent, setCurrentAgent] = useState('gemini-1.5-flash');
  const [currentProvider, setCurrentProvider] = useState('gemini');
  const [thinkingProcess, setThinkingProcess] = useState('');
  const [expandedThinking, setExpandedThinking] = useState({});
  const [showWelcome, setShowWelcome] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [apiStatus, setApiStatus] = useState({});
  const [ollamaModels, setOllamaModels] = useState([]);
  
  // Estados para el historial de conversaciones
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Cargar configuración guardada (usando state en memoria en lugar de localStorage)
  useEffect(() => {
    // Inicializar con valores por defecto ya que no podemos usar localStorage
    setConversations([]);
    setApiKey('');
    setCurrentProvider('gemini');
    setCurrentAgent('gemini-1.5-flash');
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Verificar estado de APIs al cargar
  useEffect(() => {
    checkApiStatus();
    checkOllamaModels();
  }, [apiKey, currentProvider]);

  const checkApiStatus = async () => {
    const status = {};
    
    // Verificar Ollama
    try {
      const response = await fetch('http://localhost:11434/api/tags', { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        status.ollama = { available: true, icon: '🟢' };
      } else {
        status.ollama = { available: false, icon: '🔴', error: 'No conectado' };
      }
    } catch (error) {
      status.ollama = { available: false, icon: '🔴', error: 'Ollama no está ejecutándose' };
    }
    
    // Verificar otros APIs (simulado, solo chequeamos si hay API key)
    status.gemini = { 
      available: !!apiKey && currentProvider === 'gemini', 
      icon: apiKey && currentProvider === 'gemini' ? '🟢' : '🟡',
      error: !apiKey ? 'API Key requerida' : null
    };
    
    status.groq = { 
      available: !!apiKey && currentProvider === 'groq', 
      icon: apiKey && currentProvider === 'groq' ? '🟢' : '🟡',
      error: !apiKey ? 'API Key requerida' : null
    };
    
    status.huggingface = { 
      available: !!apiKey && currentProvider === 'huggingface', 
      icon: apiKey && currentProvider === 'huggingface' ? '🟢' : '🟡',
      error: !apiKey ? 'API Key requerida' : null
    };
    
    setApiStatus(status);
  };

  const checkOllamaModels = async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        const data = await response.json();
        setOllamaModels(data.models || []);
      }
    } catch (error) {
      setOllamaModels([]);
    }
  };

  // Generar respuesta inteligente simulada cuando fallan las APIs
  const generateIntelligentResponse = (input) => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('react')) {
      return {
        content: `Aquí tienes algunas recomendaciones para React:

\`\`\`jsx
// Componente optimizado con hooks
import React, { useState, useCallback, useMemo } from 'react';

const OptimizedComponent = ({ data, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  
  // Memoizar cálculos costosos
  const processedData = useMemo(() => {
    return data.filter(item => item.active)
               .sort((a, b) => a.priority - b.priority);
  }, [data]);
  
  // Callback estable para evitar re-renders
  const handleClick = useCallback((id) => {
    setLoading(true);
    onUpdate(id).finally(() => setLoading(false));
  }, [onUpdate]);
  
  return (
    <div className="component">
      {processedData.map(item => (
        <div key={item.id} onClick={() => handleClick(item.id)}>
          {item.name} {loading && '⏳'}
        </div>
      ))}
    </div>
  );
};
\`\`\`

**Puntos clave:**
- ✅ Uso de useMemo para optimizar renders
- ✅ useCallback para callbacks estables  
- ✅ Estado local para loading
- ✅ Keys únicas en listas`
      };
    }
    
    if (lowerInput.includes('bug') || lowerInput.includes('error')) {
      return {
        content: `🐛 **Estrategia para encontrar bugs:**

**1. Debugging paso a paso:**
\`\`\`javascript
// Agregar logs estratégicos
console.log('🔍 Estado actual:', state);
console.log('📥 Props recibidos:', props);
console.log('⚡ Ejecutando función:', functionName);
\`\`\`

**2. Herramientas útiles:**
- React DevTools para inspeccionar componentes
- Console del navegador para errores JS
- Network tab para problemas de API
- Breakpoints en Sources

**3. Patrones comunes de bugs:**
- ❌ Dependencias faltantes en useEffect
- ❌ Mutación directa del estado
- ❌ Keys duplicadas en listas
- ❌ Async/await mal manejado

**4. Checklist de debugging:**
- [ ] ¿Los datos llegan correctamente? 
- [ ] ¿El estado se actualiza bien?
- [ ] ¿Hay errores en consola?
- [ ] ¿Los tipos de datos son correctos?`
      };
    }
    
    // Respuesta genérica
    return {
      content: `Te ayudo con tu consulta: "${input}"

**Análisis basado en tu pregunta:**

\`\`\`javascript
// Ejemplo de solución
const solution = {
  approach: "Analizar el problema paso a paso",
  implementation: "Aplicar mejores prácticas",
  testing: "Verificar que funcione correctamente"
};

// Implementación práctica
function handleSolution(problem) {
  try {
    const result = processInput(problem);
    return {
      success: true,
      data: result,
      message: "Problema resuelto ✅"
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      suggestion: "Revisar datos de entrada"
    };
  }
}
\`\`\`

**Recomendaciones:**
- 🔍 Revisar documentación oficial
- ✅ Aplicar patrones probados
- 🧪 Hacer testing incremental
- 📝 Documentar la solución

¿Te gustaría que profundice en algún aspecto específico?`
    };
  };

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

  // Guardar conversación actual (en memoria)
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
      return [conversationData, ...filtered].slice(0, 20);
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

  // ============================================
  // 🚀 FUNCIÓN PRINCIPAL PARA handleSendMessage
  // ============================================

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const currentInput = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowWelcome(false);

    // Preparar contexto del proyecto si existe
    let contextualMessages = [...messages, userMessage];
    
    if (currentProject && currentProject.files.length > 0) {
      const projectContext = `
CONTEXTO DEL PROYECTO:
- Nombre: ${currentProject.name}
- Archivos: ${currentProject.files.length}
- Tipos: ${[...new Set(currentProject.files.map(f => f.type))].join(', ')}

ARCHIVOS RELEVANTES (primeros 3):
${currentProject.files.slice(0, 3).map(file => 
  `📁 ${file.name} (${file.type})\n\`\`\`${file.type.replace('.', '')}\n${file.content.substring(0, 800)}${file.content.length > 800 ? '\n...[archivo truncado]' : ''}\n\`\`\``
).join('\n\n')}

CONSULTA: ${currentInput}
`;

      contextualMessages = [{
        role: 'user',
        content: projectContext
      }];
    }

    try {
      // Verificar si necesita API key
      const needsKey = API_LIMITS[currentProvider].needsApiKey;
      if (needsKey && !apiKey) {
        throw new Error(`API Key requerida para ${currentProvider}. Obtén una gratis en: ${API_LIMITS[currentProvider].setup}`);
      }

      // Simular proceso de pensamiento específico por proveedor
      const thinkingSteps = {
        gemini: [
          '🔗 Conectando con Google Gemini...',
          '🧠 Procesando con IA de Google...',
          '💡 Generando respuesta especializada...',
          '✨ Finalizando análisis...'
        ],
        ollama: [
          '🏠 Conectando con modelo local...',
          '⚡ Procesando en tu hardware...',
          '🔥 Ejecutando modelo localmente...',
          '✨ Respuesta lista...'
        ],
        huggingface: [
          '🤗 Conectando con HuggingFace...',
          '🧠 Procesando con modelo open-source...',
          '💡 Generando respuesta...',
          '✨ Finalizando...'
        ],
        groq: [
          '⚡ Conectando con Groq (ultra-rápido)...',
          '🚀 Procesando a máxima velocidad...',
          '💡 Generando respuesta...',
          '✨ Completado...'
        ]
      };

      const steps = thinkingSteps[currentProvider] || thinkingSteps.gemini;
      
      for (let i = 0; i < steps.length; i++) {
        setThinkingProcess(steps[i]);
        const delay = (currentProvider === 'ollama' || currentProvider === 'groq') ? 400 : 800;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Llamar a la API gratuita seleccionada
      const response = await callFreeAIAPI(contextualMessages, apiKey, currentProvider, currentAgent);

      const aiResponse = {
        role: 'assistant',
        content: response.content,
        agent: `${currentAgent} (${currentProvider.toUpperCase()})`,
        thinking: `Procesé tu consulta usando ${currentProvider.toUpperCase()} - API GRATUITA\n• Modelo: ${response.model}\n• Tokens: ${response.usage?.total_tokens || 'N/A'}\n• Límite: ${API_LIMITS[currentProvider].freeLimit}${currentProject ? `\n• Consideré el contexto de tu proyecto con ${currentProject.files.length} archivos` : ''}`,
        timestamp: new Date(),
        usage: response.usage,
        provider: currentProvider
      };

      setMessages(prev => [...prev, aiResponse]);
      
    } catch (error) {
      console.error('Error en API gratuita:', error);
      
      // Fallback inteligente: intentar otro proveedor gratuito
      let fallbackProvider = null;
      
      // Intentar Gemini si falló otro
      if (currentProvider !== 'gemini' && apiKey) {
        fallbackProvider = 'gemini';
      }
      // Intentar Ollama si está disponible (no necesita API key)
      else if (currentProvider !== 'ollama' && apiStatus.ollama?.available) {
        fallbackProvider = 'ollama';
      }

      if (fallbackProvider) {
        try {
          setThinkingProcess(`❌ Error en ${currentProvider}, intentando con ${fallbackProvider}...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const fallbackResponse = await callFreeAIAPI(contextualMessages, apiKey, fallbackProvider);
          
          const aiResponse = {
            role: 'assistant',
            content: `⚠️ **Fallback activado** (Error en ${currentProvider})\n\n` + fallbackResponse.content,
            agent: `${fallbackProvider.toUpperCase()} (Fallback)`,
            thinking: `Error en ${currentProvider}: ${error.message}\nUsé ${fallbackProvider} como alternativa.`,
            timestamp: new Date(),
            provider: fallbackProvider
          };

          setMessages(prev => [...prev, aiResponse]);
        } catch (fallbackError) {
          // Si todo falla, usar respuesta simulada inteligente
          const simulatedResponse = {
            role: 'assistant',
            content: `❌ **Error conectando APIs gratuitas**\n\n**Error principal**: ${error.message}\n**Error fallback**: ${fallbackError.message}\n\n*Usando respuesta simulada inteligente...*\n\n---\n\n` + 
                     generateIntelligentResponse(currentInput).content,
            agent: currentAgent + ' (Simulado)',
            thinking: `Errores múltiples en APIs:\n1. ${currentProvider}: ${error.message}\n2. ${fallbackProvider}: ${fallbackError.message}\nUsando respuesta simulada.`,
            timestamp: new Date()
          };

          setMessages(prev => [...prev, simulatedResponse]);
        }
      } else {
        // Respuesta simulada si no hay fallback disponible
        const simulatedResponse = {
          role: 'assistant',
          content: `❌ **Error en API**: ${error.message}\n\n*Ejecutando en modo simulado...*\n\n---\n\n` + 
                   generateIntelligentResponse(currentInput).content,
          agent: currentAgent + ' (Simulado)',
          thinking: `Error de API: ${error.message}\nUsando respuesta simulada como alternativa.`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, simulatedResponse]);
      }
    } finally {
      setThinkingProcess('');
      setIsLoading(false);
      setTimeout(saveConversation, 500);
    }
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
        content: `✅ **Proyecto "${projectName}" cargado**\n\n📁 ${projectFiles.length} archivos analizados\n📊 Tamaño total: ${Math.round(projectFiles.reduce((acc, f) => acc + f.size, 0) / 1024)} KB\n\n🧠 **Contexto disponible para IA:**\n${projectFiles.map(f => `• ${f.name} (${f.type})`).join('\n')}\n\n💡 *Ahora puedes hacer preguntas específicas sobre tu proyecto*`,
        agent: 'Sistema',
        timestamp: new Date()
      }]);

      setShowWelcome(false);
    } catch (error) {
      console.error('Error cargando archivos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const toggleThinking = (messageIndex) => {
    setExpandedThinking(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }));
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-80 bg-gray-800/95 backdrop-blur-xl border-r border-gray-700 transition-transform duration-300`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">💬 Conversaciones</h2>
          <button
            onClick={() => setShowSidebar(false)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <button
            onClick={startNewConversation}
            className="w-full flex items-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors mb-4"
          >
            <Plus className="w-4 h-4" />
            Nueva Conversación
          </button>
          
          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conv.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{conv.title}</h3>
                    <p className="text-sm text-gray-400 truncate">{conv.preview}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <MessageSquare className="w-3 h-3" />
                      {conv.messageCount} mensajes
                      <Clock className="w-3 h-3 ml-2" />
                      {conv.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="p-1 hover:bg-red-600 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">DevAI Agent</h1>
                <p className="text-sm text-gray-400">
                  {API_LIMITS[currentProvider].icon} {currentProvider.toUpperCase()} • {FREE_AI_MODELS[currentProvider][currentAgent]}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status indicators */}
            <div className="flex items-center gap-1">
              {Object.entries(apiStatus).map(([provider, status]) => (
                <div
                  key={provider}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded text-xs"
                  title={`${provider}: ${status.error || 'Disponible'}`}
                >
                  <span>{status.icon}</span>
                  <span className="capitalize">{provider}</span>
                </div>
              ))}
            </div>

            {currentProject && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-600/20 border border-green-500/30 rounded-lg">
                <FolderOpen className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-300">{currentProject.name}</span>
                <span className="text-xs text-green-400">({currentProject.files.length} archivos)</span>
              </div>
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors relative"
            >
              <Settings className="w-5 h-5" />
              {!apiKey && <span className="absolute top-0 right-0 w-3 h-3 bg-yellow-500 rounded-full"></span>}
            </button>
          </div>
        </header>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-b border-gray-700 bg-gray-800/30 p-4">
            <div className="max-w-4xl mx-auto space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                ⚙️ Configuración de APIs Gratuitas
              </h3>
              
              {/* Provider Selection */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(API_LIMITS).map(([provider, info]) => (
                  <button
                    key={provider}
                    onClick={() => setCurrentProvider(provider)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      currentProvider === provider
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">{info.icon}</div>
                      <div className="font-medium capitalize">{provider}</div>
                      <div className="text-xs text-gray-400 mt-1">{info.freeLimit}</div>
                      <div className="text-xs text-gray-500">{info.rateLimit}</div>
                      {apiStatus[provider] && (
                        <div className="mt-2 flex items-center justify-center gap-1">
                          <span className="text-lg">{apiStatus[provider].icon}</span>
                          {apiStatus[provider].error && (
                            <span className="text-xs text-red-400">{apiStatus[provider].error}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* API Key Input */}
              {API_LIMITS[currentProvider].needsApiKey && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    🔑 API Key de {currentProvider.toUpperCase()}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={`Ingresa tu API key de ${currentProvider}`}
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                    <a
                      href={API_LIMITS[currentProvider].setup}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Obtener Gratis
                    </a>
                  </div>
                  <p className="text-xs text-gray-400">
                    ✅ 100% Gratis • {API_LIMITS[currentProvider].freeLimit} • 
                    <a href={API_LIMITS[currentProvider].setup} className="text-blue-400 hover:underline ml-1">
                      Crear cuenta gratis
                    </a>
                  </p>
                </div>
              )}

              {/* Model Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  🤖 Modelo de {currentProvider.toUpperCase()}
                </label>
                <select
                  value={currentAgent}
                  onChange={(e) => setCurrentAgent(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  {Object.entries(FREE_AI_MODELS[currentProvider] || {}).map(([model, description]) => (
                    <option key={model} value={model}>
                      {description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ollama Models */}
              {currentProvider === 'ollama' && ollamaModels.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    🏠 Modelos Ollama Disponibles
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {ollamaModels.map(model => (
                      <button
                        key={model.name}
                        onClick={() => setCurrentAgent(model.name)}
                        className={`p-2 rounded text-xs transition-colors ${
                          currentAgent === model.name
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Welcome Screen */}
            {showWelcome && messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold mb-4">¡Bienvenido a DevAI Agent!</h2>
                <p className="text-xl text-gray-300 mb-8">Tu asistente gratuito de desarrollo con IA</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {Object.entries(API_LIMITS).map(([provider, info]) => (
                    <div key={provider} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="text-3xl mb-2">{info.icon}</div>
                      <h3 className="font-semibold capitalize">{provider}</h3>
                      <p className="text-sm text-gray-400">{info.freeLimit}</p>
                      <p className="text-xs text-gray-500 mt-1">{info.rateLimit}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Code className="w-5 h-5 text-blue-400" />
                      Análisis de Código
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>• Sube archivos de tu proyecto</li>
                      <li>• Encuentra bugs automáticamente</li>
                      <li>• Optimiza rendimiento</li>
                      <li>• Mejores prácticas</li>
                    </ul>
                  </div>

                  <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      100% Gratuito
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>• Sin límites de uso</li>
                      <li>• Múltiples modelos IA</li>
                      <li>• Respuestas instantáneas</li>
                      <li>• Sin suscripciones</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    Subir Proyecto
                  </button>
                  
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                    Configurar API
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message, index) => (
              <div key={index} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <Sparkles className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-gray-400">
                        {message.agent || currentAgent}
                      </span>
                      {message.timestamp && (
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className={`rounded-2xl px-6 py-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800/50 border border-gray-700'
                  }`}>
                    <div className="prose prose-invert max-w-none">
                      {message.content.split('```').map((part, i) => {
                        if (i % 2 === 1) {
                          const lines = part.split('\n');
                          const language = lines[0];
                          const code = lines.slice(1).join('\n');
                          return (
                            <div key={i} className="relative my-4">
                              <div className="flex items-center justify-between bg-gray-900 px-4 py-2 rounded-t-lg border border-gray-700">
                                <span className="text-sm text-gray-400">{language || 'code'}</span>
                                <button
                                  onClick={() => copyToClipboard(code)}
                                  className="text-gray-400 hover:text-white transition-colors"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                              <pre className="bg-gray-950 p-4 rounded-b-lg border-x border-b border-gray-700 overflow-x-auto">
                                <code className="text-sm">{code}</code>
                              </pre>
                            </div>
                          );
                        } else {
                          return (
                            <div key={i} className="whitespace-pre-wrap">
                              {part.split('\n').map((line, lineIndex) => {
                                if (line.startsWith('**') && line.endsWith('**')) {
                                  return <div key={lineIndex} className="font-bold my-2">{line.slice(2, -2)}</div>;
                                }
                                if (line.startsWith('- ') || line.startsWith('• ')) {
                                  return <div key={lineIndex} className="ml-4 my-1">{line}</div>;
                                }
                                if (line.startsWith('# ')) {
                                  return <h1 key={lineIndex} className="text-xl font-bold my-3">{line.slice(2)}</h1>;
                                }
                                if (line.startsWith('## ')) {
                                  return <h2 key={lineIndex} className="text-lg font-bold my-2">{line.slice(3)}</h2>;
                                }
                                return <div key={lineIndex}>{line}</div>;
                              })}
                            </div>
                          );
                        }
                      })}
                    </div>

                    {message.thinking && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <button
                          onClick={() => toggleThinking(index)}
                          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          <AlertCircle className="w-4 h-4" />
                          Proceso de análisis
                          <span className="text-xs">
                            {expandedThinking[index] ? '▼' : '▶'}
                          </span>
                        </button>
                        
                        {expandedThinking[index] && (
                          <div className="mt-2 p-3 bg-gray-900/50 rounded-lg text-sm text-gray-300 whitespace-pre-wrap">
                            {message.thinking}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-blue-600 order-1' : 'bg-gray-700 order-2'
                }`}>
                  {message.role === 'user' ? (
                    <span className="text-sm font-medium">Tu</span>
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </div>
              </div>
            ))}

            {/* Thinking Process */}
            {thinkingProcess && (
              <div className="flex gap-4 justify-start">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-3 h-3" />
                    </div>
                    <span className="text-sm text-gray-400">Procesando...</span>
                  </div>
                  
                  <div className="bg-gray-800/50 border border-gray-700 rounded-2xl px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <span className="text-gray-300">{thinkingProcess}</span>
                    </div>
                  </div>
                </div>
                
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-700 bg-gray-800/50 backdrop-blur-xl p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Subir archivos del proyecto"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                  
                  {currentProject && (
                    <button
                      onClick={() => setCurrentProject(null)}
                      className="px-3 py-1 bg-red-600/20 text-red-300 rounded-lg text-sm hover:bg-red-600/30 transition-colors"
                    >
                      Limpiar Proyecto
                    </button>
                  )}
                </div>
                
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={currentProject 
                    ? `Pregunta sobre tu proyecto "${currentProject.name}"...`
                    : "Haz una pregunta sobre desarrollo, sube archivos, o pide ayuda con código..."
                  }
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none resize-none min-h-[60px] max-h-32"
                  rows={2}
                />
              </div>
              
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Send className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <div className="flex items-center gap-4">
                <span>Presiona Enter para enviar, Shift+Enter para nueva línea</span>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>{API_LIMITS[currentProvider].icon} {currentProvider.toUpperCase()} listo</span>
                </div>
              </div>
              
              {apiKey && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span>API configurada</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".js,.jsx,.ts,.tsx,.py,.html,.css,.json,.md,.txt,.php,.java,.cpp,.c,.cs,.rb,.go,.rs,.swift,.kt,.dart,.vue,.svelte,.astro"
        onChange={handleFileUpload}
        className="hidden"
        webkitdirectory=""
      />
    </div>
  );