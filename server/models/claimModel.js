import mongoose from 'mongoose';

export const CLAIM_CATEGORIES = [
  'Travel',
  'Meals & Entertainment',
  'Equipment',
  'Office Supplies',
  'Training',
  'Medical',
  'Other',
];

export const CLAIM_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'UNDER_REVIEW'];

export const CLAIM_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

const claimSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    claimant: {
      type: String,
      required: [true, 'Claimant name is required'],
      trim: true,
      minlength: [2, 'Claimant name must be at least 2 characters long'],
      maxlength: [100, 'Claimant name cannot exceed 100 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Claim date is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: CLAIM_CATEGORIES,
        message: '{VALUE} is not a supported category',
      },
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'INR',
      trim: true,
      uppercase: true,
      enum: {
        values: CLAIM_CURRENCIES,
        message: '{VALUE} is not a supported currency',
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [5, 'Description must be at least 5 characters long'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    receiptAvailable: {
      type: Boolean,
      required: [true, 'receiptAvailable is required'],
    },
    status: {
      type: String,
      default: 'PENDING',
      enum: {
        values: CLAIM_STATUSES,
        message: '{VALUE} is not a valid status',
      },
      uppercase: true,
      trim: true,
    },
    validationResults: {
      valid: { type: Boolean, default: null },
      issues: [
        {
          rule: { type: String },
          severity: { type: String, enum: ['ERROR', 'WARNING', 'INFO'] },
          message: { type: String },
          _id: false,
        },
      ],
      warnings: [
        {
          rule: { type: String },
          severity: { type: String, enum: ['ERROR', 'WARNING', 'INFO'] },
          message: { type: String },
          _id: false,
        },
      ],
      checks: {
        requiredFields: { type: Boolean, default: null },
        amount: { type: Boolean, default: null },
        categoryLimit: { type: Boolean, default: null },
        receipt: { type: Boolean, default: null },
        date: { type: Boolean, default: null },
        duplicate: { type: Boolean, default: null },
      },
      validatedAt: { type: Date, default: null },
    },
    aiReview: {
      provider: { type: String, default: 'google' },
      model: { type: String, default: null },
      reviewedAt: { type: Date, default: null },
      classification: {
        category: { type: String },
        confidence: { type: Number },
        uncertain: { type: Boolean },
        _id: false,
      },
      reviewStatus: {
        type: String,
        enum: ['COMPLIANT', 'NON_COMPLIANT', 'NEEDS_CLARIFICATION', 'UNCERTAIN'],
      },
      reason: { type: String },
      missingInformation: [{ type: String }],
      policyEvidence: [
        {
          sectionId: { type: String },
          sectionTitle: { type: String },
          text: { type: String },
          _id: false,
        },
      ],
    },
    reviewerDecision: {
      decision: {
        type: String,
        enum: ['APPROVED', 'REJECTED', 'CLARIFICATION_REQUESTED', 'OVERRIDDEN'],
      },
      notes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Reviewer notes cannot exceed 2000 characters'],
      },
      overrideStatus: {
        type: String,
        enum: ['APPROVED', 'REJECTED'],
      },
      previousStatus: { type: String },
      previousAIReviewStatus: { type: String },
      override: { type: Boolean, default: false },
      decidedAt: { type: Date },
    },
    clarification: {
      requested: { type: Boolean, default: false },
      message: { type: String, default: null },
      requestedAt: { type: Date, default: null },
      requestedBy: {
        reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        reviewerName: { type: String, default: null },
      },
      response: { type: String, default: null },
      respondedAt: { type: Date, default: null },
      resolved: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Indexing for faster retrieval sorted by newest first
claimSchema.index({ createdAt: -1 });

const Claim = mongoose.model('Claim', claimSchema);

export default Claim;
