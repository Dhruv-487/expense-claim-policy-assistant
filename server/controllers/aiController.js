import { testGeminiConnection } from '../services/geminiService.js';

/**
 * GET /api/ai/test
 *
 * Temporary endpoint verifying Google Gemini API connectivity.
 */
export const testAiConnection = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_API_KEY.trim()) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY is not configured',
      });
    }

    const message = await testGeminiConnection('Reply with exactly: Gemini connection successful.');

    return res.status(200).json({
      success: true,
      message: message || 'Gemini connection successful.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Gemini API connection error',
    });
  }
};
