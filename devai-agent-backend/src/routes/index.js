// src/routes/index.js - Rutas del backend para tu React
const express = require('express');
const multer = require('multer');
const router = express.Router();

// Configurar multer para uploads
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.json', '.md', '.txt'];
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();
    cb(null, allowedTypes.includes(ext));
  }
});

// =================================
// 🤖 RUTAS DE IA - COMPATIBLES CON TU callFreeAIAPI
// =================================

// Endpoint principal de chat - exactamente lo que espera tu React
router.post('/ai/chat', async (req, res) => {
  try {
    const { 
      messages, 
      provider = 'gemini', 
      model = 'gemini-1.5-flash',
      apiKey,
      stream = false
    } = req.body;

    console.log(`💬 Chat request: ${provider} - ${messages?.length || 0} messages`);

    // Validación básica
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere al menos un mensaje',
        code: 'INVALID_MESSAGES'
      });
    }

    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    // Simular diferentes tipos de respuesta según el provider
    let response;
    switch (provider) {
      case 'gemini':
        response = await simulateGeminiResponse(userQuery, model);
        break;
      case 'groq':
        response = await simulateGroqResponse(userQuery, model);
        break;
      case 'huggingface':
        response = await simulateHFResponse(userQuery, model);
        break;
      case 'ollama':
        response = await simulateOllamaResponse(userQuery, model);
        break;
      default:
        response = await simulateGenericResponse(userQuery, provider);
    }

    // Formato exacto que espera tu React
    res.json({
      success: true,
      content: response.content,
      model: response.model,
      provider: provider,
      usage: response.usage,
      thinking: response.thinking || `Procesado con ${provider.toUpperCase()}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en chat:', error);
    
    // Respuesta de error compatible con tu frontend
    res.status(500).json({
      success: false,
      error: error.message,
      content: `❌ **Error del servidor**: ${error.message}\n\n*Usando respuesta de fallback*\n\nTu consulta fue recibida correctamente, pero hubo un problema técnico. El sistema está funcionando en modo simulado.`,
      fallback: true
    });
  }
});

// Estado de las APIs - para tu useApiStatus hook
router.get('/ai/status', (req, res) => {
  res.json({
    success: true,
    data: {
      gemini: { 
        available: true, 
        status: 'active',
        latency: Math.floor(Math.random() * 200) + 100
      },
      groq: { 
        available: true, 
        status: 'active',
        latency: Math.floor(Math.random() * 100) + 50 
      },
      huggingface: { 
        available: true, 
        status: 'active',
        latency: Math.floor(Math.random() * 300) + 200
      },
      ollama: { 
        available: false, 
        status: 'not_running',
        error: 'No local installation detected'
      }
    }
  });
});

// Modelos disponibles - para tus selects
router.get('/ai/models', (req, res) => {
  res.json({
    success: true,
    data: {
      gemini: [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-1.0-pro'
      ],
      groq: [
        'llama3-8b-8192',
        'llama3-70b-8192',
        'mixtral-8x7b-32768',
        'gemma-7b-it'
      ],
      huggingface: [
        'microsoft/DialoGPT-medium',
        'facebook/blenderbot-400M-distill',
        'microsoft/DialoGPT-large'
      ],
      ollama: [
        'llama2',
        'codellama',
        'mistral',
        'neural-chat'
      ]
    }
  });
});

// =================================
// 📁 RUTAS DE ARCHIVOS - COMPATIBLES CON TU handleFileUpload
// =================================

// Upload de archivos - exacto para tu React
router.post('/files/upload', upload.array('files', 20), async (req, res) => {
  try {
    const files = req.files || [];
    const projectName = req.body.projectName || `Proyecto ${new Date().toLocaleDateString()}`;
    
    console.log(`📁 File upload: ${files.length} files for project "${projectName}"`);

    // Procesar archivos como lo hace tu frontend
    const processedFiles = [];
    
    for (const file of files) {
      try {
        const content = file.buffer ? file.buffer.toString('utf8') : await file.text?.() || '';
        
        processedFiles.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.originalname,
          content: content,
          size: file.size,
          type: '.' + file.originalname.split('.').pop().toLowerCase(),
          language: determineLanguage(file.originalname),
          lineCount: content.split('\n').length,
          processedAt: new Date().toISOString()
        });
      } catch (fileError) {
        console.warn(`⚠️ Error procesando ${file.originalname}:`, fileError.message);
      }
    }

    // Generar estadísticas como tu fileService
    const stats = generateProjectStats(processedFiles);

    const project = {
      id: `project_${Date.now()}`,
      name: projectName,
      files: processedFiles,
      totalFiles: processedFiles.length,
      totalSize: processedFiles.reduce((sum, f) => sum + f.size, 0),
      stats: stats,
      createdAt: new Date().toISOString()
    };

    // Respuesta compatible con tu frontend
    res.json({
      success: true,
      message: 'Archivos procesados exitosamente',
      data: project
    });

  } catch (error) {
    console.error('❌ Error en upload:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error procesando archivos'
    });
  }
});

// Analizar proyecto - para análisis adicional
router.post('/files/analyze', (req, res) => {
  try {
    const { files } = req.body;
    
    const analysis = {
      languages: {},
      fileTypes: {},
      totalLines: 0,
      complexity: determineComplexity(files),
      recommendations: generateRecommendations(files),
      securityIssues: findSecurityIssues(files)
    };

    files?.forEach(file => {
      const lang = determineLanguage(file.name);
      analysis.languages[lang] = (analysis.languages[lang] || 0) + 1;
      analysis.totalLines += file.content?.split('\n').length || 0;
    });

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =================================
// 💬 RUTAS DE CONVERSACIONES - PARA TU useConversations
// =================================

// Obtener conversaciones guardadas
router.get('/conversations', (req, res) => {
  // En producción, esto vendría de la base de datos
  const conversations = [
    {
      id: 'conv_demo_1',
      title: 'Optimización React',
      preview: 'Consulta sobre performance en componentes React',
      messageCount: 5,
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'conv_demo_2', 
      title: 'API Node.js',
      preview: 'Desarrollo de endpoints REST',
      messageCount: 8,
      provider: 'groq',
      model: 'llama3-8b-8192',
      lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    }
  ];

  res.json({
    success: true,
    data: conversations,
    pagination: {
      total: conversations.length,
      page: 1,
      limit: 20
    }
  });
});

// Guardar conversación
router.post('/conversations', (req, res) => {
  const { title, messages, metadata = {} } = req.body;
  
  const conversation = {
    id: `conv_${Date.now()}`,
    title: title || 'Nueva Conversación',
    messages: messages || [],
    messageCount: messages?.length || 0,
    provider: metadata.provider || 'gemini',
    model: metadata.model,
    totalTokens: metadata.totalTokens,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // En producción, guardar en base de datos
  console.log(`💾 Conversation saved: ${conversation.title} (${conversation.messageCount} messages)`);

  res.json({
    success: true,
    message: 'Conversación guardada',
    data: conversation
  });
});

// =================================
// 🔧 FUNCIONES AUXILIARES
// =================================

// Simular respuesta de Gemini
async function simulateGeminiResponse(query, model = 'gemini-1.5-flash') {
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
  
  return {
    content: `**Respuesta de Gemini** 🤖\n\nHe procesado tu consulta: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"\n\n` +
             generateIntelligentResponse(query) +
             `\n\n*✨ Esta respuesta es generada por el backend simulado. En producción, aquí estaría la respuesta real de Gemini.*`,
    model: model,
    usage: {
      prompt_tokens: Math.floor(query.length / 4),
      completion_tokens: Math.floor(Math.random() * 200) + 100,
      total_tokens: Math.floor(query.length / 4) + Math.floor(Math.random() * 200) + 100
    }
  };
}

// Simular respuesta de Groq  
async function simulateGroqResponse(query, model = 'llama3-8b-8192') {
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 200));
  
  return {
    content: `**Groq Ultra-Fast Response** ⚡\n\n${generateIntelligentResponse(query)}\n\n*🚀 Respuesta ultra-rápida simulada de Groq*`,
    model: model,
    usage: {
      prompt_tokens: Math.floor(query.length / 4),
      completion_tokens: Math.floor(Math.random() * 150) + 80,
      total_tokens: Math.floor(query.length / 4) + Math.floor(Math.random() * 150) + 80
    }
  };
}

// Simular respuesta de HuggingFace
async function simulateHFResponse(query, model = 'microsoft/DialoGPT-medium') {
  await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 600));
  
  return {
    content: `**HuggingFace Response** 🤗\n\n${generateIntelligentResponse(query)}\n\n*📚 Respuesta de modelo abierto simulada*`,
    model: model,
    usage: {
      prompt_tokens: Math.floor(query.length / 3),
      completion_tokens: Math.floor(Math.random() * 180) + 120,
      total_tokens: Math.floor(query.length / 3) + Math.floor(Math.random() * 180) + 120
    }
  };
}

// Simular respuesta de Ollama
async function simulateOllamaResponse(query, model = 'llama2') {
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
  
  return {
    content: `**Ollama Local Response** 🏠\n\n${generateIntelligentResponse(query)}\n\n*💻 Respuesta local simulada de Ollama*`,
    model: model,
    usage: {
      prompt_tokens: Math.floor(query.length / 4),
      completion_tokens: Math.floor(Math.random() * 160) + 90,
      total_tokens: Math.floor(query.length / 4) + Math.floor(Math.random() * 160) + 90
    }
  };
}

// Generar respuesta inteligente basada en la consulta
function generateIntelligentResponse(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('react') || lowerQuery.includes('jsx')) {
    return `Para optimizar React:\n\n1. **React.memo()** - Evita re-renders innecesarios\n2. **useMemo()** - Cachea cálculos costosos\n3. **useCallback()** - Estabiliza funciones\n4. **Code splitting** - Carga bajo demanda\n\n¿Te ayudo con algún componente específico?`;
  }
  
  if (lowerQuery.includes('javascript') || lowerQuery.includes('js')) {
    return `Consejos de JavaScript:\n\n• Usa **const/let** en lugar de var\n• Aprovecha **destructuring** para código más limpio\n• Implementa **async/await** para promesas\n• Considera **TypeScript** para mayor seguridad\n\n¿Qué aspecto específico de JS te interesa?`;
  }
  
  if (lowerQuery.includes('python')) {
    return `Para Python te recomiendo:\n\n🐍 **PEP 8** - Sigue las convenciones de estilo\n📦 **Virtual environments** - Aísla dependencias\n⚡ **List comprehensions** - Código más pythonico\n🔧 **Type hints** - Mejor documentación del código`;
  }
  
  if (lowerQuery.includes('api') || lowerQuery.includes('backend')) {
    return `Para desarrollo de APIs:\n\n🔧 **RESTful design** - Endpoints consistentes\n🔐 **Autenticación JWT** - Seguridad robusta\n📊 **Rate limiting** - Prevenir abuso\n📝 **Documentación OpenAPI** - APIs autodocumentadas\n⚡ **Caching** - Mejor performance`;
  }
  
  // Respuesta genérica inteligente
  return `He analizado tu consulta y aquí tienes algunas sugerencias relevantes:\n\n• **Mejores prácticas** aplicables a tu caso\n• **Optimizaciones** que podrías implementar\n• **Recursos adicionales** para profundizar\n• **Siguientes pasos** recomendados\n\n¿Te gustaría que profundice en algún aspecto específico?`;
}

// Determinar lenguaje de programación
function determineLanguage(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  const langMap = {
    'js': 'javascript', 'jsx': 'react', 'ts': 'typescript', 'tsx': 'react-typescript',
    'py': 'python', 'html': 'html', 'css': 'css', 'json': 'json',
    'md': 'markdown', 'txt': 'text', 'java': 'java', 'cpp': 'cpp', 'c': 'c'
  };
  return langMap[ext] || 'text';
}

// Generar estadísticas del proyecto
function generateProjectStats(files) {
  const languages = {};
  let totalLines = 0;
  
  files.forEach(file => {
    languages[file.language] = (languages[file.language] || 0) + 1;
    totalLines += file.lineCount;
  });
  
  const primaryLanguage = Object.keys(languages).sort((a, b) => languages[b] - languages[a])[0] || 'text';
  
  return {
    totalFiles: files.length,
    totalLines,
    primaryLanguage,
    languages,
    complexity: totalLines > 1000 ? 'high' : totalLines > 300 ? 'medium' : 'low'
  };
}

// Determinar complejidad del proyecto
function determineComplexity(files) {
  const totalLines = files?.reduce((sum, f) => sum + (f.content?.split('\n').length || 0), 0) || 0;
  if (totalLines > 2000) return 'high';
  if (totalLines > 500) return 'medium';
  return 'low';
}

// Generar recomendaciones
function generateRecommendations(files) {
  const recommendations = ['Proyecto bien estructurado'];
  
  const hasReadme = files?.some(f => f.name.toLowerCase().includes('readme'));
  if (!hasReadme) recommendations.push('Considera agregar documentación README');
  
  const hasTests = files?.some(f => f.name.includes('.test.') || f.name.includes('.spec.'));
  if (!hasTests) recommendations.push('Agregar tests unitarios mejoraría la calidad');
  
  return recommendations;
}

// Encontrar problemas de seguridad básicos
function findSecurityIssues(files) {
  const issues = [];
  
  files?.forEach(file => {
    if (file.content?.includes('password') && file.content?.includes('=')) {
      issues.push(`Posible contraseña hardcodeada en ${file.name}`);
    }
    if (file.content?.includes('api_key') && file.content?.includes('=')) {
      issues.push(`Posible API key expuesta en ${file.name}`);
    }
  });
  
  return issues;
}

// Ruta raíz de la API
router.get('/', (req, res) => {
  res.json({
    message: 'DevAI Agent Backend API v1.0',
    status: 'active',
    compatibility: 'React Frontend Ready',
    endpoints: {
      'POST /ai/chat': 'Enviar mensaje a IA',
      'GET /ai/status': 'Estado de APIs',
      'GET /ai/models': 'Modelos disponibles',
      'POST /files/upload': 'Subir archivos',
      'GET /conversations': 'Listar conversaciones',
      'POST /conversations': 'Guardar conversación'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;