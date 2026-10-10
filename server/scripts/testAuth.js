import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('=== STARTING AUTH & AUTHORIZATION TESTS ===\n');

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
    const empEmail = `employee_${timestamp}@company.com`;
    const emp2Email = `employee2_${timestamp}@company.com`;
    const revEmail = `reviewer_${timestamp}@company.com`;

    // 1. Register employee
    const regEmpRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Employee',
        email: empEmail,
        password: 'password123',
        role: 'EMPLOYEE',
      }),
    });
    const regEmpJson = await regEmpRes.json();
    assert(
      regEmpRes.status === 201 &&
      regEmpJson.data?.user?.email === empEmail &&
      regEmpJson.data?.user?.role === 'EMPLOYEE' &&
      regEmpJson.data?.token &&
      !regEmpJson.data?.user?.password,
      'Test 1: Register employee returns token, safe user, no password',
      `Status: ${regEmpRes.status}`
    );
    const empToken = regEmpJson.data.token;
    const empUser = regEmpJson.data.user;

    // Register second employee (for ownership testing)
    const regEmp2Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Employee',
        email: emp2Email,
        password: 'password123',
        role: 'EMPLOYEE',
      }),
    });
    const regEmp2Json = await regEmp2Res.json();
    const emp2Token = regEmp2Json.data.token;

    // 2. Register reviewer
    const regRevRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Carol Reviewer',
        email: revEmail,
        password: 'password123',
        role: 'REVIEWER',
      }),
    });
    const regRevJson = await regRevRes.json();
    assert(
      regRevRes.status === 201 &&
      regRevJson.data?.user?.email === revEmail &&
      regRevJson.data?.user?.role === 'REVIEWER' &&
      regRevJson.data?.token,
      'Test 2: Register reviewer returns token and role REVIEWER',
      `Status: ${regRevRes.status}`
    );
    const revToken = regRevJson.data.token;
    const revUser = regRevJson.data.user;

    // 3. Duplicate email rejected
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email: empEmail,
        password: 'password123',
      }),
    });
    const dupJson = await dupRes.json();
    assert(
      (dupRes.status === 409 || dupRes.status === 400) && dupJson.success === false,
      'Test 3: Duplicate email rejected with 409/400',
      `Status: ${dupRes.status}`
    );

    // 4. Login works
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: empEmail,
        password: 'password123',
      }),
    });
    const loginJson = await loginRes.json();
    assert(
      loginRes.status === 200 &&
      loginJson.data?.token &&
      loginJson.data?.user?.email === empEmail,
      'Test 4: Login works and returns valid token',
      `Status: ${loginRes.status}`
    );

    // 5. Wrong password rejected
    const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: empEmail,
        password: 'wrongpassword',
      }),
    });
    const wrongPassJson = await wrongPassRes.json();
    assert(
      wrongPassRes.status === 401 && wrongPassJson.success === false,
      'Test 5: Wrong password rejected with 401',
      `Status: ${wrongPassRes.status}`
    );

    // 6. Invalid JWT rejected
    const invalidJwtRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer thisisobviouslyaninvalidjwttoken' },
    });
    const invalidJwtJson = await invalidJwtRes.json();
    assert(
      invalidJwtRes.status === 401 && invalidJwtJson.success === false,
      'Test 6: Invalid JWT rejected with 401',
      `Status: ${invalidJwtRes.status}`
    );

    // 7. /auth/me works
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const meJson = await meRes.json();
    assert(
      meRes.status === 200 &&
      meJson.data?.email === empEmail &&
      meJson.data?.role === 'EMPLOYEE',
      'Test 7: /auth/me returns current user profile',
      `Status: ${meRes.status}`
    );

    // 8. Employee can create claim (stores userId)
    const empClaimPayload = {
      claimant: 'Alice Employee',
      date: new Date().toISOString(),
      category: 'Meals & Entertainment',
      amount: 850,
      currency: 'INR',
      description: 'Business lunch with engineering client',
      receiptAvailable: true,
    };
    const createEmpClaimRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify(empClaimPayload),
    });
    const createEmpClaimJson = await createEmpClaimRes.json();
    assert(
      createEmpClaimRes.status === 201 &&
      createEmpClaimJson.data?.userId === empUser._id,
      'Test 8: Employee can create claim and userId is persisted',
      `Status: ${createEmpClaimRes.status}, userId: ${createEmpClaimJson.data?.userId}`
    );
    const empClaimId = createEmpClaimJson.data._id;

    // 9. Employee can access own claim
    const getOwnClaimRes = await fetch(`${BASE_URL}/claims/${empClaimId}`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const getOwnClaimJson = await getOwnClaimRes.json();
    assert(
      getOwnClaimRes.status === 200 && getOwnClaimJson.data?._id === empClaimId,
      'Test 9: Employee can access own claim',
      `Status: ${getOwnClaimRes.status}`
    );

    // 10. Employee cannot access another employee's claim
    const getOtherClaimRes = await fetch(`${BASE_URL}/claims/${empClaimId}`, {
      headers: { Authorization: `Bearer ${emp2Token}` },
    });
    const getOtherClaimJson = await getOtherClaimRes.json();
    assert(
      getOtherClaimRes.status === 403 && getOtherClaimJson.success === false,
      'Test 10: Employee cannot access another employee\'s claim (403 Forbidden)',
      `Status: ${getOtherClaimRes.status}`
    );

    // 11. Reviewer can access claims
    const revGetClaimRes = await fetch(`${BASE_URL}/claims/${empClaimId}`, {
      headers: { Authorization: `Bearer ${revToken}` },
    });
    const revGetClaimJson = await revGetClaimRes.json();
    assert(
      revGetClaimRes.status === 200 && revGetClaimJson.data?._id === empClaimId,
      'Test 11: Reviewer can access claim created by employee',
      `Status: ${revGetClaimRes.status}`
    );

    // 13. Reviewer-only endpoint rejects employee
    const empDecisionRes = await fetch(`${BASE_URL}/claims/${empClaimId}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        decision: 'APPROVED',
        notes: 'Employee attempting to self-approve',
      }),
    });
    const empDecisionJson = await empDecisionRes.json();
    assert(
      empDecisionRes.status === 403 && empDecisionJson.success === false,
      'Test 13: Reviewer-only endpoint rejects employee with 403 Forbidden',
      `Status: ${empDecisionRes.status}`
    );

    // 12. Reviewer can submit decisions
    const revDecisionRes = await fetch(`${BASE_URL}/claims/${empClaimId}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${revToken}`,
      },
      body: JSON.stringify({
        decision: 'APPROVED',
        notes: 'Approved by authorized policy reviewer',
      }),
    });
    const revDecisionJson = await revDecisionRes.json();
    assert(
      revDecisionRes.status === 200 && revDecisionJson.data?.status === 'APPROVED',
      'Test 12: Reviewer can submit decisions',
      `Status: ${revDecisionRes.status}`
    );

    // 14. Audit history still works (accessible to reviewer)
    const auditRes = await fetch(`${BASE_URL}/claims/${empClaimId}/audit-history`, {
      headers: { Authorization: `Bearer ${revToken}` },
    });
    const auditJson = await auditRes.json();
    assert(
      auditRes.status === 200 &&
      Array.isArray(auditJson.data) &&
      auditJson.data.length >= 2,
      'Test 14: Audit history still works and records events',
      `Events count: ${auditJson.data?.length}`
    );

    // 15. Existing validation still works
    const valRes = await fetch(`${BASE_URL}/claims/${empClaimId}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${revToken}` },
    });
    const valJson = await valRes.json();
    assert(
      valRes.status === 200 && valJson.data?.valid !== undefined,
      'Test 15: Existing validation still works',
      `Status: ${valRes.status}`
    );

    // 16. Existing AI review still works
    console.log('Testing AI review integration...');
    const reviewRes = await fetch(`${BASE_URL}/claims/${empClaimId}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${revToken}` },
    });
    const reviewJson = await reviewRes.json();
    assert(
      reviewRes.status === 200 && reviewJson.data?.aiReview?.reviewStatus,
      'Test 16: Existing AI review still works',
      `Status: ${reviewRes.status}, reviewStatus: ${reviewJson.data?.aiReview?.reviewStatus}`
    );

    // 17. Existing CRUD still works (unauthenticated legacy claim creation & retrieval)
    const legacyClaimRes = await fetch(`${BASE_URL}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimant: 'Legacy Guest',
        date: new Date().toISOString(),
        category: 'Office Supplies',
        amount: 250,
        currency: 'INR',
        description: 'Legacy unauthenticated expense submission',
        receiptAvailable: true,
      }),
    });
    const legacyClaimJson = await legacyClaimRes.json();
    assert(
      legacyClaimRes.status === 201 && legacyClaimJson.data?._id,
      'Test 17: Existing unauthenticated CRUD still works',
      `Status: ${legacyClaimRes.status}`
    );

    console.log(`\n========================================`);
    console.log(`AUTH TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
    console.log(`========================================\n`);

    if (passedTests === totalTests) {
      console.log('ALL AUTH TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.error('SOME AUTH TESTS FAILED!');
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected error running auth tests:', err);
    process.exit(1);
  }
};

runTests();
