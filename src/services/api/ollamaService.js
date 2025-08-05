// ============================================
// 🏠 OLLAMA LOCAL API SERVICE
// ============================================

/**
 * Llama a la API local de Ollama (Solo para desktop)
 * @param {Array} messages - Array de mensajes del chat
 * @param {string} model - Modelo a usar
 * @returns {Promise} Respuesta de la API
 */
export const callOllamaAPI = async (messages, model = 'llama3.2:3b') => {
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          top_k: 40
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Validar formato de respuesta
    if (!data.message || !data.message.content) {
      throw new Error('Formato de respuesta inválido de Ollama API');
    }

    return {
      content: data.message.content,
      usage: { 
        total_tokens: data.eval_count || 'N/A',
        prompt_tokens: data.prompt_eval_count || 'N/A'
      },
      model: model,
      provider: 'ollama'
    };
  } catch (error) {
    console.error('Error llamando Ollama API:', error);
    throw error;
  }
};

/**
 * Verificar si Ollama está ejecutándose localmente
 * @returns {Promise<boolean>} True si está disponible
 */
export const checkOllamaStatus = async () => {
  try {
    const response = await fetch('http://localhost:11434/api/tags', { 
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch (error) {
    console.error('Ollama no está disponible:', error);
    return false;
  }
};

/**
 * Obtener lista de modelos instalados en Ollama
 * @returns {Promise<Array>} Lista de modelos
 */
export const getOllamaModels = async () => {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Error obteniendo modelos de Ollama');
    }

    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('Error obteniendo modelos de Ollama:', error);
    return [];
  }
};

/**
 * Descargar un modelo en Ollama
 * @param {string} model - Nombre del modelo a descargar
 * @param {Function} onProgress - Callback para progreso de descarga
 * @returns {Promise} Promesa de descarga
 */
export const pullOllamaModel = async (model, onProgress) => {
  try {
    const response = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: model,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Error descargando modelo: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (onProgress && data.status) {
            onProgress(data);
          }
        } catch (parseError) {
          console.warn('Error parsing progress chunk:', parseError);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error descargando modelo de Ollama:', error);
    throw error;
  }
};

/**
 * Generar texto en streaming con Ollama
 * @param {Array} messages - Array de mensajes
 * @param {string} model - Modelo a usar
 * @param {Function} onChunk - Callback para cada chunk
 * @returns {Promise} Promesa del streaming
 */
export const streamOllamaAPI = async (messages, model, onChunk) => {
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama Streaming Error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.message && data.message.content) {
            fullContent += data.message.content;
            onChunk(data.message.content);
          }
        } catch (parseError) {
          console.warn('Error parsing streaming chunk:', parseError);
        }
      }
    }

    return fullContent;
  } catch (error) {
    console.error('Error en streaming de Ollama:', error);
    throw error;
  }
};