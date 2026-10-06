import mongoose from 'mongoose';

const policyChunkSchema = new mongoose.Schema(
  {
    sectionId: {
      type: String,
      required: [true, 'Section ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    sectionTitle: {
      type: String,
      required: [true, 'Section title is required'],
      trim: true,
    },
    text: {
      type: String,
      required: [true, 'Section text content is required'],
      trim: true,
    },
    source: {
      type: String,
      default: 'expense-policy.md',
      trim: true,
    },
    embedding: {
      type: [Number],
      required: [true, 'Embedding vector is required'],
    },
  },
  {
    timestamps: true,
  }
);

const PolicyChunk = mongoose.model('PolicyChunk', policyChunkSchema);

export default PolicyChunk;
