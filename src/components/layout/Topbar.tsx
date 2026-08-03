import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Search, LogOut, ShieldCheck as ShieldIcon, LayoutDashboard, Users, CalendarCheck, CalendarDays, DollarSign, TrendingUp, ScrollText, Settings, ClipboardList, Clock, CalendarRange, Bell, Zap, Wallet } from "lucide-react";
import { useEmployees } from "../../hooks/useEmployees";
import { useLeaves } from "../../hooks/useLeaves";

const routeNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/launchpad": "Launchpad",
  "/hr/branch-dashboard": "Branch HR Dashboard",
  "/leave-capacity": "Leave Capacity",
  "/onboarding": "Onboarding",
  "/org-management": "Org Management",
  "/attendance-verification": "Attendance Verification",
  "/attendance-head-review": "Head HR Review",
  "/attendance-report": "Attendance Report",
  "/leave-wallet": "Leave Wallet",
  "/penalty": "Penalty",
  "/penalty-ledger": "Penalty",
  "/announcements": "Announcements",
  "/announcements/manage": "Manage Announcements",
  "/security-settings": "Security Settings",
  "/directory": "Branch Directory",
  "/employees": "Employees",
  "/employees/add": "Add Employee",
  "/attendance": "Attendance",
  "/leave": "Leave Management",
  "/payroll": "Payroll",
  "/promotions": "Promotions",
  "/crm": "CSR / CRM",
  "/inventory-dashboard": "Inventory Dashboard",
  "/inventory": "Inventory Control",
  "/finance-dashboard": "Finance Dashboard",
  "/client-invoicing": "Client Billing",
  "/invoice-builder": "Invoice Builder",
  "/matrix-operations": "Matrix Operations",
  "/accounts": "User Accounts",
  "/audit-log": "Audit Log",
  "/my-dashboard": "My Dashboard",
  "/my-attendance": "My Attendance",
  "/my-payslips": "My Payslips",
  "/my-leave": "Leave",
  "/my-penalties": "My Penalties",
  "/my-profile": "My Profile",
};

export default function Topbar() {
  const auth = useAuth(); // Poora object le rahe hain error se bachne ke liye
  const { data: leaveRequests = [] } = useLeaves({ status: "pending" });
  const location = useLocation();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const normalizedSearch = searchQuery.trim();
  const { data: searchResults = [], isLoading: isSearching } = useEmployees(
    normalizedSearch ? { search: normalizedSearch, page: 1, limit: 8 } : undefined,
  );

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    if (auth?.logout) {
      auth.logout();
      navigate("/login", { replace: true });
    }
  };

  // normalize path: remove query, hash and trailing slash for consistent matching
  const path = (() => {
    const p = location.pathname.split(/[?#]/)[0];
    return p.replace(/\/+$/, '') || '/';
  })();

  const pageName = (() => {
    if (path === "/employees" && (auth as any)?.activeRole === "department_head") {
      return "Department Team";
    }
    if (routeNames[path]) return routeNames[path];
    // try longest-prefix match for routes like /employees/123 or /settings/whatever
    const keys = Object.keys(routeNames).sort((a, b) => b.length - a.length);
    const matched = keys.find(k => path.startsWith(k));
    if (matched) return routeNames[matched];
    if (path.startsWith("/settings/")) {
      return path.split("/").pop()?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Settings";
    }
    return "Page";
  })();

  const dateStr = time.toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    hr: "HR",
    hr_executive: "HR Executive",
    hr_manager: "HR Manager",
    branch_hr: "Branch HR",
    head_hr: "Head Office HR",
    department_hr: "Department HR",
    department_head: "Department Head",
    csr_officer: "CSR Officer",
    inventory_officer: "Inventory Officer",
    finance_officer: "Finance Officer",
    inv_fin_admin: "Inventory & Finance Admin",
    employee: "Employee",
  };
  const displayRole =
    roleLabels[auth?.user?.role || ""] ||
    roleLabels[(auth as any)?.activeRole || ""] ||
    "Employee";

  const routeIcons: Record<string, any> = {
    '/launchpad': Zap,
    '/dashboard': LayoutDashboard,
    '/hr/branch-dashboard': LayoutDashboard,
    '/leave-capacity': CalendarDays,
    '/onboarding': Users,
    '/org-management': Settings,
    '/attendance-verification': CalendarCheck,
    '/attendance-head-review': ShieldIcon,
    '/attendance-report': ClipboardList,
    '/leave-wallet': Wallet,
    '/penalty': ClipboardList,
    '/penalty-ledger': ClipboardList,
    '/announcements': Bell,
    '/announcements/manage': Bell,
    '/security-settings': ShieldIcon,
    '/directory': Users,
    '/employees': Users,
    '/employees/add': Users,
    '/attendance': CalendarCheck,
    '/leave': CalendarDays,
    '/payroll': DollarSign,
    '/promotions': TrendingUp,
    '/crm': Users,
    '/inventory-dashboard': LayoutDashboard,
    '/inventory': ShieldIcon,
    '/finance-dashboard': LayoutDashboard,
    '/client-invoicing': DollarSign,
    '/matrix-operations': ShieldIcon,
    '/accounts': ShieldIcon,
    '/audit-log': ScrollText,
    '/my-dashboard': LayoutDashboard,
    '/my-attendance': CalendarCheck,
    '/my-payslips': CalendarRange,
    '/my-leave': CalendarDays,
    '/my-leave-wallet': Wallet,
    '/my-penalties': ClipboardList,
    '/my-profile': Users,
  };

  const currentIcon = (() => {
    if (routeIcons[path]) return routeIcons[path];
    const keys = Object.keys(routeIcons).sort((a, b) => b.length - a.length);
    const matched = keys.find(k => path.startsWith(k));
    if (matched) return routeIcons[matched];
    return path.startsWith('/settings/') ? Settings : LayoutDashboard;
  })();
  const PageIcon = currentIcon;
  const notifications = leaveRequests.filter((item: any) => item.status === "Pending").slice(0, 5);

  return (
    <div className="topbar">
      <div className="bc">
        <span className="bc-home">EMS</span>
        <span className="bc-sep">·</span>
        {PageIcon && <PageIcon size={14} className="bc-icon" />}
        <span className="bc-cur">{pageName}</span>
      </div>

      <div className="topbar-search" style={{ marginLeft: "auto", marginRight: 8, position: 'relative' }}>
        <Search size={13} style={{ color: "var(--t3)" }} />
        <input
          ref={searchRef}
          value={searchQuery}
          onChange={(e) => {
            const q = e.target.value;
            setSearchQuery(q);
            setShowSearch(Boolean(q.trim()));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (searchResults.length === 1) {
                navigate(`/employees/${searchResults[0].id}`);
                setSearchQuery(''); setShowSearch(false);
              }
            } else if (e.key === 'Escape') {
              setShowSearch(false);
            }
          }}
          placeholder="Search employees, records, reports..."
          style={{ background: 'transparent', border: 'none', outline: 'none', marginLeft: 8, color: 'var(--t3)', width: 260 }}
          onFocus={() => { if (searchQuery.trim()) setShowSearch(true); }}
        />
        <kbd>⌘K</kbd>
        {showSearch && (
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 360, background: '#fff', border: '1px solid var(--br)', borderRadius: 10, boxShadow: 'var(--sh2)', zIndex: 1200, overflow: 'hidden' }}>
            {isSearching ? (
              <div style={{ padding: 12, fontSize: 12, color: 'var(--t3)' }}>Searching employees...</div>
            ) : searchResults.length > 0 ? searchResults.map(r => (
              <div key={r.id} onClick={() => { navigate(`/employees/${r.id}`); setSearchQuery(''); setShowSearch(false); }} style={{ padding: 10, cursor: 'pointer', borderBottom: '1px solid var(--br2)' }}>
                <div style={{ fontWeight: 700 }}>{r.name} <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, marginLeft: 8, color: 'var(--t3)' }}>{r.id}</span></div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>{r.designation} · {r.department}</div>
              </div>
            )) : (
              <div style={{ padding: 12, fontSize: 12, color: 'var(--t3)' }}>No employees found.</div>
            )}
            {searchResults.length === 1 && <div style={{ padding: 8, fontSize: 12, color: 'var(--t3)' }}>Press <strong>Enter</strong> to open this employee</div>}
          </div>
        )}
      </div>

      <div className="topbar-right">
        {/* Module Label - No more switcher */}
        <div className="active-role-display" style={{
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'rgba(37, 99, 235, 0.1)', 
          padding: '4px 12px', 
          borderRadius: '8px',
          border: '1px solid rgba(37, 99, 235, 0.2)'
        }}>
          <ShieldIcon size={14} color="#2563eb" />
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }}>
             {displayRole}
          </span>
        </div>

        <span className="tdate">{dateStr}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: "relative" }}>
            <button className="ico-btn" onClick={() => setShowNotifications((prev) => !prev)}>
              <Bell size={14} />
              {notifications.length > 0 && <span className="n-pip" />}
            </button>
            {showNotifications && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 300, background: "#fff", border: "1px solid var(--br)", borderRadius: 12, boxShadow: "var(--sh2)", zIndex: 99 }}>
                <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--br2)", fontSize: 12, fontWeight: 700 }}>
                  Pending Notifications
                </div>
                <div style={{ maxHeight: 240, overflowY: "auto" }}>
                  {notifications.length ? notifications.map((note: any) => (
                    <button
                      key={note.id}
                      onClick={() => {
                        navigate("/leave");
                        setShowNotifications(false);
                      }}
                      style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "10px 12px", borderBottom: "1px solid var(--br2)", cursor: "pointer" }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)" }}>{note.empName}</div>
                      <div style={{ fontSize: 10, color: "var(--t3)" }}>{note.leaveType} leave request</div>
                    </button>
                  )) : <div style={{ padding: "12px", fontSize: 11, color: "var(--t3)" }}>No pending alerts</div>}
                </div>
              </div>
            )}
          </div>
          <div className="t-av">
            {auth?.user?.username?.substring(0, 2).toUpperCase() || "UN"}
          </div>
          <button 
            onClick={handleLogout}
            style={{ 
              background: '#fee2e2', 
              color: '#ef4444', 
              border: 'none', 
              padding: '6px', 
              borderRadius: '6px', 
              cursor: 'pointer' 
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}










