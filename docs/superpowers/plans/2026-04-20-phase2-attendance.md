# Phase 2 — Attendance Module

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Attendance API — daily sheet with filters, batched save, and monthly roll-up report.

**Architecture:** Three endpoints. Daily sheet JOINs employee_info + job_info + shifts + attendance with a LEFT JOIN so employees with no attendance record still appear. Batch save runs an upsert inside a single transaction. Monthly report uses conditional COUNT aggregates. All writes require `attendance:write`, all reads require `attendance:read`.

**Tech Stack:** Node.js ESM, Express 5, PostgreSQL (`pg`), Zod, Vitest

**Prerequisite:** Phase 1 must be complete — validate middleware, permission middleware, and Zod are required.

---

## File Map

**Create:**
- `src/schemas/attendance.schema.js`
- `src/models/attendance-model.js`
- `src/services/attendance-service.js`
- `src/controllers/attendance-controller.js`
- `src/routes/attendance-routes.js`
- `tests/schemas/attendance.schema.test.js`

**Modify:**
- `server.js` — register attendance routes

---

## Task 1: Attendance Schema + Tests

**Files:**
- Create: `src/schemas/attendance.schema.js`
- Create: `tests/schemas/attendance.schema.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/schemas/attendance.schema.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { batchAttendanceSchema } from '../../src/schemas/attendance.schema.js'

const validRow = {
  employee_id: 'EMP001',
  shift_id: '123e4567-e89b-12d3-a456-426614174000',
  status: 'present',
  check_in: '09:00',
  check_out: '17:00',
  notes: null,
  ack: false
}

describe('batchAttendanceSchema', () => {
  it('passes with valid batch', () => {
    expect(batchAttendanceSchema.safeParse({
      date: '2026-04-20',
      rows: [validRow]
    }).success).toBe(true)
  })

  it('fails with empty rows array', () => {
    expect(batchAttendanceSchema.safeParse({
      date: '2026-04-20',
      rows: []
    }).success).toBe(false)
  })

  it('fails with invalid status', () => {
    expect(batchAttendanceSchema.safeParse({
      date: '2026-04-20',
      rows: [{ ...validRow, status: 'sleeping' }]
    }).success).toBe(false)
  })

  it('fails with invalid date format', () => {
    expect(batchAttendanceSchema.safeParse({
      date: '20-04-2026',
      rows: [validRow]
    }).success).toBe(false)
  })

  it('fails with invalid time format in check_in', () => {
    expect(batchAttendanceSchema.safeParse({
      date: '2026-04-20',
      rows: [{ ...validRow, check_in: '9:00am' }]
    }).success).toBe(false)
  })

  it('allows null check_in and check_out for absent status', () => {
    expect(batchAttendanceSchema.safeParse({
      date: '2026-04-20',
      rows: [{ ...validRow, status: 'absent', check_in: null, check_out: null }]
    }).success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test tests/schemas/attendance.schema.test.js
```

Expected: FAIL — `Cannot find module '../../src/schemas/attendance.schema.js'`

- [ ] **Step 3: Implement attendance schema**

Create `src/schemas/attendance.schema.js`:

```js
import { z } from 'zod'

const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/

const attendanceRowSchema = z.object({
    employee_id: z.string().min(1).max(10),
    shift_id: z.string().uuid(),
    check_in: z.string().regex(timeRegex, 'Must be HH:MM or HH:MM:SS').optional().nullable(),
    check_out: z.string().regex(timeRegex, 'Must be HH:MM or HH:MM:SS').optional().nullable(),
    status: z.enum(['present', 'absent', 'late', 'half_day', 'on_leave']),
    notes: z.string().optional().nullable(),
    ack: z.boolean().optional().default(false),
})

export const batchAttendanceSchema = z.object({
    date: z.string().date(),
    rows: z.array(attendanceRowSchema).min(1, 'At least one row is required'),
})
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npm test tests/schemas/attendance.schema.test.js
```

Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/attendance.schema.js tests/schemas/attendance.schema.test.js
git commit -m "feat: add attendance Zod schema"
```

---

## Task 2: Attendance Model

**Files:**
- Create: `src/models/attendance-model.js`

- [ ] **Step 1: Create the model**

Create `src/models/attendance-model.js`:

```js
import pool from '../config/db.js'

const attendanceModel = {
    getDailySheet: async ({ date, department_id, work_location_id, shift_id, employee_id }) => {
        const conditions = []
        const params = [date]
        let idx = 2

        if (department_id) {
            conditions.push(`ji.department_id = $${idx++}`)
            params.push(department_id)
        }
        if (work_location_id) {
            conditions.push(`ji.work_location_id = $${idx++}`)
            params.push(work_location_id)
        }
        if (shift_id) {
            conditions.push(`ji.shift_id = $${idx++}`)
            params.push(shift_id)
        }
        if (employee_id) {
            conditions.push(`ei.employee_id = $${idx++}`)
            params.push(employee_id)
        }

        const whereClause = conditions.length > 0
            ? 'AND ' + conditions.join(' AND ')
            : ''

        const res = await pool.query(`
            SELECT
                ei.employee_id,
                ei.name,
                d.department_name,
                des.title AS designation,
                s.id AS shift_id,
                s.name AS shift_name,
                s.start_time AS expected_in,
                s.end_time,
                s.late_after_minutes,
                a.id AS attendance_id,
                a.check_in,
                a.check_out,
                COALESCE(a.status, 'absent') AS status,
                a.notes,
                COALESCE(a.ack, false) AS ack,
                CASE
                    WHEN a.check_in IS NOT NULL AND a.check_in > s.start_time
                    THEN ROUND(EXTRACT(EPOCH FROM (a.check_in - s.start_time)) / 60)
                    ELSE NULL
                END AS late_by_minutes,
                lr.reason AS leave_reason,
                (lr.id IS NOT NULL) AS notes_readonly
            FROM employee_info ei
            JOIN job_info ji USING (employee_id)
            JOIN shifts s ON ji.shift_id = s.id
            JOIN departments d ON ji.department_id = d.id
            JOIN designations des ON ji.designation_id = des.id
            LEFT JOIN attendance a ON (
                a.employee_id = ei.employee_id
                AND a.date = $1
            )
            LEFT JOIN leave_requests lr ON (
                lr.employee_id = ei.employee_id
                AND lr.status = 'approved'
                AND $1 BETWEEN lr.start_date AND COALESCE(lr.end_by_force, lr.end_date)
            )
            WHERE 1=1 ${whereClause}
            ORDER BY ei.employee_id ASC
        `, params)

        return res.rows
    },

    batchSave: async ({ date, rows, marked_by }) => {
        const client = await pool.connect()
        try {
            await client.query('BEGIN')

            const results = []
            for (const row of rows) {
                const res = await client.query(`
                    INSERT INTO attendance
                        (employee_id, shift_id, date, check_in, check_out, status, notes, marked_by)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (employee_id, date)
                    DO UPDATE SET
                        shift_id   = EXCLUDED.shift_id,
                        check_in   = EXCLUDED.check_in,
                        check_out  = EXCLUDED.check_out,
                        status     = EXCLUDED.status,
                        notes      = EXCLUDED.notes,
                        marked_by  = EXCLUDED.marked_by,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                `, [
                    row.employee_id,
                    row.shift_id,
                    date,
                    row.check_in ?? null,
                    row.check_out ?? null,
                    row.status,
                    row.notes ?? null,
                    marked_by
                ])
                results.push(res.rows[0])
            }

            await client.query('COMMIT')
            return results
        } catch (err) {
            await client.query('ROLLBACK')
            throw err
        } finally {
            client.release()
        }
    },

    getMonthlyReport: async ({ month, year, department_id }) => {
        const conditions = []
        const params = [parseInt(month), parseInt(year)]
        let idx = 3

        if (department_id) {
            conditions.push(`ji.department_id = $${idx++}`)
            params.push(department_id)
        }

        const whereClause = conditions.length > 0
            ? 'AND ' + conditions.join(' AND ')
            : ''

        const res = await pool.query(`
            SELECT
                ei.employee_id,
                ei.name,
                d.department_name,
                COUNT(*) FILTER (WHERE a.status = 'present')  AS presents,
                COUNT(*) FILTER (WHERE a.status = 'absent')   AS absents,
                COUNT(*) FILTER (WHERE a.status = 'late')     AS lates,
                COUNT(*) FILTER (WHERE a.status = 'half_day') AS half_days,
                COUNT(*) FILTER (WHERE a.status = 'on_leave') AS on_leaves,
                COUNT(*) AS total_working_days,
                ROUND(
                    COUNT(*) FILTER (WHERE a.status IN ('present', 'late', 'half_day'))
                    * 100.0 / NULLIF(COUNT(*), 0), 2
                ) AS attendance_pct
            FROM employee_info ei
            JOIN job_info ji USING (employee_id)
            JOIN departments d ON ji.department_id = d.id
            JOIN attendance a USING (employee_id)
            WHERE EXTRACT(MONTH FROM a.date) = $1
              AND EXTRACT(YEAR  FROM a.date) = $2
              ${whereClause}
            GROUP BY ei.employee_id, ei.name, d.department_name
            ORDER BY ei.employee_id ASC
        `, params)

        return res.rows
    }
}

export default attendanceModel
```

- [ ] **Step 2: Commit**

```bash
git add src/models/attendance-model.js
git commit -m "feat: attendance model with daily sheet, batch save, and monthly report"
```

---

## Task 3: Attendance Service

**Files:**
- Create: `src/services/attendance-service.js`

- [ ] **Step 1: Create the service**

Create `src/services/attendance-service.js`:

```js
import attendanceModel from '../models/attendance-model.js'

const attendanceService = {
    getDailySheet: (filters) => attendanceModel.getDailySheet(filters),

    batchSave: ({ date, rows, marked_by }) =>
        attendanceModel.batchSave({ date, rows, marked_by }),

    getMonthlyReport: (filters) => attendanceModel.getMonthlyReport(filters),
}

export default attendanceService
```

- [ ] **Step 2: Commit**

```bash
git add src/services/attendance-service.js
git commit -m "feat: attendance service"
```

---

## Task 4: Attendance Controller + Routes

**Files:**
- Create: `src/controllers/attendance-controller.js`
- Create: `src/routes/attendance-routes.js`

- [ ] **Step 1: Create the controller**

Create `src/controllers/attendance-controller.js`:

```js
import attendanceService from '../services/attendance-service.js'

export const getDailySheet = async (req, res, next) => {
    try {
        const { date, department, location, shift, employee } = req.query

        if (!date) {
            return res.status(400).json({ error: 'date query param is required (YYYY-MM-DD).' })
        }

        const data = await attendanceService.getDailySheet({
            date,
            department_id: department || null,
            work_location_id: location || null,
            shift_id: shift || null,
            employee_id: employee || null,
        })

        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}

export const batchSaveAttendance = async (req, res, next) => {
    try {
        const { date, rows } = req.body
        const marked_by = req.user.user_id

        const results = await attendanceService.batchSave({ date, rows, marked_by })
        return res.status(200).json({ saved: results.length, records: results })
    } catch (err) {
        return next(err)
    }
}

export const getMonthlyReport = async (req, res, next) => {
    try {
        const { month, year, department } = req.query

        if (!month || !year) {
            return res.status(400).json({ error: 'month and year query params are required.' })
        }

        const data = await attendanceService.getMonthlyReport({
            month,
            year,
            department_id: department || null,
        })

        return res.status(200).json(data)
    } catch (err) {
        return next(err)
    }
}
```

- [ ] **Step 2: Create the routes**

Create `src/routes/attendance-routes.js`:

```js
import { Router } from 'express'
import { verifyToken } from '../middleware/auth-middleware.js'
import { requirePermission } from '../middleware/permission-middleware.js'
import { validate } from '../middleware/validate-middleware.js'
import { batchAttendanceSchema } from '../schemas/attendance.schema.js'
import {
    getDailySheet,
    batchSaveAttendance,
    getMonthlyReport,
} from '../controllers/attendance-controller.js'

const router = Router()

router.get('/daily', verifyToken, requirePermission('attendance:read'), getDailySheet)
router.post('/batch', verifyToken, requirePermission('attendance:write'), validate(batchAttendanceSchema), batchSaveAttendance)
router.get('/report', verifyToken, requirePermission('attendance:read'), getMonthlyReport)

export default router
```

- [ ] **Step 3: Commit**

```bash
git add src/controllers/attendance-controller.js src/routes/attendance-routes.js
git commit -m "feat: attendance controller and routes"
```

---

## Task 5: Register Attendance Routes in server.js

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add attendance import and route registration**

Open `server.js`. Add the import after the existing imports:

```js
import attendanceRoutes from './src/routes/attendance-routes.js'
```

Add the route registration after the existing route registrations:

```js
app.use('/api/attendance', attendanceRoutes)
```

- [ ] **Step 2: Start the server and test endpoints manually**

```bash
npm start
```

Test daily sheet (replace TOKEN with a valid JWT from login):

```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/attendance/daily?date=2026-04-20"
```

Expected: `[]` or array of employee rows with attendance data.

Test batch save:

```bash
curl -X POST http://localhost:3000/api/attendance/batch \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-20",
    "rows": [{
      "employee_id": "EMP001",
      "shift_id": "YOUR-SHIFT-UUID",
      "status": "present",
      "check_in": "09:05",
      "check_out": "17:00"
    }]
  }'
```

Expected: `{ "saved": 1, "records": [...] }`

Test validation failure:

```bash
curl -X POST http://localhost:3000/api/attendance/batch \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-04-20", "rows": []}'
```

Expected: `{ "error": "Validation failed", "issues": [...] }` with status 422.

Test monthly report:

```bash
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/attendance/report?month=4&year=2026"
```

Expected: array of per-employee aggregated rows.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: register attendance routes — Phase 2 complete"
```

---

## Phase 2 Complete

The attendance module is now fully operational:
- `GET /api/attendance/daily` — daily sheet with optional filters (date, department, location, shift, employee)
- `POST /api/attendance/batch` — transactional batch upsert for the full day's grid
- `GET /api/attendance/report` — monthly roll-up with present/absent/late/half_day/on_leave counts and percentage
