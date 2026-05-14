# Dashboard API

**Base Path:** `/api/dashboard`  
**Total Endpoints:** 4

Dashboard endpoints provide metrics, analytics, pending actions, and urgent alerts for HR and employees.

---

## GET /dashboard/metrics

Retrieve HR-level metrics and analytics. This endpoint provides high-level statistics about the organization including employee counts, leave trends, attendance summaries, etc. Requires `dashboard:read` permission.

**Authentication:** Required  
**Permissions:** `dashboard:read`

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `range` | Enum | Time range for trend data: `"6m"` (6 months) or `"12m"` (12 months). Default: `"6m"` |

### Response Body

Success response returns an object containing the following fields:

**Top-level fields:**

| Field | Type | Description |
|-------|------|-------------|
| `total_employees` | Number | Total count of employees in the system |
| `new_this_month` | Number | Count of employees who joined this month (based on `job_info.date_of_joining`) |
| `department_count` | Number | Count of active departments (`departments.is_active = true`) |
| `present_today` | Number | Count of employees marked present, late, or half_day for today |
| `present_today_percent` | Number | Percentage of present employees (present_today / total_employees, rounded to 1 decimal) |
| `on_leave_today` | Number | Count of employees with approved leave requests covering today |
| `penalties_this_month` | Object | Placeholder: `{ "coming_soon": true, "count": 0, "amount_pkr": 0 }` |
| `attendance_trend` | Array | Monthly attendance summary for the selected range. Each object: `{ month: string, present: number, absent: number, late: number }` |
| `headcount_trend` | Array | Monthly headcount trend for the selected range. Each object: `{ month: string, count: number }` |
| `upcoming_birthdays` | Array | Employees with birthdays in the current month, sorted by `days_until`. Each object: `{ employee_id: string, name: string, date_of_birth: string, days_until: number }` |
| `pending_actions` | Array | Employees with missing required fields. Each object: `{ employee_id: string, name: string, missing_fields: string[] }` |
| `urgent_alerts` | Array | Active urgent alerts expiring within lookahead window. Each object: `{ employee_id: string, name: string, type: string, expiry_date: string, days_remaining: number }` |

**Notes on fields:**

- `attendance_trend.month`: Short month name like `"Jan"`, `"Feb"`, etc.
- `headcount_trend.month`: Short month name like `"Jan"`, `"Feb"`, etc.
- `upcoming_birthdays.days_until`: Days until the birthday in the current year. If the birthday already passed this year, value is `0`.
- `pending_actions.missing_fields`: Currently includes `"bank_account"` and `"emergency_contact"` for employees missing those records.
- `urgent_alerts.type`: One of `"probation_end"`, `"contract_expiry"`, `"medical_exam_due"`, `"cnic_expiry"`.
- `urgent_alerts.days_remaining`: Can be negative if the expiry date has passed (overdue alerts).

**Example response (trimmed arrays):**

```json
{
  "success": true,
  "data": {
    "total_employees": 520,
    "new_this_month": 8,
    "department_count": 21,
    "present_today": 387,
    "present_today_percent": 74.4,
    "on_leave_today": 12,
    "penalties_this_month": {
      "coming_soon": true,
      "count": 0,
      "amount_pkr": 0
    },
    "attendance_trend": [
      { "month": "May", "present": 12500, "absent": 850, "late": 420 },
      { "month": "Apr", "present": 11800, "absent": 920, "late": 380 }
    ],
    "headcount_trend": [
      { "month": "May", "count": 520 },
      { "month": "Apr", "count": 512 }
    ],
    "upcoming_birthdays": [
      {
        "employee_id": "EMP042",
        "name": "Fatima Ali",
        "date_of_birth": "1995-05-20",
        "days_until": 6
      }
    ],
    "pending_actions": [
      {
        "employee_id": "EMP105",
        "name": "Muhammad Hassan",
        "missing_fields": ["bank_account"]
      },
      {
        "employee_id": "EMP218",
        "name": "Ayesha Khan",
        "missing_fields": ["emergency_contact"]
      }
    ],
    "urgent_alerts": [
      {
        "employee_id": "EMP456",
        "name": "Bilal Ahmed",
        "type": "probation_end",
        "expiry_date": "2026-06-15",
        "days_remaining": 34
      },
      {
        "employee_id": "EMP389",
        "name": "Sana Malik",
        "type": "contract_expiry",
        "expiry_date": "2026-05-20",
        "days_remaining": 8
      }
    ]
  }
}
```

**Example cURL:**

```bash
curl -X GET "http://localhost:3001/api/dashboard/metrics?range=12m" \
  -H "Authorization: Bearer <your_token>"
```

---

## GET /dashboard/me

Retrieve personalized dashboard metrics for the authenticated employee. Shows employee-specific data like their own leave balance, recent attendance, upcoming leaves, etc. No special permission required beyond authentication.

**Authentication:** Required  
**Permissions:** None

### Query Parameters
None.

### Response Body

**Success response returns an object containing:**

| Field | Type | Description |
|-------|------|-------------|
| `attendance_summary` | Object | Current month's attendance for the employee: `{ presents, absents, lates, half_days, month }` |
| `leave_balances` | Array | Leave balance for each leave type. Each: `{ leave_type_id, name, balance, used, remaining }` |
| `leave_wallet` | Array | Same as `leave_balances` (alias for compatibility) |
| `active_penalties` | Array | Penalties where `status = 'approved'` and `employee_ack = false`. Each includes rule details and review info |
| `recent_attendance` | Array | Last ~6 attendance records with date, status, check_in, check_out |
| `leave_requests` | Array | Recent leave requests (limited, ordered by created_at desc) |
| `upcoming_birthdays` | Array | Same format as `/metrics` - employees with birthdays in current month |

**Example response:**

```json
{
  "success": true,
  "data": {
    "attendance_summary": {
      "presents": 18,
      "absents": 1,
      "lates": 2,
      "half_days": 0,
      "month": "May 2026"
    },
    "leave_balances": [
      {
        "leave_type_id": "1",
        "name": "Annual Leave",
        "balance": 14,
        "used": 3,
        "remaining": 11
      },
      {
        "leave_type_id": "2",
        "name": "Sick Leave",
        "balance": 10,
        "used": 0,
        "remaining": 10
      }
    ],
    "leave_wallet": [
      {
        "leave_type_id": "1",
        "name": "Annual Leave",
        "balance": 14,
        "used": 3,
        "remaining": 11
      }
    ],
    "active_penalties": [
      {
        "id": "abc123",
        "employee_id": "EMP042",
        "rule_name": "Late Arrival (1st offense)",
        "amount_pkr": 500,
        "reason": "Late arrival - 15 minutes",
        "status": "approved",
        "employee_ack": false,
        "reviewed_by_name": "Fatima Ali"
      }
    ],
    "recent_attendance": [
      {
        "date": "2026-05-10",
        "status": "present",
        "check_in": "09:00:00",
        "check_out": "18:00:00"
      },
      {
        "date": "2026-05-09",
        "status": "late",
        "check_in": "09:15:00",
        "check_out": "18:00:00"
      }
    ],
    "leave_requests": [
      {
        "id": "def456",
        "leave_type": "Annual Leave",
        "start_date": "2026-05-20",
        "end_date": "2026-05-25",
        "status": "approved"
      }
    ],
    "upcoming_birthdays": [
      {
        "employee_id": "EMP101",
        "name": "Ali Hassan",
        "date_of_birth": "1990-05-18",
        "days_until": 4
      }
    ]
  }
}
```

**Example cURL:**

```bash
curl -X GET http://localhost:3001/api/dashboard/me \
  -H "Authorization: Bearer <your_token>"
```

---

## GET /dashboard/pending-actions

Retrieve a list of pending actions - employees who have missing required fields (bank account, emergency contact). Requires `pending_actions:read` permission. This endpoint is typically used by HR to track incomplete employee records.

**Authentication:** Required  
**Permissions:** `pending_actions:read`

### Query Parameters
None.

### Response Body

Success response returns an array of objects:

| Field | Type | Description |
|-------|------|-------------|
| `employee_id` | String | Employee code |
| `name` | String | Full name of the employee |
| `missing_fields` | Array of strings | List of missing required fields. Common values: `"bank_account"`, `"emergency_contact"` |

**Example response:**

```json
{
  "success": true,
  "data": [
    {
      "employee_id": "EMP105",
      "name": "Muhammad Hassan",
      "missing_fields": ["bank_account"]
    },
    {
      "employee_id": "EMP218",
      "name": "Ayesha Khan",
      "missing_fields": ["emergency_contact"]
    },
    {
      "employee_id": "EMP342",
      "name": "Zainab Ahmed",
      "missing_fields": ["bank_account", "emergency_contact"]
    }
  ]
}
```

**Example cURL:**

```bash
curl -X GET http://localhost:3001/api/dashboard/pending-actions \
  -H "Authorization: Bearer <your_token>"
```

---

## GET /dashboard/urgent-alerts

Retrieve urgent alerts and warnings that need immediate attention. Requires `alerts:read` permission. Includes expiring probation periods, contracts, medical exams, and CNIC validity.

**Authentication:** Required  
**Permissions:** `alerts:read`

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `days` | Number (1-365) | Lookahead window in days (optional, default based on implementation) |

### Response Body

Success response returns an array of objects:

| Field | Type | Description |
|-------|------|-------------|
| `employee_id` | String | Employee code |
| `name` | String | Employee full name |
| `type` | String | Alert category: `"probation_end"`, `"contract_expiry"`, `"medical_exam_due"`, `"cnic_expiry"` |
| `expiry_date` | String | Date when the alert expires (format: `YYYY-MM-DD`) |
| `days_remaining` | Number | Days until expiry (`expiry_date - CURRENT_DATE`). Can be negative if already overdue |

**Example response:**

```json
{
  "success": true,
  "data": [
    {
      "employee_id": "EMP042",
      "name": "Bilal Ahmed",
      "type": "probation_end",
      "expiry_date": "2026-06-15",
      "days_remaining": 34
    },
    {
      "employee_id": "EMP089",
      "name": "Sana Malik",
      "type": "contract_expiry",
      "expiry_date": "2026-05-20",
      "days_remaining": 8
    },
    {
      "employee_id": "EMP156",
      "name": "Hassan Raza",
      "type": "medical_exam_due",
      "expiry_date": "2024-03-01",
      "days_remaining": -779
    }
  ]
}
```

**Example cURL:**

```bash
curl -X GET "http://localhost:3001/api/dashboard/urgent-alerts?days=60" \
  -H "Authorization: Bearer <your_token>"
```

---

## Notes

- **Metrics Scope:** `/dashboard/metrics` is for HR/administrators to see organization-wide stats. Regular employees use `/dashboard/me` for their personal overview.
- **Caching:** These endpoints may involve complex queries. Consider caching data for 5-10 minutes to improve performance.
- **Pending Actions:** The `/dashboard/pending-actions` endpoint shows employees with incomplete mandatory fields (`bank_account`, `emergency_contact`). This helps HR ensure all employee records are complete.
- **Urgent Alerts:** Urgent alerts are populated by the seed data with types: `probation_end`, `contract_expiry`, `medical_exam_due`, `cnic_expiry`. The `days_remaining` field indicates urgency; negative values mean the alert is overdue.
- **Permissions:** 
  - `dashboard:read` for metrics
  - `pending_actions:read` for pending actions  
  - `alerts:read` for urgent alerts
- **Date Handling:** All dates are in `YYYY-MM-DD` format. The `days` parameter in urgent alerts defines the lookahead window.
- **Birthday Calculation:** `upcoming_birthdays.days_until` uses `GREATEST(0, calculated_days)` so past birthdays in the current month show `0`.

---

## Seeding

The database seed (`node seeds/master_seed.js`) populates realistic test data:

- **520 employees** across various departments
- **21 active departments** with hierarchical structure
- **Pending actions** for employees missing `bank_account` or `emergency_contact` records
- **Urgent alerts** with various types and expiry dates (including some in the past for testing)

To seed the database:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/ems_node node seeds/master_seed.js
```
