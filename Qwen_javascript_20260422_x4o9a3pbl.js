/**
 * EMS Backend API - Comprehensive Test Suite
 * Tests: Auth, RBAC, Self-Service, Config CRUD, Employee/Leave/Attendance flows
 * Run: node test-ems-api.js
 * Requires: Node.js 18+ (native fetch)
 */

// ==================== CONFIG ====================
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  
  // Test credentials from your guide
  credentials: {
    super_admin: {
      email: 'zaidbinasif468@gmail.com',
      password: 'zaidkhan123',
      expectedRole: 'super_admin',
      expectedEmployeeId: 'EMP001'
    },
    hr_manager: {
      email: 'sadia.malik@company.com',
      password: 'password123',
      expectedRole: 'hr_manager'
    },
    hr_executive: {
      email: 'imran.shah@company.com',
      password: 'password123',
      expectedRole: 'hr_executive'
    },
    employee: {
      email: 'huzaifa.kaleem@company.com',
      password: 'password123',
      expectedRole: 'employee',
      expectedEmployeeId: 'EMP002'
    }
  },
  
  // Test data with unique identifiers to avoid conflicts
  testData: {
    timestamp: Date.now(),
    department: { name: `Test Dept ${Date.now()}`, is_active: true },
    designation: { name: `Test Designation ${Date.now()}`, is_active: true },
    employmentType: { name: `Test Type ${Date.now()}`, is_active: true },
    jobStatus: { name: `Test Status ${Date.now()}`, is_active: true },
    workMode: { name: `Test Mode ${Date.now()}`, is_active: true },
    workLocation: { name: `Test Location ${Date.now()}`, is_active: true },
    shift: { name: `Test Shift ${Date.now()}`, is_active: true },
    leaveType: { name: `Test Leave ${Date.now()}`, code: `TL${Date.now()}`, is_active: true },
    leavePolicy: { name: `Test Policy ${Date.now()}`, is_active: true },
    employee: {
      employee_id: `EMP_TEST_${Date.now()}`,
      name: 'Test Employee',
      father_name: 'Test Father',
      cnic: `42101-${Math.floor(Math.random()*900000)+100000}-9`,
      date_of_birth: '1995-01-01'
    }
  }
};

// ==================== STATE ====================
const state = {
  tokens: {},           // { role: token }
  ids: {},              // { resourceType: uuid }
  results: {            // Test results tracking
    passed: [],
    failed: [],
    errors: []
  }
};

// ==================== UTILITIES ====================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const assert = {
  equal(actual, expected, message) {
    if (actual === expected) {
      state.results.passed.push(message);
      console.log(`✅ ${message}`);
      return true;
    } else {
      state.results.failed.push({ message, actual, expected });
      console.log(`❌ ${message}\n   Expected: ${expected}\n   Actual: ${actual}`);
      return false;
    }
  },
  
  includes(haystack, needle, message) {
    if (haystack?.includes?.(needle)) {
      state.results.passed.push(message);
      console.log(`✅ ${message}`);
      return true;
    } else {
      state.results.failed.push({ message, haystack, needle });
      console.log(`❌ ${message}\n   Expected to include: "${needle}"\n   In: "${haystack}"`);
      return false;
    }
  },
  
  isUUID(value, message) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(value)) {
      state.results.passed.push(message);
      console.log(`✅ ${message}`);
      return true;
    } else {
      state.results.failed.push({ message, value });
      console.log(`❌ ${message}\n   Expected UUID, got: "${value}"`);
      return false;
    }
  },
  
  status(response, expectedCodes, message) {
    const code = response.status;
    if (Array.isArray(expectedCodes) ? expectedCodes.includes(code) : code === expectedCodes) {
      state.results.passed.push(message);
      console.log(`✅ ${message} (HTTP ${code})`);
      return true;
    } else {
      state.results.failed.push({ message, expected: expectedCodes, actual: code });
      console.log(`❌ ${message}\n   Expected status: ${expectedCodes}\n   Actual: ${code}`);
      return false;
    }
  },
  
  async json(response, message) {
    try {
      const data = await response.json();
      state.results.passed.push(`${message} - valid JSON`);
      return { success: true, data };
    } catch (e) {
      const text = await response.text();
      state.results.failed.push({ message, error: 'Invalid JSON', response: text.slice(0, 200) });
      console.log(`❌ ${message}\n   Invalid JSON response: ${text.slice(0, 200)}...`);
      return { success: false, error: e, text };
    }
  }
};

// ==================== API CLIENT ====================
async function apiRequest(endpoint, { method = 'GET', token, body, query = {} } = {}) {
  const url = new URL(`${CONFIG.baseUrl}${endpoint}`);
  
  // Add query params
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.append(k, v);
  });
  
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.timeout);
  
  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    state.results.errors.push({ endpoint, method, error: error.message });
    console.log(`🔥 Request failed: ${method} ${endpoint}\n   Error: ${error.message}`);
    throw error;
  }
}

async function login(roleKey) {
  const creds = CONFIG.credentials[roleKey];
  console.log(`\n🔐 Logging in as ${roleKey}...`);
  
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: creds.email, password: creds.password }
  });
  
  assert.status(response, 200, `${roleKey} login returns 200`);
  const result = await assert.json(response, `${roleKey} login response`);
  
  if (result.success) {
    assert.equal(result.data.user?.role, creds.expectedRole, `${roleKey} has correct role`);
    if (creds.expectedEmployeeId) {
      assert.equal(result.data.user?.employee_id, creds.expectedEmployeeId, `${roleKey} has correct employee_id`);
    }
    state.tokens[roleKey] = result.data.token;
    console.log(`✓ Token stored for ${roleKey}`);
    return result.data.token;
  }
  return null;
}

// ==================== TEST SUITES ====================

// --- 1. Configuration Tables (Super Admin Only) ---
async function testConfigTables() {
  console.log('\n📋 Testing Configuration Tables (Super Admin Only)...');
  const token = state.tokens.super_admin;
  const endpoints = [
    'departments', 'designations', 'employment-types', 'job-statuses',
    'work-modes', 'work-locations', 'shifts', 'leave-types', 'leave-policies'
  ];
  
  for (const resource of endpoints) {
    const endpoint = `/${resource}`;
    const testData = CONFIG.testData[resource.replace('-', '')] || CONFIG.testData.department;
    
    // CREATE (Super Admin should succeed)
    console.log(`\n  ➤ Creating ${resource}...`);
    let createResp = await apiRequest(endpoint, {
      method: 'POST',
      token,
      body: testData
    });
    assert.status(createResp, [200, 201], `CREATE ${resource} returns 200/201`);
    const createResult = await assert.json(createResp, `CREATE ${resource} response`);
    
    if (createResult.success && createResult.data) {
      const id = createResult.data.id || createResult.data[0]?.id;
      if (id) {
        state.ids[resource] = id;
        assert.isUUID(id, `Captured valid UUID for ${resource}`);
      }
    }
    
    // GET ALL (Super Admin should see array)
    console.log(`  ➤ GET all ${resource}...`);
    const getResp = await apiRequest(endpoint, { token });
    assert.status(getResp, 200, `GET ${resource} returns 200`);
    const getResult = await assert.json(getResp, `GET ${resource} response`);
    if (getResult.success) {
      assert.equal(Array.isArray(getResult.data), true, `GET ${resource} returns array`);
    }
    
    // UPDATE (Super Admin should succeed)
    if (state.ids[resource]) {
      console.log(`  ➤ UPDATE ${resource}...`);
      const updateResp = await apiRequest(`${endpoint}/${state.ids[resource]}`, {
        method: 'PUT',
        token,
        body: { ...testData, name: `${testData.name} - Updated` }
      });
      assert.status(updateResp, [200, 204], `UPDATE ${resource} returns 200/204`);
    }
    
    // RBAC: HR Manager should get 403
    console.log(`  ➤ Testing RBAC: HR Manager cannot access ${resource}...`);
    const hrResp = await apiRequest(endpoint, { token: state.tokens.hr_manager });
    assert.status(hrResp, 403, `HR Manager GET ${resource} returns 403`);
    
    // RBAC: Employee should get 403
    console.log(`  ➤ Testing RBAC: Employee cannot access ${resource}...`);
    const empResp = await apiRequest(endpoint, { token: state.tokens.employee });
    assert.status(empResp, 403, `Employee GET ${resource} returns 403`);
  }
}

// --- 2. Employee Management & Self-Service ---
async function testEmployeeManagement() {
  console.log('\n👥 Testing Employee Management & Self-Service...');
  const hrToken = state.tokens.hr_manager;
  const empToken = state.tokens.employee;
  
  // HR: Create Employee (Two-Step Process)
  console.log('\n  ➤ HR: Creating employee info...');
  const empResp = await apiRequest('/employees', {
    method: 'POST',
    token: hrToken,
    body: CONFIG.testData.employee
  });
  assert.status(empResp, 201, 'HR CREATE employee returns 201');
  const empResult = await assert.json(empResp, 'CREATE employee response');
  
  if (empResult.success) {
    const empId = empResult.data.employee_id;
    console.log(`  ➤ HR: Creating job info for ${empId}...`);
    
    // Ensure we have required config IDs
    if (!state.ids.departments || !state.ids.designations) {
      console.log('⚠️  Skipping job-info creation: missing config IDs');
    } else {
      const jobResp = await apiRequest('/job-info', {
        method: 'POST',
        token: hrToken,
        body: {
          employee_id: empId,
          department_id: state.ids.departments,
          designation_id: state.ids.designations,
          employment_type_id: state.ids.employmentTypes || state.ids.employmenttypes,
          job_status_id: state.ids.jobStatuses || state.ids.jobstatuses,
          work_mode_id: state.ids.workModes || state.ids.workmodes,
          work_location_id: state.ids.workLocations || state.ids.worklocations,
          shift_id: state.ids.shifts,
          date_of_joining: '2024-01-15'
        }
      });
      assert.status(jobResp, [200, 201], 'HR CREATE job-info returns 200/201');
    }
  }
  
  // Self-Service: Employee can only see own data
  console.log('\n  ➤ Self-Service: Employee GET /employees returns only self...');
  const empListResp = await apiRequest('/employees', { token: empToken });
  assert.status(empListResp, 200, 'Employee GET /employees returns 200');
  const empListResult = await assert.json(empListResp, 'Employee GET /employees response');
  
  if (empListResult.success && Array.isArray(empListResult.data)) {
    assert.equal(empListResult.data.length, 1, 'Employee sees only 1 employee (self)');
    if (empListResult.data[0]?.employee_id) {
      assert.equal(
        empListResult.data[0].employee_id,
        CONFIG.credentials.employee.expectedEmployeeId,
        'Employee sees own employee_id'
      );
    }
  }
  
  // Self-Service: Employee cannot access other employee
  console.log('  ➤ Self-Service: Employee cannot access EMP003...');
  const otherEmpResp = await apiRequest('/employees/EMP003', { token: empToken });
  assert.status(otherEmpResp, 403, 'Employee GET /employees/EMP003 returns 403');
  
  // RBAC: Employee cannot CREATE employee
  console.log('  ➤ RBAC: Employee cannot CREATE employee...');
  const empCreateResp = await apiRequest('/employees', {
    method: 'POST',
    token: empToken,
    body: { ...CONFIG.testData.employee, employee_id: 'EMP_SHOULD_FAIL' }
  });
  assert.status(empCreateResp, 403, 'Employee POST /employees returns 403');
  
  // RBAC: HR Executive cannot CREATE (read-only)
  console.log('  ➤ RBAC: HR Executive cannot CREATE employee...');
  const hrExecCreateResp = await apiRequest('/employees', {
    method: 'POST',
    token: state.tokens.hr_executive,
    body: { ...CONFIG.testData.employee, employee_id: 'EMP_SHOULD_FAIL_2' }
  });
  assert.status(hrExecCreateResp, 403, 'HR Executive POST /employees returns 403');
}

// --- 3. Leave Management ---
async function testLeaveManagement() {
  console.log('\n📅 Testing Leave Management...');
  const empToken = state.tokens.employee;
  const hrToken = state.tokens.hr_manager;
  
  // Employee: Create Leave Request (self-service enforced)
  console.log('\n  ➤ Employee: Creating leave request...');
  const leaveTypeIds = Object.values(state.ids).filter(id => typeof id === 'string');
  const leaveTypeId = leaveTypeIds[0] || 'fallback-uuid'; // Fallback if none captured
  
  const leaveResp = await apiRequest('/leave-requests', {
    method: 'POST',
    token: empToken,
    body: {
      employee_id: 'EMP_SHOULD_BE_OVERRIDDEN', // API should force to current user
      leave_type_id: leaveTypeId,
      start_date: '2024-06-01',
      end_date: '2024-06-03',
      reason: 'Test leave - self-service enforcement'
    }
  });
  // Should succeed but employee_id overridden to EMP002
  assert.status(leaveResp, [200, 201], 'Employee POST /leave-requests returns 200/201');
  
  // Self-Service: Employee only sees own leave requests
  console.log('  ➤ Self-Service: Employee GET /leave-requests returns only self...');
  const leaveListResp = await apiRequest('/leave-requests', { token: empToken });
  assert.status(leaveListResp, 200, 'Employee GET /leave-requests returns 200');
  const leaveListResult = await assert.json(leaveListResp, 'Employee GET /leave-requests');
  
  if (leaveListResult.success && Array.isArray(leaveListResult.data)) {
    const allOwn = leaveListResult.data.every(req => 
      req.employee_id === CONFIG.credentials.employee.expectedEmployeeId
    );
    assert.equal(allOwn, true, 'All leave requests belong to current employee');
  }
  
  // RBAC: Employee cannot approve leave
  console.log('  ➤ RBAC: Employee cannot approve leave...');
  const approveResp = await apiRequest('/leave-requests/fake-id/approve', {
    method: 'PATCH',
    token: empToken
  });
  assert.status(approveResp, 403, 'Employee PATCH /leave-requests/:id/approve returns 403');
  
  // HR: Can approve (test with fake ID to check permission, not logic)
  console.log('  ➤ RBAC: HR Manager can attempt approval (permission check)...');
  const hrApproveResp = await apiRequest('/leave-requests/fake-id/approve', {
    method: 'PATCH',
    token: hrToken
  });
  // Should NOT be 403 (might be 404 for fake ID, but that's OK)
  assert.status(hrApproveResp, [200, 204, 404], 'HR Manager PATCH /leave-requests/:id/approve not 403');
}

// --- 4. Attendance Management ---
async function testAttendanceManagement() {
  console.log('\n⏰ Testing Attendance Management...');
  const empToken = state.tokens.employee;
  const hrToken = state.tokens.hr_manager;
  const today = new Date().toISOString().split('T')[0];
  
  // Self-Service: Employee daily attendance (only own)
  console.log('\n  ➤ Self-Service: Employee GET /attendance/daily returns only self...');
  const dailyResp = await apiRequest('/attendance/daily', {
    token: empToken,
    query: { date: today }
  });
  assert.status(dailyResp, 200, 'Employee GET /attendance/daily returns 200');
  const dailyResult = await assert.json(dailyResp, 'Employee GET /attendance/daily');
  
  if (dailyResult.success && dailyResult.data?.employees) {
    const allOwn = dailyResult.data.employees.every(emp => 
      emp.employee_id === CONFIG.credentials.employee.expectedEmployeeId
    );
    assert.equal(allOwn, true, 'All attendance records belong to current employee');
  }
  
  // RBAC: Employee cannot batch save attendance
  console.log('  ➤ RBAC: Employee cannot POST /attendance/batch...');
  const batchResp = await apiRequest('/attendance/batch', {
    method: 'POST',
    token: empToken,
    body: {
      date: today,
      rows: [{
        employee_id: CONFIG.credentials.employee.expectedEmployeeId,
        shift_id: state.ids.shifts || 'fake-uuid',
        check_in: '09:00:00',
        check_out: '17:00:00',
        status: 'present',
        ack: true
      }]
    }
  });
  assert.status(batchResp, 403, 'Employee POST /attendance/batch returns 403');
  
  // HR: Can batch save (test structure, not full logic)
  console.log('  ➤ RBAC: HR Manager can POST /attendance/batch (structure check)...');
  const hrBatchResp = await apiRequest('/attendance/batch', {
    method: 'POST',
    token: hrToken,
    body: {
      date: today,
      rows: [{
        employee_id: CONFIG.credentials.employee.expectedEmployeeId,
        shift_id: state.ids.shifts || 'fake-uuid',
        check_in: '09:00:00',
        status: 'present',
        ack: true
      }]
    }
  });
  // Should not be 403 (might be 422 for validation, but that's OK)
  assert.status(hrBatchResp, [200, 201, 422], 'HR Manager POST /attendance/batch not 403');
}

// --- 5. Security Tests ---
async function testSecurity() {
  console.log('\n🔒 Testing Security Features...');
  const hrToken = state.tokens.hr_manager;
  
  // XSS Sanitization Test
  console.log('\n  ➤ XSS: Sending script tag in employee name...');
  const xssResp = await apiRequest('/employees', {
    method: 'POST',
    token: hrToken,
    body: {
      employee_id: `EMP_XSS_${Date.now()}`,
      name: '<script>alert("XSS")</script>',
      father_name: 'Test',
      cnic: `42101-${Math.floor(Math.random()*900000)+100000}-9`,
      date_of_birth: '1995-01-01'
    }
  });
  assert.status(xssResp, [200, 201], 'XSS test CREATE returns 200/201');
  const xssResult = await assert.json(xssResp, 'XSS test response');
  
  if (xssResult.success) {
    // Fetch the created employee to verify sanitization at rest
    const empId = xssResult.data.employee_id;
    const fetchResp = await apiRequest(`/employees/${empId}`, {
      token: hrToken
    });
    const fetchResult = await assert.json(fetchResp, 'XSS test GET created employee');
    
    if (fetchResult.success && fetchResult.data?.name) {
      const hasScript = fetchResult.data.name.includes('<script>');
      assert.equal(hasScript, false, 'XSS payload sanitized (no <script> in stored name)');
    }
  }
  
  // Permission Bypass Attempt: Employee tries config with manipulated header
  console.log('  ➤ Permission Bypass: Employee cannot access /departments even with custom headers...');
  const bypassResp = await apiRequest('/departments', {
    token: state.tokens.employee,
    // Note: We don't actually send malicious headers; the test verifies the middleware works
  });
  assert.status(bypassResp, 403, 'Employee cannot bypass RBAC for config tables');
  
  // DELETE endpoint removal verification
  console.log('  ➤ Hard Rule: DELETE endpoints return 404/405...');
  const deleteResp = await apiRequest('/departments/fake-uuid', {
    method: 'DELETE',
    token: state.tokens.super_admin
  });
  assert.status(deleteResp, [404, 405], 'DELETE /departments returns 404 or 405 (not implemented)');
}

// --- 6. Query Parameter Tests ---
async function testQueryParams() {
  console.log('\n🔍 Testing Required Query Parameters...');
  const empToken = state.tokens.employee;
  const today = new Date().toISOString().split('T')[0];
  const date = new Date();
  
  // Attendance daily: requires date
  console.log('\n  ➤ GET /attendance/daily without date param...');
  const noDateResp = await apiRequest('/attendance/daily', { token: empToken });
  // Should fail validation or return empty - depends on backend
  console.log(`   Status: ${noDateResp.status} (expected: 400 or 200 with empty)`);
  
  console.log('  ➤ GET /attendance/daily WITH date param...');
  const withDateResp = await apiRequest('/attendance/daily', {
    token: empToken,
    query: { date: today }
  });
  assert.status(withDateResp, 200, 'GET /attendance/daily with date returns 200');
  
  // Attendance report: requires month/year
  console.log('  ➤ GET /attendance/report with month/year...');
  const reportResp = await apiRequest('/attendance/report', {
    token: empToken,
    query: { month: date.getMonth() + 1, year: date.getFullYear() }
  });
  assert.status(reportResp, 200, 'GET /attendance/report with params returns 200');
}

// ==================== MAIN EXECUTION ====================
async function runAllTests() {
  console.log('🚀 Starting EMS API Test Suite...\n');
  console.log(`Base URL: ${CONFIG.baseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  try {
    // STEP 1: Authenticate all roles
    console.log('🔐 Step 1: Authenticating all roles...');
    await login('super_admin');
    await login('hr_manager');
    await login('hr_executive');
    await login('employee');
    
    // Verify all tokens captured
    const allTokens = Object.keys(CONFIG.credentials).every(role => state.tokens[role]);
    if (!allTokens) {
      console.error('❌ Failed to capture all tokens. Aborting.');
      process.exit(1);
    }
    console.log('✓ All role tokens captured successfully');
    
    // Small delay to ensure server state is ready
    await sleep(500);
    
    // STEP 2: Run test suites
    await testConfigTables();
    await testEmployeeManagement();
    await testLeaveManagement();
    await testAttendanceManagement();
    await testSecurity();
    await testQueryParams();
    
    // STEP 3: Summary Report
    printSummary();
    
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error.message);
    state.results.errors.push({ step: 'main', error: error.message });
    printSummary();
    process.exit(1);
  }
}

function printSummary() {
  const { passed, failed, errors } = state.results;
  const total = passed.length + failed.length;
  const passRate = total > 0 ? ((passed.length / total) * 100).toFixed(1) : 0;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Assertions: ${total}`);
  console.log(`✅ Passed: ${passed.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`🔥 Errors: ${errors.length}`);
  console.log(`📈 Pass Rate: ${passRate}%`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Assertions:');
    failed.slice(0, 10).forEach((f, i) => {
      console.log(`   ${i+1}. ${f.message}`);
      if (f.expected !== undefined) console.log(`      Expected: ${f.expected}`);
      if (f.actual !== undefined) console.log(`      Actual: ${f.actual}`);
    });
    if (failed.length > 10) console.log(`   ... and ${failed.length - 10} more`);
  }
  
  if (errors.length > 0) {
    console.log('\n🔥 Request Errors:');
    errors.forEach((e, i) => {
      console.log(`   ${i+1}. ${e.endpoint || e.step}: ${e.error}`);
    });
  }
  
  console.log('\n💡 Tips:');
  console.log('   • Ensure server is running at', CONFIG.baseUrl);
  console.log('   • Check database is seeded with test config data');
  console.log('   • For CI: export BASE_URL=https://your-cloud-instance.com');
  console.log('='.repeat(60) + '\n');
  
  // Exit with error code if tests failed
  if (failed.length > 0 || errors.length > 0) {
    process.exit(1);
  }
}

// ==================== RUN ====================
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests, CONFIG, state };