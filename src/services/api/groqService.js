// ============================================
// ⚡ GROQ API SERVICE
// ============================================

/**
 * Llama a la API de Groq
 * @param {Array} messages - Array de mensajes del chat
 * @param {string} apiKey - API key de Groq
 * @param {string} model - Modelo a usar
 * @returns {Promise} Respuesta de la API
 */
export const callGroqAPI = async (messages, apiKey, model = 'llama3-8b-8192') => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente experto en desarrollo de software. Analiza código, encuentra bugs, sugiere optimizaciones y explica conceptos técnicos de manera clara.'
          },
          ...messages
        ],
        model: model,
        temperature: 0.1,
        max_tokens: 4096,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Validar formato de respuesta
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Formato de respuesta inválido de Groq API');
    }

    return {
      content: data.choices[0].message.content,
      usage: data.usage || { total_tokens: 'N/A' },
      model: data.model || model,
      provider: 'groq'
    };
  } catch (error) {
    console.error('Error llamando Groq API:', error);
    throw error;
  }
};

/**
 * Verificar si la API key de Groq es válida
 * @param {string} apiKey - API key a verificar
 * @returns {Promise<boolean>} True si es válida
 */
export const validateGroqKey = async (apiKey) => {
  try {
    const testResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Test' }],
        model: 'llama3-8b-8192',
        max_tokens: 1
      })
    });

    return testResponse.ok;
  } catch (error) {
    console.error('Error validando Groq API key:', error);
    return false;
  }
};

/**
 * Obtener modelos disponibles en Groq
 * @param {string} apiKey - API key de Groq
 * @returns {Promise<Array>} Lista de modelos disponibles
 */
export const getGroqModels = async (apiKey) => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error obteniendo modelos de Groq');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error obteniendo modelos de Groq:', error);
    return [];
  }
};