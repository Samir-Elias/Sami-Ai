// ============================================
// 🏆 GOOGLE GEMINI API SERVICE
// ============================================

/**
 * Llama a la API de Google Gemini
 * @param {Array} messages - Array de mensajes del chat
 * @param {string} apiKey - API key de Gemini 
 * @param {string} model - Modelo a usar (opcional)
 * @returns {Promise} Respuesta de la API
 */
export const callGeminiAPI = async (messages, apiKey, model = 'gemini-1.5-flash-latest') => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        generationConfig: { 
          temperature: 0.1, 
          topK: 32, 
          topP: 1, 
          maxOutputTokens: 4096 
        },
        systemInstruction: {
          parts: [{
            text: "Eres un asistente experto en desarrollo de software. Cuando generes código, incluye ejemplos completos y funcionales. Para HTML, CSS y JavaScript, crea código que se pueda ejecutar directamente. Para React, usa componentes funcionales con hooks. Siempre explica el código generado."
          }]
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Validar que la respuesta tenga el formato esperado
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Formato de respuesta inválido de Gemini API');
    }

    return {
      content: data.candidates[0].content.parts[0].text,
      usage: data.usageMetadata || { total_tokens: 'N/A' },
      model: model,
      provider: 'gemini'
    };
  } catch (error) {
    console.error('Error llamando Gemini API:', error);
    throw error;
  }
};

/**
 * Verificar si la API key de Gemini es válida
 * @param {string} apiKey - API key a verificar
 * @returns {Promise<boolean>} True si es válida
 */
export const validateGeminiKey = async (apiKey) => {
  try {
    const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: 'Test' }]
        }],
        generationConfig: { maxOutputTokens: 10 }
      })
    });

    return testResponse.ok;
  } catch (error) {
    console.error('Error validando Gemini API key:', error);
    return false;
  }
};