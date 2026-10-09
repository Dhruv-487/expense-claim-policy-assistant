import mongoose from 'mongoose';

export const AUDIT_ACTIONS = [
  'CLAIM_CREATED',
  'CLAIM_VALIDATED',
  'AI_REVIEWED',
  'REVIEWER_DECISION',
  'CLARIFICATION_RESPONDED',
];

export const AUDIT_ACTOR_TYPES = ['SYSTEM', 'REVIEWER', 'EMPLOYEE'];

const auditLogSchema = new mongoose.Schema(
  {
    claimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Claim',
      required: [true, 'Claim ID is required'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: {
        values: AUDIT_ACTIONS,
        message: '{VALUE} is not a supported audit action',
      },
    },
    actorType: {
      type: String,
      required: [true, 'Actor type is required'],
      enum: {
        values: AUDIT_ACTOR_TYPES,
        message: '{VALUE} is not a valid actor type',
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    previousStatus: {
      type: String,
      default: null,
    },
    newStatus: {
      type: String,
      default: null,
    },
    decision: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: null,
      trim: true,
    },
    override: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound index for querying audit history by claim sorted by timestamp
auditLogSchema.index({ claimId: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
