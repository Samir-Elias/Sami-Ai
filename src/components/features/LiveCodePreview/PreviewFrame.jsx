// ============================================
// 🖼️ PREVIEW FRAME COMPONENT
// ============================================

import React, { useRef } from 'react';

/**
 * Componente que renderiza el iframe con el código
 * @param {Object} props - Props del componente
 */
const PreviewFrame = ({ block, refreshKey }) => {
  const iframeRef = useRef(null);

  if (!block) return null;

  const { language, code } = block;
  const htmlContent = generatePreviewHTML(language, code);

  return (
    <iframe
      key={refreshKey}
      ref={iframeRef}
      srcDoc={htmlContent}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        backgroundColor: 'white'
      }}
      title="Live Code Preview"
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  );
};

/**
 * Generar HTML completo para previsualización según el lenguaje
 * @param {string} language - Lenguaje del código
 * @param {string} code - Código a renderizar
 * @returns {string} HTML completo
 */
const generatePreviewHTML = (language, code) => {
  const lang = language?.toLowerCase();

  switch (lang) {
    case 'html':
      return generateHTMLPreview(code);
    
    case 'css':
      return generateCSSPreview(code);
    
    case 'javascript':
    case 'js':
      return generateJavaScriptPreview(code);
    
    case 'jsx':
    case 'react':
      return generateReactPreview(code);
    
    case 'vue':
      return generateVuePreview(code);
    
    case 'svelte':
      return generateSveltePreview(code);
    
    default:
      return generateCodePreview(code, language);
  }
};

/**
 * Preview para HTML puro
 */
const generateHTMLPreview = (code) => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTML Live Preview</title>
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

/**
 * Preview para CSS
 */
const generateCSSPreview = (code) => `
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
        * { box-sizing: border-box; }
        
        /* CSS del usuario */
        ${code}
    </style>
</head>
<body>
    <div class="demo-container">
        <h1>CSS Preview</h1>
        <div class="sample-content">
            <p class="text">Este es contenido de ejemplo para mostrar tus estilos CSS.</p>
            <button class="btn button">Botón de Ejemplo</button>
            <div class="card box">
                <h3>Tarjeta de Ejemplo</h3>
                <p>Contenido de la tarjeta para probar estilos.</p>
                <ul class="list">
                    <li class="item">Elemento 1</li>
                    <li class="item">Elemento 2</li>
                    <li class="item">Elemento 3</li>
                </ul>
            </div>
            <input type="text" class="input" placeholder="Campo de entrada">
            <div class="container wrapper">
                <span class="highlight">Texto destacado</span>
            </div>
        </div>
    </div>
</body>
</html>`;

/**
 * Preview para JavaScript
 */
const generateJavaScriptPreview = (code) => `
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
            line-height: 1.6;
        }
        .output { 
            background: white; 
            border: 2px solid #e2e8f0; 
            border-radius: 12px; 
            padding: 20px; 
            margin: 15px 0;
            min-height: 120px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .controls {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        button {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }
        button:hover { 
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .log-entry {
            margin: 8px 0;
            padding: 8px 12px;
            background: #f1f5f9;
            border-radius: 6px;
            border-left: 3px solid #3b82f6;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 14px;
        }
        .error-entry {
            background: #fef2f2;
            border-left-color: #ef4444;
            color: #dc2626;
        }
        h1 {
            color: #1e293b;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <h1>🚀 JavaScript Live Preview</h1>
    
    <div class="controls">
        <button onclick="runCode()">▶️ Ejecutar Código</button>
        <button onclick="clearOutput()">🗑️ Limpiar Output</button>
        <button onclick="runTests()">🧪 Ejecutar Tests</button>
    </div>
    
    <div id="output" class="output">
        <p style="color: #64748b; font-style: italic;">
            ⚡ Presiona "Ejecutar Código" para ver el resultado...
        </p>
    </div>
    
    <script>
        const output = document.getElementById('output');
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        // Interceptar console.log
        console.log = function(...args) {
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = message;
            output.appendChild(entry);
            
            originalLog.apply(console, args);
        };
        
        // Interceptar errores
        console.error = function(...args) {
            const message = args.map(arg => String(arg)).join(' ');
            const entry = document.createElement('div');
            entry.className = 'log-entry error-entry';
            entry.textContent = '❌ Error: ' + message;
            output.appendChild(entry);
            
            originalError.apply(console, args);
        };
        
        // Interceptar warnings
        console.warn = function(...args) {
            const message = args.map(arg => String(arg)).join(' ');
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.style.borderLeftColor = '#eab308';
            entry.style.background = '#fffbeb';
            entry.textContent = '⚠️ Warning: ' + message;
            output.appendChild(entry);
            
            originalWarn.apply(console, args);
        };
        
        function clearOutput() {
            output.innerHTML = '<p style="color: #64748b; font-style: italic;">📝 Output limpiado...</p>';
        }
        
        function runCode() {
            try {
                clearOutput();
                console.log('🚀 Ejecutando código JavaScript...');
                
                // Código del usuario
                ${code}
                
                console.log('✅ Código ejecutado correctamente');
            } catch (error) {
                console.error(error.message);
            }
        }
        
        function runTests() {
            console.log('🧪 Ejecutando tests básicos...');
            
            // Tests automáticos simples
            try {
                // Test de sintaxis
                new Function(${JSON.stringify(code)});
                console.log('✅ Test de sintaxis: PASADO');
                
                // Test de ejecución
                ${code}
                console.log('✅ Test de ejecución: PASADO');
                
            } catch (error) {
                console.error('Test fallido: ' + error.message);
            }
        }
        
        // Auto-ejecutar código seguro
        setTimeout(() => {
            try {
                ${code}
            } catch (e) {
                console.log('⚠️ El código requiere ejecución manual o tiene dependencias');
            }
        }, 500);
        
        // Manejar errores globales
        window.onerror = function(msg, url, line, col, error) {
            console.error(\`Error en línea \${line}: \${msg}\`);
            return true;
        };
    </script>
</body>
</html>`;

/**
 * Preview para React/JSX
 */
const generateReactPreview = (code) => `
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
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            min-height: 200px;
        }
        .error {
            background: #fef2f2;
            border: 2px solid #fecaca;
            color: #dc2626;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            color: #6b7280;
        }
        .loading::before {
            content: '';
            width: 20px;
            height: 20px;
            border: 2px solid #e5e7eb;
            border-top: 2px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 12px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="root" class="react-container">
        <div class="loading">
            Cargando componente React...
        </div>
    </div>
    
    <script type="text/babel">
        const { useState, useEffect, useCallback, useMemo, useRef } = React;
        
        try {
            // Código del componente React
            ${code}
            
            // Renderizar el componente
            const container = document.getElementById('root');
            const root = ReactDOM.createRoot(container);
            
            // Intentar diferentes formas de renderizar
            if (typeof App !== 'undefined') {
                root.render(<App />);
            } else if (typeof Component !== 'undefined') {
                root.render(<Component />);
            } else if (typeof MyComponent !== 'undefined') {
                root.render(<MyComponent />);
            } else {
                // Buscar cualquier componente exportado
                const componentNames = Object.keys(window).filter(key => 
                    typeof window[key] === 'function' && 
                    key[0] === key[0].toUpperCase() &&
                    key !== 'React' && key !== 'ReactDOM'
                );
                
                if (componentNames.length > 0) {
                    const ComponentToRender = window[componentNames[0]];
                    root.render(<ComponentToRender />);
                } else {
                    // Mostrar mensaje de éxito genérico
                    root.render(
                        <div style={{
                            textAlign: 'center', 
                            padding: '40px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '12px',
                            color: 'white'
                        }}>
                            <h2 style={{margin: '0 0 16px 0'}}>🎯 Código React Ejecutado</h2>
                            <p style={{margin: '0 0 20px 0', opacity: 0.9}}>
                                El código se procesó correctamente con Babel.
                            </p>
                            <div style={{
                                background: 'rgba(255,255,255,0.2)',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '14px'
                            }}>
                                💡 <strong>Tip:</strong> Exporta tu componente como 'App', 'Component' 
                                o asígnalo a window.MyComponent para mejor preview.
                            </div>
                        </div>
                    );
                }
            }
            
        } catch (error) {
            const container = document.getElementById('root');
            const root = ReactDOM.createRoot(container);
            
            root.render(
                <div className="error">
                    <h3 style={{margin: '0 0 12px 0'}}>❌ Error en el código React</h3>
                    <p style={{margin: '0 0 16px 0'}}>
                        <strong>Mensaje:</strong> {error.message}
                    </p>
                    <details style={{fontSize: '14px', opacity: 0.8}}>
                        <summary style={{cursor: 'pointer', marginBottom: '8px'}}>
                            Ver detalles del error
                        </summary>
                        <pre style={{
                            background: '#fef2f2',
                            padding: '12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            overflow: 'auto'
                        }}>
                            {error.stack || error.toString()}
                        </pre>
                    </details>
                </div>
            );
        }
    </script>
</body>
</html>`;

/**
 * Preview para Vue.js
 */
const generateVuePreview = (code) => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue.js Live Preview</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
        }
        .vue-container {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
    </style>
</head>
<body>
    <div id="app" class="vue-container">
        <div style="text-align:center; padding:20px; color:#6b7280;">
            🔄 Cargando componente Vue.js...
        </div>
    </div>
    
    <script>
        const { createApp } = Vue;
        
        try {
            ${code}
        } catch (error) {
            document.getElementById('app').innerHTML = 
                '<div style="color:red; padding:20px;">❌ Error en código Vue.js: ' + 
                error.message + '</div>';
        }
    </script>
</body>
</html>`;

/**
 * Preview para Svelte
 */
const generateSveltePreview = (code) => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Svelte Live Preview</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
        }
        .svelte-container {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
    </style>
</head>
<body>
    <div class="svelte-container">
        <h2>📝 Código Svelte</h2>
        <p>Preview de Svelte requiere compilación. Aquí está tu código:</p>
        <pre style="background: #f1f5f9; padding: 16px; border-radius: 8px; overflow: auto;"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
        <p><em>Para previsualizar Svelte completamente, usa el Svelte REPL oficial.</em></p>
    </div>
</body>
</html>`;

/**
 * Preview genérico para mostrar código
 */
const generateCodePreview = (code, language) => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Preview</title>
    <style>
        body { 
            font-family: 'Monaco', 'Consolas', 'SF Mono', monospace;
            margin: 0;
            padding: 20px;
            background: #1e293b;
            color: #e2e8f0;
        }
        .header {
            background: #334155;
            color: #f1f5f9;
            padding: 12px 20px;
            border-radius: 8px 8px 0 0;
            margin-bottom: -1px;
            font-size: 14px;
            font-weight: 600;
        }
        pre {
            background: #0f172a;
            padding: 24px;
            border-radius: 0 0 8px 8px;
            overflow-x: auto;
            border: 1px solid #334155;
            margin: 0;
            line-height: 1.6;
        }
        code {
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        📝 ${language?.toUpperCase() || 'CODE'} Preview
    </div>
    <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
</body>
</html>`;

export default PreviewFrame;