import PolicyChunk from '../models/policyChunkModel.js';
import { loadPolicyChunks } from './policyLoaderService.js';
import { generateEmbedding } from './embeddingService.js';

/**
 * Ingest the expense policy document into the MongoDB vector store.
 *
 * Steps:
 * 1. Load and section-chunk the policy markdown file.
 * 2. Generate embeddings for each chunk using all-MiniLM-L6-v2.
 * 3. Idempotently upsert chunks into MongoDB using sectionId as the unique key.
 *
 * @param {string} [filePath] Optional custom policy file path.
 * @returns {Promise<Object>} Summary of ingestion result.
 */
export const ingestPolicy = async (filePath) => {
  const startTime = Date.now();
  console.log('--- Starting Policy Ingestion ---');

  // Step 1: Load section-aware chunks
  const chunks = loadPolicyChunks(filePath);
  console.log(`Loaded ${chunks.length} sections from policy document.`);

  if (chunks.length === 0) {
    throw new Error('No policy sections found to ingest.');
  }

  // Step 2 & 3: Generate embeddings and build upsert operations
  const operations = [];
  let processed = 0;

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.text);
    processed++;

    if (processed % 5 === 0 || processed === chunks.length) {
      console.log(`Embedded ${processed}/${chunks.length} sections...`);
    }

    operations.push({
      updateOne: {
        filter: { sectionId: chunk.sectionId },
        update: {
          $set: {
            sectionId: chunk.sectionId,
            sectionTitle: chunk.sectionTitle,
            text: chunk.text,
            source: chunk.source,
            embedding,
          },
        },
        upsert: true,
      },
    });
  }

  // Execute atomic idempotent bulk write
  const result = await PolicyChunk.bulkWrite(operations);
  const totalInDb = await PolicyChunk.countDocuments();
  const durationMs = Date.now() - startTime;

  console.log('--- Ingestion Complete ---');
  console.log(`Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}, Matched: ${result.matchedCount}`);
  console.log(`Total active policy chunks in database: ${totalInDb} (completed in ${durationMs}ms)`);

  return {
    success: true,
    totalChunks: chunks.length,
    upsertedCount: result.upsertedCount,
    modifiedCount: result.modifiedCount,
    matchedCount: result.matchedCount,
    totalInDb,
    durationMs,
  };
};
