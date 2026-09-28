/**
 * EMS Backend - Route Middleware Audit
 *
 * Purpose:
 * - Verify every mounted /api route has:
 *   1) verifyToken
 *   2) permission middleware (requirePermission/requireAnyPermission)
 *   3) validate (if present) AFTER permission
 *
 * Run:
 *   node scripts/route-middleware-audit.mjs
 *
 * Notes:
 * - We intentionally allow /api/auth/login to be public (no verifyToken/permission).
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// When piping output (e.g. to Select-String), the consumer may close early.
// Avoid crashing the audit with an unhandled EPIPE.
process.stdout.on('error', (e) => {
  if (e?.code === 'EPIPE') process.exit(0)
})
process.stderr.on('error', (e) => {
  if (e?.code === 'EPIPE') process.exit(0)
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const APP_FILE = path.join(ROOT, 'src', 'app.js')

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

const ok = (m) => console.log(`  ${C.green}OK${C.reset}  ${m}`)
const warn = (m) => console.log(`  ${C.yellow}WARN${C.reset} ${m}`)
const bad = (m) => console.log(`  ${C.red}FAIL${C.reset} ${m}`)
const info = (m) => console.log(`  ${C.gray}${m}${C.reset}`)

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

async function loadMountedRouters() {
  const text = await fs.readFile(APP_FILE, 'utf8')

  const imports = new Map()
  const importRe = /import\s+(\w+)\s+from\s+['"](.+?)['"]\s*;/g
  for (let m; (m = importRe.exec(text));) {
    imports.set(m[1], m[2])
  }

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

function listRoutes(router, prefix, routerFile) {
  const out = []
  const stack = router?.stack ?? []
  const sharedMiddleware = stack.filter((layer) => !layer?.route)

  for (const layer of stack) {
    if (!layer?.route) continue

    const routePath = layer.route.path
    const methods = Object.entries(layer.route.methods ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k.toUpperCase())

    const full = joinPaths(prefix, routePath)
    const rel = toRelApiPath(full)
    for (const method of methods) {
      out.push({
        method,
        fullApiPath: full,
        templateRelPath: rel,
        routerFile,
        middlewareStack: [...sharedMiddleware, ...(layer.route.stack ?? [])],
      })
    }
  }
  return out
}

function isPublicRoute({ method, templateRelPath }) {
  // Auth login is intentionally public.
  return method === 'POST' && templateRelPath === '/auth/login'
}

function allowsAuthOnlyRoute({ method, templateRelPath }) {
  // Authenticated-only endpoints that intentionally skip explicit permission middleware.
  const authOnly = new Set([
    'POST /auth/logout',
    'GET /auth/session',
    'POST /auth/change-password',
    'PATCH /attendance/:id/ack',
    'GET /leave-requests/mine',
    'POST /leave-requests',
    'GET /leave-requests/balances/mine',
    'GET /dashboard/me',
    'GET /calendar-events',
    'GET /notifications',
    'PATCH /notifications/:id/read',
    'PATCH /penalties/:id/ack',
  ])

  return authOnly.has(`${method} ${templateRelPath}`)
}

function auditRoute(rt) {
  const stack = rt.middlewareStack

  // Use metadata flags rather than fragile function names (handles can be anonymous/renamed).
  let verifyIdx = stack.findIndex((l) => Boolean(l?.handle?.__auth))
  if (verifyIdx === -1) verifyIdx = stack.findIndex((l) => l?.handle?.name === 'verifyToken') // fallback

  const permIdxs = stack
    .map((l, i) => (Boolean(l?.handle?.__perm) ? i : -1))
    .filter((i) => i !== -1)
  const validateIdxs = stack
    .map((l, i) => (Boolean(l?.handle?.__validate) ? i : -1))
    .filter((i) => i !== -1)

  const permIdx = permIdxs.length ? permIdxs[0] : -1
  const validateIdx = validateIdxs.length ? validateIdxs[0] : -1

  const failures = []

  if (!isPublicRoute(rt)) {
    if (verifyIdx === -1) failures.push('missing verifyToken')
    if (permIdx === -1 && !allowsAuthOnlyRoute(rt)) failures.push('missing permission middleware')
    if (verifyIdx !== -1 && verifyIdx !== 0) failures.push('verifyToken is not first middleware')
    if (verifyIdx !== -1 && permIdx !== -1 && permIdx < verifyIdx) failures.push('permission middleware is before verifyToken')

    // Any validate() present must run after the first permission middleware.
    const validateBeforePerm = validateIdxs.some((i) => permIdx !== -1 && i < permIdx)
    if (validateBeforePerm) failures.push('validate() runs before permission middleware')
  } else {
    // Public routes should not accidentally include verifyToken/permission.
    if (verifyIdx !== -1) failures.push('public route unexpectedly includes verifyToken')
    if (permIdx !== -1) failures.push('public route unexpectedly includes permission middleware')
  }

  return { verifyIdx, permIdx, validateIdx, failures }
}

async function main() {
  console.log(`${C.bold}${C.cyan}━━ Route Middleware Audit${C.reset}`)
  info(`app=${APP_FILE}`)

  const mounted = await loadMountedRouters()
  info(`mounted routers=${mounted.length}`)

  const routes = []
  for (const m of mounted) {
    routes.push(...listRoutes(m.router, m.prefix, m.file))
  }
  info(`discovered routes=${routes.length}`)

  let failed = 0
  let warned = 0

  for (const rt of routes) {
    const a = auditRoute(rt)
    const label = `${rt.method} ${rt.templateRelPath} (${path.relative(ROOT, rt.routerFile)})`

    if (a.failures.length > 0) {
      failed++
      bad(`${label}: ${a.failures.join('; ')}`)
      continue
    }

    // Mild warning: route has no validate() and is a write route (not always required).
    if (['POST', 'PUT', 'PATCH'].includes(rt.method) && a.validateIdx === -1 && !isPublicRoute(rt)) {
      warned++
      warn(`${label}: no validate() middleware`)
    } else {
      ok(label)
    }
  }

  console.log(`\n${C.bold}Summary${C.reset}`)
  console.log(`  routes: ${routes.length}`)
  console.log(`  warnings: ${warned}`)
  console.log(`  failures: ${failed}`)

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  bad(`Audit crashed: ${e?.stack ?? e?.message ?? String(e)}`)
  process.exit(1)
})

