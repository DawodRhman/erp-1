# EMS Backend — Team API Reference (Internal)

**Base URL**: `http://localhost:3001/api`  
**Global Header**: `Authorization: Bearer <TOKEN>` (Not needed for `/auth/login`)

---

## 1. Authentication (`/auth`)

### [POST] Login
*   **Path**: `/auth/login`
*   **Body**:
    ```json
    {
      "email": "user@company.com",
      "password": "password123"
    }
    ```
*   **Returns (200)**: Sets HTTP-Only cookie `ems_jwt`.
    ```json
    {
      "success": true,
      "data": {
        "user": { "id": "UUID", "email": "...", "employee_id": "EMP...", "must_change_password": false }
      }
    }
    ```

### [POST] Logout
*   **Path**: `/auth/logout`
*   **Returns (200)**: Clears cookies.

### [GET] Session Info
*   **Path**: `/auth/session`
*   **Returns (200)**: Current user/role/employee details from token.

### [POST] Change Password
*   **Path**: `/auth/change-password`
*   **Body**:
    ```json
    {
      "current_password": "...",
      "new_password": "..." // Complexity: min 8 chars, Upper, Lower, Digit, Symbol
    }
    ```

---

## 2. Employee Management (`/employees`)

### [GET] List Employees
*   **Path**: `/employees`
*   **Permissions**: `employees:read`
*   **Returns (200)**: `data: [{ employee_id, name, department, designation, ... }]`

### [POST] Create Employee
*   **Path**: `/employees`
*   **Permissions**: `employees:write`
*   **Body**:
    ```json
    {
      "personalInfo": { "name": "...", "father_name": "...", "cnic": "...", "date_of_birth": "YYYY-MM-DD" },
      "jobInfo": { "department_id": "UUID", "designation_id": "UUID", "employment_type_id": "UUID", "job_status_id": "UUID", "work_mode_id": "UUID", "work_location_id": "UUID", "shift_id": "UUID", "date_of_joining": "YYYY-MM-DD" },
      "accountInfo": { "email": "...", "phone": "...", "role_id": "UUID" },
      "extraInfo": { "contact_1": "...", "bank_name": "...", "bank_acc_num": "...", "perment_address": "...", "postal_address": "..." }
    }
    ```

### [PATCH] Update Sections
*   **Paths**: 
    *   `/employees/:employeeId/personal`
    *   `/employees/:employeeId/job`
    *   `/employees/:employeeId/extra`
*   **Permissions**: `employees:write`
*   **Body**: Partial object matching the schema.

---

## 3. Attendance (`/attendance`)

### [GET] Daily Sheet
*   **Path**: `/attendance?date=YYYY-MM-DD&location_id=UUID`
*   **Permissions**: `attendance:read`

### [PUT] Save Sheet
*   **Path**: `/attendance/save`
*   **Permissions**: `attendance:write`
*   **Body**:
    ```json
    {
      "date": "YYYY-MM-DD",
      "location_id": "UUID",
      "rows": [
        { "employee_id": "EMP...", "status": "present", "check_in": "HH:MM", "check_out": "HH:MM", "notes": "..." }
      ]
    }
    ```

### [PATCH] Employee Acknowledgment
*   **Path**: `/attendance/:id/ack`
*   **Constraint**: `:id` must be valid UUID. Employee can only ack their own.

---

## 4. Leave Management (`/leave-requests`)

### [POST] Submit Leave
*   **Path**: `/leave-requests`
*   **Body**:
    ```json
    {
      "leave_type_id": "UUID",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "reason": "..."
    }
    ```

### [PATCH] Approval/Rejection
*   **Paths**: 
    *   `/leave-requests/:id/approve`
    *   `/leave-requests/:id/reject`
*   **Permissions**: `leave:approve`
*   **Reject Body**: `{ "reason": "..." }`

---

## 5. Dashboard (`/dashboard`)

### [GET] HR Metrics
*   **Path**: `/dashboard/metrics?range=6m` (range can be 6m or 12m)
*   **Permissions**: `dashboard:read`

### [GET] Personal Summary
*   **Path**: `/dashboard/me`
*   **Returns**: Self leave balance, pending notifications, upcoming calendar events.

---

## 6. Global Configuration (`/config`)

### [GET] Lookup Data
*   **Path**: `/config/:entity`
*   **Entities**: `departments`, `designations`, `employment-types`, `job-statuses`, `work-modes`, `work-locations`, `shifts`, `leave-types`, `leave-policies`, `penalty-rules`.
*   **Permissions**: `config:read`

### [POST/PATCH] Manage Config
*   **Path**: `/config/:entity` or `/config/:entity/:id`
*   **Permissions**: `config:write`

---

## 7. Penalties (`/penalties`)

### [POST] Propose Penalty
*   **Path**: `/penalties`
*   **Permissions**: `penalties:propose`
*   **Body**:
    ```json
    {
      "employee_id": "EMP...",
      "rule_id": "UUID",
      "date": "YYYY-MM-DD",
      "reason": "..."
    }
    ```

### [PATCH] Review Penalty
*   **Paths**: `/penalties/:id/approve` or `/reject`
*   **Permissions**: `penalties:review`

---

## 8. Error Codes (Standard)

| Status | Code | Meaning |
| :--- | :--- | :--- |
| **401** | `UNAUTHORIZED` | Token missing or expired. |
| **403** | `FORBIDDEN` | RBAC failure or `MUST_CHANGE_PASSWORD`. |
| **422** | `VALIDATION_ERROR` | Schema mismatch (check `details` array). |
| **404** | `NOT_FOUND` | Path or Record doesn't exist. |
| **500** | `INTERNAL_SERVER_ERROR` | Unexpected crash. |
