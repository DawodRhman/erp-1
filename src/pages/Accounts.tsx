import React, { useEffect, useMemo, useState } from "react";
import { Filter, KeyRound, Save, Search, ShieldCheck, ShieldOff, Users, UserCheck, UserX, X } from "lucide-react";
import Modal from "../components/common/Modal";
import { useToastContext } from "../context/ToastContext";
import { useDepartments, useRoles } from "../hooks/useConfig";
import {
  useCredentialTemplate,
  useFilteredAccounts,
  useUpdateAccountStatus,
  useUpdateCredentialTemplate,
} from "../hooks/useAccounts";

const CSS = `
  .acc-page{font-family:'Segoe UI',system-ui,sans-serif;padding:24px 30px;background:#f0f2f8;min-height:100vh;}
  .acc-card{background:#fff;border-radius:12px;box-shadow:0 1px 12px rgba(30,27,75,.07);}
  .acc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px;}
  @media(max-width:900px){.acc-stats{grid-template-columns:repeat(2,1fr);}.acc-toolbar{grid-template-columns:1fr!important;}.acc-tools{grid-template-columns:1fr!important;}}
  .acc-stat{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;}
  .acc-stat-icon{width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .acc-stat-lbl{font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px;}
  .acc-stat-val{font-size:20px;font-weight:800;font-family:monospace;}
  .acc-stat-sub{font-size:10px;color:#9ca3af;margin-top:1px;}
  .acc-table{width:100%;border-collapse:collapse;min-width:980px;}
  .acc-table th{text-align:left;padding:9px 10px;font-size:10px;font-weight:700;color:#9ca3af;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap;border-bottom:1px solid #f1f5f9;}
  .acc-table td{padding:10px;font-size:12px;color:#374151;border-bottom:1px solid #f8fafc;vertical-align:middle;}
  .acc-table tbody tr:hover td{background:#f8faff;}
  .acc-avatar{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;}
  .acc-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:800;white-space:nowrap;}
  .acc-pill-active{background:#d1fae5;color:#065f46;}
  .acc-pill-inactive{background:#fee2e2;color:#991b1b;}
  .acc-pill-role{background:#ede9fe;color:#3730a3;}
  .acc-pill-super{background:#fef3c7;color:#92400e;border:1px solid #fde68a;}
  .acc-btn{height:30px;border:none;border-radius:8px;padding:0 11px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-family:inherit;}
  .acc-btn:disabled{opacity:.45;cursor:not-allowed;}
  .acc-btn-act{background:#d1fae5;color:#065f46;border:1px solid #a7f3d0;}
  .acc-btn-deact{background:#fee2e2;color:#991b1b;border:1px solid #fecaca;}
  .acc-btn-primary{height:36px;background:#4f46e5;color:#fff;}
  .acc-input{height:36px;border:1px solid #dbe2ef;border-radius:10px;padding:0 12px;font:12px 'Segoe UI',system-ui,sans-serif;outline:none;background:#fff;color:#1e1b4b;}
  .acc-input:focus{border-color:#818cf8;box-shadow:0 0 0 3px rgba(99,102,241,.12);}
  .acc-textarea{width:100%;min-height:122px;border:1px solid #dbe2ef;border-radius:10px;padding:10px;font:11px/1.45 'Segoe UI',system-ui,sans-serif;resize:vertical;outline:none;}
  .acc-help{font-size:11px;color:#64748b;margin-top:8px;line-height:1.5;}
  .acc-toolbar{display:grid;grid-template-columns:minmax(220px,1.3fr) repeat(3,minmax(160px,.9fr)) auto;gap:10px;align-items:end;margin-bottom:14px;}
  .acc-tools{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:14px;align-items:start;}
  .acc-message-card{padding:14px;position:sticky;top:12px;}
  .acc-message-title{font-size:13px!important;line-height:1.2;}
  @media(max-width:1100px){.acc-toolbar{grid-template-columns:1fr 1fr;}}
  @media(max-width:1180px){.acc-tools{grid-template-columns:1fr;}.acc-message-card{position:static;}}
  @media(max-width:640px){.acc-toolbar{grid-template-columns:1fr;}}
  .acc-muted{font-size:11px;color:#64748b;}
`;

function initials(value: string) {
  return String(value || "?")
    .split(/[ @._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatRole(value: string) {
  return String(value || "Not provided").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: any) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function unwrapDepartmentName(department: any) {
  return department.department_name || department.name || department.title || department.label || "Department";
}

function unwrapRoleName(role: any) {
  return role.role_name || role.name || role.display_name || role.label || "Role";
}

export default function Accounts() {
  const { showToast } = useToastContext();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [roleId, setRoleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [confirmAccount, setConfirmAccount] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<"activate" | "deactivate" | null>(null);
  const [template, setTemplate] = useState("");

  const { data: departments = [] } = useDepartments();
  const { data: roles = [] } = useRoles();
  const { data: accounts = [], isLoading, isError } = useFilteredAccounts({
    search,
    status,
    role_id: roleId,
    department_id: departmentId,
  });
  const updateStatus = useUpdateAccountStatus();
  const { data: templateData } = useCredentialTemplate();
  const updateTemplate = useUpdateCredentialTemplate();

  useEffect(() => {
    setTemplate(templateData?.template || "");
  }, [templateData?.template]);

  const departmentList = useMemo(() => departments.map((department: any) => ({ id: String(department.id), name: unwrapDepartmentName(department) })), [departments]);
  const roleList = useMemo(() => roles.map((role: any) => ({ id: String(role.id), name: unwrapRoleName(role) })), [roles]);

  const stats = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((account: any) => account.is_active !== false).length;
    const inactive = accounts.filter((account: any) => account.is_active === false).length;
    const linked = accounts.filter((account: any) => Boolean(account.employee_id)).length;
    return { total, active, inactive, linked };
  }, [accounts]);

  const confirmStatusChange = async () => {
    if (!confirmAccount || !confirmAction) return;
    try {
      await updateStatus.mutateAsync({
        accountId: confirmAccount.id,
        isActive: confirmAction === "activate",
      });
      showToast("Account status updated");
      setConfirmAccount(null);
      setConfirmAction(null);
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Failed to update account", "error");
    }
  };

  const saveTemplate = async () => {
    try {
      await updateTemplate.mutateAsync(template);
      showToast("WhatsApp credential message updated");
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Failed to update message template", "error");
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="acc-page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#1e1b4b" }}>Accounts</h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>Real system user accounts from the backend.</p>
          </div>
        </div>

        <div className="acc-card" style={{ padding: 14, marginBottom: 14 }}>
          <div className="acc-toolbar">
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Search</span>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  className="acc-input"
                  style={{ width: "100%", paddingLeft: 33 }}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search email, employee, role, or department"
                />
              </div>
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Department</span>
              <select className="acc-input" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                <option value="">All departments</option>
                {departmentList.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Role</span>
              <select className="acc-input" value={roleId} onChange={(event) => setRoleId(event.target.value)}>
                <option value="">All roles</option>
                {roleList.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Status</span>
              <select className="acc-input" value={status} onChange={(event) => setStatus(event.target.value as any)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <button
              className="acc-btn acc-btn-deact"
              style={{ height: 36, justifyContent: "center" }}
              onClick={() => {
                setSearch("");
                setDepartmentId("");
                setRoleId("");
                setStatus("all");
              }}
            >
              <X size={13} /> Clear
            </button>
          </div>
          <div className="acc-muted">Filters are sent to the backend so the list stays aligned with permissions and department scope.</div>
        </div>

        <div className="acc-stats">
          {[
            { icon: <Users size={18} />, bg: "#ede9fe", color: "#3730a3", label: "Total Accounts", value: stats.total, sub: "All system users" },
            { icon: <UserCheck size={18} />, bg: "#d1fae5", color: "#065f46", label: "Active", value: stats.active, sub: "Can sign in" },
            { icon: <UserX size={18} />, bg: "#fee2e2", color: "#991b1b", label: "Inactive", value: stats.inactive, sub: "Blocked from sign in" },
            { icon: <KeyRound size={18} />, bg: "#dbeafe", color: "#1e40af", label: "Employee Linked", value: stats.linked, sub: "Mapped to employee" },
          ].map((stat) => (
            <div className="acc-stat" key={stat.label}>
              <div className="acc-stat-icon" style={{ background: stat.bg, color: stat.color }}>{stat.icon}</div>
              <div>
                <div className="acc-stat-lbl">{stat.label}</div>
                <div className="acc-stat-val" style={{ color: stat.color }}>{stat.value}</div>
                <div className="acc-stat-sub">{stat.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="acc-tools">
          <div className="acc-card" style={{ overflowX: "auto" }}>
            <table className="acc-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Linked Employee</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 40 }}>Loading accounts...</td></tr>
                ) : isError ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#991b1b" }}>Unable to load accounts.</td></tr>
                ) : accounts.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 40 }}>No accounts found.</td></tr>
                ) : accounts.map((account: any) => {
                  const isSuper = account.role_name === "super_admin";
                  return (
                    <tr key={account.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="acc-avatar" style={isSuper ? { background: "linear-gradient(135deg,#f97316,#eab308)" } : undefined}>
                            {initials(account.employee_name || account.email)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: "#1e1b4b" }}>{account.email}</div>
                            <div style={{ fontSize: 10, color: "#64748b" }}>{account.employee_name || "Account-only user"}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`acc-pill ${isSuper ? "acc-pill-super" : "acc-pill-role"}`}>{formatRole(account.role_name)}</span></td>
                      <td>{account.department_name || "All departments"}</td>
                      <td>{account.linked_employee || (account.employee_id ? `${account.employee_id}` : "Account only")}</td>
                      <td>
                        <span className={`acc-pill ${account.is_active === false ? "acc-pill-inactive" : "acc-pill-active"}`}>
                          {account.is_active === false ? "Inactive" : "Active"}
                        </span>
                      </td>
                      <td>{formatDate(account.created_at)}</td>
                      <td>
                        {isSuper ? (
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>Protected</span>
                        ) : (
                          <button
                            className={`acc-btn ${account.is_active === false ? "acc-btn-act" : "acc-btn-deact"}`}
                            disabled={updateStatus.isPending}
                            onClick={() => {
                              setConfirmAccount(account);
                              setConfirmAction(account.is_active === false ? "activate" : "deactivate");
                            }}
                          >
                            {account.is_active === false ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
                            {account.is_active === false ? "Activate" : "Deactivate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="acc-card acc-message-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <KeyRound size={16} color="#4f46e5" />
              <h2 className="acc-message-title" style={{ margin: 0, color: "#1e1b4b" }}>WhatsApp Credential Message</h2>
            </div>
            <textarea className="acc-textarea" value={template} onChange={(event) => setTemplate(event.target.value)} />
            <div className="acc-help">
              Use placeholders: {"{employeeName}"}, {"{employeeId}"}, {"{email}"}, {"{password}"}, {"{loginUrl}"}. The backend requires {"{email}"} and {"{password}"} so credentials are not accidentally omitted.
            </div>
            <button className="acc-btn acc-btn-primary" style={{ marginTop: 12 }} disabled={updateTemplate.isPending} onClick={saveTemplate}>
              <Save size={13} /> Save Message
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(confirmAccount && confirmAction)}
        onClose={() => {
          setConfirmAccount(null);
          setConfirmAction(null);
        }}
        title={confirmAction === "activate" ? "Activate account" : "Deactivate account"}
        wide={false}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 13, color: "#334155" }}>
            {confirmAction === "activate"
              ? "This account will be able to sign in again."
              : "This account will be blocked from sign in until reactivated."}
          </div>
          <div className="acc-card" style={{ padding: 12, background: "#f8fafc" }}>
            <div style={{ fontWeight: 800, color: "#1e1b4b" }}>{confirmAccount?.email}</div>
            <div className="acc-muted">{confirmAccount?.employee_name || "Account-only user"}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button
            className="acc-btn"
            style={{ background: "#e2e8f0", color: "#334155" }}
            onClick={() => {
              setConfirmAccount(null);
              setConfirmAction(null);
            }}
          >
            Cancel
          </button>
          <button className={`acc-btn ${confirmAction === "activate" ? "acc-btn-act" : "acc-btn-deact"}`} onClick={confirmStatusChange}>
            {confirmAction === "activate" ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
            {confirmAction === "activate" ? "Activate" : "Deactivate"}
          </button>
        </div>
      </Modal>
    </>
  );
}
