import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  CalendarRange,
  LayoutGrid,
  Megaphone,
  ShieldCheck,
  Users,
  Wallet,
  AlertTriangle,
  MapPin,
  Package,
  DollarSign,
  GitBranch,
  Calculator,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

type ModuleCard = {
  title: string;
  description: string;
  to: string;
  icon: React.ComponentType<{ size?: number }>;
  roles: string[];
  disabled?: boolean;
};

const modules: ModuleCard[] = [
  {
    title: "HR Dashboard",
    description: "Branch-wise people analytics and lock controls",
    to: "/hr/branch-dashboard",
    icon: LayoutGrid,
    roles: ["super_admin", "hr"],
  },
  {
    title: "Attendance",
    description: "Live attendance feed and status management",
    to: "/attendance",
    icon: CalendarCheck,
    roles: ["super_admin", "hr"],
  },
  {
    title: "Employees",
    description: "Employee records, onboarding and contracts",
    to: "/employees",
    icon: Users,
    roles: ["super_admin", "hr"],
  },
  {
    title: "CSR / CRM",
    description: "Customers, leads, quotations and client approval handoff",
    to: "/crm",
    icon: Users,
    roles: ["super_admin", "csr_officer"],
  },
  {
    title: "Inventory Logistics",
    description: "Stock, serials, dispatches, installers and returns",
    to: "/inventory",
    icon: Package,
    roles: ["super_admin", "inventory_officer", "inv_fin_admin"],
  },
  {
    title: "Finance & Client Billing",
    description: "Accounts, invoice templates, summaries and payment ledger",
    to: "/client-invoicing",
    icon: DollarSign,
    roles: ["super_admin", "finance_officer", "inv_fin_admin"],
  },
  {
    title: "Invoice Builder",
    description: "Client templates, editable rows, formulas, preview and saved drafts",
    to: "/invoice-builder",
    icon: Calculator,
    roles: ["super_admin", "finance_officer", "inv_fin_admin"],
  },
  {
    title: "Matrix Operations",
    description: "End-to-end CSR, inventory, installer and finance workflow",
    to: "/matrix-operations",
    icon: GitBranch,
    roles: ["super_admin", "csr_officer", "inventory_officer", "finance_officer", "inv_fin_admin"],
  },
  {
    title: "Payroll",
    description: "Payroll module placeholder and payslip readiness notes",
    to: "/payroll",
    icon: Wallet,
    roles: ["super_admin", "head_hr", "hr_manager"],
    disabled: true,
  },
  {
    title: "Announcements",
    description: "Broadcast updates to branch and departments",
    to: "/announcements",
    icon: Megaphone,
    roles: ["super_admin", "head_hr", "branch_hr", "department_hr", "department_head", "hr_manager", "hr_executive", "employee"],
  },
  {
    title: "Calendar Events",
    description: "View holidays, events, and birthday markers",
    to: "/calendar",
    icon: CalendarRange,
    roles: ["super_admin", "head_hr", "branch_hr", "department_hr", "department_head", "hr_manager", "hr_executive", "employee"],
  },
  {
    title: "Directory",
    description: "Find employees and contact people quickly",
    to: "/directory",
    icon: MapPin,
    roles: ["super_admin", "head_hr", "branch_hr", "department_hr", "department_head", "hr_manager", "hr_executive", "employee"],
  },
  {
    title: "Penalty",
    description: "Apply and review employee penalties",
    to: "/penalty",
    icon: AlertTriangle,
    roles: ["super_admin", "head_hr", "branch_hr", "department_hr", "department_head", "hr_manager", "hr_executive"],
  },
  {
    title: "Penalty Workflow",
    description: "Branch to HO approvals and decisions",
    to: "/penalty-workflow",
    icon: ShieldCheck,
    roles: ["super_admin", "head_hr", "hr_manager"],
  },
];

const hrRoles = new Set(["hr", "head_hr", "branch_hr", "department_hr", "department_head", "hr_manager", "hr_executive"]);

function roleMatches(module: ModuleCard, role: string) {
  if (module.roles.includes(role)) return true;
  return module.roles.includes("hr") && hrRoles.has(role);
}

export default function Launchpad() {
  const navigate = useNavigate();
  const { activeRole } = useAuth();
  const visibleModules = modules.filter((module) => roleMatches(module, activeRole));

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">Launchpad</div>
          <div className="pg-sub">Open modules by role with quick context.</div>
        </div>
        <span className="live-badge">
          <span className="live-dot" />
          Active Session
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
        }}
      >
        {visibleModules.map((module) => (
          <button
            key={module.title}
            className="card"
            onClick={() => {
              if (!module.disabled) navigate(module.to);
            }}
            style={{ textAlign: "left", cursor: module.disabled ? "not-allowed" : "pointer", opacity: module.disabled ? 0.62 : 1 }}
            disabled={module.disabled}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div className="ct-ico blue">
                <module.icon size={16} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--t1)" }}>
                {activeRole === "department_head" && module.title === "Employees" ? "Department Team" : module.title}
              </div>
            </div>
            <p style={{ color: "var(--t3)", fontSize: 12 }}>{module.description}</p>
            {module.disabled && <span className="pill pill-steel">Coming Soon</span>}
          </button>
        ))}
      </div>

      {activeRole !== "employee" && activeRole !== "department_head" && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="ct" style={{ marginBottom: 8 }}>
            <div className="ct-ico teal">
              <ShieldCheck size={16} />
            </div>
            Quick Controls
          </div>
          <p style={{ color: "var(--t3)", fontSize: 12, marginBottom: 12 }}>
            Jump directly to branch lock controls for attendance sheets.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/hr/branch-dashboard")}>
            Open Branch Lock Center
          </button>
        </div>
      )}
    </div>
  );
}
