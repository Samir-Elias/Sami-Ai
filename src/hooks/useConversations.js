// ============================================
// 💬 CONVERSATIONS HOOK
// ============================================

import { useState, useCallback, useEffect } from 'react';

/**
 * Hook para manejar conversaciones y su persistencia
 * @returns {Object} Métodos y estado de conversaciones
 */
export const useConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar conversaciones del localStorage al inicializar
  useEffect(() => {
    try {
      const savedConversations = localStorage.getItem('devai-conversations');
      if (savedConversations) {
        const parsed = JSON.parse(savedConversations);
        setConversations(parsed.map(conv => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: conv.updatedAt ? new Date(conv.updatedAt) : new Date(conv.createdAt)
        })));
      }
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
    }
  }, []);

  // Guardar conversaciones en localStorage cuando cambien
  useEffect(() => {
    if (conversations.length > 0) {
      try {
        localStorage.setItem('devai-conversations', JSON.stringify(conversations));
      } catch (error) {
        console.error('Error guardando conversaciones:', error);
      }
    }
  }, [conversations]);

  /**
   * Crear una nueva conversación
   */
  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
  }, []);

  /**
   * Guardar o actualizar una conversación
   * @param {Array} messages - Mensajes de la conversación
   * @param {Object} metadata - Metadatos adicionales
   */
  const saveConversation = useCallback((messages, metadata = {}) => {
    if (!messages || messages.length === 0) return;

    setIsLoading(true);

    try {
      const now = new Date();
      const firstUserMessage = messages.find(msg => msg.role === 'user');
      const lastMessage = messages[messages.length - 1];

      const conversation = {
        id: currentConversationId || now.getTime(),
        title: generateConversationTitle(firstUserMessage?.content) || 'Nueva conversación',
        preview: generatePreview(lastMessage?.content) || '',
        messages: messages,
        messageCount: messages.length,
        createdAt: currentConversationId ? 
          conversations.find(c => c.id === currentConversationId)?.createdAt || now : now,
        updatedAt: now,
        metadata: {
          provider: metadata.provider || 'unknown',
          model: metadata.model || 'unknown',
          totalTokens: metadata.totalTokens || 0,
          ...metadata
        }
      };

      setConversations(prev => {
        const existing = prev.find(conv => conv.id === conversation.id);
        if (existing) {
          // Actualizar conversación existente
          return prev.map(conv => 
            conv.id === conversation.id ? conversation : conv
          );
        }
        // Agregar nueva conversación al inicio
        return [conversation, ...prev].slice(0, 50); // Límite de 50 conversaciones
      });

      setCurrentConversationId(conversation.id);
    } catch (error) {
      console.error('Error guardando conversación:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentConversationId, conversations]);

  /**
   * Cargar una conversación existente
   * @param {Object} conversation - Conversación a cargar
   */
  const loadConversation = useCallback((conversation) => {
    setCurrentConversationId(conversation.id);
  }, []);

  /**
   * Eliminar una conversación
   * @param {number} id - ID de la conversación a eliminar
   */
  const deleteConversation = useCallback((id) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    
    if (currentConversationId === id) {
      setCurrentConversationId(null);
    }
  }, [currentConversationId]);

  /**
   * Obtener una conversación por ID
   * @param {number} id - ID de la conversación
   * @returns {Object|null} Conversación encontrada
   */
  const getConversationById = useCallback((id) => {
    return conversations.find(conv => conv.id === id) || null;
  }, [conversations]);

  /**
   * Buscar conversaciones por término
   * @param {string} searchTerm - Término de búsqueda
   * @returns {Array} Conversaciones que coinciden
   */
  const searchConversations = useCallback((searchTerm) => {
    if (!searchTerm.trim()) return conversations;

    const term = searchTerm.toLowerCase();
    return conversations.filter(conv => 
      conv.title.toLowerCase().includes(term) ||
      conv.preview.toLowerCase().includes(term) ||
      conv.messages.some(msg => msg.content.toLowerCase().includes(term))
    );
  }, [conversations]);

  /**
   * Obtener estadísticas de conversaciones
   * @returns {Object} Estadísticas
   */
  const getStats = useCallback(() => {
    const total = conversations.length;
    const totalMessages = conversations.reduce((acc, conv) => acc + conv.messageCount, 0);
    const avgMessagesPerConv = total > 0 ? Math.round(totalMessages / total) : 0;
    
    const providers = conversations.reduce((acc, conv) => {
      const provider = conv.metadata?.provider || 'unknown';
      acc[provider] = (acc[provider] || 0) + 1;
      return acc;
    }, {});

    const mostUsedProvider = Object.entries(providers)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    return {
      totalConversations: total,
      totalMessages,
      avgMessagesPerConversation: avgMessagesPerConv,
      providers,
      mostUsedProvider
    };
  }, [conversations]);

  /**
   * Exportar conversaciones como JSON
   * @returns {string} JSON de las conversaciones
   */
  const exportConversations = useCallback(() => {
    return JSON.stringify(conversations, null, 2);
  }, [conversations]);

  /**
   * Importar conversaciones desde JSON
   * @param {string} jsonData - Datos JSON
   * @returns {boolean} Éxito de la importación
   */
  const importConversations = useCallback((jsonData) => {
    try {
      const imported = JSON.parse(jsonData);
      if (!Array.isArray(imported)) {
        throw new Error('Formato inválido');
      }

      const validConversations = imported
        .filter(conv => conv.id && conv.messages && Array.isArray(conv.messages))
        .map(conv => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: conv.updatedAt ? new Date(conv.updatedAt) : new Date(conv.createdAt)
        }));

      setConversations(prev => {
        // Evitar duplicados por ID
        const existingIds = new Set(prev.map(c => c.id));
        const newConversations = validConversations.filter(c => !existingIds.has(c.id));
        return [...prev, ...newConversations].slice(0, 100); // Límite de 100
      });

      return true;
    } catch (error) {
      console.error('Error importando conversaciones:', error);
      return false;
    }
  }, []);

  /**
   * Limpiar conversaciones antiguas
   * @param {number} daysOld - Días de antigüedad para eliminar
   */
  const cleanOldConversations = useCallback((daysOld = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    setConversations(prev => 
      prev.filter(conv => conv.updatedAt > cutoffDate)
    );
  }, []);

  return {
    // Estado
    conversations,
    currentConversationId,
    isLoading,

    // Métodos principales
    startNewConversation,
    saveConversation,
    loadConversation,
    deleteConversation,

    // Métodos de consulta
    getConversationById,
    searchConversations,
    getStats,

    // Métodos de import/export
    exportConversations,
    importConversations,

    // Utilidades
    cleanOldConversations
  };
};

/**
 * Generar título para una conversación basado en el primer mensaje
 * @param {string} content - Contenido del primer mensaje
 * @returns {string} Título generado
 */
const generateConversationTitle = (content) => {
  if (!content) return 'Nueva conversación';

  // Limpiar y truncar
  let title = content
    .replace(/```[\s\S]*?```/g, '[código]') // Reemplazar bloques de código
    .replace(/\n+/g, ' ') // Reemplazar saltos de línea
    .trim();

  // Truncar a 50 caracteres
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }

  return title || 'Nueva conversación';
};

/**
 * Generar preview para una conversación basado en el último mensaje
 * @param {string} content - Contenido del último mensaje
 * @returns {string} Preview generado
 */
const generatePreview = (content) => {
  if (!content) return '';

  // Limpiar y truncar
  let preview = content
    .replace(/```[\s\S]*?```/g, '[código]') // Reemplazar bloques de código
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remover markdown bold
    .replace(/\*(.*?)\*/g, '$1') // Remover markdown italic
    .replace(/\n+/g, ' ') // Reemplazar saltos de línea
    .trim();

  // Truncar a 100 caracteres
  if (preview.length > 100) {
    preview = preview.substring(0, 97) + '...';
  }

  return preview;
};

/**
 * Hook simplificado para solo obtener conversaciones
 * @returns {Array} Lista de conversaciones
 */
export const useConversationsList = () => {
  const { conversations } = useConversations();
  return conversations;
};

/**
 * Hook para manejar la conversación actual
 * @returns {Object} Conversación actual y métodos
 */
export const useCurrentConversation = () => {
  const { 
    currentConversationId, 
    getConversationById, 
    startNewConversation,
    loadConversation 
  } = useConversations();

  const currentConversation = currentConversationId ? 
    getConversationById(currentConversationId) : null;

  return {
    currentConversation,
    currentConversationId,
    startNewConversation,
    loadConversation
  };
};