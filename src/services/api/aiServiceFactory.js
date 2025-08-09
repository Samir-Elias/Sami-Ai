// ============================================
// 🏭 AI SERVICE FACTORY - VERSIÓN CORREGIDA
// ============================================

import { callGeminiAPI } from './geminiService';
import { callGroqAPI } from './groqService';
import { callHuggingFaceAPI } from './huggingfaceService';
import { callOllamaAPI } from './ollamaService';
import { constantsUtils, ERROR_MESSAGES } from '../../utils/constants';

/**
 * Función principal multi-API que selecciona el proveedor correcto
 * ✅ VERSIÓN CORREGIDA - Sin duplicación, mejor logging, manejo de errores
 */
export const callFreeAIAPI = async (messages, apiKey, provider = 'gemini', model = null, isMobile = false) => {
  console.log(`🏭 aiServiceFactory.callFreeAIAPI iniciado`);
  console.log(`📊 Parámetros:`, {
    messagesCount: messages?.length || 0,
    provider,
    model: model || 'default',
    hasApiKey: !!apiKey,
    isMobile
  });

  // ============================================
  // 🔍 VALIDACIONES PREVIAS
  // ============================================

  // Validar mensajes
  if (!messages || !Array.isArray(messages)) {
    throw new Error('❌ Messages debe ser un array');
  }

  const cleanMessages = messages.filter(msg => 
    msg && 
    msg.role && 
    msg.content && 
    typeof msg.content === 'string' && 
    msg.content.trim().length > 0
  );

  if (cleanMessages.length === 0) {
    throw new Error(ERROR_MESSAGES.NO_MESSAGES);
  }

  console.log(`📝 Mensajes limpiados: ${cleanMessages.length}/${messages.length}`);

  // Detectar si es móvil automáticamente si no se especifica
  const actualIsMobile = isMobile || (typeof window !== 'undefined' && window.innerWidth < 768);

  // Validar compatibilidad con móvil
  if (actualIsMobile && (provider === 'huggingface' || provider === 'ollama')) {
    console.warn(`⚠️ ${provider} no disponible en móvil, cambiando a Gemini`);
    provider = 'gemini';
  }

  // Validar que tenemos API key si es necesaria
  if (!apiKey && provider !== 'ollama') {
    throw new Error(ERROR_MESSAGES.NO_API_KEY(provider));
  }

  // Log final de configuración
  console.log(`🚀 Llamando ${provider.toUpperCase()} con modelo: ${model || 'default'}`);
  console.log(`🔑 API Key: ${apiKey ? `✅ Configurada (${apiKey.substring(0, 8)}...)` : '❌ Faltante'}`);

  // ============================================
  // 🔄 LLAMADAS A APIs ESPECÍFICAS
  // ============================================

  const startTime = Date.now();

  try {
    let result;
    
    switch (provider.toLowerCase()) {
      case 'gemini':
        result = await callGeminiAPI(
          cleanMessages, 
          apiKey, 
          model || 'gemini-1.5-flash-latest'
        );
        break;
      
      case 'groq':
        result = await callGroqAPI(
          cleanMessages, 
          apiKey, 
          model || 'llama3-8b-8192'
        );
        break;
      
      case 'huggingface':
        if (actualIsMobile) {
          throw new Error(ERROR_MESSAGES.MOBILE_NOT_SUPPORTED(provider));
        }
        result = await callHuggingFaceAPI(
          cleanMessages, 
          apiKey, 
          model || 'microsoft/DialoGPT-medium'
        );
        break;
      
      case 'ollama':
        if (actualIsMobile) {
          throw new Error(ERROR_MESSAGES.MOBILE_NOT_SUPPORTED(provider));
        }
        result = await callOllamaAPI(
          cleanMessages, 
          model || 'llama3.2:3b'
        );
        break;
      
      default:
        throw new Error(`❌ Proveedor no soportado: ${provider}`);
    }

    // ============================================
    // ✅ PROCESAMIENTO DE RESPUESTA EXITOSA
    // ============================================

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Validar que la respuesta tenga el formato correcto
    if (!result || !result.content) {
      throw new Error(`❌ Respuesta inválida de ${provider}: sin contenido`);
    }

    // Enriquecer la respuesta con metadatos
    const enrichedResult = {
      ...result,
      provider: provider,
      model: result.model || model,
      duration: duration,
      timestamp: new Date().toISOString(),
      messagesProcessed: cleanMessages.length,
      isMobile: actualIsMobile
    };

    console.log(`✅ ${provider.toUpperCase()} respondió exitosamente`);
    console.log(`⏱️ Duración: ${duration}ms`);
    console.log(`📊 Tokens:`, result.usage?.total_tokens || 'N/A');
    console.log(`📝 Respuesta (preview):`, result.content.substring(0, 100) + '...');

    return enrichedResult;

  } catch (error) {
    // ============================================
    // ❌ MANEJO DE ERRORES MEJORADO
    // ============================================
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.error(`❌ Error en ${provider.toUpperCase()}:`, error.message);
    console.error(`⏱️ Falló después de ${duration}ms`);

    // Clasificar tipos de error para mejor manejo
    let errorType = 'unknown';
    let errorMessage = error.message;

    if (error.message.includes('API Key')) {
      errorType = 'authentication';
    } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
      errorType = 'rate_limit';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorType = 'network';
    } else if (error.message.includes('timeout')) {
      errorType = 'timeout';
    }

    // Crear error enriquecido
    const enrichedError = new Error(errorMessage);
    enrichedError.provider = provider;
    enrichedError.type = errorType;
    enrichedError.duration = duration;
    enrichedError.originalError = error;

    throw enrichedError;
  }
};

/**
 * ✅ Generar respuesta inteligente simulada como fallback
 */
export const generateFallbackResponse = (input, provider = 'sistema') => {
  console.log('🆘 Generando respuesta de fallback');
  
  if (!input || typeof input !== 'string') {
    input = 'consulta';
  }

  const lowerInput = input.toLowerCase();
  
  // Respuesta específica para React/desarrollo
  if (lowerInput.includes('react') || lowerInput.includes('componente') || lowerInput.includes('jsx')) {
    return {
      content: `Te ayudo a crear un componente React para tu consulta sobre: **"${input.substring(0, 100)}"**

\`\`\`jsx
import React, { useState, useEffect } from 'react';

const DynamicComponent = ({ title = "Componente Dinámico" }) => {
  const [isActive, setIsActive] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Simular carga de datos
    const timer = setTimeout(() => {
      setData({
        message: "Datos cargados correctamente",
        timestamp: new Date().toLocaleString()
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      maxWidth: '500px',
      margin: '20px auto',
      padding: '30px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '15px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>
        ⚛️ {title}
      </h2>
      
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <p><strong>Estado:</strong> {isActive ? '🟢 Activo' : '🔴 Inactivo'}</p>
        {data && (
          <div style={{ marginTop: '10px' }}>
            <p><strong>Datos:</strong> {data.message}</p>
            <small>Actualizado: {data.timestamp}</small>
          </div>
        )}
      </div>
      
      <button
        onClick={() => setIsActive(!isActive)}
        style={{
          background: isActive ? '#ef4444' : '#10b981',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          transition: 'all 0.3s ease'
        }}
      >
        {isActive ? '⏸️ Desactivar' : '▶️ Activar'}
      </button>
    </div>
  );
};

export default DynamicComponent;
\`\`\`

**✨ Características:**
- 🎯 Hooks useState y useEffect
- 🎨 Estilos modernos con gradientes
- 📱 Responsive y accesible
- 🔄 Estado interactivo

¡Puedes ver el resultado en el Live Preview! 👀

---
*⚠️ Respuesta de fallback - ${provider} no está disponible. Configura tu API Key en ⚙️ Settings.*`,
      usage: { total_tokens: 'fallback' },
      model: 'fallback-react',
      provider: 'fallback'
    };
  }
  
  // Respuesta específica para HTML/CSS
  if (lowerInput.includes('html') || lowerInput.includes('css') || lowerInput.includes('página') || lowerInput.includes('web')) {
    return {
      content: `Te creo una página web moderna para: **"${input.substring(0, 100)}"**

\`\`\`html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Página Web Dinámica</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
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
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            max-width: 600px;
            text-align: center;
            animation: slideIn 0.8s ease-out;
        }

        @keyframes slideIn {
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
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .card {
            background: linear-gradient(45deg, #4f46e5, #7c3aed);
            color: white;
            padding: 25px;
            margin: 20px 0;
            border-radius: 15px;
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .card:hover {
            transform: translateY(-5px) scale(1.02);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
        }

        .btn {
            background: linear-gradient(45deg, #10b981, #059669);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
            margin: 10px 5px;
        }

        .btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
        }

        .status {
            margin-top: 20px;
            padding: 15px;
            background: rgba(16, 185, 129, 0.1);
            border-radius: 10px;
            border-left: 4px solid #10b981;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌟 Página Interactiva</h1>
        
        <div class="card">
            <h3>🚀 Funcionalidad Principal</h3>
            <p>Respuesta dinámica a tu consulta sobre desarrollo web</p>
        </div>
        
        <div class="card">
            <h3>🎨 Diseño Moderno</h3>
            <p>Interfaz atractiva con animaciones y efectos visuales</p>
        </div>
        
        <button class="btn" onclick="activateFeature()">✨ Activar</button>
        <button class="btn" onclick="showInfo()">ℹ️ Información</button>
        
        <div class="status" id="status" style="display: none;">
            <strong>Estado:</strong> <span id="statusText">Listo</span>
        </div>
    </div>

    <script>
        function activateFeature() {
            const status = document.getElementById('status');
            const statusText = document.getElementById('statusText');
            
            status.style.display = 'block';
            statusText.textContent = '🟢 Característica activada';
            
            setTimeout(() => {
                statusText.textContent = '⚡ Procesando datos...';
            }, 1000);
            
            setTimeout(() => {
                statusText.textContent = '✅ Completado exitosamente';
            }, 2500);
        }
        
        function showInfo() {
            alert('🎯 Esta es una página web moderna con:\\n\\n' +
                  '• Diseño responsive\\n' +
                  '• Animaciones CSS\\n' +
                  '• Interactividad JavaScript\\n' +
                  '• Efectos visuales modernos');
        }
    </script>
</body>
</html>
\`\`\`

**✨ Características incluidas:**
- 🎨 **Glassmorphism** - Efectos de vidrio moderno
- 🌈 **Gradientes** - Colores vibrantes y atractivos
- ⚡ **Animaciones** - Transiciones suaves y elegantes
- 📱 **Responsive** - Se adapta a cualquier dispositivo
- 🎯 **JavaScript** - Interactividad dinámica

¡Visualiza el resultado en tiempo real en el Live Preview! 🔥

---
*⚠️ Respuesta de fallback - ${provider} no disponible. Configura tu API Key en Settings.*`,
      usage: { total_tokens: 'fallback' },
      model: 'fallback-html',
      provider: 'fallback'
    };
  }

  // Respuesta genérica pero útil
  return {
    content: `Aquí tienes ayuda sobre: **"${input.substring(0, 100)}${input.length > 100 ? '...' : ''}"**

## 🔍 Análisis de tu consulta

He procesado tu solicitud y aunque ${provider.toUpperCase()} no está disponible, puedo ofrecerte esta guía:

\`\`\`javascript
// Análisis automático de la consulta
const consultaAnalisis = {
  entrada: "${input.replace(/"/g, '\\"')}",
  palabrasClave: "${input.split(' ').slice(0, 5).join(', ')}",
  
  procesarConsulta() {
    console.log('🔍 Analizando consulta:', this.entrada);
    
    const palabras = this.entrada.toLowerCase().split(' ');
    const contexto = this.detectarContexto(palabras);
    
    return {
      tipo: contexto.tipo,
      complejidad: contexto.complejidad,
      recomendaciones: this.generarRecomendaciones(contexto)
    };
  },
  
  detectarContexto(palabras) {
    // Detección inteligente del tipo de consulta
    if (palabras.some(p => ['código', 'programar', 'función'].includes(p))) {
      return { tipo: 'código', complejidad: 'media' };
    }
    
    if (palabras.some(p => ['error', 'bug', 'problema'].includes(p))) {
      return { tipo: 'debugging', complejidad: 'alta' };
    }
    
    return { tipo: 'general', complejidad: 'baja' };
  }
};

// Ejecutar análisis
const resultado = consultaAnalisis.procesarConsulta();
console.log('📊 Resultado:', resultado);
\`\`\`

## 🎯 Recomendaciones específicas:

**1. Verificar configuración**
- ⚙️ Ve a **Settings** y configura tu API Key
- 🔄 Prueba con otro proveedor disponible
- 🌐 Verifica tu conexión a internet

**2. Alternativas disponibles**
- **Gemini**: Rápido y eficiente para la mayoría de tareas
- **Groq**: Excelente para velocidad extrema
- **HuggingFace**: Ideal para modelos especializados (solo desktop)
- **Ollama**: Totalmente privado y local (solo desktop)

**3. Solución temporal**
- 🔧 Configura una API Key válida
- 🔄 Reinicia la aplicación después de configurar
- 📝 Repite tu consulta una vez configurado

## 💡 Mientras tanto, aquí tienes un código útil:

\`\`\`javascript
// Utilidad para manejar consultas offline
class ConsultaOffline {
  constructor(consulta) {
    this.consulta = consulta;
    this.timestamp = new Date();
  }

  procesar() {
    return {
      respuesta: this.generarRespuestaInteligente(),
      sugerencias: this.obtenerSugerencias(),
      siguientesPasos: this.recomendarAcciones()
    };
  }

  generarRespuestaInteligente() {
    // Análisis básico de la consulta
    const palabrasImportantes = this.consulta
      .toLowerCase()
      .split(' ')
      .filter(palabra => palabra.length > 3);
    
    return \`Análisis de: \${palabrasImportantes.join(', ')}\`;
  }

  obtenerSugerencias() {
    return [
      '🔑 Configura tu API Key en Settings',
      '🔄 Prueba con otro proveedor',
      '📖 Consulta la documentación',
      '🌐 Verifica la conexión'
    ];
  }

  recomendarAcciones() {
    return [
      'Ir a configuración',
      'Seleccionar proveedor',
      'Ingresar API Key',
      'Reintentar consulta'
    ];
  }
}

// Usar la utilidad
const consulta = new ConsultaOffline("${input.replace(/"/g, '\\"')}");
const resultado = consulta.procesar();

console.log('🎯 Resultado offline:', resultado);
\`\`\`

---

🚀 **Una vez que configures tu API Key, podrás obtener:**
- ✨ Respuestas detalladas y contextuales
- 🔥 Código funcional y completo
- 📊 Análisis profundo de tus consultas
- 🎯 Soluciones personalizadas

**¿Necesitas ayuda configurando tu API Key?**
1. Ve a ⚙️ **Settings**
2. Selecciona tu proveedor preferido
3. Pega tu API Key
4. ¡Listo para usar!

---
*⚠️ Respuesta de fallback - ${provider} no está disponible. Configura tu API Key para obtener respuestas completas.*`,
    usage: { total_tokens: 'fallback' },
    model: 'fallback-generic',
    provider: 'fallback',
    timestamp: new Date().toISOString()
  };
};

/**
 * ✅ Obtener el proveedor óptimo según disponibilidad y dispositivo
 */
export const getOptimalProvider = (isMobile = false) => {
  console.log('🎯 Buscando proveedor óptimo, isMobile:', isMobile);
  
  const availableProviders = constantsUtils.getAvailableProviders(isMobile);
  console.log('📋 Proveedores disponibles:', availableProviders);
  
  // Prioridades según dispositivo
  const priorities = isMobile 
    ? ['gemini', 'groq'] 
    : ['gemini', 'groq', 'huggingface', 'ollama'];

  for (const provider of priorities) {
    if (availableProviders.includes(provider)) {
      const isConfigured = constantsUtils.isProviderAvailable(provider, isMobile);
      console.log(`🔍 Verificando ${provider}:`, isConfigured ? '✅ Disponible' : '❌ No configurado');
      
      if (isConfigured) {
        console.log(`🏆 Proveedor óptimo seleccionado: ${provider}`);
        return provider;
      }
    }
  }

  console.log('⚠️ No hay proveedores configurados, usando Gemini por defecto');
  return 'gemini'; // Fallback
};

/**
 * ✅ Obtener lista de proveedores disponibles según el dispositivo
 */
export const getAvailableProviders = (isMobile = false) => {
  const providers = constantsUtils.getAvailableProviders(isMobile);
  
  console.log(`📱 Proveedores para ${isMobile ? 'móvil' : 'desktop'}:`, providers);
  
  return providers.map(provider => ({
    id: provider,
    name: constantsUtils.getProviderConfig(provider).name,
    icon: constantsUtils.getProviderConfig(provider).icon,
    available: constantsUtils.isProviderAvailable(provider, isMobile),
    configured: !!localStorage.getItem(`api_key_${provider}`) || provider === 'ollama'
  }));
};

/**
 * ✅ Verificar estado de conectividad de un proveedor específico
 */
export const checkProviderHealth = async (provider, apiKey) => {
  console.log(`🏥 Verificando salud de ${provider.toUpperCase()}`);
  
  try {
    const startTime = Date.now();
    
    let healthCheck;
    
    switch (provider.toLowerCase()) {
      case 'gemini':
        const { validateGeminiKey } = await import('./geminiService');
        healthCheck = await validateGeminiKey(apiKey);
        break;
        
      case 'groq':
        const { validateGroqKey } = await import('./groqService');
        healthCheck = await validateGroqKey(apiKey);
        break;
        
      case 'huggingface':
        const { validateHuggingFaceKey } = await import('./huggingfaceService');
        healthCheck = await validateHuggingFaceKey(apiKey);
        break;
        
      case 'ollama':
        const { checkOllamaStatus } = await import('./ollamaService');
        healthCheck = await checkOllamaStatus();
        break;
        
      default:
        throw new Error(`Proveedor no soportado: ${provider}`);
    }
    
    const duration = Date.now() - startTime;
    
    const result = {
      provider,
      healthy: healthCheck,
      responseTime: duration,
      timestamp: new Date().toISOString(),
      status: healthCheck ? 'online' : 'offline'
    };
    
    console.log(`🏥 Salud de ${provider}:`, result);
    return result;
    
  } catch (error) {
    console.error(`🚨 Error verificando ${provider}:`, error);
    
    return {
      provider,
      healthy: false,
      responseTime: null,
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message
    };
  }
};

/**
 * ✅ Función utilitaria para testear una configuración de API
 */
export const testApiConfiguration = async (provider, apiKey, model = null) => {
  console.log(`🧪 Testeando configuración de ${provider.toUpperCase()}`);
  
  const testMessage = [
    {
      role: 'user',
      content: 'Responde solo con "OK" si recibes este mensaje correctamente.'
    }
  ];
  
  try {
    const result = await callFreeAIAPI(testMessage, apiKey, provider, model);
    
    const success = result && result.content && 
      (result.content.toLowerCase().includes('ok') || result.content.length > 0);
    
    console.log(`🧪 Test de ${provider}:`, success ? '✅ Exitoso' : '⚠️ Dudoso');
    
    return {
      success,
      provider,
      model: result?.model,
      responseTime: result?.duration,
      response: result?.content?.substring(0, 100) + '...'
    };
    
  } catch (error) {
    console.error(`🧪 Test falló para ${provider}:`, error);
    
    return {
      success: false,
      provider,
      error: error.message
    };
  }
};

/**
 * ✅ Utilidades de debugging y logging
 */
export const apiDebugUtils = {
  /**
   * Log completo de una llamada API
   */
  logApiCall: (provider, messages, options = {}) => {
    console.group(`🔍 API Call Debug: ${provider.toUpperCase()}`);
    console.log('📨 Messages:', messages.map(m => ({
      role: m.role,
      contentLength: m.content?.length || 0,
      preview: m.content?.substring(0, 50) + '...'
    })));
    console.log('⚙️ Options:', options);
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.groupEnd();
  },

  /**
   * Log de respuesta API
   */
  logApiResponse: (provider, response, duration) => {
    console.group(`📨 API Response: ${provider.toUpperCase()}`);
    console.log('✅ Success:', !!response.content);
    console.log('⏱️ Duration:', duration + 'ms');
    console.log('🧠 Model:', response.model);
    console.log('📊 Usage:', response.usage);
    console.log('📝 Content Length:', response.content?.length || 0);
    console.log('👀 Preview:', response.content?.substring(0, 100) + '...');
    console.groupEnd();
  },

  /**
   * Log de error API
   */
  logApiError: (provider, error, duration) => {
    console.group(`❌ API Error: ${provider.toUpperCase()}`);
    console.error('🚨 Error:', error.message);
    console.log('⏱️ Failed after:', duration + 'ms');
    console.log('🏷️ Error Type:', error.type || 'unknown');
    console.log('📍 Stack:', error.stack);
    console.groupEnd();
  }
};

/**
 * ✅ Exportaciones principales
 */
export default {
  callFreeAIAPI,
  generateFallbackResponse,
  getOptimalProvider,
  getAvailableProviders,
  checkProviderHealth,
  testApiConfiguration,
  apiDebugUtils
};