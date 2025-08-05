// ============================================
// 🏭 AI SERVICE FACTORY
// ============================================

import { callGeminiAPI } from './geminiService';
import { callGroqAPI } from './groqService';
import { callHuggingFaceAPI } from './huggingfaceService';
import { callOllamaAPI } from './ollamaService';
import { API_KEYS } from '../../utils/constants';

/**
 * Función principal multi-API que selecciona el proveedor correcto
 * @param {Array} messages - Mensajes del chat
 * @param {string} apiKey - API key del proveedor
 * @param {string} provider - Proveedor de IA ('gemini', 'groq', 'huggingface', 'ollama')
 * @param {string} model - Modelo específico a usar
 * @param {boolean} isMobile - Si es dispositivo móvil
 * @returns {Promise} Respuesta de la API
 */
export const callFreeAIAPI = async (messages, apiKey, provider = 'gemini', model = null, isMobile = false) => {
  // Limpiar mensajes del sistema si existen
  const cleanMessages = messages.filter(msg => msg.role !== 'system');
  
  // En móvil solo permitir Gemini y Groq por compatibilidad
  if (isMobile && provider !== 'gemini' && provider !== 'groq') {
    console.warn(`${provider} no disponible en móvil, cambiando a Gemini`);
    provider = 'gemini';
  }

  // Validar que tenemos API key si es necesaria
  if (!apiKey && provider !== 'ollama') {
    throw new Error(`API Key requerida para ${provider.toUpperCase()}`);
  }

  try {
    switch (provider) {
      case 'gemini':
        return await callGeminiAPI(cleanMessages, apiKey, model || 'gemini-1.5-flash-latest');
      
      case 'groq':
        return await callGroqAPI(cleanMessages, apiKey, model || 'llama3-8b-8192');
      
      case 'huggingface':
        if (isMobile) {
          throw new Error('HuggingFace no disponible en móvil');
        }
        return await callHuggingFaceAPI(cleanMessages, apiKey, model || 'microsoft/DialoGPT-medium');
      
      case 'ollama':
        if (isMobile) {
          throw new Error('Ollama no disponible en móvil');
        }
        return await callOllamaAPI(cleanMessages, model || 'llama3.2:3b');
      
      default:
        throw new Error(`Proveedor no soportado: ${provider}`);
    }
  } catch (error) {
    console.error(`Error en ${provider}:`, error);
    throw error;
  }
};

/**
 * Generar respuesta inteligente simulada como fallback
 * @param {string} input - Input del usuario
 * @param {string} provider - Proveedor que falló
 * @returns {Object} Respuesta simulada
 */
export const generateFallbackResponse = (input, provider = 'sistema') => {
  const lowerInput = input.toLowerCase();
  
  // Respuesta específica para React
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

¡Puedes ver el resultado en tiempo real en el panel de Live Preview! 👉`,
      usage: { total_tokens: 'N/A' },
      model: 'fallback-react',
      provider: 'simulado'
    };
  }
  
  // Respuesta específica para HTML
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
        
        <button class="btn">¡Prueba las Animaciones!</button>
        <button class="btn">Más Información</button>
    </div>

    <script>
        // Agregar interactividad
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', function() {
                this.innerHTML = '✅ ¡Clickeado!';
                setTimeout(() => {
                    this.innerHTML = this.innerHTML.includes('Prueba') ? 
                        '¡Prueba las Animaciones!' : 'Más Información';
                }, 1500);
            });
        });
    </script>
</body>
</html>
\`\`\`

**✨ Características de la página:**

- 🎨 **Glassmorphism**: Efectos de vidrio esmerilado
- 🌈 **Gradientes**: Colores vibrantes y modernos  
- ⚡ **Animaciones CSS**: Transiciones suaves
- 📱 **Responsive**: Se adapta a móviles
- 🎯 **Interactividad**: JavaScript para eventos

¡Mira el resultado en tiempo real en el Live Preview! 👀`,
      usage: { total_tokens: 'N/A' },
      model: 'fallback-html',
      provider: 'simulado'
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

¿Te gustaría que profundice en algún aspecto específico de tu consulta?

---
*⚠️ Nota: ${provider} no está disponible, usando respuesta simulada inteligente.*`,
    usage: { total_tokens: 'N/A' },
    model: 'fallback-generic',
    provider: 'simulado'
  };
};

/**
 * Obtener el proveedor óptimo según disponibilidad
 * @param {boolean} isMobile - Si es dispositivo móvil
 * @returns {string} Proveedor recomendado
 */
export const getOptimalProvider = (isMobile = false) => {
  const availableKeys = Object.entries(API_KEYS)
    .filter(([provider, key]) => provider !== 'ollama' && key)
    .map(([provider]) => provider);

  if (isMobile) {
    // En móvil priorizar Gemini > Groq
    if (availableKeys.includes('gemini')) return 'gemini';
    if (availableKeys.includes('groq')) return 'groq';
  } else {
    // En desktop considerar todas las opciones
    if (availableKeys.includes('gemini')) return 'gemini';
    if (availableKeys.includes('groq')) return 'groq';
    if (availableKeys.includes('huggingface')) return 'huggingface';
  }

  return 'gemini'; // Fallback
};

/**
 * Obtener proveedores disponibles según el dispositivo
 * @param {boolean} isMobile - Si es dispositivo móvil
 * @returns {Array} Lista de proveedores disponibles
 */
export const getAvailableProviders = (isMobile = false) => {
  const allProviders = ['gemini', 'groq', 'huggingface', 'ollama'];
  
  if (isMobile) {
    return ['gemini', 'groq']; // Solo estos en móvil
  }
  
  return allProviders;
};