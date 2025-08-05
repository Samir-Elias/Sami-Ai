// ============================================
// 🤗 HUGGING FACE API SERVICE
// ============================================

/**
 * Llama a la API de Hugging Face (Solo para desktop, no móvil)
 * @param {Array} messages - Array de mensajes del chat
 * @param {string} apiKey - API key de Hugging Face
 * @param {string} model - Modelo a usar
 * @returns {Promise} Respuesta de la API
 */
export const callHuggingFaceAPI = async (messages, apiKey, model = 'microsoft/DialoGPT-medium') => {
  try {
    const lastMessage = messages[messages.length - 1];
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: lastMessage.content,
        parameters: {
          max_length: 1000,
          temperature: 0.7,
          do_sample: true,
          pad_token_id: 50256
        },
        options: {
          wait_for_model: true,
          use_cache: false
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HuggingFace API Error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    // Manejar diferentes formatos de respuesta de HF
    let content = '';
    if (Array.isArray(data)) {
      content = data[0]?.generated_text || data[0]?.text || 'Error generando respuesta';
    } else {
      content = data.generated_text || data.text || 'Error generando respuesta';
    }

    // Limpiar la respuesta si incluye el input original
    if (content.startsWith(lastMessage.content)) {
      content = content.substring(lastMessage.content.length).trim();
    }

    return {
      content: content || 'Error generando respuesta',
      usage: { total_tokens: 'N/A' },
      model: model,
      provider: 'huggingface'
    };
  } catch (error) {
    console.error('Error llamando HuggingFace API:', error);
    throw error;
  }
};

/**
 * Verificar si la API key de Hugging Face es válida
 * @param {string} apiKey - API key a verificar
 * @returns {Promise<boolean>} True si es válida
 */
export const validateHuggingFaceKey = async (apiKey) => {
  try {
    const testResponse = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: 'Test',
        parameters: { max_length: 10 }
      })
    });

    return testResponse.ok;
  } catch (error) {
    console.error('Error validando HuggingFace API key:', error);
    return false;
  }
};

/**
 * Verificar el estado de un modelo en Hugging Face
 * @param {string} model - Nombre del modelo
 * @param {string} apiKey - API key de Hugging Face
 * @returns {Promise<Object>} Estado del modelo
 */
export const checkModelStatus = async (model, apiKey) => {
  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Error verificando estado del modelo');
    }

    const data = await response.json();
    return {
      loaded: !data.error,
      estimatedTime: data.estimated_time || 0,
      error: data.error || null
    };
  } catch (error) {
    console.error('Error verificando estado del modelo:', error);
    return { loaded: false, estimatedTime: 0, error: error.message };
  }
};