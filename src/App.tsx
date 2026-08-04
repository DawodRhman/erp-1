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
const InventoryDashboard = lazy(() => import("./pages/InventoryDashboard"));
const InventoryFlowDashboard = lazy(() => import("./pages/InventoryFlowDashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const CrmDashboard = lazy(() => import("./pages/CrmDashboard"));
const CrmLeads = lazy(() => import("./pages/CrmLeads"));
const CrmClients = lazy(() => import("./pages/CrmClients"));
const CrmQuotations = lazy(() => import("./pages/CrmQuotations"));
const CrmCreateQuotation = lazy(() => import("./pages/CrmCreateQuotation"));
const ClientQuotationApproval = lazy(() => import("./pages/ClientQuotationApproval"));
const InventoryQueue = lazy(() => import("./pages/InventoryQueue"));
const InventoryProducts = lazy(() => import("./pages/InventoryProducts"));
const InventorySerials = lazy(() => import("./pages/InventorySerials"));
const InventoryPurchasing = lazy(() => import("./pages/InventoryPurchasing"));
const InventoryDispatches = lazy(() => import("./pages/InventoryDispatches"));
const InstallerReturns = lazy(() => import("./pages/InstallerReturns"));
const InventoryBillingApproval = lazy(() => import("./pages/InventoryBillingApproval"));
const InventoryMovements = lazy(() => import("./pages/InventoryMovements"));
const ClientInvoicing = lazy(() => import("./pages/ClientInvoicing"));
const InvoiceBuilder = lazy(() => import("./pages/InvoiceBuilder"));
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

const HR_WORKSPACE_ROLES = [
  "super_admin",
  "ceo",
  "head_hr",
  "branch_hr",
  "department_hr",
  "department_head",
  "hr_manager",
  "hr_executive",
];

const HR_WRITE_ROLES = [
  "super_admin",
  "head_hr",
  "hr_manager",
  "branch_hr",
  "department_hr",
  "hr_executive",
];

const HR_ADMIN_ROLES = ["super_admin", "head_hr", "hr_manager"];

function getDefaultRouteForRole(activeRole: string) {
  if (activeRole === "employee") return "/my-dashboard";
  if (activeRole === "branch_hr") return "/hr/branch-dashboard";
  if (activeRole === "head_hr") return "/attendance-head-review";
  if (activeRole === "csr_officer") return "/crm";
  if (activeRole === "inventory_officer") return "/inventory-dashboard";
  if (activeRole === "finance_officer") return "/finance-dashboard";
  if (activeRole === "inv_fin_admin") return "/inventory-dashboard";
  if (
    activeRole === "department_hr" ||
    activeRole === "department_head" ||
    activeRole === "ceo" ||
    activeRole === "hr_manager" ||
    activeRole === "hr_executive"
  ) {
    return "/dashboard";
  }
  return "/launchpad";
}

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
    return <Navigate to={getDefaultRouteForRole(activeRole)} replace />;
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
    return <Navigate to={getDefaultRouteForRole(activeRole)} replace />;
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

  return <Navigate to={getDefaultRouteForRole(activeRole)} />;
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
            <Route path="/client/quotations/:token" element={<ClientQuotationApproval />} />
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
                    "csr_officer",
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
                <Route element={<ProtectedRoute allowedRoles={HR_WORKSPACE_ROLES} />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/employees/:id" element={<EmployeeDetail />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/leave" element={<Leave />} />
                  <Route path="/leave-wallet" element={<LeaveWalletHistory />} />
                  <Route path="/penalty" element={<PenaltyLedger />} />
                  <Route path="/penalty-ledger" element={<Navigate to="/penalty" replace />} />
                  <Route path="/announcements" element={<AnnouncementsFeed />} />
                  <Route path="/calendar" element={<Calendar />} />
                </Route>
                <Route
                  element={<ProtectedRoute allowedRoles={["super_admin", "csr_officer"]} />}
                >
                  <Route path="/crm" element={<CrmDashboard />} />
                  <Route path="/crm/leads" element={<CrmLeads />} />
                  <Route path="/crm/clients" element={<CrmClients />} />
                  <Route path="/crm/quotations" element={<CrmQuotations />} />
                  <Route path="/crm/quotations/new" element={<CrmCreateQuotation />} />
                </Route>
                <Route
                  element={<ProtectedRoute allowedRoles={["super_admin", "inventory_officer", "inv_fin_admin"]} />}
                >
                  <Route path="/inventory-dashboard" element={<InventoryDashboard />} />
                  <Route path="/inventory" element={<InventoryFlowDashboard />} />
                  <Route path="/inventory/queue" element={<InventoryQueue />} />
                  <Route path="/inventory/products" element={<InventoryProducts />} />
                  <Route path="/inventory/serials" element={<InventorySerials />} />
                  <Route path="/inventory/purchasing" element={<InventoryPurchasing />} />
                  <Route path="/inventory/dispatches" element={<InventoryDispatches />} />
                  <Route path="/inventory/returns" element={<InstallerReturns />} />
                  <Route path="/inventory/billing-approval" element={<InventoryBillingApproval />} />
                  <Route path="/inventory/movements" element={<InventoryMovements />} />
                  <Route path="/inventory/master-setup" element={<Inventory />} />
                </Route>
                <Route
                  element={<ProtectedRoute allowedRoles={["super_admin", "finance_officer", "inv_fin_admin"]} />}
                >
                  <Route path="/finance-dashboard" element={<ClientInvoicing />} />
                  <Route path="/client-invoicing" element={<ClientInvoicing />} />
                  <Route path="/invoice-builder" element={<InvoiceBuilder />} />
                </Route>
                <Route
                  element={<ProtectedRoute allowedRoles={["super_admin", "csr_officer", "inventory_officer", "finance_officer", "inv_fin_admin"]} />}
                >
                  <Route path="/matrix-operations" element={<MatrixOperations />} />
                </Route>
                <Route path="/directory" element={<Directory />} />
                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={HR_WRITE_ROLES}
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
                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={HR_WORKSPACE_ROLES}
                    />
                  }
                >
                  <Route path="/duty-roster" element={<DutyRoster />} />
                </Route>
                <Route
                  element={<ProtectedRoute allowedRoles={HR_ADMIN_ROLES} />}
                >
                  <Route path="/payroll" element={<Payroll />} />
                </Route>
                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={HR_WRITE_ROLES}
                    />
                  }
                >
                  <Route path="/promotions" element={<Promotions />} />
                </Route>
                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={HR_WORKSPACE_ROLES}
                      anyPermissions={["announcements:write", "announcements:department_write"]}
                    />
                  }
                >
                  <Route path="/announcements/manage" element={<AnnouncementsSettings />} />
                </Route>

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
                <Route
                  element={<ProtectedRoute allowedRoles={["super_admin", "head_hr"]} />}
                >
                  <Route path="/overview" element={<OverviewPage />} />
                  <Route path="/saved-reports" element={<SavedReports />} />
                </Route>
                <Route
                  element={<ProtectedRoute allowedRoles={HR_ADMIN_ROLES} />}
                >
                  <Route path="/leave-capacity" element={<LeaveCapacity />} />
                </Route>
                <Route
                  element={<ProtectedRoute allowedRoles={HR_ADMIN_ROLES} />}
                >
                  <Route path="/penalty-workflow" element={<PenaltyWorkflow />} />
                </Route>

                {/* Final Report & Oversight */}
                <Route
                  element={<ProtectedRoute allowedRoles={["super_admin", "head_hr"]} />}
                >
                  <Route
                    path="/attendance-report"
                    element={<AttendanceReport />}
                  />
                </Route>

                {/* Configuration Pages */}
                <Route
                  element={<ProtectedRoute allowedRoles={HR_ADMIN_ROLES} />}
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
                    <ProtectedRoute allowedRoles={HR_ADMIN_ROLES} />
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
