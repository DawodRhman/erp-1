import React, { useMemo, useState } from "react";
import { CalendarDays, WalletCards, ChevronDown } from "lucide-react";
import { useLeaveBalances, useLeaves } from "../hooks/useLeaves";
import { apiClient } from "../services/apiClient";

const API_ORIGIN = String(apiClient.defaults?.baseURL || "http://localhost:3001/api").replace(/\/api\/?$/, "");

function profileImageUrl(value?: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

function employeeInitials(name?: string, employeeId?: string) {
  return String(name || employeeId || "?")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return "Not provided";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function daysBetween(start?: string, end?: string) {
  if (!start || !end) return 0;
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

export default function LeaveWalletHistory() {
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [expandedEmployeeId, setExpandedEmployeeId] = useState("");
  const { data: balances = [], isLoading: balancesLoading } = useLeaveBalances();
  const { data: leaves = [], isLoading: leavesLoading } = useLeaves();

  const normalizedBalances = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    return balances.filter((row: any) => {
      const haystack = `${row.employee_id || ""} ${row.name || ""} ${row.employee_name || ""} ${row.department_name || ""}`.toLowerCase();
      return !query || haystack.includes(query);
    });
  }, [balances, employeeSearch]);

  const totals = normalizedBalances.reduce(
    (acc: any, row: any) => {
      acc.balance += Number(row.balance || 0);
      acc.used += Number(row.used || 0);
      acc.remaining += Number(row.remaining ?? Number(row.balance || 0) - Number(row.used || 0));
      return acc;
    },
    { balance: 0, used: 0, remaining: 0 },
  );

  const grouped = normalizedBalances.reduce((map: Record<string, any[]>, row: any) => {
    const key = row.employee_id || "unknown";
    map[key] = map[key] || [];
    map[key].push(row);
    return map;
  }, {});

  const balanceSummaries = useMemo(() => {
    return Object.entries(grouped).map(([employeeId, rows]: [string, any[]]) => {
      const firstRow = rows[0] || {};
      const total_allocated = rows.reduce((sum, r) => sum + Number(r.balance || 0), 0);
      const total_used = rows.reduce((sum, r) => sum + Number(r.used || 0), 0);
      const total_remaining = rows.reduce((sum, r) => sum + Number(r.remaining ?? (Number(r.balance || 0) - Number(r.used || 0))), 0);
      
      const leave_types = rows.map((r) => ({
        leave_type_id: r.leave_type_id,
        leave_type_name: r.leave_type_name || r.name || "Leave",
        allocated: Number(r.balance || 0),
        used: Number(r.used || 0),
        remaining: Number(r.remaining ?? (Number(r.balance || 0) - Number(r.used || 0))),
      }));

      return {
        employee_id: employeeId,
        employee_name: firstRow.employee_name || firstRow.name || employeeId,
        department_name: firstRow.department_name || "Unassigned",
        profile_photo_url: firstRow.profile_photo_url,
        total_allocated,
        total_used,
        total_remaining,
        leave_types,
      };
    });
  }, [grouped]);

  const recentLeaves = leaves.slice(0, 20);

  const leaveTypeColors = [
    { bg: "rgba(37,99,235,.07)", border: "rgba(37,99,235,.18)", accent: "#2563eb", barBg: "rgba(37,99,235,.12)", bar: "#2563eb" },
    { bg: "rgba(16,185,129,.06)", border: "rgba(16,185,129,.18)", accent: "#0f766e", barBg: "rgba(16,185,129,.12)", bar: "#10b981" },
    { bg: "rgba(245,158,11,.06)", border: "rgba(245,158,11,.18)", accent: "#b45309", barBg: "rgba(245,158,11,.12)", bar: "#f59e0b" },
    { bg: "rgba(168,85,247,.06)", border: "rgba(168,85,247,.18)", accent: "#7c3aed", barBg: "rgba(168,85,247,.12)", bar: "#a855f7" },
    { bg: "rgba(236,72,153,.06)", border: "rgba(236,72,153,.18)", accent: "#be185d", barBg: "rgba(236,72,153,.12)", bar: "#ec4899" },
    { bg: "rgba(14,165,233,.06)", border: "rgba(14,165,233,.18)", accent: "#0369a1", barBg: "rgba(14,165,233,.12)", bar: "#0ea5e9" },
    { bg: "rgba(20,184,166,.06)", border: "rgba(20,184,166,.18)", accent: "#0d9488", barBg: "rgba(20,184,166,.12)", bar: "#14b8a6" },
    { bg: "rgba(100,116,139,.06)", border: "rgba(100,116,139,.18)", accent: "#475569", barBg: "rgba(100,116,139,.12)", bar: "#64748b" },
  ];

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">Leave Wallet</div>
          <div className="pg-sub">Live leave balances and request history from backend leave records.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
        {[
          ["Total Balance", totals.balance],
          ["Used", totals.used],
          ["Remaining", totals.remaining],
          ["Employees", Object.keys(grouped).length],
        ].map(([label, value]) => (
          <div key={String(label)} className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--t3)", fontSize: 12, fontWeight: 800 }}>
              <WalletCards size={15} /> {label}
            </div>
            <div className="mono" style={{ marginTop: 8, fontSize: 26, fontWeight: 900, color: "var(--t1)" }}>{Number(value).toLocaleString("en-PK")}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
          <div className="ct">
            <div className="ct-ico green"><WalletCards size={13} /></div>
            Current Balances
          </div>
          <input className="input" style={{ maxWidth: 300 }} placeholder="Search employee, ID, department..." value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} />
        </div>
        {balancesLoading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--t3)" }}>Loading leave balances...</div>
        ) : balanceSummaries.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--t3)" }}>No leave balances found.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {balanceSummaries.map((balance: any) => {
              const isExpanded = expandedEmployeeId === balance.employee_id;
              const allocated = Number(balance.total_allocated ?? 0);
              const used = Number(balance.total_used ?? 0);
              const remaining = Number(balance.total_remaining ?? allocated - used);
              const usedPercent = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
              const photoUrl = profileImageUrl(balance.profile_photo_url);

              return (
                <div key={balance.employee_id}>
                  {/* Clickable employee row */}
                  <div
                    onClick={() => setExpandedEmployeeId(isExpanded ? "" : balance.employee_id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedEmployeeId(isExpanded ? "" : balance.employee_id); } }}
                    aria-expanded={isExpanded}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 16px",
                      borderRadius: isExpanded ? "12px 12px 0 0" : 12,
                      background: isExpanded ? "linear-gradient(135deg, rgba(56,189,248,.08), rgba(168,85,247,.06))" : "#fff",
                      border: `1px solid ${isExpanded ? "rgba(56,189,248,.22)" : "rgba(226,232,240,.8)"}`,
                      borderBottom: isExpanded ? "1px solid rgba(56,189,248,.12)" : undefined,
                      cursor: "pointer",
                      transition: "all .2s ease",
                    }}
                  >
                    {/* Avatar */}
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={`${balance.employee_name || balance.employee_id} profile`}
                        style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(56,189,248,.2)", boxShadow: "0 4px 12px rgba(56,189,248,.12)" }}
                      />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(145deg, var(--p2), var(--p3))", color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0, boxShadow: "0 4px 12px rgba(56,189,248,.18)" }}>
                        {employeeInitials(balance.employee_name, balance.employee_id)}
                      </div>
                    )}

                    {/* Name + ID */}
                    <div style={{ minWidth: 130, flex: "0 0 auto" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)" }}>{balance.employee_name || balance.employee_id}</div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--t4)", marginTop: 1 }}>{balance.employee_id}</div>
                    </div>

                    {/* Department */}
                    <div style={{ flex: "0 0 auto", minWidth: 100, fontSize: 12, color: "var(--t3)" }}>
                      <span style={{ background: "rgba(100,116,139,.08)", padding: "3px 10px", borderRadius: 20, fontSize: 10.5, fontWeight: 600, color: "var(--t2)" }}>
                        {balance.department_name || "Unassigned"}
                      </span>
                    </div>

                    {/* Overall progress */}
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                        <span style={{ fontSize: 10.5, color: "var(--t3)" }}>
                          {used} used of {allocated}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: remaining > 0 ? "var(--green)" : "var(--red)" }}>
                          {remaining} remaining
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, overflow: "hidden", background: "var(--br2)" }}>
                        <div
                          style={{
                            width: `${usedPercent}%`,
                            height: "100%",
                            borderRadius: 3,
                            background: usedPercent > 80 ? "linear-gradient(90deg, #f59e0b, #ef4444)" : usedPercent > 50 ? "linear-gradient(90deg, #2563eb, #f59e0b)" : "linear-gradient(90deg, #10b981, #2563eb)",
                            transition: "width .4s ease",
                          }}
                        />
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronDown
                      size={16}
                      style={{
                        color: "var(--t4)",
                        flexShrink: 0,
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform .25s cubic-bezier(.4,0,.2,1)",
                      }}
                    />
                  </div>

                  {/* Expanded mini-card grid */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: "16px 18px 18px",
                        background: "linear-gradient(180deg, rgba(248,250,252,.95), rgba(241,245,249,.85))",
                        border: "1px solid rgba(56,189,248,.16)",
                        borderTop: "none",
                        borderRadius: "0 0 12px 12px",
                        animation: "fadeIn .2s ease",
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t4)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>
                        Leave Breakdown — {(balance.leave_types || []).length} Type{(balance.leave_types || []).length !== 1 ? "s" : ""}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))",
                          gap: 10,
                        }}
                      >
                        {(balance.leave_types || []).map((lt: any, idx: number) => {
                          const ltAlloc = Number(lt.allocated ?? 0);
                          const ltUsed = Number(lt.used ?? 0);
                          const ltRemaining = Number(lt.remaining ?? 0);
                          const ltPercent = ltAlloc > 0 ? Math.min(100, Math.round((ltUsed / ltAlloc) * 100)) : 0;
                          const palette = leaveTypeColors[idx % leaveTypeColors.length];

                          return (
                            <div
                              key={lt.leave_type_id}
                              style={{
                                background: palette.bg,
                                border: `1px solid ${palette.border}`,
                                borderRadius: 10,
                                padding: "12px 14px",
                                position: "relative",
                                overflow: "hidden",
                                transition: "transform .15s ease, box-shadow .15s ease",
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(0,0,0,.06)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                            >
                              {/* Leave type name */}
                              <div style={{ fontSize: 11, fontWeight: 700, color: palette.accent, marginBottom: 10, letterSpacing: ".01em" }}>
                                {lt.leave_type_name || "Leave"}
                              </div>

                              {/* Three metrics */}
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 4, marginBottom: 10 }}>
                                <div style={{ textAlign: "center", flex: 1 }}>
                                  <div className="mono" style={{ fontSize: 16, fontWeight: 800, color: "var(--t1)", lineHeight: 1.1 }}>{ltRemaining}</div>
                                  <div style={{ fontSize: 8.5, color: "var(--t4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2 }}>Left</div>
                                </div>
                                <div style={{ width: 1, background: palette.border, alignSelf: "stretch", margin: "2px 0" }} />
                                <div style={{ textAlign: "center", flex: 1 }}>
                                  <div className="mono" style={{ fontSize: 16, fontWeight: 800, color: "var(--t1)", lineHeight: 1.1 }}>{ltUsed}</div>
                                  <div style={{ fontSize: 8.5, color: "var(--t4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2 }}>Used</div>
                                </div>
                                <div style={{ width: 1, background: palette.border, alignSelf: "stretch", margin: "2px 0" }} />
                                <div style={{ textAlign: "center", flex: 1 }}>
                                  <div className="mono" style={{ fontSize: 16, fontWeight: 800, color: "var(--t1)", lineHeight: 1.1 }}>{ltAlloc}</div>
                                  <div style={{ fontSize: 8.5, color: "var(--t4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2 }}>Total</div>
                                </div>
                              </div>

                              {/* Mini progress bar */}
                              <div style={{ height: 4, borderRadius: 2, overflow: "hidden", background: palette.barBg }}>
                                <div style={{ width: `${ltPercent}%`, height: "100%", borderRadius: 2, background: palette.bar, transition: "width .4s ease" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div className="ct" style={{ marginBottom: 14 }}>
          <div className="ct-ico blue"><CalendarDays size={13} /></div>
          Recent Leave Requests
        </div>
        {leavesLoading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--t3)" }}>Loading leave history...</div>
        ) : recentLeaves.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--t3)" }}>No leave requests found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLeaves.map((row: any) => {
                const start = row.start_date || row.from;
                const end = row.end_by_force || row.end_date || row.to;
                return (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.employee_name || row.employee?.name || row.employee_id}</strong>
                      <div className="mono" style={{ fontSize: 10, color: "var(--t3)" }}>{row.employee_id}</div>
                    </td>
                    <td>{row.leave_type || row.leave_type_name || row.leave_type?.name || "Leave"}</td>
                    <td className="mono">{formatDate(start)}</td>
                    <td className="mono">{formatDate(end)}</td>
                    <td className="mono">{daysBetween(start, end)}</td>
                    <td>
                      <span className={`pill ${
                        row.status === "Approved" ? "pill-green" : 
                        row.status === "Rejected" ? "pill-red" : "pill-steel"
                      }`}>{row.status || "pending"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
