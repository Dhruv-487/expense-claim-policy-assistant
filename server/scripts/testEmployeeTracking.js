import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('=== STARTING EMPLOYEE CLAIM TRACKING TESTS ===\n');

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
    const emp1Email = `emp1_${timestamp}@company.com`;
    const emp2Email = `emp2_empty_${timestamp}@company.com`;
    const revEmail = `rev_${timestamp}@company.com`;

    // 1. Register & Login Employee 1
    const regEmp1 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Employee One',
        email: emp1Email,
        password: 'password123',
        role: 'EMPLOYEE',
      }),
    });
    const regEmp1Json = await regEmp1.json();
    const emp1Token = regEmp1Json.data.token;
    const emp1User = regEmp1Json.data.user;

    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emp1Email, password: 'password123' }),
    });
    const loginJson = await loginRes.json();
    assert(
      loginRes.status === 200 && loginJson.data?.token,
      'Test 1: Employee login works and returns valid JWT token'
    );

    // 2. Register Employee 2 (who will have ZERO claims initially)
    const regEmp2 = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Employee Two (Empty)',
        email: emp2Email,
        password: 'password123',
        role: 'EMPLOYEE',
      }),
    });
    const regEmp2Json = await regEmp2.json();
    const emp2Token = regEmp2Json.data.token;

    // 4. Employee with zero claims sees empty state
    const emp2ClaimsRes = await fetch(`${BASE_URL}/claims`, {
      headers: { Authorization: `Bearer ${emp2Token}` },
    });
    const emp2ClaimsJson = await emp2ClaimsRes.json();
    assert(
      emp2ClaimsRes.status === 200 &&
      Array.isArray(emp2ClaimsJson.data) &&
      emp2ClaimsJson.data.length === 0,
      'Test 4: Employee with zero claims receives empty array (clean empty state)',
      `Length: ${emp2ClaimsJson.data?.length}`
    );

    // Also test GET /claims/my for employee with zero claims
    const emp2MyClaimsRes = await fetch(`${BASE_URL}/claims/my`, {
      headers: { Authorization: `Bearer ${emp2Token}` },
    });
    const emp2MyClaimsJson = await emp2MyClaimsRes.json();
    assert(
      emp2MyClaimsRes.status === 200 && emp2MyClaimsJson.data.length === 0,
      'Test 4 (alias): GET /claims/my returns empty array for user with 0 claims'
    );

    // 8. Register Reviewer
    const regRev = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Senior Reviewer',
        email: revEmail,
        password: 'password123',
        role: 'REVIEWER',
      }),
    });
    const regRevJson = await regRev.json();
    const revToken = regRevJson.data.token;

    // 12. Create a claim for Employee 1
    const claimPayload = {
      claimant: 'Employee One',
      date: new Date().toISOString(),
      category: 'Meals & Entertainment',
      amount: 1200,
      currency: 'INR',
      description: 'Business dinner discussion for project milestone',
      receiptAvailable: true,
    };
    const createRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify(claimPayload),
    });
    const createJson = await createRes.json();
    assert(
      createRes.status === 201 && createJson.data?.userId === emp1User._id,
      'Test 12: Existing claim creation works and associates employee userId',
      `Status: ${createRes.status}`
    );
    const emp1ClaimId = createJson.data._id;

    // 2 & 3. Employee 1 gets their claims (via /claims and /claims/my)
    const emp1ClaimsRes = await fetch(`${BASE_URL}/claims`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const emp1ClaimsJson = await emp1ClaimsRes.json();
    const emp1MyRes = await fetch(`${BASE_URL}/claims/my`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const emp1MyJson = await emp1MyRes.json();

    assert(
      emp1ClaimsRes.status === 200 &&
      emp1ClaimsJson.data.some((c) => c._id === emp1ClaimId) &&
      emp1ClaimsJson.data.every((c) => c.userId === emp1User._id),
      'Test 2 & 3: Employee sees only their own claims (filtered by userId)'
    );

    assert(
      emp1MyRes.status === 200 && emp1MyJson.data.length === emp1ClaimsJson.data.length,
      'Test 2 (alias): GET /claims/my returns same employee-scoped list'
    );

    // 5. Employee can open their own claim details
    const getOwnRes = await fetch(`${BASE_URL}/claims/${emp1ClaimId}`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const getOwnJson = await getOwnRes.json();
    assert(
      getOwnRes.status === 200 && getOwnJson.data?._id === emp1ClaimId,
      'Test 5: Employee can open their own claim details'
    );

    // 6. Employee 2 cannot access Employee 1's claim (403 Forbidden)
    const getOtherRes = await fetch(`${BASE_URL}/claims/${emp1ClaimId}`, {
      headers: { Authorization: `Bearer ${emp2Token}` },
    });
    const getOtherJson = await getOtherRes.json();
    assert(
      getOtherRes.status === 403 && getOtherJson.success === false,
      'Test 6: Employee cannot access another employee\'s claim (403 Forbidden)'
    );

    // 7 & 8. Reviewer can access all claims and access Employee 1's claim
    const revAllClaimsRes = await fetch(`${BASE_URL}/claims`, {
      headers: { Authorization: `Bearer ${revToken}` },
    });
    const revAllClaimsJson = await revAllClaimsRes.json();
    assert(
      revAllClaimsRes.status === 200 &&
      revAllClaimsJson.data.length >= 1 &&
      revAllClaimsJson.data.some((c) => c._id === emp1ClaimId),
      'Test 7 & 8: Reviewer can access all claims across all employees'
    );

    // 11. Run deterministic validation on the claim
    const valRes = await fetch(`${BASE_URL}/claims/${emp1ClaimId}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const valJson = await valRes.json();
    assert(
      valRes.status === 200 && valJson.data?.valid !== undefined,
      'Test 11: Validation runs and returns structured validation information'
    );

    // 10. Run AI review on the claim
    console.log('Running AI review on employee claim...');
    const aiRes = await fetch(`${BASE_URL}/claims/${emp1ClaimId}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${revToken}` },
    });
    const aiJson = await aiRes.json();
    assert(
      aiRes.status === 200 && aiJson.data?.aiReview?.reviewStatus,
      'Test 10: AI review executes and stores reviewStatus & policy evidence'
    );

    // 9. Reviewer decision workflow
    const decRes = await fetch(`${BASE_URL}/claims/${emp1ClaimId}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${revToken}`,
      },
      body: JSON.stringify({
        decision: 'APPROVED',
        notes: 'Verified policy adherence for dinner claim',
      }),
    });
    const decJson = await decRes.json();
    assert(
      decRes.status === 200 && decJson.data?.status === 'APPROVED',
      'Test 9: Reviewer decision workflow succeeds and records decision'
    );

    // Verify employee can now see the updated validation, AI review, and reviewer decision
    const updatedClaimRes = await fetch(`${BASE_URL}/claims/${emp1ClaimId}`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const updatedClaimJson = await updatedClaimRes.json();
    const updated = updatedClaimJson.data;

    assert(
      updated.validationResults?.valid !== undefined &&
      updated.aiReview?.reviewStatus &&
      updated.reviewerDecision?.decision === 'APPROVED' &&
      updated.status === 'APPROVED',
      'Test 5 (full tracking): Employee claim reflects validation, AI review, and reviewer decision'
    );

    // 15. Unauthenticated request to /claims/my or /claims/:id/decision is rejected (401)
    const unauthRes = await fetch(`${BASE_URL}/claims/my`);
    assert(
      unauthRes.status === 401,
      'Test 15: Unauthenticated access to /claims/my is rejected with 401 Unauthorized'
    );

    console.log(`\n========================================`);
    console.log(`EMPLOYEE TRACKING TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
    console.log(`========================================\n`);

    if (passedTests === totalTests) {
      console.log('ALL EMPLOYEE CLAIM TRACKING TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Error running employee tracking tests:', err);
    process.exit(1);
  }
};

runTests();
