/**
 * EMS Backend - Full API Security Matrix Runner (Route Auto-Discovery)
 * ES Module | Node 18+ (native fetch)
 *
 * Run:
 *   node scripts/api-security-check.mjs
 *   BASE_URL=http://localhost:3001/api node scripts/api-security-check.mjs
 *
 * Goal:
 * - Login core roles (super_admin, hr_manager, hr_executive, employee, employee2)
 * - Save JWTs in variables
 * - Auto-discover every mounted route from `server.js`
 * - Test every discovered route with every token
 * - Detect security vulnerabilities (e.g. employee accessing config routes)
 * - Very clear story logs; warnings only (exit 0)
 */

const BASE = process.env.BASE_URL ?? 'http://localhost:3001/api'

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

// A valid RFC4122 UUID (v4-ish) that should not exist in the DB.
const NON_EXISTENT_UUID = process.env.NON_EXISTENT_UUID ?? '11111111-1111-4111-8111-111111111111'
const SAFE_WRITE = process.env.SAFE_WRITE !== '0' // default true
const ALLOW_MUTATION_PROBES = process.env.ALLOW_MUTATION_PROBES === '1'

const INJECTION_PAYLOADS = [
  { label: 'sqli', value: `' OR 1=1--` },
  { label: 'xss_img', value: `<img src=x onerror=alert(1)>` },
  { label: 'xss_script', value: `<script>alert(1)</script>` },
]

const MASS_ASSIGNMENT_FIELDS = {
  role: 'super_admin',
  role_id: NON_EXISTENT_UUID,
  isAdmin: true,
  is_admin: true,
  is_super_admin: true,
  salary: 999999,
  marked_by: NON_EXISTENT_UUID,
  ack: true,
}

// When piping output (e.g. to Select-String), the consumer may close early.
// Avoid crashing the runner with an unhandled EPIPE.
process.stdout.on('error', (e) => {
  if (e?.code === 'EPIPE') process.exit(0)
})
process.stderr.on('error', (e) => {
  if (e?.code === 'EPIPE') process.exit(0)
})

function decodeJwtPayload(token) {
  try {
    if (!token || typeof token !== 'string') return null
    const parts = token.split('.')
    if (parts.length < 2) return null
    const json = Buffer.from(parts[1], 'base64url').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

async function http(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Cookie = `ems_jwt=${token}`
    headers.Authorization = `Bearer ${token}`
  }

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
    return { ok: true, status, data, headers: res.headers }
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e?.message ?? String(e) }
  }
}

async function login({ email, password, label }) {
  const r = await http('POST', '/auth/login', { body: { email, password } })
  const setCookie = r.headers?.get?.('set-cookie') ?? ''
  const jwtMatch = setCookie.match(/ems_jwt=([^;]+)/)
  if (r.ok && r.status === 200 && jwtMatch?.[1]) {
    ok(`Login succeeded: ${label} (${email})`)
    return jwtMatch[1]
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
    'calendar:read',
    'calendar:write',
    'notifications:read',
    'notifications:write',
    'pending_actions:read',
    'alerts:read',
  ],
  hr_executive: [
    'config:read',
    'employees:read',
    'leave:read',
    'attendance:read',
    'calendar:read',
    'calendar:write',
    'notifications:read',
    'notifications:write',
    'pending_actions:read',
    'alerts:read',
  ],
  employee: [
    'employees:read',
    'leave:read',
    'leave:write',
    'attendance:read',
    'calendar:read',
    'notifications:read',
  ],
  employee2: [
    'employees:read',
    'leave:read',
    'leave:write',
    'attendance:read',
    'calendar:read',
    'notifications:read',
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

function isZodSchema(schema) {
  return Boolean(schema && typeof schema.safeParse === 'function' && schema?._def?.typeName)
}

function unwrapZod(schema) {
  let s = schema
  for (let i = 0; i < 10; i++) {
    const t = s?._def?.typeName
    if (!t) break
    if (t === 'ZodOptional' || t === 'ZodNullable') {
      s = s._def.innerType
      continue
    }
    if (t === 'ZodDefault') {
      s = s._def.innerType
      continue
    }
    if (t === 'ZodEffects') {
      s = s._def.schema
      continue
    }
    break
  }
  return s
}

function zodStringExample(schema) {
  const checks = schema?._def?.checks ?? []

  const has = (kind) => checks.some((c) => c.kind === kind)
  const get = (kind) => checks.find((c) => c.kind === kind)

  if (has('uuid')) return NON_EXISTENT_UUID
  if (has('email')) return 'test@example.com'
  if (has('date')) return '2026-01-15'

  const rx = get('regex')?.regex
  if (rx) {
    const src = rx.source
    // Common EMS patterns
    if (src === '^\\d{2}:\\d{2}(:\\d{2})?$') return '09:00:00'
    if (src === '^\\d{4}$') return '2026'
  }

  const min = get('min')?.value ?? 1
  const max = get('max')?.value ?? Math.max(min, 8)
  const n = Math.min(Math.max(min, 1), max)
  return 'A'.repeat(n)
}

function zodNumberExample(schema) {
  const checks = schema?._def?.checks ?? []
  const get = (kind) => checks.find((c) => c.kind === kind)
  const min = get('min')?.value
  const max = get('max')?.value
  const wantInt = checks.some((c) => c.kind === 'int')

  let v = min !== undefined ? min : 1
  if (max !== undefined && v > max) v = max
  if (wantInt) v = Math.trunc(v)
  return v
}

function zodExample(schema, { preferNonEmptyObject = false, depth = 0 } = {}) {
  if (!schema || depth > 6) return null
  const s = unwrapZod(schema)
  const t = s?._def?.typeName
  if (!t) return null

  if (t === 'ZodString') return zodStringExample(s)
  if (t === 'ZodNumber') return zodNumberExample(s)
  if (t === 'ZodBoolean') return true
  if (t === 'ZodEnum') return (s._def.values ?? s._def.options ?? [])[0] ?? null
  if (t === 'ZodLiteral') return s._def.value
  if (t === 'ZodArray') return [zodExample(s._def.type, { preferNonEmptyObject, depth: depth + 1 })]
  if (t === 'ZodUnion') return zodExample(s._def.options?.[0], { preferNonEmptyObject, depth: depth + 1 })

  if (t === 'ZodObject') {
    const shape = typeof s._def.shape === 'function' ? s._def.shape() : s._def.shape
    const out = {}
    const entries = Object.entries(shape ?? {})

    for (const [k, v] of entries) {
      const vt = v?._def?.typeName
      const isOptionalish = vt === 'ZodOptional' || vt === 'ZodDefault'
      if (isOptionalish) continue
      out[k] = zodExample(v, { preferNonEmptyObject, depth: depth + 1 })
    }

    if (preferNonEmptyObject && Object.keys(out).length === 0 && entries.length > 0) {
      const [k, v] = entries[0]
      out[k] = zodExample(v, { preferNonEmptyObject, depth: depth + 1 })
    }

    return out
  }

  // Unknown type: return null (caller can decide fallback)
  if (method === 'GET' && templateRelPath === '/dashboard/metrics') {
    return role === 'employee' || role === 'employee2' ? 'deny' : 'allow'
  }

  return null
}

function extractValidation(routeStack = []) {
  const validates = []
  for (const layer of routeStack) {
    const h = layer?.handle
    if (!h?.__validate) continue
    validates.push(h.__schema)
  }

  let body = null
  let params = null
  let query = null

  for (const v of validates) {
    if (!v) continue
    if (isZodSchema(v)) {
      body = v
      continue
    }
    if (v.body) body = v.body
    if (v.params) params = v.params
    if (v.query) query = v.query
  }

  return { body, params, query, count: validates.length }
}

function deepReplaceStrings(value, replacer, { depth = 0 } = {}) {
  if (depth > 12) return value
  if (typeof value === 'string') return replacer(value)
  if (Array.isArray(value)) return value.map((v) => deepReplaceStrings(v, replacer, { depth: depth + 1 }))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = deepReplaceStrings(v, replacer, { depth: depth + 1 })
    }
    return out
  }
  return value
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const APP_FILE = path.join(ROOT, 'src', 'app.js')

async function loadMountedRouters() {
  const text = await fs.readFile(APP_FILE, 'utf8')

  // Map variable name -> import specifier path
  const imports = new Map()
  const importRe = /import\s+(\w+)\s+from\s+['"](.+?)['"]\s*;/g
  for (let m; (m = importRe.exec(text));) {
    imports.set(m[1], m[2])
  }

  // Extract app.use('/prefix', varName)
  const mounts = []
  const useRe = /app\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/g
  for (let m; (m = useRe.exec(text));) {
    const prefix = m[1]
    const varName = m[2]
    const spec = imports.get(varName)
    if (!spec) continue
    if (!spec.startsWith('./')) continue
    mounts.push({ prefix, varName, spec })
  }

  const routers = []
  for (const mount of mounts) {
    const abs = path.resolve(path.dirname(APP_FILE), mount.spec)
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
  const sharedMiddleware = stack.filter((layer) => !layer?.route)

  for (const layer of stack) {
    if (!layer?.route) continue
    const routePath = layer.route.path
    const methods = Object.entries(layer.route.methods ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k.toUpperCase())

    const middlewareStack = [...sharedMiddleware, ...(layer.route.stack ?? [])]
    const permReq = extractPermReq(middlewareStack)
    const validation = extractValidation(middlewareStack)

    for (const method of methods) {
      const full = joinPaths(prefix, routePath)
      const relTemplate = toRelApiPath(full)
      out.push({
        method,
        fullApiPath: full,
        templateRelPath: relTemplate,
        permReq,
        validation,
        middlewareStack,
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

function minimalValidBodyForRoute({ rt, discovered, jwtPayload }) {
  if (!['POST', 'PUT', 'PATCH'].includes(rt.method)) return undefined

  // Some write routes are intentionally "business flow" and can mutate data heavily.
  // In SAFE_WRITE mode, we fall back to {} for these unless explicitly allowed.
  if (SAFE_WRITE && !ALLOW_MUTATION_PROBES) {
    if (rt.method === 'POST' && (rt.templateRelPath === '/attendance/batch' || rt.templateRelPath === '/leave-requests')) {
      return {}
    }
    if (rt.method === 'POST' && rt.templateRelPath === '/job-info') {
      return {}
    }
  }

  const bodySchema = rt.validation?.body
  let body = {}
  if (bodySchema) {
    const ex = zodExample(bodySchema, { preferNonEmptyObject: true })
    if (ex && typeof ex === 'object' && !Array.isArray(ex)) body = ex
  }

  // SAFE_WRITE: try to force conflicts (409) for create endpoints to avoid inserting new rows.
  if (SAFE_WRITE && rt.method === 'POST') {
    if (rt.templateRelPath === '/departments' && discovered.departments?.[0]?.department_code) {
      body.department_code = discovered.departments[0].department_code
      body.department_name = discovered.departments[0].department_name ?? 'DUP'
      return body
    }

    if (rt.templateRelPath === '/employees' && discovered.employees?.[0]) {
      // employee_id + cnic are typically unique in this schema
      const e = discovered.employees[0]
      body.employee_id = e.employee_id ?? 'EMP001'
      body.name = e.name ?? 'Dup Name'
      body.father_name = e.father_name ?? 'Dup Father'
      body.cnic = e.cnic ?? 'DUP-CNIC'
      body.date_of_birth = e.date_of_birth ?? '1990-01-01'
      return body
    }

    if (rt.templateRelPath === '/employment-types' && discovered.employmentTypes?.[0]?.type_name) {
      body.type_name = discovered.employmentTypes[0].type_name
      return body
    }

    if (rt.templateRelPath === '/job-statuses' && discovered.jobStatuses?.[0]?.status_name) {
      body.status_name = discovered.jobStatuses[0].status_name
      return body
    }

    if (rt.templateRelPath === '/work-modes' && discovered.workModes?.[0]?.mode_name) {
      body.mode_name = discovered.workModes[0].mode_name
      return body
    }

    if (rt.templateRelPath === '/work-locations' && discovered.workLocations?.[0]?.location_name) {
      body.location_name = discovered.workLocations[0].location_name
      return body
    }

    if (rt.templateRelPath === '/designations' && discovered.designations?.[0]?.title) {
      body.title = discovered.designations[0].title
      return body
    }

    if (rt.templateRelPath === '/shifts' && discovered.shifts?.[0]?.name) {
      body.name = discovered.shifts[0].name
      body.start_time = discovered.shifts[0].start_time ?? '09:00:00'
      body.end_time = discovered.shifts[0].end_time ?? '18:00:00'
      return body
    }

    if (rt.templateRelPath === '/leave-types' && discovered.leaveTypes?.[0]?.name) {
      body.name = discovered.leaveTypes[0].name
      return body
    }

    if (rt.templateRelPath === '/users' && discovered.users?.[0]?.email) {
      const u = discovered.users[0]
      body.email = u.email
      body.password = 'password123'
      body.employee_id = u.employee_id ?? discovered.employees?.[0]?.employee_id ?? 'EMP002'
      body.role_id = u.role_id ?? jwtPayload?.role_id ?? NON_EXISTENT_UUID
      return body
    }

    if (rt.templateRelPath === '/leave-balances' && discovered.leaveBalances?.[0]) {
      const lb = discovered.leaveBalances[0]
      body.employee_id = lb.employee_id ?? discovered.employees?.[0]?.employee_id ?? 'EMP002'
      body.leave_type_id = lb.leave_type_id ?? discovered.leaveTypes?.[0]?.id ?? NON_EXISTENT_UUID
      body.year = lb.year ?? 2026
      body.balance = lb.balance ?? 0
      body.used = lb.used ?? 0
      return body
    }
  }

  // Fill in common foreign key fields from discovery where possible (reduces 500s).
  if (rt.templateRelPath === '/leave-policies') {
    if (body.department_id === NON_EXISTENT_UUID && discovered.departments?.[0]?.id) body.department_id = discovered.departments[0].id
    if (body.leave_type_id === NON_EXISTENT_UUID && discovered.leaveTypes?.[0]?.id) body.leave_type_id = discovered.leaveTypes[0].id
  }
  if (rt.templateRelPath === '/job-info') {
    if (body.employee_id === 'A' && discovered.employees?.[0]?.employee_id) body.employee_id = discovered.employees[0].employee_id
    if (body.department_id === NON_EXISTENT_UUID && discovered.departments?.[0]?.id) body.department_id = discovered.departments[0].id
    if (body.shift_id === NON_EXISTENT_UUID && discovered.shifts?.[0]?.id) body.shift_id = discovered.shifts[0].id
    if (body.designation_id === NON_EXISTENT_UUID && discovered.designations?.[0]?.id) body.designation_id = discovered.designations[0].id
    if (body.employment_type_id === NON_EXISTENT_UUID && discovered.employmentTypes?.[0]?.id) body.employment_type_id = discovered.employmentTypes[0].id
    if (body.job_status_id === NON_EXISTENT_UUID && discovered.jobStatuses?.[0]?.id) body.job_status_id = discovered.jobStatuses[0].id
    if (body.work_mode_id === NON_EXISTENT_UUID && discovered.workModes?.[0]?.id) body.work_mode_id = discovered.workModes[0].id
    if (body.work_location_id === NON_EXISTENT_UUID && discovered.workLocations?.[0]?.id) body.work_location_id = discovered.workLocations[0].id
    body.date_of_joining = body.date_of_joining ?? '2026-01-15'
  }

  return body
}

function preserveKeysForSafePost(rt) {
  // Keys to preserve to keep conflict behavior (avoid creating new rows during probes).
  switch (rt.templateRelPath) {
    case '/departments': return ['department_code']
    case '/employees': return ['employee_id', 'cnic']
    case '/users': return ['email']
    case '/employment-types': return ['type_name']
    case '/job-statuses': return ['status_name']
    case '/work-modes': return ['mode_name']
    case '/work-locations': return ['location_name']
    case '/designations': return ['title']
    case '/leave-types': return ['name']
    case '/leave-balances': return ['employee_id', 'leave_type_id', 'year']
    default: return []
  }
}

function injectBody({ baseBody, payload, preserveKeys = [] }) {
  const out = {}
  for (const [k, v] of Object.entries(baseBody ?? {})) {
    if (preserveKeys.includes(k)) out[k] = v
    else out[k] = deepReplaceStrings(v, () => payload.value)
  }
  return out
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
    designations: [],
    employmentTypes: [],
    jobStatuses: [],
    workModes: [],
    workLocations: [],
    leaveTypes: [],
    leavePolicies: [],
    users: [],
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

  const designations = await http('GET', '/designations', { token: saToken })
  if (designations.ok && designations.status === 200 && Array.isArray(designations.data)) out.designations = designations.data

  const employmentTypes = await http('GET', '/employment-types', { token: saToken })
  if (employmentTypes.ok && employmentTypes.status === 200 && Array.isArray(employmentTypes.data)) out.employmentTypes = employmentTypes.data

  const jobStatuses = await http('GET', '/job-statuses', { token: saToken })
  if (jobStatuses.ok && jobStatuses.status === 200 && Array.isArray(jobStatuses.data)) out.jobStatuses = jobStatuses.data

  const workModes = await http('GET', '/work-modes', { token: saToken })
  if (workModes.ok && workModes.status === 200 && Array.isArray(workModes.data)) out.workModes = workModes.data

  const workLocations = await http('GET', '/work-locations', { token: saToken })
  if (workLocations.ok && workLocations.status === 200 && Array.isArray(workLocations.data)) out.workLocations = workLocations.data

  const leaveTypes = await http('GET', '/leave-types', { token: saToken })
  if (leaveTypes.ok && leaveTypes.status === 200 && Array.isArray(leaveTypes.data)) out.leaveTypes = leaveTypes.data

  const leavePolicies = await http('GET', '/leave-policies', { token: saToken })
  if (leavePolicies.ok && leavePolicies.status === 200 && Array.isArray(leavePolicies.data)) out.leavePolicies = leavePolicies.data

  const users = await http('GET', '/users', { token: saToken })
  if (users.ok && users.status === 200 && Array.isArray(users.data)) out.users = users.data

  return out
}

async function deepChecks({ tokens, discovered }) {
  section('Deep Security Checks (Self-Service + Ack + Notifications)')

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

  sub('Dashboard/alerts: employee blocked, HR allowed')

  const employeePendingActions = await http('GET', '/pending-actions', { token: EMP })
  checks++
  if (employeePendingActions.status === 403) ok('[employee] GET /pending-actions blocked (403)')
  else {
    vulns++
    vuln(`[employee] GET /pending-actions returned ${employeePendingActions.status} (expected 403)`)
  }

  const employeeUrgentAlerts = await http('GET', '/urgent-alerts?days=30', { token: EMP })
  checks++
  if (employeeUrgentAlerts.status === 403) ok('[employee] GET /urgent-alerts blocked (403)')
  else {
    vulns++
    vuln(`[employee] GET /urgent-alerts returned ${employeeUrgentAlerts.status} (expected 403)`)
  }

  const employeeMetrics = await http('GET', '/dashboard/metrics?range=6m', { token: EMP })
  checks++
  if (employeeMetrics.status === 403) ok('[employee] GET /dashboard/metrics blocked (403)')
  else {
    vulns++
    vuln(`[employee] GET /dashboard/metrics returned ${employeeMetrics.status} (expected 403)`)
  }

  const hrPendingActions = await http('GET', '/pending-actions', { token: HRM })
  checks++
  if (hrPendingActions.ok && hrPendingActions.status === 200 && Array.isArray(hrPendingActions.data)) {
    ok('[hr_manager] GET /pending-actions allowed')
  } else {
    warnings++
    warn(`[hr_manager] GET /pending-actions unexpected status=${hrPendingActions.status}`)
  }

  const hrUrgentAlerts = await http('GET', '/urgent-alerts?days=30', { token: HRM })
  checks++
  if (hrUrgentAlerts.ok && hrUrgentAlerts.status === 200 && Array.isArray(hrUrgentAlerts.data)) {
    ok('[hr_manager] GET /urgent-alerts allowed')
  } else {
    warnings++
    warn(`[hr_manager] GET /urgent-alerts unexpected status=${hrUrgentAlerts.status}`)
  }

  const hrMetrics = await http('GET', '/dashboard/metrics?range=6m', { token: HRM })
  checks++
  if (hrMetrics.ok && hrMetrics.status === 200 && hrMetrics.data && typeof hrMetrics.data === 'object') {
    ok('[hr_manager] GET /dashboard/metrics allowed')
  } else {
    warnings++
    warn(`[hr_manager] GET /dashboard/metrics unexpected status=${hrMetrics.status}`)
  }

  sub('Notifications: employees stay self-scoped and cannot mark peer notification read')

  const employeeNotifications = await http('GET', '/notifications?scope=me', { token: EMP })
  checks++
  if (employeeNotifications.ok && employeeNotifications.status === 200 && Array.isArray(employeeNotifications.data?.items)) {
    ok('[employee] GET /notifications?scope=me allowed')
  } else {
    warnings++
    warn(`[employee] GET /notifications?scope=me unexpected status=${employeeNotifications.status}`)
  }

  if (EMP2) {
    const employee2Notifications = await http('GET', '/notifications?scope=me', { token: EMP2 })
    checks++
    if (employee2Notifications.ok && employee2Notifications.status === 200 && Array.isArray(employee2Notifications.data?.items)) {
      ok('[employee2] GET /notifications?scope=me allowed')

      const otherNotificationId = employee2Notifications.data.items[0]?.id
      if (otherNotificationId) {
        const crossRead = await http('PATCH', `/notifications/${otherNotificationId}/read`, { token: EMP })
        checks++
        if (crossRead.status === 404 || crossRead.status === 403) ok('[employee] PATCH /notifications/:id/read blocked for peer notification')
        else {
          vulns++
          vuln(`[employee] PATCH /notifications/:id/read returned ${crossRead.status} for peer notification (expected 403/404)`)
        }
      } else {
        warnings++
        warn('employee2 has no notifications to use for peer read test.')
      }
    } else {
      warnings++
      warn(`[employee2] GET /notifications?scope=me unexpected status=${employee2Notifications.status}`)
    }
  } else {
    info('employee2 token missing; skipping peer notification read test.')
  }
}

async function authBypassChecks({ allRoutes, ctx }) {
  section('5) Auth Bypass Checks (No Token / Bad Token)')

  const scenarios = [
    { label: 'no_token', token: null },
    { label: 'bad_token', token: 'not-a-jwt' },
  ]

  for (const rt of allRoutes) {
    if (rt.templateRelPath === '/auth/login' || rt.templateRelPath === '/auth' || rt.templateRelPath === '/auth/') continue

    const reqPath = fillParams(rt.templateRelPath, ctx)
    sub(`${rt.method} ${rt.templateRelPath}`)

    for (const s of scenarios) {
      checks++

      const shouldSendBody = ['POST', 'PUT', 'PATCH'].includes(rt.method)
        && !(rt.templateRelPath === '/auth/login')

      const res = await http(rt.method, reqPath, {
        token: s.token,
        body: shouldSendBody ? {} : undefined,
      })

      // With no/invalid auth, we should never reach validate() or controllers.
      if (res.ok && (res.status >= 200 && res.status < 400)) {
        vulns++
        vuln(`[${s.label}] ${rt.method} ${reqPath} -> ${res.status} (auth bypass)`)
        continue
      }

      if (res.status === 401) {
        ok(`[${s.label}] ${rt.method} ${reqPath} -> 401 (blocked)`)
        continue
      }

      // Some stacks return 403 instead of 401 for missing/invalid auth. Still blocked, but flag for cleanup.
      if (res.status === 403) {
        warnings++
        warn(`[${s.label}] ${rt.method} ${reqPath} -> 403 (blocked; prefer 401)`)
        continue
      }

      // Anything else means the request likely passed auth middleware and reached deeper layers.
      vulns++
      vuln(`[${s.label}] ${rt.method} ${reqPath} -> ${res.status} (expected 401/403). body=${JSON.stringify(res.data)?.slice(0, 200)}`)
    }
  }
}

async function injectionProbeChecks({ allRoutes, ctx, superAdminToken, discovered, superAdminJwt }) {
  section('6) Input/Injection Probes (super_admin)')
  info('This is not a full pentest; it’s a quick “do we crash / do we validate” smoke check.')

  if (!superAdminToken) {
    warnings++
    warn('super_admin token missing; skipping injection probes.')
    return
  }

  const INJ = `' OR 1=1--`
  const ctxInj = {
    ...ctx,
    anyUuid: INJ,
    attendanceId: INJ,
    departmentId: INJ,
    employeeId: INJ,
  }

  for (const rt of allRoutes) {
    if (rt.templateRelPath === '/auth/login' || rt.templateRelPath === '/auth' || rt.templateRelPath === '/auth/') continue

    // Probe 1: inject into path params
    const probePath = fillParams(rt.templateRelPath, ctxInj)

    // Probe 2: inject into known query-param routes (date/month/year)
    let probeQueryPath = null
    if (probePath.startsWith('/attendance/daily?date=')) {
      probeQueryPath = `/attendance/daily?date=${encodeURIComponent(`2026-01-15${INJ}`)}`
    } else if (probePath.startsWith('/attendance/report?month=')) {
      probeQueryPath = `/attendance/report?month=${encodeURIComponent(`1${INJ}`)}&year=${encodeURIComponent(`2026${INJ}`)}`
    } else if (probePath.startsWith('/leave-requests/calendar?month=')) {
      probeQueryPath = `/leave-requests/calendar?month=${encodeURIComponent(`1${INJ}`)}&year=${encodeURIComponent(`2026${INJ}`)}`
    }

    const pathsToTry = [probePath, probeQueryPath].filter(Boolean)
    sub(`${rt.method} ${rt.templateRelPath}`)

    for (const p of pathsToTry) {
      checks++

      const shouldSendBody = ['POST', 'PUT', 'PATCH'].includes(rt.method)
        && !(rt.templateRelPath === '/auth/login')

      const res = await http(rt.method, p, {
        token: superAdminToken,
        body: shouldSendBody ? minimalValidBodyForRoute({ rt, discovered, jwtPayload: superAdminJwt }) : undefined,
      })

      if (!res.ok) {
        warnings++
        warn(`[probe] ${rt.method} ${p} -> network error: ${res.error}`)
        continue
      }

      // We mainly care that we do NOT 500 on malformed inputs.
      if (res.status >= 500) {
        warnings++
        warn(`[probe] ${rt.method} ${p} -> ${res.status} (server error; should validate/return 4xx)`)
        continue
      }

      ok(`[probe] ${rt.method} ${p} -> ${res.status}`)
    }

    // Body probes + mass assignment (write endpoints only)
    if (['POST', 'PUT', 'PATCH'].includes(rt.method)) {
      const reqPath = fillParams(rt.templateRelPath, ctx)

      const safePost = rt.method === 'POST' && SAFE_WRITE && !ALLOW_MUTATION_PROBES
      const preserveKeys = safePost ? preserveKeysForSafePost(rt) : []

      if (safePost && preserveKeys.length === 0) {
        info(`[probe-body] skipped ${rt.method} ${rt.templateRelPath} (SAFE_WRITE=1, no safe preserve keys)`)
      } else {
        const baseBody = minimalValidBodyForRoute({ rt, discovered, jwtPayload: superAdminJwt }) ?? {}

        for (const payload of INJECTION_PAYLOADS) {
          checks++
          const injected = safePost
            ? injectBody({ baseBody, payload, preserveKeys })
            : deepReplaceStrings(baseBody, () => payload.value)

          const r = await http(rt.method, reqPath, { token: superAdminToken, body: injected })

          if (!r.ok) {
            warnings++
            warn(`[probe-body:${payload.label}] ${rt.method} ${reqPath} -> network error: ${r.error}`)
            continue
          }

          if (r.status >= 500) {
            warnings++
            warn(`[probe-body:${payload.label}] ${rt.method} ${reqPath} -> ${r.status} (server crash; expected 4xx)`)
            continue
          }

          if (r.status >= 200 && r.status < 300) {
            warnings++
            warn(`[probe-body:${payload.label}] ${rt.method} ${reqPath} -> ${r.status} (accepted payload)`)
            continue
          }

          ok(`[probe-body:${payload.label}] ${rt.method} ${reqPath} -> ${r.status}`)
        }

        // Mass assignment probe: try to smuggle privileged fields into body
        checks++
        const mass = { ...baseBody, ...MASS_ASSIGNMENT_FIELDS }
        const mr = await http(rt.method, reqPath, { token: superAdminToken, body: mass })

        if (!mr.ok) {
          warnings++
          warn(`[mass] ${rt.method} ${reqPath} -> network error: ${mr.error}`)
        } else if (mr.status >= 500) {
          warnings++
          warn(`[mass] ${rt.method} ${reqPath} -> ${mr.status} (server error)`)
        } else if (mr.status >= 200 && mr.status < 300) {
          const bodyStr = JSON.stringify(mr.data ?? {})
          const reflected = Object.keys(MASS_ASSIGNMENT_FIELDS).some((k) => bodyStr.includes(`\"${k}\"`))
          if (reflected) {
            vulns++
            vuln(`[mass] ${rt.method} ${reqPath} -> ${mr.status} (privileged fields reflected in response) body=${bodyStr.slice(0, 180)}`)
          } else {
            ok(`[mass] ${rt.method} ${reqPath} -> ${mr.status}`)
          }
        } else {
          ok(`[mass] ${rt.method} ${reqPath} -> ${mr.status}`)
        }
      }
    }
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
  const jwtPayloads = {
    super_admin: decodeJwtPayload(tokens.super_admin),
    hr_manager: decodeJwtPayload(tokens.hr_manager),
    hr_executive: decodeJwtPayload(tokens.hr_executive),
    employee: decodeJwtPayload(tokens.employee),
    employee2: decodeJwtPayload(tokens.employee2),
  }

  const roles = [
    { role: 'super_admin', token: tokens.super_admin, jwt: jwtPayloads.super_admin },
    { role: 'hr_manager', token: tokens.hr_manager, jwt: jwtPayloads.hr_manager },
    { role: 'hr_executive', token: tokens.hr_executive, jwt: jwtPayloads.hr_executive },
    { role: 'employee', token: tokens.employee, jwt: jwtPayloads.employee },
    { role: 'employee2', token: tokens.employee2, jwt: jwtPayloads.employee2 },
  ]

  const ctx = {
    // Use a non-existent but valid UUID by default so we avoid mutating real rows during RBAC tests.
    // Endpoints should return 404/422 instead of 500 when IDs are invalid/nonexistent.
    anyUuid: NON_EXISTENT_UUID,
    employeeId: 'EMP002',
    departmentId: NON_EXISTENT_UUID,
    attendanceId: NON_EXISTENT_UUID,
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
        && !(rt.templateRelPath === '/auth/login')

      const body = shouldSendBody
        ? minimalValidBodyForRoute({ rt, discovered, jwtPayload: r.jwt })
        : undefined

      const res = await http(rt.method, reqPath, {
        token: r.token,
        body,
      })

      classify({ role: r.role, method: rt.method, path: reqPath, res, expectation })
    }
  }

  await deepChecks({ tokens, discovered })
  await authBypassChecks({ allRoutes, ctx })
  await injectionProbeChecks({
    allRoutes,
    ctx,
    superAdminToken: tokens.super_admin,
    discovered,
    superAdminJwt: jwtPayloads.super_admin,
  })

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
