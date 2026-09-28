import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Check, ChevronDown, Clock, MessageCircle, Plus, RotateCcw, Users, X } from "lucide-react";
import Modal from "../components/common/Modal";
import { useToastContext } from "../context/ToastContext";
import { useLeaveBalanceSummary, useLeaves } from "../hooks/useLeaves";
import { useEmployees } from "../hooks/useEmployees";
import { useLeaveTypes } from "../hooks/useConfig";
import { getStatusColor } from "../services/api";
import { apiClient } from "../services/apiClient";
import { useAuthStore } from "../store/useAuthStore";

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

function daysBetweenInclusive(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function formatDate(value?: string) {
  if (!value) return "Not provided";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(value?: string) {
  if (!value) return "Pending";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readableApprover(...values: any[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed && !isUuid(trimmed)) return trimmed;
  }
  return "";
}

export default function Leave() {
  const { data: serverLeaves = [], create: createLeave, approve: approveLeave, reject: rejectLeave, earlyReturn: earlyReturnLeave } = useLeaves();
  const { data: balanceSummaries = [] } = useLeaveBalanceSummary();
  const { data: employees = [] } = useEmployees();
  const { data: leaveTypes = [] } = useLeaveTypes();
  const { showToast } = useToastContext();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreateLeave = hasPermission("leave:write");
  const canReviewLeave = hasPermission("leave:approve") || hasPermission("leave:department_approve");
  const canEarlyReturnLeave = hasPermission("leave:approve");
  const [tab, setTab] = useState("balances");
  const [expandedEmployeeId, setExpandedEmployeeId] = useState("");
  const [newModal, setNewModal] = useState(false);
  const [rejectModal, setRejectModal] = useState<any | null>(null);
  const [earlyModal, setEarlyModal] = useState<any | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [earlyDate, setEarlyDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [newEmp, setNewEmp] = useState("");
  const [newType, setNewType] = useState("");
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [newReason, setNewReason] = useState("");
  const [selectedPendingId, setSelectedPendingId] = useState("");
  const [approvedSubTab, setApprovedSubTab] = useState<"upcoming" | "completed">("upcoming");

  const rows = useMemo(() => {
    return serverLeaves.map((leave: any) => {
      const startDate = leave.start_date || leave.from;
      const endDate = leave.end_by_force || leave.end_date || leave.to;
      return {
        id: leave.id,
        empId: leave.employee_id,
        empName: leave.employee_name || leave.employee?.name || leave.name || leave.employee_id,
        leaveType: leave.leave_type || leave.leave_type_name || leave.leave_type?.name || "Leave",
        leaveTypeId: leave.leave_type_id,
        from: startDate,
        to: endDate,
        days: daysBetweenInclusive(startDate, endDate),
        reason: leave.reason || "Not provided",
        reviewNote: leave.review_note || leave.rejection_reason || "",
        department: leave.department_name || "",
        appliedOn: leave.created_at,
        status: statusLabel(leave.status),
        approvedBy: readableApprover(leave.reviewed_by_name, leave.approved_by_name, leave.actioned_by_name, leave.reviewed_by),
      };
    });
  }, [serverLeaves]);

  const filteredRows = tab === "all" ? rows : rows.filter((row: any) => row.status.toLowerCase() === tab);
  const todayKey = new Date().toISOString().slice(0, 10);
  const approvedRows = rows.filter((row: any) => row.status === "Approved");
  const upcomingApprovedRows = approvedRows.filter((row: any) => String(row.to).slice(0, 10) >= todayKey);
  const completedApprovedRows = approvedRows.filter((row: any) => String(row.to).slice(0, 10) < todayKey);
  const approvedVisibleRows = approvedSubTab === "completed" ? completedApprovedRows : upcomingApprovedRows;
  const counts = {
    total: rows.length,
    pending: rows.filter((row: any) => row.status === "Pending").length,
    approved: rows.filter((row: any) => row.status === "Approved").length,
    rejected: rows.filter((row: any) => row.status === "Rejected").length,
    onLeaveToday: rows.filter((row: any) => {
      const today = new Date().toISOString().slice(0, 10);
      return row.status === "Approved" && String(row.from).slice(0, 10) <= today && String(row.to).slice(0, 10) >= today;
    }).length,
  };

  const newDays = daysBetweenInclusive(newFrom, newTo);

  async function submitNew() {
    if (!newEmp || !newType || !newFrom || !newTo || !newReason.trim()) {
      showToast("Please fill all mandatory fields.", "error");
      return;
    }
    setSaving(true);
    try {
      await createLeave({
        employee_id: newEmp,
        leave_type_id: newType,
        start_date: newFrom,
        end_date: newTo,
        reason: newReason.trim(),
      });
      setNewModal(false);
      setNewEmp("");
      setNewType("");
      setNewFrom("");
      setNewTo("");
      setNewReason("");
      showToast("Leave request submitted successfully.");
    } catch (error: any) {
      showToast(error.response?.data?.error?.message || error.response?.data?.message || "Failed to submit leave request.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmApprove(row: any) {
    setSaving(true);
    try {
      await approveLeave(row.id);
      showToast("Leave approved.");
    } catch (error: any) {
      showToast(error.response?.data?.error?.message || "Failed to approve leave.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmReject() {
    const reason = rejectComment.trim();
    if (!rejectModal || !reason) {
      showToast("Rejection reason is mandatory.", "error");
      return;
    }
    if (reason.split(/\s+/).filter(Boolean).length < 2) {
      showToast("Rejection reason must be more than one word.", "error");
      return;
    }
    if (reason.length > 256) {
      showToast("Rejection reason must be 256 characters or fewer.", "error");
      return;
    }
    setSaving(true);
    try {
      await rejectLeave({ id: rejectModal.id, reason });
      setRejectModal(null);
      setRejectComment("");
      showToast("Leave rejected.");
    } catch (error: any) {
      showToast(error.response?.data?.error?.message || "Failed to reject leave.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmEarlyReturn() {
    if (!earlyModal || !earlyDate) return;
    setSaving(true);
    try {
      await earlyReturnLeave({ id: earlyModal.id, actual_end_date: earlyDate });
      setEarlyModal(null);
      setEarlyDate("");
      showToast("Early return recorded.");
    } catch (error: any) {
      showToast(error.response?.data?.error?.message || "Failed to record early return.", "error");
    } finally {
      setSaving(false);
    }
  }

  const statCards = [
    { label: "Total Requests", value: counts.total, icon: CalendarDays, color: "linear-gradient(135deg,#6366f1,#8b5cf6)" },
    { label: "Pending Requests", value: counts.pending, icon: Clock, color: "linear-gradient(135deg,#f97316,#fbbf24)" },
    { label: "Approved Requests", value: counts.approved, icon: Check, color: "linear-gradient(135deg,#10b981,#34d399)" },
    { label: "Rejected Requests", value: counts.rejected, icon: X, color: "linear-gradient(135deg,#ec4899,#f43f5e)" },
    { label: "On Leave Today", value: counts.onLeaveToday, icon: Users, color: "linear-gradient(135deg,#14b8a6,#06b6d4)" },
  ];

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">Leave Management</div>
          <div className="pg-sub">Review live leave requests, balances, approvals, and early returns.</div>
        </div>
        {canCreateLeave && (
          <button className="btn btn-primary" onClick={() => setNewModal(true)}>
            <Plus size={13} /> New Leave Request
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 18 }}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card" style={{ background: card.color, color: "#fff" }}>
              <Icon size={18} />
              <div style={{ fontSize: 26, fontWeight: 900, marginTop: 10 }}>{card.value}</div>
              <div style={{ fontSize: 12, opacity: 0.86 }}>{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="tabs">
        {["all", "pending", "approved", "rejected", "balances"].map((item) => (
          <button key={item} className={`tab ${tab === item ? "active" : ""}`} onClick={() => setTab(item)}>
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {tab === "balances" ? (
        <div className="card">
          <div className="ch">
            <div className="ct">Leave Balance Overview</div>
          </div>
          {balanceSummaries.length === 0 ? (
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
      ) : tab === "rejected" ? (
        <div className="card">
          <div className="ch">
            <div className="ct">Rejected Leave Requests</div>
            <span className="mono" style={{ fontSize: 11, color: "var(--t4)" }}>{filteredRows.length} total</span>
          </div>
          {filteredRows.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--t3)" }}>
              <X size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
              <div style={{ fontSize: 13 }}>No rejected leave requests</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
              {filteredRows.map((row: any) => (
                <div
                  key={row.id}
                  style={{
                    background: "#fff",
                    border: "1px solid rgba(239,68,68,.16)",
                    borderRadius: 14,
                    overflow: "hidden",
                    transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease",
                  }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 24px rgba(185,28,28,.08)"; el.style.borderColor = "rgba(239,68,68,.28)"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; el.style.borderColor = "rgba(239,68,68,.16)"; }}
                >

                  {/* Card body */}
                  <div style={{ padding: "14px 16px" }}>
                    {/* Top row: employee + leave type pill + date */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(145deg, var(--p2), var(--p3))", color: "#fff", fontSize: 11, fontWeight: 800, flexShrink: 0, boxShadow: "0 4px 10px rgba(56,189,248,.15)" }}>
                        {employeeInitials(row.empName, row.empId)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)" }}>{row.empName}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <span className="mono" style={{ fontSize: 10, color: "var(--t4)" }}>{row.empId}</span>
                          {row.department && (
                            <>
                              <span style={{ color: "var(--br3)", fontSize: 10 }}>·</span>
                              <span style={{ fontSize: 10, color: "var(--t4)" }}>{row.department}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span style={{ background: "rgba(239,68,68,.08)", color: "#b91c1c", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(239,68,68,.15)", flexShrink: 0 }}>
                        {row.leaveType}
                      </span>
                    </div>

                    {/* Date range + days strip */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      background: "rgba(241,245,249,.7)",
                      borderRadius: 8,
                      marginBottom: 12,
                      fontSize: 11,
                    }}>
                      <CalendarDays size={13} style={{ color: "var(--t4)", flexShrink: 0 }} />
                      <span className="mono" style={{ color: "var(--t2)" }}>{formatDate(row.from)}</span>
                      <span style={{ color: "var(--t4)", fontSize: 10 }}>→</span>
                      <span className="mono" style={{ color: "var(--t2)" }}>{formatDate(row.to)}</span>
                      <span style={{
                        marginLeft: "auto",
                        background: "rgba(100,116,139,.1)",
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--t2)",
                      }}>
                        {row.days} day{row.days !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Employee's original reason */}
                    <div style={{ fontSize: 11.5, color: "var(--t2)", marginBottom: 10, lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600, color: "var(--t3)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>Request Reason</span>
                      <div style={{ marginTop: 3 }}>{row.reason}</div>
                    </div>

                    {/* Rejection reason callout */}
                    <div style={{
                      background: "rgba(254,226,226,.45)",
                      border: "1px solid rgba(239,68,68,.15)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: "rgba(239,68,68,.12)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}>
                        <MessageCircle size={13} style={{ color: "#b91c1c" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>Rejection Reason</div>
                        <div style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.5 }}>
                          {row.reviewNote || "No reason provided"}
                        </div>
                      </div>
                    </div>

                    {/* Footer: reviewer + applied date */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(226,232,240,.6)" }}>
                      <div style={{ fontSize: 10.5, color: "var(--t4)" }}>
                        <span style={{ fontWeight: 600 }}>Rejected by</span>{" "}
                        <span style={{ color: "var(--t2)", fontWeight: 700 }}>{row.approvedBy || "Not provided"}</span>
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--t4)" }}>
                        Applied {formatDate(row.appliedOn)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : tab === "pending" ? (
        <div className="card">
          <div className="ch">
            <div className="ct">Pending Leave Requests</div>
            <span className="mono" style={{ fontSize: 11, color: "var(--t4)" }}>{filteredRows.length} awaiting review</span>
          </div>
          {filteredRows.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--t3)" }}>
              <Clock size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
              <div style={{ fontSize: 13 }}>No pending leave requests</div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 0, minHeight: 340 }}>
              {/* Left: compact list */}
              <div style={{ width: 280, flexShrink: 0, borderRight: "1px solid var(--br2)", overflowY: "auto", maxHeight: 480 }}>
                {filteredRows.map((row: any) => {
                  const isSelected = selectedPendingId === row.id;
                  const today = new Date().toISOString().slice(0, 10);
                  const startsIn = Math.ceil((new Date(String(row.from).slice(0, 10)).getTime() - new Date(today).getTime()) / 86400000);
                  const urgency = startsIn <= 1 ? "urgent" : startsIn <= 3 ? "soon" : "normal";

                  return (
                    <div
                      key={row.id}
                      onClick={() => setSelectedPendingId(isSelected ? "" : row.id)}
                      style={{
                        padding: "12px 14px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--br2)",
                        background: isSelected ? "rgba(56,189,248,.06)" : "#fff",
                        borderLeft: isSelected ? "3px solid var(--p2)" : "3px solid transparent",
                        transition: "all .15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--t1)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.empName}</div>
                        {urgency === "urgent" && (
                          <span style={{ background: "rgba(239,68,68,.1)", color: "#b91c1c", fontSize: 8.5, fontWeight: 700, padding: "2px 6px", borderRadius: 10, display: "flex", alignItems: "center", gap: 3 }}>
                            <AlertTriangle size={9} /> Urgent
                          </span>
                        )}
                        {urgency === "soon" && (
                          <span style={{ background: "rgba(245,158,11,.1)", color: "#b45309", fontSize: 8.5, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>
                            Soon
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--t4)" }}>
                        <span>{row.leaveType}</span>
                        <span>·</span>
                        <span className="mono">{row.days}d</span>
                        <span>·</span>
                        <span className="mono">{formatDate(row.from)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: detail panel */}
              <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto", maxHeight: 480 }}>
                {(() => {
                  const detail = filteredRows.find((r: any) => r.id === selectedPendingId);
                  if (!detail) return (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--t4)", gap: 8 }}>
                      <Clock size={28} style={{ opacity: 0.3 }} />
                      <div style={{ fontSize: 12.5 }}>Select a request to review</div>
                    </div>
                  );

                  const today = new Date().toISOString().slice(0, 10);
                  const startsIn = Math.ceil((new Date(String(detail.from).slice(0, 10)).getTime() - new Date(today).getTime()) / 86400000);

                  return (
                    <div style={{ animation: "fadeIn .2s ease" }}>
                      {/* Employee header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(145deg, var(--p2), var(--p3))", color: "#fff", fontSize: 13, fontWeight: 800, flexShrink: 0, boxShadow: "0 4px 12px rgba(56,189,248,.18)" }}>
                          {employeeInitials(detail.empName, detail.empId)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--t1)" }}>{detail.empName}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <span className="mono" style={{ fontSize: 10.5, color: "var(--t4)" }}>{detail.empId}</span>
                            {detail.department && (
                              <>
                                <span style={{ color: "var(--br3)" }}>·</span>
                                <span style={{ fontSize: 10.5, color: "var(--t4)" }}>{detail.department}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {startsIn <= 1 && (
                          <span style={{ background: "rgba(239,68,68,.1)", color: "#b91c1c", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 12, display: "flex", alignItems: "center", gap: 4 }}>
                            <AlertTriangle size={11} /> {startsIn <= 0 ? "Starts today" : "Starts tomorrow"}
                          </span>
                        )}
                      </div>

                      {/* Details grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                        <div style={{ background: "var(--inp)", padding: "10px 14px", borderRadius: 10 }}>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--t4)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Leave Type</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{detail.leaveType}</div>
                        </div>
                        <div style={{ background: "var(--inp)", padding: "10px 14px", borderRadius: 10 }}>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--t4)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Duration</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}>{detail.days} day{detail.days !== 1 ? "s" : ""}</div>
                        </div>
                        <div style={{ background: "var(--inp)", padding: "10px 14px", borderRadius: 10 }}>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--t4)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>From</div>
                          <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--t1)" }}>{formatDate(detail.from)}</div>
                        </div>
                        <div style={{ background: "var(--inp)", padding: "10px 14px", borderRadius: 10 }}>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--t4)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>To</div>
                          <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--t1)" }}>{formatDate(detail.to)}</div>
                        </div>
                      </div>

                      {/* Reason */}
                      <div style={{ background: "var(--inp)", padding: "12px 14px", borderRadius: 10, marginBottom: 16 }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--t4)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>Reason</div>
                        <div style={{ fontSize: 12.5, color: "var(--t2)", lineHeight: 1.6 }}>{detail.reason}</div>
                      </div>

                      {/* Applied date */}
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--t4)", marginBottom: 16 }}>Applied {formatDate(detail.appliedOn)}</div>

                      {canReviewLeave && (
                        <div style={{ display: "flex", gap: 10 }}>
                          <button
                            className="btn btn-success"
                            onClick={() => confirmApprove(detail)}
                            disabled={saving}
                            style={{ flex: 1, justifyContent: "center", borderRadius: 10, padding: "10px 16px", fontSize: 12.5 }}
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => setRejectModal(detail)}
                            disabled={saving}
                            style={{ flex: 1, justifyContent: "center", borderRadius: 10, padding: "10px 16px", fontSize: 12.5 }}
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      ) : tab === "approved" ? (
        <div className="card">
          <div className="ch">
            <div className="ct">Approved Leave Requests</div>
            <span className="mono" style={{ fontSize: 11, color: "var(--t4)" }}>{approvedRows.length} total</span>
          </div>
          {approvedRows.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--t3)" }}>
              <Check size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
              <div style={{ fontSize: 13 }}>No approved leave requests</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {[
                  { key: "upcoming", label: "Upcoming", count: upcomingApprovedRows.length },
                  { key: "completed", label: "Completed", count: completedApprovedRows.length },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`tab ${approvedSubTab === item.key ? "active" : ""}`}
                    onClick={() => setApprovedSubTab(item.key as "upcoming" | "completed")}
                  >
                    {item.label} ({item.count})
                  </button>
                ))}
              </div>

              {approvedVisibleRows.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--t3)" }}>
                  <Check size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                  <div style={{ fontSize: 13 }}>No {approvedSubTab} approved leave requests</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
                  {approvedVisibleRows.map((row: any) => {
                const today = new Date().toISOString().slice(0, 10);
                const fromDate = String(row.from).slice(0, 10);
                const toDate = String(row.to).slice(0, 10);
                const isActive = fromDate <= today && toDate >= today;
                const isUpcoming = fromDate > today;
                const daysRemaining = isActive ? Math.ceil((new Date(toDate).getTime() - new Date(today).getTime()) / 86400000) + 1 : 0;
                const totalDays = row.days || 1;
                const elapsed = isActive ? totalDays - daysRemaining : isUpcoming ? 0 : totalDays;
                const progressPct = totalDays > 0 ? Math.min(100, Math.round((elapsed / totalDays) * 100)) : 100;

                return (
                  <div
                    key={row.id}
                    style={{
                      background: "#fff",
                      border: `1px solid ${isActive ? "rgba(16,185,129,.22)" : "rgba(226,232,240,.8)"}`,
                      borderRadius: 14,
                      padding: "14px 16px",
                      transition: "transform .15s ease, box-shadow .15s ease",
                    }}
                    onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 6px 20px rgba(0,0,0,.05)"; }}
                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; }}
                  >
                    {/* Header: employee + status badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(145deg, var(--p2), var(--p3))", color: "#fff", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                        {employeeInitials(row.empName, row.empId)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1)" }}>{row.empName}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <span className="mono" style={{ fontSize: 10, color: "var(--t4)" }}>{row.empId}</span>
                          {row.department && (
                            <>
                              <span style={{ color: "var(--br3)", fontSize: 10 }}>·</span>
                              <span style={{ fontSize: 10, color: "var(--t4)" }}>{row.department}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isActive ? (
                        <span style={{ background: "rgba(16,185,129,.1)", color: "#0f766e", fontSize: 9.5, fontWeight: 700, padding: "3px 10px", borderRadius: 12, border: "1px solid rgba(16,185,129,.2)", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2s ease infinite" }} />
                          On Leave
                        </span>
                      ) : isUpcoming ? (
                        <span style={{ background: "rgba(37,99,235,.07)", color: "var(--p)", fontSize: 9.5, fontWeight: 700, padding: "3px 10px", borderRadius: 12, border: "1px solid rgba(37,99,235,.15)", flexShrink: 0 }}>
                          Upcoming
                        </span>
                      ) : (
                        <span style={{ background: "rgba(100,116,139,.07)", color: "var(--t3)", fontSize: 9.5, fontWeight: 700, padding: "3px 10px", borderRadius: 12, flexShrink: 0 }}>
                          Completed
                        </span>
                      )}
                    </div>

                    {/* Leave type + date strip */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      background: isActive ? "rgba(16,185,129,.04)" : "rgba(241,245,249,.7)",
                      borderRadius: 8,
                      marginBottom: 12,
                      fontSize: 11,
                    }}>
                      <span style={{ fontWeight: 700, color: isActive ? "#0f766e" : "var(--t2)" }}>{row.leaveType}</span>
                      <span style={{ color: "var(--br3)" }}>|</span>
                      <CalendarDays size={12} style={{ color: "var(--t4)" }} />
                      <span className="mono" style={{ color: "var(--t2)" }}>{formatDate(row.from)}</span>
                      <span style={{ color: "var(--t4)", fontSize: 10 }}>→</span>
                      <span className="mono" style={{ color: "var(--t2)" }}>{formatDate(row.to)}</span>
                      <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: "var(--t2)" }}>{row.days}d</span>
                    </div>

                    {/* Progress bar for active/upcoming */}
                    {(isActive || isUpcoming) && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 10 }}>
                          <span style={{ color: "var(--t4)" }}>{isActive ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining` : `Starts in ${Math.ceil((new Date(fromDate).getTime() - new Date(today).getTime()) / 86400000)} day(s)`}</span>
                          <span className="mono" style={{ color: "var(--t4)", fontWeight: 600 }}>{progressPct}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, overflow: "hidden", background: "var(--br2)" }}>
                          <div style={{ width: `${progressPct}%`, height: "100%", borderRadius: 3, background: isActive ? "#10b981" : "var(--p)", transition: "width .4s ease" }} />
                        </div>
                      </div>
                    )}

                    {/* Footer: approved by + early return */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid rgba(226,232,240,.6)" }}>
                      <div style={{ fontSize: 10.5, color: "var(--t4)" }}>
                        <span style={{ fontWeight: 600 }}>Approved by</span>{" "}
                        <span style={{ color: "var(--t2)", fontWeight: 700 }}>{row.approvedBy || "Not provided"}</span>
                      </div>
                      {(isActive || isUpcoming) && canEarlyReturnLeave && (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={(e) => { e.stopPropagation(); setEarlyModal(row); }}
                          style={{ fontSize: 10.5, gap: 4 }}
                        >
                          <RotateCcw size={11} /> Early Return
                        </button>
                      )}
                    </div>
                  </div>
                );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="card">
          {filteredRows.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--t3)" }}>
              <CalendarDays size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
              <div style={{ fontSize: 13 }}>No leave requests found</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Approved By</th>
                  <th>Applied</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row: any) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 700 }}>
                      {row.empName}
                      <div className="mono" style={{ fontSize: 10, color: "var(--t3)" }}>{row.empId}</div>
                    </td>
                    <td>{row.leaveType}</td>
                    <td className="mono">{formatDate(row.from)}</td>
                    <td className="mono">{formatDate(row.to)}</td>
                    <td className="mono">{row.days}</td>
                    <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.reason}</td>
                    <td>{row.approvedBy || "Not provided"}</td>
                    <td className="mono">{formatDate(row.appliedOn)}</td>
                    <td><span className={`pill ${getStatusColor(row.status)}`}>{row.status}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {row.status === "Pending" && canReviewLeave && (
                          <>
                            <button className="ico-btn" title="Approve" onClick={() => confirmApprove(row)} disabled={saving}>
                              <Check size={13} />
                            </button>
                            <button className="ico-btn" title="Reject" onClick={() => setRejectModal(row)} disabled={saving}>
                              <X size={13} />
                            </button>
                          </>
                        )}
                        {row.status === "Approved" && canEarlyReturnLeave && (
                          <button className="btn btn-sm btn-ghost" onClick={() => setEarlyModal(row)}>
                            <RotateCcw size={12} /> Early Return
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal open={newModal} onClose={() => setNewModal(false)} title="New Leave Request">
        <div className="form-group">
          <label className="form-label">Employee *</label>
          <select className="input select-input" value={newEmp} onChange={(event) => setNewEmp(event.target.value)}>
            <option value="">Select employee...</option>
            {employees.map((employee: any) => (
              <option key={employee.id} value={employee.id}>{employee.name} ({employee.id})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Leave Type *</label>
          <select className="input select-input" value={newType} onChange={(event) => setNewType(event.target.value)}>
            <option value="">Select leave type...</option>
            {leaveTypes.map((type: any) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="form-group">
            <label className="form-label">From Date *</label>
            <input className="input" type="date" value={newFrom} onChange={(event) => setNewFrom(event.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">To Date *</label>
            <input className="input" type="date" value={newTo} onChange={(event) => setNewTo(event.target.value)} />
          </div>
        </div>
        {newFrom && newTo && <div style={{ fontSize: 12, marginBottom: 8, color: "var(--p)", fontWeight: 700 }}>Days Requested: <span className="mono">{newDays}</span></div>}
        <div className="form-group">
          <label className="form-label">Reason *</label>
          <textarea className="input" rows={3} value={newReason} onChange={(event) => setNewReason(event.target.value)} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn btn-secondary" onClick={() => setNewModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={submitNew} disabled={saving}>{saving ? "Submitting..." : "Submit Request"}</button>
        </div>
      </Modal>

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Leave Request">
        <div style={{ fontSize: 12.5, marginBottom: 12 }}>
          <strong>{rejectModal?.empName}</strong> - {rejectModal?.leaveType} ({formatDate(rejectModal?.from)} to {formatDate(rejectModal?.to)})
        </div>
        <div className="form-group">
          <label className="form-label">Rejection Reason *</label>
          <textarea className="input" rows={3} maxLength={256} value={rejectComment} onChange={(event) => setRejectComment(event.target.value)} />
          <div style={{ marginTop: 5, fontSize: 11, color: "var(--t3)" }}>
            Mandatory. Use more than one word, maximum 256 characters.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={confirmReject} disabled={saving}>Reject</button>
        </div>
      </Modal>

      <Modal open={!!earlyModal} onClose={() => setEarlyModal(null)} title="Mark Early Return">
        <div style={{ background: "var(--inp)", padding: 12, borderRadius: "var(--rsm)", marginBottom: 12, fontSize: 12.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{earlyModal?.empName} - {earlyModal?.leaveType}</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--t3)" }}>Original: {formatDate(earlyModal?.from)} to {formatDate(earlyModal?.to)}</div>
        </div>
        <div className="form-group">
          <label className="form-label">Employee returned on</label>
          <input className="input" type="date" value={earlyDate} onChange={(event) => setEarlyDate(event.target.value)} min={String(earlyModal?.from || "").slice(0, 10)} max={String(earlyModal?.to || "").slice(0, 10)} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setEarlyModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={confirmEarlyReturn} disabled={saving || !earlyDate}>Confirm Early Return</button>
        </div>
      </Modal>
    </div>
  );
}
