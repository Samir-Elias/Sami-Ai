// ============================================
// 🚀 PUNTO DE ENTRADA - DevAI Agent
// ============================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Estilos globales
import './index.css';

// ============================================
// 🔧 CONFIGURACIÓN INICIAL
// ============================================

// Configurar environment para desarrollo
if (process.env.NODE_ENV === 'development') {
  // Marcar el body para mostrar elementos de debug
  document.body.setAttribute('data-env', 'development');
  
  // Log de inicio en desarrollo
  console.log(`
  🎨 DevAI Agent - Modo Desarrollo
  ================================
  📱 Responsive: Activado
  🤖 APIs: Gemini, Groq, HuggingFace, Ollama
  👁️ Live Preview: Activado
  🔧 Hot Reload: Activado
  
  💡 Configura tus API keys en .env:
  - REACT_APP_GEMINI_API_KEY=tu_key
  - REACT_APP_GROQ_API_KEY=tu_key  
  - REACT_APP_HUGGINGFACE_API_KEY=tu_key
  
  🚀 ¡Listo para desarrollar!
  `);
}

// Configurar título dinámico
document.title = 'DevAI Agent - Asistente de Desarrollo con IA';

// Configurar meta tags dinámicos
const setMetaTag = (name, content) => {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
};

setMetaTag('description', 'Asistente inteligente para desarrollo de software con Live Preview y soporte para múltiples APIs de IA');
setMetaTag('keywords', 'AI, Desarrollo, React, JavaScript, Live Preview, Gemini, Groq, Coding Assistant');
setMetaTag('author', 'DevAI Agent Team');

// ============================================
// 📱 CONFIGURACIÓN RESPONSIVE
// ============================================

// Configurar viewport para mejores experiencias móviles
const viewport = document.querySelector('meta[name="viewport"]');
if (viewport) {
  viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
}

// Configurar theme-color para móviles
const setThemeColor = (color) => {
  let themeColor = document.querySelector('meta[name="theme-color"]');
  if (!themeColor) {
    themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    document.head.appendChild(themeColor);
  }
  themeColor.content = color;
};

setThemeColor('#1e293b');

// ============================================
// 🌐 PWA Y PERFORMANCE
// ============================================

// Registrar Service Worker en producción (si existe)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registrado:', registration);
      })
      .catch(error => {
        console.log('❌ Service Worker falló:', error);
      });
  });
}

// Optimización de carga para dispositivos móviles
if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
  document.body.classList.add('mobile-device');
  
  // Prevenir zoom accidental en iOS
  document.addEventListener('touchstart', {}, true);
  
  // Mejorar rendimiento en móviles
  document.addEventListener('touchstart', function() {
    // Enable active states for buttons in iOS
  }, true);
}

// ============================================
// 🔧 ERROR HANDLING GLOBAL
// ============================================

// Manejar errores no capturados
window.addEventListener('error', (event) => {
  console.error('💥 Error global capturado:', {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
    error: event.error
  });
  
  // En desarrollo, mostrar overlay de error
  if (process.env.NODE_ENV === 'development') {
    // React ya maneja esto, pero podemos agregar logging adicional
    console.group('🐛 Error Details');
    console.error('Message:', event.message);
    console.error('Source:', event.filename);
    console.error('Position:', `${event.lineno}:${event.colno}`);
    if (event.error && event.error.stack) {
      console.error('Stack:', event.error.stack);
    }
    console.groupEnd();
  }
});

// Manejar promesas rechazadas
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚫 Promesa rechazada sin manejar:', event.reason);
  
  if (process.env.NODE_ENV === 'development') {
    console.group('💥 Unhandled Promise Rejection');
    console.error('Reason:', event.reason);
    if (event.reason && event.reason.stack) {
      console.error('Stack:', event.reason.stack);
    }
    console.groupEnd();
  }
  
  // Prevenir que aparezca en la consola del navegador
  event.preventDefault();
});

// ============================================
// 🎨 RENDERIZADO
// ============================================

// Crear root de React 18
const root = ReactDOM.createRoot(document.getElementById('root'));

// Renderizar la aplicación
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ============================================
// 📊 WEB VITALS & ANALYTICS
// ============================================

// Configurar Web Vitals solo en producción
if (process.env.NODE_ENV === 'production') {
  reportWebVitals((metric) => {
    // Aquí puedes enviar métricas a tu servicio de analytics
    console.log('📊 Web Vital:', metric);
    
    // Ejemplo de envío a Google Analytics
    if (window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      });
    }
  });
}

// ============================================
// 🔄 HOT MODULE REPLACEMENT (Desarrollo)
// ============================================

if (module.hot && process.env.NODE_ENV === 'development') {
  module.hot.accept('./App', () => {
    console.log('🔄 Hot reloading App component...');
  });
}

// ============================================
// 🌟 SPLASH SCREEN (si existe)
// ============================================

// Remover splash screen después de que React cargue
window.addEventListener('load', () => {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.remove();
    }, 300);
  }
});

// ============================================
// 📱 CONFIGURACIONES ADICIONALES MÓVILES
// ============================================

// Prevenir scroll bounce en iOS
document.addEventListener('touchmove', (e) => {
  if (e.scale !== 1) {
    e.preventDefault();
  }
}, { passive: false });

// Mejorar performance de scroll en dispositivos táctiles
if ('ontouchstart' in window) {
  document.body.style.webkitOverflowScrolling = 'touch';
}

// ============================================
// 🔧 CONFIGURACIONES DE DEBUG
// ============================================

if (process.env.NODE_ENV === 'development') {
  // Herramientas de debug globales
  window.DevAI = {
    version: '1.0.0',
    debug: true,
    clearCache: () => {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      console.log('🧹 Cache limpiado completamente');
    },
    showPerformance: () => {
      if (performance.getEntriesByType) {
        console.table(performance.getEntriesByType('navigation'));
        console.table(performance.getEntriesByType('resource'));
      }
    }
  };
  
  console.log('🛠️ DevAI Debug tools available:', Object.keys(window.DevAI));
}