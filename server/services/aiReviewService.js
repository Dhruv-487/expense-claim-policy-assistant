import { getGeminiClient } from './geminiService.js';

export const ALLOWED_REVIEW_STATUSES = [
  'COMPLIANT',
  'NON_COMPLIANT',
  'NEEDS_CLARIFICATION',
  'UNCERTAIN',
];

const SYSTEM_INSTRUCTION = `You are an Expense Claim Policy Review Assistant.

Review the claim using ONLY:
1. Claim data
2. Deterministic validation results
3. Retrieved organizational policy evidence
4. Any clarification request and employee response provided

Never invent policy rules, limits, requirements, or citations.

Deterministic validation is authoritative for hard rule violations.
You may explain those violations but must not contradict them.
Employee clarification responses provide additional business context, but MUST NOT override deterministic validation failures or organizational policy requirements.
If validationResult contains an ERROR-level issue, you MUST NOT classify the claim as COMPLIANT.

If the claim description is vague, ambiguous, or lacks sufficient business justification (e.g. 'misc', 'expenses', 'items' without clear purpose), flag reviewStatus as NEEDS_CLARIFICATION or UNCERTAIN, and detail the missing business context in missingInformation.

If the available evidence is insufficient, identify the missing information.

You are assisting a human reviewer.
You are NOT the final decision maker.

Return JSON only.
Do not return markdown or additional text.`;

/**
 * Clean and parse raw JSON text, handling markdown fences if present.
 */
const safeParseJSON = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response received from AI model');
  }

  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse AI response as JSON: ${err.message}`);
  }
};

/**
 * Validate and sanitize the structured AI review output according to strict policy rules.
 *
 * @param {Object} rawOutput - Parsed AI output
 * @param {Object} validationResult - Deterministic validation result
 * @param {Array<Object>} policyEvidence - Supplied policy chunks
 * @returns {Object} Strictly validated and normalized review object
 */
const validateAndNormalizeReview = (rawOutput, validationResult, policyEvidence) => {
  if (!rawOutput || typeof rawOutput !== 'object') {
    throw new Error('AI output is not a valid object');
  }

  // 1. Classification validation
  const classification = rawOutput.classification || {};
  let confidence = Number(classification.confidence);
  if (isNaN(confidence) || confidence < 0 || confidence > 1) {
    confidence = 0.5; // fallback neutral confidence if unparseable
  }

  let uncertain = Boolean(classification.uncertain);
  if (confidence < 0.75) {
    uncertain = true;
  }

  const category =
    typeof classification.category === 'string' && classification.category.trim()
      ? classification.category.trim()
      : 'Unspecified';

  // 2. Review status validation
  let reviewStatus = String(rawOutput.reviewStatus || '').toUpperCase().trim();
  if (!ALLOWED_REVIEW_STATUSES.includes(reviewStatus)) {
    reviewStatus = 'UNCERTAIN';
  }

  // 3. Reason validation
  let reason =
    typeof rawOutput.reason === 'string' && rawOutput.reason.trim()
      ? rawOutput.reason.trim()
      : 'Policy review completed based on provided claim evidence.';

  // 4. Missing information array validation
  const missingInformation = Array.isArray(rawOutput.missingInformation)
    ? rawOutput.missingInformation.filter((item) => typeof item === 'string' && item.trim())
    : [];

  // 5. Policy section IDs grounding validation
  // MUST only reference section IDs present in the supplied evidence
  const validSectionIds = new Set(
    (policyEvidence || [])
      .map((p) => p && p.sectionId)
      .filter(Boolean)
  );

  const rawSectionIds = Array.isArray(rawOutput.policySectionIds)
    ? rawOutput.policySectionIds
    : [];

  // Filter out any hallucinated or non-existent section IDs
  const policySectionIds = rawSectionIds.filter(
    (id) => typeof id === 'string' && validSectionIds.has(id.trim())
  );

  // 6. Deterministic Validation Priority Enforcement:
  // If deterministic validation has ERROR-level issues, AI CANNOT override to COMPLIANT
  const hasDeterministicErrors =
    validationResult &&
    (validationResult.valid === false ||
      (Array.isArray(validationResult.issues) &&
        validationResult.issues.some((i) => i.severity === 'ERROR')));

  if (hasDeterministicErrors && reviewStatus === 'COMPLIANT') {
    reviewStatus = 'NON_COMPLIANT';
    const firstIssue = validationResult.issues?.[0]?.message || 'Policy rule violation detected.';
    reason = `Claim is non-compliant due to deterministic validation failure: ${firstIssue} ${reason}`;
  }

  // If uncertainty is flagged and status was COMPLIANT, downgrade status appropriately
  if (uncertain && reviewStatus === 'COMPLIANT') {
    reviewStatus = missingInformation.length > 0 ? 'NEEDS_CLARIFICATION' : 'UNCERTAIN';
  }

  return {
    classification: {
      category,
      confidence: parseFloat(confidence.toFixed(2)),
      uncertain,
    },
    reviewStatus,
    reason,
    missingInformation,
    policySectionIds,
  };
};

/**
 * Review an expense claim using Gemini AI with grounding from deterministic validation and policy evidence.
 *
 * @param {Object} params
 * @param {Object} params.claim - Expense claim data
 * @param {Object} params.validationResult - Deterministic validation engine output
 * @param {Array<Object>} params.policyEvidence - Retrieved policy chunks
 * @returns {Promise<Object>} Structured policy review object
 */
export const reviewClaimWithAI = async ({ claim, validationResult, policyEvidence = [] }) => {
  if (!claim) {
    throw new Error('Claim data is required for AI review');
  }

  const ai = getGeminiClient();
  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

  // Format policy evidence cleanly for grounding
  const formattedEvidence = (policyEvidence || []).map((chunk) => ({
    sectionId: chunk.sectionId,
    sectionTitle: chunk.sectionTitle,
    text: chunk.text,
  }));

  // Format clarification context if present
  const clarificationBlock =
    claim.clarification?.message || claim.clarification?.response
      ? `\n=== CLARIFICATION CONTEXT ===\nPrevious Reviewer Clarification Request: "${
          claim.clarification?.message || 'N/A'
        }"\nEmployee Clarification Response: "${
          claim.clarification?.response || 'Pending'
        }"\n`
      : '';

  // Build grounded user prompt
  const userPrompt = `Please evaluate the following expense claim for organizational policy compliance:

=== CLAIM DATA ===
${JSON.stringify(
  {
    claimant: claim.claimant,
    date: claim.date,
    category: claim.category,
    amount: claim.amount,
    currency: claim.currency,
    description: claim.description,
    receiptAvailable: claim.receiptAvailable,
  },
  null,
  2
)}${clarificationBlock}

=== DETERMINISTIC VALIDATION RESULT ===
${JSON.stringify(
  {
    valid: validationResult?.valid,
    issues: validationResult?.issues || [],
    warnings: validationResult?.warnings || [],
    checks: validationResult?.checks || {},
  },
  null,
  2
)}

=== RETRIEVED ORGANIZATIONAL POLICY EVIDENCE ===
${JSON.stringify(formattedEvidence, null, 2)}

=== RESPONSE INSTRUCTIONS ===
Evaluate compliance against the retrieved policy sections and deterministic rules.
Return ONLY a valid JSON object matching this schema:
{
  "classification": {
    "category": "${claim.category || 'Travel'}",
    "confidence": 0.95,
    "uncertain": false
  },
  "reviewStatus": "COMPLIANT" | "NON_COMPLIANT" | "NEEDS_CLARIFICATION" | "UNCERTAIN",
  "reason": "Detailed explanation of findings based strictly on policy evidence",
  "missingInformation": ["Specific missing item if any"],
  "policySectionIds": ["Section IDs from the retrieved evidence above that support this review"]
}`;

  let responseText = '';
  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    responseText = response.text?.trim() || '';
  } catch (error) {
    // Graceful fallback if primary model encounters temporary 503 spike
    if (error.message?.includes('503') || error.message?.includes('high demand')) {
      const fallbackModel = 'gemini-2.5-flash-lite';
      const fallbackRes = await ai.models.generateContent({
        model: fallbackModel,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
        },
      });
      responseText = fallbackRes.text?.trim() || '';
    } else {
      throw error;
    }
  }

  // Parse and strictly validate the AI response
  const rawParsed = safeParseJSON(responseText);
  return validateAndNormalizeReview(rawParsed, validationResult, policyEvidence);
};
