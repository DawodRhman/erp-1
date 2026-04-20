# Phase 1 — Fixes, Zod Validation & Permission System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all delete operations, install Zod validation on every route, and replace the broken string-role auth system with a proper DB-backed permission system.

**Architecture:** A `validate(schema)` middleware factory strips invalid payloads at the route level with 422 responses. A `requirePermission(key)` middleware factory fetches the user's role permissions once per request, caches them on `req.permissions`, and short-circuits for `super_admin`. Auth login is fixed to use `email`, join `roles`, and embed `{ user_id, employee_id, role_id, is_super_admin }` in the JWT.

**Tech Stack:** Node.js ESM, Express 5, PostgreSQL (`pg`), Zod, Vitest, JWT

---

## File Map

**Create:**
- `vitest.config.js`
- `src/middleware/validate-middleware.js`
- `src/middleware/permission-middleware.js`
- `src/schemas/employee.schema.js`
- `src/schemas/job-info.schema.js`
- `src/schemas/extra-employee-info.schema.js`
- `src/schemas/department.schema.js`
- `src/schemas/designation.schema.js`
- `src/schemas/employment-type.schema.js`
- `src/schemas/job-status.schema.js`
- `src/schemas/work-mode.schema.js`
- `src/schemas/work-location.schema.js`
- `src/schemas/shift.schema.js`
- `src/schemas/leave-type.schema.js`
- `src/schemas/leave-policy.schema.js`
- `src/schemas/leave-balance.schema.js`
- `tests/middleware/validate.test.js`
- `tests/middleware/permission.test.js`
- `tests/schemas/employee.schema.test.js`

**Modify:**
- `package.json` — add vitest + zod, add test script
- `src/models/auth-model.js` — query by email, join roles
- `src/services/auth-service.js` — new JWT shape, is_super_admin
- `src/controllers/auth-controller.js` — use email field
- `src/middleware/auth-middleware.js` — verify new JWT shape
- `src/models/employee-info-model.js` — remove delete, add search
- `src/services/employee-info-service.js` — remove delete
- `src/controllers/employee-info-controller.js` — remove delete
- `src/routes/employee-info-routes.js` — remove delete, add search, wire validate + permission
- `src/models/extra-employee-info-model.js` — remove delete
- `src/services/extra-employee-info-service.js` — remove delete
- `src/controllers/extra-employee-info-controller.js` — remove delete
- `src/routes/extra-employee-info-routes.js` — remove delete, wire validate + permission
- `src/models/job-info-model.js` — remove delete
- `src/services/job-info-service.js` — remove delete
- `src/controllers/job-info-controller.js` — remove delete
- `src/routes/job-info-routes.js` — remove delete, wire validate + permission
- `src/routes/department-routes.js` — wire validate + requirePermission('config:manage')
- `src/routes/designation-routes.js` — wire validate + requirePermission('config:manage')
- `src/routes/employment-type-routes.js` — wire validate + requirePermission('config:manage')
- `src/routes/job-status-routes.js` — wire validate + requirePermission('config:manage')
- `src/routes/work-mode-routes.js` — wire validate + requirePermission('config:manage')
- `src/routes/work-location-routes.js` — wire validate + requirePermission('config:manage')
- `src/routes/shift-routes.js` — wire validate + requirePermission('config:manage')
- `src/routes/leave-type-routes.js` — wire validate + requirePermission('config:manage')
- `src/routes/leave-policy-routes.js` — wire validate + requirePermission('config:manage')
- `src/routes/leave-balance-routes.js` — wire validate + permission

---

## Task 1: Install Dependencies + Test Runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`

- [ ] **Step 1: Install zod and vitest**

```bash
cd d:/Desktop/EMS/backend
npm install zod
npm install --save-dev vitest
```

Expected output: both packages appear in `node_modules/`, `package.json` updated.

- [ ] **Step 2: Add test script to package.json**

Open `package.json`. Replace the `"scripts"` block with:

```json
"scripts": {
  "start": "nodemon start",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:create": "node-pg-migrate create",
  "db:migrate": "node-pg-migrate up",
  "db:rollback": "node-pg-migrate down",
  "db:check": "node-pg-migrate up --dry-run",
  "db:fake": "node-pg-migrate up --fake",
  "db:seed": "node seeds/dev_seed.js"
}
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node'
  }
})
```

- [ ] **Step 4: Verify vitest runs**

```bash
npm test
```

Expected: `No test files found` — vitest found no tests yet but ran successfully without errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.js
git commit -m "chore: install zod and vitest"
```

---

## Task 2: Build Validate Middleware

**Files:**
- Create: `src/middleware/validate-middleware.js`
- Create: `tests/middleware/validate.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/middleware/validate.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validate } from '../../src/middleware/validate-middleware.js'

const schema = z.object({ name: z.string() })

describe('validate middleware', () => {
  it('calls next() and sets req.body when valid', () => {
    const middleware = validate(schema)
    const req = { body: { name: 'Ahmed', extra: 'stripped' } }
    const res = {}
    const next = vi.fn()
    middleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.body).toEqual({ name: 'Ahmed' })
  })

  it('returns 422 with issues when body is invalid', () => {
    const middleware = validate(schema)
    const req = { body: {} }
    const json = vi.fn()
    const res = { status: vi.fn(() => ({ json })) }
    const next = vi.fn()
    middleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(422)
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Validation failed',
      issues: expect.arrayContaining([
        expect.objectContaining({ field: 'name' })
      ])
    }))
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 422 when body is not an object', () => {
    const middleware = validate(schema)
    const req = { body: null }
    const json = vi.fn()
    const res = { status: vi.fn(() => ({ json })) }
    const next = vi.fn()
    middleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(422)
    expect(next).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test tests/middleware/validate.test.js
```

Expected: FAIL — `Cannot find module '../../src/middleware/validate-middleware.js'`

- [ ] **Step 3: Implement validate middleware**

Create `src/middleware/validate-middleware.js`:

```js
export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
        return res.status(422).json({
            error: 'Validation failed',
            issues: result.error.issues.map(i => ({
                field: i.path.join('.'),
                message: i.message
            }))
        })
    }
    req.body = result.data
    next()
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test tests/middleware/validate.test.js
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/middleware/validate-middleware.js tests/middleware/validate.test.js
git commit -m "feat: add validate middleware with zod"
```

---

## Task 3: Build Permission Middleware

**Files:**
- Create: `src/middleware/permission-middleware.js`
- Create: `tests/middleware/permission.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/middleware/permission.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { requirePermission } from '../../src/middleware/permission-middleware.js'

describe('requirePermission middleware', () => {
  it('calls next() immediately for super_admin without checking permissions', async () => {
    const middleware = requirePermission('employees:write')
    const req = { user: { is_super_admin: true } }
    const res = {}
    const next = vi.fn()
    await middleware(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(req.permissions).toBeUndefined()
  })

  it('calls next() when cached permissions contain the key', async () => {
    const middleware = requirePermission('attendance:read')
    const req = {
      user: { is_super_admin: false, role_id: 'role-abc' },
      permissions: new Set(['attendance:read', 'employees:read'])
    }
    const res = {}
    const next = vi.fn()
    await middleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('returns 403 when cached permissions do NOT contain the key', async () => {
    const middleware = requirePermission('attendance:write')
    const req = {
      user: { is_super_admin: false, role_id: 'role-abc' },
      permissions: new Set(['attendance:read'])
    }
    const json = vi.fn()
    const res = { status: vi.fn(() => ({ json })) }
    const next = vi.fn()
    await middleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when req.user is missing', async () => {
    const middleware = requirePermission('employees:read')
    const req = {}
    const json = vi.fn()
    const res = { status: vi.fn(() => ({ json })) }
    const next = vi.fn()
    await middleware(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test tests/middleware/permission.test.js
```

Expected: FAIL — `Cannot find module '../../src/middleware/permission-middleware.js'`

- [ ] **Step 3: Implement permission middleware**

Create `src/middleware/permission-middleware.js`:

```js
import pool from '../config/db.js'

export const requirePermission = (key) => async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' })
    }

    if (req.user.is_super_admin) return next()

    if (!req.permissions) {
        const result = await pool.query(
            `SELECT p.permission_key
             FROM permissions p
             JOIN role_permissions rp ON rp.permission_id = p.id
             WHERE rp.role_id = $1`,
            [req.user.role_id]
        )
        req.permissions = new Set(result.rows.map(r => r.permission_key))
    }

    if (!req.permissions.has(key)) {
        return res.status(403).json({ error: 'Insufficient permissions.' })
    }

    next()
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test tests/middleware/permission.test.js
```

Expected: PASS — 4 tests pass. (The DB query path is not tested here since it requires a live DB — unit tests cover the cached path which is the hot path in production.)

- [ ] **Step 5: Commit**

```bash
git add src/middleware/permission-middleware.js tests/middleware/permission.test.js
git commit -m "feat: add requirePermission middleware with per-request cache"
```

---

## Task 4: Fix Auth Service (New JWT Shape)

**Files:**
- Modify: `src/models/auth-model.js`
- Modify: `src/services/auth-service.js`
- Modify: `src/controllers/auth-controller.js`

- [ ] **Step 1: Rewrite auth-model.js to query by email and join roles**

Replace the entire contents of `src/models/auth-model.js`:

```js
import pool from '../config/db.js'

const authTable = {
    findByEmail: async (email) => {
        const res = await pool.query(
            `SELECT u.id, u.employee_id, u.email, u.password, u.role_id,
                    r.role_name, r.department_id
             FROM users u
             LEFT JOIN roles r ON r.id = u.role_id
             WHERE u.email = $1`,
            [email]
        )
        return res.rows[0]
    }
}

export default authTable
```

- [ ] **Step 2: Rewrite auth-service.js with new JWT payload**

Replace the entire contents of `src/services/auth-service.js`:

```js
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import authTable from '../models/auth-model.js'

const authService = {
    login: async (email, password) => {
        const user = await authTable.findByEmail(email)

        if (!user) {
            const err = new Error('Invalid email or password')
            err.status = 401
            throw err
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            const err = new Error('Invalid email or password')
            err.status = 401
            throw err
        }

        const is_super_admin = user.department_id === null && user.role_name === 'super_admin'

        const token = jwt.sign(
            {
                user_id: user.id,
                employee_id: user.employee_id,
                role_id: user.role_id,
                is_super_admin
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        )

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role_name,
                employee_id: user.employee_id
            }
        }
    }
}

export default authService
```

- [ ] **Step 3: Update auth-controller.js to use email**

Replace the entire contents of `src/controllers/auth-controller.js`:

```js
import authService from '../services/auth-service.js'

const authController = {
    login: async (req, res, next) => {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required.' })
            }

            const data = await authService.login(email, password)
            return res.status(200).json({ token: data.token, user: data.user })
        } catch (err) {
            return next(err)
        }
    }
}

export default authController
```

- [ ] **Step 4: Update auth-middleware.js to reflect new JWT field names**

Replace the decoded token field references in `src/middleware/auth-middleware.js`. The `verifyToken` function sets `req.user = decoded` — the decoded payload now has `user_id`, `employee_id`, `role_id`, `is_super_admin`. Remove the old `superAdminOnly` export (replaced by `requirePermission('config:manage')`).

Replace the entire file:

```js
import jwt from 'jsonwebtoken'

const sendError = (res, statusCode, message) => res.status(statusCode).json({ error: message })

const extractBearerToken = (authorizationHeader) => {
    if (typeof authorizationHeader !== 'string') {
        return { token: null, statusCode: 401 }
    }
    const [scheme, token] = authorizationHeader.split(' ')
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return { token: null, statusCode: 400 }
    }
    return { token, statusCode: null }
}

export const verifyToken = (req, res, next) => {
    const { token, statusCode } = extractBearerToken(req.headers.authorization)

    if (!token) {
        return sendError(
            res,
            statusCode,
            statusCode === 400
                ? 'Authorization header must use Bearer token format.'
                : 'Authentication token is required.'
        )
    }

    if (!process.env.JWT_SECRET) {
        return sendError(res, 500, 'Authentication service is not configured.')
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET)
        return next()
    } catch (error) {
        if (['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'].includes(error.name)) {
            return sendError(res, 401, 'Invalid or expired authentication token.')
        }
        return sendError(res, 500, 'Unable to authenticate the request.')
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/models/auth-model.js src/services/auth-service.js src/controllers/auth-controller.js src/middleware/auth-middleware.js
git commit -m "feat: fix auth to use email login and new JWT shape with role_id + is_super_admin"
```

---

## Task 5: Remove All Delete Operations

**Files:**
- Modify: `src/routes/employee-info-routes.js`
- Modify: `src/controllers/employee-info-controller.js`
- Modify: `src/services/employee-info-service.js`
- Modify: `src/models/employee-info-model.js`
- Modify: `src/routes/extra-employee-info-routes.js`
- Modify: `src/controllers/extra-employee-info-controller.js`
- Modify: `src/services/extra-employee-info-service.js`
- Modify: `src/models/extra-employee-info-model.js`
- Modify: `src/routes/job-info-routes.js`
- Modify: `src/controllers/job-info-controller.js`
- Modify: `src/services/job-info-service.js`
- Modify: `src/models/job-info-model.js`

- [ ] **Step 1: Remove delete from employee-info-model.js**

Open `src/models/employee-info-model.js`. Remove the `delete` method entirely. The model should have only: `create`, `read`, `readIds`, `update`, and the soon-to-be-added `search`.

- [ ] **Step 2: Remove delete from employee-info-service.js**

Open `src/services/employee-info-service.js`. Remove the `delete` line. File becomes:

```js
import employeeTable from '../models/employee-info-model.js'

const employeeService = {
    create: (data) => employeeTable.create(data),
    read: (id) => employeeTable.read(id),
    readIds: () => employeeTable.readIds(),
    update: (data) => employeeTable.update(data),
}

export default employeeService
```

- [ ] **Step 3: Remove delete from employee-info-controller.js**

Open `src/controllers/employee-info-controller.js`. Remove the `deleteEmployee` export entirely.

- [ ] **Step 4: Remove delete route from employee-info-routes.js**

Open `src/routes/employee-info-routes.js`. Remove the `router.delete(...)` line and the `deleteEmployee` import.

- [ ] **Step 5: Repeat for extra-employee-info**

Open each of these files and remove any `delete` method/export/route:
- `src/models/extra-employee-info-model.js` — remove `delete` method
- `src/services/extra-employee-info-service.js` — remove `delete` line
- `src/controllers/extra-employee-info-controller.js` — remove `deleteExtraEmployeeInfo` export
- `src/routes/extra-employee-info-routes.js` — remove `router.delete(...)` line

- [ ] **Step 6: Repeat for job-info**

Open each of these files and remove any `delete` method/export/route:
- `src/models/job-info-model.js` — remove `delete` method
- `src/services/job-info-service.js` — remove `delete` line
- `src/controllers/job-info-controller.js` — remove `deleteJobInfo` export
- `src/routes/job-info-routes.js` — remove `router.delete(...)` line

- [ ] **Step 7: Scan all remaining route files for delete routes**

```bash
grep -r "router.delete\|\.delete(" d:/Desktop/EMS/backend/src --include="*.js"
```

Expected: no output — no delete routes remain.

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "fix: remove all delete operations (hard rule — append/update only)"
```

---

## Task 6: Create Zod Schemas

**Files:**
- Create all files in `src/schemas/`
- Create: `tests/schemas/employee.schema.test.js`

- [ ] **Step 1: Create employee schema**

Create `src/schemas/employee.schema.js`:

```js
import { z } from 'zod'

export const createEmployeeSchema = z.object({
    employee_id: z.string().min(1).max(10),
    name: z.string().min(1).max(100),
    father_name: z.string().min(1).max(100),
    cnic: z.string().min(1).max(20),
    date_of_birth: z.string().min(1).max(15),
})

export const updateEmployeeSchema = z.object({
    employee_id: z.string().min(1).max(10).optional(),
    name: z.string().min(1).max(100).optional(),
    father_name: z.string().min(1).max(100).optional(),
    cnic: z.string().min(1).max(20).optional(),
    date_of_birth: z.string().min(1).max(15).optional(),
})
```

- [ ] **Step 2: Write and run schema tests**

Create `tests/schemas/employee.schema.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { createEmployeeSchema, updateEmployeeSchema } from '../../src/schemas/employee.schema.js'

describe('createEmployeeSchema', () => {
  it('passes with all required fields', () => {
    expect(createEmployeeSchema.safeParse({
      employee_id: 'EMP001',
      name: 'Ahmed Ali',
      father_name: 'Ali Khan',
      cnic: '12345-1234567-1',
      date_of_birth: '1990-01-01'
    }).success).toBe(true)
  })

  it('fails when name is missing', () => {
    expect(createEmployeeSchema.safeParse({
      employee_id: 'EMP001',
      father_name: 'Ali Khan',
      cnic: '12345-1234567-1',
      date_of_birth: '1990-01-01'
    }).success).toBe(false)
  })

  it('fails when employee_id exceeds 10 chars', () => {
    expect(createEmployeeSchema.safeParse({
      employee_id: 'EMP00100001',
      name: 'Ahmed Ali',
      father_name: 'Ali Khan',
      cnic: '12345-1234567-1',
      date_of_birth: '1990-01-01'
    }).success).toBe(false)
  })
})

describe('updateEmployeeSchema', () => {
  it('passes with partial data', () => {
    expect(updateEmployeeSchema.safeParse({ name: 'New Name' }).success).toBe(true)
  })

  it('passes with empty object (no fields required on update)', () => {
    expect(updateEmployeeSchema.safeParse({}).success).toBe(true)
  })
})
```

```bash
npm test tests/schemas/employee.schema.test.js
```

Expected: PASS — 4 tests pass.

- [ ] **Step 3: Create job-info schema**

Create `src/schemas/job-info.schema.js`:

```js
import { z } from 'zod'

export const createJobInfoSchema = z.object({
    employee_id: z.string().min(1).max(10),
    department_id: z.string().uuid(),
    designation_id: z.string().uuid(),
    employment_type_id: z.string().uuid(),
    job_status_id: z.string().uuid(),
    work_mode_id: z.string().uuid(),
    work_location_id: z.string().uuid(),
    shift_id: z.string().uuid(),
    date_of_joining: z.string().date(),
    date_of_exit: z.string().date().optional().nullable(),
})

export const updateJobInfoSchema = createJobInfoSchema.partial()
```

- [ ] **Step 4: Create extra-employee-info schema**

Create `src/schemas/extra-employee-info.schema.js`:

```js
import { z } from 'zod'

export const createExtraEmployeeInfoSchema = z.object({
    employee_id: z.string().min(1).max(10),
    contact_1: z.string().min(1).max(15),
    contact_2: z.string().max(15).optional().nullable(),
    emergence_contact_1: z.string().max(15).optional().nullable(),
    emergence_contact_2: z.string().max(15).optional().nullable(),
    bank_name: z.string().max(100).optional().nullable(),
    bank_acc_num: z.string().max(15).optional().nullable(),
    perment_address: z.string().max(255).optional().nullable(),
    postal_address: z.string().max(255).optional().nullable(),
})

export const updateExtraEmployeeInfoSchema = createExtraEmployeeInfoSchema.partial()
```

- [ ] **Step 5: Create config table schemas**

Create `src/schemas/department.schema.js`:

```js
import { z } from 'zod'

export const createDepartmentSchema = z.object({
    department_code: z.string().min(1),
    department_name: z.string().min(1),
    parent_department_id: z.string().uuid().optional().nullable(),
})

export const updateDepartmentSchema = createDepartmentSchema.partial()
```

Create `src/schemas/designation.schema.js`:

```js
import { z } from 'zod'

export const createDesignationSchema = z.object({
    title: z.string().min(1).max(50),
    is_active: z.boolean().optional().default(true),
})

export const updateDesignationSchema = createDesignationSchema.partial()
```

Create `src/schemas/employment-type.schema.js`:

```js
import { z } from 'zod'

export const createEmploymentTypeSchema = z.object({
    type_name: z.string().min(1).max(50),
    is_active: z.boolean().optional().default(true),
})

export const updateEmploymentTypeSchema = createEmploymentTypeSchema.partial()
```

Create `src/schemas/job-status.schema.js`:

```js
import { z } from 'zod'

export const createJobStatusSchema = z.object({
    status_name: z.string().min(1).max(50),
    is_active: z.boolean().optional().default(true),
})

export const updateJobStatusSchema = createJobStatusSchema.partial()
```

Create `src/schemas/work-mode.schema.js`:

```js
import { z } from 'zod'

export const createWorkModeSchema = z.object({
    mode_name: z.string().min(1).max(50),
    is_active: z.boolean().optional().default(true),
})

export const updateWorkModeSchema = createWorkModeSchema.partial()
```

Create `src/schemas/work-location.schema.js`:

```js
import { z } from 'zod'

export const createWorkLocationSchema = z.object({
    location_name: z.string().min(1).max(100),
    is_active: z.boolean().optional().default(true),
})

export const updateWorkLocationSchema = createWorkLocationSchema.partial()
```

Create `src/schemas/shift.schema.js`:

```js
import { z } from 'zod'

const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/

export const createShiftSchema = z.object({
    name: z.string().min(1).max(100),
    start_time: z.string().regex(timeRegex, 'Must be HH:MM or HH:MM:SS'),
    end_time: z.string().regex(timeRegex, 'Must be HH:MM or HH:MM:SS'),
    late_after_minutes: z.number().int().min(0).optional().default(15),
    is_active: z.boolean().optional().default(true),
})

export const updateShiftSchema = createShiftSchema.partial()
```

Create `src/schemas/leave-type.schema.js`:

```js
import { z } from 'zod'

export const createLeaveTypeSchema = z.object({
    name: z.string().min(1).max(50),
    is_active: z.boolean().optional().default(true),
})

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial()
```

Create `src/schemas/leave-policy.schema.js`:

```js
import { z } from 'zod'

export const createLeavePolicySchema = z.object({
    department_id: z.string().uuid(),
    leave_type_id: z.string().uuid(),
    days_allowed: z.number().int().min(0),
    year: z.number().int().min(2020).max(2100),
    is_active: z.boolean().optional().default(true),
})

export const updateLeavePolicySchema = createLeavePolicySchema.partial()
```

Create `src/schemas/leave-balance.schema.js`:

```js
import { z } from 'zod'

export const createLeaveBalanceSchema = z.object({
    employee_id: z.string().min(1).max(10),
    leave_type_id: z.string().uuid(),
    year: z.number().int().min(2020).max(2100),
    balance: z.number().int().min(0).optional().default(0),
    used: z.number().int().min(0).optional().default(0),
})

export const updateLeaveBalanceSchema = createLeaveBalanceSchema.partial()
```

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: PASS — all schema + middleware tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/schemas/ tests/schemas/
git commit -m "feat: add Zod schemas for all resources"
```

---

## Task 7: Wire Validate + Permissions to Employee Routes + Fix Search

**Files:**
- Modify: `src/models/employee-info-model.js`
- Modify: `src/services/employee-info-service.js`
- Modify: `src/controllers/employee-info-controller.js`
- Modify: `src/routes/employee-info-routes.js`

- [ ] **Step 1: Add search to employee-info-model.js**

Open `src/models/employee-info-model.js`. Add a `search` method and fix `read` to use a dedicated handler for single vs list. Replace the entire file:

```js
import pool from '../config/db.js'

const employeeTable = {
    create: async (data) => {
        const { employee_id, name, father_name, cnic, date_of_birth } = data
        const res = await pool.query(
            `INSERT INTO employee_info (employee_id, name, father_name, cnic, date_of_birth)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [employee_id, name, father_name, cnic, date_of_birth]
        )
        return res.rows[0]
    },

    readAll: async () => {
        const res = await pool.query('SELECT * FROM employee_info ORDER BY employee_id ASC')
        return res.rows
    },

    readById: async (id) => {
        const res = await pool.query('SELECT * FROM employee_info WHERE id = $1', [id])
        return res.rows[0]
    },

    readIds: async () => {
        const res = await pool.query('SELECT employee_id FROM employee_info ORDER BY employee_id ASC')
        return res.rows
    },

    search: async (term) => {
        const res = await pool.query(
            `SELECT * FROM employee_info
             WHERE name ILIKE $1 OR employee_id ILIKE $1
             ORDER BY employee_id ASC`,
            [`%${term}%`]
        )
        return res.rows
    },

    update: async (data) => {
        const { id, employee_id, name, father_name, cnic, date_of_birth } = data
        const res = await pool.query(
            `UPDATE employee_info
             SET employee_id = $2, name = $3, father_name = $4, cnic = $5,
                 date_of_birth = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 RETURNING *`,
            [id, employee_id, name, father_name, cnic, date_of_birth]
        )
        return res.rows[0]
    },
}

export default employeeTable
```

- [ ] **Step 2: Update employee-info-service.js**

Replace the entire file:

```js
import employeeTable from '../models/employee-info-model.js'

const employeeService = {
    create: (data) => employeeTable.create(data),
    readAll: () => employeeTable.readAll(),
    readById: (id) => employeeTable.readById(id),
    readIds: () => employeeTable.readIds(),
    search: (term) => employeeTable.search(term),
    update: (data) => employeeTable.update(data),
}

export default employeeService
```

- [ ] **Step 3: Update employee-info-controller.js with separate handlers**

Replace the entire file:

```js
import employeeService from '../services/employee-info-service.js'

export const createEmployee = async (req, res, next) => {
    try {
        const employee = await employeeService.create(req.body)
        return res.status(201).json(employee)
    } catch (err) {
        return next(err)
    }
}

export const getEmployees = async (req, res, next) => {
    try {
        const { search } = req.query
        const data = search
            ? await employeeService.search(search)
            : await employeeService.readAll()
        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}

export const getEmployeeById = async (req, res, next) => {
    try {
        const employee = await employeeService.readById(req.params.id)
        if (!employee) return res.status(404).json({ error: 'Employee not found.' })
        return res.status(200).json(employee)
    } catch (err) {
        return next(err)
    }
}

export const getEmployeesId = async (req, res, next) => {
    try {
        const data = await employeeService.readIds()
        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}

export const updateEmployee = async (req, res, next) => {
    try {
        const employee = await employeeService.update({ id: req.params.id, ...req.body })
        if (!employee) return res.status(404).json({ error: 'Employee not found.' })
        return res.status(200).json(employee)
    } catch (err) {
        return next(err)
    }
}
```

- [ ] **Step 4: Update employee-info-routes.js**

Replace the entire file:

```js
import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createEmployeeSchema, updateEmployeeSchema } from '../schemas/employee.schema.js'
import {
    createEmployee,
    getEmployees,
    getEmployeeById,
    getEmployeesId,
    updateEmployee,
} from '../controllers/employee-info-controller.js'

const router = Router()

router.get('/employees', verifyToken, requirePermission('employees:read'), getEmployees)
router.get('/employees/ids', verifyToken, requirePermission('employees:read'), getEmployeesId)
router.get('/employees/:id', verifyToken, requirePermission('employees:read'), getEmployeeById)
router.post('/employees', verifyToken, requirePermission('employees:write'), validate(createEmployeeSchema), createEmployee)
router.put('/employees/:id', verifyToken, requirePermission('employees:write'), validate(updateEmployeeSchema), updateEmployee)

export default router
```

- [ ] **Step 5: Commit**

```bash
git add src/models/employee-info-model.js src/services/employee-info-service.js src/controllers/employee-info-controller.js src/routes/employee-info-routes.js
git commit -m "feat: wire validate + permissions to employee routes, add search, fix route conflict"
```

---

## Task 8: Wire Validate + Permissions to Config Routes

**Files:**
- Modify: all 9 config route files

- [ ] **Step 1: Update department-routes.js**

Open `src/routes/department-routes.js`. Add imports at top and add middleware to write routes. GETs stay open (any authenticated user). Pattern to follow for all config routes:

```js
import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createDepartmentSchema, updateDepartmentSchema } from '../schemas/department.schema.js'
import { createDepartment, getDepartments, getDepartmentById, updateDepartment } from '../controllers/department-controller.js'

const router = Router()

router.get('/departments', verifyToken, getDepartments)
router.get('/departments/:id', verifyToken, getDepartmentById)
router.post('/departments', verifyToken, requirePermission('config:manage'), validate(createDepartmentSchema), createDepartment)
router.put('/departments/:id', verifyToken, requirePermission('config:manage'), validate(updateDepartmentSchema), updateDepartment)

export default router
```

(Adjust controller import names to match what exists in each controller file.)

- [ ] **Step 2: Apply same pattern to all remaining config route files**

Repeat the exact same pattern for:
- `src/routes/designation-routes.js` — schema: `designation.schema.js`
- `src/routes/employment-type-routes.js` — schema: `employment-type.schema.js`
- `src/routes/job-status-routes.js` — schema: `job-status.schema.js`
- `src/routes/work-mode-routes.js` — schema: `work-mode.schema.js`
- `src/routes/work-location-routes.js` — schema: `work-location.schema.js`
- `src/routes/shift-routes.js` — schema: `shift.schema.js`
- `src/routes/leave-type-routes.js` — schema: `leave-type.schema.js`
- `src/routes/leave-policy-routes.js` — schema: `leave-policy.schema.js`

For each file: GET routes get `verifyToken` only. POST/PUT routes get `verifyToken, requirePermission('config:manage'), validate(schema)`.

- [ ] **Step 3: Update leave-balance-routes.js**

`leave_balances` is HR-managed (not super_admin config). Use `employees:write` for writes:

```js
import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createLeaveBalanceSchema, updateLeaveBalanceSchema } from '../schemas/leave-balance.schema.js'
import { createLeaveBalance, getLeaveBalances, updateLeaveBalance } from '../controllers/leave-balance-controller.js'

const router = Router()

router.get('/', verifyToken, requirePermission('leave:read'), getLeaveBalances)
router.post('/', verifyToken, requirePermission('employees:write'), validate(createLeaveBalanceSchema), createLeaveBalance)
router.put('/:id', verifyToken, requirePermission('employees:write'), validate(updateLeaveBalanceSchema), updateLeaveBalance)

export default router
```

- [ ] **Step 4: Wire extra-employee-info and job-info routes**

Apply the same pattern to:
- `src/routes/extra-employee-info-routes.js` — permission: `employees:write`
- `src/routes/job-info-routes.js` — permission: `employees:write`

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: PASS — all tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/routes/
git commit -m "feat: wire permissions and Zod validation to all existing routes"
```

---

## Task 9: Seed Super Admin Role

The `roles` table needs a super_admin row with `department_id = NULL` for the auth system to work.

**Files:**
- Modify: `seeds/dev_seed.js`

- [ ] **Step 1: Check current seed file**

Open `seeds/dev_seed.js` and read what it seeds. Add the super_admin role insert if not present.

- [ ] **Step 2: Add super_admin role seed**

In the seed script, ensure this SQL runs:

```js
await pool.query(`
    INSERT INTO roles (role_name, department_id, description)
    VALUES ('super_admin', NULL, 'Global super administrator')
    ON CONFLICT DO NOTHING
`)
```

Also seed a super_admin user for testing:

```js
const hashedPassword = await bcrypt.hash('password123', 10)
const roleRes = await pool.query(`SELECT id FROM roles WHERE role_name = 'super_admin' AND department_id IS NULL`)
await pool.query(`
    INSERT INTO users (employee_id, email, password, role_id)
    VALUES ('EMP000', 'admin@ems.com', $1, $2)
    ON CONFLICT (email) DO NOTHING
`, [hashedPassword, roleRes.rows[0].id])
```

- [ ] **Step 3: Run seed**

```bash
npm run db:seed
```

Expected: seed completes without error.

- [ ] **Step 4: Test login manually**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ems.com","password":"password123"}'
```

Expected: `{ "token": "...", "user": { "email": "admin@ems.com", "role": "super_admin" } }`

- [ ] **Step 5: Commit**

```bash
git add seeds/dev_seed.js
git commit -m "chore: seed super_admin role and test user"
```

---

## Phase 1 Complete

Run the full test suite one final time:

```bash
npm test
```

Expected: all tests pass. The server is now:
- Delete-free across all routes
- Zod-validated on all write endpoints
- Permission-protected by role
- Using a correct JWT with `user_id`, `employee_id`, `role_id`, `is_super_admin`
