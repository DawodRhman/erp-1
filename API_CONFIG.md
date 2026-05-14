# Configuration API

**Base Path:** `/api/config`  
**Total Endpoints:** 3

Configuration endpoints manage lookup tables and system configuration entities like departments, designations, shifts, leave types, etc. These are dynamic configuration values that the system uses as reference data.

---

> **Note:** All configuration data is populated by `seeds/master_seed.js` with the values shown below.

---

## Overview

The Configuration API is a **generic** endpoint that operates on different entity types via the `:entity` path parameter. The request/response schemas vary depending on which entity you're working with.

### Supported Entities

| Entity Name        | Description                                        | Key Fields                                                            |
| ------------------ | -------------------------------------------------- | --------------------------------------------------------------------- |
| `departments`      | Company departments                                | `department_code`, `department_name`, `parent_department_id`          |
| `designations`     | Job titles/positions                               | `title`, `is_active`                                                  |
| `employment-types` | Employment types (FT, PT, Contract)                | `type_name`, `is_active`                                              |
| `job-statuses`     | Employment status (active, on_leave, terminated)   | `status_name`, `is_active`                                            |
| `work-modes`       | Work mode (onsite, remote, hybrid)                 | `mode_name`, `is_active`                                              |
| `work-locations`   | Branch/location info                               | `location_name`, `is_active`                                          |
| `shifts`           | Work shift definitions                             | `name`, `start_time`, `end_time`, `late_after_minutes`, `is_active`   |
| `leave-types`      | Types of leave (annual, sick, casual)              | `name`, `is_active`                                                   |
| `leave-policies`   | Leave allocation policies per department/type/year | `department_id`, `leave_type_id`, `days_allowed`, `year`, `is_active` |
| `leave-capacity`   | Department capacity limits for concurrent leaves   | `department_id`, `max_percent`, `is_active`                           |
| `penalty-rules`    | Penalty rule definitions                           | `name`, `amount_pkr`, `type`, `is_active`                             |
| `allowance-types`  | Allowance types for payroll                        | `field_name`, `is_active`                                             |

**Note:** The `:entity` path parameter must be one of the values listed above (plural form).
For `allowance-types`, permissions use the `allowances:` prefix (for example, `allowances:read`, `allowances:write`) instead of `config:`.

---

## GET /config/:entity

Retrieve all records for a given configuration entity. Requires `config:read` permission.

**Authentication:** Required  
**Permissions:** `config:read`

### Path Parameters

| Parameter | Type   | Description                                                                         |
| --------- | ------ | ----------------------------------------------------------------------------------- |
| `entity`  | String | Entity type from the supported list (e.g., `departments`, `designations`, `shifts`) |

### Query Parameters

Varies by entity - typically none.

### Response Body

**Success (200 OK):**

```json
{
  "success": true,
  "data": [
    // Array of records for the requested entity
  ]
}
```

**Examples by entity:**

All examples below reflect the actual seed data from `seeds/master_seed.js`. Note: `id` and `created_at` values will differ in your database.

**GET /config/departments:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "department_code": "DEPT-IT",
      "department_name": "IT",
      "parent_department_id": null,
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-IT-SUP",
      "department_name": "IT-Support",
      "parent_department_id": "uuid-of-DEPT-IT",
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-IT-DEV",
      "department_name": "IT-Development",
      "parent_department_id": "uuid-of-DEPT-IT",
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-SWE",
      "department_name": "Software Engineering",
      "parent_department_id": null,
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-SWE-FE",
      "department_name": "Frontend",
      "parent_department_id": "uuid-of-DEPT-SWE",
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-SWE-BE",
      "department_name": "Backend",
      "parent_department_id": "uuid-of-DEPT-SWE",
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-SWE-MOB",
      "department_name": "Mobile",
      "parent_department_id": "uuid-of-DEPT-SWE",
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-SWE-QA",
      "department_name": "QA",
      "parent_department_id": "uuid-of-DEPT-SWE",
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-SWE-DEVOPS",
      "department_name": "DevOps",
      "parent_department_id": "uuid-of-DEPT-SWE",
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-HR",
      "department_name": "HR",
      "parent_department_id": null,
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-SALES",
      "department_name": "Sales",
      "parent_department_id": null,
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-SALES-KHI",
      "department_name": "Sales-Karachi",
      "parent_department_id": "uuid-of-DEPT-SALES",
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-SALES-LHR",
      "department_name": "Sales-Lahore",
      "parent_department_id": "uuid-of-DEPT-SALES",
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-SALES-ISB",
      "department_name": "Sales-Islamabad",
      "parent_department_id": "uuid-of-DEPT-SALES",
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-PROC",
      "department_name": "Procurement",
      "parent_department_id": null,
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-FIN",
      "department_name": "Finance",
      "parent_department_id": null,
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-OPS",
      "department_name": "Operations",
      "parent_department_id": null,
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-OPS-FE",
      "department_name": "Field-Engineering",
      "parent_department_id": "uuid-of-DEPT-OPS",
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-OPS-INST",
      "department_name": "Installations",
      "parent_department_id": "uuid-of-DEPT-OPS",
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-CS",
      "department_name": "Customer-Support",
      "parent_department_id": null,
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "department_code": "DEPT-ADM",
      "department_name": "Administration",
      "parent_department_id": null,
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    }
  ]
}
```

**GET /config/designations:**

```json
{
  "success": true,
  "data": [
    { "id": "uuid-here", "title": "CEO", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "COO", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "CFO", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "CTO", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "General Manager", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Deputy General Manager", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "HR Manager", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "HR Executive", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "HR Officer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "HR Intern", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "IT Manager", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "IT Support Engineer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Network Engineer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "System Administrator", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Software Engineering Manager", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Tech Lead", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Principal Engineer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Senior Software Engineer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Software Engineer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Junior Software Engineer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Associate Developer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Frontend Developer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Senior Frontend Developer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Backend Developer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Senior Backend Developer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Mobile Developer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Senior Mobile Developer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "DevOps Engineer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Senior DevOps Engineer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "QA Engineer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Senior QA Engineer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "QA Lead", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "UI/UX Designer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Sales Manager", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Senior Sales Executive", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Sales Executive", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Sales Intern", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Procurement Manager", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Procurement Officer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Finance Manager", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Finance Officer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Accountant", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Operations Manager", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Field Engineer", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Installation Technician", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Team Lead", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Customer Support Manager", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "title": "Support Executive", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" }
  ]
}
```

**GET /config/employment-types:**

```json
{
  "success": true,
  "data": [
    { "id": "uuid-here", "type_name": "Full-Time", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "type_name": "Part-Time", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "type_name": "Contract", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "type_name": "Internship", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "type_name": "Probationary", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" }
  ]
}
```

**GET /config/job-statuses:**

```json
{
  "success": true,
  "data": [
    { "id": "uuid-here", "status_name": "Active", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "status_name": "Probation", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "status_name": "On Leave", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "status_name": "Suspended", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "status_name": "Terminated", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "status_name": "Resigned", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" }
  ]
}
```

**GET /config/work-modes:**

```json
{
  "success": true,
  "data": [
    { "id": "uuid-here", "mode_name": "On-Site", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "mode_name": "Remote", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "mode_name": "Hybrid", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "mode_name": "Field", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" }
  ]
}
```

**GET /config/work-locations:**

```json
{
  "success": true,
  "data": [
    { "id": "uuid-here", "location_name": "Head Office - Karachi", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "location_name": "Branch Office - Lahore", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "location_name": "Branch Office - Islamabad", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "location_name": "Warehouse - Karachi", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "location_name": "Client Site - Karachi", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "location_name": "Client Site - Lahore", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" }
  ]
}
```

**GET /config/shifts:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "name": "Morning Shift",
      "start_time": "08:00",
      "end_time": "17:00",
      "late_after_minutes": 15,
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "name": "Evening Shift",
      "start_time": "14:00",
      "end_time": "22:00",
      "late_after_minutes": 15,
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "name": "Night Shift",
      "start_time": "22:00",
      "end_time": "06:00",
      "late_after_minutes": 20,
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "name": "Field Shift",
      "start_time": "09:00",
      "end_time": "18:00",
      "late_after_minutes": 30,
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    },
    {
      "id": "uuid-here",
      "name": "Flexible Shift",
      "start_time": "10:00",
      "end_time": "19:00",
      "late_after_minutes": 30,
      "is_active": true,
      "created_at": "2026-05-14T00:00:00.000Z"
    }
  ]
}
```

**GET /config/leave-types:**

```json
{
  "success": true,
  "data": [
    { "id": "uuid-here", "name": "Annual Leave", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "name": "Sick Leave", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "name": "Casual Leave", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "name": "Maternity Leave", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "name": "Paternity Leave", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "name": "Unpaid Leave", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "name": "Compensatory Leave", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "name": "Bereavement Leave", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" }
  ]
}
```

**GET /config/allowance-types:**

```json
{
  "success": true,
  "data": [
    { "id": "uuid-here", "field_name": "House Rent Allowance", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "field_name": "Medical Allowance", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "field_name": "Transport Allowance", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "field_name": "Fuel Allowance", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "field_name": "Mobile Allowance", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "field_name": "Utility Allowance", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "field_name": "Performance Bonus", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "field_name": "Overtime Allowance", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" }
  ]
}
```

**GET /config/permissions** (permissions are also managed via the config API):

```json
{
  "success": true,
  "data": [
    { "id": "uuid-here", "permission_key": "config:read", "description": "Read system configuration", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "config:write", "description": "Write system configuration (includes POST /api/config/:entity)", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "config:manage", "description": "Legacy alias — kept for parity with older seeds", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "employees:read", "description": "View employee records", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "employees:write", "description": "Create / update employees", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "salary:read", "description": "Read salary", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "salary:write", "description": "Salary revisions", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "allowances:read", "description": "Read allowances", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "allowances:write", "description": "Manage allowances", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "leave:read", "description": "Read leave", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "leave:write", "description": "Submit leave", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "leave:approve", "description": "Approve leave", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "leave_capacity:read", "description": "Read leave capacity", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "leave_capacity:write", "description": "Manage leave capacity", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "attendance:read", "description": "Read attendance", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "attendance:write", "description": "Write attendance", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "attendance:submit_ho", "description": "Submit attendance to HO", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "attendance:unlock", "description": "Unlock attendance", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "calendar:read", "description": "Read calendar", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "calendar:write", "description": "Write calendar", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "notifications:read", "description": "Read notifications", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "notifications:write", "description": "Create notifications", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "alerts:read", "description": "Urgent alerts", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "pending_actions:read", "description": "Pending actions", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "dashboard:read", "description": "Dashboard", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "directory:read", "description": "Directory read", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "directory:write", "description": "Directory write", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "inventory:read", "description": "Inventory read", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "inventory:write", "description": "Inventory write", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "purchasing:read", "description": "Purchasing read", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "purchasing:write", "description": "Purchasing write", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "purchasing:approve", "description": "Purchasing approve", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "hr:full_access", "description": "HR full access placeholder", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "payroll:read", "description": "Payroll read placeholder", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "payroll:write", "description": "Payroll write placeholder", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "penalty_rules:write", "description": "Penalty rules CRUD", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "penalties:propose", "description": "Propose penalties", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "penalties:review", "description": "Review penalties", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "penalties:read_own", "description": "Own penalties", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "penalties:read_all", "description": "All penalties", "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "permission_key": "reports:read", "description": "Reports", "created_at": "2026-05-14T00:00:00.000Z" }
  ]
}
```

**GET /config/penalty-rules:**

```json
{
  "success": true,
  "data": [
    { "id": "uuid-here", "field_name": "Late Attendance", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "field_name": "Absent Without Leave", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "field_name": "Leave Policy Violation", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" },
    { "id": "uuid-here", "field_name": "Safety Violation", "is_active": true, "created_at": "2026-05-14T00:00:00.000Z" }
  ]
}
```

**Error Responses:**

- `404 Not Found`: Entity name is not recognized/supported

---

## POST /config/:entity

Create a new record for the specified entity. Requires `config:write` permission.

**Authentication:** Required  
**Permissions:** `config:write`

### Path Parameters

| Parameter | Type   | Description                      |
| --------- | ------ | -------------------------------- |
| `entity`  | String | Entity type (same list as above) |

### Request Body

The schema varies by entity. See the table below for required fields per entity.

**General Pattern:**

```json
{
  // Entity-specific fields
}
```

**Schemas by Entity:**

**departments:**

```json
{
  "department_code": "string (min 1, required)",
  "department_name": "string (min 1, required)",
  "parent_department_id": "UUID or null (optional)"
}
```

**designations:**

```json
{
  "title": "string (min 1, max 50, required)",
  "is_active": "boolean (optional, default: true)"
}
```

**employment-types:**

```json
{
  "type_name": "string (min 1, max 50, required)",
  "is_active": "boolean (optional, default: true)"
```

**job-statuses:**

```json
{
  "status_name": "string (min 1, max 50, required)",
  "is_active": "boolean (optional, default: true)"
}
```

**work-modes:**

```json
{
  "mode_name": "string (min 1, max 50, required)",
  "is_active": "boolean (optional, default: true)"
}
```

**work-locations:**

```json
{
  "location_name": "string (min 1, max 100, required)",
  "is_active": "boolean (optional, default: true)"
}
```

**shifts:**

```json
{
  "name": "string (min 1, required)",
  "start_time": "string (HH:MM format, required)",
  "end_time": "string (HH:MM format, required)",
  "late_after_minutes": "integer >= 0 (optional, default: 15)",
  "is_active": "boolean (optional, default: true)"
}
```

**leave-types:**

```json
{
  "name": "string (min 1, max 50, required)",
  "is_active": "boolean (optional, default: true)"
}
```

**leave-policies:**

```json
{
  "department_id": "UUID (required)",
  "leave_type_id": "UUID (required)",
  "days_allowed": "integer >= 0 (required)",
  "year": "integer (min 2000, required)",
  "is_active": "boolean (optional, default: true)"
}
```

**leave-capacity:**

```json
{
  "department_id": "UUID (required)",
  "max_percent": "integer (1-100, required)",
  "is_active": "boolean (optional, default: true)"
}
```

**penalty-rules:**

```json
{
  "name": "string (min 1, required)",
  "amount_pkr": "number >= 0 (required)",
  "type": "enum: 'flat' | 'percentage' (required)",
  "is_active": "boolean (optional, default: true)"
}
```

**Example Request (Creating a Department):**

```json
{
  "department_code": "FIN",
  "department_name": "Finance",
  "parent_department_id": null
}
```

**Example Request (Creating a Shift):**

```json
{
  "name": "Evening Shift",
  "start_time": "14:00",
  "end_time": "22:00",
  "late_after_minutes": 15
}
```

### Response Body

**Success (201 Created):**
Returns the newly created record with its assigned `id` and timestamps.

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "department_code": "FIN",
    "department_name": "Finance",
    "parent_department_id": null,
    "is_active": true,
    "created_at": "2025-05-06T12:30:00.000Z"
  }
}
```

**Error Responses:**

- `422 Validation Error`: Validation fails (missing required fields, invalid format)
- `404 Not Found`: Entity type not recognized
- `409 Conflict`: Duplicate code/name (e.g., department_code already exists)

---

## PATCH /config/:entity/:id

Update an existing configuration record. Requires `config:write` permission.

**Authentication:** Required  
**Permissions:** `config:write`

### Path Parameters

| Parameter | Type   | Description         |
| --------- | ------ | ------------------- |
| `entity`  | String | Entity type         |
| `id`      | UUID   | Record ID to update |

### Request Body

All fields are optional (partial update). Provide only the fields you want to change. Schema is the same as for POST but all fields optional.

**Example Request (Update Department Name):**

```json
{
  "department_name": "Finance & Accounts"
}
```

**Example Request (Update Shift Times):**

```json
{
  "start_time": "13:30",
  "end_time": "21:30"
}
```

### Response Body

**Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "department_code": "FIN",
    "department_name": "Finance & Accounts",
    "parent_department_id": null,
    "is_active": true,
    "updated_at": "2025-05-06T13:00:00.000Z"
  }
}
```

**Error Responses:**

- `404 Not Found`: Record ID doesn't exist or entity type invalid
- `422 Validation Error`: Invalid data provided
- `409 Conflict`: Duplicate value on unique constraint

---

## Notes

- **Entity Validation:** The `:entity` path parameter must exactly match one of the supported entity names (plural). Case-sensitive.
- **Dynamic Schemas:** The backend uses a schema map (`entitySchemaMap` in config.controller.js) to validate requests based on entity type.
- **Soft Deletes:** There is no DELETE endpoint. To deactivate a record, set `is_active: false` via PATCH.
- **Lookup References:** Other parts of the API reference these configuration records by their UUIDs (e.g., `department_id`, `designation_id`, `shift_id`). Ensure you use valid UUIDs when creating employees or job info.
- **Parent-Child Relationships:** Departments support hierarchical structure via `parent_department_id` (self-referencing foreign key).
- **Leave Policies:** These define how many leave days each department/type combination gets per year. They are referenced when calculating leave balances during approval.
