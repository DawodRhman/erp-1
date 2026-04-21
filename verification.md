# EMS Backend API Verification Guide

Comprehensive manual testing guide covering all requirements from PRD/SRS Track#60.

**Last Updated:** After Security Hardening - All critical issues fixed

---

## Table of Contents

1. [Security Hardening Summary](#1-security-hardening-summary)
2. [Role-Based Access Control](#2-role-based-access-control)
3. [Authentication](#3-authentication)
4. [Configuration Tables (Super Admin Only)](#4-configuration-tables-super-admin-only)
5. [Employee Management](#5-employee-management)
6. [Leave Management](#6-leave-management)
7. [Attendance Management](#7-attendance-management)
8. [Security Testing Checklist](#8-security-testing-checklist)
9. [HTTP Status Code Reference](#9-http-status-code-reference)

---

## 1. Security Hardening Summary

### Critical Issues Fixed

| Issue | Status | Fix Applied |
|-------|--------|-------------|
| **Employee Self-Service** | ✅ FIXED | Added role-based filtering in controllers |
| **Config Table Access** | ✅ FIXED | Added `requirePermission('config:manage')` to all GET endpoints |
| **Input Sanitization** | ✅ FIXED | Created `sanitize-middleware.js` for XSS prevention |
| **Permission Bypass** | ✅ FIXED | Enforced `config:manage` on all configuration routes |

### New Security Middleware

1. **`src/middleware/self-service-middleware.js`** - Enforces employee data isolation
2. **`src/middleware/sanitize-middleware.js`** - Sanitizes input to prevent XSS

### Self-Service Enforcement

**Rule:** Employee role can ONLY access their own data:
- `/employees` - Returns only own employee record
- `/employees/:id` - Access denied if not own ID
- `/leave-requests` - Returns only own leave requests
- `/leave-requests/balances` - Returns only own balance
- `/attendance/daily` - Returns only own attendance
- `/attendance/report` - Returns only own report

---

## 2. Role-Based Access Control

### Three Mandatory Roles (v1)

| Role | Permissions | Special Rules |
|------|-------------|---------------|
| **super_admin** | ALL permissions | `is_super_admin=true` when `department_id IS NULL` |
| **hr_manager** | `config:manage`, `employees:read/write`, `leave:read/write/approve`, `attendance:read/write` | Full HR operations |
| **hr_executive** | `employees:read`, `leave:read`, `attendance:read` | Read-only HR |
| **employee** | `employees:read`, `leave:read/write`, `attendance:read` | **Self-service only** - can only see own data |

### Permission Matrix

| Resource | super_admin | hr_manager | hr_executive | employee |
|----------|-------------|------------|--------------|----------|
| **Configuration Tables** | CRUD | — | — | — |
| **All Employees Data** | CRUD | CRUD | Read | Self only |
| **All Leave Requests** | CRUD | CRUD+Approve | Read | Self only |
| **All Attendance** | CRUD | CRUD | Read | Self only |
| **Leave Balance (Others)** | Read | Read | Read | Self only |

### Test Credentials

```bash
# Super Admin
Email: zaidbinasif468@gmail.com
Password: zaidkhan123
Role: super_admin

# HR Manager
Email: sadia.malik@company.com
Password: password123
Role: hr_manager

# HR Executive
Email: imran.shah@company.com
Password: password123
Role: hr_executive

# Regular Employee
Email: huzaifa.kaleem@company.com
Password: password123
Role: employee
Employee ID: EMP002
```

---

## 3. Authentication

### 3.1 Login

**Endpoint:** `POST /auth/login`

| Property | Value |
|----------|-------|
| **Authentication** | None (public) |

**Request Body:**
```json
{
  "email": "zaidbinasif468@gmail.com",
  "password": "zaidkhan123"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "zaidbinasif468@gmail.com",
    "role": "super_admin",
    "employee_id": "EMP001"
  }
}
```

**JWT Payload Structure:**
```json
{
  "user_id": "uuid",
  "employee_id": "EMP001",
  "role_id": "uuid",
  "is_super_admin": true,
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Error Responses:**
```json
// 401 - Invalid credentials
{ "error": "Invalid email or password" }

// 400 - Missing fields
{ "error": "Email and password are required." }
```

### 3.2 Token Usage

**Header Format:**
```
Authorization: Bearer <token>
```

---

## 4. Configuration Tables (Super Admin Only)

**CRITICAL RULE:** All configuration tables are **SUPER ADMIN ONLY**. HR and employees cannot access these.

| Table | Base Route | Methods | Permission Required |
|-------|------------|---------|---------------------|
| Departments | `/departments` | GET, POST, PUT | `config:manage` |
| Designations | `/designations` | GET, POST, PUT | `config:manage` |
| Employment Types | `/employment-types` | GET, POST, PUT | `config:manage` |
| Job Statuses | `/job-statuses` | GET, POST, PUT | `config:manage` |
| Work Modes | `/work-modes` | GET, POST, PUT | `config:manage` |
| Work Locations | `/work-locations` | GET, POST, PUT | `config:manage` |
| Shifts | `/shifts` | GET, POST, PUT | `config:manage` |
| Leave Types | `/leave-types` | GET, POST, PUT | `config:manage` |
| Leave Policies | `/leave-policies` | GET, POST, PUT | `config:manage` |

### 4.1 Access Control Test

```bash
# Test 1: Super Admin can access (should return 200)
curl -X GET http://localhost:3000/departments \
  -H "Authorization: Bearer <super_admin_token>"

# Test 2: HR Manager CANNOT access (should return 403)
curl -X GET http://localhost:3000/departments \
  -H "Authorization: Bearer <hr_manager_token>"
# Expected: { "error": "Insufficient permissions." }

# Test 3: Employee CANNOT access (should return 403)
curl -X GET http://localhost:3000/departments \
  -H "Authorization: Bearer <employee_token>"
# Expected: { "error": "Insufficient permissions." }
```

### 4.2 Common Configuration Schema

**Create Request (all config tables):**
```json
{
  "name": "Configuration Name",
  "is_active": true
}
```

**Note:** No DELETE endpoints exist (hard rule compliance)

---

## 5. Employee Management

### 5.1 Endpoints Overview

| Method | Endpoint | Auth | Permission | Description |
|--------|----------|------|------------|-------------|
| GET | `/employees` | Bearer | `employees:read` | List employees (HR=All, Employee=Self only) |
| GET | `/employees/ids` | Bearer | `employees:read` | Get all employee IDs only (HR only) |
| GET | `/employees/:id` | Bearer | `employees:read` | Get specific employee (Self-service enforced) |
| POST | `/employees` | Bearer | `employees:write` | Create new employee (HR only) |
| PUT | `/employees/:id` | Bearer | `employees:write` | Update employee (HR only) |

### 5.2 Employee Self-Service Enforcement (CRITICAL)

**Rule:** When an `employee` role calls `/employees`, they ONLY see their own data.

**Test Scenario:**

```bash
# Login as employee (huzaifa.kaleem@company.com) - EMP002
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"huzaifa.kaleem@company.com","password":"password123"}' \
  | jq -r '.token')

# Test: Employee tries to get all employees
curl -X GET http://localhost:3000/employees \
  -H "Authorization: Bearer $TOKEN"

# Expected: Returns ONLY EMP002 data (array with 1 item)
# [
#   {
#     "employee_id": "EMP002",
#     "name": "Huzaifa Kaleem",
#     ...
#   }
# ]

# Test: Employee tries to get another employee's data
curl -X GET http://localhost:3000/employees/EMP003 \
  -H "Authorization: Bearer $TOKEN"

# Expected: 403 Forbidden
# { "error": "Access denied. You can only access your own data." }
```

### 5.3 Create Employee (Two-Step Process)

**Step 1: Create Employee Info**
```bash
POST /employees
Authorization: Bearer <hr_manager_token>
Content-Type: application/json

{
  "employee_id": "EMP016",
  "name": "Test Employee",
  "father_name": "Test Father",
  "cnic": "42101-9999999-9",
  "date_of_birth": "1995-01-01"
}
```

**Step 2: Create Job Info**
```bash
POST /job-info
Authorization: Bearer <hr_manager_token>
Content-Type: application/json

{
  "employee_id": "EMP016",
  "department_id": "uuid-of-IT",
  "designation_id": "uuid-of-Software-Engineer",
  "employment_type_id": "uuid-of-Full-Time",
  "job_status_id": "uuid-of-Active",
  "work_mode_id": "uuid-of-Hybrid",
  "work_location_id": "uuid-of-Main-Office",
  "shift_id": "uuid-of-General",
  "date_of_joining": "2024-01-15"
}
```

### 5.4 Permission Tests

```bash
# Test 1: HR Manager can create employee (201)
curl -X POST http://localhost:3000/employees \
  -H "Authorization: Bearer <hr_manager_token>" \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"EMP016","name":"Test","father_name":"Father","cnic":"42101-9999999-9","date_of_birth":"1995-01-01"}'

# Test 2: HR Executive CANNOT create (403 Forbidden)
curl -X POST http://localhost:3000/employees \
  -H "Authorization: Bearer <hr_executive_token>" \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"EMP017","name":"Test","father_name":"Father","cnic":"42101-8888888-8","date_of_birth":"1995-01-01"}'
# Expected: { "error": "Insufficient permissions." }

# Test 3: Employee CANNOT create (403 Forbidden)
curl -X POST http://localhost:3000/employees \
  -H "Authorization: Bearer <employee_token>" \
  -H "Content-Type: application/json" \
  -d '{...}'
# Expected: { "error": "Insufficient permissions." }
```

---

## 6. Leave Management

### 6.1 Endpoints Overview

| Method | Endpoint | Query/Body | Permission | Self-Service |
|--------|----------|------------|------------|--------------|
| GET | `/leave-requests` | `?status=&employee=&department=` | `leave:read` | Employee sees only own |
| POST | `/leave-requests` | Create body | `leave:write` | Employee forced to self |
| PATCH | `/:id/approve` | - | `leave:approve` | HR only |
| PATCH | `/:id/reject` | - | `leave:approve` | HR only |
| PATCH | `/:id/early-return` | `{ "end_by_force": "2024-01-20" }` | `leave:approve` | HR only |
| GET | `/balances` | `?department=&location=&shift=` | `leave:read` | Employee sees only own |
| GET | `/calendar` | `?department=&month=&year=` | `leave:read` | Employee sees all (no dept filter) |

### 6.2 Create Leave Request

```bash
POST /leave-requests
Authorization: Bearer <employee_token>
Content-Type: application/json

{
  "employee_id": "EMP002",
  "leave_type_id": "uuid",
  "start_date": "2024-02-01",
  "end_date": "2024-02-05",
  "reason": "Family vacation"
}
```

**Self-Service Enforcement:**
- Employee role: `employee_id` is FORCED to current user's ID
- Cannot create leave request for another employee

**Test:**
```bash
# Employee tries to create leave for another employee
curl -X POST http://localhost:3000/leave-requests \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP003",
    "leave_type_id": "<uuid>",
    "start_date": "2024-03-01",
    "end_date": "2024-03-05",
    "reason": "Test"
  }'

# Expected: Creates leave for EMP002 (current user), not EMP003
# The employee_id in body is overridden to current user's ID
```

### 6.3 Leave Self-Service Enforcement

**Employee View Rule:**
- `employee` role should ONLY see their own leave requests
- `hr_manager` sees all leave requests
- `hr_executive` sees all leave requests (read-only)

**Test Scenario:**

```bash
# Login as employee (EMP002)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"huzaifa.kaleem@company.com","password":"password123"}' \
  | jq -r '.token')

# Employee views leave requests
curl -X GET http://localhost:3000/leave-requests \
  -H "Authorization: Bearer $TOKEN"

# Expected: Returns only EMP002's leave requests
# HR would see all employees' requests
```

### 6.4 Approve/Reject Leave (HR Only)

```bash
# HR Manager approves leave
PATCH /leave-requests/<leave-id>/approve
Authorization: Bearer <hr_manager_token>

# HR Executive CANNOT approve (no leave:approve permission)
PATCH /leave-requests/<leave-id>/approve
Authorization: Bearer <hr_executive_token>
# Expected: 403 Forbidden

# Employee CANNOT approve
PATCH /leave-requests/<leave-id>/approve
Authorization: Bearer <employee_token>
# Expected: 403 Forbidden
```

### 6.5 Early Return (HR Only)

```bash
PATCH /leave-requests/<leave-id>/early-return
Authorization: Bearer <hr_manager_token>
Content-Type: application/json

{
  "end_by_force": "2024-02-03"
}
```

**Logic:**
- `end_by_force` becomes the new end date
- System calculates: `Days Actually Taken = (start_date → end_by_force)`
- System restores: `Days to Restore = (original_days - days_taken)`

---

## 7. Attendance Management

### 7.1 Endpoints Overview

| Method | Endpoint | Query/Body | Permission | Self-Service |
|--------|----------|------------|------------|--------------|
| GET | `/attendance/daily?date=2024-01-15` | `?department=&location=&shift=&employee=` | `attendance:read` | Employee sees only own |
| POST | `/attendance/batch` | Batch body | `attendance:write` | HR only |
| GET | `/attendance/report` | `?month=1&year=2024` | `attendance:read` | Employee sees only own |

### 7.2 Daily Attendance Sheet

**Query Parameters:**
- `date` (required): Format YYYY-MM-DD
- `department` (optional): Filter by department UUID
- `location` (optional): Filter by location UUID
- `shift` (optional): Filter by shift UUID
- `employee` (optional): Filter by employee ID

**Self-Service Enforcement:**
- Employee role: `employee` filter is FORCED to current user's ID
- Other filters (department, location, shift) are cleared for employees

```bash
GET /attendance/daily?date=2024-01-15
Authorization: Bearer <employee_token>

# Expected: Returns only current employee's attendance
# Filters automatically applied by controller
```

**Response Fields:**
```json
{
  "date": "2024-01-15",
  "employees": [
    {
      "employee_id": "EMP002",
      "name": "Huzaifa Kaleem",
      "designation": "Software Engineer",
      "shift": "General",
      "expected_in": "09:00:00",
      "check_in": "09:15:00",
      "check_out": "18:00:00",
      "status": "present",
      "late_by_minutes": 15,
      "notes": "Traffic delay",
      "ack": true
    }
  ]
}
```

### 7.3 Batch Save Attendance

```bash
POST /attendance/batch
Authorization: Bearer <hr_manager_token>
Content-Type: application/json

{
  "date": "2024-01-15",
  "rows": [
    {
      "employee_id": "EMP002",
      "shift_id": "uuid-of-General-Shift",
      "check_in": "09:15:00",
      "check_out": "18:00:00",
      "status": "present",
      "notes": "Late due to traffic",
      "ack": true
    }
  ]
}
```

**Important:** Attendance is saved in batch after HR reviews all entries, not per check-in.

**Employee CANNOT batch save:**
```bash
curl -X POST http://localhost:3000/attendance/batch \
  -H "Authorization: Bearer <employee_token>" \
  -d '{...}'
# Expected: 403 Forbidden
```

### 7.4 Monthly Report

```bash
GET /attendance/report?month=1&year=2024
Authorization: Bearer <employee_token>
```

**Self-Service:** Employee role can only see their own report.

**Response:**
```json
[
  {
    "employee_id": "EMP002",
    "name": "Huzaifa Kaleem",
    "presents": 20,
    "absents": 2,
    "lates": 3,
    "half_days": 0,
    "on_leaves": 5,
    "total_working_days": 30,
    "attendance_percentage": 66.67
  }
]
```

---

## 8. Security Testing Checklist

### 8.1 Self-Service Enforcement Tests

```bash
# Test 1: Employee can only see own employee data
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -d '{"email":"huzaifa.kaleem@company.com","password":"password123"}' | jq -r '.token')

# Should return only EMP002
curl http://localhost:3000/employees -H "Authorization: Bearer $TOKEN" | jq '.[].employee_id'
# Expected: ["EMP002"]

# Test 2: Employee cannot access other employee's data
curl http://localhost:3000/employees/EMP003 -H "Authorization: Bearer $TOKEN" -w "%{http_code}\n"
# Expected: 403

# Test 3: Employee leave requests are self-filtered
curl http://localhost:3000/leave-requests -H "Authorization: Bearer $TOKEN" | jq '.[].employee_id'
# Expected: All items should be "EMP002"

# Test 4: Employee cannot create leave for others
# (employee_id in body is ignored and set to current user)
curl -X POST http://localhost:3000/leave-requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"EMP003","leave_type_id":"...","start_date":"2024-03-01","end_date":"2024-03-05","reason":"Test"}'
# Expected: Creates leave for EMP002, not EMP003

# Test 5: Employee attendance is self-filtered
curl "http://localhost:3000/attendance/daily?date=2024-01-15" -H "Authorization: Bearer $TOKEN" | jq '.employees[].employee_id'
# Expected: ["EMP002"] (only current employee)
```

### 8.2 Configuration Table Security

```bash
# Test all config endpoints with employee token
CONFIG_ENDPOINTS=(
  "/departments"
  "/designations"
  "/employment-types"
  "/job-statuses"
  "/work-modes"
  "/work-locations"
  "/shifts"
  "/leave-types"
  "/leave-policies"
)

for endpoint in "${CONFIG_ENDPOINTS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:3000$endpoint" \
    -H "Authorization: Bearer $TOKEN")
  echo "$endpoint: $STATUS (expected: 403)"
done
```

### 8.3 Input Sanitization Tests

```bash
# Test XSS prevention in employee creation
curl -X POST http://localhost:3000/employees \
  -H "Authorization: Bearer <hr_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP999",
    "name": "<script>alert(1)</script>",
    "father_name": "Test",
    "cnic": "42101-9999999-9",
    "date_of_birth": "1995-01-01"
  }'

# Expected: Script tags removed, name stored as plain text
```

### 8.4 Permission Hierarchy Tests

```bash
# Super Admin - can access everything
SA_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -d '{"email":"zaidbinasif468@gmail.com","password":"zaidkhan123"}' | jq -r '.token')

# Should work
curl http://localhost:3000/departments -H "Authorization: Bearer $SA_TOKEN" -w "%{http_code}\n"
# Expected: 200

# HR Manager - cannot access config
curl http://localhost:3000/departments -H "Authorization: Bearer <hr_manager_token>" -w "%{http_code}\n"
# Expected: 403

# Employee - cannot access config
curl http://localhost:3000/departments -H "Authorization: Bearer <employee_token>" -w "%{http_code}\n"
# Expected: 403
```

### 8.5 Delete Operation Verification

```bash
# Verify DELETE is removed from ALL endpoints
RESOURCES=("users" "departments" "employees" "leave-requests" "attendance")

for resource in "${RESOURCES[@]}"; do
  curl -X DELETE "http://localhost:3000/$resource/123" \
    -H "Authorization: Bearer <super_admin_token>" \
    -w "%{http_code}\n"
  # Expected: 404 or 405
done
```

---

## 9. HTTP Status Code Reference

### Success Codes (2xx)

| Code | Usage |
|------|-------|
| 200 | GET success, UPDATE success |
| 201 | CREATE success (new resource) |

### Client Error Codes (4xx)

| Code | Usage |
|------|-------|
| 400 | Bad request (missing required params) |
| 401 | Unauthorized (no token, invalid token) |
| 403 | Forbidden (authenticated but no permission) |
| 404 | Not found (resource doesn't exist) |
| 405 | Method not allowed (DELETE on any endpoint) |
| 409 | Conflict (duplicate data) |
| 422 | Validation failed (Zod errors) |

### Server Error Codes (5xx)

| Code | Usage |
|------|-------|
| 500 | Internal server error |
| 503 | Service unavailable |

### Error Response Format

```json
// 401 - Authentication errors
{ "error": "Authentication token is required." }
{ "error": "Invalid or expired authentication token." }

// 403 - Authorization errors
{ "error": "Insufficient permissions." }
{ "error": "Access denied. You can only access your own data." }

// 404 - Not found
{ "error": "Employee not found." }
{ "error": "Leave request not found." }

// 409 - Conflict
{ "error": "Email already exists." }
{ "error": "CNIC already exists." }

// 422 - Validation (Zod)
{
  "error": "Validation failed",
  "issues": [
    { "field": "email", "message": "Invalid email format" }
  ]
}

// 500 - Server error
{ "error": "Internal server error" }
```

---

## 10. Complete Test Flow

### 10.1 Employee Self-Service Verification

```bash
# Step 1: Login as Employee
EMP_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -d '{"email":"huzaifa.kaleem@company.com","password":"password123"}' | jq -r '.token')

echo "=== Test 1: Employee can only see own data ==="
curl -s http://localhost:3000/employees -H "Authorization: Bearer $EMP_TOKEN" | jq '.[].employee_id'
# Expected: ["EMP002"]

echo "=== Test 2: Employee cannot access other employee ==="
curl -s http://localhost:3000/employees/EMP003 -H "Authorization: Bearer $EMP_TOKEN" -w "Status: %{http_code}\n"
# Expected: 403

echo "=== Test 3: Employee leave requests are self-filtered ==="
curl -s http://localhost:3000/leave-requests -H "Authorization: Bearer $EMP_TOKEN" | jq '.[].employee_id'
# Expected: All "EMP002"

echo "=== Test 4: Employee cannot access config ==="
curl -s http://localhost:3000/departments -H "Authorization: Bearer $EMP_TOKEN" -w "Status: %{http_code}\n"
# Expected: 403
```

### 10.2 HR vs Employee Access Comparison

```bash
HR_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -d '{"email":"sadia.malik@company.com","password":"password123"}' | jq -r '.token')

EMP_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -d '{"email":"huzaifa.kaleem@company.com","password":"password123"}' | jq -r '.token')

echo "=== HR Manager: All employees ==="
curl -s http://localhost:3000/employees -H "Authorization: Bearer $HR_TOKEN" | jq 'length'
# Expected: 15 (all employees)

echo "=== Employee: Only self ==="
curl -s http://localhost:3000/employees -H "Authorization: Bearer $EMP_TOKEN" | jq 'length'
# Expected: 1 (only EMP002)

echo "=== HR Manager: Config access ==="
curl -s http://localhost:3000/departments -H "Authorization: Bearer $HR_TOKEN" -w "Status: %{http_code}\n"
# Expected: 403

echo "=== Super Admin: Config access ==="
curl -s http://localhost:3000/departments -H "Authorization: Bearer $SA_TOKEN" -w "Status: %{http_code}\n"
# Expected: 200
```

---

## Summary

### Security Features Implemented

1. ✅ **Employee Self-Service** - Employees can only access their own data
2. ✅ **Configuration Table Protection** - Super admin only access
3. ✅ **Input Sanitization** - XSS prevention in request bodies
4. ✅ **Role-Based Access Control** - Proper permission enforcement
5. ✅ **No Delete Operations** - Hard rule compliance
6. ✅ **Permission Bypass Prevention** - All routes properly protected

### Files Modified

- `src/controllers/employee-info-controller.js` - Added self-service checks
- `src/controllers/leave-request-controller.js` - Added self-service checks
- `src/controllers/attendance-controller.js` - Added self-service checks
- `src/routes/*-routes.js` - Added `requirePermission` to all config routes
- `src/middleware/self-service-middleware.js` - New file
- `src/middleware/sanitize-middleware.js` - New file

### Verification Status

| Component | Status |
|-----------|--------|
| Employee Self-Service | ✅ Enforced |
| Config Table Access | ✅ Super admin only |
| Leave Management | ✅ Self-service enforced |
| Attendance Management | ✅ Self-service enforced |
| Input Sanitization | ✅ XSS prevention added |

---

**Document Version:** 3.0 - Security Hardened
**Last Verified:** After implementing all critical security fixes
