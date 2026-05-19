# Frontend AI Implementation Prompt

## MISSION

Build a complete frontend for the Employee Management System (EMS) using the API reference below. This is a production-grade enterprise application with role-based access control, complex workflows, and strict business logic.

---

## CORE PRINCIPLES

1. **Authentication**: Use httpOnly cookies automatically. No localStorage token storage.
2. **Authorization**: Check permissions from `/auth/permissions` on app init. Cache globally.
3. **Self-Service**: Employee role can ONLY access their own data. HR roles can access everything.
4. **State Management**: Use Redux Toolkit, Zustand, or similar. Centralize API calls and auth state.
5. **Error Handling**: Every API call must handle 401 (redirect to login), 403 (show "insufficient permissions"), 422 (display validation errors inline), 409 (duplicate), 500 (generic error).
6. **Loading States**: Show spinners/skeletons during all async operations.
7. **Optimistic UI**: For edits, update UI immediately then roll back on error.

---

## AUTHENTICATION FLOW

### Pages
- `/login` - Email + password form
- `/change-password` - Forced when `must_change_password=true`
- `/dashboard` - Main app after login

### Implementation
```javascript
// Login
POST /auth/login { email, password }
→ On success: store token from response in variable (for Bearer fallback)
→ Check data.user.must_change_password → if true, navigate to /change-password
→ Call /auth/permissions to load permissions
→ Start heartbeat: GET /auth/session every 5 minutes

// Logout
POST /auth/logout → clear state → redirect to /login

// Route Guard
On app init: GET /auth/session
If 401: redirect to /login
If 200: load user data, load permissions
```

### Change Password Form
- Required when `must_change_password=true` (after first login or admin reset)
- Show: current password, new password, confirm new password
- Validate client-side: new === confirm, complexity (8+ chars, upper, lower, digit, symbol)
- POST /auth/change-password { current_password, new_password }
- On success: redirect to dashboard

---

## PERMISSION SYSTEM

Call **once** on app init:

```javascript
GET /auth/permissions
Returns: { role_id, role_name, permissions: ["employees:read", "leave:write", ...] }
```

Store in Redux/Zustand. Create helper:

```javascript
const hasPermission = (key) => permissions.includes(key);
const isRole = (roleName) => user.roleName === roleName;
```

**Use for**:
- Navigation menu show/hide
- Button disable/enable
- Entire page route guards
- Feature flags

---

## ROLE-BASED UI ADAPTATION

### Employee Role (self-service)
- Can only see/edit own data
- GET /employees returns single record (self)
- GET /attendance filtered to self
- Cannot access employee list, cannot ack others' attendance
- HR-only pages should redirect/404

### HR Manager
- Full access to: employees, leave, attendance, config, directory, penalties review
- Can see all data, can edit, can approve/reject

### HR Executive
- Read-only for employees/leave/attendance
- Cannot edit core employee data
- Cannot approve leave
- Can propose penalties but not review

### Super Admin
- Bypasses all permission checks
- Sees everything, can do everything

---

## EMPLOYEE MANAGEMENT MODULE

### 1. Employee List Page (`/employees`)

**HR View**:
- Table columns: Employee ID, Name, Designation, Department, Status (Active/Inactive), Date of Joining
- Search bar (searches employee_id and name)
- Filter by: Department (dropdown from /config/departments), Is Active (toggle)
- Pagination: page numbers, prev/next, showing X-Y of Z
- "Create Employee" button (top right, requires employees:write)

**Employee View**:
- Shows only their own card/profile (single row)
- No search/filters
- "Edit Profile" buttons on sections

**Implementation**:
```javascript
// Fetch
GET /employees?search=...&department_id=...&page=1&limit=20
Response: { data: [...], meta: { total, page, pages, limit } }

// UI
- Use react-table or similar with server-side pagination
- Loading skeleton on first load
- Debounce search input (300ms)
```

---

### 2. Employee Detail Page (`/employees/:id`)

**Tabs/Sections**:
1. **Personal Info** - Read-only for employee, edit for HR
2. **Job Info** - Department, designation, employment type, status, work mode, location, shift, dates
3. **Emergency Contacts** - 2 contacts, addresses
4. **Bank Account** - Bank details
5. **Medical** - Blood group, gender, height, weight, disabilities, allergies
6. **Salary** - Current salary + revision history (from /employees/:id/finance)
7. **Allowances** - Current allowances table + history

**Fetch data**:
```javascript
GET /employees/:employeeId
→ Returns nested object with all sections
```

**HR Actions**:
- Each section has "Edit" button (except employee)
- Opens modal with pre-filled form
- Save → PATCH appropriate endpoint

**Employee Actions**:
- All sections read-only
- May have "Download Salary Slip" (future)

---

### 3. Create Employee Wizard

**Multi-step form** (8 steps):

**Step 1: Personal Info**
- employee_id: text input (optional - if blank, auto-generated on blur or submit)
- name: required
- father_name: required
- cnic: required (format validation)
- date_of_birth: date picker

**Step 2: Job Info** (all dropdowns from config)
- department_id: select (load from GET /config/departments)
- designation_id: select (load from GET /config/designations)
- employment_type_id: select
- job_status_id: select
- work_mode_id: select
- work_location_id: select
- shift_id: select (load from GET /config/shifts)
- date_of_joining: date picker
- date_of_exit: date picker (optional)
- probation_end_date: date picker (optional)
- contract_end_date: date picker (optional)

**Step 3: Account**
- email: email input
- role_id: select (load from GET /config/roles) - employee/manager/etc
- phone: tel input (optional but recommended)

**Step 4: Emergency Contacts**
- contact_1: required (primary phone)
- contact_2: optional
- perment_address: textarea
- postal_address: textarea
- e_contact_1_relation: text (Spouse, Parent, etc.)
- e_contact_1_full_name: text
- e_contact_1_phone: tel
- e_contact_1_phone_country_code: text (default +92)
- e_contact_1_email: email
- e_contact_2_*: same (optional)

**Step 5: Bank Info**
- bank_name: select or text
- branch_name: text
- branch_code: text
- iban: text
- account_title: text
- account_number: text
- account_type: select (Savings, Current, etc.)

**Step 6: Medical Info**
- blood_group: select (A+, A-, B+, B-, AB+, AB-, O+, O-)
- gender: select (Male, Female, Other)
- height_cm: number
- weight_kg: number
- has_disability: checkbox
- disability_type: text (if has_disability)
- disability_description: textarea (if has_disability)
- has_chronic_condition: checkbox
- chronic_condition_notes: textarea
- has_known_allergies: checkbox
- allergy_notes: textarea
- emergency_medication: text
- fitness_status: select (Fit, Needs Check, etc.)
- last_medical_exam_date: date picker
- next_medical_exam_date: date picker

**Step 7: Salary**
- base_salary: number
- currency: text (default PKR)
- effective_from: date picker
- revision_type: radio (flat, percentage)
- revision_percent: number (shown if percentage)
- revision_reason: text

**Step 8: Allowances**
- Dynamic list: add/remove rows
- Each row: allowance_type_id (select from GET /config/allowance-types), amount (number), is_percentage (checkbox)

**Submit**:
```javascript
POST /employees
Body: { personalInfo, jobInfo, accountInfo, emergencyContacts?, bankInfo?, medicalInfo?, salaryInfo?, allowances? }
→ On success: { employee, tempPassword }
→ Show modal: "Employee created! Temporary password: {tempPassword}"
→ IMPORTANT: HR must communicate this to employee securely
```

**Error Handling**:
- 409 DUPLICATE_CNIC → "An employee with this CNIC already exists. Check records or use existing employee."
- 409 DUPLICATE_EMAIL → "An account with this email already exists."
- 422 validation → display field errors inline

---

### 4. Edit Employee

**Three separate PATCH endpoints**:

**Update Personal** (`PATCH /employees/:employeeId/personal`):
- Fields: name, father_name, cnic, date_of_birth
- Show in modal with current values pre-filled

**Update Job** (`PATCH /employees/:employeeId/job`):
- Fields: department_id, designation_id, employment_type_id, job_status_id, work_mode_id, work_location_id, shift_id, date_of_joining, date_of_exit, probation_end_date, contract_end_date
- If department or designation changes → creates job_history entry automatically (backend handles)
- Show confirmation: "Changing department will create a job history record. Continue?"

**Update Extra** (`PATCH /employees/:employeeId/extra`):
- Body: `{ emergencyContacts?, bankInfo?, medicalInfo? }`
- Can update any combination in single request
- Use three sections in modal or separate modals

**Finance Operations**:
- `/employees/:employeeId/finance` (GET) → fetch history
- `/employees/:employeeId/salary-revision` (POST) → add new salary
- `/employees/:employeeId/allowances` (PUT) → replace entire set

**Resend Credentials**:
- `POST /employees/:employeeId/resend-credentials`
- Button on profile page (HR only)
- Shows new temp password in modal
- Auto-communicated? No - HR must send manually

---

## ATTENDANCE MODULE

### Understanding the State Machine

Attendance records have a **state** field:
- `draft` - HR editing, not visible to employee
- `saved` - HR saved, still editable by HR
- `submitted` - locked, employee can view and ack, cannot edit
- `ho_unlocked` - HO approved unlock, HR can edit again

**Workflow**:
1. HR creates/edits attendance → `state = draft` (initial) or `saved` (after save)
2. HR clicks "Submit to HO" → `state = submitted` (locks)
3. If correction needed: HR requests unlock → `state = ho_unlocked`
4. HO approves unlock → back to draft/saved
5. Employee can ack their records after submission

---

### Attendance Sheet (`GET /attendance`)

**HR View**:
- Date picker (default today)
- Filters: department, work_location, shift
- Table with rows for each employee assigned to that criteria
- Columns: Employee (name/id), Shift (time), Check In (time input), Check Out (time input), Status (select: present/absent/late/half_day/on_leave), Notes (textarea), Ack (checkbox/status badge)
- "Save" button to persist changes
- "Submit to HO" button when state is saved

**Employee View**:
- Date picker (default today)
- Shows only their own row (read-only if submitted, can ack)
- Acknowledge button if `ack=false` → calls `PATCH /attendance/:id/ack`

**Implementation**:
```javascript
GET /attendance?date=2024-05-19&department=...&location=...&shift=...
→ Returns array of attendance rows (with id, state, ack, etc.)

PUT /attendance/save
Body: { date, location_id, rows: [{ employee_id, shift_id, check_in, check_out, status, notes, ack? }] }
→ Upserts, sets state='saved' or 'draft'? Check backend.

POST /attendance/submit
Body: { date, location_id }
→ Finds all rows for that date+location with state='saved', sets state='submitted'

POST /attendance/unlock-request
Body: { date, location_id, reason }
→ Sets state='ho_unlocked'

POST /attendance/unlock-approve
Body: { date, location_id, unlock_reason }
→ HO approves, returns to editable

PATCH /attendance/:id/ack
Body: {} (empty)
→ Sets ack=true, employee_acked_at=now()
```

---

### 5. Monthly Report (`GET /attendance/report`)

- Month/year picker, department filter (HR only)
- Table: Employee, Total Days, Present, Absent, Late, Half Day, On Leave, Attendance %
- Export to CSV button (frontend implementation)
- Chart: attendance % by department (optional)

---

## LEAVE MANAGEMENT MODULE

### Leave Requests

**List** (`GET /leave-requests`):
- Employee: own requests only
- HR: all with filters: status (pending/approved/rejected), employee, department
- Table: Employee, Leave Type, Start Date, End Date, Days, Status, Reason, Applied On

**Submit** (`POST /leave-requests`):
- Form: employee_id (auto=self for employee), leave_type_id (dropdown), start_date, end_date (end >= start), reason (optional)
- Real-time: fetch balances via `/leave-requests/balances` or `/balance/mine`
- Validation: balance available, no overlap with existing approved leaves
- POST → status=pending, notifies HR

**Approve** (`PATCH /leave-requests/:id/approve`):
- HR only
- Empty body
- Sets status=approved
- Updates leave balance: `used++`, `balance--` (or backend handles)
- Notifies employee

**Reject** (`PATCH /leave-requests/:id/reject`):
- HR only
- Body: `{ reason: "string" }` (required, min 2 chars)
- Sets status=rejected, stores reason
- No balance change

**Early Return** (`PATCH /leave-requests/:id/early-return`):
- HR only
- Body: `{ end_by_force: "YYYY-MM-DD" }`
- Original end_date may be later; this recalls employee early
- Restores unused days to balance
- Leave status remains approved but with early return noted

---

### Leave Balances

**For Employee**:
- GET `/leave-requests/balances/mine` → simple view
- Card display per type: "Annual: 10/15 used (5 remaining)"

**For HR**:
- GET `/leave-requests/balances?department=...&location=...&shift=...`
- Table: Employee, Leave Type, Year, Balance, Used
- Filters by config

---

### Leave Calendar

- GET `/leave-requests/calendar?month=5&year=2024&department=...`
- Monthly calendar view
- Each day shows count of leaves, color-coded by leave type
- Click day → modal with leave details (who, type, reason)

---

## PENALTIES MODULE

### Penalty Rules (Lookup)

- `GET /penalties/penalty-rules` - list all rules (active/inactive)
- `POST /penalties/penalty-rules` - create rule (name, amount_pkr, type: flat|percentage, is_active)
- `PATCH /penalties/penalty-rules/:id` - update

---

### Penalty Workflow

**Propose** (`POST /penalties/penalties`):
- Form: employee_id (dropdown), rule_id (dropdown → auto amount/type), date, reason
- Creates record with `status=pending`, `proposed_by=current user`
- Notifies HO/Superadmin

**List**:
- `GET /penalties/penalties` (HR/SUPER_ADMIN) - all
- `GET /penalties/penalties/mine` (employee) - own only
- Filter by status

**Review** (HO/Superadmin):
- `PATCH /penalties/penalties/:id/approve` - approve
- `PATCH /penalties/penalties/:id/reject` - reject (with reason?)

**Acknowledge** (Employee):
- `PATCH /penalties/penalties/:id/ack`
- Employee acknowledges approved penalty (digital signature equivalent)
- Sets `employee_ack=true`, `employee_acked_at=now()`

---

## DASHBOARD MODULE

### HR Dashboard (`GET /dashboard/metrics`)

**KPIs** (cards):
- Total Employees
- Present Today (attendance count)
- Pending Leave Requests (count)
- Pending Penalties (count)
- Urgent Alerts (count)

**Charts** (optional):
- Attendance % this month by department
- Leave distribution by type
- Employee headcount trend

**Requires**: `dashboard:read`

---

### Employee Dashboard (`GET /dashboard/me`)

**Summary Cards**:
- Next Approved Leave (dates, type)
- Upcoming Actions (count)
- My Attendance % this month

**Requires**: None (just auth)

---

### Pending Actions (`GET /dashboard/pending-actions`)

**HR**: All pending actions across organization
**Employee**: Own pending actions only

Examples:
- "Complete your profile" (if employee record incomplete)
- "Submit medical information"
- "Assign job info"
- "Acknowledge attendance" (pending acks)

Click action → navigates to relevant page to complete

---

### Urgent Alerts (`GET /dashboard/urgent-alerts`)

**HR**: All alerts
**Employee**: Own alerts only

Types:
- Probation ending within 30 days
- Contract ending within 30 days

Shows as red badge on dashboard nav

---

## CONFIGURATION MODULE

**Dynamic Pattern**: All use `/:entity` route

### Entity CRUD

**Common**:
```javascript
GET /config/:entity
→ List all records

POST /config/:entity
→ Create new

PATCH /config/:entity/:id
→ Update by UUID
```

**Entities & Permissions**:

| Entity | Read Perm | Write Perm | Notes |
|--------|-----------|------------|-------|
| departments | config:read (HR) | config:manage (Superadmin) | hierarchical (parent_department_id) |
| designations | config:read | config:manage | |
| employment-types | config:read | config:manage | |
| job-statuses | config:read | config:manage | |
| work-modes | config:read | config:manage | |
| work-locations | config:read | config:manage | |
| shifts | config:read | config:manage | times: HH:MM or HH:MM:SS |
| leave-types | config:read | config:manage | |
| leave-policies | config:read | config:manage | + `/leave-policies/year/:year` |
| allowance-types | allowances:read | allowances:write | Different permission! |
| users | config:read | config:manage | Portal accounts |
| roles | config:read | config:manage | |
| leave-capacity-config | leave_capacity:read | leave_capacity:write | Max % of dept on leave |

**Frontend**:
- Config section with subsections for each entity
- Standard CRUD table with "Add" button
- Modals for create/edit
- Soft delete via `is_active` toggle (PATCH update)
- For hierarchical (departments): tree view or indented list with parent display

---

## DIRECTORY MODULE

**Phonebook**:
- `GET /directory` - searchable employee directory (name, employee_id, email, phone, department, location)
- HR sees all, employee sees all (read-only)
- Real-time search

**Manual Entry** (rare, auto-created on employee creation):
- `POST /directory`
- `PATCH /directory/:id`

---

## CALENDAR EVENTS MODULE

**Get Events**:
- `GET /calendar-events` - returns events for current user or all (HR)
- Query params: `start_date`, `end_date`, `type?`
- Used in fullcalendar or similar component

**Create/Update**:
- `POST /calendar-events` - create event (calendar:write)
- `PATCH /calendar-events/:id` - update

**Note**: Approved leave requests auto-create events (backend business logic)

---

## NOTIFICATIONS MODULE

**Bell Icon**:
- `GET /notifications` - returns notifications for current user
- Fields: `id`, `type`, `title`, `message`, `link?`, `is_read`, `created_at`
- Show badge count = unread count

**Mark Read**:
- `PATCH /notifications/:id/read` - called when user clicks notification

**Send** (HR/Superadmin):
- `POST /notifications` - body: `{ user_id?, type, title, message, link? }`
- If `user_id` omitted, broadcast to all? Check backend.

---

## CRITICAL IMPLEMENTATION DETAILS

### 1. Date Handling
- All dates: YYYY-MM-DD format
- Times: HH:MM or HH:MM:SS (24h)
- Store as strings in API, convert to Date objects in frontend carefully
- Timezone: Assume Pakistan Standard Time (UTC+5). No timezone conversion needed if throughout.

### 2. Pagination
Every list endpoint supports `page` and `limit`:
```javascript
const params = new URLSearchParams({ page: 1, limit: 20 });
fetch(`/api/employees?${params}`)
→ { data: [...], meta: { total, page, pages, limit } }
```
Implement pagination component that shows:
- Current page (X of Y)
- Next/Previous buttons (disabled at boundaries)
- Optional: page size selector (5, 10, 20, 50)

### 3. Validation Errors
422 response:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "body.email", "message": "Invalid email" },
      { "field": "body.password", "message": "Password is required" }
    ]
  }
}
```
Map `field` to form field name:
- `body.employee_id` → `employee_id` field
- `body.job_info.department_id` → nested field
Show inline error messages under inputs.

### 4. Duplicate Conflicts
409 responses with codes:
- `DUPLICATE_EMAIL`
- `DUPLICATE_CNIC`
Show user-friendly message and offer recovery (e.g., "Employee with this CNIC exists. Search instead?")

### 5. Self-Service Enforcement
If employee tries unauthorized access:
- 403 with `{ "error": { "code": "SELF_SERVICE_VIOLATION", "message": "Access denied. You can only access your own data." } }`
- Redirect to /dashboard or show 403 page

### 6. Permission Denied
403 with `{ "error": { "code": "INSUFFICIENT_PERMISSIONS", "message": "Insufficient permissions." } }`
- Hide UI elements proactively via hasPermission()
- Still handle on API call failure (fallback)

### 7. Not Found
404 with `{ "error": { "code": "NOT_FOUND", "message": "..." } }`
- Show 404 page or "record not found" toast

### 8. Server Errors
500 with `{ "error": { "code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred." } }`
- Show generic error: "Something went wrong. Please try again."
- Log error details to console for debugging

---

## STATE MANAGEMENT RECOMMENDATION

```javascript
// Zustand store example
const useStore = create((set) => ({
  user: null,
  permissions: [],
  employees: [],
  currentEmployee: null,
  loading: false,

  // Auth
  setUser: (user) => set({ user }),
  setPermissions: (perms) => set({ permissions: perms }),

  // employees
  fetchEmployees: async (params) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/employees?${new URLSearchParams(params)}`);
      const json = await res.json();
      if (json.success) set({ employees: json.data, meta: json.meta });
    } finally { set({ loading: false }); }
  },

  hasPermission: (key) => useStore.getState().permissions.includes(key),
  isRole: (roleName) => useStore.getState().user?.role_name === roleName,
}));
```

---

## TESTING WITH SEED DATA

1. Run: `node seeds/master_seed.js`
2. Login as superadmin: `superadmin@esspl.com.pk` / `SuperAdmin@123!`
3. Explore HR dashboard, create test employee, mark attendance, etc.

---

## MISSING/PLANNED FEATURES (Backend Notes)

- **Rate limiting**: Not implemented. Add if public endpoints exposed.
- **Concurrent edit detection**: No version字段. Last write wins. May cause data loss if two HR edit same employee simultaneously. Consider adding `version` or comparing `updated_at`.
- **File uploads**: Not supported. Employee photos? Future.
- **Real-time**: No websockets. Notifications poll? Or use SSE? Not implemented.
- **Bulk operations**: Some bulk endpoints exist (attendance batch) but others (bulk employee creation) not.
- **Audit trail**: `audit_logs` table exists but not auto-populated? Check if triggers.
- **Email notifications**: Service creates notifications but email/SMS not implemented.

---

## CHECKLIST FOR IMPLEMENTATION

- [ ] Setup routing (React Router, Vue Router, etc.)
- [ ] Create layout with sidebar navigation based on permissions
- [ ] Implement auth pages (login, change password)
- [ ] Global state for user, permissions, loading
- [ ] Route guards (protected routes, permission checks)
- [ ] API client wrapper (handles 401 redirect, error parsing, loading states)
- [ ] Employee list + detail + create wizard
- [ ] Attendance sheet + report
- [ ] Leave request flow (list, submit, approve/reject for HR, calendar)
- [ ] Penalties flow
- [ ] Dashboard pages
- [ ] Config pages (dynamic for all entities)
- [ ] Directory page
- [ ] Calendar component
- [ ] Notifications bell
- [ ] Error pages (403, 404, 500)
- [ ] Loading skeletons for all data fetch
- [ ] Form validation (client-side mirroring server Zod schemas)
- [ ] Responsive design (mobile/tablet)

---

## FINAL NOTES

The backend is **strict** about:
- Permissions: every endpoint checks
- Self-service: employee role filtered server-side
- Validation: Zod schemas enforce types and constraints
- Transactions: multi-step operations are atomic

Your frontend must:
- Respect these constraints (don't try to bypass)
- Provide clear UX when access denied or validation fails
- Cache lookup data (departments, designations, etc.) on app init to avoid repeated calls
- Assume data is consistent and handle edge cases gracefully

Good luck! Build a beautiful, usable, and secure frontend that matches this robust backend.

---

## END OF FRONTEND AI PROMPT
