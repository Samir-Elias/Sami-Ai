// ============================================
// 📝 MESSAGE RENDERER UTILITY
// ============================================

import React from 'react';

/**
 * Renderiza el contenido de mensajes con código syntax highlighting
 * @param {string} content - Contenido del mensaje
 * @returns {JSX.Element} Contenido renderizado
 */
export const renderMessageContent = (content) => {
  if (!content) return null;

  // Dividir el contenido en partes: texto normal y bloques de código
  const parts = content.split(/(```[\s\S]*?```)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      return renderCodeBlock(part, index);
    }
    
    return renderTextBlock(part, index);
  });
};

/**
 * Renderiza un bloque de código con syntax highlighting
 * @param {string} codeBlock - Bloque de código con markdown
 * @param {number} index - Índice para key de React
 * @returns {JSX.Element} Bloque de código renderizado
 */
const renderCodeBlock = (codeBlock, index) => {
  const lines = codeBlock.split('\n');
  const language = lines[0].replace('```', '').trim();
  const code = lines.slice(1, -1).join('\n');

  if (!code.trim()) return null;

  return (
    <div key={index} style={{
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '16px',
      margin: '8px 0',
      fontFamily: 'Monaco, Consolas, "SF Mono", "Roboto Mono", monospace',
      fontSize: '14px',
      overflow: 'auto',
      position: 'relative'
    }}>
      {/* Header con lenguaje y botón copiar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <div style={{
          color: '#94a3b8',
          fontSize: '12px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {getLanguageLabel(language)}
        </div>
        
        <button
          onClick={() => copyToClipboard(code)}
          style={{
            padding: '4px 8px',
            backgroundColor: 'rgba(148, 163, 184, 0.1)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '4px',
            color: '#94a3b8',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(148, 163, 184, 0.2)';
            e.target.style.color = '#e2e8f0';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(148, 163, 184, 0.1)';
            e.target.style.color = '#94a3b8';
          }}
          title="Copiar código"
        >
          📋 Copiar
        </button>
      </div>

      {/* Código con syntax highlighting básico */}
      <pre style={{ 
        margin: 0, 
        whiteSpace: 'pre-wrap', 
        color: '#e2e8f0',
        lineHeight: '1.5'
      }}>
        <code>{applySyntaxHighlighting(code, language)}</code>
      </pre>
    </div>
  );
};

/**
 * Renderiza un bloque de texto normal con markdown básico
 * @param {string} text - Texto a renderizar
 * @param {number} index - Índice para key de React
 * @returns {JSX.Element} Texto renderizado
 */
const renderTextBlock = (text, index) => {
  if (!text.trim()) return null;

  // Procesar markdown básico
  const processedText = processBasicMarkdown(text);

  return (
    <div 
      key={index} 
      style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
      dangerouslySetInnerHTML={{ __html: processedText }}
    />
  );
};

/**
 * Procesa markdown básico (bold, italic, links, headers, listas)
 * @param {string} text - Texto con markdown
 * @returns {string} HTML procesado
 */
const processBasicMarkdown = (text) => {
  let html = text;

  // Headers (### ## #)
  html = html.replace(/^### (.*$)/gim, '<h3 style="margin: 16px 0 8px 0; color: #f3f4f6; font-size: 18px; font-weight: 600;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="margin: 20px 0 12px 0; color: #f3f4f6; font-size: 20px; font-weight: 600;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="margin: 24px 0 16px 0; color: #f3f4f6; font-size: 24px; font-weight: 700;">$1</h1>');

  // Bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #f3f4f6; font-weight: 600;">$1</strong>');

  // Italic *text*
  html = html.replace(/\*(.*?)\*/g, '<em style="color: #d1d5db;">$1</em>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">$1</a>');

  // Listas simples - texto que empieza con dash
  html = html.replace(/^- (.*$)/gim, '<div style="margin: 4px 0; padding-left: 16px;">• $1</div>');

  // Texto en línea con `backticks`
  html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(15, 23, 42, 0.5); padding: 2px 4px; border-radius: 3px; font-family: Monaco, Consolas, monospace; font-size: 13px; color: #e2e8f0;">$1</code>');

  return html;
};

/**
 * Aplica syntax highlighting básico según el lenguaje
 * @param {string} code - Código a destacar
 * @param {string} language - Lenguaje de programación
 * @returns {JSX.Element} Código con highlighting
 */
const applySyntaxHighlighting = (code, language) => {
  // Por simplicidad, aplicamos highlighting básico con spans
  // En una implementación completa usarías una librería como Prism.js
  
  if (!language) return code;

  const lang = language.toLowerCase();
  
  if (['javascript', 'js', 'jsx', 'typescript', 'ts'].includes(lang)) {
    return highlightJavaScript(code);
  }
  
  if (['html', 'xml'].includes(lang)) {
    return highlightHTML(code);
  }
  
  if (lang === 'css') {
    return highlightCSS(code);
  }
  
  if (['python', 'py'].includes(lang)) {
    return highlightPython(code);
  }

  return code;
};

/**
 * Highlighting para JavaScript/TypeScript
 */
const highlightJavaScript = (code) => {
  let highlighted = code;
  
  // Keywords
  const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'class', 'extends', 'async', 'await', 'try', 'catch'];
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    highlighted = highlighted.replace(regex, `<span style="color: #c792ea; font-weight: 500;">${keyword}</span>`);
  });

  // Strings
  highlighted = highlighted.replace(/(["'`])((?:(?!\1)[^\\]|\\.)*)(\1)/g, '<span style="color: #a3e635;">$1$2$3</span>');
  
  // Comments
  highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span style="color: #64748b; font-style: italic;">$1</span>');
  highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color: #64748b; font-style: italic;">$1</span>');

  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
};

/**
 * Highlighting para HTML
 */
const highlightHTML = (code) => {
  let highlighted = code;
  
  // Tags
  highlighted = highlighted.replace(/(&lt;\/?)([\w-]+)(.*?)(&gt;)/g, 
    '<span style="color: #64748b;">$1</span><span style="color: #f472b6; font-weight: 500;">$2</span><span style="color: #38bdf8;">$3</span><span style="color: #64748b;">$4</span>'
  );

  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
};

/**
 * Highlighting para CSS
 */
const highlightCSS = (code) => {
  let highlighted = code;
  
  // Properties
  highlighted = highlighted.replace(/([a-zA-Z-]+)(\s*:)/g, '<span style="color: #38bdf8;">$1</span><span style="color: #64748b;">$2</span>');
  
  // Values
  highlighted = highlighted.replace(/(:\s*)([^;{]+)(;?)/g, '$1<span style="color: #a3e635;">$2</span><span style="color: #64748b;">$3</span>');

  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
};

/**
 * Highlighting para Python
 */
const highlightPython = (code) => {
  let highlighted = code;
  
  // Keywords
  const keywords = ['def', 'class', 'import', 'from', 'if', 'elif', 'else', 'for', 'while', 'return', 'try', 'except', 'with', 'as'];
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    highlighted = highlighted.replace(regex, `<span style="color: #c792ea; font-weight: 500;">${keyword}</span>`);
  });

  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
};

/**
 * Obtiene el label del lenguaje de programación
 * @param {string} language - Código del lenguaje
 * @returns {string} Label legible
 */
const getLanguageLabel = (language) => {
  const labels = {
    'js': 'JavaScript',
    'jsx': 'React JSX',
    'ts': 'TypeScript',
    'tsx': 'TypeScript JSX',
    'html': 'HTML',
    'css': 'CSS',
    'python': 'Python',
    'py': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'php': 'PHP',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'dart': 'Dart',
    'vue': 'Vue.js',
    'svelte': 'Svelte',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'md': 'Markdown',
    'sh': 'Shell',
    'bash': 'Bash',
    'sql': 'SQL'
  };

  return labels[language?.toLowerCase()] || language?.toUpperCase() || 'CODE';
};

/**
 * Copia texto al portapapeles
 * @param {string} text - Texto a copiar
 */
const copyToClipboard = (text) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Código copiado al portapapeles');
      // Aquí podrías mostrar una notificación
    }).catch(err => {
      console.error('Error copiando al portapapeles:', err);
    });
  } else {
    // Fallback para navegadores más antiguos
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      console.log('Código copiado al portapapeles (fallback)');
    } catch (err) {
      console.error('Error copiando al portapapeles (fallback):', err);
    }
    document.body.removeChild(textArea);
  }
};

/**
 * Extrae bloques de código del contenido del mensaje
 * @param {string} content - Contenido del mensaje
 * @returns {Array} Array de objetos con language y code
 */
export const extractCodeBlocks = (content) => {
  if (!content) return [];

  const codeBlocks = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const language = match[1] || 'text';
    const code = match[2].trim();
    
    if (code.length > 10) { // Solo código significativo
      codeBlocks.push({ language, code });
    }
  }

  return codeBlocks;
};