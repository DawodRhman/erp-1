# ERP HR Module Phase 1 - Full QA Test Plan

Use this checklist before deployment. Test in Chrome or Edge with the frontend running on `http://localhost:8080` and backend running on `http://localhost:3001`.

## 1. Test Accounts

All dummy accounts are listed in `accounts.md`. Use these main accounts for role coverage:

| Purpose | Employee ID | Email | Password | Role |
| --- | --- | --- | --- | --- |
| Full admin / all modules | EMP001 | superadmin@esspl.com.pk | SuperAdmin@123! | SuperAdmin |
| HR Manager / configuration / review workflows | EMP016 | kamran.rafiq.emp016@esspl.com.pk | HrManager@123! | HR Manager |
| HR Executive / operational HR | EMP017 | rabia.aslam.emp017@esspl.com.pk | Esspl@2024! | HR Executive |
| HR Officer / limited HR-style employee | EMP018 | danish.mehmood.emp018@esspl.com.pk | Esspl@2024! | HR Officer |
| Senior employee / self-service | EMP004 | maham.siddiqui.emp004@esspl.com.pk | Esspl@2024! | Chief Technology Officer |
| Normal employee / self-service | EMP061 | zaid.pervaiz.emp061@esspl.com.pk | Esspl@2024! | Software Engineer |
| Field employee / self-service | EMP089 | ramsha.khan.emp089@esspl.com.pk | Esspl@2024! | Field Engineer |

For wider employee testing, use any account from `accounts.md` with password `Esspl@2024!`, except special accounts that have their own password shown there.

## 2. Pre-Deployment Smoke Checks

1. Open `http://localhost:8080/login`.
2. Confirm the login page loads without console errors.
3. Try invalid login credentials.
   Expected: error message, no dashboard access.
4. Login with `superadmin@esspl.com.pk`.
   Expected: redirect to Launchpad or main admin area.
5. Logout from the sidebar bottom user chip.
   Expected: session clears and returns to login.
6. Refresh after login.
   Expected: user remains logged in unless token expired.
7. Open a protected route while logged out, for example `/dashboard`.
   Expected: redirect to `/login`.

## 3. Role Access Checks

### SuperAdmin

Login: `superadmin@esspl.com.pk` / `SuperAdmin@123!`

Check:
1. Sidebar shows Launchpad, Dashboard, Employees, Attendance, Leave, Leave Wallet, Penalty, Penalty Submissions, Announcements, Calendar Events, Directory, System Configuration, HR Accounts, Audit Log.
2. Payroll is visible but disabled.
3. System Configuration expands and shows all supported configuration pages.
4. SuperAdmin can open admin-only routes like `/accounts` and `/audit-log`.

### HR Manager

Login: `kamran.rafiq.emp016@esspl.com.pk` / `HrManager@123!`

Check:
1. Launchpad shows usable options.
2. Dashboard opens and uses real backend data.
3. System Configuration is available.
4. My Workspace appears because HR Manager is also an employee.
5. HR Manager can access employee self-service pages: My Dashboard, My Attendance, My Leave, My Penalties, My Profile.

### HR Executive

Login: `rabia.aslam.emp017@esspl.com.pk` / `Esspl@2024!`

Check:
1. Dashboard opens without forbidden error.
2. Dashboard greeting shows readable name where backend provides it, not only email.
3. Sidebar role badge says HR Executive, not Employee.
4. My Workspace appears.
5. Directory should not show management Add Entry button if permission is missing.
6. Restricted configuration/admin pages should not be available unless permissions allow them.

### Employee / Senior Staff

Login with `maham.siddiqui.emp004@esspl.com.pk` or `zaid.pervaiz.emp061@esspl.com.pk`.

Check:
1. User lands on employee self-service dashboard.
2. Employee can only see own attendance, own leave, own penalties, own profile.
3. Employee cannot open admin HR pages by manually typing URLs.

## 4. Launchpad Testing

Route: `/launchpad`

Test with SuperAdmin and HR Manager.

Click/check:
1. Open Launchpad.
2. Confirm available modules render.
3. Click each enabled Launch button.
   Expected: navigates to the correct module.
4. Click disabled Payroll option if shown.
   Expected: it clearly shows unavailable/coming soon behavior and does not break.
5. Refresh the page.
   Expected: modules still render for the current role.

## 5. Dashboard Testing

Route: `/dashboard`

Test with SuperAdmin, HR Manager, HR Executive.

Check:
1. KPI cards load from `GET /api/dashboard/metrics`.
2. No dummy dashboard data appears for HR users.
3. Employee count, new this month, departments, present today, on leave today display cleanly.
4. Attendance chart remains readable.
5. Department Distribution shows top departments cleanly and does not become messy with many departments.
6. Calendar Events section marks dates with calendar events.
7. Calendar Events section marks employee birthdays.
8. Next month button animates smoothly.
9. Previous month button animates smoothly.
10. Employee Birthdays uses real employee data.
11. Pending actions show real missing-profile data.
12. Urgent alerts show real expiry/contract alerts.
13. No emoji characters appear; proper icons or text only.

## 6. Employee List Testing

Route: `/employees`

Click/check:
1. Page loads real employees.
2. Search by employee name.
3. Search by employee ID.
4. Open filters if present.
5. Click an employee row/card.
   Expected: navigates to `/employees/:id`.
6. Click Add Employee if permission allows.
   Expected: opens `/employees/add`.
7. Confirm readable department/designation names are shown where available, not UUIDs.

## 7. Add Employee Full Flow

Route: `/employees/add`

Use HR Manager or SuperAdmin.

Important data rule:
- Do not use fake employee-facing data on real pages.
- For a new test employee, use a clearly test-looking employee ID/name so it can be removed later if needed.

Steps:
1. Open Add Employee.
2. Personal Info:
   - Fill Employee ID.
   - Fill Full Name.
   - Fill Father Name.
   - Fill CNIC.
   - Fill Date of Birth.
   - Check required-field validation by trying Next before filling required fields.
3. Job Info:
   - Select Department first.
   - Confirm Designation is disabled before Department selection.
   - After Department selection, confirm designations load from backend for that department only.
   - Select Designation.
   - Select Employment Type.
   - Select Job Status.
   - Select Shift.
   - Select Work Location.
   - Select Work Mode.
   - Select Date of Joining.
4. Emergency / Contact:
   - Fill primary phone.
   - Confirm country code is locked to `+92`.
   - Fill primary emergency contact.
   - Leave secondary contact blank and confirm form allows it if optional.
5. Bank:
   - Fill bank name, account title, IBAN if required.
6. Medical:
   - Fill height, weight, medical fields where needed.
7. Salary:
   - Fill basic salary.
   - Confirm salary summary updates.
8. Allowances:
   - Add allowance row.
   - Select allowance type.
   - Enter amount.
   - Confirm duplicate allowance type is blocked/disabled.
   - Remove allowance row and confirm it disappears.
9. Account:
   - Fill employee email.
   - Submit employee.
10. Expected after submit:
   - Employee is created successfully.
   - Backend creates supporting employee records.
   - Leave balances are created for the joining year.
   - If joining date is in a previous year, historical leave balances should be generated according to backend logic, not just current year.
   - New employee appears in Employees list.

## 8. Employee Detail Profile Testing

Route: `/employees/EMP001` and another employee like `/employees/EMP061`

Click/check:
1. Profile header shows name, role/designation, department, location.
2. Missing values show `Not provided`, not `N/A`.
3. Attendance section shows Last 6 Months by default.
4. Use attendance period controls if present.
   Expected: can move through 6-month chunks up to 12 months.
5. Leave section shows real leave balances.
6. Leave section shows real leave requests.
7. Penalty section shows real penalties or Coming Soon/empty state if not available.
8. Quick Actions dropdown opens above other content and does not get hidden.
9. Click each quick action.
   Expected: only real supported actions work; unsupported actions should not silently fail.

## 9. My Profile Testing

Route: `/my-profile`

Test with HR Executive and normal employee.

Check:
1. Page resolves current user through backend, not dummy data.
2. Header shows employee name.
3. Contact numbers show Primary and Secondary clearly.
4. If secondary number is missing, only primary is shown.
5. Salary/allowance display:
   - Show amount and unit in one column.
   - Percentage allowance shows `%`.
   - Fixed amount shows `PKR`/`RS`.
   - Do not show raw booleans like `Is Percentage false`, `Is Current true`, `Is Active true`.
6. Verification fields:
   - Show `Verified`, not `Is Verified true`.
7. Missing data displays as `Not provided`.

## 10. Header / Search Testing

Global topbar.

Check:
1. Header date displays correctly.
2. Role badge matches active role.
3. Notification button opens or shows intended state.
4. Search employee by name.
5. Search employee by employee ID.
6. Search results show matching employees.
7. Click a search result.
   Expected: navigates to `/employees/:id`.
8. Search does not expose UUIDs when readable names/IDs exist.

## 11. Attendance Testing

Route: `/attendance`

Test with HR Manager, HR Executive, SuperAdmin, Employee self-service.

Admin/HR checks:
1. Page loads today automatically.
2. Date picker is not needed for today sheet.
3. SuperAdmin can choose readable location.
4. HR user is locked to assigned location.
5. Attendance rows load from `GET /api/attendance`.
6. Search by employee name/ID.
7. Filter by department.
8. Filter by shift.
9. Change status: Present, Absent, Late, Leave if supported.
10. Save attendance.
    Expected: calls `PUT /api/attendance/save`.
11. Submit To HO.
    Expected: calls `POST /api/attendance/submit`.
12. After submit, sheet should become locked according to backend state.
13. Request unlock.
    Expected: calls `POST /api/attendance/unlock-request`.
14. Approve unlock as authorized Head HR/SuperAdmin.
    Expected: calls `POST /api/attendance/unlock-approve`.
15. Acknowledge attendance row if applicable.
    Expected: calls `PATCH /api/attendance/:id/ack`.
16. Attendance report loads from `GET /api/attendance/report` if route is enabled.

Employee self-service:
1. Open `/my-attendance`.
2. Employee sees own attendance only.
3. Employee cannot edit other employees.
4. Employee acknowledgement works only for own row.

## 12. Leave Testing

Routes:
- HR/admin: `/leave`
- Employee: `/my-leave`
- Wallet/admin: `/leave-wallet`

HR/admin leave page:
1. Page loads real leave requests.
2. From and To dates are readable, not raw ISO strings.
3. Requested Amount and Approved Amount columns should not appear unless backend truly supports them.
4. Approved By shows approver name.
5. Filter by status if present.
6. Open request details if available.
7. Approve a pending leave as authorized role.
8. Reject a pending leave with note if required.
9. Confirm status changes.
10. Confirm balances update if backend supports update after approval.

Employee leave page:
1. Open `/my-leave`.
2. Create new leave request.
3. Select leave type.
4. Select From and To dates.
5. Add reason.
6. Submit.
7. Confirm request appears for that employee.
8. Employee should not approve their own leave unless backend explicitly allows it.

Leave Wallet:
1. Open `/leave-wallet`.
2. Confirm it shows real leave balances.
3. Search/filter by employee if available.
4. Confirm used, remaining, and total balances are clear.
5. Open recent leave requests from wallet section if linked.

## 13. Leave Balance Backend Logic Testing

After creating a new employee:

1. Check backend/database for `leave_balances` rows for the employee.
2. Confirm leave balances are created automatically.
3. Confirm department-specific leave policy overrides company-wide policy for same leave type.
4. Confirm company-wide policy applies when no department-specific policy exists.
5. Confirm prorating uses days from joining date to year end.
6. Confirm result is stored as full numbers, not floating values.
7. Test employee joining in January.
   Expected: near/full yearly balance depending on exact date.
8. Test employee joining mid-year.
   Expected: prorated balance.
9. Test employee joining late year.
   Expected: smaller prorated balance.
10. Test old employee data.
   Expected: balances should be created according to backend historical/current-year logic agreed for the system.

## 14. Penalty Testing

Routes:
- `/penalty`
- `/penalty-workflow`
- `/my-penalties`
- `/settings/penalty-rules`

Penalty Rules:
1. Open `/settings/penalty-rules`.
2. Add a rule.
3. Fill rule name.
4. Fill amount.
5. Select type: flat or percentage.
6. Save.
7. Edit the rule.
8. Toggle active/inactive.
9. Confirm inactive rule behavior in Apply Penalty dropdown.

Apply Penalty:
1. Open `/penalty`.
2. Click Add/Apply Penalty if permission allows.
3. Select employee.
4. Select penalty rule.
5. Select date.
6. Add reason.
7. Submit.
8. Expected: penalty is created as pending.
9. Confirm employee name, rule name, amount, status, proposed by, date appear.

Penalty Review:
1. Login as HR Manager or SuperAdmin.
2. Open `/penalty-workflow`.
3. Confirm pending penalties appear.
4. Approve a pending penalty.
5. Confirm status changes to approved.
6. Reject another pending penalty.
7. Add review note.
8. Confirm status changes to rejected.
9. Confirm approved penalties appear to employee.
10. Confirm rejected penalties do not appear in employee self-service.

Employee Penalties:
1. Login as the target employee.
2. Open `/my-penalties`.
3. Confirm only own approved penalties appear.
4. Click Acknowledge.
5. Confirm acknowledgement state updates.
6. Try to acknowledge another employee penalty by URL/API if possible.
   Expected: forbidden.

## 15. Directory Testing

Routes:
- Viewer: `/directory`
- Management: `/settings/directory`
- Employee view: `/my-directory`

Viewer:
1. Open `/directory`.
2. Confirm the old line `Comprehensive organization directory with full CRUD operations` is gone.
3. Confirm real data loads.
4. Columns should include Type, Name, Contact, Email, Manager/Department, Location, Actions.
5. Search by name.
6. Search by email.
7. Search by department/location if available.
8. Click WhatsApp action.
   Expected: opens `https://wa.me/...`.
9. Click Email action.
   Expected: opens `mailto:...`.
10. HR Executive without write permission should not see Add Entry.

Management:
1. Open `/settings/directory`.
2. Authorized users can add entry.
3. Authorized users can edit entry.
4. Authorized users can delete/deactivate entry if backend allows.
5. Unauthorized users should not see management buttons.

## 16. Calendar Events Testing

Routes:
- Viewer: `/calendar`
- Management: `/settings/calendar-events`
- Dashboard calendar section: `/dashboard`

Viewer:
1. Open `/calendar`.
2. Confirm only calendar events are shown.
3. Confirm there are no add/edit/delete controls on `/calendar`.
4. Calendar Feed has its own small scrollbar.
5. Filter month/type if controls exist.
6. Confirm events are real backend events.

Management:
1. Open `/settings/calendar-events`.
2. Add event.
3. Fill title.
4. Fill date/start/end if required.
5. Select type.
6. Save.
7. Confirm event appears on `/calendar`.
8. Confirm event date is highlighted on dashboard calendar.
9. Edit event.
10. Confirm change reflects in viewer.
11. Deactivate/delete event if backend supports it.

## 17. Announcements Testing

Routes:
- Feed: `/announcements`
- Management: `/settings/announcements`

Feed:
1. Open `/announcements`.
2. Confirm existing announcements load from backend.
3. Confirm feed remains accessible from sidebar.
4. Confirm no localStorage/demo announcement behavior.

Management:
1. Open `/settings/announcements`.
2. Add announcement.
3. Fill title.
4. Fill body.
5. Select audience: all, HR, or employee.
6. Save.
7. Confirm announcement appears for correct audience.
8. Edit announcement.
9. Deactivate announcement.
10. Confirm inactive announcement does not show in normal feed.
11. Test with SuperAdmin, HR Manager, and Employee account.

## 18. Configuration Testing

Open System Configuration from sidebar.

For each page below:
1. Load page.
2. Confirm list loads real backend data.
3. Add a record.
4. Edit the record.
5. Toggle active/inactive if available.
6. Confirm validation errors are readable.
7. Confirm no unsupported configuration pages appear.

Pages:
1. Departments
2. Designations
3. Employment Types
4. Job Statuses
5. Work Modes
6. Work Locations
7. Shifts
8. Leave Types
9. Leave Policies
10. Leave Capacity
11. Allowance Types
12. Penalty Rules
13. Roles
14. Directory Management
15. Calendar Events
16. Announcements

Special designation check:
1. Create/select a Department.
2. Create a Designation attached to that Department.
3. Open Add Employee.
4. Confirm selecting that Department loads only its Designations from backend.

Special leave policy check:
1. Create company-wide policy with Department blank.
2. Create department-specific policy for same leave type.
3. Create employee in that department.
4. Confirm department-specific policy overrides company-wide policy.
5. Create employee in another department.
6. Confirm company-wide policy applies.

Unsupported settings should not be shown:
- Reporting Managers
- Payroll Components
- Tax Config
- Global Days
- Custom Fields
- Selfie settings, unless backend later adds real support

## 19. Payroll Testing

Route: `/payroll`

Check:
1. Sidebar Payroll is disabled.
2. If route is opened manually, page shows a large Coming Soon message.
3. No fake payslip/payroll data is shown.
4. Launchpad may show Payroll as coming soon/disabled.

## 20. Announcements, Calendar, and Sidebar Navigation Testing

Check sidebar order:
1. Directory is the last enabled core option.
2. Announcements remains in sidebar.
3. Calendar Events remains in sidebar.
4. Calendar Events and Announcements also appear under Configurations.
5. Disabled pages are visibly disabled and not accidentally clickable.

Check topbar labels:
1. `/penalty` shows Penalty, not Penalty Ledger.
2. `/penalty-ledger` redirects to `/penalty`.
3. Role label is correct for HR Executive and HR Manager.

## 21. HR Accounts and Audit Log Testing

Routes:
- `/accounts`
- `/audit-log`

Test with SuperAdmin and Head HR if allowed.

Accounts:
1. Open HR Accounts.
2. Confirm real users/accounts load.
3. Search account.
4. Edit account if supported.
5. Confirm permission restrictions for non-admin users.

Audit Log:
1. Open Audit Log.
2. Confirm logs load.
3. Search/filter if available.
4. Confirm actions from employee creation, leave, penalty, or login appear if backend records them.

## 22. Employee Self-Service Testing

Use employee account like `zaid.pervaiz.emp061@esspl.com.pk`.

My Dashboard:
1. Open `/my-dashboard`.
2. Confirm personal summary loads.
3. Confirm attendance/leave/penalty widgets are own data only.

My Attendance:
1. Open `/my-attendance`.
2. Confirm own attendance only.
3. Try refresh and date filters if available.

My Leave:
1. Apply for leave.
2. Confirm request appears.
3. Confirm balances are shown.

My Penalties:
1. Confirm own approved penalties only.
2. Acknowledge penalty if pending acknowledgement.

My Profile:
1. Confirm personal data.
2. Confirm contact cards.
3. Confirm bank/medical/job/salary data where provided.

My Directory:
1. Open `/my-directory`.
2. Confirm employee can view directory.
3. Confirm no management buttons appear.

## 23. Negative Permission Testing

For HR Executive and Employee:

1. Manually open `/settings/departments`.
   Expected: denied or redirected unless permission allows.
2. Manually open `/accounts`.
   Expected: denied/redirected.
3. Manually open `/audit-log`.
   Expected: denied/redirected.
4. Manually open `/employees/add` as employee.
   Expected: denied/redirected.
5. Try to approve leave as employee.
   Expected: no approve button or forbidden.
6. Try to review penalties as employee.
   Expected: no review access.

## 24. Responsive UI Testing

Test these screen sizes:
1. Desktop 1440px.
2. Laptop 1366px.
3. Tablet width around 768px.
4. Mobile width around 390px.

Check:
1. Sidebar does not cover content.
2. Tables remain usable or scroll horizontally.
3. Modals fit screen.
4. Dropdowns are not hidden behind cards.
5. Buttons remain clickable.
6. Text does not overlap.

## 25. Browser Console and Network Testing

For each main route:
1. Open DevTools Console.
2. Confirm no red runtime errors.
3. Open Network tab.
4. Confirm API calls return 200/201/204 where expected.
5. Confirm validation failures return readable messages.
6. Confirm 403 appears only where user truly lacks permission.
7. Confirm no API exposes raw UUID where readable name is expected in UI.

Main routes:
- `/launchpad`
- `/dashboard`
- `/employees`
- `/employees/add`
- `/employees/EMP001`
- `/attendance`
- `/leave`
- `/leave-wallet`
- `/penalty`
- `/penalty-workflow`
- `/announcements`
- `/calendar`
- `/directory`
- `/my-dashboard`
- `/my-attendance`
- `/my-leave`
- `/my-penalties`
- `/my-profile`
- all `/settings/...` pages

## 26. Final Deployment Verification Commands

Run before deployment:

Frontend:

```bash
npm.cmd test -- --run
npm.cmd run build
```

Backend:

```bash
npm.cmd test
npm.cmd run db:check
```

Expected:
1. All frontend tests pass.
2. Frontend production build succeeds.
3. All backend tests pass.
4. Migration dry run succeeds.
5. No new TypeScript/build errors.
6. No critical console errors during manual smoke testing.

## 27. Final Sign-Off Checklist

Mark each item before deployment:

- [ ] Login/logout works.
- [ ] SuperAdmin role works.
- [ ] HR Manager role works.
- [ ] HR Executive role works.
- [ ] Employee self-service works.
- [ ] Dashboard uses real backend data.
- [ ] Employee creation works.
- [ ] Employee creation creates leave balances.
- [ ] Department-specific designations work.
- [ ] Attendance save/submit/unlock flow works.
- [ ] Leave request/review flow works.
- [ ] Penalty apply/review/acknowledge flow works.
- [ ] Directory viewer and management work.
- [ ] Calendar viewer and configuration work.
- [ ] Announcements feed and configuration work.
- [ ] Configuration pages work.
- [ ] Payroll shows Coming Soon only.
- [ ] Unauthorized users cannot access restricted pages.
- [ ] No dummy employee-facing data appears.
- [ ] No visible raw UUIDs where names should be shown.
- [ ] No broken dropdown overlays.
- [ ] No major responsive layout issues.
- [ ] Frontend tests pass.
- [ ] Frontend build passes.
- [ ] Backend tests pass.
- [ ] Backend migration check passes.

