# EMS Continuation Prompt

Continue the EMS work across both repositories:

- Frontend: `C:\frontend-2`
- Backend: `C:\backend`

Before doing anything, read these files fully:

- `C:\frontend-2\AGENTS.md`
- `C:\frontend-2\agent.md`
- `C:\backend\AGENTS.md`

Then run `git status --short` in both repositories. Both worktrees contain existing changes. Do not revert, overwrite, clean, or reformat unrelated user/agent work. Do not push code to GitHub.

## Current Task

We are implementing the real Accounts management functionality and employee account quick actions.

The user selected Option 2: Accounts filtering must be backend-driven, not only local frontend filtering. The Accounts page must support:

- Search by account email, employee name, employee ID, role, department, or designation.
- Department filter.
- Role filter.
- Active/inactive status filter.
- Real backend data and real account status actions.
- Custom enterprise-style confirmation modals for activate/deactivate actions.
- No `window.confirm`, browser alert, or other native Chrome dialogs.

Employee Detail Management must also provide a quick action for an existing employee account:

- Disable account.
- Enable account.
- Show the current account status.
- Ask for confirmation through the existing custom `Modal` component.
- Use the real account user ID and the existing audited Accounts status endpoint.
- Refresh employee and account queries after a successful change.
- Do not show this action when the employee has no login account.

Inactive accounts are already rejected by the backend login service. The user-facing login error must remain clear: the account is disabled and the employee should contact HR.

## Why

HR should not need to open the Accounts page for every employee account action. The Accounts page still needs full operational filtering because it is the central account-management screen. Backend filtering is mandatory so behavior remains correct with larger datasets and permission scopes.

All status changes affect persistent data, so they must continue using the existing backend endpoint that records Audit Logs.

## Work Already Started

Backend account filtering was started in:

- `C:\backend\src\modules\accounts\accounts.service.js`
- `C:\backend\src\modules\accounts\accounts.controller.js`
- `C:\backend\src\modules\accounts\accounts.service.test.js`

The current implementation adds search, role, department, and status filters to `GET /api/accounts`, plus department/designation fields in the account response.

Frontend account filtering was started in:

- `C:\frontend-2\src\hooks\useAccounts.ts`
- `C:\frontend-2\src\pages\Accounts.tsx`

The Accounts page was rewritten with backend query filters and a custom account status confirmation modal.

This work is incomplete and has not been fully tested. Inspect the current diff before continuing. Fix compilation, query validation, response-shape, and test issues instead of assuming the partial implementation is correct.

## Remaining Work

1. Finish and verify backend account filters.
2. Add focused backend controller/service tests for query validation, sanitization, and SQL parameter ordering.
3. Ensure Accounts API returns:
   - account user ID
   - employee ID/name
   - email
   - role ID/name
   - department ID/name
   - designation
   - active status
4. Finish Accounts page filters and custom activate/deactivate modal.
5. Add `Accounts.test.tsx` covering filter parameters and confirmation actions.
6. Update employee detail backend response to include account `is_active` if it is not already returned.
7. Normalize account metadata in `EmployeeDetail.tsx`.
8. Add quick Enable/Disable Account action in the Management tab.
9. Use the existing `useUpdateAccountStatus` mutation and custom `Modal`.
10. Add Employee Detail regression tests for the confirmation modal and status mutation.
11. Confirm the backend auth error for inactive/terminated accounts is readable in the login UI.
12. Check whether changing an employee to a terminated job status automatically disables the linked account. If it does not, implement this transactionally with Audit Logs and tests, because terminated employees must not be able to sign in.

## Important Existing Work

There are unrelated modified files in both repositories, including Sidebar, Announcements, Leave, employee routes/controllers, and styles. Work with them if directly necessary, otherwise leave them untouched.

The employee detail file already contains other active changes. Read its current diff carefully and make small targeted edits. Do not replace or revert existing employee profile, salary, allowance, attachment, or account-creation functionality.

## Verification

Run focused tests first, then the complete checks:

Backend:

```powershell
cd C:\backend
npm.cmd test -- src/modules/accounts/accounts.service.test.js
npm.cmd test
npm.cmd run db:check
```

Frontend:

```powershell
cd C:\frontend-2
npm.cmd test -- --run src/pages/Accounts.test.tsx src/pages/EmployeeDetail.test.tsx
npm.cmd test -- --run
npm.cmd run build
```

After implementation, use the in-app browser to verify:

- `http://localhost:8080/accounts`
- An employee detail page such as `http://localhost:8080/employees/EMP0001`
- `http://localhost:8080/login` with an inactive test account

Report exactly what changed, tests run, results, and anything not verified. Do not claim completion until the tests and browser checks have actually passed.
