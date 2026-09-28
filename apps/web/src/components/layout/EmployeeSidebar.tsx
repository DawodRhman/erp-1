import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEmployee } from "../../hooks/useEmployees";
import { getRoleAccessConfig } from "../../utils/roleBasedAccess";
import{
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  User,
  LogOut,
  Zap,
  AlertTriangle,
  Users,
  CalendarRange,
  Megaphone,
} from "lucide-react";

export default function EmployeeSidebar() {
  const { user, activeRole, logout } = useAuth();
  const employeeId = user?.employeeId;
  const { data: employee, isLoading: empLoading } = useEmployee(employeeId);
  const roleWorkspaceLink =
    activeRole && activeRole !== "employee" && activeRole !== "super_admin"
      ? [{ to: "/dashboard", icon: LayoutDashboard, label: "Role Dashboard" }]
      : [];
  const links = [
    ...roleWorkspaceLink,
    { to: "/my-dashboard", icon: LayoutDashboard, label: "My Dashboard" },
    { to: "/my-attendance", icon: CalendarCheck, label: "My Attendance" },
    { to: "/my-leave", icon: CalendarDays, label: "Apply for Leave" },
    { to: "/my-penalties", icon: AlertTriangle, label: "My Penalties" },
    { to: "/my-calendar", icon: CalendarRange, label: "Calendar Events" },
    { to: "/my-announcements", icon: Megaphone, label: "Announcements" },
    { to: "/my-directory", icon: Users, label: "Directory" },
    { to: "/my-profile", icon: User, label: "My Profile" },
  ];

  const getInitials = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Compute display name and role using employee data and auth role config
  const displayName =
    employee?.name ||
    employee?.personalInfo?.name ||
    user?.name ||
    user?.username ||
    "Employee";
  const roleConfig = getRoleAccessConfig(user);
  const roleLabelMap: Record<string, string> = {
    superadmin: 'Super Admin',
    head_hr: 'HR',
    branch: 'Branch HR',
    department: 'Dept HR',
    employee: 'Employee',
  };
  const roleLabel = roleConfig.dashboardType === 'superadmin' ? 'Super Admin' : roleLabelMap[roleConfig.dashboardType] || 'Employee';


  return (
    <div className="sidebar emp-sidebar">
      <div className="sb-logo">
        <div className="sb-logo-row">
          <div className="sb-mark">
            <Zap size={17} />
          </div>
          <div>
            <div className="sb-title">EMS</div>
            <div className="sb-subtitle">Self Service</div>
          </div>
        </div>
      </div>
      <div className="sb-sec">
        <div className="sb-lbl">Menu</div>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `nav-a ${isActive ? "active" : ""}`}
          >
            <link.icon size={14} className="nav-ico" />
            {link.label}
          </NavLink>
        ))}
      </div>
      <div className="sb-bottom">
        <div className="sb-user">
          <div className="sb-chip" onClick={logout}>
            <div className="sb-av">{getInitials(displayName)}</div>
            <div>
              <div className="sb-un">{displayName}</div>
              <div className="sb-ur">
                {empLoading ? "Loading profile..." : roleLabel}
              </div>
            </div>
            <LogOut
              size={14}
              style={{ marginLeft: "auto", color: "rgba(255,255,255,.18)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
