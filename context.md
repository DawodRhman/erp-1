# EMS Backend - Context Document

**Project:** Employee Management System (EMS) Backend  
**Technology Stack:** Node.js, Express 5, PostgreSQL, Zod  
**Architecture:** Three-Layer (Model → Service → Controller)  
**Last Updated:** 2026-04-24

---

## 0. 2026-04-24 Status (What Happened Recently)

This section captures the most recent changes and the current state of security + data seeding so the team can reproduce results quickly.

### 0.1 RBAC / Permissions (Backend)
- RBAC is enforced via `verifyToken` -> `requirePermission(...)` / `requireAnyPermission(...)` -> `validate(...)` -> controller.
- Permission split:
  - `config:read`: read-only access to configuration/lookup endpoints for HR roles.
  - `config:manage`: super_admin-only access for config writes.
- Employee self-service / leave UI support:
  - Employees have `leave:read` and must be able to read `leave_types` to submit leave requests.
  - `src/routes/leave-type-routes.js` allows read access via `requireAnyPermission(['config:read','config:manage','leave:read'])` while keeping writes `config:manage`.

### 0.2 Security Test Automation (Backend Scripts)
- Security runner behavior:
  - Logs in all seed users, stores JWTs, then tests every discovered route against every token (RBAC matrix).
  - Runs auth-bypass checks (`no_token`, `bad_token`) for each discovered route.
  - Runs deep checks: employee self-service isolation; attendance Ack flow (HR writes, employee acks, HR cannot ack, super_admin can).
  - Runs injection smoke probes (path/query and selected bodies) and expects 4xx rather than crashing with 500.
- Typical verification command used during hardening:
  - `node scripts/api-security-check.mjs && node scripts/route-middleware-audit.mjs`
- Latest observed results (dev DB after reset + seed):
  - Auto-discovered routes: 74
  - RBAC matrix + deep checks: 0 vulnerabilities (no unexpected allows)
  - Remaining warnings are mainly validation hardening (missing `validate()` on a few routes) and some endpoints returning 500 when given obviously invalid IDs (should be 4xx).
- Optional request logger (dev only):
  - `server.js` contains a gated logger that prints non-2xx/3xx responses when `DEBUG_HTTP=1`.
  - PowerShell usage: `$env:DEBUG_HTTP="1"; npm start` (must be in the same command/session as `npm start`).
- Route middleware audit:
  - Auto-discovers routes from `server.js` mounts and flags missing/incorrect middleware patterns.
  - Current state: a few routes are flagged with "no validate() middleware" (input hardening), but RBAC is still enforced.

### 0.3 Mock Data / Seeds (Reproducible DB State)
- Existing seed: `npm run db:seed` runs `seeds/dev_seed.js` (lookup tables + employees/users).
- Added full mock seed: `npm run db:seed:full` runs `seeds/full_mock_seed.js`:
  - Populates all HCM tables behind current API routes (employees/job/extra/history, leave types/policies/balances/requests, attendance with `ack`, RBAC tables).
  - Clears only HCM-related tables (does not touch inventory/purchasing tables).
  - Seeds mixed leave request statuses (pending/approved/rejected + early return) and attendance rows around Jan 2026.

### 0.4 Known "Noise" During Security Runs (Not a Vulnerability)
- For write routes, even with correct RBAC, requests can return 400/422/409/500 if:
  - payload is invalid (missing required fields),
  - record IDs do not exist,
  - DB constraints are violated.
- In the runner output:
  - **VULN** means an unexpected allow (should have been 401/403).
  - **WARN** means unexpected status (commonly validation gaps or handler-level failures), not an auth bypass.

## 1. Project Overview

### 1.1 Purpose
Human Capital Management (HCM) backend API handling:
- Employee information management
- Attendance tracking
- Leave management
- Role-based access control
- Configuration management

### 1.2 Scope Lock
**IN SCOPE:**
- Attendance management
- Leave management
- Employee management
- Department management
- Employee history

**OUT OF SCOPE:**
- Inventory
- Finance
- Official Announcements
- Other non-HCM features

### 1.3 Hard Rules
1. **NO DELETE OPERATIONS** - Append/update only
2. **Super Admin owns config tables** - HR cannot modify
3. **Employee self-service** - Can only access own data
4. **SRS Track#60 precedence** - If conflicts, SRS wins

---

## 2. Technical Architecture

### 2.1 Directory Structure
```
backend/
├── server.js                    # Entry point
├── src/
│   ├── config/
│   │   └── db.js               # PostgreSQL pool configuration
│   ├── controllers/            # Request handlers
│   │   ├── employee-info-controller.js
│   │   ├── job-info-controller.js
│   │   ├── leave-request-controller.js
│   │   ├── attendance-controller.js
│   │   ├── auth-controller.js
│   │   └── *-controller.js     # Config controllers
│   ├── middleware/             # Express middleware
│   │   ├── auth-middleware.js          # JWT verification
│   │   ├── permission-middleware.js  # Permission checking
│   │   ├── self-service-middleware.js  # Data isolation
│   │   ├── sanitize-middleware.js      # XSS prevention
│   │   ├── validate-middleware.js      # Zod validation
│   │   └── error-middleware.js         # Error handling
│   ├── models/                 # Database queries
│   │   ├── employee-info-model.js
│   │   ├── job-info-model.js
│   │   ├── leave-request-model.js
│   │   ├── attendance-model.js
│   │   └── *-model.js          # Config models
│   ├── routes/                 # Route definitions
│   │   ├── employee-info-routes.js
│   │   ├── leave-request-routes.js
│   │   ├── attendance-routes.js
│   │   └── *-routes.js         # Config routes
│   ├── schemas/                # Zod validation schemas
│   │   ├── employee-schema.js
│   │   ├── leave-request-schema.js
│   │   └── attendance-schema.js
│   └── services/               # Business logic
│       ├── employee-info-service.js
│       ├── auth-service.js
│       └── *-service.js
├── migrations/                 # Database migrations
├── seeds/                      # Seed data
├── tests/                      # Test files
├── verified.md                 # Verified changes
├── context.md                  # This file
└── verification.md             # API testing guide
```

### 2.2 Request Flow
```
HTTP Request
    ↓
Express Route (/api/employees)
    ↓
Middleware Chain:
  1. auth-middleware (verify JWT)
  2. permission-middleware (check permissions)
  3. self-service-middleware (data isolation)
  4. validate-middleware (Zod validation)
  5. sanitize-middleware (XSS prevention)
    ↓
Controller (employee-info-controller.js)
    ↓
Service (employee-info-service.js)
    ↓
Model (employee-info-model.js)
    ↓
PostgreSQL Database
    ↓
Response
```

### 2.3 Authentication Flow
```
1. POST /api/auth/login
   { email, password }

2. Auth Service:
   - Find user by email
   - Compare bcrypt password
   - Generate JWT token

3. JWT Payload:
   {
     user_id: "uuid",
     employee_id: "EMP001",
     role_id: "uuid",
     is_super_admin: true/false,
     iat: timestamp,
     exp: timestamp
   }

4. Subsequent Requests:
   Header: Authorization: Bearer <token>

5. Auth Middleware:
   - Verify token signature
   - Attach req.user
   - Proceed or 401
```

### 2.4 Permission System

#### Super Admin Detection
```javascript
// In auth-service.js
const is_super_admin = (
    user.department_id === null && 
    user.role_name === 'super_admin'
)
```

#### Permission Hierarchy
```
super_admin
  └── ALL permissions (bypass check)

hr_manager
  ├── config:manage
  ├── employees:read/write
  ├── leave:read/write/approve
  └── attendance:read/write

hr_executive
  ├── employees:read
  ├── leave:read
  └── attendance:read

employee
  ├── employees:read (self only)
  ├── leave:read/write (self only)
  └── attendance:read (self only)
```

#### Permission Check Flow
```javascript
// 1. Check if super_admin
if (req.user.is_super_admin) return next()

// 2. Load permissions from DB (cache on request)
if (!req.permissions) {
    SELECT p.permission_key 
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    WHERE rp.role_id = $1
    req.permissions = new Set(result.rows)
}

// 3. Check required permission
if (!req.permissions.has(requiredKey)) {
    return 403 Forbidden
}
```

---

## 3. Database Schema

### 3.1 Core Tables

#### employee_info
```sql
CREATE TABLE employee_info (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id varchar(10) UNIQUE NOT NULL,
    name varchar(100) NOT NULL,
    father_name varchar(100) NOT NULL,
    cnic varchar(20) UNIQUE NOT NULL,
    date_of_birth varchar(15) NOT NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
```

#### job_info
```sql
CREATE TABLE job_info (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id varchar(10) NOT NULL,
    department_id uuid NOT NULL,
    designation_id uuid NOT NULL,
    employment_type_id uuid NOT NULL,
    job_status_id uuid NOT NULL,
    work_mode_id uuid NOT NULL,
    work_location_id uuid NOT NULL,
    shift_id uuid NOT NULL,
    date_of_joining date NOT NULL,
    date_of_exit date
);
```

#### departments
```sql
CREATE TABLE departments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    department_code text NOT NULL,
    department_name text NOT NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    parent_department_id uuid
);
```

#### designations
```sql
CREATE TABLE designations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title varchar(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
-- NOTE: No department_id column (many-to-many not implemented)
```

#### leave_requests
```sql
CREATE TABLE leave_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id varchar(10) NOT NULL,
    leave_type_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    end_by_force date,          -- Early return date
    reason text,
    status varchar(20) DEFAULT 'pending',
    reviewed_by uuid,
    reviewed_at timestamptz,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
```

#### attendance
```sql
CREATE TABLE attendance (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id varchar(10) NOT NULL,
    shift_id uuid NOT NULL,
    date date NOT NULL,
    check_in time,
    check_out time,
    status varchar(20) NOT NULL,  -- present, absent, late, half_day, on_leave
    notes text,
    marked_by uuid,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);
```

#### users
```sql
CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id varchar(10) UNIQUE NOT NULL,
    email varchar(255) UNIQUE NOT NULL,
    password varchar(255) NOT NULL,  -- bcrypt hashed
    role_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);
```

#### roles
```sql
CREATE TABLE roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    department_id uuid,            -- NULL for global roles (super_admin)
    role_name varchar(100) NOT NULL,
    description text
);
-- NOTE: department_id allows NULL (fixed in seed)
```

### 3.2 Configuration Tables
All config tables follow similar pattern:
- id (uuid, PK)
- name/code field (unique)
- is_active (boolean)
- created_at / updated_at (timestamps)

Tables:
- employment_types (type_name)
- job_statuses (status_name)
- work_modes (mode_name)
- work_locations (location_name)
- shifts (name, start_time, end_time, late_after_minutes)
- leave_types (name, code)
- leave_policies (department_id, leave_type_id, days_allowed, year)

---

## 4. API Structure

### 4.1 Base URL
```
Development: http://localhost:3000/api
```

### 4.2 Authentication Header
```
Authorization: Bearer <jwt_token>
```

### 4.3 Response Format

#### Success (200)
```json
{
  "id": "uuid",
  "name": "...",
  ...
}
```

#### Success Array (200)
```json
[
  { "id": "uuid", "name": "..." },
  { "id": "uuid", "name": "..." }
]
```

#### Error (4xx/5xx)
```json
{
  "error": "Error message"
}
```

#### Validation Error (422)
```json
{
  "error": "Validation failed",
  "issues": [
    { "field": "email", "message": "Invalid format" }
  ]
}
```

### 4.4 Endpoint Categories

#### Authentication
```
POST /auth/login
  Body: { email, password }
  Response: { token, user }
```

#### Employees
```
GET    /employees            - List all (HR), Self only (Employee)
GET    /employees/:id        - Get specific
GET    /employees/ids        - Get all IDs (for dropdowns)
POST   /employees            - Create new (HR only)
PUT    /employees/:id        - Update (HR only)
```

#### Job Info
```
GET    /job-info             - List
GET    /job-info/employee/:empId  - Get by employee
POST   /job-info             - Create
PUT    /job-info/:id         - Update
```

#### Leave Management
```
GET    /leave-requests              - List (filtered by role)
POST   /leave-requests              - Create (self-service enforced)
PATCH  /leave-requests/:id/approve  - Approve (HR only)
PATCH  /leave-requests/:id/reject  - Reject (HR only)
PATCH  /leave-requests/:id/early-return  - Early return (HR only)
GET    /leave-requests/balances     - Get balances
GET    /leave-requests/calendar     - Get calendar view
```

#### Attendance
```
GET    /attendance/daily     - Daily sheet
POST   /attendance/batch     - Batch save
GET    /attendance/report    - Monthly report
```

#### Configuration (Super Admin Only)
```
GET    /departments          - List
POST   /departments          - Create
PUT    /departments/:id      - Update

GET    /designations         - List
POST   /designations         - Create
PUT    /designations/:id     - Update

(Same pattern for: employment-types, job-statuses, work-modes,
 work-locations, shifts, leave-types, leave-policies)
```

---

## 5. Security Implementation

### 5.1 JWT Authentication
**File:** `src/middleware/auth-middleware.js`

```javascript
const token = req.headers.authorization?.split(' ')[1]
const decoded = jwt.verify(token, JWT_SECRET)
req.user = decoded
```

### 5.2 Permission Middleware
**File:** `src/middleware/permission-middleware.js`

```javascript
export const requirePermission = (key) => async (req, res, next) => {
    if (!req.user) return 401
    if (req.user.is_super_admin) return next()
    
    // Load permissions from DB if not cached
    if (!req.permissions) {
        const result = await pool.query(...)
        req.permissions = new Set(result.rows.map(r => r.permission_key))
    }
    
    if (!req.permissions.has(key)) return 403
    next()
}
```

### 5.3 Self-Service Middleware
**File:** `src/middleware/self-service-middleware.js`

```javascript
export const enforceSelfService = (options = {}) => {
    const { resourceKey = 'employee_id', allowedRoles = ['hr_manager', 'super_admin'] } = options
    
    return (req, res, next) => {
        if (req.user.is_super_admin) return next()
        
        // If employee role, force filter to own ID
        if (req.user.role === 'employee') {
            req.query[resourceKey] = req.user.employee_id
        }
        
        next()
    }
}
```

### 5.4 Sanitization Middleware
**File:** `src/middleware/sanitize-middleware.js`

```javascript
export const sanitizeInput = (req, res, next) => {
    if (req.body) {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = stripHtml(req.body[key])
            }
        }
    }
    next()
}
```

---

## 6. Business Logic

### 6.1 Employee Creation (Two-Step)
```
Step 1: POST /employees
        - Creates employee_info record
        - Returns employee_id

Step 2: POST /job-info
        - Creates job_info record
        - Links employee to department, designation, etc.
```

### 6.2 Leave Request Flow
```
1. Employee submits request
   POST /leave-requests
   { employee_id, leave_type_id, start_date, end_date, reason }

2. System validates:
   - Balance sufficient?
   - No overlapping leave?
   - Dates valid?

3. Status = 'pending'

4. HR Manager approves/rejects
   PATCH /leave-requests/:id/approve
   PATCH /leave-requests/:id/reject

5. If early return:
   PATCH /leave-requests/:id/early-return
   { end_by_force: "2024-02-03" }
   - Recalculates days taken
   - Restores unused balance
```

### 6.3 Attendance Daily Sheet
```
1. HR opens daily sheet
   GET /attendance/daily?date=2024-01-15

2. System shows:
   - All employees
   - Their shift details
   - Current attendance status
   - Late calculations

3. HR edits rows

4. HR saves batch
   POST /attendance/batch
   { date, rows: [...] }
   - Upserts attendance records
```

### 6.4 Late Calculation
```javascript
late_by_minutes = check_in_time - (shift_start_time + grace_period)
```

---

## 7. Validation (Zod)

### 7.1 Schema Structure
```javascript
// schemas/employee-schema.js
import { z } from 'zod'

export const employeeSchema = z.object({
    employee_id: z.string().min(3).max(10),
    name: z.string().min(2).max(100),
    father_name: z.string().min(2).max(100),
    cnic: z.string().regex(/^\d{5}-\d{7}-\d$/),
    date_of_birth: z.string()
})
```

### 7.2 Validation Middleware
```javascript
// middleware/validate-middleware.js
export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
        return res.status(422).json({
            error: 'Validation failed',
            issues: result.error.issues
        })
    }
    req.body = result.data
    next()
}
```

---

## 8. Error Handling

### 8.1 Error Middleware
**File:** `src/middleware/error-middleware.js`

```javascript
export const errorHandler = (err, req, res, next) => {
    console.error(err.stack)
    
    if (err.code === '23505') {  // Postgres unique violation
        return res.status(409).json({ error: 'Duplicate entry' })
    }
    
    res.status(500).json({ error: 'Internal server error' })
}
```

### 8.2 Controller Pattern
```javascript
// controllers/*-controller.js
export const handler = async (req, res, next) => {
    try {
        const result = await service.method(req.body)
        return res.status(200).json(result)
    } catch (err) {
        return next(err)
    }
}
```

---

## 9. Development Workflow

### 9.1 Available Scripts
```bash
npm start              # Start with nodemon
npm test               # Run tests
npm run db:migrate     # Run migrations
npm run db:seed        # Seed development data
npm run db:rollback    # Rollback migrations
```

### 9.2 Environment Variables
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/ems
JWT_SECRET=your_secret_key
PORT=3000
```

### 9.3 Database Reset Procedure
```bash
# 1. Drop and recreate database
# 2. Run migrations
npm run db:migrate

# 3. Seed data
npm run db:seed

# 4. Verify
npm start
```

---

## 10. Known Issues & Limitations

### 10.1 Current Issues
1. **Test Suite Configuration**
   - Error: `Cannot read properties of undefined (reading 'config')`
   - Impact: Tests fail but app works
   - Workaround: Manual API testing

### 10.2 Design Decisions
1. **No Soft Deletes** - Hard rule compliance
2. **No Pagination** - Assumed small datasets
3. **No Rate Limiting** - Future enhancement
4. **No Audit Logging** - Future enhancement

### 10.3 Schema Limitations
1. **Designations** - No department relationship (simple list)
2. **Leave Policies** - Department-level only (not employee-level)

---

## 11. Future Enhancements

### 11.1 Potential Features
- [ ] Audit logging (who changed what)
- [ ] File uploads (documents, photos)
- [ ] Email notifications
- [ ] Reporting dashboard
- [ ] API rate limiting
- [ ] Pagination for large datasets
- [ ] Soft deletes with trash bin
- [ ] Employee document management
- [ ] Payroll integration
- [ ] Performance reviews

### 11.2 Technical Debt
- [ ] Fix test suite configuration
- [ ] Add integration tests
- [ ] Implement caching (Redis)
- [ ] Add request logging
- [ ] Improve error messages

---

## 12. Dependencies

### 12.1 Core Dependencies
```json
{
  "express": "^5.0.0",
  "pg": "^8.11.0",
  "bcrypt": "^5.1.0",
  "jsonwebtoken": "^9.0.0",
  "zod": "^3.21.0",
  "cors": "^2.8.5",
  "helmet": "^7.0.0",
  "express-rate-limit": "^6.7.0",
  "validator": "^13.9.0",
  "sanitize-html": "^2.11.0"
}
```

### 12.2 Dev Dependencies
```json
{
  "vitest": "^1.0.0",
  "nodemon": "^3.0.0",
  "node-pg-migrate": "^6.2.0"
}
```

---

## 13. Key Personnel

### 13.1 Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Super Admin | zaidbinasif468@gmail.com | zaidkhan123 |
| HR Manager | sadia.malik@company.com | password123 |
| HR Executive | imran.shah@company.com | password123 |
| Employee | huzaifa.kaleem@company.com | password123 |

---

## 14. Documentation Files

| File | Purpose |
|------|---------|
| `verified.md` | Tested and verified changes |
| `context.md` | This file - full context |
| `verification.md` | API testing guide with curl examples |
| `requriments.md` | PRD/SRS requirements |
| `read.md` | Additional documentation |
| `code.md` | Code standards |

---

## 15. Quick Reference

### 15.1 HTTP Status Codes Used
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 500 | Server Error |

### 15.2 Role Permissions Matrix
| Resource | super_admin | hr_manager | hr_executive | employee |
|----------|-------------|------------|--------------|----------|
| Config Tables | CRUD | — | — | — |
| Employees | CRUD | CRUD | Read | Self |
| Leave (all) | CRUD | CRUD+Approve | Read | Self |
| Attendance | CRUD | CRUD | Read | Self |

### 15.3 Common Database Queries
```sql
-- Get employee with job details
SELECT * FROM employee_info ei
JOIN job_info ji ON ji.employee_id = ei.employee_id
JOIN departments d ON d.id = ji.department_id
WHERE ei.employee_id = 'EMP001';

-- Get leave balance
SELECT * FROM leave_balances
WHERE employee_id = 'EMP001';

-- Get attendance for date
SELECT * FROM attendance
WHERE date = '2024-01-15';
```

---

**Document Version:** 1.0  
**Last Updated By:** Claude Code  
**Purpose:** Complete context reference for EMS backend development
