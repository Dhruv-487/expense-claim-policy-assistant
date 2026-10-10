import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import { ingestPolicy } from '../services/policyIngestionService.js';

const run = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    // Verify connection state
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection failed. Please check MONGODB_URI in server/.env');
    }

    const result = await ingestPolicy();
    console.log('\n Policy ingestion finished successfully:');
    console.log(`- Total policy sections: ${result.totalChunks}`);
    console.log(`- Upserted (new): ${result.upsertedCount}`);
    console.log(`- Modified (updated): ${result.modifiedCount}`);
    console.log(`- Matched (unchanged): ${result.matchedCount}`);
    console.log(`- Duration: ${result.durationMs}ms`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Policy ingestion failed:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

run();
