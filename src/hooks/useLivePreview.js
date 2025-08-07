// ============================================
// 👁️ LIVE PREVIEW HOOK - CORREGIDO Y FUNCIONAL
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Extrae bloques de código básico de mensajes
 * @param {Array} messages - Mensajes del chat
 * @returns {Array} Bloques de código extraídos
 */
const extractCodeBlocks = (messages = []) => {
  if (!Array.isArray(messages)) return [];

  const codeBlocks = [];
  
  messages.forEach((message, messageIndex) => {
    if (message && message.role === 'assistant' && message.content) {
      const blocks = parseCodeBlocks(message.content, messageIndex);
      codeBlocks.push(...blocks);
    }
  });

  return codeBlocks;
};

/**
 * Parsea bloques de código de un texto
 * @param {string} content - Contenido del mensaje
 * @param {number} messageIndex - Índice del mensaje
 * @returns {Array} Array de bloques de código
 */
const parseCodeBlocks = (content, messageIndex = 0) => {
  if (!content || typeof content !== 'string') return [];

  const codeBlocks = [];
  const regex = /```(\w+)?\n?([\s\S]*?)```/g;
  let match;
  let blockIndex = 0;

  while ((match = regex.exec(content)) !== null) {
    const language = (match[1] || 'text').toLowerCase();
    const code = (match[2] || '').trim();
    
    // Solo incluir código significativo
    if (code.length > 10) {
      codeBlocks.push({
        id: `${messageIndex}-${blockIndex}`,
        language: language,
        code: code,
        messageIndex: messageIndex,
        blockIndex: blockIndex,
        isPreviewable: isPreviewableLanguage(language),
        lineCount: code.split('\n').length,
        charCount: code.length
      });
      blockIndex++;
    }
  }

  return codeBlocks;
};

/**
 * Determina si un lenguaje es previsualizable
 * @param {string} language - Lenguaje de programación
 * @returns {boolean} True si es previsualizable
 */
const isPreviewableLanguage = (language) => {
  if (!language || typeof language !== 'string') return false;
  
  const previewableLanguages = [
    'html',
    'css', 
    'javascript',
    'js',
    'jsx',
    'react',
    'vue',
    'svelte',
    'typescript',
    'ts',
    'tsx'
  ];

  return previewableLanguages.includes(language.toLowerCase());
};

/**
 * Filtra solo bloques previewables
 * @param {Array} codeBlocks - Array de bloques de código
 * @returns {Array} Solo bloques previewables
 */
const getPreviewableBlocks = (codeBlocks = []) => {
  if (!Array.isArray(codeBlocks)) return [];
  return codeBlocks.filter(block => block && block.isPreviewable);
};

/**
 * Hook principal para manejar Live Preview
 * @param {Array} messages - Mensajes del chat
 * @param {boolean} isMobile - Si es dispositivo móvil
 * @returns {Object} Estado y métodos del Live Preview
 */
export const useLivePreview = (messages = [], isMobile = false) => {
  const [showPreview, setShowPreview] = useState(false);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewHistory, setPreviewHistory] = useState([]);

  // ✅ Extraer y procesar bloques de código de forma segura
  const allCodeBlocks = useMemo(() => {
    try {
      return extractCodeBlocks(messages);
    } catch (error) {
      console.warn('Error extrayendo bloques de código:', error);
      return [];
    }
  }, [messages]);

  const previewableBlocks = useMemo(() => {
    try {
      return getPreviewableBlocks(allCodeBlocks);
    } catch (error) {
      console.warn('Error filtrando bloques previewables:', error);
      return [];
    }
  }, [allCodeBlocks]);

  const currentBlock = useMemo(() => {
    if (!Array.isArray(previewableBlocks) || previewableBlocks.length === 0) {
      return null;
    }
    return previewableBlocks[selectedBlockIndex] || previewableBlocks[0] || null;
  }, [previewableBlocks, selectedBlockIndex]);

  const stats = useMemo(() => {
    return {
      totalBlocks: allCodeBlocks.length,
      previewableCount: previewableBlocks.length,
      hasPreviewableCode: previewableBlocks.length > 0
    };
  }, [allCodeBlocks, previewableBlocks]);

  // ✅ Auto-mostrar preview cuando hay código previsualizable (solo en desktop)
  useEffect(() => {
    if (previewableBlocks.length > 0 && !showPreview && !isMobile) {
      setShowPreview(true);
    }
  }, [previewableBlocks.length, showPreview, isMobile]);

  // ✅ Resetear índice si el bloque seleccionado ya no existe
  useEffect(() => {
    if (selectedBlockIndex >= previewableBlocks.length && previewableBlocks.length > 0) {
      setSelectedBlockIndex(0);
    }
  }, [selectedBlockIndex, previewableBlocks.length]);

  // ✅ Guardar historial de previews
  useEffect(() => {
    if (currentBlock) {
      setPreviewHistory(prev => {
        const newHistory = [currentBlock, ...prev.filter(block => block.id !== currentBlock.id)];
        return newHistory.slice(0, 10); // Máximo 10 elementos en historial
      });
    }
  }, [currentBlock]);

  /**
   * Toggle del preview
   */
  const togglePreview = useCallback(() => {
    setShowPreview(prev => !prev);
  }, []);

  /**
   * Seleccionar bloque específico
   */
  const selectBlock = useCallback((index) => {
    if (index >= 0 && index < previewableBlocks.length) {
      setSelectedBlockIndex(index);
    }
  }, [previewableBlocks.length]);

  /**
   * Navegar al siguiente bloque
   */
  const nextBlock = useCallback(() => {
    setSelectedBlockIndex(prev => {
      const nextIndex = prev + 1;
      return nextIndex < previewableBlocks.length ? nextIndex : 0;
    });
  }, [previewableBlocks.length]);

  /**
   * Navegar al bloque anterior
   */
  const previousBlock = useCallback(() => {
    setSelectedBlockIndex(prev => {
      const prevIndex = prev - 1;
      return prevIndex >= 0 ? prevIndex : previewableBlocks.length - 1;
    });
  }, [previewableBlocks.length]);

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  /**
   * Refrescar preview
   */
  const refreshPreview = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  /**
   * Cerrar preview
   */
  const closePreview = useCallback(() => {
    setShowPreview(false);
    setIsFullscreen(false);
  }, []);

  /**
   * Abrir preview con bloque específico
   */
  const openPreviewWithBlock = useCallback((blockId) => {
    const blockIndex = previewableBlocks.findIndex(block => block.id === blockId);
    if (blockIndex !== -1) {
      setSelectedBlockIndex(blockIndex);
      setShowPreview(true);
    }
  }, [previewableBlocks]);

  /**
   * Obtener información del bloque actual
   */
  const getCurrentBlockInfo = useCallback(() => {
    if (!currentBlock) return null;

    return {
      ...currentBlock,
      index: selectedBlockIndex,
      total: previewableBlocks.length,
      position: `${selectedBlockIndex + 1}/${previewableBlocks.length}`
    };
  }, [currentBlock, selectedBlockIndex, previewableBlocks.length]);

  /**
   * Verificar si hay bloques previewables
   */
  const hasPreviewableCode = useMemo(() => {
    return previewableBlocks.length > 0;
  }, [previewableBlocks.length]);

  /**
   * Obtener bloques por lenguaje
   */
  const getBlocksByLanguage = useCallback((language) => {
    if (!language || !Array.isArray(previewableBlocks)) return [];
    
    return previewableBlocks.filter(block => 
      block && block.language && block.language.toLowerCase() === language.toLowerCase()
    );
  }, [previewableBlocks]);

  /**
   * Buscar bloques por contenido
   */
  const searchBlocks = useCallback((searchTerm) => {
    if (!searchTerm || !searchTerm.trim() || !Array.isArray(previewableBlocks)) {
      return previewableBlocks;
    }

    const term = searchTerm.toLowerCase();
    return previewableBlocks.filter(block => 
      (block.language && block.language.toLowerCase().includes(term)) ||
      (block.code && block.code.toLowerCase().includes(term))
    );
  }, [previewableBlocks]);

  return {
    // Estado del preview
    showPreview,
    isFullscreen,
    selectedBlockIndex,
    refreshKey,

    // Datos de los bloques
    allCodeBlocks,
    previewableBlocks,
    currentBlock,
    previewHistory,
    stats,

    // Estado computado
    hasPreviewableCode,
    
    // Métodos de control
    togglePreview,
    closePreview,
    toggleFullscreen,
    refreshPreview,

    // Navegación entre bloques
    selectBlock,
    nextBlock,
    previousBlock,
    openPreviewWithBlock,

    // Información y utilidades
    getCurrentBlockInfo,
    getBlocksByLanguage,
    searchBlocks
  };
};

/**
 * Hook simplificado para solo verificar si hay código previsualizable
 * @param {Array} messages - Mensajes del chat
 * @returns {boolean} True si hay código previsualizable
 */
export const useHasPreviewableCode = (messages = []) => {
  return useMemo(() => {
    try {
      const codeBlocks = extractCodeBlocks(messages);
      const previewableBlocks = getPreviewableBlocks(codeBlocks);
      return previewableBlocks.length > 0;
    } catch (error) {
      console.warn('Error verificando código previsualizable:', error);
      return false;
    }
  }, [messages]);
};

/**
 * Hook para estadísticas de código
 * @param {Array} messages - Mensajes del chat
 * @returns {Object} Estadísticas de código
 */
export const useCodeStats = (messages = []) => {
  return useMemo(() => {
    try {
      const codeBlocks = extractCodeBlocks(messages);
      return {
        totalBlocks: codeBlocks.length,
        previewableCount: getPreviewableBlocks(codeBlocks).length,
        languages: [...new Set(codeBlocks.map(block => block.language))],
        totalLines: codeBlocks.reduce((acc, block) => acc + block.lineCount, 0)
      };
    } catch (error) {
      console.warn('Error calculando estadísticas de código:', error);
      return {
        totalBlocks: 0,
        previewableCount: 0,
        languages: [],
        totalLines: 0
      };
    }
  }, [messages]);
};

// Exportar hooks
export default useLivePreview;