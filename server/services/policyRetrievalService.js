import PolicyChunk from '../models/policyChunkModel.js';
import { generateEmbedding, cosineSimilarity } from './embeddingService.js';

/**
 * Retrieve the most relevant policy sections for a natural-language query using vector cosine similarity.
 *
 * @param {string} query - Natural language policy question or expense description.
 * @param {number} [topK=3] - Number of top relevant policy sections to return.
 * @returns {Promise<Array<Object>>} Ranked relevant policy sections with similarity scores.
 */
export const retrievePolicy = async (query, topK = 3) => {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Query string is required for policy retrieval');
  }

  const cleanQuery = query.trim();
  const parsedTopK = Math.max(1, parseInt(topK, 10) || 3);

  // 1. Generate query embedding vector
  const queryEmbedding = await generateEmbedding(cleanQuery);

  // 2. Fetch all stored policy chunks from MongoDB
  const chunks = await PolicyChunk.find().lean();

  if (!chunks || chunks.length === 0) {
    throw new Error('No policy sections found in database. Please run policy ingestion first.');
  }

  // 3. Compute cosine similarity for each chunk against the query embedding
  const scoredChunks = chunks.map((chunk) => {
    const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
    return {
      sectionId: chunk.sectionId,
      sectionTitle: chunk.sectionTitle,
      text: chunk.text,
      similarity: parseFloat(similarity.toFixed(4)),
      source: chunk.source || 'expense-policy.md',
    };
  });

  // 4. Sort descending by similarity score
  scoredChunks.sort((a, b) => b.similarity - a.similarity);

  // 5. Return topK results
  return scoredChunks.slice(0, parsedTopK);
};
