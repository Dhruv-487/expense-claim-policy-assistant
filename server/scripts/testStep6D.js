import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('=== STARTING STEP 6D AUDIT TRAIL TESTS ===\n');

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
    // 11. Malformed claim ID -> 400
    const malformedRes = await fetch(`${BASE_URL}/claims/invalid-object-id/audit-history`);
    const malformedJson = await malformedRes.json();
    assert(
      malformedRes.status === 400 && malformedJson.success === false,
      'Test 11: Malformed claim ID returns 400',
      `Got status ${malformedRes.status}: ${JSON.stringify(malformedJson)}`
    );

    // 12. Nonexistent claim -> 404
    const nonexistentRes = await fetch(`${BASE_URL}/claims/507f1f77bcf86cd799439011/audit-history`);
    const nonexistentJson = await nonexistentRes.json();
    assert(
      nonexistentRes.status === 404 && nonexistentJson.success === false,
      'Test 12: Nonexistent claim ID returns 404',
      `Got status ${nonexistentRes.status}: ${JSON.stringify(nonexistentJson)}`
    );

    // 1. Create a new claim -> CLAIM_CREATED audit event exists
    const newClaimPayload = {
      claimant: 'Audit Trail Tester',
      date: new Date().toISOString(),
      category: 'Meals & Entertainment',
      amount: 1500,
      currency: 'INR',
      description: 'Audit history verification business dinner',
      receiptAvailable: true,
    };

    const createRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClaimPayload),
    });
    const createJson = await createRes.json();
    assert(
      createRes.status === 201 && createJson.data?._id,
      'Test 13 (part 1): Claim creation works',
      `Status: ${createRes.status}`
    );

    const claimId = createJson.data._id;
    console.log(`Created test claim ID: ${claimId}`);

    // Check audit history after creation
    let historyRes = await fetch(`${BASE_URL}/claims/${claimId}/audit-history`);
    let historyJson = await historyRes.json();
    assert(
      historyRes.status === 200 &&
      historyJson.data.length === 1 &&
      historyJson.data[0].action === 'CLAIM_CREATED' &&
      historyJson.data[0].actorType === 'SYSTEM',
      'Test 1: CLAIM_CREATED audit event exists and has actorType SYSTEM',
      `Audit log count: ${historyJson.data?.length}`
    );

    // 2. Validate claim -> CLAIM_VALIDATED audit event exists
    const valRes = await fetch(`${BASE_URL}/claims/${claimId}/validate`, {
      method: 'POST',
    });
    const valJson = await valRes.json();
    assert(
      valRes.status === 200 && valJson.data?.valid !== undefined,
      'Test 14: Existing validation still works',
      `Status: ${valRes.status}`
    );

    historyRes = await fetch(`${BASE_URL}/claims/${claimId}/audit-history`);
    historyJson = await historyRes.json();
    assert(
      historyRes.status === 200 &&
      historyJson.data.length === 2 &&
      historyJson.data[0].action === 'CLAIM_VALIDATED' &&
      historyJson.data[0].actorType === 'SYSTEM',
      'Test 2: CLAIM_VALIDATED audit event exists and is sorted newest first',
      `Audit logs: ${JSON.stringify(historyJson.data.map(l => l.action))}`
    );

    // 3. AI review claim -> AI_REVIEWED audit event exists
    console.log('Triggering AI review (this calls Gemini)...');
    const reviewRes = await fetch(`${BASE_URL}/claims/${claimId}/review`, {
      method: 'POST',
    });
    const reviewJson = await reviewRes.json();
    assert(
      reviewRes.status === 200 && reviewJson.data?.aiReview?.reviewStatus,
      'Test 15: Existing AI review still works',
      `Status: ${reviewRes.status}, ReviewStatus: ${reviewJson.data?.aiReview?.reviewStatus}`
    );

    historyRes = await fetch(`${BASE_URL}/claims/${claimId}/audit-history`);
    historyJson = await historyRes.json();
    assert(
      historyRes.status === 200 &&
      historyJson.data.length === 3 &&
      historyJson.data[0].action === 'AI_REVIEWED' &&
      historyJson.data[0].actorType === 'SYSTEM',
      'Test 3: AI_REVIEWED audit event exists',
      `Audit logs: ${JSON.stringify(historyJson.data.map(l => l.action))}`
    );

    // 4. Approve claim -> REVIEWER_DECISION audit event exists
    const approveRes = await fetch(`${BASE_URL}/claims/${claimId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: 'APPROVED',
        notes: 'Approved during test run',
      }),
    });
    const approveJson = await approveRes.json();
    assert(
      approveRes.status === 200 && approveJson.data?.status === 'APPROVED',
      'Test 4: Approve claim works and records REVIEWER_DECISION',
      `Status: ${approveRes.status}`
    );

    historyRes = await fetch(`${BASE_URL}/claims/${claimId}/audit-history`);
    historyJson = await historyRes.json();
    const latestEvent = historyJson.data[0];
    assert(
      latestEvent.action === 'REVIEWER_DECISION' &&
      latestEvent.actorType === 'REVIEWER' &&
      latestEvent.decision === 'APPROVED' &&
      latestEvent.notes === 'Approved during test run' &&
      latestEvent.override === false &&
      latestEvent.newStatus === 'APPROVED',
      'Test 4 (details): Reviewer decision preserves actorType, decision, notes, newStatus, override=false'
    );

    // 5. Reject claim -> another REVIEWER_DECISION event exists
    const rejectRes = await fetch(`${BASE_URL}/claims/${claimId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: 'REJECTED',
        notes: 'Rejected for missing policy documentation',
      }),
    });
    const rejectJson = await rejectRes.json();
    assert(
      rejectRes.status === 200 && rejectJson.data?.status === 'REJECTED',
      'Test 5: Reject claim works and records another REVIEWER_DECISION event',
      `Status: ${rejectRes.status}`
    );

    // 6. Request clarification -> audit event exists
    const clarifyRes = await fetch(`${BASE_URL}/claims/${claimId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: 'CLARIFICATION_REQUESTED',
        notes: 'Please provide itemized tax invoice',
      }),
    });
    const clarifyJson = await clarifyRes.json();
    assert(
      clarifyRes.status === 200 && clarifyJson.data?.status === 'UNDER_REVIEW',
      'Test 6: Request clarification works and records audit event',
      `Status: ${clarifyRes.status}`
    );

    // 7. Override AI recommendation -> audit event contains override=true, decision and notes
    const overrideRes = await fetch(`${BASE_URL}/claims/${claimId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: 'OVERRIDDEN',
        overrideStatus: 'APPROVED',
        notes: 'Executive approval exception granted',
      }),
    });
    const overrideJson = await overrideRes.json();
    assert(
      overrideRes.status === 200 && overrideJson.data?.status === 'APPROVED',
      'Test 16: Existing reviewer decision workflow still works with override',
      `Status: ${overrideRes.status}`
    );

    historyRes = await fetch(`${BASE_URL}/claims/${claimId}/audit-history`);
    historyJson = await historyRes.json();
    const overrideEvent = historyJson.data[0];
    assert(
      overrideEvent.action === 'REVIEWER_DECISION' &&
      overrideEvent.actorType === 'REVIEWER' &&
      overrideEvent.decision === 'OVERRIDDEN' &&
      overrideEvent.override === true &&
      overrideEvent.notes === 'Executive approval exception granted' &&
      overrideEvent.newStatus === 'APPROVED',
      'Test 7: Override AI recommendation audit event contains override=true, decision, notes, newStatus'
    );

    // 8. Multiple reviewer decisions create multiple separate audit events
    const reviewerDecisionEvents = historyJson.data.filter(e => e.action === 'REVIEWER_DECISION');
    assert(
      reviewerDecisionEvents.length === 4,
      'Test 8: Multiple reviewer decisions create multiple separate audit events',
      `Expected 4, got ${reviewerDecisionEvents.length}`
    );

    // 9. GET /api/claims/:id/audit-history returns events newest first
    const timestamps = historyJson.data.map(e => new Date(e.timestamp).getTime());
    const isSortedNewestFirst = timestamps.every((t, i) => i === 0 || t <= timestamps[i - 1]);
    assert(
      isSortedNewestFirst && historyJson.data.length === 7,
      'Test 9: Audit events are returned newest first in clean JSON array',
      `Total events: ${historyJson.data.length}`
    );

    // 10. Audit history persists in MongoDB
    // Direct re-query to verify persistence
    const recheckRes = await fetch(`${BASE_URL}/claims/${claimId}/audit-history`);
    const recheckJson = await recheckRes.json();
    assert(
      recheckRes.status === 200 && recheckJson.data.length === 7,
      'Test 10: Audit history persists across queries in MongoDB',
      `Events count: ${recheckJson.data.length}`
    );

    // 13 (part 2): Existing claim CRUD (GET, PUT, DELETE) still works
    const getRes = await fetch(`${BASE_URL}/claims/${claimId}`);
    const getJson = await getRes.json();
    assert(getRes.status === 200 && getJson.data._id === claimId, 'Test 13 (part 2): GET /claims/:id works');

    const updateRes = await fetch(`${BASE_URL}/claims/${claimId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Updated test description' }),
    });
    const updateJson = await updateRes.json();
    assert(updateRes.status === 200 && updateJson.data.description === 'Updated test description', 'Test 13 (part 3): PUT /claims/:id works');

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
    console.log(`========================================\n`);

    if (passedTests === totalTests) {
      console.log('ALL TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.error('SOME TESTS FAILED!');
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected error running tests:', err);
    process.exit(1);
  }
};

runTests();
