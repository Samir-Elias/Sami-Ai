import React, { useState, useRef, useEffect } from 'react';
import { Upload, Github, Send, Settings, FolderOpen, MessageSquare, Code, Trash2, Sparkles, Plus, Menu, X, AlertCircle, CheckCircle, Wifi, WifiOff, Copy, Clock, Zap, ChevronDown, ChevronUp, Eye, EyeOff, Maximize2, Minimize2, RotateCcw, Play, Square } from 'lucide-react';

// ============================================
// 🔑 CONFIGURACIÓN DE VARIABLES DE ENTORNO
// ============================================

const API_KEYS = {
  gemini: process.env.REACT_APP_GEMINI_API_KEY,
  huggingface: process.env.REACT_APP_HUGGINGFACE_API_KEY,
  groq: process.env.REACT_APP_GROQ_API_KEY,
  ollama: null // Ollama no necesita API key
};

const DEFAULT_PROVIDER = process.env.REACT_APP_DEFAULT_PROVIDER || 'gemini';
const DEFAULT_MODEL = process.env.REACT_APP_DEFAULT_MODEL || 'gemini-1.5-flash';

// Verificar que las API keys estén configuradas
const checkEnvKeys = () => {
  const missing = [];
  const available = [];
  
  Object.entries(API_KEYS).forEach(([provider, key]) => {
    if (provider !== 'ollama') {
      if (!key) {
        missing.push(provider.toUpperCase());
      } else {
        available.push(provider.toUpperCase());
      }
    }
  });
  
  console.log('🔑 API Keys Status:');
  console.log('✅ Available:', available.join(', '));
  if (missing.length > 0) {
    console.warn('❌ Missing:', missing.join(', '));
    console.warn('💡 Add these to your .env file:');
    missing.forEach(provider => {
      console.warn(`REACT_APP_${provider}_API_KEY=your_key_here`);
    });
  }
  
  return { missing, available };
};

// ============================================
// 🎨 LIVE CODE PREVIEW COMPONENT (CORREGIDO)
// ============================================

const LiveCodePreview = ({ codeBlocks, isVisible, onToggle, isMobile }) => {
  const [selectedBlock, setSelectedBlock] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef(null);

  // Filtrar bloques de código que se pueden previsualizar
  const previewableBlocks = codeBlocks.filter(block => 
    ['html', 'css', 'javascript', 'js', 'jsx', 'react', 'vue', 'svelte'].includes(block.language?.toLowerCase())
  );

  if (previewableBlocks.length === 0) return null;

  const currentBlock = previewableBlocks[selectedBlock] || previewableBlocks[0];

  // Generar HTML completo para previsualización
  const generatePreviewHTML = (block) => {
    const { language, code } = block;
    
    switch (language?.toLowerCase()) {
      case 'html':
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Preview</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
        }
        * { box-sizing: border-box; }
    </style>
</head>
<body>
    ${code}
</body>
</html>`;

      case 'css':
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSS Live Preview</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
        }
        ${code}
    </style>
</head>
<body>
    <div class="demo-container">
        <h1>CSS Preview</h1>
        <div class="sample-content">
            <p>Este es contenido de ejemplo para mostrar tus estilos CSS.</p>
            <button class="btn">Botón de Ejemplo</button>
            <div class="card">
                <h3>Tarjeta de Ejemplo</h3>
                <p>Contenido de la tarjeta para probar estilos.</p>
            </div>
        </div>
    </div>
</body>
</html>`;

      case 'javascript':
      case 'js':
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JavaScript Live Preview</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
        }
        .output { 
            background: white; 
            border: 2px solid #e2e8f0; 
            border-radius: 8px; 
            padding: 15px; 
            margin: 10px 0;
            min-height: 100px;
        }
        .controls {
            margin-bottom: 15px;
        }
        button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            margin-right: 8px;
        }
        button:hover { background: #2563eb; }
    </style>
</head>
<body>
    <h1>JavaScript Live Preview</h1>
    <div class="controls">
        <button onclick="runCode()">▶️ Ejecutar Código</button>
        <button onclick="clearOutput()">🗑️ Limpiar</button>
    </div>
    <div id="output" class="output">
        <p><em>Presiona "Ejecutar Código" para ver el resultado...</em></p>
    </div>
    
    <script>
        // Redirigir console.log al output
        const output = document.getElementById('output');
        const originalLog = console.log;
        
        console.log = function(...args) {
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            output.innerHTML += '<div style="margin:5px 0; padding:5px; background:#f1f5f9; border-radius:4px;">' + message + '</div>';
            originalLog.apply(console, args);
        };
        
        function clearOutput() {
            output.innerHTML = '<p><em>Output limpiado...</em></p>';
        }
        
        function runCode() {
            try {
                clearOutput();
                console.log('🚀 Ejecutando código...');
                ${code}
            } catch (error) {
                output.innerHTML += '<div style="color:red; margin:5px 0; padding:5px; background:#fef2f2; border:1px solid #fecaca; border-radius:4px;">❌ Error: ' + error.message + '</div>';
            }
        }
        
        // Auto-ejecutar código simple
        setTimeout(() => {
            try {
                ${code}
            } catch (e) {
                console.log('⚠️ Código requiere ejecución manual');
            }
        }, 500);
    </script>
</body>
</html>`;

      case 'jsx':
      case 'react':
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Live Preview</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
        }
        .react-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div id="root" class="react-container">
        <div style="text-align:center; padding:20px; color:#6b7280;">
            🔄 Cargando componente React...
        </div>
    </div>
    
    <script type="text/babel">
        const { useState, useEffect, useCallback, useMemo } = React;
        
        try {
            // Código del componente
            ${code}
            
            // Renderizar el componente
            const container = document.getElementById('root');
            const root = ReactDOM.createRoot(container);
            
            // Si el código exporta un componente por defecto, usarlo
            if (typeof App !== 'undefined') {
                root.render(<App />);
            } else if (typeof Component !== 'undefined') {
                root.render(<Component />);
            } else {
                // Intentar renderizar el último JSX válido
                root.render(
                    <div style={{textAlign: 'center', padding: '20px'}}>
                        <h3>🎯 Componente React Renderizado</h3>
                        <p>El código se ejecutó correctamente.</p>
                        <small>Tip: Exporta tu componente como 'App' o 'Component' para mejor preview.</small>
                    </div>
                );
            }
        } catch (error) {
            document.getElementById('root').innerHTML = 
                '<div class="error">❌ Error en el código React:<br><strong>' + 
                error.message + '</strong></div>';
        }
    </script>
</body>
</html>`;

      default:
        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Preview</title>
    <style>
        body { 
            font-family: 'Monaco', monospace;
            margin: 0;
            padding: 20px;
            background: #1e293b;
            color: #e2e8f0;
        }
        pre {
            background: #0f172a;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid #334155;
        }
        .header {
            background: #334155;
            color: #f1f5f9;
            padding: 10px 15px;
            border-radius: 6px 6px 0 0;
            margin-bottom: -1px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">📝 ${language?.toUpperCase() || 'CODE'} Preview</div>
    <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
</body>
</html>`;
    }
  };

  const refreshPreview = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (!isVisible) {
    return (
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
          transition: 'background 0.2s'
        }}
        title="Mostrar Live Preview"
      >
        <Eye style={{ width: '20px', height: '20px', color: 'white' }} />
      </button>
    );
  }

  const previewStyles = {
    container: {
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
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid #374151',
      backgroundColor: '#1f2937'
    },
    headerTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#f3f4f6'
    },
    controls: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    button: {
      padding: '8px',
      background: 'transparent',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      color: '#9ca3af',
      transition: 'background 0.2s, color 0.2s'
    },
    select: {
      fontSize: '12px',
      backgroundColor: '#374151',
      border: '1px solid #4b5563',
      borderRadius: '4px',
      padding: '4px 8px',
      color: '#f3f4f6',
      marginRight: '8px'
    },
    info: {
      padding: '8px 16px',
      backgroundColor: 'rgba(31, 41, 55, 0.5)',
      borderBottom: '1px solid #374151',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '12px'
    },
    iframe: {
      width: '100%',
      height: '100%',
      border: 'none',
      backgroundColor: 'white'
    }
  };

  return (
    <div style={previewStyles.container}>
      {/* Header del preview */}
      <div style={previewStyles.header}>
        <div style={previewStyles.headerTitle}>
          <Code style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
          <span>Live Preview</span>
          {previewableBlocks.length > 1 && (
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              ({selectedBlock + 1}/{previewableBlocks.length})
            </span>
          )}
        </div>
        
        <div style={previewStyles.controls}>
          {previewableBlocks.length > 1 && (
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(Number(e.target.value))}
              style={previewStyles.select}
            >
              {previewableBlocks.map((block, index) => (
                <option key={index} value={index}>
                  {block.language?.toUpperCase() || 'CODE'} {index + 1}
                </option>
              ))}
            </select>
          )}
          
          <button
            onClick={refreshPreview}
            style={previewStyles.button}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#374151'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            title="Refrescar preview"
          >
            <RotateCcw style={{ width: '16px', height: '16px' }} />
          </button>
          
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={previewStyles.button}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#374151'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            title={isFullscreen ? "Minimizar" : "Pantalla completa"}
          >
            {isFullscreen ? 
              <Minimize2 style={{ width: '16px', height: '16px' }} /> : 
              <Maximize2 style={{ width: '16px', height: '16px' }} />
            }
          </button>
          
          <button
            onClick={onToggle}
            style={previewStyles.button}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#374151'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            title="Ocultar preview"
          >
            <EyeOff style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>

      {/* Información del código */}
      <div style={previewStyles.info}>
        <span style={{ color: '#9ca3af' }}>
          🔧 {currentBlock.language?.toUpperCase() || 'CODE'}
        </span>
        <span style={{ color: '#6b7280' }}>
          {currentBlock.code.split('\n').length} líneas
        </span>
      </div>

      {/* Preview iframe */}
      <div style={{ flex: 1, backgroundColor: 'white' }}>
        <iframe
          key={`${selectedBlock}-${refreshKey}`}
          ref={iframeRef}
          srcDoc={generatePreviewHTML(currentBlock)}
          style={previewStyles.iframe}
          title="Live Code Preview"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
};

// ============================================
// 🆓 FUNCIONES DE APIS GRATUITAS (CORREGIDAS)
// ============================================

// 1. GOOGLE GEMINI API
const callGeminiAPI = async (messages, apiKey) => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
            text: "Eres un asistente experto en desarrollo de software. Cuando generes código, incluye ejemplos completos y funcionales. Para HTML, CSS y JavaScript, crea código que se pueda ejecutar directamente. Para React, usa componentes funcionales con hooks. Siempre explica el código generado."
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

// 2. GROQ API
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

// 3. HUGGING FACE API (Solo para desktop, no móvil)
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

// 4. OLLAMA LOCAL (Solo para desktop)
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

// Función principal multi-API
const callFreeAIAPI = async (messages, apiKey, provider = 'gemini', model = null, isMobile = false) => {
  const cleanMessages = messages.filter(msg => msg.role !== 'system');
  
  // En móvil solo permitir Gemini y Groq
  if (isMobile && provider !== 'gemini' && provider !== 'groq') {
    provider = 'gemini'; // Fallback a Gemini en móvil
  }

  switch (provider) {
    case 'gemini':
      return await callGeminiAPI(cleanMessages, apiKey);
    
    case 'groq':
      return await callGroqAPI(cleanMessages, apiKey, model || 'llama3-8b-8192');
    
    case 'huggingface':
      if (!isMobile) {
        return await callHuggingFaceAPI(cleanMessages, apiKey, model || 'microsoft/DialoGPT-medium');
      }
      throw new Error('HuggingFace no disponible en móvil');
    
    case 'ollama':
      if (!isMobile) {
        return await callOllamaAPI(cleanMessages, model || 'llama3.2:3b');
      }
      throw new Error('Ollama no disponible en móvil');
    
    default:
      throw new Error(`Proveedor no soportado: ${provider}`);
  }
};
// Función para renderizar contenido de mensajes
const renderMessageContent = (content) => {
  const parts = content.split(/(```[\s\S]*?```)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const lines = part.split('\n');
      const language = lines[0].replace('```', '').trim();
      const code = lines.slice(1, -1).join('\n');
      
      return (
        <div key={index} style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '16px',
          margin: '8px 0',
          fontFamily: 'Monaco, Consolas, monospace',
          fontSize: '14px',
          overflow: 'auto'
        }}>
          <div style={{
            color: '#94a3b8',
            fontSize: '12px',
            marginBottom: '8px'
          }}>
            {language || 'code'}
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>
            {code}
          </pre>
        </div>
      );
    }
    
    return (
      <div key={index} style={{ whiteSpace: 'pre-wrap' }}>
        {part}
      </div>
    );
  });
};

// ============================================
// 🔧 CONFIGURACIÓN SIMPLIFICADA
// ============================================

const FREE_AI_MODELS = {
  gemini: {
    'gemini-1.5-flash': '🏆 Gemini 1.5 Flash (Con Live Preview)',
    'gemini-1.5-pro': '💎 Gemini 1.5 Pro',
  },
  groq: {
    'llama3-8b-8192': '🚀 Llama 3 8B (Ultra rápido)',
    'llama3-70b-8192': '💪 Llama 3 70B (Más potente)'
  },
  huggingface: {
    'microsoft/DialoGPT-medium': '💬 DialoGPT Medium',
    'facebook/blenderbot-400M-distill': '🤖 BlenderBot',
  },
  ollama: {
    'llama3.2:3b': '🦙 Llama 3.2 3B',
    'llama3.2:1b': '⚡ Llama 3.2 1B',
    'codellama:7b': '💻 Code Llama 7B'
  }
};

const API_LIMITS = {
  gemini: {
    freeLimit: '1,500/día',
    rateLimit: '15/min',
    needsApiKey: true,
    setup: 'https://makersuite.google.com/app/apikey',
    icon: '🏆'
  },
  groq: {
    freeLimit: '6,000 tokens/min',
    rateLimit: '30/min',
    needsApiKey: true,
    setup: 'https://console.groq.com/keys',
    icon: '⚡'
  },
  huggingface: {
    freeLimit: '1,000/mes',
    rateLimit: 'Variable',
    needsApiKey: true,
    setup: 'https://huggingface.co/settings/tokens',
    icon: '🤗'
  },
  ollama: {
    freeLimit: 'Ilimitado',
    rateLimit: 'Hardware',
    needsApiKey: false,
    setup: 'https://ollama.ai/download',
    icon: '🏠'
  }
};

// ============================================
// 🎯 COMPONENTE PRINCIPAL
// ============================================

const DevAIAgent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setAPIKey] = useState(API_KEYS.gemini || '');
  const [currentProvider, setCurrentProvider] = useState('gemini');
  const [currentAgent, setCurrentAgent] = useState('gemini-1.5-flash');
  const [showSettings, setShowSettings] = useState(false);
  const [thinkingProcess, setThinkingProcess] = useState('');
  
  // Estados para Live Preview
  const [showPreview, setShowPreview] = useState(false);
  const [liveCodeBlocks, setLiveCodeBlocks] = useState([]);
  
  // Estados móviles
  const [isMobile, setIsMobile] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showMobileKeyboard, setShowMobileKeyboard] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [apiStatus, setApiStatus] = useState({
    gemini: { icon: '🏆', error: null },
    ollama: { icon: '🏠', error: null },
    huggingface: { icon: '🤗', error: null },
    groq: { icon: '⚡', error: null }
  });
  const [expandedThinking, setExpandedThinking] = useState({});

  // Detectar móvil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-cambiar API key cuando cambia el proveedor
  useEffect(() => {
    const newApiKey = API_KEYS[currentProvider] || '';
    setAPIKey(newApiKey);
    
    // Cambiar al primer modelo disponible del proveedor
    const availableModels = FREE_AI_MODELS[currentProvider];
    if (availableModels) {
      const firstModel = Object.keys(availableModels)[0];
      setCurrentAgent(firstModel);
    }
  }, [currentProvider]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Extraer bloques de código de los mensajes
  useEffect(() => {
    const allCodeBlocks = [];
    messages.forEach(message => {
      if (message.role === 'assistant') {
        const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        while ((match = codeRegex.exec(message.content)) !== null) {
          const language = match[1] || 'text';
          const code = match[2].trim();
          if (code.length > 10) { // Solo código significativo
            allCodeBlocks.push({ language, code });
          }
        }
      }
    });
    setLiveCodeBlocks(allCodeBlocks);
    
    // Auto-mostrar preview si hay código previsualizable
    const hasPreviewableCode = allCodeBlocks.some(block => 
      ['html', 'css', 'javascript', 'js', 'jsx', 'react', 'vue', 'svelte'].includes(block.language?.toLowerCase())
    );
    if (hasPreviewableCode && !showPreview && !isMobile) {
      setShowPreview(true);
    }
  }, [messages, showPreview, isMobile]);

  // Verificar status de APIs
  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    const status = {};
    
    // Solo verificar APIs disponibles en el dispositivo actual
    const apisToCheck = isMobile ? ['gemini', 'groq'] : ['gemini', 'groq', 'huggingface', 'ollama'];
    
    for (const provider of apisToCheck) {
      if (provider === 'ollama' && !isMobile) {
        try {
          const response = await fetch('http://localhost:11434/api/tags', { 
            method: 'GET',
            signal: AbortSignal.timeout(3000)
          });
          status.ollama = { 
            available: response.ok, 
            icon: response.ok ? '🟢' : '🔴', 
            error: response.ok ? null : 'No conectado' 
          };
        } catch {
          status.ollama = { available: false, icon: '🔴', error: 'No ejecutándose' };
        }
      } else if (API_KEYS[provider]) {
        status[provider] = { available: true, icon: '🟢', error: null };
      } else {
        status[provider] = { available: false, icon: '🟡', error: 'Sin API Key' };
      }
    }
    
    setApiStatus(status);
  };

  // Generar respuesta inteligente simulada
  const generateIntelligentResponse = (input) => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('react') || lowerInput.includes('componente')) {
      return {
        content: `Te ayudo a crear un componente React funcional:

\`\`\`jsx
import React, { useState, useEffect } from 'react';

const InteractiveCard = () => {
  const [count, setCount] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setCount(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  return (
    <div style={{
      maxWidth: '400px',
      margin: '20px auto',
      padding: '30px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '20px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      color: 'white',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>
        🚀 Componente Interactivo
      </h2>
      
      <div style={{
        fontSize: '48px',
        fontWeight: 'bold',
        margin: '20px 0',
        color: isActive ? '#4ade80' : '#fbbf24'
      }}>
        {count}
      </div>
      
      <button
        onClick={() => setIsActive(!isActive)}
        style={{
          background: isActive ? '#ef4444' : '#10b981',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '25px',
          fontSize: '16px',
          cursor: 'pointer',
          marginRight: '10px',
          transition: 'all 0.3s ease'
        }}
      >
        {isActive ? '⏸️ Pausar' : '▶️ Iniciar'}
      </button>
      
      <button
        onClick={() => setCount(0)}
        style={{
          background: '#6366f1',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '25px',
          fontSize: '16px',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      >
        🔄 Reset
      </button>
      
      <p style={{ 
        marginTop: '20px', 
        opacity: 0.9, 
        fontSize: '14px' 
      }}>
        Estado: {isActive ? '🟢 Activo' : '🟡 Pausado'}
      </p>
    </div>
  );
};

// Exportar el componente para el live preview
const App = InteractiveCard;
export default App;
\`\`\`

**✨ Características del componente:**

- 🎯 **useState**: Maneja el contador y estado activo
- ⏰ **useEffect**: Controla el intervalo automático
- 🎨 **Estilos inline**: Gradientes y animaciones CSS
- 🔄 **Interactividad**: Botones para controlar el contador
- 📱 **Responsive**: Se adapta a diferentes tamaños

¡Puedes ver el resultado en tiempo real en el panel de Live Preview! 👉`
      };
    }
    
    if (lowerInput.includes('html') || lowerInput.includes('página')) {
      return {
        content: `Te creo una página HTML moderna con animaciones:

\`\`\`html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Página Moderna con Animaciones</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
            max-width: 500px;
            text-align: center;
            animation: slideUp 0.8s ease-out;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 2.5em;
            animation: fadeIn 1s ease-out 0.3s both;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .feature-card {
            background: linear-gradient(45deg, #4f46e5, #7c3aed);
            color: white;
            padding: 20px;
            margin: 15px 0;
            border-radius: 15px;
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .btn {
            background: linear-gradient(45deg, #10b981, #059669);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            margin: 10px 5px;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4);
        }

        .animation-demo {
            width: 50px;
            height: 50px;
            background: linear-gradient(45deg, #f59e0b, #d97706);
            border-radius: 50%;
            margin: 20px auto;
            animation: bounce 2s infinite;
        }

        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
                transform: translateY(0);
            }
            40% {
                transform: translateY(-30px);
            }
            60% {
                transform: translateY(-15px);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 Página Moderna</h1>
        
        <div class="feature-card">
            <h3>✨ Diseño Responsivo</h3>
            <p>Adaptable a cualquier dispositivo</p>
        </div>
        
        <div class="feature-card">
            <h3>🚀 Animaciones Fluidas</h3>
            <p>Transiciones suaves y elegantes</p>
        </div>
        
        <div class="feature-card">
            <h3>💎 Efectos Modernos</h3>
            <p>Glassmorphism y gradientes</p>
        </div>
        
        <div class="animation-demo"></div>
        
        <button class="btn">¡Prueba las Animaciones!</button>
        <button class="btn">Más Información</button>
    </div>

    <script>
        // Agregar interactividad
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', function() {
                this.innerHTML = '✅ ¡Clickeado!';
                setTimeout(() => {
                    this.innerHTML = this.innerHTML.includes('Prueba') ? '¡Prueba las Animaciones!' : 'Más Información';
                }, 1500);
            });
        });
    </script>
</body>
</html>\`\`\`

**✨ Características de la página:**

- 🎨 **Glassmorphism**: Efectos de vidrio esmerilado
- 🌈 **Gradientes**: Colores vibrantes y modernos  
- ⚡ **Animaciones CSS**: Transiciones suaves
- 📱 **Responsive**: Se adapta a móviles
- 🎯 **Interactividad**: JavaScript para eventos

¡Mira el resultado en tiempo real en el Live Preview! 👀`
      };
    }
    
    // Respuesta genérica mejorada
    return {
      content: `Te ayudo con tu consulta sobre: **"${input}"**

## 🧠 Análisis de tu pregunta

\`\`\`javascript
const solution = {
  query: "${input}",
  analysis: "Procesando solicitud...",
  approach: "Método paso a paso",
  
  generateResponse() {
    console.log('🔍 Analizando:', this.query);
    
    const keywords = this.query.toLowerCase().split(' ');
    const context = this.detectContext(keywords);
    
    return {
      recommendation: this.getRecommendation(context),
      example: this.generateExample(context),
      resources: this.getResources(context)
    };
  }
};

// Ejecutar análisis
const result = solution.generateResponse();
console.log('✅ Recomendación:', result.recommendation);
\`\`\`

## 🎯 Recomendaciones específicas:

**Paso 1: Análisis**
- 🔍 Identifica los componentes clave del problema
- 📋 Lista los requisitos específicos
- 🎯 Define el resultado esperado

**Paso 2: Implementación**
- ⚡ Comienza con la solución más simple
- 🧪 Prueba cada parte por separado
- 📈 Itera y mejora gradualmente

¿Te gustaría que profundice en algún aspecto específico de tu consulta?`
    };
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setShowWelcome(true);
    setShowSidebar(false);
  };

  const loadConversation = (conversation) => {
    setMessages(conversation.messages || []);
    setCurrentConversationId(conversation.id);
    setShowWelcome(false);
    setShowSidebar(false);
  };

  const deleteConversation = (id, e) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (currentConversationId === id) {
      startNewConversation();
    }
  };

  const saveConversation = () => {
    if (messages.length > 0) {
      const conversation = {
        id: currentConversationId || Date.now(),
        title: messages[0]?.content?.substring(0, 50) + '...' || 'Nueva conversación',
        preview: messages[messages.length - 1]?.content?.substring(0, 100) + '...' || '',
        messages: messages,
        messageCount: messages.length,
        createdAt: new Date()
      };
      
      setConversations(prev => {
        const existing = prev.find(conv => conv.id === conversation.id);
        if (existing) {
          return prev.map(conv => conv.id === conversation.id ? conversation : conv);
        }
        return [conversation, ...prev];
      });
      
      setCurrentConversationId(conversation.id);
    }
  };

  // Función principal para handleSendMessage
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const currentInput = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowWelcome(false);
    setShowMobileKeyboard(false);

    // Preparar contexto del proyecto si existe
    let contextualMessages = [...messages, userMessage];
    
    if (currentProject && currentProject.files.length > 0) {
      const projectContext = `
CONTEXTO DEL PROYECTO:
- Nombre: ${currentProject.name}
- Archivos: ${currentProject.files.length}
- Tipos: ${[...new Set(currentProject.files.map(f => f.type))].join(', ')}

ARCHIVOS RELEVANTES (primeros 2):
${currentProject.files.slice(0, 2).map(file => 
  `📁 ${file.name} (${file.type})\n\`\`\`${file.type.replace('.', '')}\n${file.content.substring(0, 500)}${file.content.length > 500 ? '\n...[truncado]' : ''}\n\`\`\``
).join('\n\n')}

CONSULTA: ${currentInput}
`;

      contextualMessages = [{
        role: 'user',
        content: projectContext
      }];
    }

    try {
      const needsKey = API_LIMITS[currentProvider].needsApiKey;
      const currentApiKey = API_KEYS[currentProvider];
      
      if (needsKey && !currentApiKey) {
        throw new Error(`⚠️ API Key no configurada para ${currentProvider.toUpperCase()}

📝 **Pasos para configurar:**
1. Crea un archivo .env en la raíz de tu proyecto
2. Agrega: REACT_APP_${currentProvider.toUpperCase()}_API_KEY=tu_key_aqui
3. Obtén tu API key gratis en: ${API_LIMITS[currentProvider].setup}
4. Reinicia el servidor (npm start)

💡 **O cambia a un proveedor ya configurado en Configuración`);
      }

      // Simular proceso de pensamiento
      const thinkingSteps = {
        gemini: ['🔗 Conectando con Gemini...', '🧠 Procesando consulta...', '✨ Generando respuesta...'],
        ollama: ['🏠 Conectando localmente...', '⚡ Procesando con Ollama...', '✨ Respuesta lista...'],
        huggingface: ['🤗 Conectando con HF...', '💡 Procesando modelo...', '✨ Completado...'],
        groq: ['⚡ Conectando con Groq...', '🚀 Procesamiento ultra-rápido...', '✨ Listo...']
      };

      const steps = thinkingSteps[currentProvider] || thinkingSteps.gemini;
      
      for (let i = 0; i < steps.length; i++) {
        setThinkingProcess(steps[i]);
        const delay = isMobile ? 400 : 800;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Intentar llamar a la API real
      let response;
      try {
        response = await callFreeAIAPI(contextualMessages, apiKey, currentProvider, currentAgent, isMobile);
      } catch (apiError) {
        console.warn('API falló, usando respuesta inteligente simulada:', apiError.message);
        response = generateIntelligentResponse(currentInput);
      }

      const aiResponse = {
        role: 'assistant',
        content: response.content,
        agent: `${currentProvider.toUpperCase()}`,
        thinking: `Procesé tu consulta usando ${currentProvider.toUpperCase()}\n• Modelo: ${response.model || currentAgent}\n• Tokens: ${response.usage?.total_tokens || 'N/A'}${currentProject ? `\n• Consideré el contexto de ${currentProject.files.length} archivos` : ''}\n• Estado: ${response.model ? 'API Real' : 'Simulado'}`,
        timestamp: new Date(),
        usage: response.usage,
        provider: currentProvider
      };

      setMessages(prev => [...prev, aiResponse]);
      
    } catch (error) {
      console.error('Error general:', error);
      
      // Fallback con respuesta inteligente
      const simulatedResponse = {
        role: 'assistant',
        content: `❌ **Error**: ${error.message}\n\n---\n\n*Generando respuesta inteligente...*\n\n` + 
                 generateIntelligentResponse(currentInput).content,
        agent: currentAgent + ' (Simulado)',
        thinking: `Error: ${error.message}\nUsando respuesta simulada inteligente.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, simulatedResponse]);
    } finally {
      setThinkingProcess('');
      setIsLoading(false);
      setTimeout(saveConversation, 500);
    }
  };

  // Resto de funciones auxiliares
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

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ **Proyecto cargado exitosamente**\n\n📁 **${projectName}**\n📊 ${projectFiles.length} archivos procesados\n💾 ${Math.round(projectFiles.reduce((acc, f) => acc + f.size, 0) / 1024)} KB total\n\n🧠 **Contexto disponible para consultas:**\n${projectFiles.map(f => `• ${f.name} (${f.type})`).join('\n')}\n\n💡 *Ahora puedes preguntarme sobre tu código, encontrar bugs, pedir optimizaciones, etc.*`,
        agent: 'Sistema',
        timestamp: new Date()
      }]);

      setShowWelcome(false);
    } catch (error) {
      console.error('Error cargando archivos:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ **Error cargando proyecto**: ${error.message}\n\n💡 **Sugerencias:**\n- Asegúrate de que los archivos sean de texto\n- Verifica que no excedan 2MB por archivo\n- Intenta con menos archivos si es un proyecto grande`,
        agent: 'Sistema',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Podrías agregar un toast notification aquí
      console.log('Texto copiado al portapapeles');
    }).catch(err => {
      console.error('Error copiando texto:', err);
    });
  };

  const toggleThinking = (messageIndex) => {
    setExpandedThinking(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }));
  };

  // Obtener solo las APIs disponibles según el dispositivo
  const getAvailableProviders = () => {
    return isMobile 
      ? { gemini: API_LIMITS.gemini, groq: API_LIMITS.groq }
      : API_LIMITS;
  };

  const getAvailableModels = () => {
    return isMobile && (currentProvider === 'huggingface' || currentProvider === 'ollama')
      ? {}
      : FREE_AI_MODELS[currentProvider] || {};
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 50%, #7c3aed 100%)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Header móvil optimizado */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', flex: 1, minWidth: 0 }}>
          <button
            onClick={() => setShowSidebar(true)}
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
            <Menu style={{ width: isMobile ? '16px' : '20px', height: isMobile ? '16px' : '20px' }} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
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
              <Sparkles style={{ width: isMobile ? '12px' : '16px', height: isMobile ? '12px' : '16px' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ 
                fontSize: isMobile ? '14px' : '18px', 
                fontWeight: 'bold',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>DevAI Agent</h1>
              {!isMobile && (
                <p style={{ 
                  fontSize: '12px', 
                  color: '#9ca3af',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {API_LIMITS[currentProvider].icon} {currentProvider.toUpperCase()} • Live Preview
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px', flexShrink: 0 }}>
          {/* Live Preview Toggle */}
          {liveCodeBlocks.length > 0 && !isMobile && (
            <button
              onClick={() => setShowPreview(!showPreview)}
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
              {showPreview ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
            </button>
          )}

          {/* Status indicators - solo en desktop */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
          )}

          {/* Project indicator */}
          {currentProject && (
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
              <FolderOpen style={{ width: '12px', height: '12px', color: '#86efac', flexShrink: 0 }} />
              <span style={{
                fontSize: isMobile ? '12px' : '14px',
                color: '#bbf7d0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {isMobile ? `${currentProject.files.length}` : currentProject.name}
              </span>
            </div>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
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
          >
            <Settings style={{ width: isMobile ? '16px' : '20px', height: isMobile ? '16px' : '20px' }} />
            {!apiKey && (
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
        </div>
      </header>

      {/* Live Code Preview Component */}
      {!isMobile && (
        <LiveCodePreview 
          codeBlocks={liveCodeBlocks}
          isVisible={showPreview}
          onToggle={() => setShowPreview(!showPreview)}
          isMobile={isMobile}
        />
      )}

      {/* Main content area */}
      <div style={{
        flex: 1,
        marginRight: showPreview && !isMobile ? '50%' : 0,
        transition: 'margin-right 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Sidebar móvil optimizado */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: isMobile ? '100%' : '320px',
          backgroundColor: 'rgba(31, 41, 55, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRight: '1px solid rgba(55, 65, 81, 0.5)',
          transform: showSidebar ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          zIndex: 50
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: '1px solid rgba(55, 65, 81, 0.5)'
          }}>
            <h2 style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 'bold', margin: 0 }}>
              💬 Conversaciones
            </h2>
            <button
              onClick={() => setShowSidebar(false)}
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
          
          <div style={{ padding: '16px', height: 'calc(100% - 73px)', overflowY: 'auto' }}>
            <button
              onClick={startNewConversation}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                transition: 'background 0.2s',
                marginBottom: '16px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
            >
              <Plus style={{ width: '16px', height: '16px' }} />
              Nueva Conversación
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    backgroundColor: currentConversationId === conv.id ? '#2563eb' : 'rgba(55, 65, 81, 0.5)'
                  }}
                  onMouseEnter={(e) => currentConversationId !== conv.id && (e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.8)')}
                  onMouseLeave={(e) => currentConversationId !== conv.id && (e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.5)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ 
                        fontWeight: '500',
                        fontSize: '14px',
                        margin: '0 0 4px 0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{conv.title}</h3>
                      <p style={{ 
                        fontSize: '12px',
                        color: '#9ca3af',
                        margin: '0 0 4px 0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{conv.preview}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#6b7280' }}>
                        <MessageSquare style={{ width: '12px', height: '12px' }} />
                        {conv.messageCount}
                        <Clock style={{ width: '12px', height: '12px', marginLeft: '4px' }} />
                        {conv.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      style={{
                        padding: '4px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#ef4444',
                        transition: 'background 0.2s',
                        marginLeft: '8px'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <Trash2 style={{ width: '16px', height: '16px' }} />
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
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 40
            }}
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Settings Panel móvil optimizado */}
        {showSettings && (
          <div style={{
            borderBottom: '1px solid rgba(55, 65, 81, 0.5)',
            backgroundColor: 'rgba(31, 41, 55, 0.95)',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ padding: '16px', maxHeight: '320px', overflowY: 'auto' }}>
              <h3 style={{ 
                fontSize: isMobile ? '18px' : '20px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}>
                ⚙️ Configuración
              </h3>
              
              {/* Provider Selection móvil */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
                gap: '12px',
                marginBottom: '16px'
              }}>
                {Object.entries(getAvailableProviders()).map(([provider, info]) => (
                  <button
                    key={provider}
                    onClick={() => setCurrentProvider(provider)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${currentProvider === provider ? '#2563eb' : '#4b5563'}`,
                      backgroundColor: currentProvider === provider ? 'rgba(37, 99, 235, 0.2)' : 'rgba(55, 65, 81, 0.5)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: isMobile ? '20px' : '24px', marginBottom: '4px' }}>{info.icon}</div>
                      <div style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: '500', textTransform: 'capitalize' }}>{provider}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{info.freeLimit}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* API Key Input móvil */}
              {API_LIMITS[currentProvider].needsApiKey && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    🔑 API Key de {currentProvider.toUpperCase()}
                  </label>
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }}>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setAPIKey(e.target.value)}
                      placeholder={`Ingresa tu API key`}
                      style={{
                        flex: isMobile ? 'none' : 1,
                        width: isMobile ? '100%' : 'auto',
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
                    />
                    <a
                      href={API_LIMITS[currentProvider].setup}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#2563eb',
                        borderRadius: '8px',
                        color: 'white',
                        textDecoration: 'none',
                        fontSize: '14px',
                        textAlign: 'center',
                        transition: 'background 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
                    >
                      Obtener Gratis
                    </a>
                  </div>
                </div>
              )}

              {/* Model Selection móvil */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  🤖 Modelo
                </label>
                <select
                  value={currentAgent}
                  onChange={(e) => setCurrentAgent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(55, 65, 81, 0.5)',
                    border: '1px solid #4b5563',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                  onBlur={(e) => e.target.style.borderColor = '#4b5563'}
                >
                  {Object.entries(getAvailableModels()).map(([model, description]) => (
                    <option key={model} value={model} style={{ backgroundColor: '#1f2937' }}>
                      {isMobile ? description.split(' ').slice(0, 2).join(' ') : description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Preview Info */}
              {liveCodeBlocks.length > 0 && !isMobile && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: 'rgba(37, 99, 235, 0.2)',
                  border: '1px solid rgba(37, 99, 235, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <Eye style={{ width: '16px', height: '16px', color: '#60a5fa' }} />
                    <span style={{ color: '#93bbfc' }}>
                      {liveCodeBlocks.length} bloques de código detectados
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#93bbfc', marginTop: '4px', margin: '4px 0 0 0' }}>
                    Usa el botón Live Preview para ver el código en acción
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Messages área optimizada para móvil */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '8px' : '16px',
          paddingBottom: showMobileKeyboard ? 0 : undefined
        }}>
          <div style={{
            maxWidth: isMobile ? '100%' : '896px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Welcome Screen móvil */}
            {showWelcome && messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: isMobile ? '32px 0' : '48px 0' }}>
                <div style={{
                  width: isMobile ? '64px' : '80px',
                  height: isMobile ? '64px' : '80px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <Sparkles style={{ width: isMobile ? '32px' : '40px', height: isMobile ? '32px' : '40px' }} />
                </div>
                <h2 style={{ fontSize: isMobile ? '20px' : '28px', fontWeight: 'bold', marginBottom: '8px' }}>
                  ¡DevAI con Live Preview!
                </h2>
                <p style={{ fontSize: isMobile ? '14px' : '20px', color: '#d1d5db', marginBottom: '24px' }}>
                  Código interactivo en tiempo real
                </p>
                
                {!isMobile && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    marginBottom: '24px',
                    maxWidth: '600px',
                    margin: '0 auto 24px'
                  }}>
                    <div style={{
                      backgroundColor: 'rgba(31, 41, 55, 0.5)',
                      borderRadius: '8px',
                      padding: '16px',
                      border: '1px solid rgba(55, 65, 81, 0.5)'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏆</div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>Gemini API</h3>
                      <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>1,500/día gratis</p>
                    </div>
                    <div style={{
                      backgroundColor: 'rgba(31, 41, 55, 0.5)',
                      borderRadius: '8px',
                      padding: '16px',
                      border: '1px solid rgba(55, 65, 81, 0.5)'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>👁️</div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>Live Preview</h3>
                      <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>HTML, CSS, JS, React</p>
                    </div>
                    <div style={{
                      backgroundColor: 'rgba(31, 41, 55, 0.5)',
                      borderRadius: '8px',
                      padding: '16px',
                      border: '1px solid rgba(55, 65, 81, 0.5)'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>📱</div>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>Móvil Optimizado</h3>
                      <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Funciona en cualquier dispositivo</p>
                    </div>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: '12px',
                  justifyContent: 'center',
                  marginTop: '24px'
                }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      backgroundColor: '#2563eb',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      width: isMobile ? '100%' : 'auto'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
                  >
                    <Upload style={{ width: '16px', height: '16px' }} />
                    Subir Proyecto
                  </button>
                  
                  <button
                    onClick={() => setShowSettings(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      backgroundColor: 'rgba(55, 65, 81, 0.5)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      width: isMobile ? '100%' : 'auto'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.8)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'}
                  >
                    <Settings style={{ width: '16px', height: '16px' }} />
                    Configurar API
                  </button>
                </div>
              </div>
            )}

            {/* Messages móvil optimizado */}
            {messages.map((message, index) => (
              <div key={index} style={{
                display: 'flex',
                gap: '8px',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  maxWidth: isMobile ? '85%' : '768px',
                  order: message.role === 'user' ? 2 : 1
                }}>
                  {message.role === 'assistant' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
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
                        {message.agent || currentAgent}
                      </span>
                      {message.timestamp && !isMobile && (
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div style={{
                    borderRadius: '16px',
                    padding: '12px 16px',
                    backgroundColor: message.role === 'user' ? '#2563eb' : 'rgba(31, 41, 55, 0.5)',
                    border: message.role === 'user' ? 'none' : '1px solid rgba(55, 65, 81, 0.5)',
                    wordBreak: 'break-word'
                  }}>
                    <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                      {renderMessageContent(message.content)}
                    </div>

                    {message.thinking && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(55, 65, 81, 0.5)' }}>
                        <button
                          onClick={() => toggleThinking(index)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'none',
                            border: 'none',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: 0,
                            transition: 'color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.color = '#d1d5db'}
                          onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
                        >
                          <AlertCircle style={{ width: '12px', height: '12px' }} />
                          Proceso de análisis
                          {expandedThinking[index] ? 
                            <ChevronUp style={{ width: '12px', height: '12px' }} /> : 
                            <ChevronDown style={{ width: '12px', height: '12px' }} />
                          }
                        </button>
                        
                        {expandedThinking[index] && (
                          <div style={{
                            marginTop: '8px',
                            padding: '12px',
                            backgroundColor: 'rgba(17, 24, 39, 0.5)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#d1d5db',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {message.thinking}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backgroundColor: message.role === 'user' ? '#2563eb' : 'rgba(55, 65, 81, 0.5)',
                  order: message.role === 'user' ? 1 : 2
                }}>
                  {message.role === 'user' ? (
                    <span style={{ fontSize: '11px', fontWeight: '500' }}>Tu</span>
                  ) : (
                    <Sparkles style={{ width: '12px', height: '12px' }} />
                  )}
                </div>
              </div>
            ))}

            {/* Thinking Process móvil */}
            {thinkingProcess && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}>
                <div style={{ maxWidth: isMobile ? '85%' : '768px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
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
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>Procesando...</span>
                  </div>
                  
                  <div style={{
                    backgroundColor: 'rgba(31, 41, 55, 0.5)',
                    border: '1px solid rgba(55, 65, 81, 0.5)',
                    borderRadius: '16px',
                    padding: '12px 16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #3b82f6',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      <span style={{ color: '#d1d5db', fontSize: '14px' }}>{thinkingProcess}</span>
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
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

       {/* Input */}
<div style={{
  borderTop: '1px solid #374151',
  backgroundColor: 'rgba(31, 41, 55, 0.5)',
  backdropFilter: 'blur(12px)',
  padding: '16px'
}}>
  <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
    <div style={{ display: 'flex', gap: '16px', alignItems: 'end' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '8px',
              backgroundColor: 'rgba(55, 65, 81, 0.5)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#374151'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'}
            title="Subir archivos del proyecto"
          >
            <Upload style={{ width: '20px', height: '20px' }} />
          </button>
          
          {currentProject && (
            <button
              onClick={() => setCurrentProject(null)}
              style={{
                padding: '4px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
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
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: '#374151',
            border: '1px solid #4b5563',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            outline: 'none',
            resize: 'none',
            minHeight: '60px',
            maxHeight: '128px',
            fontFamily: 'inherit'
          }}
          onFocus={(e) => e.target.style.borderColor = '#2563eb'}
          onBlur={(e) => e.target.style.borderColor = '#4b5563'}
          rows={2}
        />
      </div>
      
      <button
        onClick={handleSendMessage}
        disabled={isLoading || !input.trim()}
        style={{
          padding: '12px',
          backgroundColor: isLoading || !input.trim() ? '#4b5563' : '#2563eb',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          if (!isLoading && input.trim()) {
            e.target.style.backgroundColor = '#1d4ed8';
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading && input.trim()) {
            e.target.style.backgroundColor = '#2563eb';
          }
        }}
      >
        <Send style={{ 
          width: '20px', 
          height: '20px',
          transform: isLoading ? 'scale(0.9)' : 'scale(1)',
          transition: 'transform 0.2s'
        }} />
      </button>
    </div>
    
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '8px',
      fontSize: '12px',
      color: '#9ca3af'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span>Presiona Enter para enviar, Shift+Enter para nueva línea</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#10b981',
            borderRadius: '50%'
          }}></span>
          <span>{API_LIMITS[currentProvider]?.icon} {currentProvider.toUpperCase()} listo</span>
        </div>
      </div>
      
      {apiKey && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle style={{ width: '12px', height: '12px', color: '#10b981' }} />
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
  style={{ display: 'none' }}
  webkitdirectory=""
/>
</div>
);
};

export default DevAIAgent;{/* Input Area - Sticky y responsive */}
<div style={{
  position: 'sticky',
  bottom: 0,
  left: 0,
  right: 0,
  borderTop: '1px solid #374151',
  backgroundColor: 'rgba(31, 41, 55, 0.95)',
  backdropFilter: 'blur(12px)', 
  padding: isMobile ? '12px' : '16px',
  zIndex: 30,
  transform: showSettings ? 'translateY(100%)' : 'translateY(0)',
  transition: 'transform 0.3s ease',
  boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)'
}}>
  <div style={{ 
    maxWidth: showPreview && !isMobile ? '50%' : '100%', 
    margin: '0 auto',
    transition: 'max-width 0.3s ease'
  }}>
    <div style={{ display: 'flex', gap: isMobile ? '8px' : '16px', alignItems: 'end' }}>
      <div style={{ flex: 1 }}>
        {/* Botones superiores - solo en desktop o cuando no hay proyecto */}
        {(!isMobile || !currentProject) && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '8px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: isMobile ? '6px' : '8px',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: isMobile ? '12px' : '14px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#374151'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.5)'}
              title="Subir archivos del proyecto"
            >
              <Upload style={{ width: isMobile ? '14px' : '16px', height: isMobile ? '14px' : '16px' }} />
              {!isMobile && 'Subir'}
            </button>
            
            {currentProject && (
              <button
                onClick={() => setCurrentProject(null)}
                style={{
                  padding: isMobile ? '4px 8px' : '6px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: isMobile ? '11px' : '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
              >
                {isMobile ? '🗑️' : 'Limpiar Proyecto'}
              </button>
            )}
            
            {/* Botón rápido de configuración en móvil */}
            {isMobile && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                style={{
                  padding: '6px',
                  backgroundColor: showSettings ? '#2563eb' : 'rgba(55, 65, 81, 0.5)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                title="Configuración"
              >
                <Settings style={{ width: '14px', height: '14px' }} />
                {!apiKey && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '6px',
                    height: '6px',
                    backgroundColor: '#eab308',
                    borderRadius: '50%'
                  }}></span>
                )}
              </button>
            )}
          </div>
        )}
        
        {/* Textarea principal */}
        <div style={{ position: 'relative' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            onFocus={() => setShowMobileKeyboard(true)}
            onBlur={() => setShowMobileKeyboard(false)}
            placeholder={currentProject 
              ? `Pregunta sobre "${currentProject.name}"...`
              : isMobile 
                ? "Pregunta sobre desarrollo..."
                : "Haz una pregunta sobre desarrollo, sube archivos, o pide ayuda con código..."
            }
            style={{
              width: '100%',
              padding: isMobile ? '10px 12px' : '12px 16px',
              paddingRight: isMobile ? '45px' : '16px', // Espacio para botón en móvil
              backgroundColor: '#374151',
              border: '1px solid #4b5563',
              borderRadius: '12px',
              color: 'white',
              fontSize: isMobile ? '16px' : '14px', // 16px previene zoom en iOS
              outline: 'none',
              resize: 'none',
              minHeight: isMobile ? '44px' : '50px', // Altura táctil mínima
              maxHeight: isMobile ? '100px' : '120px',
              fontFamily: 'inherit',
              lineHeight: '1.4'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
            onBlur={(e) => e.target.style.borderColor = '#4b5563'}
            rows={isMobile ? 1 : 2}
          />
          
          {/* Botón de envío integrado en móvil */}
          {isMobile && (
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '8px',
                backgroundColor: isLoading || !input.trim() ? '#6b7280' : '#2563eb',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send style={{ 
                width: '16px', 
                height: '16px',
                transform: isLoading ? 'scale(0.9)' : 'scale(1)',
                transition: 'transform 0.2s'
              }} />
            </button>
          )}
        </div>
      </div>
      
      {/* Botón de envío separado en desktop */}
      {!isMobile && (
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !input.trim()}
          style={{
            padding: '12px',
            backgroundColor: isLoading || !input.trim() ? '#4b5563' : '#2563eb',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            minWidth: '48px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (!isLoading && input.trim()) {
              e.target.style.backgroundColor = '#1d4ed8';
              e.target.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading && input.trim()) {
              e.target.style.backgroundColor = '#2563eb';
              e.target.style.transform = 'scale(1)';
            }
          }}
        >
          <Send style={{ 
            width: '20px', 
            height: '20px',
            transform: isLoading ? 'scale(0.9)' : 'scale(1)',
            transition: 'transform 0.2s'
          }} />
        </button>
      )}
    </div>
    
    {/* Información inferior - solo en desktop */}
    {!isMobile && (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '8px',
        fontSize: '12px',
        color: '#9ca3af'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>Enter para enviar • Shift+Enter nueva línea</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              backgroundColor: apiKey ? '#10b981' : '#eab308',
              borderRadius: '50%'
            }}></span>
            <span>{API_LIMITS[currentProvider]?.icon} {currentProvider.toUpperCase()}</span>
          </div>
        </div>
        
        {apiKey && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle style={{ width: '12px', height: '12px', color: '#10b981' }} />
            <span>API configurada</span>
          </div>
        )}
      </div>
    )}
    
    {/* Indicador de estado en móvil */}
    {isMobile && (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '6px',
        fontSize: '11px',
        color: '#6b7280',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{
            width: '6px',
            height: '6px',
            backgroundColor: apiKey ? '#10b981' : '#eab308',
            borderRadius: '50%'
          }}></span>
          <span>{API_LIMITS[currentProvider]?.icon} {currentProvider.toUpperCase()}</span>
        </div>
        {currentProject && (
          <>
            <span>•</span>
            <span>📁 {currentProject.files.length} archivos</span>
          </>
        )}
      </div>
    )}
  </div>
</div>