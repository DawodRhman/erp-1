import React, { useMemo, useState } from "react";
import { Download, Eye, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAuditLogs, type AuditLogItem } from "../hooks/useAuditLogs";

const actionColors: Record<string, string> = {
  AUTH_LOGIN_SUCCESS: "pill-green",
  AUTH_LOGIN_FAILED: "pill-red",
  AUTH_LOGOUT: "pill-steel",
  AUTH_PASSWORD_CHANGED: "pill-blue",
  BULK_EMPLOYEE_VALIDATE: "pill-blue",
  BULK_EMPLOYEE_IMPORTED: "pill-green",
  BULK_EMPLOYEE_IMPORT_SUMMARY: "pill-steel",
  EMPLOYEE_ACCOUNT_CREATED: "pill-green",
  EMPLOYEE_PROFILE_PHOTO_UPLOADED: "pill-blue",
  EMPLOYEE_DOCUMENT_UPLOADED: "pill-blue",
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function label(value?: string | null) {
  return value && String(value).trim() ? value : "-";
}

function sanitizeCsvCell(value: any): string {
  const s = String(value ?? "");
  // Prefix with single quote to prevent spreadsheet formula execution (=, +, -, @)
  if (/^[=\+\-\@]/.test(s)) return `'${s}`;
  return s;
}

function exportCSV(data: AuditLogItem[]) {
  const header = [
    "Timestamp",
    "User",
    "Role",
    "Action",
    "Module",
    "Record",
    "Public IP",
    "Private IP",
    "Hostname",
    "Method",
    "Path",
    "Actor Employee",
    "Actor Email",
    "Summary",
  ];
  const rows = data.map((log) => [
    sanitizeCsvCell(formatDate(log.timestamp)),
    sanitizeCsvCell(log.user),
    sanitizeCsvCell(log.role),
    sanitizeCsvCell(log.action),
    sanitizeCsvCell(log.module),
    sanitizeCsvCell(log.recordId),
    sanitizeCsvCell(log.ip_address || ""),
    sanitizeCsvCell(log.private_ip_address || ""),
    sanitizeCsvCell(log.hostname || ""),
    sanitizeCsvCell(log.method || ""),
    sanitizeCsvCell(log.path || ""),
    sanitizeCsvCell(log.actor_employee_id || ""),
    sanitizeCsvCell(log.actor_email || ""),
    sanitizeCsvCell(log.summary),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "audit_logs.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLog() {
  const { activeRole } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actorEmployeeId, setActorEmployeeId] = useState("");
  const [recordId, setRecordId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { logs, isLoading, error, page: currentPage, total, limit } = useAuditLogs({
    search,
    action: actionFilter,
    module: moduleFilter,
    actor_employee_id: actorEmployeeId,
    entity_id: recordId,
    date_from: dateFrom,
    date_to: dateTo,
    page,
    limit: pageSize,
  });

  const totalPages = Math.ceil(total / limit) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const pagination = totalPages > 1 ? (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--border)", marginTop: 12 }}>
      <div style={{ fontSize: 12, color: "var(--t3)" }}>
        Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} entries
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span style={{ fontSize: 13, minWidth: 60, textAlign: "center" }}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
        <label className="form-group" style={{ margin: 0 }}>
          <span className="form-label" style={{ marginRight: 8 }}>Per page:</span>
          <select
            className="input select-input"
            style={{ width: 80 }}
            value={limit}
            onChange={(e) => {
              const newLimit = Number(e.target.value);
              const firstItemIndex = (currentPage - 1) * limit;
              const newPage = Math.floor(firstItemIndex / newLimit) + 1;
              setPageSize(newLimit);
              setPage(newPage);
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </label>
      </div>
    </div>
  ) : null;

  const actions = useMemo(
    () => [...new Set([...Object.keys(actionColors), ...logs.map((log) => log.action)].filter(Boolean))],
    [logs],
  );
  const modules = useMemo(
    () => [...new Set(["auth", "accounts", "employees", "attendance", "leave", "penalties", "announcements", "calendar-events", "config", ...logs.map((log) => log.module)].filter(Boolean))],
    [logs],
  );

  if (activeRole !== "super_admin") {
    return (
      <div className="card" style={{ padding: 24 }}>
        <div className="ct">Audit Logs</div>
        <div style={{ color: "var(--t3)", marginTop: 8 }}>Only Super Admin can view audit logs.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">Audit Logs</div>
          <div className="pg-sub">Read-only backend activity trail with actor and request identity.</div>
        </div>
        <button className="btn btn-primary" onClick={() => exportCSV(logs)} disabled={!logs.length}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">Search</span>
            <input className="input" style={{ width: 220 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Actor, action, IP, path" />
          </label>
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">From</span>
            <input className="input" type="date" style={{ width: 150 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">To</span>
            <input className="input" type="date" style={{ width: 150 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">Action</span>
            <select className="input select-input" style={{ width: 190 }} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">All Actions</option>
            {actions.map((action) => <option key={action}>{action}</option>)}
            </select>
          </label>
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">Module</span>
            <select className="input select-input" style={{ width: 160 }} value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
            <option value="">All Modules</option>
            {modules.map((module) => <option key={module}>{module}</option>)}
            </select>
          </label>
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">Actor Employee</span>
            <input className="input" style={{ width: 150 }} value={actorEmployeeId} onChange={(e) => setActorEmployeeId(e.target.value)} placeholder="EMP0001" />
          </label>
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">Record ID</span>
            <input className="input" style={{ width: 150 }} value={recordId} onChange={(e) => setRecordId(e.target.value)} placeholder="Target record" />
          </label>
          {(search || actionFilter || moduleFilter || dateFrom || dateTo || actorEmployeeId || recordId) && (
            <button className="btn btn-sm btn-ghost" onClick={() => {
              setSearch("");
              setActionFilter("");
              setModuleFilter("");
              setDateFrom("");
              setDateTo("");
              setActorEmployeeId("");
              setRecordId("");
            }}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="ch">
          <div className="ct">
            <div className="ct-ico blue"><Shield size={13} /></div>
            System Audit Trail
          </div>
          <div style={{ fontSize: 11, color: "var(--t3)" }}>
            {isLoading ? "Loading..." : `${logs.length} audit entries`}
          </div>
        </div>

        {error ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--red)", fontSize: 13 }}>
            Audit logs could not be loaded.
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--t3)", fontSize: 13 }}>
            {isLoading ? "Loading audit logs..." : "No audit log entries match your filters."}
          </div>
        ) : (
          <>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Module</th>
                <th>Record</th>
                <th>Public IP</th>
                <th>Private IP</th>
                <th>Hostname</th>
                <th>Method</th>
                <th>Path</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr style={{ cursor: "pointer" }} onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                    <td className="mono" style={{ fontSize: 11 }}>{formatDate(log.timestamp)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{label(log.user)}</div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--t3)" }}>{label(log.actor_employee_id || log.actor_email)}</div>
                    </td>
                    <td><span className={`pill ${actionColors[log.action] || "pill-steel"}`}>{log.action}</span></td>
                    <td>{label(log.module)}</td>
                    <td className="mono">{label(log.recordId)}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{label(log.ip_address)}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{label(log.private_ip_address)}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{label(log.hostname)}</td>
                    <td className="mono">{label(log.method)}</td>
                    <td className="mono" style={{ fontSize: 11, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>{label(log.path)}</td>
                    <td><Eye size={13} /></td>
                  </tr>
                  {expanded === log.id && (
                    <tr>
                      <td colSpan={11} style={{ background: "var(--inp)", padding: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, marginBottom: 8 }}>Identity</div>
                            <div>Actor User ID: <span className="mono">{label(log.actor_user_id)}</span></div>
                            <div>Actor Employee ID: <span className="mono">{label(log.actor_employee_id)}</span></div>
                            <div>Actor Role ID: <span className="mono">{label(log.actor_role_id)}</span></div>
                            <div>Actor Email: <span className="mono">{label(log.actor_email)}</span></div>
                            <div>Public IP: <span className="mono">{label(log.ip_address)}</span></div>
                            <div>Private IP: <span className="mono">{label(log.private_ip_address)}</span></div>
                            <div>Hostname: <span className="mono">{label(log.hostname)}</span></div>
                            <div>User Agent: <span className="mono">{label(log.user_agent)}</span></div>
                            <div>Request ID: <span className="mono">{label(log.request_id)}</span></div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, marginBottom: 8 }}>Metadata</div>
                            <div style={{ marginBottom: 8 }}>{log.summary}</div>
                            {Object.entries(log.meta || {}).map(([key, value]) => (
                              <div key={key} style={{ background: "var(--card-bg)", padding: "4px 8px", borderRadius: 4, marginBottom: 4 }}>
                                {key}: <span className="mono">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

            {pagination}

          </>
        )}
      </div>
    </div>
  );
}
