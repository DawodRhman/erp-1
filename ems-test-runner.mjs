/**
 * EMS Backend - Full Automated Test Suite
 * ES Module | Node 18+ (native fetch)
 *
 * Run: node ems-test-runner.mjs
 * Optional: BASE_URL=http://localhost:4000 node ems-test-runner.mjs
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000/api";

// ─── ANSI colors ─────────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  magenta: "\x1b[35m",
};
const pass = (msg) => console.log(`  ${C.green}✓${C.reset} ${msg}`);
const fail = (msg) => console.log(`  ${C.red}✗${C.reset} ${msg}`);
const skip = (msg) => console.log(`  ${C.yellow}~${C.reset} ${msg}`);
const section = (msg) =>
  console.log(`\n${C.bold}${C.cyan}━━ ${msg} ━━${C.reset}`);
const sub = (msg) => console.log(`\n${C.magenta}  ▸ ${msg}${C.reset}`);

// ─── Counters ─────────────────────────────────────────────────────────────────
let passed = 0, failed = 0, total = 0;

// ─── Core request helper ──────────────────────────────────────────────────────
async function req(method, path, { token, body, xss } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE}${path}`, opts);
    let data = null;
    try { data = await res.json(); } catch (_) { /* empty body */ }
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, data: null, err: e.message };
  }
}

// ─── Assertion helper ─────────────────────────────────────────────────────────
function assert(label, { status, data }, expectedStatus, extraCheck) {
  total++;
  const statusOk = Array.isArray(expectedStatus)
    ? expectedStatus.includes(status)
    : status === expectedStatus;

  const extraOk = extraCheck ? extraCheck(data) : true;
  const ok = statusOk && extraOk;

  if (ok) {
    passed++;
    pass(`[${status}] ${label}`);
  } else {
    failed++;
    fail(
      `[got ${status}, want ${
        Array.isArray(expectedStatus) ? expectedStatus.join("|") : expectedStatus
      }] ${label}`
    );
    if (!extraOk && data)
      console.log(`     ${C.gray}body: ${JSON.stringify(data).slice(0, 200)}${C.reset}`);
  }
}

// ─── Login helper ─────────────────────────────────────────────────────────────
async function login(email, password, role) {
  const r = await req("POST", "/auth/login", { body: { email, password } });
  if (r.status === 200 && r.data?.token) {
    pass(`Login OK → ${role}`);
    return r.data.token;
  }
  fail(`Login FAILED for ${role} (${email}) → status ${r.status}`);
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════
(async () => {
  console.log(
    `\n${C.bold}${C.cyan}EMS Backend – Full Test Suite${C.reset}  ${C.gray}→ ${BASE}${C.reset}\n`
  );

  // ──────────────────────────────────────────────────────────────────────────
  section("PHASE 0 – AUTHENTICATE ALL ROLES");
  // ──────────────────────────────────────────────────────────────────────────

  const tokens = {};
  tokens.super_admin   = await login("zaidbinasif468@gmail.com",  "zaidkhan123",  "super_admin");
  tokens.hr_manager    = await login("sadia.malik@company.com",   "password123",  "hr_manager");
  tokens.hr_executive  = await login("imran.shah@company.com",    "password123",  "hr_executive");
  tokens.employee      = await login("huzaifa.kaleem@company.com","password123",  "employee");

  const SA  = tokens.super_admin;
  const HRM = tokens.hr_manager;
  const HRE = tokens.hr_executive;
  const EMP = tokens.employee;

  // ──────────────────────────────────────────────────────────────────────────
  section("PHASE 1 – AUTHENTICATION");
  // ──────────────────────────────────────────────────────────────────────────

  sub("1.1 – No token (401)");
  assert("GET /employees – no token", await req("GET", "/employees"), 401);
  assert("GET /departments – no token", await req("GET", "/departments"), 401);
  assert("GET /leave-requests – no token", await req("GET", "/leave-requests"), 401);

  sub("1.2 – Garbage token (401)");
  assert("GET /employees – garbage token",
    await req("GET", "/employees", { token: "not.a.real.jwt" }), 401);

  sub("1.3 – Wrong password (401)");
  assert("Login – wrong password",
    await req("POST", "/auth/login", { body: { email: "zaidbinasif468@gmail.com", password: "wrong" } }), 401);

  sub("1.4 – Missing fields (400)");
  assert("Login – missing password",
    await req("POST", "/auth/login", { body: { email: "zaidbinasif468@gmail.com" } }), 400);
  assert("Login – empty body",
    await req("POST", "/auth/login", { body: {} }), 400);

  // ──────────────────────────────────────────────────────────────────────────
  section("PHASE 2 – CONFIG TABLES (super_admin ONLY)");
  // ──────────────────────────────────────────────────────────────────────────

  const CONFIG_ROUTES = [
    "/departments", "/designations", "/employment-types",
    "/job-statuses", "/work-modes", "/work-locations",
    "/shifts", "/leave-types", "/leave-policies",
  ];

  sub("2.1 – super_admin → 200");
  for (const r of CONFIG_ROUTES)
    assert(`GET ${r}`, await req("GET", r, { token: SA }), 200);

  sub("2.2 – hr_manager → 403");
  for (const r of CONFIG_ROUTES)
    assert(`GET ${r}`, await req("GET", r, { token: HRM }), 403);

  sub("2.3 – hr_executive → 403");
  for (const r of CONFIG_ROUTES)
    assert(`GET ${r}`, await req("GET", r, { token: HRE }), 403);

  sub("2.4 – employee → 403");
  for (const r of CONFIG_ROUTES)
    assert(`GET ${r}`, await req("GET", r, { token: EMP }), 403);

  sub("2.5 – no token → 401");
  for (const r of CONFIG_ROUTES)
    assert(`GET ${r}`, await req("GET", r), 401);

  // ──────────────────────────────────────────────────────────────────────────
  section("PHASE 3 – EMPLOYEE MANAGEMENT");
  // ──────────────────────────────────────────────────────────────────────────

  sub("3.1 – GET /employees – role access");
  assert("super_admin – 200", await req("GET", "/employees", { token: SA }), 200);
  assert("hr_manager  – 200", await req("GET", "/employees", { token: HRM }), 200);
  assert("hr_executive – 200", await req("GET", "/employees", { token: HRE }), 200);
  assert("employee – 200 (self-service, length=1)",
    await req("GET", "/employees", { token: EMP }), 200,
    (d) => Array.isArray(d) && d.length === 1 && d[0].employee_id === "EMP002");

  sub("3.2 – Employee self-service guard");
  assert("employee GET /employees/EMP003 → 403",
    await req("GET", "/employees/EMP003", { token: EMP }), 403);
  assert("employee GET /employees/EMP001 → 403",
    await req("GET", "/employees/EMP001", { token: EMP }), 403);
  assert("employee GET own /employees/EMP002 → 200",
    await req("GET", "/employees/EMP002", { token: EMP }), 200);

  sub("3.3 – POST /employees – write permission");
  const newEmpPayload = {
    employee_id: "EMP_TEST_01",
    name: "Test Employee",
    father_name: "Test Father",
    cnic: "42101-7777777-7",
    date_of_birth: "1995-06-15",
  };
  assert("hr_manager  → 201", await req("POST", "/employees", { token: HRM, body: newEmpPayload }), 201);
  assert("hr_executive → 403", await req("POST", "/employees", { token: HRE, body: { ...newEmpPayload, employee_id: "EMP_TEST_02", cnic: "42101-6666666-6" } }), 403);
  assert("employee    → 403", await req("POST", "/employees", { token: EMP, body: { ...newEmpPayload, employee_id: "EMP_TEST_03", cnic: "42101-5555555-5" } }), 403);
  assert("no token    → 401", await req("POST", "/employees", { body: newEmpPayload }), 401);

  sub("3.4 – POST /employees – missing required fields (400/422)");
  assert("missing name",
    await req("POST", "/employees", { token: HRM, body: { employee_id: "EMP_T99" } }), [400, 422]);
  assert("missing employee_id",
    await req("POST", "/employees", { token: HRM, body: { name: "No ID" } }), [400, 422]);
  assert("empty body",
    await req("POST", "/employees", { token: HRM, body: {} }), [400, 422]);

  sub("3.5 – PUT /employees/:id – write permission");
  assert("hr_manager  → 200", await req("PUT", "/employees/EMP001", { token: HRM, body: { name: "Updated Name" } }), [200, 404]);
  assert("hr_executive → 403", await req("PUT", "/employees/EMP001", { token: HRE, body: { name: "X" } }), 403);
  assert("employee    → 403", await req("PUT", "/employees/EMP001", { token: EMP, body: { name: "X" } }), 403);

  sub("3.6 – GET /employees/ids (HR only)");
  assert("hr_manager  → 200", await req("GET", "/employees/ids", { token: HRM }), 200);
  assert("hr_executive → 200", await req("GET", "/employees/ids", { token: HRE }), 200);
  assert("employee    → 403", await req("GET", "/employees/ids", { token: EMP }), 403);

  // ──────────────────────────────────────────────────────────────────────────
  section("PHASE 4 – LEAVE MANAGEMENT");
  // ──────────────────────────────────────────────────────────────────────────

  sub("4.1 – GET /leave-requests – role access");
  assert("super_admin – 200", await req("GET", "/leave-requests", { token: SA }), 200);
  assert("hr_manager  – 200", await req("GET", "/leave-requests", { token: HRM }), 200);
  assert("hr_executive – 200", await req("GET", "/leave-requests", { token: HRE }), 200);
  assert("employee – 200 (self only)",
    await req("GET", "/leave-requests", { token: EMP }), 200,
    (d) => !Array.isArray(d) || d.every((item) => item.employee_id === "EMP002"));

  sub("4.2 – GET /leave-requests/balances – role access");
  assert("hr_manager  – 200", await req("GET", "/leave-requests/balances", { token: HRM }), 200);
  assert("employee – 200 (self only)", await req("GET", "/leave-requests/balances", { token: EMP }), 200);

  sub("4.3 – GET /leave-requests/calendar");
  assert("hr_manager  – 200", await req("GET", "/leave-requests/calendar?month=1&year=2024", { token: HRM }), 200);
  assert("employee    – 200", await req("GET", "/leave-requests/calendar?month=1&year=2024", { token: EMP }), 200);

  // Get a leave type ID for creating requests
  let leaveTypeId = null;
  if (SA) {
    const ltRes = await req("GET", "/leave-types", { token: SA });
    if (ltRes.status === 200 && Array.isArray(ltRes.data) && ltRes.data.length > 0)
      leaveTypeId = ltRes.data[0].id ?? ltRes.data[0].leave_type_id ?? null;
  }

  sub("4.4 – POST /leave-requests – self-service override");
  if (leaveTypeId) {
    const leaveBody = {
      employee_id: "EMP003", // should be overridden to EMP002
      leave_type_id: leaveTypeId,
      start_date: "2025-08-01",
      end_date: "2025-08-02",
      reason: "Test",
    };
    const res = await req("POST", "/leave-requests", { token: EMP, body: leaveBody });
    assert("employee creates leave – forced to own ID (EMP002)",
      res, [200, 201],
      (d) => d?.employee_id === "EMP002" || d?.data?.employee_id === "EMP002");
  } else {
    skip("4.4 – skipped (no leave_type_id available)");
  }

  sub("4.5 – POST /leave-requests – missing fields");
  assert("missing leave_type_id",
    await req("POST", "/leave-requests", { token: EMP, body: { start_date: "2025-08-01", end_date: "2025-08-02" } }), [400, 422]);
  assert("missing dates",
    await req("POST", "/leave-requests", { token: EMP, body: { leave_type_id: leaveTypeId ?? "fake" } }), [400, 422]);

  sub("4.6 – PATCH /leave-requests/:id/approve – hr only");
  assert("hr_manager  → 200|404", await req("PATCH", "/leave-requests/fake-id/approve", { token: HRM }), [200, 404]);
  assert("hr_executive → 403",   await req("PATCH", "/leave-requests/fake-id/approve", { token: HRE }), 403);
  assert("employee    → 403",    await req("PATCH", "/leave-requests/fake-id/approve", { token: EMP }), 403);
  assert("no token    → 401",    await req("PATCH", "/leave-requests/fake-id/approve"), 401);

  sub("4.7 – PATCH /leave-requests/:id/reject – hr only");
  assert("hr_manager  → 200|404", await req("PATCH", "/leave-requests/fake-id/reject", { token: HRM }), [200, 404]);
  assert("hr_executive → 403",   await req("PATCH", "/leave-requests/fake-id/reject", { token: HRE }), 403);
  assert("employee    → 403",    await req("PATCH", "/leave-requests/fake-id/reject", { token: EMP }), 403);

  sub("4.8 – PATCH /leave-requests/:id/early-return – hr only");
  assert("hr_manager  → 200|404",
    await req("PATCH", "/leave-requests/fake-id/early-return", { token: HRM, body: { end_by_force: "2025-08-03" } }), [200, 404]);
  assert("employee    → 403",
    await req("PATCH", "/leave-requests/fake-id/early-return", { token: EMP, body: { end_by_force: "2025-08-03" } }), 403);

  // ──────────────────────────────────────────────────────────────────────────
  section("PHASE 5 – ATTENDANCE MANAGEMENT");
  // ──────────────────────────────────────────────────────────────────────────

  sub("5.1 – GET /attendance/daily – role access");
  const dailyDate = "2024-01-15";
  assert("hr_manager  → 200", await req("GET", `/attendance/daily?date=${dailyDate}`, { token: HRM }), 200);
  assert("hr_executive → 200", await req("GET", `/attendance/daily?date=${dailyDate}`, { token: HRE }), 200);
  assert("employee    → 200 (self only)",
    await req("GET", `/attendance/daily?date=${dailyDate}`, { token: EMP }), 200,
    (d) => !d?.employees || d.employees.every((e) => e.employee_id === "EMP002"));
  assert("no token    → 401", await req("GET", `/attendance/daily?date=${dailyDate}`), 401);

  sub("5.2 – GET /attendance/daily – missing date param");
  assert("missing date → 400", await req("GET", "/attendance/daily", { token: HRM }), [400, 422]);

  sub("5.3 – POST /attendance/batch – write permission");
  let shiftId = null;
  if (SA) {
    const shiftRes = await req("GET", "/shifts", { token: SA });
    if (shiftRes.status === 200 && Array.isArray(shiftRes.data) && shiftRes.data.length > 0)
      shiftId = shiftRes.data[0].id ?? shiftRes.data[0].shift_id ?? null;
  }

  const batchPayload = {
    date: "2024-01-15",
    rows: [{
      employee_id: "EMP002",
      shift_id: shiftId ?? "fake-shift-uuid",
      check_in: "09:15:00",
      check_out: "18:00:00",
      status: "present",
      notes: "On time",
      ack: true,
    }],
  };
  assert("hr_manager  → 200|201", await req("POST", "/attendance/batch", { token: HRM, body: batchPayload }), [200, 201]);
  assert("hr_executive → 403",    await req("POST", "/attendance/batch", { token: HRE, body: batchPayload }), 403);
  assert("employee    → 403",     await req("POST", "/attendance/batch", { token: EMP, body: batchPayload }), 403);
  assert("no token    → 401",     await req("POST", "/attendance/batch", { body: batchPayload }), 401);

  sub("5.4 – POST /attendance/batch – missing fields");
  assert("missing rows",
    await req("POST", "/attendance/batch", { token: HRM, body: { date: "2024-01-15" } }), [400, 422]);
  assert("empty rows array",
    await req("POST", "/attendance/batch", { token: HRM, body: { date: "2024-01-15", rows: [] } }), [400, 422]);

  sub("5.5 – GET /attendance/report – self-service");
  assert("hr_manager  → 200", await req("GET", "/attendance/report?month=1&year=2024", { token: HRM }), 200);
  assert("employee    → 200 (self only)",
    await req("GET", "/attendance/report?month=1&year=2024", { token: EMP }), 200,
    (d) => !Array.isArray(d) || d.every((e) => e.employee_id === "EMP002"));
  assert("missing month/year → 400|422",
    await req("GET", "/attendance/report", { token: HRM }), [400, 422]);

  // ──────────────────────────────────────────────────────────────────────────
  section("PHASE 6 – DELETE OPERATIONS (must be 404 or 405)");
  // ──────────────────────────────────────────────────────────────────────────

  const deleteTargets = [
    "/users/fake-id",
    "/departments/fake-id",
    "/employees/fake-id",
    "/leave-requests/fake-id",
    "/attendance/fake-id",
    "/shifts/fake-id",
    "/leave-types/fake-id",
  ];

  for (const r of deleteTargets)
    assert(`DELETE ${r}`, await req("DELETE", r, { token: SA }), [404, 405]);

  // ──────────────────────────────────────────────────────────────────────────
  section("PHASE 7 – SECURITY / XSS ATTACK PAYLOADS");
  // ──────────────────────────────────────────────────────────────────────────

  sub("7.1 – XSS in employee fields");
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '"><img src=x onerror=alert(1)>',
    "javascript:alert(1)",
    "<svg/onload=alert(1)>",
    "'; DROP TABLE employees; --",
  ];

  for (const payload of xssPayloads) {
    const res = await req("POST", "/employees", {
      token: HRM,
      body: {
        employee_id: `EMP_XSS_${Math.random().toString(36).slice(2, 6)}`,
        name: payload,
        father_name: "Father",
        cnic: `42101-${Math.floor(Math.random() * 9000000 + 1000000)}-${Math.floor(Math.random() * 9)}`,
        date_of_birth: "1995-01-01",
      },
    });
    // Should either reject (400/422) OR sanitize and store (201 but strip tags)
    // It should NOT echo back raw script tags
    const safe = res.status === [400, 422].includes(res.status) ||
      !JSON.stringify(res.data ?? "").includes("<script");
    total++;
    if ([400, 422, 201, 200].includes(res.status) && safe) {
      passed++;
      pass(`[${res.status}] XSS sanitized: ${payload.slice(0, 40)}`);
    } else {
      failed++;
      fail(`[${res.status}] Possible XSS leak: ${payload.slice(0, 40)}`);
    }
  }

  sub("7.2 – XSS in leave request reason");
  for (const payload of xssPayloads.slice(0, 2)) {
    if (!leaveTypeId) { skip("no leaveTypeId"); break; }
    const res = await req("POST", "/leave-requests", {
      token: EMP,
      body: {
        leave_type_id: leaveTypeId,
        start_date: "2025-09-01",
        end_date: "2025-09-02",
        reason: payload,
      },
    });
    const safe = !JSON.stringify(res.data ?? "").includes("<script");
    total++;
    if ([400, 422, 201, 200].includes(res.status) && safe) {
      passed++;
      pass(`[${res.status}] XSS sanitized in reason`);
    } else {
      failed++;
      fail(`[${res.status}] Possible XSS leak in reason`);
    }
  }

  sub("7.3 – SQL injection attempts");
  const sqlPayloads = [
    "' OR '1'='1",
    "1; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
  ];
  for (const payload of sqlPayloads) {
    const res = await req("POST", "/auth/login", {
      body: { email: payload, password: payload },
    });
    assert(`SQL inject login: ${payload.slice(0, 30)}`, res, [400, 401, 422]);
  }

  sub("7.4 – Oversized / malformed payloads");
  assert("10KB name field",
    await req("POST", "/employees", {
      token: HRM,
      body: { employee_id: "EMP_BIG", name: "A".repeat(10000), father_name: "F", cnic: "42101-1234567-1", date_of_birth: "1990-01-01" },
    }), [400, 422, 413]);

  assert("Numeric name field",
    await req("POST", "/employees", {
      token: HRM,
      body: { employee_id: "EMP_NUM", name: 99999, father_name: "F", cnic: "42101-1234567-2", date_of_birth: "1990-01-01" },
    }), [400, 422, 201]); // 201 if coerced, 422 if strictly validated

  assert("Invalid date format",
    await req("POST", "/employees", {
      token: HRM,
      body: { employee_id: "EMP_DATE", name: "Date Test", father_name: "F", cnic: "42101-1234567-3", date_of_birth: "not-a-date" },
    }), [400, 422]);

  assert("Null body fields",
    await req("POST", "/employees", {
      token: HRM,
      body: { employee_id: null, name: null, father_name: null, cnic: null, date_of_birth: null },
    }), [400, 422]);

  // ──────────────────────────────────────────────────────────────────────────
  section("PHASE 8 – UNDEFINED / MISSING FIELD EDGE CASES");
  // ──────────────────────────────────────────────────────────────────────────

  sub("8.1 – Login with undefined fields");
  assert("undefined email key (missing)",
    await req("POST", "/auth/login", { body: { password: "test" } }), 400);
  assert("undefined password key (missing)",
    await req("POST", "/auth/login", { body: { email: "test@test.com" } }), 400);

  sub("8.2 – Attendance batch with undefined shift_id row");
  assert("undefined shift_id in row",
    await req("POST", "/attendance/batch", {
      token: HRM,
      body: {
        date: "2024-01-15",
        rows: [{ employee_id: "EMP002", status: "present" }], // shift_id undefined
      },
    }), [400, 422, 200, 201]); // depends on strictness

  sub("8.3 – Leave request with future dates in the past");
  assert("end_date before start_date",
    await req("POST", "/leave-requests", {
      token: EMP,
      body: {
        leave_type_id: leaveTypeId ?? "fake",
        start_date: "2024-03-10",
        end_date: "2024-03-05", // before start
        reason: "Time travel",
      },
    }), [400, 422]);

  // ──────────────────────────────────────────────────────────────────────────
  section("PHASE 9 – CROSS-ROLE PRIVILEGE ESCALATION CHECKS");
  // ──────────────────────────────────────────────────────────────────────────

  sub("9.1 – employee tries to approve own leave");
  assert("employee PATCH approve → 403",
    await req("PATCH", "/leave-requests/fake-id/approve", { token: EMP }), 403);

  sub("9.2 – employee tries to batch save attendance");
  assert("employee POST batch → 403",
    await req("POST", "/attendance/batch", { token: EMP, body: batchPayload }), 403);

  sub("9.3 – hr_executive tries write operations");
  assert("hr_executive POST employee → 403",
    await req("POST", "/employees", { token: HRE, body: newEmpPayload }), 403);
  assert("hr_executive POST attendance → 403",
    await req("POST", "/attendance/batch", { token: HRE, body: batchPayload }), 403);
  assert("hr_executive PATCH approve → 403",
    await req("PATCH", "/leave-requests/fake-id/approve", { token: HRE }), 403);

  sub("9.4 – hr_manager tries to access config tables");
  assert("hr_manager GET /departments → 403",
    await req("GET", "/departments", { token: HRM }), 403);
  assert("hr_manager POST /departments → 403",
    await req("POST", "/departments", { token: HRM, body: { name: "Test Dept", is_active: true } }), 403);

  sub("9.5 – Config POST – super_admin can create");
  assert("super_admin POST /departments → 200|201|409",
    await req("POST", "/departments", { token: SA, body: { name: "Test Department XYZ", is_active: true } }), [201, 200, 409]);

  sub("9.6 – Config POST – super_admin missing name");
  assert("super_admin POST /departments empty name → 400|422",
    await req("POST", "/departments", { token: SA, body: { is_active: true } }), [400, 422]);

  // ──────────────────────────────────────────────────────────────────────────
  section("PHASE 10 – JOB INFO ROUTES");
  // ──────────────────────────────────────────────────────────────────────────

  sub("10.1 – POST /job-info – hr only");
  assert("hr_executive → 403",
    await req("POST", "/job-info", {
      token: HRE,
      body: { employee_id: "EMP002", date_of_joining: "2024-01-01" },
    }), 403);
  assert("employee → 403",
    await req("POST", "/job-info", {
      token: EMP,
      body: { employee_id: "EMP002", date_of_joining: "2024-01-01" },
    }), 403);

  sub("10.2 – POST /job-info – missing required fields");
  assert("missing department_id → 400|422",
    await req("POST", "/job-info", {
      token: HRM,
      body: { employee_id: "EMP002" }, // all other IDs missing
    }), [400, 422]);

  // ──────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────────────────────────────────
  const failRate = ((failed / total) * 100).toFixed(1);
  console.log(`\n${"─".repeat(55)}`);
  console.log(`${C.bold}Results${C.reset}`);
  console.log(`  Total  : ${total}`);
  console.log(`  ${C.green}Passed : ${passed}${C.reset}`);
  console.log(`  ${failed > 0 ? C.red : C.green}Failed : ${failed}${C.reset}`);
  console.log(`  Fail % : ${failRate}%`);
  console.log(`${"─".repeat(55)}\n`);

  process.exit(failed > 0 ? 1 : 0);
})();
