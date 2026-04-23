/**
 * EMS Backend - Full API Security Matrix Runner (Route Auto-Discovery)
 * ES Module | Node 18+ (native fetch)
 *
 * Run:
 *   node scripts/api-security-check.mjs
 *   BASE_URL=http://localhost:3000/api node scripts/api-security-check.mjs
 *
 * Goal:
 * - Login core roles (super_admin, hr_manager, hr_executive, employee, employee2)
 * - Save JWTs in variables
 * - Auto-discover every mounted route from `server.js`
 * - Test every discovered route with every token
 * - Detect security vulnerabilities (e.g. employee accessing config routes)
 * - Very clear story logs; warnings only (exit 0)
 */

const BASE = process.env.BASE_URL ?? 'http://localhost:3000/api'

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m',
}

const now = () => new Date().toISOString()
const section = (msg) => console.log(`\n${C.bold}${C.cyan}━━ ${msg}${C.reset}`)
const sub = (msg) => console.log(`\n${C.magenta}  ▸ ${msg}${C.reset}`)

const ok = (msg) => console.log(`  ${C.green}OK${C.reset}  ${msg}`)
const warn = (msg) => console.log(`  ${C.yellow}WARN${C.reset} ${msg}`)
const vuln = (msg) => console.log(`  ${C.red}VULN${C.reset} ${msg}`)
const info = (msg) => console.log(`  ${C.gray}${msg}${C.reset}`)

let warnings = 0
let vulns = 0
let checks = 0
let discoveredRoutes = 0

async function http(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const opts = { method, headers }
  if (body !== undefined) opts.body = JSON.stringify(body)

  try {
    const res = await fetch(`${BASE}${path}`, opts)
    const status = res.status
    let data = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    return { ok: true, status, data }
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e?.message ?? String(e) }
  }
}

async function login({ email, password, label }) {
  const r = await http('POST', '/auth/login', { body: { email, password } })
  if (r.ok && r.status === 200 && r.data?.token) {
    ok(`Login succeeded: ${label} (${email})`)
    return r.data.token
  }
  warn(`Login failed: ${label} (${email}) [status=${r.status}] ${r.data?.error ?? r.error ?? ''}`.trim())
  warnings++
  return null
}

const ROLE_PERMS = {
  super_admin: ['*'],
  hr_manager: [
    'config:read',
    'employees:read',
    'employees:write',
    'leave:read',
    'leave:write',
    'leave:approve',
    'attendance:read',
    'attendance:write',
  ],
  hr_executive: [
    'config:read',
    'employees:read',
    'leave:read',
    'attendance:read',
  ],
  employee: [
    'employees:read',
    'leave:read',
    'leave:write',
    'attendance:read',
  ],
  employee2: [
    'employees:read',
    'leave:read',
    'leave:write',
    'attendance:read',
  ],
}

function roleHas(role, key) {
  const perms = ROLE_PERMS[role] ?? []
  if (perms.includes('*')) return true
  return perms.includes(key)
}

function expectedFromPerms(role, permReq) {
  if (!permReq || (!permReq.all?.length && !permReq.any?.length)) return 'unknown'
  if (role === 'super_admin') return 'allow'

  for (const k of permReq.all ?? []) {
    if (!roleHas(role, k)) return 'deny'
  }
  for (const group of permReq.any ?? []) {
    const ok = group.some((k) => roleHas(role, k))
    if (!ok) return 'deny'
  }
  return 'allow'
}

function policyOverride(role, method, templateRelPath) {
  // Explicit security rules that are stricter than permission keys.
  if (method === 'GET' && templateRelPath === '/employees/ids') {
    return role === 'employee' || role === 'employee2' ? 'deny' : 'allow'
  }

  // Attendance ack is employee verification only (plus super_admin override).
  if (method === 'PATCH' && /^\/attendance\/:attendanceId\/ack$/.test(templateRelPath)) {
    if (role === 'super_admin') return 'allow'
    if (role === 'employee' || role === 'employee2') return 'allow'
    return 'deny'
  }

  // Employee can’t enumerate leave balances by year
  if (method === 'GET' && /^\/leave-balances\/year\/:year$/.test(templateRelPath)) {
    return role === 'employee' || role === 'employee2' ? 'deny' : 'allow'
  }

  return null
}

function classify({ role, method, path, res, expectation }) {
  const status = res.status
  const tag = `[${role}] ${method} ${path} -> ${status}`

  if (!res.ok) {
    warnings++
    warn(`${tag} (request failed: ${res.error})`)
    return
  }

  const isAuthError = status === 401 || status === 403
  const isSuccessish = status >= 200 && status < 300
  const isExpectedAllowed = expectation === 'allow'
  const isExpectedDeny = expectation === 'deny'

  // Deny expectation: only 401/403 is acceptable.
  if (isExpectedDeny) {
    if (isAuthError) {
      ok(`${tag} (blocked as expected)`)
      return
    }
    // If not blocked, it may be a vulnerability (even if it returned 400/422 due to body validation).
    // That still means the request reached the controller.
    vulns++
    vuln(`${tag} (should be blocked with 401/403) body=${JSON.stringify(res.data)?.slice(0, 180) ?? ''}`)
    return
  }

  // Allow expectation: 401/403 is a mismatch; other statuses can be OK (201, 200, 400, 409, 422).
  if (isExpectedAllowed) {
    if (isAuthError) {
      warnings++
      warn(`${tag} (unexpected block) body=${JSON.stringify(res.data)?.slice(0, 180) ?? ''}`)
      return
    }
    if (isSuccessish) {
      ok(`${tag} (allowed)`)
      return
    }
    ok(`${tag} (reached handler; status is fine for negative/validation cases)`)
    return
  }

  warnings++
  warn(`${tag} (unknown expectation)`)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const SERVER_FILE = path.join(ROOT, 'server.js')

async function loadMountedRouters() {
  const text = await fs.readFile(SERVER_FILE, 'utf8')

  // Map variable name -> import specifier path
  const imports = new Map()
  const importRe = /import\s+(\w+)\s+from\s+['"](.+?)['"]\s*;/g
  for (let m; (m = importRe.exec(text)); ) {
    imports.set(m[1], m[2])
  }

  // Extract app.use('/prefix', varName)
  const mounts = []
  const useRe = /app\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/g
  for (let m; (m = useRe.exec(text)); ) {
    const prefix = m[1]
    const varName = m[2]
    const spec = imports.get(varName)
    if (!spec) continue
    if (!spec.includes('/src/routes/')) continue
    mounts.push({ prefix, varName, spec })
  }

  const routers = []
  for (const mount of mounts) {
    const abs = path.resolve(ROOT, mount.spec)
    const mod = await import(pathToFileURL(abs).href)
    if (!mod?.default) continue
    routers.push({
      prefix: mount.prefix,
      name: mount.varName,
      file: abs,
      router: mod.default,
    })
  }
  return routers
}

function extractPermReq(routeStack = []) {
  const all = new Set()
  const any = []

  for (const layer of routeStack) {
    const meta = layer?.handle?.__perm
    if (!meta || !meta.keys || !Array.isArray(meta.keys)) continue
    if (meta.mode === 'all') {
      for (const k of meta.keys) all.add(k)
    } else if (meta.mode === 'any') {
      any.push([...meta.keys])
    }
  }

  return { all: [...all], any }
}

function joinPaths(prefix, routePath) {
  const p = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  const r = routePath === '/' ? '' : routePath
  return `${p}${r}`
}

function toRelApiPath(fullApiPath) {
  if (fullApiPath === '/api') return '/'
  if (fullApiPath.startsWith('/api/')) return fullApiPath.slice('/api'.length)
  if (fullApiPath.startsWith('/api')) return fullApiPath.slice('/api'.length) || '/'
  return fullApiPath
}

function listRoutesFromRouter(router, prefix) {
  const out = []
  const stack = router?.stack ?? []

  for (const layer of stack) {
    if (!layer?.route) continue
    const routePath = layer.route.path
    const methods = Object.entries(layer.route.methods ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k.toUpperCase())

    const permReq = extractPermReq(layer.route.stack)

    for (const method of methods) {
      const full = joinPaths(prefix, routePath)
      const relTemplate = toRelApiPath(full)
      out.push({
        method,
        fullApiPath: full,
        templateRelPath: relTemplate,
        permReq,
      })
    }
  }
  return out
}

function fillParams(templateRelPath, ctx) {
  let p = templateRelPath

  // Known placeholders
  p = p.replaceAll(':attendanceId', ctx.attendanceId ?? ctx.anyUuid)
  p = p.replaceAll(':employeeId', ctx.employeeId ?? 'EMP002')
  p = p.replaceAll(':departmentId', ctx.departmentId ?? ctx.anyUuid)
  p = p.replaceAll(':month', '1')
  p = p.replaceAll(':year', '2026')

  // Generic :id (uuid) and other param names
  p = p.replaceAll(':id', ctx.anyUuid)

  // Query-param routes
  if (p === '/attendance/daily') p = `${p}?date=2026-01-15`
  if (p === '/attendance/report') p = `${p}?month=1&year=2026`
  if (p === '/leave-requests/calendar') p = `${p}?month=1&year=2026`

  return p
}

async function discoverIds(saToken) {
  // Pull core IDs so we can test UUID-based routes properly.
  const out = {
    shifts: [],
    employees: [],
    departments: [],
    leaveBalances: [],
    jobInfo: [],
    attendanceId: null,
  }

  const shifts = await http('GET', '/shifts', { token: saToken })
  if (shifts.ok && shifts.status === 200 && Array.isArray(shifts.data)) out.shifts = shifts.data

  const employees = await http('GET', '/employees', { token: saToken })
  if (employees.ok && employees.status === 200 && Array.isArray(employees.data)) out.employees = employees.data

  const departments = await http('GET', '/departments', { token: saToken })
  if (departments.ok && departments.status === 200 && Array.isArray(departments.data)) out.departments = departments.data

  const leaveBalances = await http('GET', '/leave-balances', { token: saToken })
  if (leaveBalances.ok && leaveBalances.status === 200 && Array.isArray(leaveBalances.data)) out.leaveBalances = leaveBalances.data

  const jobInfo = await http('GET', '/job-info', { token: saToken })
  if (jobInfo.ok && jobInfo.status === 200 && Array.isArray(jobInfo.data)) out.jobInfo = jobInfo.data

  return out
}

async function deepChecks({ tokens, discovered }) {
  section('Deep Security Checks (Self-Service + Ack)')

  const SA = tokens.super_admin
  const HRM = tokens.hr_manager
  const EMP = tokens.employee
  const EMP2 = tokens.employee2

  // 1) Employee self-service on /employees
  sub('Employee self-service: /employees returns only self')
  const empList = await http('GET', '/employees', { token: EMP })
  checks++
  if (empList.ok && empList.status === 200 && Array.isArray(empList.data)) {
    const ids = empList.data.map((r) => r.employee_id)
    if (ids.length === 1) ok(`[employee] GET /employees returned 1 record (${ids[0]})`)
    else {
      vulns++
      vuln(`[employee] GET /employees returned ${ids.length} records (should be 1). employee_ids=${JSON.stringify(ids)}`)
    }
  } else {
    warnings++
    warn(`[employee] GET /employees unexpected status=${empList.status}`)
  }

  // 2) Employee cannot fetch another employee UUID
  sub('Employee cannot access another employee by UUID (/employees/:uuid)')
  const empSelf = empList.ok && Array.isArray(empList.data) ? empList.data[0] : null
  const other = discovered.employees.find((e) => empSelf && e.id !== empSelf.id)
  if (empSelf?.id && other?.id) {
    const selfGet = await http('GET', `/employees/${empSelf.id}`, { token: EMP })
    checks++
    if (selfGet.status === 200) ok('[employee] GET /employees/:selfUuid allowed')
    else {
      warnings++
      warn(`[employee] GET /employees/:selfUuid unexpected status=${selfGet.status}`)
    }

    const otherGet = await http('GET', `/employees/${other.id}`, { token: EMP })
    checks++
    if (otherGet.status === 403) ok('[employee] GET /employees/:otherUuid blocked (403)')
    else {
      vulns++
      vuln(`[employee] GET /employees/:otherUuid returned ${otherGet.status} (expected 403)`)
    }
  } else {
    warnings++
    warn('Could not discover employee UUIDs for self/other check.')
  }

  // 3) Attendance ack flow (create record via HR batch, then ack as employee)
  sub('Attendance Ack flow: HR writes attendance, employee acknowledges, HR cannot acknowledge')

  const shiftId = discovered.shifts?.[0]?.id
  if (!shiftId) {
    warnings++
    warn('No shift id discovered; skipping ack flow.')
    return
  }

  const date = '2026-01-15'
  const batchPayload = {
    date,
    rows: [
      {
        employee_id: 'EMP002',
        shift_id: shiftId,
        check_in: '09:00:00',
        check_out: '18:00:00',
        status: 'present',
        notes: 'seed runner',
      },
    ],
  }

  const batch = await http('POST', '/attendance/batch', { token: HRM, body: batchPayload })
  checks++
  if (!(batch.ok && batch.status === 200 && batch.data?.records?.[0]?.id)) {
    warnings++
    warn(`[hr_manager] POST /attendance/batch failed status=${batch.status} body=${JSON.stringify(batch.data)?.slice(0, 180) ?? ''}`)
    return
  }
  ok('[hr_manager] created/updated attendance record for EMP002')

  const attendanceId = batch.data.records[0].id
  discovered.attendanceId = attendanceId

  const hrAck = await http('PATCH', `/attendance/${attendanceId}/ack`, { token: HRM })
  checks++
  if (hrAck.status === 403) ok('[hr_manager] PATCH /attendance/:id/ack blocked (403)')
  else {
    vulns++
    vuln(`[hr_manager] PATCH /attendance/:id/ack returned ${hrAck.status} (expected 403)`)
  }

  const empAck = await http('PATCH', `/attendance/${attendanceId}/ack`, { token: EMP })
  checks++
  if (empAck.status === 200 && empAck.data?.ack === true) ok('[employee] PATCH /attendance/:id/ack succeeded (ack=true)')
  else {
    warnings++
    warn(`[employee] PATCH /attendance/:id/ack unexpected status=${empAck.status} body=${JSON.stringify(empAck.data)?.slice(0, 180) ?? ''}`)
  }

  // Optional: another employee cannot ack someone else's attendance
  if (EMP2) {
    const emp2Ack = await http('PATCH', `/attendance/${attendanceId}/ack`, { token: EMP2 })
    checks++
    if (emp2Ack.status === 403) ok('[employee2] PATCH /attendance/:id/ack blocked (403)')
    else {
      vulns++
      vuln(`[employee2] PATCH /attendance/:id/ack returned ${emp2Ack.status} (expected 403)`)
    }
  } else {
    info('employee2 token missing; skipping cross-employee ack test.')
  }

  // Super admin override
  const saAck = await http('PATCH', `/attendance/${attendanceId}/ack`, { token: SA })
  checks++
  if (saAck.status === 200) ok('[super_admin] PATCH /attendance/:id/ack allowed')
  else {
    warnings++
    warn(`[super_admin] PATCH /attendance/:id/ack unexpected status=${saAck.status}`)
  }

  sub('Self-service: employee cannot read other employees job/extra/balances/calendar')

  const jobInfoEmp = await http('GET', '/job-info', { token: EMP })
  checks++
  if (jobInfoEmp.ok && jobInfoEmp.status === 200 && Array.isArray(jobInfoEmp.data)) {
    const bad = jobInfoEmp.data.some((r) => r.employee_id && r.employee_id !== 'EMP002')
    if (bad) { vulns++; vuln('[employee] GET /job-info leaked other employees') }
    else ok('[employee] GET /job-info self-only')
  } else {
    warnings++; warn(`[employee] GET /job-info unexpected status=${jobInfoEmp.status}`)
  }

  const extraEmp = await http('GET', '/extra-employees', { token: EMP })
  checks++
  if (extraEmp.ok && extraEmp.status === 200 && Array.isArray(extraEmp.data)) {
    const bad = extraEmp.data.some((r) => r.employee_id && r.employee_id !== 'EMP002')
    if (bad) { vulns++; vuln('[employee] GET /extra-employees leaked other employees') }
    else ok('[employee] GET /extra-employees self-only')
  } else {
    warnings++; warn(`[employee] GET /extra-employees unexpected status=${extraEmp.status}`)
  }

  const lbAll = await http('GET', '/leave-balances', { token: EMP })
  checks++
  if (lbAll.ok && lbAll.status === 200 && Array.isArray(lbAll.data)) {
    const bad = lbAll.data.some((r) => r.employee_id && r.employee_id !== 'EMP002')
    if (bad) { vulns++; vuln('[employee] GET /leave-balances leaked other employees') }
    else ok('[employee] GET /leave-balances self-only')
  } else {
    warnings++; warn(`[employee] GET /leave-balances unexpected status=${lbAll.status}`)
  }

  const lrBal = await http('GET', '/leave-requests/balances', { token: EMP })
  checks++
  if (lrBal.ok && lrBal.status === 200 && Array.isArray(lrBal.data)) {
    const bad = lrBal.data.some((r) => r.employee_id && r.employee_id !== 'EMP002')
    if (bad) { vulns++; vuln('[employee] GET /leave-requests/balances leaked other employees') }
    else ok('[employee] GET /leave-requests/balances self-only')
  } else {
    warnings++; warn(`[employee] GET /leave-requests/balances unexpected status=${lrBal.status}`)
  }

  const lrCal = await http('GET', '/leave-requests/calendar?month=1&year=2026', { token: EMP })
  checks++
  if (lrCal.ok && lrCal.status === 200 && Array.isArray(lrCal.data)) {
    const bad = lrCal.data.some((r) => r.employee_id && r.employee_id !== 'EMP002')
    if (bad) { vulns++; vuln('[employee] GET /leave-requests/calendar leaked other employees') }
    else ok('[employee] GET /leave-requests/calendar self-only')
  } else {
    warnings++; warn(`[employee] GET /leave-requests/calendar unexpected status=${lrCal.status}`)
  }
}

async function main() {
  section('EMS API Security Matrix Runner')
  info(`time=${now()}`)
  info(`base=${BASE}`)

  section('1) Login & Store Tokens')
  const tokens = {
    super_admin: await login({
      label: 'super_admin',
      email: process.env.SA_EMAIL ?? 'zaidbinasif468@gmail.com',
      password: process.env.SA_PASS ?? 'zaidkhan123',
    }),
    hr_manager: await login({
      label: 'hr_manager',
      email: process.env.HRM_EMAIL ?? 'sadia.malik@company.com',
      password: process.env.HRM_PASS ?? 'password123',
    }),
    hr_executive: await login({
      label: 'hr_executive',
      email: process.env.HRE_EMAIL ?? 'imran.shah@company.com',
      password: process.env.HRE_PASS ?? 'password123',
    }),
    employee: await login({
      label: 'employee (EMP002)',
      email: process.env.EMP_EMAIL ?? 'huzaifa.kaleem@company.com',
      password: process.env.EMP_PASS ?? 'password123',
    }),
    // Optional second employee for cross-employee checks
    employee2: await login({
      label: 'employee2 (EMP003)',
      email: process.env.EMP2_EMAIL ?? 'ahmed.ali@company.com',
      password: process.env.EMP2_PASS ?? 'password123',
    }),
  }

  if (!tokens.super_admin || !tokens.hr_manager || !tokens.hr_executive || !tokens.employee) {
    warn('Some core tokens are missing; results may be incomplete.')
    warnings++
  }

  section('2) Discover IDs Using super_admin')
  const discovered = tokens.super_admin ? await discoverIds(tokens.super_admin) : { shifts: [], employees: [] }
  info(`discovered shifts=${discovered.shifts.length}, employees=${discovered.employees.length}`)

  section('3) Auto-Discover Routes From server.js')
  const mounted = await loadMountedRouters()
  const allRoutes = []
  for (const r of mounted) {
    const routes = listRoutesFromRouter(r.router, r.prefix)
    for (const rt of routes) allRoutes.push(rt)
  }
  discoveredRoutes = allRoutes.length
  info(`mounted routers=${mounted.length}, discovered routes=${discoveredRoutes}`)

  section('4) RBAC Matrix (Every Route x Every Token)')
  const roles = [
    { role: 'super_admin', token: tokens.super_admin },
    { role: 'hr_manager', token: tokens.hr_manager },
    { role: 'hr_executive', token: tokens.hr_executive },
    { role: 'employee', token: tokens.employee },
    { role: 'employee2', token: tokens.employee2 },
  ]

  const ctx = {
    anyUuid: discovered.departments?.[0]?.id
      ?? discovered.leaveBalances?.[0]?.id
      ?? discovered.jobInfo?.[0]?.id
      ?? discovered.employees?.[0]?.id
      ?? '00000000-0000-0000-0000-000000000000',
    employeeId: 'EMP002',
    departmentId: discovered.departments?.[0]?.id ?? '00000000-0000-0000-0000-000000000000',
    attendanceId: discovered.attendanceId,
  }

  for (const rt of allRoutes) {
    // Skip login route; we test logins explicitly.
    if (rt.templateRelPath === '/auth/login' || rt.templateRelPath === '/auth' || rt.templateRelPath === '/auth/') continue

    const reqPath = fillParams(rt.templateRelPath, ctx)
    sub(`${rt.method} ${rt.templateRelPath}`)

    for (const r of roles) {
      checks++
      const overridden = policyOverride(r.role, rt.method, rt.templateRelPath)
      const inferred = expectedFromPerms(r.role, rt.permReq)
      const expectation = overridden ?? inferred

      // For write endpoints, send an empty body so we can test permission gating without mutating data.
      const shouldSendBody = ['POST', 'PUT', 'PATCH'].includes(rt.method)
        && !(/^\/attendance\/[^/]+\/ack$/.test(reqPath))
        && !(rt.templateRelPath === '/auth/login')

      const res = await http(rt.method, reqPath, {
        token: r.token,
        body: shouldSendBody ? {} : undefined,
      })

      classify({ role: r.role, method: rt.method, path: reqPath, res, expectation })
    }
  }

  await deepChecks({ tokens, discovered })

  section('Summary (Warnings Only; Exit 0)')
  console.log(`  discovered routes: ${discoveredRoutes}`)
  console.log(`  checks: ${checks}`)
  console.log(`  warnings: ${warnings}`)
  console.log(`  vulnerabilities: ${vulns}`)
  if (vulns > 0) {
    vuln('Security issues detected. Review the logs above (VULN lines).')
  } else {
    ok('No security vulnerabilities detected by this runner.')
  }

  process.exit(0)
}

main().catch((e) => {
  vuln(`Runner crashed: ${e?.stack ?? e?.message ?? String(e)}`)
  process.exit(0)
})
