import React, { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useAuthStore } from "./store/useAuthStore";
import { ToastProvider } from "./context/ToastContext";
import { DataProvider } from "./context/DataContext";

// Layouts
import MainLayout from "./layouts/MainLayout";
import EmployeeLayout from "./layouts/EmployeeLayout";

// Lazy-loaded pages — split at route boundaries for smaller bundles
const Login = lazy(() => import("./pages/Login"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Launchpad = lazy(() => import("./pages/Launchpad"));
const Employees = lazy(() => import("./pages/Employees"));
const EmployeeBulkUpload = lazy(() => import("./pages/EmployeeBulkUpload"));
const AddEmployeePage = lazy(() => import("./pages/AddEmployee"));
import { EmployeeWizardProvider } from "./context/EmployeeWizardContext";
const EmployeeDetail = lazy(() => import("./pages/EmployeeDetail"));
const Attendance = lazy(() => import("./pages/Attendance"));
const DutyRoster = lazy(() => import("./pages/DutyRoster"));
const Leave = lazy(() => import("./pages/Leave"));
const Payroll = lazy(() => import("./pages/Payroll"));
const Promotions = lazy(() => import("./pages/Promotions"));
const Accounts = lazy(() => import("./pages/Accounts"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const BranchHRDashboard = lazy(() => import("./pages/BranchHRDashboard"));
const HeadOfficeHR = lazy(() => import("./pages/HeadOfficeHR"));
const AttendanceReport = lazy(() => import("./pages/AttendanceReport"));
const OverviewPage = lazy(() => import("./pages/Overview"));
const SavedReports = lazy(() => import("./pages/SavedReports"));
const PenaltyWorkflow = lazy(() => import("./pages/PenaltyWorkflow"));
const LeaveCapacity = lazy(() => import("./pages/LeaveCapacity"));
const AttendanceVerification = lazy(() => import("./pages/AttendanceVerification"));
const LeaveWalletHistory = lazy(() => import("./pages/LeaveWalletHistory"));
const PenaltyLedger = lazy(() => import("./pages/PenaltyLedger"));
const AnnouncementsFeed = lazy(() => import("./pages/AnnouncementsFeed"));
const Directory = lazy(() => import("./pages/Directory"));
const Inventory = lazy(() => import("./pages/Inventory"));
const MatrixOperations = lazy(() => import("./pages/MatrixOperations"));
const EmployeeWidgets = lazy(() => import("./pages/EmployeeWidgets"));
const Calendar = lazy(() => import("./pages/Calendar"));
import FeaturePlaceholder from "./components/FeaturePlaceholder";
const CalendarEventsSettings = lazy(() => import("./pages/settings/CalendarEventsSettings"));
const AnnouncementsSettings = lazy(() => import("./pages/settings/AnnouncementsSettings"));

// Employee Specific Pages
const MyDashboard = lazy(() => import("./pages/MyDashboard"));
const MyAttendance = lazy(() => import("./pages/MyAttendance"));
const MyPayslips = lazy(() => import("./pages/MyPayslips"));
const MyLeave = lazy(() => import("./pages/MyLeave"));
const MyPenalties = lazy(() => import("./pages/MyPenalties"));
const MyProfile = lazy(() => import("./pages/MyProfile"));

// Settings (kept static — small form pages)
import {
  DepartmentsPage,
  DesignationsPage,
  WorkModesPage,
  WorkLocationsPage,
  EmploymentTypesPage,
  JobStatusesPage,
  ShiftsPage,
  LeaveTypesPage,
  LeavePoliciesPage,
  LeaveCapacitySettingsPage,
  AllowanceTypesPage,
  PenaltyRulesPage,
  RolesPage,
} from "./pages/settings/AllSettings";

function SuspenseFallback() {
  return <div style={{ padding: 40, textAlign: "center", color: "var(--t3)" }}>Loading...</div>;
}

const EMPLOYEE_SELF_SERVICE_ROLES = [
  "employee",
  "head_hr",
  "branch_hr",
  "department_hr",
  "department_head",
  "hr_manager",
  "hr_executive",
];

/**
 * 1. Protected Route Wrapper
 * Checks if user is logged in.
 */
const ProtectedRoute = ({
  allowedRoles,
  requiredPermissions,
  anyPermissions,
}: {
  allowedRoles: string[];
  requiredPermissions?: string[];
  anyPermissions?: string[];
}) => {
  const { user, activeRole, loading } = useAuth();
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (loading) return <div>Loading...</div>; // Ya koi professional spinner

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (
    user.mustChangePassword &&
    window.location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
  }

  if (!allowedRoles.includes(activeRole)) {
    return (
      <Navigate
        to={activeRole === "employee" ? "/my-dashboard" : "/dashboard"}
        replace
      />
    );
  }

  if (
    requiredPermissions &&
    requiredPermissions.length > 0 &&
    !requiredPermissions.every((permission) => hasPermission(permission))
  ) {
    return <Unauthorized />;
  }

  if (
    anyPermissions &&
    anyPermissions.length > 0 &&
    !anyPermissions.some((permission) => hasPermission(permission))
  ) {
    return <Navigate to={activeRole === "employee" ? "/my-dashboard" : "/dashboard"} replace />;
  }

  return <Outlet />;
};

/**
 * 2. Root Redirect Logic
 */
function RootRedirect() {
  const { user, activeRole } = useAuth();
  if (!user) return <Navigate to="/login" />;

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" />;
  }

  // Route based on role to appropriate dashboard
  if (activeRole === "employee") {
    return <Navigate to="/my-dashboard" />;
  } else if (activeRole === "branch_hr") {
    return <Navigate to="/hr/branch-dashboard" />; // Branch HR sees branch-specific dashboard
  } else if (activeRole === "department_hr") {
    return <Navigate to="/dashboard" />; // Department HR sees filtered dashboard
  } else if (activeRole === "department_head" || activeRole === "ceo") {
    return <Navigate to="/dashboard" />;
  } else if (activeRole === "head_hr") {
    return <Navigate to="/attendance-head-review" />; // Head HR sees head office review
  } else if (activeRole === "hr_manager" || activeRole === "hr_executive") {
    return <Navigate to="/dashboard" />;
  } else {
    // super_admin
    return <Navigate to="/launchpad" />;
  }
}

const App = () => (
  <AuthProvider>
    <DataProvider>
      <ToastProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Suspense fallback={<SuspenseFallback />}>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={<RootRedirect />} />

            {/* --- ADMIN & HR ROUTES (MainLayout) --- */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[
                    "super_admin",
                    "ceo",
                    "head_hr",
                    "branch_hr",
                    "department_hr",
                    "department_head",
                    "hr_manager",
                    "hr_executive",
                    "inventory_officer",
                    "finance_officer",
                    "inv_fin_admin",
                  ]}
                />
              }
            >
              <Route element={<MainLayout />}>
                {/* Shared routes: both HR and SuperAdmin */}
                <Route
                  element={<ProtectedRoute allowedRoles={["super_admin"]} />}
                >
                  <Route path="/launchpad" element={<Launchpad />} />
                </Route>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/matrix-operations" element={<MatrixOperations />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/directory" element={<Directory />} />
                <Route path="/employees" element={<Employees />} />
                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={["super_admin", "head_hr", "hr_manager", "branch_hr", "department_hr", "hr_executive"]}
                      requiredPermissions={["employees:write"]}
                    />
                  }
                >
                  <Route path="/employees/bulk-upload" element={<EmployeeBulkUpload />} />
                  <Route
                    path="/employees/add"
                    element={
                      <EmployeeWizardProvider>
                        <AddEmployeePage />
                      </EmployeeWizardProvider>
                    }
                  />
                </Route>
                <Route path="/employees/:id" element={<EmployeeDetail />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={["super_admin", "head_hr", "hr_manager", "branch_hr", "department_hr", "department_head", "hr_executive"]}
                    />
                  }
                >
                  <Route path="/duty-roster" element={<DutyRoster />} />
                </Route>
                <Route path="/leave" element={<Leave />} />
                <Route
                  element={<ProtectedRoute allowedRoles={["super_admin", "head_hr", "hr_manager"]} />}
                >
                  <Route path="/payroll" element={<Payroll />} />
                </Route>
                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={["super_admin", "head_hr", "hr_manager", "branch_hr", "department_hr", "hr_executive"]}
                    />
                  }
                >
                  <Route path="/promotions" element={<Promotions />} />
                </Route>
                <Route path="/leave-wallet" element={<LeaveWalletHistory />} />
                <Route path="/penalty" element={<PenaltyLedger />} />
                <Route path="/penalty-ledger" element={<Navigate to="/penalty" replace />} />
                <Route path="/announcements" element={<AnnouncementsFeed />} />
                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={["super_admin", "head_hr", "hr_manager", "branch_hr", "department_hr", "department_head", "hr_executive"]}
                      anyPermissions={["announcements:write", "announcements:department_write"]}
                    />
                  }
                >
                  <Route path="/announcements/manage" element={<AnnouncementsSettings />} />
                </Route>
                <Route path="/calendar" element={<Calendar />} />

                {/* HR Workflow Pages: Branch HR executes, SuperAdmin watches */}
                <Route
                  element={
                    <ProtectedRoute allowedRoles={["super_admin", "head_hr", "branch_hr"]} />
                  }
                >
                  <Route
                    path="/hr/branch-dashboard"
                    element={<BranchHRDashboard />}
                  />
                </Route>
                <Route
                  element={<ProtectedRoute allowedRoles={["super_admin", "head_hr", "branch_hr", "department_hr", "hr_manager", "hr_executive"]} />}
                >
                  <Route
                    path="/attendance-verification"
                    element={<AttendanceVerification />}
                  />
                </Route>
                <Route
                  element={<ProtectedRoute allowedRoles={["super_admin", "head_hr"]} />}
                >
                  <Route
                    path="/attendance-head-review"
                    element={<HeadOfficeHR />}
                  />
                </Route>
                <Route path="/overview" element={<OverviewPage />} />
                <Route path="/saved-reports" element={<SavedReports />} />
                <Route
                  element={<ProtectedRoute allowedRoles={["super_admin", "head_hr", "hr_manager"]} />}
                >
                  <Route path="/leave-capacity" element={<LeaveCapacity />} />
                </Route>
                <Route
                  element={<ProtectedRoute allowedRoles={["super_admin", "head_hr", "hr_manager"]} />}
                >
                  <Route path="/penalty-workflow" element={<PenaltyWorkflow />} />
                </Route>

                {/* Final Report & Oversight */}
                <Route
                  path="/attendance-report"
                  element={<AttendanceReport />}
                />

                {/* Configuration Pages */}
                <Route
                  element={<ProtectedRoute allowedRoles={["super_admin", "head_hr", "hr_manager"]} />}
                >
                  <Route path="/settings/departments" element={<DepartmentsPage />} />
                  <Route path="/settings/designations" element={<DesignationsPage />} />
                  <Route path="/settings/work-modes" element={<WorkModesPage />} />
                  <Route path="/settings/work-locations" element={<WorkLocationsPage />} />
                  <Route path="/settings/employment-types" element={<EmploymentTypesPage />} />
                  <Route path="/settings/job-statuses" element={<JobStatusesPage />} />
                  <Route path="/settings/shifts" element={<ShiftsPage />} />
                  <Route path="/settings/leave-types" element={<LeaveTypesPage />} />
                  <Route path="/settings/leave-policies" element={<LeavePoliciesPage />} />
                  <Route path="/settings/leave-capacity" element={<LeaveCapacitySettingsPage />} />
                  <Route path="/settings/allowance-types" element={<AllowanceTypesPage />} />
                  <Route path="/settings/penalty-rules" element={<PenaltyRulesPage />} />
                  <Route path="/settings/roles" element={<RolesPage />} />
                  <Route path="/settings/directory" element={<Directory management />} />
                </Route>
                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={["super_admin", "head_hr", "hr_manager", "branch_hr", "department_hr", "department_head", "hr_executive"]}
                      anyPermissions={["calendar:write", "calendar:department_write"]}
                    />
                  }
                >
                  <Route path="/settings/calendar-events" element={<CalendarEventsSettings />} />
                </Route>
                {/* SuperAdmin + Head HR Only */}
                <Route
                  element={
                    <ProtectedRoute allowedRoles={["super_admin", "head_hr"]} />
                  }
                >
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/audit-log" element={<AuditLog />} />
                </Route>
              </Route>
            </Route>

            {/* --- EMPLOYEE ROUTES (EmployeeLayout) --- */}
            <Route element={<ProtectedRoute allowedRoles={EMPLOYEE_SELF_SERVICE_ROLES} />}>
              <Route element={<EmployeeLayout />}>
                <Route path="/my-dashboard" element={<MyDashboard />} />
                <Route path="/my-attendance" element={<MyAttendance />} />
                <Route
                  path="/my-payslips"
                  element={
                    <FeaturePlaceholder>
                      <MyPayslips />
                    </FeaturePlaceholder>
                  }
                />
                <Route path="/my-leave" element={<MyLeave />} />
                <Route path="/my-penalties" element={<MyPenalties />} />
                <Route path="/my-calendar" element={<Calendar />} />
                <Route path="/my-announcements" element={<AnnouncementsFeed />} />
                <Route path="/my-profile" element={<MyProfile />} />
                <Route
                  path="/my-widgets"
                  element={
                    <FeaturePlaceholder>
                      <EmployeeWidgets />
                    </FeaturePlaceholder>
                  }
                />
                <Route
                  path="/my-leave-wallet"
                  element={
                    <FeaturePlaceholder>
                      <LeaveWalletHistory />
                    </FeaturePlaceholder>
                  }
                />
                <Route path="/my-directory" element={<Directory />} />
              </Route>
            </Route>

            {/* 404 Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </DataProvider>
  </AuthProvider>
);

export default App;
