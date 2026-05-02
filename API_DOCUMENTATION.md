# EMS API Documentation

**Base URL**: `http://localhost:3001/api`  
**Standard Response Format**:  
Success: `{ "success": true, "data": { ... } }`  
Error: `{ "success": false, "error": { "code": "STRING", "message": "..." } }`

---

## 1. Authentication (`/auth`)

### Login
*   **Endpoint**: `POST /auth/login`
*   **Description**: Authenticates user and sets JWT cookie + CSRF cookie.
*   **Payload**:
    ```json
    { "email": "user@company.com", "password": "password123" }
    ```
*   **Success (200)**: Sets `ems_jwt` cookie. Returns user object.
*   **Error (401)**: Invalid credentials.

### Logout
*   **Endpoint**: `POST /auth/logout`
*   **Auth**: Token required.
*   **Success (200)**: Clears authentication cookies.

### Current Session
*   **Endpoint**: `GET /auth/session`
*   **Auth**: Token required.
*   **Success (200)**: Returns current user ID, employee ID, and role info.

### Change Password
*   **Endpoint**: `POST /auth/change-password`
*   **Auth**: Token required.
*   **Payload**:
    ```json
    { 
      "current_password": "...", 
      "new_password": "..." // Must meet complexity requirements
    }
    ```
*   **Success (200)**: Updates password and issues new JWT.

---

## 2. Employee Management (`/employees`)

### List Employees
*   **Endpoint**: `GET /employees`
*   **Permission**: `employees:read`
*   **Success (200)**: Returns array of employees.

### Get Single Employee
*   **Endpoint**: `GET /employees/:employeeId`
*   **Permission**: `employees:read`
*   **Success (200)**: Returns detailed employee profile.

### Create Employee
*   **Endpoint**: `POST /employees`
*   **Permission**: `employees:write`
*   **Payload**:
    ```json
    {
      "personalInfo": { "name": "...", "father_name": "...", "cnic": "...", "date_of_birth": "..." },
      "jobInfo": { "department_id": "UUID", "designation_id": "UUID", "shift_id": "UUID", "date_of_joining": "YYYY-MM-DD" },
      "accountInfo": { "email": "...", "phone": "..." },
      "extraInfo": { "bank_name": "...", "bank_acc_num": "...", "perment_address": "..." }
    }
    ```
*   **Success (201)**: Returns the created employee object.

### Update Profile
*   **Endpoints**: 
    *   `PATCH /employees/:employeeId/personal`
    *   `PATCH /employees/:employeeId/job`
    *   `PATCH /employees/:employeeId/extra`
*   **Permission**: `employees:write`
*   **Payload**: Partial object matching the section (e.g., `name` for personal).
*   **Success (200)**: Returns updated record (system fields like `updated_at` are stripped).

---

## 3. Attendance (`/attendance`)

### Get Attendance Sheet
*   **Endpoint**: `GET /attendance?date=YYYY-MM-DD&location_id=UUID`
*   **Permission**: `attendance:read`
*   **Success (200)**: Returns attendance list for the specific date and location.

### Save Attendance (Upsert)
*   **Endpoint**: `PUT /attendance/save`
*   **Permission**: `attendance:write`
*   **Payload**:
    ```json
    {
      "date": "YYYY-MM-DD",
      "location_id": "UUID",
      "rows": [
        { "employee_id": "EMP001", "status": "present", "check_in": "HH:MM", "check_out": "HH:MM" }
      ]
    }
    ```
*   **Success (200)**: Success message.

### Acknowledge Attendance
*   **Endpoint**: `PATCH /attendance/:id/ack`
*   **Auth**: Self-service (owning employee) or Admin.
*   **Validation**: `id` must be a valid UUID.
*   **Success (200)**: Marks the record as acknowledged.

---

## 4. Leave Management (`/leave-requests`)

### Submit Leave Request
*   **Endpoint**: `POST /leave-requests`
*   **Permission**: `leave:write` (Self-service applies)
*   **Payload**:
    ```json
    { "leave_type_id": "UUID", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "reason": "..." }
    ```
*   **Success (201)**: Success message.

### Leave Decisions
*   **Endpoints**: 
    *   `PATCH /leave-requests/:id/approve`
    *   `PATCH /leave-requests/:id/reject`
*   **Permission**: `leave:approve`
*   **Payload (Reject only)**: `{ "reason": "Reason for rejection" }`
*   **Success (200)**: Updates request status.

---

## 5. Dashboard & Analytics (`/dashboard`)

### HR Metrics
*   **Endpoint**: `GET /dashboard/metrics?range=6m`
*   **Permission**: `dashboard:read`
*   **Success (200)**: Returns aggregated stats (Headcount, Attendance, Attrition).

### Personal Summary
*   **Endpoint**: `GET /dashboard/me`
*   **Auth**: Token required.
*   **Success (200)**: Returns user's own leave balances, notifications, and upcoming events.

---

## 6. System Configuration (`/config`)

### Get Configuration Entities
*   **Endpoint**: `GET /config/:entity`
*   **Entities**: `shifts`, `departments`, `designations`, `employment-types`, `job-statuses`, `work-modes`, `work-locations`, `leave-types`, `leave-policies`.
*   **Permission**: `config:read`
*   **Success (200)**: Returns array of entity records.

---

## 7. Status Code Reference

| Code | Meaning | Reason |
| :--- | :--- | :--- |
| **200** | OK | Request succeeded. |
| **201** | Created | Resource successfully created. |
| **401** | Unauthorized | No token or invalid token provided. |
| **403** | Forbidden | Insufficient permissions (RBAC) or mandatory password change required. |
| **404** | Not Found | Route or database record does not exist. |
| **422** | Unprocessable | Validation failed (e.g., malformed UUID or missing field). |
| **500** | Server Error | Database error or unexpected server-side logic failure. |
