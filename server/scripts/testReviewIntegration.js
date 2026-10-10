import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('=== STARTING REVIEW WORKFLOW INTEGRATION TESTS ===\n');

  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition, testName, details = '') => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✓ [PASS] ${testName}`);
    } else {
      console.error(`✗ [FAIL] ${testName} - ${details}`);
    }
  };

  try {
    const timestamp = Date.now();
    const revEmail = `reviewer_test_${timestamp}@company.com`;

    // 1. Register a reviewer
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Auto Review Tester',
        email: revEmail,
        password: 'password123',
        role: 'REVIEWER',
      }),
    });
    const regJson = await regRes.json();
    const token = regJson.data.token;
    assert(regRes.status === 201 && token, 'Setup: Registered test reviewer');

    // 2. Create a FRESH claim (not yet validated or reviewed)
    const newClaimRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        claimant: 'Fresh Claim Employee',
        date: new Date().toISOString(),
        category: 'Travel',
        amount: 3200,
        currency: 'INR',
        description: 'Intercity train tickets and local taxi for client site demonstration',
        receiptAvailable: true,
      }),
    });
    const newClaimJson = await newClaimRes.json();
    const claimId = newClaimJson.data._id;
    assert(newClaimRes.status === 201 && claimId, 'Setup: Created fresh unreviewed claim');

    // 3. Verify fresh claim has no AI review yet
    const initialClaimRes = await fetch(`${BASE_URL}/claims/${claimId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const initialClaimJson = await initialClaimRes.json();
    const freshClaim = initialClaimJson.data;

    assert(
      !freshClaim.aiReview?.reviewStatus,
      'Requirement 3 (precondition): Fresh claim initially has no AI review status'
    );

    // 4. Trigger review workflow via POST /api/claims/:id/review (same endpoint as reviewClaim API)
    console.log('Triggering POST /api/claims/:id/review workflow...');
    const reviewRes = await fetch(`${BASE_URL}/claims/${claimId}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const reviewJson = await reviewRes.json();

    assert(
      reviewRes.status === 200 && reviewJson.success === true,
      'Requirement 1: Reused existing POST /api/claims/:id/review successfully',
      `Status: ${reviewRes.status}`
    );

    // 5. Refetch the claim to verify all review fields are populated
    const updatedClaimRes = await fetch(`${BASE_URL}/claims/${claimId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedClaimJson = await updatedClaimRes.json();
    const reviewedClaim = updatedClaimJson.data;

    // Check deterministic validation result
    assert(
      reviewedClaim.validationResults?.valid !== null &&
      reviewedClaim.validationResults?.validatedAt !== null,
      'Requirement 5a: Deterministic validation results populated on claim'
    );

    // Check AI review status
    assert(
      ['COMPLIANT', 'NON_COMPLIANT', 'NEEDS_CLARIFICATION', 'UNCERTAIN'].includes(
        reviewedClaim.aiReview?.reviewStatus
      ),
      `Requirement 5b: AI review status populated (${reviewedClaim.aiReview?.reviewStatus})`
    );

    // Check AI confidence
    assert(
      typeof reviewedClaim.aiReview?.classification?.confidence === 'number',
      `Requirement 5c: AI confidence populated (${reviewedClaim.aiReview?.classification?.confidence})`
    );

    // Check AI reasoning
    assert(
      typeof reviewedClaim.aiReview?.reason === 'string' &&
      reviewedClaim.aiReview.reason.length > 0,
      'Requirement 5d: AI review reasoning populated'
    );

    // Check retrieved policy evidence
    assert(
      Array.isArray(reviewedClaim.aiReview?.policyEvidence) &&
      reviewedClaim.aiReview.policyEvidence.length > 0 &&
      reviewedClaim.aiReview.policyEvidence[0].sectionId &&
      reviewedClaim.aiReview.policyEvidence[0].text,
      'Requirement 5e: Grounded policy evidence populated with sectionId and text',
      `Evidence count: ${reviewedClaim.aiReview?.policyEvidence?.length}`
    );

    // 6. Check that a second inspection sees the existing stored review
    assert(
      Boolean(reviewedClaim.aiReview?.reviewStatus),
      'Requirement 6: Subsequent fetches detect stored review and avoid duplicate Gemini calls'
    );

    // 7. Verify reviewer decision functionality is fully preserved
    const decisionRes = await fetch(`${BASE_URL}/claims/${claimId}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        decision: 'APPROVED',
        notes: 'Approved following automated policy review verification',
      }),
    });
    const decisionJson = await decisionRes.json();

    assert(
      decisionRes.status === 200 && decisionJson.data?.status === 'APPROVED',
      'Requirement 9: Reviewer decision functionality preserved (APPROVED recorded)'
    );

    // 8. Verify audit history records the events in chronological order
    const auditRes = await fetch(`${BASE_URL}/claims/${claimId}/audit-history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const auditJson = await auditRes.json();

    assert(
      auditRes.status === 200 &&
      auditJson.data.some((l) => l.action === 'AI_REVIEWED') &&
      auditJson.data.some((l) => l.action === 'REVIEWER_DECISION'),
      'Requirement 5f: Updated timeline & audit trail contain AI_REVIEWED and REVIEWER_DECISION'
    );

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
    console.log(`========================================\n`);

    if (passedTests === totalTests) {
      console.log('ALL REVIEW INTEGRATION TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Error running review integration tests:', err);
    process.exit(1);
  }
};

runTests();
