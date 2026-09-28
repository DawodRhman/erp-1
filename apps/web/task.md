# EMS Frontend MVP - Task Tracker

## Module 1: Authentication & Core Setup (Foundation)
- [x] Create `axios` instance (`src/services/apiClient.ts`) configured with `baseURL: "http://localhost:3001"`.
- [x] Add request interceptor to `apiClient` to automatically attach Bearer token from Zustand store.
- [x] Add response interceptor to `apiClient` to globally handle 401 (redirect to `/login`), 403 (show permission error), and other standard error codes (422, 500).
- [x] Create Zustand store (`src/store/useAuthStore.ts`) to manage `user`, `token`, `permissions`, and `isAuthenticated` state.
- [x] Implement `POST /auth/login` API call in `src/services/auth.ts` (Done in `AuthContext`).
- [x] Update `src/pages/Login.tsx` to use the real login API and handle validation errors.
- [x] Implement `/auth/session` and `/auth/permissions` API calls to fetch user data on app initialization.
- [x] Update `src/App.tsx` and `ProtectedRoute` to consume the real auth state from Zustand instead of mock Context.
- [x] Add `QueryClientProvider` from `@tanstack/react-query` to `src/App.tsx` or `src/main.tsx`.

## Module 2: Configuration & Directory (Dependencies)
- [ ] Set up React Query hooks for fetching lookup data (`useDepartments`, `useDesignations`, `useRoles`, etc.).
- [ ] Update Configuration Pages (`src/pages/settings/*`) to fetch and display real data via `GET /config/:entity`.
- [ ] Implement create/update forms in Configuration Pages using `POST /config/:entity` and `PATCH /config/:entity/:id`.
- [ ] Update `src/pages/Directory.tsx` to fetch the employee directory via `GET /directory`.

## Module 3: Employee Management (Core)
- [ ] Wire up `src/pages/Employees.tsx` to `GET /employees` using React Query. Implement pagination and search/filter parameters.
- [ ] Update `src/pages/AddEmployee.tsx` (Wizard form) to map fields correctly to the `POST /employees` payload.
- [ ] Implement Zod schemas matching the backend for all 8 steps of the employee creation wizard.
- [ ] Handle 409 duplicate errors (CNIC/Email) during employee creation.
- [ ] Wire up `src/pages/EmployeeDetail.tsx` to fetch real data from `GET /employees/:id`.
- [ ] Implement edit modals for Personal Info, Job Info, and Extra Info using the respective `PATCH` endpoints.
- [ ] Ensure Employee Role users can only access their own profile (self-service enforcement).

## Module 4: Attendance Tracking
- [ ] Update `src/pages/Attendance.tsx` (HR View) to fetch from `GET /attendance`.
- [ ] Implement saving attendance rows via `PUT /attendance/save`.
- [ ] Implement submitting attendance to HO via `POST /attendance/submit`.
- [ ] Implement unlock request and approve workflows for attendance records.
- [ ] Update `src/pages/MyAttendance.tsx` (Employee View) to fetch their own records and implement the "Acknowledge" action (`PATCH /attendance/:id/ack`).

## Module 5: Leave Management
- [ ] Update `src/pages/Leave.tsx` (HR View) to list leave requests via `GET /leave-requests`.
- [ ] Implement leave approval (`PATCH /leave-requests/:id/approve`) and rejection (`PATCH /leave-requests/:id/reject`).
- [ ] Update `src/pages/MyLeave.tsx` (Employee View) to fetch their own leave balances and requests.
- [ ] Implement the "Submit Leave" form calling `POST /leave-requests` with proper validation.

## Module 6: Penalties & Dashboards (Final Polish)
- [ ] Wire up Penalty workflows (Propose, Review, Acknowledge) in the respective pages.
- [ ] Hook up `src/pages/Dashboard.tsx` to fetch real metrics from `GET /dashboard/metrics`.
- [ ] Hook up `src/pages/MyDashboard.tsx` to fetch real metrics from `GET /dashboard/me`.
- [ ] Verify role-based UI adaptations (hiding/showing buttons and nav items based on `hasPermission` utility).
