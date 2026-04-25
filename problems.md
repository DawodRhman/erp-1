# Confirmed Problems

Updated: 2026-04-25

## Open runtime/browser issues

1. **Sign Out did not end the active session**
   - During browser smoke testing, clicking `Sign Out` did not clear the logged-in browser session.
   - Current state: a fix is now implemented in the Next logout route plus client logout redirect flow, but it still needs browser re-verification.
   - Impact: previously blocked clean role switching in the same browser tab and made logout behavior unreliable.
   - Related areas:
     - `D:\Desktop\EMS\client\final_product\src\contexts\AuthContext.tsx`
     - `D:\Desktop\EMS\client\final_product\src\app\launchpad\page.tsx`
     - `D:\Desktop\EMS\client\final_product\src\app\api\auth\logout\route.ts`
     - `D:\Desktop\EMS\client\final_product\src\lib\api.ts`
   - Status: fix implemented, pending browser verification

2. **HR access to `/config` showed `404` instead of a guarded deny/redirect**
   - Browser smoke testing showed `http://localhost:3000/config` rendering a `404` page for HR.
   - Current state: a concrete `/config` page now exists, so the route no longer depends on a missing page. Guard behavior still needs browser re-check.
   - Impact: route protection UX is incomplete and does not clearly communicate access denial.
   - Expected behavior: explicit redirect or access-denied handling through the app guard layer.
   - Status: fix implemented, pending browser verification

3. **`/employees?search=EMP002&tab=attendance` stayed on `Loading...`**
   - The employee directory does not yet complete the URL-driven detail-tab flow during browser smoke testing.
   - Current state: `/employees` has been rewritten as a server-driven URL-based directory with active-tab fetches only, but this still needs browser re-verification.
   - Impact: Task 17 acceptance is not met; lazy employee tab behavior is still incomplete.
   - Observed result: search/tab params were present, but employee detail/attendance context did not render.
   - Related area:
     - `D:\Desktop\EMS\client\final_product\src\app\(app)\employees\page.tsx`
   - Status: fix implemented, pending browser verification

4. **`/me/dashboard` stayed on `Loading...`**
   - The employee self dashboard remained in a loading state during browser smoke testing.
   - Current state: `/me/dashboard` has been rebuilt as a server-rendered self-only dashboard with attendance/leave actions, but this still needs browser re-verification.
   - Impact: Task 16 self-service dashboard behavior is still incomplete in-browser.
   - Related area:
     - `D:\Desktop\EMS\client\final_product\src\app\(me)\me\dashboard\page.tsx`
   - Status: fix implemented, pending browser verification

## Open verification/task gaps

5. **Browser smoke verification is still incomplete**
   - Tasks `21.5` and `21.6` remain open because the updated logout, `/config`, `/employees`, and `/me/dashboard` flows still need a fresh browser pass after the latest implementation.
   - Status: open

## Known non-blocking warning

6. **Security runner still reports pre-existing warnings on `PUT /extra-employees`**
   - Security automation passes with `vulnerabilities: 0`, but warnings remain for existing input-acceptance behavior on `PUT /extra-employees`.
   - Impact: not part of the auth/BFF regression, but still worth tracking.
   - Status: known warning
