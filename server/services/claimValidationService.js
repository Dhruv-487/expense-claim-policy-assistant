import Claim from '../models/claimModel.js';

/**
 * INR category spending limits (in ₹).
 * These apply ONLY to INR-denominated claims.
 */
export const CATEGORY_LIMITS_INR = {
  'Travel': 10000,
  'Meals & Entertainment': 2000,
  'Equipment': 15000,
  'Office Supplies': 5000,
  'Training': 10000,
  'Medical': 5000,
  'Other': 5000,
};

/** Rule-name constants keep things typo-safe across the codebase. */
export const RULES = {
  REQUIRED_FIELDS: 'REQUIRED_FIELDS',
  AMOUNT_POSITIVE: 'AMOUNT_POSITIVE',
  CATEGORY_LIMIT: 'CATEGORY_LIMIT',
  RECEIPT_MISSING: 'RECEIPT_MISSING',
  DATE_INVALID: 'DATE_INVALID',
  DATE_FUTURE: 'DATE_FUTURE',
  DUPLICATE_CLAIM: 'DUPLICATE_CLAIM',
};

/** Severities */
const ERROR = 'ERROR';
const WARNING = 'WARNING';

/**
 * Build the initial checks scaffold (all null = not yet evaluated).
 */
const initChecks = () => ({
  requiredFields: null,
  amount: null,
  categoryLimit: null,
  receipt: null,
  date: null,
  duplicate: null,
});

/* ────────────────────────────────────────────────────────────
   Individual rule evaluators.
   Each receives the claim object and the shared result buckets.
   ──────────────────────────────────────────────────────────── */

/**
 * Rule A: Required fields must be present and non-empty.
 */
function checkRequiredFields(claim, issues, checks) {
  const REQUIRED = ['claimant', 'date', 'category', 'amount', 'currency', 'description'];
  const missing = [];

  for (const field of REQUIRED) {
    const val = claim[field];
    if (val === undefined || val === null || val === '') {
      missing.push(field);
    }
  }

  // receiptAvailable is a boolean — must be explicitly set (not null/undefined)
  if (claim.receiptAvailable === undefined || claim.receiptAvailable === null) {
    missing.push('receiptAvailable');
  }

  if (missing.length > 0) {
    issues.push({
      rule: RULES.REQUIRED_FIELDS,
      severity: ERROR,
      message: `Missing required field(s): ${missing.join(', ')}.`,
    });
    checks.requiredFields = false;
  } else {
    checks.requiredFields = true;
  }
}

/**
 * Rule B: Amount must be a positive number > 0.
 */
function checkAmount(claim, issues, checks) {
  const amt = Number(claim.amount);
  if (isNaN(amt) || amt <= 0) {
    issues.push({
      rule: RULES.AMOUNT_POSITIVE,
      severity: ERROR,
      message: `Amount must be greater than 0. Received: ${claim.amount}.`,
    });
    checks.amount = false;
  } else {
    checks.amount = true;
  }
}

/**
 * Rule C: Category spending limits (INR only).
 * For non-INR currencies, emit a WARNING that the limit could not be
 * evaluated because currency conversion is not implemented yet.
 */
function checkCategoryLimit(claim, issues, warnings, checks) {
  const currency = (claim.currency || '').toUpperCase();
  const category = claim.category;
  const amount = Number(claim.amount);

  if (currency !== 'INR') {
    warnings.push({
      rule: RULES.CATEGORY_LIMIT,
      severity: WARNING,
      message: `Category spending limit could not be evaluated for ${currency} claims — currency conversion is not implemented yet.`,
    });
    // null indicates "not evaluated", not a pass or fail
    checks.categoryLimit = null;
    return;
  }

  const limit = CATEGORY_LIMITS_INR[category];

  if (limit === undefined) {
    // Unknown category — skip silently (already caught by REQUIRED_FIELDS / model enum)
    checks.categoryLimit = null;
    return;
  }

  if (!isNaN(amount) && amount > limit) {
    issues.push({
      rule: RULES.CATEGORY_LIMIT,
      severity: ERROR,
      message: `${category} claim of ₹${amount.toLocaleString()} exceeds the policy limit of ₹${limit.toLocaleString()}.`,
    });
    checks.categoryLimit = false;
  } else {
    checks.categoryLimit = true;
  }
}

/**
 * Rule D: Receipt must be available when an amount > 0 is claimed.
 */
function checkReceipt(claim, issues, checks) {
  const amt = Number(claim.amount);
  if (!isNaN(amt) && amt > 0 && claim.receiptAvailable === false) {
    issues.push({
      rule: RULES.RECEIPT_MISSING,
      severity: ERROR,
      message: 'An itemized receipt is required for expense claims but is marked as unavailable.',
    });
    checks.receipt = false;
  } else {
    checks.receipt = true;
  }
}

/**
 * Rule E: Date must be valid and not in the future.
 */
function checkDate(claim, issues, checks) {
  const claimDate = new Date(claim.date);

  if (isNaN(claimDate.getTime())) {
    issues.push({
      rule: RULES.DATE_INVALID,
      severity: ERROR,
      message: `Claim date "${claim.date}" is not a valid date.`,
    });
    checks.date = false;
    return;
  }

  // Compare date-only (strip time component) to avoid timezone edge-cases
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Allow today — only flag strictly future dates

  if (claimDate > today) {
    issues.push({
      rule: RULES.DATE_FUTURE,
      severity: ERROR,
      message: `Claim date ${claimDate.toISOString().split('T')[0]} is in the future and cannot be processed.`,
    });
    checks.date = false;
  } else {
    checks.date = true;
  }
}

/**
 * Rule F: Duplicate detection.
 * A duplicate is another claim with identical claimant + date + category + amount + currency.
 * The claim's own _id is excluded from the search.
 */
async function checkDuplicate(claim, issues, checks) {
  const claimDate = new Date(claim.date);

  // If date is invalid we cannot do a sensible duplicate check
  if (isNaN(claimDate.getTime())) {
    checks.duplicate = null;
    return;
  }

  // Match on same calendar day regardless of time
  const dayStart = new Date(claimDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(claimDate);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const filter = {
    claimant: claim.claimant,
    category: claim.category,
    amount: Number(claim.amount),
    currency: (claim.currency || '').toUpperCase(),
    date: { $gte: dayStart, $lte: dayEnd },
  };

  // Exclude the claim itself (when re-validating an existing document)
  if (claim._id) {
    filter._id = { $ne: claim._id };
  }

  const existingCount = await Claim.countDocuments(filter);

  if (existingCount > 0) {
    issues.push({
      rule: RULES.DUPLICATE_CLAIM,
      severity: ERROR,
      message: `A likely duplicate claim already exists: ${claim.claimant} / ${claim.category} / ${claim.currency} ${claim.amount} on ${claimDate.toISOString().split('T')[0]}.`,
    });
    checks.duplicate = false;
  } else {
    checks.duplicate = true;
  }
}

/* ────────────────────────────────────────────────────────────
   Public API
   ──────────────────────────────────────────────────────────── */

/**
 * Run all deterministic validation rules against a claim object.
 *
 * @param {Object} claim  - Plain JS object or Mongoose document.
 * @returns {Object}      - { valid, issues, warnings, checks }
 */
export const runValidation = async (claim) => {
  const issues = [];
  const warnings = [];
  const checks = initChecks();

  // Run all rules (order matters: required fields first)
  checkRequiredFields(claim, issues, checks);
  checkAmount(claim, issues, checks);
  checkCategoryLimit(claim, issues, warnings, checks);
  checkReceipt(claim, issues, checks);
  checkDate(claim, issues, checks);
  await checkDuplicate(claim, issues, checks);

  const valid = issues.length === 0;

  return {
    valid,
    issues,
    warnings,
    checks,
  };
};
