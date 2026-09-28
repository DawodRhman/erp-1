# Phase 1 Master Testing Handoff

## Browser AI Prompt
Use the local app at `http://localhost:8080` and verify Phase 1 HR Core end to end. Read the repo instructions first, then test the live flows with real seeded accounts only.

Start with the current local accounts:
- Super Admin: `superadmin@esspl.com.pk` / `SuperAdmin@123!`
- HR Manager: `kamran.rafiq.emp0016@esspl.com.pk` / `HrManager@123!`
- HR Executive: `rabia.aslam.emp0017@esspl.com.pk` / `Esspl@2024!`
- Department Head example: `ifrah.mehmood.emp0034@esspl.com.pk` / `Esspl@2024!`

Verify these Phase 1 behaviors:
1. Login and logout record audit logs with identity fields visible in the audit detail panel.
2. Audit Log is Super Admin only, read-only, filterable, and shows actor employee, record ID, IP, method, path, request ID, and email when available.
3. Department Head sees department-scoped employee data only, cannot create/edit employees, cannot create accounts, cannot edit salary or allowances, and cannot access forbidden URLs.
4. Employee detail shows the My Profile style tabs, real salary history, allowance history, bank info, emergency contacts, documents, and profile photo fallback behavior.
5. Management actions on employee detail work only for allowed HR roles: create account, resend credentials, add salary history, update allowances, upload attachments.
6. Salary revision form uses a default `Select option`, shows percent and reason only when the revision type is not `Initial`, and accepts all backend options.
7. Bulk upload supports validate, edit preview row, save and revalidate, and import only clean rows. Error text must be human readable.
8. Accounts page supports search and filters, blocked accounts cannot sign in, and account status changes open the custom confirmation modal.
9. Sidebar navigation should not show duplicated active states, horizontal overflow, or unsafe actions for roles that do not have them.

Report only concrete results. Call out broken permissions, wrong labels, missing data, stale placeholders, or dead routes.

## Manual Testing Instructions For Zaid
Use these same accounts in the browser and compare role by role.

First confirm Super Admin:
- Open `/dashboard`, `/employees`, `/accounts`, `/audit-log`, `/leave`, `/announcements`, `/calendar`.
- Check that audit logs show login/logout with IP and actor identity details.
- Confirm account status changes, employee writes, salary changes, allowance changes, uploads, and bulk imports all write audit logs.

Then confirm HR Manager:
- Open `/employees/EMP0016`, `/employees/bulk-upload`, `/accounts`.
- Confirm you can manage accounts, salary history, allowances, and uploads where allowed.
- Confirm the employee detail page shows real data, not placeholder-only values.

Then confirm HR Executive:
- Open `/employees/EMP0017` and `/my-profile`.
- Confirm self profile works and read-only sections still render correctly.
- Confirm employee detail does not expose salary or allowance write controls unless permissions allow.

Then confirm Department Head:
- Open `/employees`, `/employees/EMP0034`, `/leave`, `/attendance`, `/announcements`, `/calendar`.
- Confirm only department-scoped data appears.
- Confirm create employee, bulk upload, salary write, allowance write, account creation, and hidden admin routes are blocked.
- Confirm direct URL access to forbidden pages redirects or denies access correctly.

Quick checks:
- Login with a disabled account should fail with the disabled-account message.
- If an employee has no uploaded photo, the initials fallback should show.
- If a photo exists, it should show everywhere the profile image is used.
- Salary history should appear in the compensation section and append after new revisions.
- Bulk upload preview should allow edit then revalidate before import.

Do not approve Phase 1 if any of the above is still mocked, duplicated, hidden behind a wrong role, or missing from the backend response.
