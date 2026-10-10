import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('=== STARTING CLARIFICATION WORKFLOW TESTS ===\n');

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
    const emp1Email = `employee1_${timestamp}@company.com`;
    const emp2Email = `employee2_${timestamp}@company.com`;
    const reviewerEmail = `reviewer_clar_${timestamp}@company.com`;

    // ── Setup: Register 2 employees and 1 reviewer ──
    const emp1Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Employee',
        email: emp1Email,
        password: 'password123',
        role: 'EMPLOYEE',
      }),
    });
    const emp1Data = (await emp1Res.json()).data;
    const emp1Token = emp1Data.token;

    const emp2Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Employee',
        email: emp2Email,
        password: 'password123',
        role: 'EMPLOYEE',
      }),
    });
    const emp2Data = (await emp2Res.json()).data;
    const emp2Token = emp2Data.token;

    const revRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Carol Reviewer',
        email: reviewerEmail,
        password: 'password123',
        role: 'REVIEWER',
      }),
    });
    const revData = (await revRes.json()).data;
    const revToken = revData.token;

    assert(emp1Token && emp2Token && revToken, 'Setup: Registered 2 employees and 1 reviewer');

    // ── Setup: Employee 1 creates a claim ──
    const claimRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        claimant: 'Alice Employee',
        date: new Date().toISOString(),
        category: 'Meals & Entertainment',
        amount: 2500,
        currency: 'INR',
        description: 'Client lunch meeting at local restaurant',
        receiptAvailable: true,
      }),
    });
    const claimData = (await claimRes.json()).data;
    const claimId = claimData._id;
    assert(claimRes.status === 201 && claimId, 'Setup: Alice created claim for lunch');

    // Run initial review
    console.log('Running initial policy review...');
    const initialReviewRes = await fetch(`${BASE_URL}/claims/${claimId}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${revToken}` },
    });
    const initialReviewJson = await initialReviewRes.json();
    const initialClaim = initialReviewJson.data.claim;
    assert(initialReviewRes.status === 200, 'Setup: Initial AI review completed');

    // ── Test 1 & 2 & 3: Reviewer requests clarification ──
    const clarMessage = 'Please provide details on which client attended this lunch and business purpose discussed.';
    const clarReqRes = await fetch(`${BASE_URL}/claims/${claimId}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${revToken}`,
      },
      body: JSON.stringify({
        decision: 'CLARIFICATION_REQUESTED',
        notes: clarMessage,
      }),
    });
    const clarReqJson = await clarReqRes.json();
    const claimAfterClarReq = clarReqJson.data;

    assert(
      clarReqRes.status === 200 && clarReqJson.success,
      'Test 1: Reviewer requests clarification'
    );
    assert(
      claimAfterClarReq.status === 'UNDER_REVIEW',
      'Test 2: Claim status becomes UNDER_REVIEW upon clarification request'
    );
    assert(
      claimAfterClarReq.clarification?.requested === true &&
      claimAfterClarReq.clarification?.message === clarMessage &&
      claimAfterClarReq.clarification?.resolved === false,
      'Test 3: Clarification message is persisted in embedded clarification object'
    );

    // ── Test 4: Employee can see clarification request ──
    const empViewRes = await fetch(`${BASE_URL}/claims/${claimId}`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const empViewClaim = (await empViewRes.json()).data;
    assert(
      empViewClaim.clarification?.requested === true &&
      empViewClaim.clarification?.message === clarMessage &&
      empViewClaim.clarification?.resolved === false,
      'Test 4: Employee can see clarification request and message on their claim'
    );

    // ── Test 6: Empty or whitespace response is rejected ──
    const emptyRespRes = await fetch(`${BASE_URL}/claims/${claimId}/clarification-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({ response: '   ' }),
    });
    assert(
      emptyRespRes.status === 400,
      'Test 6a: Empty whitespace clarification response is rejected with 400'
    );

    const shortRespRes = await fetch(`${BASE_URL}/claims/${claimId}/clarification-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({ response: 'no' }),
    });
    assert(
      shortRespRes.status === 400,
      'Test 6b: Too short response (<3 chars) is rejected with 400'
    );

    // ── Test 7: Employee cannot respond to another employee's claim ──
    const emp2RespRes = await fetch(`${BASE_URL}/claims/${claimId}/clarification-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp2Token}`,
      },
      body: JSON.stringify({
        response: 'This is Bob trying to respond to Alices claim.',
      }),
    });
    assert(
      emp2RespRes.status === 403,
      'Test 7: Employee cannot respond to another employee claim (403 Forbidden)'
    );

    // ── Test 5 & 8 & 9 & 10 & 11 & 12: Employee submits valid response ──
    const empResponseText = 'The lunch was with Acme Corp VP of Engineering Mr. Smith discussing Q3 cloud migration project contract terms.';
    console.log('Submitting employee clarification response and waiting for automatic re-review...');
    const clarSubmitRes = await fetch(`${BASE_URL}/claims/${claimId}/clarification-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({ response: empResponseText }),
    });
    const clarSubmitJson = await clarSubmitRes.json();
    const updatedClaimAfterSubmit = clarSubmitJson.data;

    assert(
      clarSubmitRes.status === 200 && clarSubmitJson.success,
      'Test 5: Employee submits response successfully'
    );
    assert(
      updatedClaimAfterSubmit.clarification?.response === empResponseText &&
      updatedClaimAfterSubmit.clarification?.resolved === true &&
      updatedClaimAfterSubmit.clarification?.respondedAt !== null,
      'Test 8: Clarification response and respondedAt timestamp are persisted, resolved is true'
    );
    assert(
      updatedClaimAfterSubmit.validationResults?.validatedAt !== null &&
      new Date(updatedClaimAfterSubmit.validationResults.validatedAt) >= new Date(initialClaim.validationResults.validatedAt),
      'Test 9: Deterministic validation runs again upon clarification response'
    );
    assert(
      Boolean(updatedClaimAfterSubmit.aiReview?.reviewedAt) &&
      new Date(updatedClaimAfterSubmit.aiReview.reviewedAt) >= new Date(initialClaim.aiReview.reviewedAt),
      'Test 10: AI review runs again automatically'
    );
    assert(
      Array.isArray(updatedClaimAfterSubmit.aiReview?.policyEvidence) &&
      updatedClaimAfterSubmit.aiReview.policyEvidence.length > 0 &&
      Boolean(updatedClaimAfterSubmit.aiReview.policyEvidence[0].sectionId),
      'Test 11: Grounded policy evidence refreshed and stored from RAG'
    );
    assert(
      Boolean(updatedClaimAfterSubmit.aiReview?.reason) &&
      typeof updatedClaimAfterSubmit.aiReview.classification?.confidence === 'number',
      'Test 12: Previous AI review is replaced/updated rather than duplicated'
    );

    // ── Test 13: Reviewer can see employee response ──
    const revCheckRes = await fetch(`${BASE_URL}/claims/${claimId}`, {
      headers: { Authorization: `Bearer ${revToken}` },
    });
    const revCheckClaim = (await revCheckRes.json()).data;
    assert(
      revCheckClaim.clarification?.response === empResponseText &&
      revCheckClaim.clarification?.resolved === true,
      'Test 13: Reviewer can see employee response and resolved status'
    );

    // ── Test 16: Reviewer can request clarification again (CLARIFICATION REPEAT) ──
    const secondClarMsg = 'Could you please also confirm if the receipt includes alcohol expenses?';
    const secondClarRes = await fetch(`${BASE_URL}/claims/${claimId}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${revToken}`,
      },
      body: JSON.stringify({
        decision: 'CLARIFICATION_REQUESTED',
        notes: secondClarMsg,
      }),
    });
    const secondClarClaim = (await secondClarRes.json()).data;
    assert(
      secondClarRes.status === 200 &&
      secondClarClaim.clarification?.requested === true &&
      secondClarClaim.clarification?.message === secondClarMsg &&
      secondClarClaim.clarification?.resolved === false,
      'Test 16: Reviewer can request clarification again (repeat workflow resets pending state)'
    );

    // Employee responds to second clarification request
    const secondResponseText = 'Receipt contains only meals and soft drinks, no alcohol was purchased or claimed.';
    const secondClarSubmitRes = await fetch(`${BASE_URL}/claims/${claimId}/clarification-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({ response: secondResponseText }),
    });
    assert(
      secondClarSubmitRes.status === 200,
      'Repeat check: Employee responded to second clarification request'
    );

    // ── Test 14: Reviewer can approve after clarification ──
    const approveRes = await fetch(`${BASE_URL}/claims/${claimId}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${revToken}`,
      },
      body: JSON.stringify({
        decision: 'APPROVED',
        notes: 'Approved after satisfactory clarification responses provided.',
      }),
    });
    const approvedClaim = (await approveRes.json()).data;
    assert(
      approveRes.status === 200 && approvedClaim.status === 'APPROVED',
      'Test 14: Reviewer can approve claim after clarification response'
    );

    // ── Test 15: Reviewer can reject after clarification (tested on a second claim) ──
    const claim2Res = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        claimant: 'Alice Employee',
        date: new Date().toISOString(),
        category: 'Other',
        amount: 8000,
        currency: 'INR',
        description: 'Miscellaneous expense for office items',
        receiptAvailable: false,
      }),
    });
    const claim2Id = (await claim2Res.json()).data._id;

    // Reviewer requests clarification on claim 2
    await fetch(`${BASE_URL}/claims/${claim2Id}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${revToken}`,
      },
      body: JSON.stringify({
        decision: 'CLARIFICATION_REQUESTED',
        notes: 'What items were purchased and why is receipt unavailable?',
      }),
    });

    // Employee responds
    await fetch(`${BASE_URL}/claims/${claim2Id}/clarification-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({ response: 'Personal desk decor items, lost the bill.' }),
    });

    // Reviewer rejects after clarification
    const rejectRes = await fetch(`${BASE_URL}/claims/${claim2Id}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${revToken}`,
      },
      body: JSON.stringify({
        decision: 'REJECTED',
        notes: 'Personal decor is not reimbursable under corporate policy.',
      }),
    });
    const rejectedClaim = (await rejectRes.json()).data;
    assert(
      rejectRes.status === 200 && rejectedClaim.status === 'REJECTED',
      'Test 15: Reviewer can reject claim after clarification'
    );

    // ── Test 17: Audit history contains clarification request and response ──
    const auditRes = await fetch(`${BASE_URL}/claims/${claimId}/audit-history`, {
      headers: { Authorization: `Bearer ${revToken}` },
    });
    const auditLogs = (await auditRes.json()).data;

    const hasClarRequestedAudit = auditLogs.some(
      (l) => l.action === 'REVIEWER_DECISION' && l.decision === 'CLARIFICATION_REQUESTED'
    );
    const hasClarRespondedAudit = auditLogs.some(
      (l) => l.action === 'CLARIFICATION_RESPONDED' && l.actorType === 'EMPLOYEE'
    );
    assert(
      hasClarRequestedAudit && hasClarRespondedAudit,
      'Test 17: Audit history contains both CLARIFICATION_REQUESTED and CLARIFICATION_RESPONDED events'
    );

    console.log(`\n========================================`);
    console.log(`CLARIFICATION TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
    console.log(`========================================\n`);

    if (passedTests === totalTests) {
      console.log('ALL CLARIFICATION WORKFLOW TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Error running clarification tests:', err);
    process.exit(1);
  }
};

runTests();
