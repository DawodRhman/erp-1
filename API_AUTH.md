# Authentication API

**Base Path:** `/api/auth`  
**Total Endpoints:** 4

Authentication endpoints handle user login, session management, and password changes.

---

## POST /auth/login

Authenticate user and receive JWT token and session cookies.

**Authentication:** Not required (public endpoint)  
**Permissions:** None

### Request Body

**Schema:**
```json
{
  "email": "string (valid email format, required)",
  "password": "string (minimum 1 character, required)"
}
```

**Field Details:**

| Field | Type | Required | Nullable | Validation | Description |
|-------|------|----------|----------|------------|-------------|
| `email` | String | Yes | No | Valid email format | User's registered email address |
| `password` | String | Yes | No | Min 1 character | User's plaintext password |

**Example Request (Test Payload):**
```json
{
  "email": "ahmed.khan@company.com",
  "password": "MyPass123!"
}
```

### Response Body

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "ahmed.khan@company.com",
      "employee_id": "EMP001",
      "must_change_password": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Fields in `data.user`:**
- `id` (UUID): User account ID
- `email` (String): User's email
- `employee_id` (String): Associated employee code
- `must_change_password` (Boolean): Whether password change is forced

**Error Responses:**
- `401 Unauthorized`: Invalid email or password
- `422 Validation Error`: Missing required fields

### Example cURL

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ahmed.khan@company.com",
    "password": "MyPass123!"
  }'
```

---

## POST /auth/logout

Logout user and clear session cookies.

**Authentication:** Required (Bearer token or cookies)  
**Permissions:** None

### Request Body
None.

### Response Body

**Success (200 OK):**
```json
{
  "success": true,
  "data": null
}
```

**Example cURL:**

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json"
```

---

## GET /auth/session

Verify current session and retrieve authenticated user information.

**Authentication:** Required (Bearer token or cookies)  
**Permissions:** None

### Request Body
None.

### Query Parameters
None.

### Response Body

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "employee_id": "EMP001",
    "role_id": "f1e2d3c4-b5a6-7890-defg-hijklmnopqrs",
    "role_name": "hr_manager",
    "must_change_password": false,
    "email": "ahmed.khan@company.com"
  }
}
```

**Fields in `data`:**
- `user_id` (UUID): User account ID
- `employee_id` (String): Employee code
- `role_id` (UUID): Role assigned to user
- `role_name` (String): Human-readable role name (e.g., `hr_manager`, `super_admin`, `employee`)
- `must_change_password` (Boolean): Password change required flag
- `email` (String): User's email address

**Error Responses:**
- `401 Unauthorized`: Invalid, expired, or missing token

**Example cURL:**

```bash
curl -X GET http://localhost:3001/api/auth/session \
  -H "Authorization: Bearer <your_token>"
```

---

## POST /auth/change-password

Change the authenticated user's password. Requires the current password and a new password meeting complexity requirements.

**Authentication:** Required  
**Permissions:** None

### Request Body

**Schema:**
```json
{
  "current_password": "string (minimum 1 character, required)",
  "new_password": "string (minimum 8 characters, must match password policy regex, required)"
}
```

**Password Policy (Regex):**
```
^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$
```

Requirements:
- Minimum 8 characters
- At least one lowercase letter (a-z)
- At least one uppercase letter (A-Z)
- At least one digit (0-9)
- At least one special character (non-alphanumeric)

**Field Details:**

| Field | Type | Required | Nullable | Validation | Description |
|-------|------|----------|----------|------------|-------------|
| `current_password` | String | Yes | No | Min 1 char | Current password for verification |
| `new_password` | String | Yes | No | 8+ chars, regex pattern | New password meeting all requirements |

**Example Request (Test Payload):**
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewStrongPass456!"
}
```

### Response Body

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Password changed."
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Current password is incorrect
- `422 Validation Error`: New password doesn't meet complexity requirements

**Example cURL:**

```bash
curl -X POST http://localhost:3001/api/auth/change-password \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "OldPass123!",
    "new_password": "NewStrongPass456!"
  }'
```

---

## Notes

- The `login` endpoint sets two cookies: `ems_jwt` (HTTP-only, contains JWT) and `ems_csrf` (CSRF token). Browsers send these automatically on subsequent requests.
- You can also use the JWT token directly in the `Authorization: Bearer <token>` header.
- Tokens expire according to `JWT_EXPIRES_IN` environment variable (default: 1 day).
- All auth endpoints use the standard response format: `{ success: boolean, data?: any, error?: { code, message, details? } }`

---

## Demo Credentials

For development and testing, the seed script creates a super admin user:

> **Email:** `superadmin@esspl.com.pk`  
> **Password:** `SuperAdmin@123!`

This account has full system access via the `super_admin` role.

---

## Roles & Permissions

The system implements role-based access control (RBAC). The seed script creates the following roles with their associated permissions:

### Role Summary

| Role | Description | Approx. Permissions |
|------|-------------|---------------------|
| `super_admin` | Full system access | All permissions |
| `hr_manager` | HR Manager | 30 permissions |
| `hr_executive` | HR Executive | 13 permissions |
| `it_manager` | IT Manager | 4 permissions |
| `swe_manager` | Software Engineering Manager | 4 permissions |
| `tech_lead` | Technical Lead | 4 permissions |
| `sales_manager` | Sales Manager | 3 permissions |
| `procurement_manager` | Procurement Manager | 4 permissions |
| `finance_manager` | Finance Manager | 3 permissions |
| `operations_manager` | Operations Manager | 3 permissions |
| `employee` | Standard employee | 6 permissions |

### Detailed Permission Mappings

**super_admin**
All permissions in the system (full access).

**hr_manager**
```
config:read, config:write
employees:read, employees:write
salary:read, salary:write
allowances:read, allowances:write
leave:read, leave:write, leave:approve
leave_capacity:read, leave_capacity:write
attendance:read, attendance:write, attendance:submit_ho
calendar:read, calendar:write
notifications:read, notifications:write
alerts:read
pending_actions:read
dashboard:read
directory:read, directory:write
penalty_rules:write
penalties:propose, penalties:review, penalties:read_all
reports:read
```

**hr_executive**
```
config:read
employees:read
leave:read, leave:write
attendance:read, attendance:write
calendar:read
notifications:read, notifications:write
pending_actions:read
alerts:read
directory:read
penalties:propose, penalties:read_all
```

**it_manager**
```
employees:read
directory:read
calendar:read
notifications:read
```

**swe_manager**
```
employees:read
directory:read
calendar:read
notifications:read
```

**tech_lead**
```
employees:read
directory:read
calendar:read
notifications:read
```

**sales_manager**
```
employees:read
directory:read
dashboard:read
```

**procurement_manager**
```
purchasing:read, purchasing:write, purchasing:approve
inventory:read
```

**finance_manager**
```
salary:read
reports:read
dashboard:read
```

**operations_manager**
```
attendance:read
directory:read
dashboard:read
```

**employee**
```
leave:read, leave:write
attendance:read
notifications:read
calendar:read
directory:read
```

---

## Seeding Instructions

To populate the database with demo data, run the master seed script:

```bash
node seeds/master_seed.js
```

**Prerequisites:**
- `DATABASE_URL` environment variable must be set (see `.env.example`)
- PostgreSQL database must be running and accessible

**What the seed creates:**
- 520 employee records (EMP001 .. EMP520)
- 21 departments (with hierarchical tree structure)
- Complete lookup data: designations, employment types, job statuses, work modes, work locations, shifts
- All permission keys and role-permission mappings
- Leave types, allowance types
- 60+ products across 12 categories
- Attendance records, leave balances, and HR-related data

**API Smoke Test (optional):**
Set `SEED_USE_API=1` to run a basic API verification after database seeding. This requires the backend server to be running on the port specified by `PORT` (default 3001):

```bash
SEED_USE_API=1 node seeds/master_seed.js
```

The smoke test:
1. POST `/api/auth/login` with superadmin credentials
2. GET `/api/config/departments` with the obtained token

**Note:** The primary seed path uses direct PostgreSQL pool queries for reliability. The API smoke test is optional and only verifies that the auth and config endpoints are responding correctly.
