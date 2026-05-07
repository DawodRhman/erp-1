/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  EMS API — Full Spectrum Security & Quality Test Suite
 *  ES Module | Node 18+ (native fetch)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  Run:
 *    node scripts/api-security-check.mjs
 *    BASE_URL=http://localhost:3001/api node scripts/api-security-check.mjs
 *    SAFE_WRITE=0 node scripts/api-security-check.mjs     ← allow mutations
 *
 * ───────────────────────────────────────────────────────────────────────────────
 *  WHAT THESE TESTS ARE CALLED  (printed at start for reference)
 * ───────────────────────────────────────────────────────────────────────────────
 *
 *  PHASE 1 — Route Auto-Discovery
 *    Technique : Static AST-lite parsing of app.js mount statements.
 *    Purpose   : Ensure zero routes are skipped; no hard-coded paths.
 *
 *  PHASE 2 — RBAC / Broken Function Level Authorization (BFLA)
 *    Formal name : OWASP API Security Top 10 — API5:2023 Broken Function Level Authorization
 *    Also called : Role-Based Access Control (RBAC) Matrix Testing
 *    Technique   : Every discovered route is hit with every role token.
 *                  Expected outcome is derived from seeded role↔permission map.
 *    Detects     : Privilege escalation, missing middleware, mis-wired roles.
 *
 *  PHASE 3 — Deep Authorization Checks (BOLA / Self-Service)
 *    Formal name : OWASP API1:2023 Broken Object Level Authorization (BOLA), also IDOR
 *    Technique   : Employee tries to read/mutate another employee's records.
 *                  Attendance Ack ownership check.
 *    Detects     : Missing owner-scoped queries, leaking cross-employee data.
 *
 *  PHASE 4 — Auth Bypass (No Token / Malformed Token)
 *    Formal name : Authentication Testing — OWASP WSTG-AUTHN
 *    Technique   : Every non-public route is hit without a JWT, and with a
 *                  garbage JWT string.
 *    Detects     : Missing verifyToken, token not validated, 200 on no-auth.
 *
 *  PHASE 5 — Negative / Schema Validation Testing (Missing Required Fields)
 *    Formal name : Input Validation Testing — OWASP WSTG-INPVAL-01
 *    Also called : Negative Testing, Robustness Testing, Contract Testing
 *    Technique   : For each write (POST/PUT/PATCH) endpoint the Zod body schema
 *                  is introspected. Each required field is OMITTED one-at-a-time.
 *                  Also tests with a completely empty body {}.
 *    Expected    : 400 or 422.  A 200/201 means the server accepted garbage data.
 *    Detects     : Missing validate() middleware, optional fields treated as required,
 *                  missing Zod refinements.
 *
 *  PHASE 6 — Boundary Value Analysis (BVA) / Field Length Overflow
 *    Formal name : Boundary Value Analysis — ISO/IEC 29119, ISTQB BVA
 *    Also called : Field Overflow Testing, Max-Length Fuzzing
 *    Technique   : Zod schema is introspected for .max(n) string checks.
 *                  A string of length max+1 is injected into that field.
 *                  Also tests: negative numbers where positive is required,
 *                  wrong enum values, wrong types (string where int expected).
 *    Expected    : 400/422.  A 200/201 means validation is not enforced.
 *    Detects     : Missing or wrong Zod constraints, DB-level-only validation,
 *                  silent truncation in DB without error.
 *
 *  PHASE 7 — Injection & XSS Probes
 *    Formal name : Injection Testing — OWASP A03:2021, WSTG-INPVAL-05/01
 *    Technique   :
 *      SQLi  — classic ' OR 1=1--, UNION SELECT, stacked queries
 *      XSS   — <script>, <img onerror>, javascript: URI, SVG onload
 *      Path traversal in string fields: ../../etc/passwd
 *      Null-byte injection: field\x00value
 *    Expected    : 400/422 (sanitizer rejects), or 200 with NO server crash (500).
 *                  Any 500 = WARN. Any reflection of unescaped payload = VULN.
 *    Detects     : Missing xss-clean / express-mongo-sanitize equivalent,
 *                  raw string interpolation into SQL (should never happen with
 *                  parameterized queries but caught by unexpected 500s).
 *
 *  PHASE 8 — Mass Assignment / Parameter Pollution
 *    Formal name : Mass Assignment — OWASP API6:2023, CWE-915
 *    Technique   : Privileged fields (role, is_admin, salary, marked_by…) are
 *                  injected alongside a normal valid body on every write endpoint.
 *    Expected    : The response body must NOT reflect those fields back.
 *                  If it does the controller is not stripping unknown keys.
 *    Detects     : Missing allowlist/Zod strip, raw body spread into DB insert.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 *  SEED CREDENTIAL MAP  (mirrors scripts/seed.mjs)
 * ───────────────────────────────────────────────────────────────────────────────
 *   super_admin   → zaidbinasif468@gmail.com  / zaidkhan123
 *   hr_manager    → sadia.malik@company.com   / password123  (EMP004)
 *   hr_executive  → imran.shah@company.com    / password123  (EMP005)
 *   employee      → huzaifa.kaleem@company.com / password123 (EMP002)
 *   employee2     → ahmed.ali@company.com     / password123  (EMP003)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import fs   from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const BASE         = process.env.BASE_URL      ?? 'http://localhost:3001/api'
const SAFE_WRITE   = process.env.SAFE_WRITE    !== '0'   // default: true
const VERBOSE      = process.env.VERBOSE       === '1'
const PHASE_FILTER = process.env.PHASE ? Number(process.env.PHASE) : null  // run single phase

const NON_EXISTENT_UUID = '11111111-1111-4111-8111-111111111111'

// ── ANSI colours ──────────────────────────────────────────────────────────────
const C = {
  reset:'\x1b[0m', bold:'\x1b[1m', dim:'\x1b[2m',
  red:'\x1b[31m',  green:'\x1b[32m', yellow:'\x1b[33m',
  cyan:'\x1b[36m', gray:'\x1b[90m',  magenta:'\x1b[35m',
  blue:'\x1b[34m', white:'\x1b[97m',
}

process.stdout.on('error', e => { if (e?.code === 'EPIPE') process.exit(0) })
process.stderr.on('error', e => { if (e?.code === 'EPIPE') process.exit(0) })

// ── Logging helpers ───────────────────────────────────────────────────────────
const now      = () => new Date().toISOString()
const section  = (n, msg) => console.log(`\n${C.bold}${C.cyan}╔══ PHASE ${n}: ${msg} ══╗${C.reset}`)
const sub      = msg => console.log(`\n${C.magenta}  ▸ ${msg}${C.reset}`)
const logOK    = msg => console.log(`  ${C.green}✔ OK  ${C.reset} ${msg}`)
const logWARN  = msg => console.log(`  ${C.yellow}⚠ WARN${C.reset} ${msg}`)
const logVULN  = msg => console.log(`  ${C.red}✘ VULN${C.reset} ${msg}`)
const logINFO  = msg => { if (VERBOSE) console.log(`  ${C.gray}ℹ ${msg}${C.reset}`) }
const logSKIP  = msg => { if (VERBOSE) console.log(`  ${C.dim}⊘ SKIP ${msg}${C.reset}`) }

// ── Counters ──────────────────────────────────────────────────────────────────
const CTR = { checks:0, ok:0, warn:0, vuln:0, skip:0 }
const bump = k => { CTR[k]++; CTR.checks++ }

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function http(method, urlPath, { token, body, raw } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Cookie']        = `ems_jwt=${token}`
    headers['Authorization'] = `Bearer ${token}`
  }
  const opts = { method, headers }
  if (body !== undefined) opts.body = JSON.stringify(body)
  try {
    const res    = await fetch(`${BASE}${urlPath}`, opts)
    const status = res.status
    let data = null
    try { data = await res.json() } catch { /* non-json body */ }
    return { ok:true, status, data, headers:res.headers }
  } catch (e) {
    return { ok:false, status:0, data:null, error:e?.message ?? String(e) }
  }
}

async function login({ email, password, label }) {
  const r = await http('POST', '/auth/login', { body:{ email, password } })
  const cookie = r.headers?.get?.('set-cookie') ?? ''
  const match  = cookie.match(/ems_jwt=([^;]+)/)
  if (r.ok && r.status === 200 && match?.[1]) {
    logOK(`Login OK: ${label} (${email})`)
    return match[1]
  }
  logWARN(`Login failed: ${label} (${email}) status=${r.status} — ${r.data?.error ?? r.error ?? ''}`.trim())
  bump('warn')
  return null
}

function decodeJwt(token) {
  try {
    if (!token) return null
    const parts = token.split('.')
    if (parts.length < 2) return null
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch { return null }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Zod introspection helpers
// ═══════════════════════════════════════════════════════════════════════════════
function unwrapZod(s, depth = 0) {
  if (!s || depth > 12) return s
  const t = s?._def?.typeName
  if (!t) return s
  if (['ZodOptional','ZodNullable','ZodDefault','ZodEffects'].includes(t))
    return unwrapZod(s._def.innerType ?? s._def.schema, depth + 1)
  return s
}

function isOptionalField(schema) {
  const t = schema?._def?.typeName
  return t === 'ZodOptional' || t === 'ZodNullable' || t === 'ZodDefault'
}

/** Build a minimal valid example value from a Zod schema */
function zodExample(schema, depth = 0) {
  if (!schema || depth > 8) return null
  const s = unwrapZod(schema)
  const t = s?._def?.typeName
  if (!t) return null

  if (t === 'ZodString') {
    const checks = s._def.checks ?? []
    const has = k => checks.some(c => c.kind === k)
    const get = k => checks.find(c => c.kind === k)
    if (has('uuid'))  return NON_EXISTENT_UUID
    if (has('email')) return 'test@example.com'
    if (has('date'))  return '2026-01-15'
    const rx = get('regex')?.regex?.source
    if (rx === '^\\d{2}:\\d{2}(:\\d{2})?$') return '09:00:00'
    if (rx === '^\\d{4}$')                   return '2026'
    const min = get('min')?.value ?? 2
    const max = get('max')?.value ?? Math.max(min, 10)
    return 'A'.repeat(Math.min(Math.max(min, 2), max))
  }
  if (t === 'ZodNumber') {
    const checks = s._def.checks ?? []
    const get = k => checks.find(c => c.kind === k)
    let v = get('min')?.value ?? 1
    const max = get('max')?.value
    if (max !== undefined && v > max) v = max
    if (checks.some(c => c.kind === 'int')) v = Math.trunc(v)
    return v
  }
  if (t === 'ZodBoolean') return true
  if (t === 'ZodEnum')   return (s._def.values ?? s._def.options ?? [])[0] ?? null
  if (t === 'ZodLiteral') return s._def.value
  if (t === 'ZodArray')  return [zodExample(s._def.type, depth + 1)]
  if (t === 'ZodUnion')  return zodExample(s._def.options?.[0], depth + 1)

  if (t === 'ZodObject') {
    const shape = typeof s._def.shape === 'function' ? s._def.shape() : (s._def.shape ?? {})
    const out   = {}
    for (const [k, v] of Object.entries(shape)) {
      if (!isOptionalField(v)) out[k] = zodExample(v, depth + 1)
    }
    return out
  }
  return null
}

/**
 * Return { fieldName → maxLength } for all string fields with .max(n)
 */
function zodStringMaxMap(schema, prefix = '') {
  if (!schema) return {}
  const s = unwrapZod(schema)
  const t = s?._def?.typeName
  if (!t) return {}

  if (t === 'ZodString') {
    const maxCheck = (s._def.checks ?? []).find(c => c.kind === 'max')
    if (maxCheck) return { [prefix]: maxCheck.value }
    return {}
  }
  if (t === 'ZodObject') {
    const shape = typeof s._def.shape === 'function' ? s._def.shape() : (s._def.shape ?? {})
    const out   = {}
    for (const [k, v] of Object.entries(shape)) {
      const inner = zodStringMaxMap(v, prefix ? `${prefix}.${k}` : k)
      Object.assign(out, inner)
    }
    return out
  }
  return {}
}

/** Get required field names (non-optional) from a ZodObject */
function zodRequiredFields(schema) {
  if (!schema) return []
  const s = unwrapZod(schema)
  if (s?._def?.typeName !== 'ZodObject') return []
  const shape = typeof s._def.shape === 'function' ? s._def.shape() : (s._def.shape ?? {})
  return Object.entries(shape)
    .filter(([, v]) => !isOptionalField(v))
    .map(([k]) => k)
}

/** Deep set a nested path value */
function deepSet(obj, dotPath, value) {
  const out  = JSON.parse(JSON.stringify(obj))
  const keys = dotPath.split('.')
  let ptr    = out
  for (let i = 0; i < keys.length - 1; i++) {
    ptr = ptr[keys[i]]
    if (!ptr) return out
  }
  ptr[keys[keys.length - 1]] = value
  return out
}

/** Deep delete a nested path */
function deepDelete(obj, dotPath) {
  const out  = JSON.parse(JSON.stringify(obj))
  const keys = dotPath.split('.')
  let ptr    = out
  for (let i = 0; i < keys.length - 1; i++) {
    ptr = ptr[keys[i]]
    if (!ptr) return out
  }
  delete ptr[keys[keys.length - 1]]
  return out
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Route discovery (mirrors route-middleware-audit approach)
// ═══════════════════════════════════════════════════════════════════════════════
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const ROOT       = path.resolve(__dirname, '..')
const APP_FILE   = path.join(ROOT, 'src', 'app.js')

async function loadMountedRouters() {
  const text = await fs.readFile(APP_FILE, 'utf8')

  const imports = new Map()
  const importRe = /import\s+(\w+)\s+from\s+['"](.+?)['"]\s*;/g
  for (let m; (m = importRe.exec(text));) imports.set(m[1], m[2])

  const mounts = []
  const useRe  = /app\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)\s*\)/g
  for (let m; (m = useRe.exec(text));) {
    const spec = imports.get(m[2])
    if (!spec?.startsWith('./')) continue
    mounts.push({ prefix:m[1], varName:m[2], spec })
  }

  const routers = []
  for (const mount of mounts) {
    const abs = path.resolve(path.dirname(APP_FILE), mount.spec)
    try {
      const mod = await import(pathToFileURL(abs).href)
      if (!mod?.default) continue
      routers.push({ prefix:mount.prefix, name:mount.varName, file:abs, router:mod.default })
    } catch (e) {
      logWARN(`Could not import router ${mount.spec}: ${e.message}`)
    }
  }
  return routers
}

function joinPath(prefix, routePath) {
  const p = prefix.endsWith('/') ? prefix.slice(0,-1) : prefix
  const r = routePath === '/' ? '' : routePath
  return `${p}${r}`
}

function toRelPath(full) {
  if (full === '/api') return '/'
  if (full.startsWith('/api/')) return full.slice(4)
  if (full.startsWith('/api'))  return full.slice(4) || '/'
  return full
}

function extractMiddlewareMeta(stack = []) {
  const all = new Set(); const any = []
  let bodySchema = null; let paramsSchema = null; let querySchema = null

  for (const layer of stack) {
    const h = layer?.handle
    // permission
    if (h?.__perm) {
      const { keys, mode } = h.__perm
      if (mode === 'all') keys.forEach(k => all.add(k))
      else if (mode === 'any') any.push([...keys])
    }
    // validation
    if (h?.__validate) {
      const v = h.__schema
      if (!v) continue
      if (typeof v?.safeParse === 'function') { bodySchema = v; continue }
      if (v.body)   bodySchema   = v.body
      if (v.params) paramsSchema = v.params
      if (v.query)  querySchema  = v.query
    }
  }
  return { permReq:{ all:[...all], any }, bodySchema, paramsSchema, querySchema }
}

function listRoutes(router, prefix) {
  const out   = []
  const stack = router?.stack ?? []
  const shared = stack.filter(l => !l?.route)

  for (const layer of stack) {
    if (!layer?.route) continue
    const methods = Object.entries(layer.route.methods ?? {})
      .filter(([,v]) => v).map(([k]) => k.toUpperCase())
    const mwStack = [...shared, ...(layer.route.stack ?? [])]
    const meta    = extractMiddlewareMeta(mwStack)
    for (const method of methods) {
      const full = joinPath(prefix, layer.route.path)
      out.push({
        method,
        fullPath: full,
        relPath:  toRelPath(full),
        templatePath: layer.route.path,
        ...meta,
      })
    }
  }
  return out
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RBAC permission map (mirrors seed.mjs ROLE_PERMISSION_MAP)
// ═══════════════════════════════════════════════════════════════════════════════
const ALL_PERMS = [
  'config:read','config:write',
  'employees:read','employees:write',
  'leave:read','leave:write','leave:approve',
  'attendance:read','attendance:write',
  'calendar:read','calendar:write',
  'notifications:read','notifications:write',
  'pending_actions:read','alerts:read',
  'penalties:read','penalties:write',
  'directory:read','directory:write','reports:read',
]

const ROLE_PERMS_MAP = {
  super_admin:  ['*'],
  hr_manager:   [
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
    'penalties:read',
    'penalties:write',
    'directory:read',
    'directory:write',
    'reports:read',
    'dashboard:read',
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
    'penalties:read',
    'directory:read',
    'reports:read',
    'dashboard:read',
  ],
  employee:     [
    'employees:read',
    'leave:read',
    'leave:write',
    'attendance:read',
    'calendar:read',
    'notifications:read',
    'directory:read',
  ],
  employee2:     [
    'employees:read',
    'leave:read',
    'leave:write',
    'attendance:read',
    'calendar:read',
    'notifications:read',
    'directory:read',
  ],
}

function roleHasPerm(roleName, key) {
  const perms = ROLE_PERMS_MAP[roleName] ?? []
  if (perms.includes('*')) return true
  return perms.includes(key)
}

function expectedAccess(roleName, permReq) {
  if (!permReq || (!permReq.all?.length && !permReq.any?.length)) return 'unknown'
  if (roleName === 'super_admin') return 'allow'
  for (const k of permReq.all ?? []) {
    if (!roleHasPerm(roleName, k)) return 'deny'
  }
  for (const grp of permReq.any ?? []) {
    if (!grp.some(k => roleHasPerm(roleName, k))) return 'deny'
  }
  return 'allow'
}

/** Hard policy overrides that go beyond simple permission key matching */
function policyOverride(roleName, method, relPath) {
  // /employees/ids — employee can't enumerate all IDs
  if (method === 'GET' && relPath === '/employees/ids')
    return (roleName === 'employee' || roleName === 'employee2') ? 'deny' : 'allow'

  // Directory — everyone has directory:read in DB
  if (method === 'GET' && relPath === '/directory')
    return 'allow'

  // Attendance — non-admins restricted to their own location (effectively deny in mass-test if location differs)
  if (relPath === '/attendance' || relPath.startsWith('/attendance?')) {
    if (roleName !== 'super_admin') return 'deny'
  }

  // Attendance ack — only the owning employee (or super_admin)
  // relPath can be '/attendance/:id/ack' or '/attendance/:attendanceId/ack'
  if (method === 'PATCH' && /^\/attendance\/[^/]+\/ack$/.test(relPath)) {
    if (roleName === 'super_admin')                         return 'allow'
    if (roleName === 'employee' || roleName === 'employee2') return 'allow'
    return 'deny'
  }

  // Leave balances by year — HR+ only
  if (method === 'GET' && /^\/leave-balances\/year\//.test(relPath))
    return (roleName === 'employee' || roleName === 'employee2') ? 'deny' : 'allow'

  // Dashboard metrics — HR+ only
  if (method === 'GET' && (relPath === '/dashboard/metrics' || relPath.startsWith('/dashboard/metrics')))
    return (roleName === 'employee' || roleName === 'employee2') ? 'deny' : 'allow'

  // Pending-actions / urgent-alerts — HR+ only
  if (method === 'GET' && (relPath === '/pending-actions' || relPath.startsWith('/urgent-alerts')))
    return (roleName === 'employee' || roleName === 'employee2') ? 'deny' : 'allow'

  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Route path filling
// ═══════════════════════════════════════════════════════════════════════════════
function fillPath(relPath, ctx) {
  let p = relPath
  p = p.replaceAll(':attendanceId', ctx.attendanceId ?? ctx.uuid)
  p = p.replaceAll(':employeeId',   ctx.employeeId ?? 'EMP002')
  p = p.replaceAll(':departmentId', ctx.departmentId ?? ctx.uuid)
  p = p.replaceAll(':month',        ctx.month  ?? '1')
  p = p.replaceAll(':year',         ctx.year   ?? '2026')
  p = p.replaceAll(':id',           ctx.uuid)
  // query param appends
  if (p === '/attendance/daily')          p += '?date=2026-01-15'
  if (p === '/attendance/report')         p += '?month=1&year=2026'
  if (p === '/leave-requests/calendar')   p += '?month=1&year=2026'
  if (p === '/urgent-alerts')             p += '?days=30'
  if (p === '/dashboard/metrics')         p += '?range=6m'
  if (p === '/leave-balances/year/2026')  { /* ok */ }
  return p
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Discovery: pull live IDs from the running server
// ═══════════════════════════════════════════════════════════════════════════════
async function discoverIds(saToken) {
  const D = {
    employees:[], departments:[], shifts:[], designations:[],
    employmentTypes:[], jobStatuses:[], workModes:[], workLocations:[],
    leaveTypes:[], leaveBalances:[], leavePolicies:[], users:[],
    jobInfo:[], penaltyRules:[], attendanceId:null,
  }
  const pull = async (endpoint, key) => {
    const r = await http('GET', endpoint, { token:saToken })
    if (r.ok && r.status === 200 && Array.isArray(r.data)) D[key] = r.data
  }
  await pull('/employees',        'employees')
  await pull('/departments',      'departments')
  await pull('/shifts',           'shifts')
  await pull('/designations',     'designations')
  await pull('/employment-types', 'employmentTypes')
  await pull('/job-statuses',     'jobStatuses')
  await pull('/work-modes',       'workModes')
  await pull('/work-locations',   'workLocations')
  await pull('/leave-types',      'leaveTypes')
  await pull('/leave-balances',   'leaveBalances')
  await pull('/leave-policies',   'leavePolicies')
  await pull('/users',            'users')
  await pull('/job-info',         'jobInfo')
  await pull('/penalty-rules',    'penaltyRules')
  return D
}

/** Build a safe (conflict-inducing) body for SAFE_WRITE POST probes */
function safePostBody(relPath, baseBody, D) {
  const b = { ...baseBody }
  switch (relPath) {
    case '/departments':
      if (D.departments?.[0]) { b.department_code = D.departments[0].department_code; b.department_name = D.departments[0].department_name ?? 'DUP' }
      break
    case '/employees':
      if (D.employees?.[0]) { b.employee_id = D.employees[0].employee_id; b.cnic = D.employees[0].cnic }
      break
    case '/users':
      if (D.users?.[0]) { b.email = D.users[0].email; b.employee_id = D.users[0].employee_id; b.password = 'password123'; b.role_id = D.users[0].role_id ?? NON_EXISTENT_UUID }
      break
    case '/employment-types':
      if (D.employmentTypes?.[0]) b.type_name = D.employmentTypes[0].type_name
      break
    case '/job-statuses':
      if (D.jobStatuses?.[0]) b.status_name = D.jobStatuses[0].status_name
      break
    case '/work-modes':
      if (D.workModes?.[0]) b.mode_name = D.workModes[0].mode_name
      break
    case '/work-locations':
      if (D.workLocations?.[0]) b.location_name = D.workLocations[0].location_name
      break
    case '/designations':
      if (D.designations?.[0]) b.title = D.designations[0].title
      break
    case '/shifts':
      if (D.shifts?.[0]) { b.name = D.shifts[0].name; b.start_time = D.shifts[0].start_time ?? '09:00:00'; b.end_time = D.shifts[0].end_time ?? '18:00:00' }
      break
    case '/leave-types':
      if (D.leaveTypes?.[0]) b.name = D.leaveTypes[0].name
      break
    case '/leave-balances':
      if (D.leaveBalances?.[0]) {
        b.employee_id   = D.leaveBalances[0].employee_id
        b.leave_type_id = D.leaveBalances[0].leave_type_id
        b.year          = D.leaveBalances[0].year
      }
      break
  }
  return b
}

/** Build minimal valid body, filling FK placeholders with real IDs */
function buildBody(relPath, bodySchema, D) {
  let body = zodExample(bodySchema, 0) ?? {}
  if (typeof body !== 'object' || Array.isArray(body)) body = {}

  // Replace NON_EXISTENT_UUID placeholders with real FK IDs where we can
  const fill = (key, val) => { if (body[key] === NON_EXISTENT_UUID || body[key] === 'A'.repeat(body[key]?.length ?? 0)) body[key] = val }

  if (relPath === '/job-info') {
    if (D.departments?.[0])    fill('department_id',    D.departments[0].id)
    if (D.shifts?.[0])         fill('shift_id',         D.shifts[0].id)
    if (D.designations?.[0])   fill('designation_id',   D.designations[0].id)
    if (D.employmentTypes?.[0]) fill('employment_type_id', D.employmentTypes[0].id)
    if (D.jobStatuses?.[0])    fill('job_status_id',    D.jobStatuses[0].id)
    if (D.workModes?.[0])      fill('work_mode_id',     D.workModes[0].id)
    if (D.workLocations?.[0])  fill('work_location_id', D.workLocations[0].id)
    body.date_of_joining = body.date_of_joining ?? '2026-01-15'
  }
  if (relPath === '/leave-policies') {
    if (D.departments?.[0])  fill('department_id',  D.departments[0].id)
    if (D.leaveTypes?.[0])   fill('leave_type_id',  D.leaveTypes[0].id)
  }

  return body
}

// ═══════════════════════════════════════════════════════════════════════════════
//  classify() — single route+role response judgment
// ═══════════════════════════════════════════════════════════════════════════════
function classifyRBAC({ role, method, path: p, res, expectation }) {
  const tag = `[${role}] ${method} ${p} → ${res.status}`

  if (!res.ok) {
    bump('warn'); logWARN(`${tag} (network error: ${res.error})`); return
  }

  const isAuthError = res.status === 401 || res.status === 403
  const isNotFound = res.status === 404
  const is2xx = res.status >= 200 && res.status < 300

  if (expectation === 'deny') {
    if (isAuthError || isNotFound) { bump('ok');   logOK(`${tag} (blocked/not found — expected)`) }
    else       { bump('vuln'); logVULN(`${tag} (expected 401/403 but got through) body=${JSON.stringify(res.data)?.slice(0,120)}`) }
    return
  }
  if (expectation === 'allow') {
    if (isAuthError) { bump('warn'); logWARN(`${tag} (unexpectedly blocked) body=${JSON.stringify(res.data)?.slice(0,120)}`) }
    else       { bump('ok');   logOK(`${tag} (allowed/reachable)`) }
    return
  }
  bump('warn'); logWARN(`${tag} (unknown expectation — permReq not decorated)`)
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 1 — Route Discovery (just logs, returns routes)
// ═══════════════════════════════════════════════════════════════════════════════
async function phaseDiscover() {
  section(1, 'Route Auto-Discovery from app.js')
  const mounted = await loadMountedRouters()
  const all     = []
  for (const m of mounted) all.push(...listRoutes(m.router, m.prefix))
  console.log(`\n  ${C.bold}${C.white}Mounted routers : ${mounted.length}${C.reset}`)
  console.log(`  ${C.bold}${C.white}Routes discovered: ${all.length}${C.reset}`)

  // Print route table
  for (const r of all) {
    const hasPerm = r.permReq.all.length || r.permReq.any.length
    const hasBody = !!r.bodySchema
    const flag    = hasPerm ? `${C.green}✔perm${C.reset}` : `${C.yellow}⚠ no-perm${C.reset}`
    const vflag   = hasBody ? `${C.cyan} ✔validate${C.reset}` : ''
    logINFO(`  ${r.method.padEnd(7)} ${r.relPath.padEnd(55)} ${flag}${vflag}`)
  }
  return { mounted, routes:all }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 2 — Login & Token Acquisition
// ═══════════════════════════════════════════════════════════════════════════════
async function phaseLogin() {
  section(2, 'Login & JWT Acquisition (seed credentials)')
  const creds = [
    { label:'super_admin',  email: process.env.SA_EMAIL  ?? 'zaidbinasif468@gmail.com', password: process.env.SA_PASS  ?? 'zaidkhan123'  },
    { label:'hr_manager',   email: process.env.HRM_EMAIL ?? 'sadia.malik@company.com',  password: process.env.HRM_PASS ?? 'password123'  },
    { label:'hr_executive', email: process.env.HRE_EMAIL ?? 'imran.shah@company.com',   password: process.env.HRE_PASS ?? 'password123'  },
    { label:'employee',     email: process.env.EMP_EMAIL ?? 'huzaifa.kaleem@company.com',password:process.env.EMP_PASS ?? 'password123'  },
    { label:'employee2',    email: process.env.EMP2_EMAIL?? 'ahmed.ali@company.com',    password: process.env.EMP2_PASS?? 'password123' },
  ]
  const tokens = {}
  for (const c of creds) tokens[c.label] = await login(c)
  return tokens
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 3 — RBAC Matrix
//  Every discovered route × every role token
// ═══════════════════════════════════════════════════════════════════════════════
async function phaseRBAC({ routes, tokens, D }) {
  section(3, 'RBAC Matrix — Every Route × Every Role')
  console.log(`  ${C.dim}Technique: OWASP API5:2023 Broken Function Level Authorization${C.reset}`)
  console.log(`  ${C.dim}Expectation derived from: seeded role↔permission map in seed.mjs${C.reset}\n`)

  const ctx = {
    uuid: NON_EXISTENT_UUID,
    employeeId: 'EMP002',
    departmentId: NON_EXISTENT_UUID,
    attendanceId: NON_EXISTENT_UUID,
    month: '1', year: '2026',
  }

  const ROLES = ['super_admin','hr_manager','hr_executive','employee','employee2']

  for (const rt of routes) {
    if (rt.relPath === '/auth/login') continue
    const reqPath = fillPath(rt.relPath, ctx)
    sub(`${rt.method} ${rt.relPath}`)

    for (const roleName of ROLES) {
      const token = tokens[roleName]
      if (!token && roleName !== 'employee2') { logINFO(`no token for ${roleName}`); continue }

      const override    = policyOverride(roleName, rt.method, rt.relPath)
      const inferred    = expectedAccess(roleName, rt.permReq)
      const expectation = override ?? inferred

      const isWrite = ['POST','PUT','PATCH'].includes(rt.method)
      let body = undefined
      if (isWrite) {
        if (rt.bodySchema) {
          body = buildBody(rt.relPath, rt.bodySchema, D)
          if (SAFE_WRITE && rt.method === 'POST') body = safePostBody(rt.relPath, body, D)
        } else {
          body = {}
        }
      }

      const res = await http(rt.method, reqPath, { token, body })
      classifyRBAC({ role:roleName, method:rt.method, path:reqPath, res, expectation })
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 4 — Deep BOLA / Self-Service Authorization Checks
// ═══════════════════════════════════════════════════════════════════════════════
async function phaseBOLA({ tokens, D }) {
  section(4, 'BOLA / Self-Service — Object Level Authorization (OWASP API1:2023)')

  const SA  = tokens.super_admin
  const HRM = tokens.hr_manager
  const EMP = tokens.employee
  const EMP2 = tokens.employee2

  // ── 4a. GET /employees → employee sees only self ──────────────────────────
  sub('4a. Employee GET /employees — must return only self (EMP002)')
  const empList = await http('GET', '/employees', { token:EMP })
  bump('checks')
  if (empList.ok && empList.status === 200 && Array.isArray(empList.data)) {
    const ids = empList.data.map(r => r.employee_id)
    if (ids.length === 1 && ids[0] === 'EMP002') { bump('ok'); logOK(`[employee] /employees returned exactly self (EMP002)`) }
    else { bump('vuln'); logVULN(`[employee] /employees returned ${ids.length} records → ${JSON.stringify(ids).slice(0,100)}`) }
  } else {
    bump('warn'); logWARN(`[employee] /employees → status=${empList.status}`)
  }

  // ── 4b. Employee fetch own UUID ok, other UUID blocked ────────────────────
  sub('4b. Employee GET /employees/:uuid — self=200, other=403')
  const selfRec  = empList.data?.[0]
  const otherRec = D.employees.find(e => e.id !== selfRec?.id && e.id)
  if (selfRec?.id && otherRec?.id) {
    const selfR = await http('GET', `/employees/${selfRec.id}`, { token:EMP })
    bump('checks')
    if (selfR.status === 200) { bump('ok'); logOK(`[employee] GET /employees/:selfUuid → 200`) }
    else { bump('warn'); logWARN(`[employee] GET /employees/:selfUuid → ${selfR.status}`) }

    const othR = await http('GET', `/employees/${otherRec.id}`, { token:EMP })
    bump('checks')
    if (othR.status === 403) { bump('ok'); logOK(`[employee] GET /employees/:otherUuid → 403 (blocked)`) }
    else { bump('vuln'); logVULN(`[employee] GET /employees/:otherUuid → ${othR.status} (expected 403)`) }
  } else {
    bump('warn'); logWARN('Could not get employee UUIDs for BOLA self/other test')
  }

  // ── 4c. Attendance Ack ownership ─────────────────────────────────────────
  sub('4c. Attendance Ack — HR creates, employee acks, HR cannot ack, EMP2 cannot ack other')
  const shiftId = D.shifts?.[0]?.id
  if (!shiftId) { bump('warn'); logWARN('No shift ID — skipping ack flow'); return }

  const batchRes = await http('POST', '/attendance/batch', {
    token: HRM,
    body: {
      date: '2026-01-15',
      rows: [{ employee_id:'EMP002', shift_id:shiftId, check_in:'09:00:00', check_out:'18:00:00', status:'present', notes:'security-test' }]
    }
  })
  bump('checks')
  const ackId = batchRes.data?.records?.[0]?.id
  if (!ackId) { bump('warn'); logWARN(`[hr_manager] POST /attendance/batch → ${batchRes.status}`); return }
  logOK('[hr_manager] POST /attendance/batch created record')

  const hrAck = await http('PATCH', `/attendance/${ackId}/ack`, { token:HRM })
  bump('checks')
  if (hrAck.status === 403) { bump('ok'); logOK('[hr_manager] PATCH ack → 403 (cannot ack others — correct)') }
  else { bump('vuln'); logVULN(`[hr_manager] PATCH ack → ${hrAck.status} (expected 403)`) }

  const empAck = await http('PATCH', `/attendance/${ackId}/ack`, { token:EMP })
  bump('checks')
  if (empAck.status === 200 && empAck.data?.ack === true) { bump('ok'); logOK('[employee] PATCH ack → 200 ack=true (owner can ack)') }
  else { bump('warn'); logWARN(`[employee] PATCH ack → ${empAck.status}`) }

  if (EMP2) {
    const emp2Ack = await http('PATCH', `/attendance/${ackId}/ack`, { token:EMP2 })
    bump('checks')
    if (emp2Ack.status === 403) { bump('ok'); logOK('[employee2] PATCH ack → 403 (cannot ack peer record)') }
    else { bump('vuln'); logVULN(`[employee2] PATCH ack → ${emp2Ack.status} (should be 403)`) }
  }

  const saAck = await http('PATCH', `/attendance/${ackId}/ack`, { token:SA })
  bump('checks')
  if (saAck.status === 200) { bump('ok'); logOK('[super_admin] PATCH ack → 200 (super_admin override ok)') }
  else { bump('warn'); logWARN(`[super_admin] PATCH ack → ${saAck.status}`) }

  // ── 4d. Self-scoped data leaks ────────────────────────────────────────────
  sub('4d. Employee self-scoped data — job_info, extra_employees, leave_balances, notifications')
  const selfChecks = [
    { url:'/job-info',                  label:'job_info'           },
    { url:'/extra-employees',           label:'extra_employees'    },
    { url:'/leave-balances',            label:'leave_balances'     },
    { url:'/leave-requests/balances',   label:'leave_req_balances' },
    { url:'/leave-requests/calendar?month=1&year=2026', label:'leave_calendar' },
  ]
  for (const { url, label } of selfChecks) {
    const r = await http('GET', url, { token:EMP })
    bump('checks')
    if (r.ok && r.status === 200 && Array.isArray(r.data)) {
      const leak = r.data.some(rec => rec.employee_id && rec.employee_id !== 'EMP002')
      if (leak) { bump('vuln'); logVULN(`[employee] GET ${url} leaked other-employee records in ${label}`) }
      else       { bump('ok');  logOK(`[employee] GET ${url} → self-only (no leak)`) }
    } else {
      bump('warn'); logWARN(`[employee] GET ${url} → ${r.status}`)
    }
  }

  // ── 4e. Notification cross-read ───────────────────────────────────────────
  sub('4e. Employee cannot mark peer notification as read')
  if (EMP2) {
    const emp2Notifs = await http('GET', '/notifications?scope=me', { token:EMP2 })
    const notifId = emp2Notifs.data?.items?.[0]?.id
    if (notifId) {
      const crossR = await http('PATCH', `/notifications/${notifId}/read`, { token:EMP })
      bump('checks')
      if (crossR.status === 403 || crossR.status === 404) { bump('ok'); logOK('[employee] PATCH /notifications/:peerId/read → 403/404 (blocked)') }
      else { bump('vuln'); logVULN(`[employee] PATCH /notifications/:peerId/read → ${crossR.status} (expected 403/404)`) }
    } else {
      bump('warn'); logWARN('EMP2 has no notifications — cross-read test skipped')
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 5 — Auth Bypass (No Token / Malformed Token)
// ═══════════════════════════════════════════════════════════════════════════════
async function phaseAuthBypass({ routes }) {
  section(5, 'Auth Bypass — No Token / Malformed JWT (OWASP WSTG-AUTHN)')

  const ctx  = { uuid:NON_EXISTENT_UUID, employeeId:'EMP002', month:'1', year:'2026' }
  const scenarios = [
    { label:'no_token',     token: null          },
    { label:'bad_token',    token: 'not-a-jwt'   },
    { label:'expired_jwt',  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjF9.invalid' },
    { label:'empty_bearer', token: ''            },
  ]

  for (const rt of routes) {
    if (rt.relPath === '/auth/login') continue
    const p = fillPath(rt.relPath, ctx)
    sub(`${rt.method} ${rt.relPath}`)

    for (const s of scenarios) {
      const isWrite = ['POST','PUT','PATCH'].includes(rt.method)
      const res = await http(rt.method, p, { token:s.token, body:isWrite ? {} : undefined })
      bump('checks')

      if (!res.ok) { bump('warn'); logWARN(`[${s.label}] ${rt.method} ${p} → network error`); continue }

      if (res.status === 401) { bump('ok'); logOK(`[${s.label}] ${rt.method} ${p} → 401`) }
      else if (res.status === 403) { bump('warn'); logWARN(`[${s.label}] ${rt.method} ${p} → 403 (blocked, but prefer 401)`) }
      else if (res.status >= 200 && res.status < 400) { bump('vuln'); logVULN(`[${s.label}] ${rt.method} ${p} → ${res.status} — AUTH BYPASS`) }
      else { bump('warn'); logWARN(`[${s.label}] ${rt.method} ${p} → ${res.status}`) }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 6 — Negative / Missing Field Testing
//  Each required field is omitted one-at-a-time; empty body tested too
// ═══════════════════════════════════════════════════════════════════════════════
async function phaseMissingFields({ routes, tokens, D }) {
  section(6, 'Negative Testing — Missing Required Fields (WSTG-INPVAL-01)')
  console.log(`  ${C.dim}Technique: For each write endpoint, omit every required field individually.${C.reset}`)
  console.log(`  ${C.dim}Expected : 400 or 422. A 200/201 = validation not enforced.${C.reset}\n`)

  const saToken = tokens.super_admin
  if (!saToken) { logWARN('super_admin token missing — skipping phase'); return }

  const writeRoutes = routes.filter(r =>
    ['POST','PUT','PATCH'].includes(r.method) &&
    r.relPath !== '/auth/login' &&
    r.bodySchema
  )

  for (const rt of writeRoutes) {
    sub(`${rt.method} ${rt.relPath}`)
    const ctx = { uuid:NON_EXISTENT_UUID, employeeId:'EMP002', month:'1', year:'2026' }
    const p   = fillPath(rt.relPath, ctx)

    const required = zodRequiredFields(rt.bodySchema)
    if (!required.length) { logINFO(`  no required fields detected in schema`); continue }

    // 1) Empty body
    {
      const res = await http(rt.method, p, { token:saToken, body:{} })
      bump('checks')
      if (res.status === 400 || res.status === 422) { bump('ok'); logOK(`EMPTY BODY → ${res.status} (validation enforced)`) }
      else if (res.status === 409) { logOK(`EMPTY BODY → 409 (conflict — validation passed — OK for safe-write targets)`) }
      else { bump('warn'); logWARN(`EMPTY BODY → ${res.status} (expected 400/422)`) }
    }

    // 2) Omit each required field
    const fullBody = buildBody(rt.relPath, rt.bodySchema, D)
    for (const field of required) {
      const partial = deepDelete(fullBody, field)
      const res = await http(rt.method, p, { token:saToken, body:partial })
      bump('checks')
      const label = `MISSING [${field}]`
      if (res.status === 400 || res.status === 422) { bump('ok'); logOK(`${label} → ${res.status}`) }
      else if (res.status === 409)                  { logOK(`${label} → 409 (conflict — ok)`) }
      else if (res.status === 200 || res.status === 201) { bump('vuln'); logVULN(`${label} → ${res.status} — field not validated, accepted partial data`) }
      else                                          { bump('warn'); logWARN(`${label} → ${res.status}`) }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 7 — Boundary Value Analysis (BVA)
//  Exceed max field lengths, send wrong types, bad enum values, negative numbers
// ═══════════════════════════════════════════════════════════════════════════════
async function phaseBVA({ routes, tokens, D }) {
  section(7, 'Boundary Value Analysis — Field Length Overflow & Type Violations (ISO/IEC 29119 BVA)')
  console.log(`  ${C.dim}Technique: max+1 string length, wrong enum, string for int, negative where positive required.${C.reset}\n`)

  const saToken = tokens.super_admin
  if (!saToken) { logWARN('super_admin token missing — skipping phase'); return }

  const writeRoutes = routes.filter(r =>
    ['POST','PUT','PATCH'].includes(r.method) &&
    r.relPath !== '/auth/login' &&
    r.bodySchema
  )

  for (const rt of writeRoutes) {
    sub(`${rt.method} ${rt.relPath}`)
    const ctx = { uuid:NON_EXISTENT_UUID, employeeId:'EMP002', month:'1', year:'2026' }
    const p   = fillPath(rt.relPath, ctx)
    const fullBody = buildBody(rt.relPath, rt.bodySchema, D)

    // ── 7a. String field max+1 overflow ──────────────────────────────────────
    const maxMap = zodStringMaxMap(rt.bodySchema)
    for (const [dotField, maxLen] of Object.entries(maxMap)) {
      const overflowStr = 'X'.repeat(maxLen + 2)
      const overBody = deepSet(fullBody, dotField, overflowStr)
      const res = await http(rt.method, p, { token:saToken, body:overBody })
      bump('checks')
      const label = `BVA OVERFLOW [${dotField}] max=${maxLen} sent=${maxLen+2}`
      if (res.status === 400 || res.status === 422) { bump('ok'); logOK(`${label} → ${res.status}`) }
      else if (res.status === 409)                  { logOK(`${label} → 409`) }
      else if (res.status === 200 || res.status === 201) { bump('vuln'); logVULN(`${label} → ${res.status} — field accepted overflow value`) }
      else                                          { bump('warn'); logWARN(`${label} → ${res.status}`) }
    }

    // ── 7b. Wrong enum values ─────────────────────────────────────────────────
    {
      const schema = unwrapZod(rt.bodySchema)
      if (schema?._def?.typeName === 'ZodObject') {
        const shape = typeof schema._def.shape === 'function' ? schema._def.shape() : schema._def.shape
        for (const [k, v] of Object.entries(shape ?? {})) {
          const inner = unwrapZod(v)
          if (inner?._def?.typeName === 'ZodEnum') {
            const badBody = deepSet(fullBody, k, '__INVALID_ENUM_VALUE_XYZ__')
            const res = await http(rt.method, p, { token:saToken, body:badBody })
            bump('checks')
            const label = `BVA BAD ENUM [${k}]`
            if (res.status === 400 || res.status === 422) { bump('ok'); logOK(`${label} → ${res.status}`) }
            else if (res.status === 409)                  { logOK(`${label} → 409`) }
            else { bump('warn'); logWARN(`${label} → ${res.status}`) }
          }
        }
      }
    }

    // ── 7c. String where number expected (type coercion test) ─────────────────
    {
      const schema = unwrapZod(rt.bodySchema)
      if (schema?._def?.typeName === 'ZodObject') {
        const shape = typeof schema._def.shape === 'function' ? schema._def.shape() : schema._def.shape
        for (const [k, v] of Object.entries(shape ?? {})) {
          const inner = unwrapZod(v)
          if (inner?._def?.typeName === 'ZodNumber' && fullBody[k] !== undefined) {
            const badBody = deepSet(fullBody, k, 'not-a-number')
            const res = await http(rt.method, p, { token:saToken, body:badBody })
            bump('checks')
            const label = `BVA STRING_FOR_INT [${k}]`
            if (res.status === 400 || res.status === 422) { bump('ok'); logOK(`${label} → ${res.status}`) }
            else { bump('warn'); logWARN(`${label} → ${res.status}`) }
            break // one field per route is enough
          }
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 8 — Injection Testing (SQLi + XSS + Path Traversal + Null Byte)
// ═══════════════════════════════════════════════════════════════════════════════
async function phaseInjection({ routes, tokens, D }) {
  section(8, 'Injection Testing — SQLi / XSS / Path Traversal (OWASP A03:2021)')
  console.log(`  ${C.dim}Technique: Inject payloads into path params, query params, and request body fields.${C.reset}`)
  console.log(`  ${C.dim}Expected : 400/422 (rejected) or 200 with NO 500 crash. Reflection = VULN.${C.reset}\n`)

  const saToken = tokens.super_admin
  if (!saToken) { logWARN('super_admin token missing — skipping phase'); return }

  const PAYLOADS = [
    // SQL Injection
    { label:'sqli_classic',    value:`' OR '1'='1` },
    { label:'sqli_comment',    value:`' OR 1=1--`   },
    { label:'sqli_union',      value:`' UNION SELECT NULL,NULL,NULL--` },
    { label:'sqli_stacked',    value:`'; DROP TABLE users;--`          },
    { label:'sqli_sleep',      value:`'; SELECT pg_sleep(2);--`        },
    // XSS
    { label:'xss_script',      value:`<script>alert(1)</script>`               },
    { label:'xss_img',         value:`<img src=x onerror=alert(document.domain)>` },
    { label:'xss_svg',         value:`<svg onload=alert(1)>`                   },
    { label:'xss_js_uri',      value:`javascript:alert(1)`                     },
    { label:'xss_encoded',     value:`&lt;script&gt;alert(1)&lt;/script&gt;`   },
    // Path traversal
    { label:'path_traversal',  value:`../../etc/passwd`    },
    { label:'path_win',        value:`..\\..\\windows\\win.ini` },
    // Null byte
    { label:'null_byte',       value:`valid\x00injected`   },
    // Template injection
    { label:'template_ssti',   value:`{{7*7}}`              },
    { label:'template_jinja',  value:`{% raw %}{{ config }}{% endraw %}` },
  ]

  const pathInjectCtx = {
    uuid:         `' OR 1=1--`,
    employeeId:   `<script>alert(1)</script>`,
    departmentId: `' UNION SELECT NULL--`,
    month:        `1' OR '1'='1`,
    year:         `2026' OR 1=1--`,
  }

  for (const rt of routes) {
    if (rt.relPath === '/auth/login') continue
    sub(`${rt.method} ${rt.relPath}`)

    // ── 8a. Path param injection ───────────────────────────────────────────
    const injPath = fillPath(rt.relPath, pathInjectCtx)
    if (injPath !== fillPath(rt.relPath, { uuid:NON_EXISTENT_UUID, employeeId:'EMP002', month:'1', year:'2026' })) {
      const isWrite = ['POST','PUT','PATCH'].includes(rt.method)
      const res = await http(rt.method, injPath, { token:saToken, body:isWrite ? {} : undefined })
      bump('checks')
      if (!res.ok) { bump('warn'); logWARN(`[path-inject] ${rt.method} ${injPath} → network error`); }
      else if (res.status >= 500) { bump('warn'); logWARN(`[path-inject] ${rt.method} ${injPath} → ${res.status} SERVER CRASH`) }
      else { bump('ok'); logOK(`[path-inject] ${rt.method} ${injPath} → ${res.status}`) }
    }

    // ── 8b. Query param injection ──────────────────────────────────────────
    if (rt.relPath === '/attendance/daily') {
      const qp = `/attendance/daily?date=${encodeURIComponent(`2026-01-15' OR 1=1--`)}`
      const res = await http('GET', qp, { token:saToken })
      bump('checks')
      if (res.status >= 500) { bump('warn'); logWARN(`[query-inject] ${qp} → ${res.status}`) }
      else { bump('ok'); logOK(`[query-inject] ${qp} → ${res.status}`) }
    }

    // ── 8c. Body field injection (write endpoints) ─────────────────────────
    if (['POST','PUT','PATCH'].includes(rt.method) && rt.bodySchema) {
      const baseBody = buildBody(rt.relPath, rt.bodySchema, D)
      const schema   = unwrapZod(rt.bodySchema)
      const shape    = schema?._def?.typeName === 'ZodObject'
        ? (typeof schema._def.shape === 'function' ? schema._def.shape() : schema._def.shape)
        : {}

      // Only inject into string fields
      const strFields = Object.entries(shape ?? {})
        .filter(([, v]) => unwrapZod(v)?._def?.typeName === 'ZodString')
        .map(([k]) => k)
        .slice(0, 4) // cap at 4 fields per route to keep test time reasonable

      if (!strFields.length) { logINFO(`no injectable string fields`); continue }

      const ctx2 = { uuid:NON_EXISTENT_UUID, employeeId:'EMP002', month:'1', year:'2026' }
      const p    = fillPath(rt.relPath, ctx2)

      for (const payload of PAYLOADS) {
        // Inject first string field only (all others keep valid value) — per payload
        const injBody = { ...baseBody }
        for (const f of strFields) injBody[f] = payload.value

        if (SAFE_WRITE && rt.method === 'POST') {
          // Apply conflict-key preservation so we don't create new rows
          const safe = safePostBody(rt.relPath, injBody, D)
          Object.assign(injBody, safe)
        }

        const res = await http(rt.method, p, { token:saToken, body:injBody })
        bump('checks')
        const label = `[${payload.label}] ${rt.method} ${p}`

        if (!res.ok) { bump('warn'); logWARN(`${label} → network error`); continue }
        if (res.status >= 500) { bump('warn'); logWARN(`${label} → ${res.status} SERVER CRASH`); continue }

        // Check if raw payload reflected back unescaped (XSS reflection)
        const bodyStr = JSON.stringify(res.data ?? '')
        const xssPayloads = ['<script>','onerror=','onload=','javascript:']
        const reflected = xssPayloads.some(xp => bodyStr.includes(xp))
        if (reflected && (res.status === 200 || res.status === 201)) {
          bump('vuln'); logVULN(`${label} → ${res.status} REFLECTED XSS payload in response body`)
          continue
        }

        if (res.status === 400 || res.status === 422) { bump('ok'); logOK(`${label} → ${res.status} (rejected)`) }
        else if (res.status === 409)                  { bump('ok'); logOK(`${label} → 409 (conflict — no crash)`) }
        else                                          { bump('warn'); logWARN(`${label} → ${res.status} (payload accepted; check if sanitized)`) }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 9 — Mass Assignment / Parameter Pollution
// ═══════════════════════════════════════════════════════════════════════════════
async function phaseMassAssignment({ routes, tokens, D }) {
  section(9, 'Mass Assignment — Privileged Field Smuggling (OWASP API6:2023 / CWE-915)')
  console.log(`  ${C.dim}Technique: Inject role/admin/salary fields alongside valid body.${C.reset}`)
  console.log(`  ${C.dim}Expected : Fields NOT reflected in response. If reflected = controller not stripping.${C.reset}\n`)

  const saToken = tokens.super_admin
  if (!saToken) { logWARN('super_admin token missing — skipping phase'); return }

  const PRIVILEGED = {
    role:             'super_admin',
    role_id:          NON_EXISTENT_UUID,
    isAdmin:          true,
    is_admin:         true,
    is_super_admin:   true,
    salary:           9999999,
    marked_by:        NON_EXISTENT_UUID,
    ack:              true,
    state:            'locked',
    must_change_password: false,
    password_changed_at:  '2020-01-01',
    created_at:       '2020-01-01',
    updated_at:       '2020-01-01',
  }

  const writeRoutes = routes.filter(r =>
    ['POST','PUT','PATCH'].includes(r.method) && r.relPath !== '/auth/login'
  )

  for (const rt of writeRoutes) {
    const ctx = { uuid:NON_EXISTENT_UUID, employeeId:'EMP002', month:'1', year:'2026' }
    const p   = fillPath(rt.relPath, ctx)
    const base = rt.bodySchema ? buildBody(rt.relPath, rt.bodySchema, D) : {}
    const massBody = { ...base, ...PRIVILEGED }

    if (SAFE_WRITE && rt.method === 'POST') Object.assign(massBody, safePostBody(rt.relPath, massBody, D))

    const res = await http(rt.method, p, { token:saToken, body:massBody })
    bump('checks')
    const label = `[mass-assign] ${rt.method} ${rt.relPath}`

    if (!res.ok) { bump('warn'); logWARN(`${label} → network error`); continue }
    if (res.status >= 500) { bump('warn'); logWARN(`${label} → ${res.status}`); continue }

    if (res.status === 200 || res.status === 201) {
      const bodyStr  = JSON.stringify(res.data ?? {})
      const badFields = Object.keys(PRIVILEGED).filter(k => {
        // Deep search for the key in response data
        const val = res.data?.data?.[k] ?? res.data?.[k]
        return (val !== undefined && val !== null) && bodyStr.includes(`"${k}"`)
      })
      if (badFields.length) {
        bump('vuln'); logVULN(`${label} → ${res.status} PRIVILEGED FIELDS REFLECTED: ${badFields.join(', ')}`)
      } else {
        bump('ok'); logOK(`${label} → ${res.status} (no privileged field leak)`)
      }
    } else {
      bump('ok'); logOK(`${label} → ${res.status}`)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PHASE 10 — HR Dashboard / Reporting Access Control
// ═══════════════════════════════════════════════════════════════════════════════
async function phaseHRDashboard({ tokens }) {
  section(10, 'HR Dashboard & Reporting — Role Segregation')

  const EMP = tokens.employee
  const HRM = tokens.hr_manager
  const HRE = tokens.hr_executive

  const hrOnlyEndpoints = [
    { method:'GET', path:'/dashboard/metrics?range=6m',  label:'dashboard_metrics'   },
    { method:'GET', path:'/dashboard/pending-actions',   label:'pending_actions'     },
    { method:'GET', path:'/dashboard/urgent-alerts?days=30', label:'urgent_alerts'   },
    { method:'GET', path:'/leave-requests/balances',     label:'leave_balances_all'  },
    { method:'POST', path:'/employees',                  label:'create_employee'     },
  ]

  sub('10a. Employee blocked from HR-only endpoints')
  for (const ep of hrOnlyEndpoints) {
    const res = await http(ep.method, ep.path, { token:EMP })
    bump('checks')
    // A 403, 401 OR 404 is a successful block for an HR-only endpoint (if it's protected or not found)
    if (res.status === 403 || res.status === 401 || res.status === 404) { 
      bump('ok'); logOK(`[employee] ${ep.method} ${ep.path} → ${res.status} (blocked)`) 
    }
    else { 
      bump('vuln'); logVULN(`[employee] ${ep.method} ${ep.path} → ${res.status} (expected 403/401/404)`) 
    }
  }

  sub('10b. HR Manager allowed on HR-only endpoints')
  for (const ep of hrOnlyEndpoints) {
    const res = await http(ep.method, ep.path, { token:HRM })
    bump('checks')
    if (res.status >= 200 && res.status < 300 || res.status === 422) { // 422 is also "reached logic" for POST
      bump('ok'); logOK(`[hr_manager] ${ep.method} ${ep.path} → ${res.status}`) 
    }
    else if (res.status === 403 || res.status === 401) { 
      bump('warn'); logWARN(`[hr_manager] ${ep.method} ${ep.path} → ${res.status} (unexpectedly blocked)`) 
    }
    else { 
      bump('warn'); logWARN(`[hr_manager] ${ep.method} ${ep.path} → ${res.status}`) 
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
function printSummary(startTime) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`)
  console.log(`${C.bold}${C.cyan}║        EMS SECURITY TEST SUMMARY         ║${C.reset}`)
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`)
  console.log(`\n  Total checks  : ${C.bold}${CTR.checks}${C.reset}`)
  console.log(`  ${C.green}✔ Passed${C.reset}       : ${CTR.ok}`)
  console.log(`  ${C.yellow}⚠ Warnings${C.reset}     : ${CTR.warn}`)
  console.log(`  ${C.red}✘ Vulnerabilities${C.reset}: ${CTR.vuln}`)
  console.log(`  Elapsed       : ${elapsed}s`)
  console.log(`  Run at        : ${now()}\n`)

  if (CTR.vuln > 0) {
    console.log(`  ${C.bold}${C.red}⚠  ${CTR.vuln} SECURITY ISSUE(S) FOUND — review VULN lines above${C.reset}`)
  } else if (CTR.warn > 0) {
    console.log(`  ${C.bold}${C.yellow}⚠  No vulnerabilities. ${CTR.warn} warnings to review.${C.reset}`)
  } else {
    console.log(`  ${C.bold}${C.green}✔  All checks passed. No issues detected.${C.reset}`)
  }
  console.log()
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PRINT TEST METHODOLOGY (runs at start)
// ═══════════════════════════════════════════════════════════════════════════════
function printMethodology() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════════════╗`)
  console.log(`║        EMS API — Full Spectrum Security Test Suite              ║`)
  console.log(`╚══════════════════════════════════════════════════════════════════╝${C.reset}`)
  console.log(`  ${C.gray}base=${BASE}  safe_write=${SAFE_WRITE}  verbose=${VERBOSE}  time=${now()}${C.reset}`)
  console.log()
  console.log(`  ${C.bold}What these tests cover:${C.reset}`)
  console.log(`  ${C.cyan}Phase 1${C.reset}  Route Discovery             — static parse of app.js`)
  console.log(`  ${C.cyan}Phase 2${C.reset}  Login / JWT Acquisition     — seed credentials`)
  console.log(`  ${C.cyan}Phase 3${C.reset}  RBAC Matrix                 — OWASP API5 BFLA`)
  console.log(`  ${C.cyan}Phase 4${C.reset}  BOLA / Self-Service         — OWASP API1 IDOR`)
  console.log(`  ${C.cyan}Phase 5${C.reset}  Auth Bypass                 — no/bad/expired JWT`)
  console.log(`  ${C.cyan}Phase 6${C.reset}  Negative / Missing Fields   — WSTG-INPVAL-01`)
  console.log(`  ${C.cyan}Phase 7${C.reset}  Boundary Value Analysis     — max+1, bad enum, wrong type`)
  console.log(`  ${C.cyan}Phase 8${C.reset}  Injection Probes            — SQLi, XSS, path traversal`)
  console.log(`  ${C.cyan}Phase 9${C.reset}  Mass Assignment             — OWASP API6 / CWE-915`)
  console.log(`  ${C.cyan}Phase 10${C.reset} HR Dashboard Access         — role segregation smoke test`)
  console.log()
  console.log(`  ${C.bold}Seed credential map:${C.reset}`)
  console.log(`  super_admin   → zaidbinasif468@gmail.com  / zaidkhan123`)
  console.log(`  hr_manager    → sadia.malik@company.com   / password123  (EMP004)`)
  console.log(`  hr_executive  → imran.shah@company.com    / password123  (EMP005)`)
  console.log(`  employee      → huzaifa.kaleem@company.com / password123 (EMP002)`)
  console.log(`  employee2     → ahmed.ali@company.com     / password123  (EMP003)`)
  console.log()
  console.log(`  ${C.bold}Env flags:${C.reset}`)
  console.log(`  SAFE_WRITE=0   allow write mutations (default: 1 = conflict-safe)`)
  console.log(`  VERBOSE=1      show INFO / SKIP logs`)
  console.log(`  PHASE=N        run only phase N`)
  console.log(`  BASE_URL=...   override base URL`)
  console.log()
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  const startTime = Date.now()
  printMethodology()

  const shouldRun = n => PHASE_FILTER === null || PHASE_FILTER === n

  // Phase 1 — always run (other phases depend on routes)
  const { routes } = await phaseDiscover()

  // Phase 2 — always run (other phases depend on tokens)
  const tokens = await phaseLogin()

  if (!tokens.super_admin) {
    logWARN('super_admin login failed — most phases will be skipped')
  }

  // Discover live IDs (best-effort)
  let D = {
    employees:[], departments:[], shifts:[], designations:[],
    employmentTypes:[], jobStatuses:[], workModes:[], workLocations:[],
    leaveTypes:[], leaveBalances:[], leavePolicies:[], users:[],
    jobInfo:[], penaltyRules:[], attendanceId:null,
  }
  if (tokens.super_admin) {
    sub('Discovering live IDs from running server…')
    D = await discoverIds(tokens.super_admin)
    logINFO(`employees=${D.employees.length} departments=${D.departments.length} shifts=${D.shifts.length} leaveTypes=${D.leaveTypes.length}`)
  }

  if (shouldRun(3)) await phaseRBAC({ routes, tokens, D })
  if (shouldRun(4)) await phaseBOLA({ tokens, D })
  if (shouldRun(5)) await phaseAuthBypass({ routes })
  if (shouldRun(6)) await phaseMissingFields({ routes, tokens, D })
  if (shouldRun(7)) await phaseBVA({ routes, tokens, D })
  if (shouldRun(8)) await phaseInjection({ routes, tokens, D })
  if (shouldRun(9)) await phaseMassAssignment({ routes, tokens, D })
  if (shouldRun(10)) await phaseHRDashboard({ tokens })

  printSummary(startTime)
  process.exit(CTR.vuln > 0 ? 1 : 0)
}

main().catch(e => {
  logVULN(`Runner crashed: ${e?.stack ?? e?.message ?? String(e)}`)
  process.exit(1)
})
