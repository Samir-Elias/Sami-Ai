// ============================================
// 👁️ LIVE PREVIEW HOOK
// ============================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { extractCodeBlocks, getPreviewableBlocks, getCodeBlockStats } from '../components/features/LiveCodePreview/CodeBlockExtractor';

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

  // Extraer y procesar bloques de código
  const allCodeBlocks = useMemo(() => {
    return extractCodeBlocks(messages);
  }, [messages]);

  const previewableBlocks = useMemo(() => {
    return getPreviewableBlocks(allCodeBlocks);
  }, [allCodeBlocks]);

  const currentBlock = useMemo(() => {
    return previewableBlocks[selectedBlockIndex] || null;
  }, [previewableBlocks, selectedBlockIndex]);

  const stats = useMemo(() => {
    return getCodeBlockStats(allCodeBlocks);
  }, [allCodeBlocks]);

  // Auto-mostrar preview cuando hay código previsualizable
  useEffect(() => {
    if (previewableBlocks.length > 0 && !showPreview && !isMobile) {
      setShowPreview(true);
    }
  }, [previewableBlocks.length, showPreview, isMobile]);

  // Resetear índice si el bloque seleccionado ya no existe
  useEffect(() => {
    if (selectedBlockIndex >= previewableBlocks.length && previewableBlocks.length > 0) {
      setSelectedBlockIndex(0);
    }
  }, [selectedBlockIndex, previewableBlocks.length]);

  // Guardar historial de previews
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
    return previewableBlocks.filter(block => 
      block.language.toLowerCase() === language.toLowerCase()
    );
  }, [previewableBlocks]);

  /**
   * Buscar bloques por contenido
   */
  const searchBlocks = useCallback((searchTerm) => {
    if (!searchTerm.trim()) return previewableBlocks;

    const term = searchTerm.toLowerCase();
    return previewableBlocks.filter(block => 
      block.language.toLowerCase().includes(term) ||
      block.code.toLowerCase().includes(term)
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
    const codeBlocks = extractCodeBlocks(messages);
    const previewableBlocks = getPreviewableBlocks(codeBlocks);
    return previewableBlocks.length > 0;
  }, [messages]);
};

/**
 * Hook para estadísticas de código
 * @param {Array} messages - Mensajes del chat
 * @returns {Object} Estadísticas de código
 */
export const useCodeStats = (messages = []) => {
  return useMemo(() => {
    const codeBlocks = extractCodeBlocks(messages);
    return getCodeBlockStats(codeBlocks);
  }, [messages]);
};

/**
 * Hook para navegación de bloques con teclado
 * @param {Object} livePreviewState - Estado del live preview
 * @param {boolean} isActive - Si el preview está activo
 */
export const usePreviewKeyboardNavigation = (livePreviewState, isActive = true) => {
  const { nextBlock, previousBlock, toggleFullscreen, closePreview } = livePreviewState;

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event) => {
      // Solo funcionar si no hay un input activo
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          nextBlock();
          break;
        
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          previousBlock();
          break;
        
        case 'f':
        case 'F':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            toggleFullscreen();
          }
          break;
        
        case 'Escape':
          event.preventDefault();
          closePreview();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextBlock, previousBlock, toggleFullscreen, closePreview]);
};

/**
 * Hook para auto-guardado de preferencias del preview
 * @param {Object} livePreviewState - Estado del live preview
 */
export const useLivePreviewPreferences = (livePreviewState) => {
  const { showPreview, isFullscreen } = livePreviewState;

  // Cargar preferencias guardadas
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem('livePreview-preferences');
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        // Aplicar preferencias si es necesario
        console.log('Preferencias cargadas:', prefs);
      }
    } catch (error) {
      console.warn('Error cargando preferencias del Live Preview:', error);
    }
  }, []);

  // Guardar preferencias cuando cambien
  useEffect(() => {
    try {
      const preferences = {
        showPreview,
        isFullscreen,
        lastUsed: new Date().toISOString()
      };
      localStorage.setItem('livePreview-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Error guardando preferencias del Live Preview:', error);
    }
  }, [showPreview, isFullscreen]);
};

export default useLivePreview;