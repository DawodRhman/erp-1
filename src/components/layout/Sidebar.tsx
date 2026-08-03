import React, { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  DollarSign,
  TrendingUp,
  Settings,
  Building2,
  Briefcase,
  Monitor,
  MapPin,
  UserCheck,
  ClipboardList,
  CheckCircle2,
  Clock,
  CalendarRange,
  Wallet,
  AlertTriangle,
  ShieldCheck,
  Bell,
  ScrollText,
  LogOut,
  ChevronDown,
  ChevronRight,
  Zap,
  Package,
  GitBranch,
  FileSpreadsheet,
} from "lucide-react";
import { useData } from "../../context/DataContext";
import { useToastContext } from "../../context/ToastContext";
import logo from "../../images/logo.png";
import { settingsNavigationGroups } from "../../pages/settings/settingsConfig";

type SidebarLink = {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  badge?: string;
  comingSoon?: boolean;
  disabled?: boolean;
};

type SidebarSection = {
  label: string;
  links: SidebarLink[];
};

export default function Sidebar() {
  const { user, activeRole, logout } = useAuth();
  const { allAttendanceToday, leaveRequests } = useData();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();
  const isSettingsActive = location.pathname.startsWith("/settings");

  const getUserInitials = (name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const initials = getUserInitials(user?.username || "");
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  const superAdminLinks: SidebarLink[] = [
    // Active/Enabled first
    { to: "/launchpad", icon: Zap, label: "Launchpad" },
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/crm", icon: Users, label: "CSR / CRM" },
    { to: "/inventory-dashboard", icon: LayoutDashboard, label: "Inventory Dashboard" },
    { to: "/inventory", icon: Package, label: "Inventory Logistics" },
    { to: "/invoice-builder", icon: FileSpreadsheet, label: "Invoice Builder" },
    { to: "/client-invoicing", icon: DollarSign, label: "Client Invoicing & Summaries" },
    { to: "/accounts", icon: ShieldCheck, label: "User Accounts" },
    { to: "/matrix-operations", icon: GitBranch, label: "Matrix Operations (V2.1)" },
    { to: "/employees", icon: Users, label: "Employees" },
    { to: "/attendance", icon: CalendarCheck, label: "Attendance" },
    { to: "/leave", icon: CalendarDays, label: "Leave" },
    { to: "/payroll", icon: DollarSign, label: "Payroll", disabled: true },
    { to: "/leave-wallet", icon: Wallet, label: "Leave Wallet" },
    { to: "/penalty", icon: ClipboardList, label: "Penalty" },
    { to: "/penalty-workflow", icon: CheckCircle2, label: "Penalty Submissions" },
    { to: "/announcements", icon: Zap, label: "Announcements" },
    { to: "/calendar", icon: CalendarRange, label: "Calendar Events" },
    { to: "/directory", icon: MapPin, label: "Directory" },
    
    // Disabled items down
    {
      to: "/hr/branch-dashboard",
      icon: Building2,
      label: "Branch HR Dashboard",
      disabled: true,
    },
    { to: "/overview", icon: Monitor, label: "Overview", disabled: true },
    {
      to: "/saved-reports",
      icon: ScrollText,
      label: "Saved Reports",
      disabled: true,
    },
    {
      to: "/attendance-head-review",
      icon: ShieldCheck,
      label: "Head HR Review",
      disabled: true,
    },
    {
      to: "/attendance-report",
      icon: ClipboardList,
      label: "Final Attendance Report",
      disabled: true,
    },
  ];

  const headHrLinks: SidebarLink[] = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/employees", icon: Users, label: "Employees" },
    { to: "/attendance", icon: CalendarCheck, label: "Attendance" },
    { to: "/leave", icon: CalendarDays, label: "Leave" },
    { to: "/payroll", icon: DollarSign, label: "Payroll" },
    { to: "/leave-wallet", icon: Wallet, label: "Leave Wallet" },
    { to: "/penalty", icon: ClipboardList, label: "Penalty" },
    { to: "/penalty-workflow", icon: CheckCircle2, label: "Penalty Submissions" },
    { to: "/announcements", icon: Zap, label: "Announcements" },
    { to: "/calendar", icon: CalendarRange, label: "Calendar Events" },
    { to: "/directory", icon: MapPin, label: "Directory" },
    { to: "/accounts", icon: ShieldCheck, label: "HR Accounts" },
  ];

  // Branch HR - Branch level access (no branch-dashboard link here)
  const branchHrLinks: SidebarLink[] = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/employees", icon: Users, label: "Employees" },
    { to: "/attendance", icon: CalendarCheck, label: "Attendance" },
    { to: "/leave", icon: CalendarDays, label: "Leave" },
    { to: "/leave-wallet", icon: Wallet, label: "Leave Wallet" },
    { to: "/penalty", icon: ClipboardList, label: "Penalty" },
    { to: "/penalty-workflow", icon: CheckCircle2, label: "Penalty Submissions" },
    { to: "/announcements", icon: Zap, label: "Announcements" },
    { to: "/calendar", icon: CalendarRange, label: "Calendar Events" },
    { to: "/directory", icon: MapPin, label: "Directory" },
  ];

  // Department HR - Department level access
  const departmentHrLinks: SidebarLink[] = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/employees", icon: Users, label: "Employees" },
    { to: "/attendance", icon: CalendarCheck, label: "Attendance" },
    { to: "/leave", icon: CalendarDays, label: "Leave" },
    { to: "/leave-wallet", icon: Wallet, label: "Leave Wallet" },
    { to: "/penalty", icon: ClipboardList, label: "Penalty" },
    { to: "/penalty-workflow", icon: CheckCircle2, label: "Penalty Submissions" },
    { to: "/announcements", icon: Zap, label: "Announcements" },
    { to: "/calendar", icon: CalendarRange, label: "Calendar Events" },
    { to: "/directory", icon: MapPin, label: "Directory" },
  ];

  const departmentHeadLinks: SidebarLink[] = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/employees", icon: Users, label: "Department Team" },
    { to: "/attendance", icon: CalendarCheck, label: "Attendance" },
    { to: "/leave", icon: CalendarDays, label: "Leave" },
    { to: "/penalty", icon: ClipboardList, label: "Penalty" },
    { to: "/announcements", icon: Zap, label: "Announcements" },
    { to: "/announcements/manage", icon: Zap, label: "Manage Announcements" },
    { to: "/calendar", icon: CalendarRange, label: "Calendar Events" },
    { to: "/settings/calendar-events", icon: CalendarRange, label: "Manage Calendar Events" },
    { to: "/directory", icon: MapPin, label: "Directory" },
  ];

  const ceoLinks: SidebarLink[] = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/employees", icon: Users, label: "Employees" },
    { to: "/attendance", icon: CalendarCheck, label: "Attendance" },
    { to: "/leave", icon: CalendarDays, label: "Leave" },
    { to: "/penalty", icon: ClipboardList, label: "Penalty" },
    { to: "/announcements", icon: Zap, label: "Announcements" },
    { to: "/calendar", icon: CalendarRange, label: "Calendar Events" },
    { to: "/directory", icon: MapPin, label: "Directory" },
  ];

  const inventoryOfficerLinks: SidebarLink[] = [
    { to: "/inventory-dashboard", icon: LayoutDashboard, label: "Inventory Dashboard" },
    { to: "/inventory", icon: Package, label: "Inventory Control" },
    { to: "/matrix-operations", icon: GitBranch, label: "Operations Matrix" },
    { to: "/directory", icon: MapPin, label: "Directory" },
  ];

  const financeOfficerLinks: SidebarLink[] = [
    { to: "/finance-dashboard", icon: LayoutDashboard, label: "Finance Dashboard" },
    { to: "/invoice-builder", icon: FileSpreadsheet, label: "Invoice Builder" },
    { to: "/client-invoicing", icon: DollarSign, label: "Client Billing" },
    { to: "/matrix-operations", icon: GitBranch, label: "Matrix Settlement" },
    { to: "/directory", icon: MapPin, label: "Directory" },
  ];

  const csrOfficerLinks: SidebarLink[] = [
    { to: "/crm", icon: Users, label: "CSR / CRM" },
    { to: "/matrix-operations", icon: GitBranch, label: "Sales Matrix" },
    { to: "/directory", icon: MapPin, label: "Directory" },
  ];

  const invFinAdminLinks: SidebarLink[] = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/inventory-dashboard", icon: LayoutDashboard, label: "Inventory Dashboard" },
    { to: "/inventory", icon: Package, label: "Inventory Control" },
    { to: "/client-invoicing", icon: DollarSign, label: "Client Billing" },
    { to: "/invoice-builder", icon: FileSpreadsheet, label: "Invoice Builder" },
    { to: "/matrix-operations", icon: GitBranch, label: "Matrix Operations" },
    { to: "/directory", icon: MapPin, label: "Directory" },
  ];

  // Select menu based on role
  const mainLinks =
    activeRole === "super_admin"
      ? superAdminLinks
      : activeRole === "inv_fin_admin"
      ? invFinAdminLinks
      : activeRole === "inventory_officer"
        ? inventoryOfficerLinks
      : activeRole === "finance_officer"
        ? financeOfficerLinks
      : activeRole === "csr_officer"
        ? csrOfficerLinks
      : activeRole === "ceo"
        ? ceoLinks
      : activeRole === "head_hr"
        ? headHrLinks
        : activeRole === "hr_manager"
          ? headHrLinks
          : activeRole === "hr_executive"
            ? departmentHrLinks
      : activeRole === "branch_hr"
              ? branchHrLinks
              : activeRole === "department_hr"
                ? departmentHrLinks
                : activeRole === "department_head"
                ? departmentHeadLinks
                : [];

  const sidebarSections: SidebarSection[] = (() => {
    if (activeRole === "super_admin") {
      return [
        {
          label: "Core Modules",
          links: [
            { to: "/launchpad", icon: Zap, label: "Launchpad" },
            { to: "/dashboard", icon: LayoutDashboard, label: "ERP Dashboard" },
          ],
        },
        {
          label: "Inventory Service",
          links: [
            { to: "/crm", icon: Users, label: "CSR / CRM" },
            { to: "/inventory-dashboard", icon: LayoutDashboard, label: "Inventory Dashboard" },
            { to: "/inventory", icon: Package, label: "Inventory Logistics" },
            { to: "/invoice-builder", icon: FileSpreadsheet, label: "Invoice Builder" },
            { to: "/client-invoicing", icon: DollarSign, label: "Client Invoicing & Summaries" },
            { to: "/accounts", icon: ShieldCheck, label: "User Accounts" },
            { to: "/matrix-operations", icon: GitBranch, label: "Matrix Operations (V2.1)" },
          ],
        },
        {
          label: "EMS Workspace",
          links: [
            { to: "/employees", icon: Users, label: "Employees" },
            { to: "/attendance", icon: CalendarCheck, label: "Attendance" },
            { to: "/leave", icon: CalendarDays, label: "Leave" },
            { to: "/payroll", icon: DollarSign, label: "Payroll", disabled: true },
            { to: "/leave-wallet", icon: Wallet, label: "Leave Wallet" },
            { to: "/penalty", icon: ClipboardList, label: "Penalty" },
            { to: "/penalty-workflow", icon: CheckCircle2, label: "Penalty Submissions" },
            { to: "/announcements", icon: Zap, label: "Announcements" },
            { to: "/calendar", icon: CalendarRange, label: "Calendar Events" },
            { to: "/directory", icon: MapPin, label: "Directory" },
          ],
        },
        {
          label: "HR Review",
          links: [
            { to: "/hr/branch-dashboard", icon: Building2, label: "Branch HR Dashboard", disabled: true },
            { to: "/overview", icon: Monitor, label: "Overview", disabled: true },
            { to: "/saved-reports", icon: ScrollText, label: "Saved Reports", disabled: true },
            { to: "/attendance-head-review", icon: ShieldCheck, label: "Head HR Review", disabled: true },
            { to: "/attendance-report", icon: ClipboardList, label: "Final Attendance Report", disabled: true },
          ],
        },
      ];
    }

    if (activeRole === "inventory_officer") {
      return [
        {
          label: "Inventory Service",
          links: [
            { to: "/inventory-dashboard", icon: LayoutDashboard, label: "Inventory Dashboard" },
            { to: "/inventory", icon: Package, label: "Inventory Control" },
            { to: "/matrix-operations", icon: GitBranch, label: "Operations Matrix" },
          ],
        },
        { label: "Reference", links: [{ to: "/directory", icon: MapPin, label: "Directory" }] },
      ];
    }

    if (activeRole === "finance_officer") {
      return [
        {
          label: "Finance Service",
          links: [
            { to: "/finance-dashboard", icon: LayoutDashboard, label: "Finance Dashboard" },
            { to: "/invoice-builder", icon: FileSpreadsheet, label: "Invoice Builder" },
            { to: "/client-invoicing", icon: DollarSign, label: "Client Billing" },
            { to: "/matrix-operations", icon: GitBranch, label: "Matrix Settlement" },
          ],
        },
        { label: "Reference", links: [{ to: "/directory", icon: MapPin, label: "Directory" }] },
      ];
    }

    if (activeRole === "inv_fin_admin") {
      return [
        {
          label: "Inventory & Finance Service",
          links: [
            { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
            { to: "/inventory-dashboard", icon: LayoutDashboard, label: "Inventory Dashboard" },
            { to: "/inventory", icon: Package, label: "Inventory Control" },
            { to: "/client-invoicing", icon: DollarSign, label: "Client Billing" },
            { to: "/invoice-builder", icon: FileSpreadsheet, label: "Invoice Builder" },
            { to: "/matrix-operations", icon: GitBranch, label: "Matrix Operations" },
          ],
        },
        { label: "Reference", links: [{ to: "/directory", icon: MapPin, label: "Directory" }] },
      ];
    }

    if (activeRole === "csr_officer") {
      return [
        {
          label: "CSR / CRM Service",
          links: [
            { to: "/crm", icon: Users, label: "CSR / CRM" },
            { to: "/matrix-operations", icon: GitBranch, label: "Sales Matrix" },
          ],
        },
        { label: "Reference", links: [{ to: "/directory", icon: MapPin, label: "Directory" }] },
      ];
    }

    return [{ label: "Core Modules", links: mainLinks }];
  })();

  const { showToast } = useToastContext();

  const adminLinks = [
    { to: "/accounts", icon: ShieldCheck, label: "HR Accounts" },
    { to: "/audit-log", icon: ScrollText, label: "Audit Log" },
  ];

  const selfServiceLinks: SidebarLink[] = [
    { to: "/my-dashboard", icon: LayoutDashboard, label: "My Dashboard" },
    { to: "/my-attendance", icon: CalendarCheck, label: "My Attendance" },
    { to: "/my-leave", icon: CalendarDays, label: "My Leave" },
    { to: "/my-penalties", icon: AlertTriangle, label: "My Penalties" },
    { to: "/my-profile", icon: UserCheck, label: "My Profile" },
  ];

  const liveAttendance = useMemo(() => {
    const total = allAttendanceToday.length || 1;
    const present = allAttendanceToday.filter(
      (row: any) => row.status === "Present",
    ).length;
    return Math.round((present / total) * 100);
  }, [allAttendanceToday]);

  const pendingLeave = leaveRequests.filter(
    (row: any) => row.status === "Pending",
  ).length;

  const serviceOnlyRoles = new Set([
    "csr_officer",
    "inventory_officer",
    "finance_officer",
    "inv_fin_admin",
  ]);
  const showMyWorkspace = activeRole !== "super_admin";
  const isMyWorkspaceDisabled = serviceOnlyRoles.has(activeRole || "");

  return (
    <div className="sidebar">
      <div className="sb-logo">
        <div className="sb-logo-row">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={logo} alt="Company Logo" className="sb-logo-img" />
            <div>
              <div className="sb-title">EMS</div>
              <div className="sb-subtitle">Employee Management</div>
            </div>
          </div>
        </div>
        {/* Prototype wala pura section yahan se remove kar diya gaya hai */}
      </div>

      {sidebarSections.map((section, sectionIndex) => (
        <React.Fragment key={section.label}>
          {sectionIndex > 0 && <div className="sb-div" />}
          <div className="sb-sec">
            <div className="sb-lbl">{section.label}</div>
            {section.links.map((link) =>
              link.disabled ? (
                <div
                  key={link.to}
                  className="nav-a"
                  style={{
                    cursor: "not-allowed",
                    opacity: 0.5,
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  <link.icon size={14} className="nav-ico" />
                  {link.label}
                  {link.badge && <span className="nav-badge">{link.badge}</span>}
                </div>
              ) : link.comingSoon ? (
                <div
                  key={link.to}
                  className={`nav-a`}
                  onClick={() => showToast("Coming soon", "error")}
                  style={{ cursor: "pointer" }}
                >
                  <link.icon size={14} className="nav-ico" />
                  {link.label}
                  {link.badge && <span className="nav-badge">{link.badge}</span>}
                </div>
              ) : (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/announcements"}
                  className={({ isActive }) => `nav-a ${isActive ? "active" : ""}`}
                >
                  <link.icon size={14} className="nav-ico" />
                  {link.label}
                  {link.badge && <span className="nav-badge">{link.badge}</span>}
                </NavLink>
              ),
            )}
          </div>
        </React.Fragment>
      ))}

      {showMyWorkspace && (
        <>
          <div className="sb-div" />
          <div className="sb-sec">
            <div className="sb-lbl">My Workspace</div>
            {isMyWorkspaceDisabled && (
              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.45,
                  color: "var(--sb-lbl)",
                  opacity: 0.8,
                  padding: "0 16px 8px",
                }}
              >
                Personal EMS tools are disabled for this service login.
              </div>
            )}
            {selfServiceLinks.map((link) =>
              isMyWorkspaceDisabled ? (
                <div
                  key={link.to}
                  className="nav-a"
                  title="Use the service workspace links above for this login"
                  style={{
                    cursor: "not-allowed",
                    opacity: 0.45,
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  <link.icon size={14} className="nav-ico" />
                  {link.label}
                </div>
              ) : (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `nav-a ${isActive ? "active" : ""}`
                  }
                >
                  <link.icon size={14} className="nav-ico" />
                  {link.label}
                </NavLink>
              ),
            )}
          </div>
        </>
      )}

      {(activeRole === "super_admin" ||
        activeRole === "head_hr" ||
        activeRole === "hr_manager") && (
        <>
          <div className="sb-div" />
          <div className="sb-sec">
            <button
              className="collapsible-toggle"
              onClick={() => setSettingsOpen(!settingsOpen)}
              style={{ color: isSettingsActive ? "#90caf9" : "var(--sb-lbl)" }}
            >
              {settingsOpen ? (
                <ChevronDown size={10} />
              ) : (
                <ChevronRight size={10} />
              )}
              System Configuration
            </button>
            {settingsOpen && (
              <>
                {settingsNavigationGroups.map((group) => (
                  <React.Fragment key={group.label}>
                    <div className="sb-lbl" style={{ marginTop: 10 }}>
                      {group.label}
                    </div>
                    {group.links.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) =>
                          `nav-a ${isActive ? "active" : ""}`
                        }
                      >
                        <Settings size={14} className="nav-ico" />
                        {link.label}
                      </NavLink>
                    ))}
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {activeRole === "super_admin" && (
        <>
          <div className="sb-div" />
          <div className="sb-sec">
            {adminLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `nav-a ${isActive ? "active" : ""}`
                }
              >
                <link.icon size={14} className="nav-ico" />
                {link.label}
              </NavLink>
            ))}
          </div>
        </>
      )}

      {/* Workflow Role UI removed per request */}

      <div className="sb-bottom">
        <div className="sb-user">
          <div className="sb-chip" onClick={handleLogout} role="button" tabIndex={0}>
            <div className="sb-av">{initials}</div>
            <div>
              <div className="sb-un">Logout</div>
              <div className="sb-ur">End current session</div>
            </div>
            <LogOut
              size={14}
              style={{ marginLeft: "auto", color: "rgba(15,23,42,.5)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
