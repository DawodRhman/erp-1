# Phase 3 — Leave Requests Module

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Leave Requests API — create, approve, reject, early return (with balance restore), plus balances view and calendar view.

**Architecture:** Business logic (overlap check, balance check) lives in the service layer. DB mutations that touch two tables (approve → deduct balance, early-return → restore balance) run inside transactions in the model layer. Every distinct failure case returns its own HTTP status code. All writes require `leave:write`, approvals require `leave:approve`, reads require `leave:read`.

**Tech Stack:** Node.js ESM, Express 5, PostgreSQL (`pg`), Zod, Vitest

**Prerequisite:** Phase 1 must be complete — validate middleware, permission middleware, and Zod are required.

---

## File Map

**Create:**
- `src/schemas/leave-request.schema.js`
- `src/models/leave-request-model.js`
- `src/services/leave-request-service.js`
- `src/controllers/leave-request-controller.js`
- `src/routes/leave-request-routes.js`
- `tests/schemas/leave-request.schema.test.js`

**Modify:**
- `server.js` — register leave-request routes

---

## Task 1: Leave Request Schema + Tests

**Files:**
- Create: `src/schemas/leave-request.schema.js`
- Create: `tests/schemas/leave-request.schema.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/schemas/leave-request.schema.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { createLeaveRequestSchema, earlyReturnSchema } from '../../src/schemas/leave-request.schema.js'

describe('createLeaveRequestSchema', () => {
  it('passes with valid data', () => {
    expect(createLeaveRequestSchema.safeParse({
      employee_id: 'EMP001',
      leave_type_id: '123e4567-e89b-12d3-a456-426614174000',
      start_date: '2026-05-01',
      end_date: '2026-05-05',
      reason: 'Family vacation'
    }).success).toBe(true)
  })

  it('fails when employee_id is missing', () => {
    expect(createLeaveRequestSchema.safeParse({
      leave_type_id: '123e4567-e89b-12d3-a456-426614174000',
      start_date: '2026-05-01',
      end_date: '2026-05-05'
    }).success).toBe(false)
  })

  it('fails when leave_type_id is not a UUID', () => {
    expect(createLeaveRequestSchema.safeParse({
      employee_id: 'EMP001',
      leave_type_id: 'not-a-uuid',
      start_date: '2026-05-01',
      end_date: '2026-05-05'
    }).success).toBe(false)
  })

  it('fails when date format is invalid', () => {
    expect(createLeaveRequestSchema.safeParse({
      employee_id: 'EMP001',
      leave_type_id: '123e4567-e89b-12d3-a456-426614174000',
      start_date: '01-05-2026',
      end_date: '05-05-2026'
    }).success).toBe(false)
  })

  it('passes without reason (optional)', () => {
    expect(createLeaveRequestSchema.safeParse({
      employee_id: 'EMP001',
      leave_type_id: '123e4567-e89b-12d3-a456-426614174000',
      start_date: '2026-05-01',
      end_date: '2026-05-05'
    }).success).toBe(true)
  })
})

describe('earlyReturnSchema', () => {
  it('passes with valid date', () => {
    expect(earlyReturnSchema.safeParse({ end_by_force: '2026-05-03' }).success).toBe(true)
  })

  it('fails when end_by_force is missing', () => {
    expect(earlyReturnSchema.safeParse({}).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test tests/schemas/leave-request.schema.test.js
```

Expected: FAIL — `Cannot find module '../../src/schemas/leave-request.schema.js'`

- [ ] **Step 3: Implement leave request schema**

Create `src/schemas/leave-request.schema.js`:

```js
import { z } from 'zod'

export const createLeaveRequestSchema = z.object({
    employee_id: z.string().min(1).max(10),
    leave_type_id: z.string().uuid(),
    start_date: z.string().date(),
    end_date: z.string().date(),
    reason: z.string().optional().nullable(),
})

export const earlyReturnSchema = z.object({
    end_by_force: z.string().date(),
})
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test tests/schemas/leave-request.schema.test.js
```

Expected: PASS — 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/leave-request.schema.js tests/schemas/leave-request.schema.test.js
git commit -m "feat: add leave request Zod schemas"
```

---

## Task 2: Leave Request Model

**Files:**
- Create: `src/models/leave-request-model.js`

- [ ] **Step 1: Create the model**

Create `src/models/leave-request-model.js`:

```js
import pool from '../config/db.js'

const leaveRequestModel = {
    getAll: async ({ status, employee_id, department_id }) => {
        const conditions = ['1=1']
        const params = []
        let idx = 1

        if (status) { conditions.push(`lr.status = $${idx++}`); params.push(status) }
        if (employee_id) { conditions.push(`lr.employee_id = $${idx++}`); params.push(employee_id) }
        if (department_id) { conditions.push(`ji.department_id = $${idx++}`); params.push(department_id) }

        const res = await pool.query(`
            SELECT
                lr.*,
                ei.name AS employee_name,
                lt.name AS leave_type_name,
                d.department_name,
                (lr.end_date - lr.start_date + 1) AS days
            FROM leave_requests lr
            JOIN employee_info ei ON ei.employee_id = lr.employee_id
            JOIN leave_types lt ON lt.id = lr.leave_type_id
            JOIN job_info ji ON ji.employee_id = lr.employee_id
            JOIN departments d ON d.id = ji.department_id
            WHERE ${conditions.join(' AND ')}
            ORDER BY lr.created_at DESC
        `, params)

        return res.rows
    },

    create: async ({ employee_id, leave_type_id, start_date, end_date, reason }) => {
        const res = await pool.query(`
            INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, reason)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [employee_id, leave_type_id, start_date, end_date, reason ?? null])
        return res.rows[0]
    },

    findById: async (id) => {
        const res = await pool.query(
            `SELECT * FROM leave_requests WHERE id = $1`,
            [id]
        )
        return res.rows[0]
    },

    checkOverlap: async ({ employee_id, start_date, end_date }) => {
        const res = await pool.query(`
            SELECT id FROM leave_requests
            WHERE employee_id = $1
              AND status IN ('pending', 'approved')
              AND NOT (end_date < $2 OR start_date > $3)
        `, [employee_id, start_date, end_date])
        return res.rows.length > 0
    },

    approve: async ({ id, reviewed_by }) => {
        const client = await pool.connect()
        try {
            await client.query('BEGIN')

            const lr = await client.query(
                `SELECT * FROM leave_requests WHERE id = $1 AND status = 'pending'`,
                [id]
            )
            if (!lr.rows[0]) {
                await client.query('ROLLBACK')
                return null
            }

            const request = lr.rows[0]
            const days = Math.round(
                (new Date(request.end_date) - new Date(request.start_date)) / 86400000
            ) + 1

            await client.query(`
                UPDATE leave_requests
                SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
                WHERE id = $1
            `, [id, reviewed_by])

            await client.query(`
                UPDATE leave_balances
                SET used = used + $3, balance = balance - $3, updated_at = NOW()
                WHERE employee_id = $1
                  AND leave_type_id = $2
                  AND year = EXTRACT(YEAR FROM $4::date)
            `, [request.employee_id, request.leave_type_id, days, request.start_date])

            await client.query('COMMIT')
            return { ...request, status: 'approved' }
        } catch (err) {
            await client.query('ROLLBACK')
            throw err
        } finally {
            client.release()
        }
    },

    reject: async ({ id, reviewed_by }) => {
        const res = await pool.query(`
            UPDATE leave_requests
            SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
            WHERE id = $1 AND status = 'pending'
            RETURNING *
        `, [id, reviewed_by])
        return res.rows[0] ?? null
    },

    earlyReturn: async ({ id, end_by_force }) => {
        const client = await pool.connect()
        try {
            await client.query('BEGIN')

            const lr = await client.query(
                `SELECT * FROM leave_requests WHERE id = $1 AND status = 'approved'`,
                [id]
            )
            if (!lr.rows[0]) {
                await client.query('ROLLBACK')
                return null
            }

            const request = lr.rows[0]
            const originalDays = Math.round(
                (new Date(request.end_date) - new Date(request.start_date)) / 86400000
            ) + 1
            const actualDays = Math.max(
                1,
                Math.round((new Date(end_by_force) - new Date(request.start_date)) / 86400000) + 1
            )
            const daysToRestore = originalDays - actualDays

            await client.query(`
                UPDATE leave_requests
                SET end_by_force = $2, updated_at = NOW()
                WHERE id = $1
            `, [id, end_by_force])

            if (daysToRestore > 0) {
                await client.query(`
                    UPDATE leave_balances
                    SET used = used - $3, balance = balance + $3, updated_at = NOW()
                    WHERE employee_id = $1
                      AND leave_type_id = $2
                      AND year = EXTRACT(YEAR FROM $4::date)
                `, [request.employee_id, request.leave_type_id, daysToRestore, request.start_date])
            }

            await client.query('COMMIT')
            return { ...request, end_by_force, days_restored: daysToRestore }
        } catch (err) {
            await client.query('ROLLBACK')
            throw err
        } finally {
            client.release()
        }
    },

    getBalances: async ({ department_id, work_location_id, shift_id }) => {
        const conditions = ['1=1']
        const params = []
        let idx = 1

        if (department_id) { conditions.push(`ji.department_id = $${idx++}`); params.push(department_id) }
        if (work_location_id) { conditions.push(`ji.work_location_id = $${idx++}`); params.push(work_location_id) }
        if (shift_id) { conditions.push(`ji.shift_id = $${idx++}`); params.push(shift_id) }

        const res = await pool.query(`
            SELECT
                ei.employee_id,
                ei.name,
                d.department_name,
                json_agg(
                    json_build_object(
                        'leave_type', lt.name,
                        'balance', lb.balance,
                        'total', lb.balance + lb.used
                    ) ORDER BY lt.name
                ) AS balances
            FROM employee_info ei
            JOIN job_info ji USING (employee_id)
            JOIN departments d ON d.id = ji.department_id
            JOIN leave_balances lb ON lb.employee_id = ei.employee_id
            JOIN leave_types lt ON lt.id = lb.leave_type_id
            WHERE ${conditions.join(' AND ')}
            GROUP BY ei.employee_id, ei.name, d.department_name
            ORDER BY ei.employee_id ASC
        `, params)

        return res.rows
    },

    getCalendar: async ({ department_id, month, year }) => {
        const conditions = [`lr.status = 'approved'`]
        const params = []
        let idx = 1

        if (department_id) {
            conditions.push(`ji.department_id = $${idx++}`)
            params.push(department_id)
        }
        if (month) {
            conditions.push(`EXTRACT(MONTH FROM lr.start_date) = $${idx++}`)
            params.push(parseInt(month))
        }
        if (year) {
            conditions.push(`EXTRACT(YEAR FROM lr.start_date) = $${idx++}`)
            params.push(parseInt(year))
        }

        const res = await pool.query(`
            SELECT
                lr.id,
                lr.employee_id,
                ei.name AS employee_name,
                lt.name AS leave_type,
                lr.start_date,
                lr.end_date,
                lr.end_by_force
            FROM leave_requests lr
            JOIN employee_info ei ON ei.employee_id = lr.employee_id
            JOIN leave_types lt ON lt.id = lr.leave_type_id
            JOIN job_info ji ON ji.employee_id = lr.employee_id
            WHERE ${conditions.join(' AND ')}
            ORDER BY lr.start_date ASC
        `, params)

        return res.rows
    }
}

export default leaveRequestModel
```

- [ ] **Step 2: Commit**

```bash
git add src/models/leave-request-model.js
git commit -m "feat: leave request model with create, approve, reject, early-return, balances, calendar"
```

---

## Task 3: Leave Request Service

**Files:**
- Create: `src/services/leave-request-service.js`

- [ ] **Step 1: Create the service**

The service owns all business logic checks (employee exists, leave type exists, balance check, overlap check). The model owns transactions.

Create `src/services/leave-request-service.js`:

```js
import pool from '../config/db.js'
import leaveRequestModel from '../models/leave-request-model.js'

const leaveRequestService = {
    getAll: (filters) => leaveRequestModel.getAll(filters),

    create: async ({ employee_id, leave_type_id, start_date, end_date, reason }) => {
        const emp = await pool.query(
            'SELECT id FROM employee_info WHERE employee_id = $1',
            [employee_id]
        )
        if (!emp.rows[0]) {
            const err = new Error('Employee not found.')
            err.status = 404
            throw err
        }

        const lt = await pool.query(
            'SELECT id FROM leave_types WHERE id = $1',
            [leave_type_id]
        )
        if (!lt.rows[0]) {
            const err = new Error('Leave type not found.')
            err.status = 404
            throw err
        }

        const days = Math.round(
            (new Date(end_date) - new Date(start_date)) / 86400000
        ) + 1
        const year = new Date(start_date).getFullYear()

        const bal = await pool.query(
            `SELECT balance FROM leave_balances
             WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3`,
            [employee_id, leave_type_id, year]
        )
        if (!bal.rows[0] || bal.rows[0].balance < days) {
            const err = new Error('Insufficient leave balance.')
            err.status = 409
            throw err
        }

        const hasOverlap = await leaveRequestModel.checkOverlap({ employee_id, start_date, end_date })
        if (hasOverlap) {
            const err = new Error('Overlapping leave request already exists.')
            err.status = 409
            throw err
        }

        return leaveRequestModel.create({ employee_id, leave_type_id, start_date, end_date, reason })
    },

    approve: async ({ id, reviewed_by }) => {
        const result = await leaveRequestModel.approve({ id, reviewed_by })
        if (!result) {
            const err = new Error('Leave request not found or not in pending status.')
            err.status = 409
            throw err
        }
        return result
    },

    reject: async ({ id, reviewed_by }) => {
        const result = await leaveRequestModel.reject({ id, reviewed_by })
        if (!result) {
            const err = new Error('Leave request not found or not in pending status.')
            err.status = 409
            throw err
        }
        return result
    },

    earlyReturn: async ({ id, end_by_force }) => {
        const result = await leaveRequestModel.earlyReturn({ id, end_by_force })
        if (!result) {
            const err = new Error('Leave request not found or not in approved status.')
            err.status = 409
            throw err
        }
        return result
    },

    getBalances: (filters) => leaveRequestModel.getBalances(filters),

    getCalendar: (filters) => leaveRequestModel.getCalendar(filters),
}

export default leaveRequestService
```

- [ ] **Step 2: Commit**

```bash
git add src/services/leave-request-service.js
git commit -m "feat: leave request service with business logic checks"
```

---

## Task 4: Leave Request Controller + Routes

**Files:**
- Create: `src/controllers/leave-request-controller.js`
- Create: `src/routes/leave-request-routes.js`

- [ ] **Step 1: Create the controller**

Create `src/controllers/leave-request-controller.js`:

```js
import leaveRequestService from '../services/leave-request-service.js'

export const getLeaveRequests = async (req, res, next) => {
    try {
        const { status, employee, department } = req.query
        const data = await leaveRequestService.getAll({
            status: status || null,
            employee_id: employee || null,
            department_id: department || null,
        })
        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}

export const createLeaveRequest = async (req, res, next) => {
    try {
        const request = await leaveRequestService.create(req.body)
        return res.status(201).json(request)
    } catch (err) {
        return next(err)
    }
}

export const approveLeaveRequest = async (req, res, next) => {
    try {
        const result = await leaveRequestService.approve({
            id: req.params.id,
            reviewed_by: req.user.user_id,
        })
        return res.status(200).json(result)
    } catch (err) {
        return next(err)
    }
}

export const rejectLeaveRequest = async (req, res, next) => {
    try {
        const result = await leaveRequestService.reject({
            id: req.params.id,
            reviewed_by: req.user.user_id,
        })
        return res.status(200).json(result)
    } catch (err) {
        return next(err)
    }
}

export const earlyReturnLeaveRequest = async (req, res, next) => {
    try {
        const result = await leaveRequestService.earlyReturn({
            id: req.params.id,
            end_by_force: req.body.end_by_force,
        })
        return res.status(200).json(result)
    } catch (err) {
        return next(err)
    }
}

export const getLeaveBalances = async (req, res, next) => {
    try {
        const { department, location, shift } = req.query
        const data = await leaveRequestService.getBalances({
            department_id: department || null,
            work_location_id: location || null,
            shift_id: shift || null,
        })
        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}

export const getLeaveCalendar = async (req, res, next) => {
    try {
        const { department, month, year } = req.query
        const data = await leaveRequestService.getCalendar({
            department_id: department || null,
            month: month || null,
            year: year || null,
        })
        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}
```

- [ ] **Step 2: Create the routes**

Create `src/routes/leave-request-routes.js`:

```js
import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { createLeaveRequestSchema, earlyReturnSchema } from '../schemas/leave-request.schema.js'
import {
    getLeaveRequests,
    createLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    earlyReturnLeaveRequest,
    getLeaveBalances,
    getLeaveCalendar,
} from '../controllers/leave-request-controller.js'

const router = Router()

router.get('/', verifyToken, requirePermission('leave:read'), getLeaveRequests)
router.get('/balances', verifyToken, requirePermission('leave:read'), getLeaveBalances)
router.get('/calendar', verifyToken, requirePermission('leave:read'), getLeaveCalendar)
router.post('/', verifyToken, requirePermission('leave:write'), validate(createLeaveRequestSchema), createLeaveRequest)
router.patch('/:id/approve', verifyToken, requirePermission('leave:approve'), approveLeaveRequest)
router.patch('/:id/reject', verifyToken, requirePermission('leave:approve'), rejectLeaveRequest)
router.patch('/:id/early-return', verifyToken, requirePermission('leave:approve'), validate(earlyReturnSchema), earlyReturnLeaveRequest)

export default router
```

- [ ] **Step 3: Commit**

```bash
git add src/controllers/leave-request-controller.js src/routes/leave-request-routes.js
git commit -m "feat: leave request controller and routes"
```

---

## Task 5: Register Routes + End-to-End Manual Tests

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Register leave request routes in server.js**

Open `server.js`. Add the import:

```js
import leaveRequestRoutes from './src/routes/leave-request-routes.js'
```

Add the registration:

```js
app.use('/api/leave-requests', leaveRequestRoutes)
```

- [ ] **Step 2: Update the global error handler to use err.status**

The service throws errors with a `status` property. Open `server.js`. Replace the error handler:

```js
app.use((err, req, res, next) => {
    const status = err.status || 500
    const message = err.message || 'Internal Server Error'
    res.status(status).json({ error: message })
})
```

- [ ] **Step 3: Start server and test create leave request**

```bash
npm start
```

```bash
curl -X POST http://localhost:3000/api/leave-requests \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP001",
    "leave_type_id": "YOUR-LEAVE-TYPE-UUID",
    "start_date": "2026-05-01",
    "end_date": "2026-05-05",
    "reason": "Family vacation"
  }'
```

Expected: `201` with the created leave request row.

- [ ] **Step 4: Test validation — insufficient balance**

Use an employee with 0 balance or request more days than available:

```bash
curl -X POST http://localhost:3000/api/leave-requests \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP001",
    "leave_type_id": "YOUR-LEAVE-TYPE-UUID",
    "start_date": "2026-06-01",
    "end_date": "2026-06-30"
  }'
```

Expected: `409` with `{ "error": "Insufficient leave balance." }`

- [ ] **Step 5: Test approve**

```bash
curl -X PATCH http://localhost:3000/api/leave-requests/LEAVE-REQUEST-UUID/approve \
  -H "Authorization: Bearer TOKEN"
```

Expected: `200` with the updated request.

- [ ] **Step 6: Test early return**

```bash
curl -X PATCH http://localhost:3000/api/leave-requests/LEAVE-REQUEST-UUID/early-return \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"end_by_force": "2026-05-03"}'
```

Expected: `200` with `days_restored` field showing how many days were returned to balance.

- [ ] **Step 7: Test balances view**

```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/leave-requests/balances"
```

Expected: array of employees with `balances` array showing each leave type's remaining/total.

- [ ] **Step 8: Test calendar view**

```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/leave-requests/calendar?month=5&year=2026"
```

Expected: array of approved leaves for May 2026.

- [ ] **Step 9: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add server.js
git commit -m "feat: register leave request routes, update error handler — Phase 3 complete"
```

---

## Phase 3 Complete

The leave requests module is now fully operational:
- `GET /api/leave-requests` — list with optional status/employee/department filters
- `POST /api/leave-requests` — create with balance check + overlap check (404/409 on business rule violations)
- `PATCH /api/leave-requests/:id/approve` — approve + deduct balance in one transaction
- `PATCH /api/leave-requests/:id/reject` — reject (no balance change)
- `PATCH /api/leave-requests/:id/early-return` — set end_by_force + restore unused days to balance
- `GET /api/leave-requests/balances` — all employees' balances by leave type with filters
- `GET /api/leave-requests/calendar` — approved leaves for calendar view with department/month/year filters
