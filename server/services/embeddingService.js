import { pipeline } from '@xenova/transformers';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// Singleton instance to prevent reloading weights on every call
let extractorPromise = null;

/**
 * Get or initialize the feature-extraction pipeline singleton.
 */
const getExtractor = async () => {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL_NAME);
  }
  return extractorPromise;
};

/**
 * Generate a 384-dimensional normalized embedding vector for a given text.
 *
 * @param {string} text - Input text string.
 * @returns {Promise<Array<number>>} Normalised embedding vector.
 */
export const generateEmbedding = async (text) => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('Text input is required for generating embeddings');
  }

  const extractor = await getExtractor();
  const output = await extractor(text.trim(), {
    pooling: 'mean',
    normalize: true,
  });

  return Array.from(output.data);
};

/**
 * Generate embeddings for an array of texts or structured chunks.
 *
 * @param {Array<string|Object>} items - Array of text strings or chunk objects containing a .text property.
 * @returns {Promise<Array<Array<number>>>} Array of embedding vectors.
 */
export const generateEmbeddings = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const embeddings = [];
  for (const item of items) {
    const text = typeof item === 'string' ? item : item.text;
    const vector = await generateEmbedding(text);
    embeddings.push(vector);
  }
  return embeddings;
};

/**
 * Compute the cosine similarity between two numeric vectors.
 * Returns a value between -1.0 and 1.0 (typically 0.0 to 1.0 for normalized text embeddings).
 *
 * @param {Array<number>} vecA
 * @param {Array<number>} vecB
 * @returns {number} Cosine similarity score
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
};
