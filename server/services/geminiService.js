import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

/**
 * Initialize and return the Google GenAI client.
 * Throws a clear error if GEMINI_API_KEY is not set.
 */
export const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

/**
 * Send a minimal test prompt to verify Gemini API connectivity.
 *
 * @param {string} [prompt='Reply with exactly: Gemini connection successful.']
 * @returns {Promise<string>} The model response text.
 */
export const testGeminiConnection = async (
  prompt = 'Reply with exactly: Gemini connection successful.'
) => {
  const ai = getGeminiClient();
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text?.trim() || '';
  } catch (error) {
    // If the primary model encounters a temporary 503 high-demand spike, try a fast backup model
    if (error.message?.includes('503') || error.message?.includes('high demand')) {
      const fallbackModel = 'gemini-2.5-flash-lite';
      const fallbackResponse = await ai.models.generateContent({
        model: fallbackModel,
        contents: prompt,
      });
      return fallbackResponse.text?.trim() || '';
    }
    throw error;
  }
};
