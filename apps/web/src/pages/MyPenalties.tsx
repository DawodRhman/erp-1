import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Filter,
  Search,
  CheckCircle2,
} from "lucide-react";
import { formatPKR } from "../services/api";
import { useMyPenalties } from "../hooks/usePenalties";
import { useToastContext } from "../context/ToastContext";

export default function MyPenalties() {
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { showToast } = useToastContext();

  const { data: serverPenalties = [], isLoading, acknowledge } = useMyPenalties();

  const penaltiesData = useMemo(() => {
    return (Array.isArray(serverPenalties) ? serverPenalties : []).map((p: any) => ({
      id: p.id || 'N/A',
      rawDate: p.penalty_date || p.date || p.created_at || '',
      date: (p.penalty_date || p.date || p.created_at || '').split('T')[0],
      type: p.rule_name || p.penalty_rule?.name || p.penalty_type || 'Manual Penalty',
      reason: p.reason || p.notes || 'No reason provided',
      amount: Number(p.amount_pkr ?? p.amount ?? p.final_amount ?? p.penalty_amount ?? p.deduction_amount ?? 0),
      status: p.status || 'pending',
      acked: Boolean(p.employee_ack || p.ack || p.acknowledged || p.is_acknowledged),
      appliedBy: p.proposed_by_name || p.actioned_by_name || p.actioned_by || p.applied_by_name || p.applied_by || 'HR',
      month: (p.penalty_date || p.date || p.created_at) ? new Date(p.penalty_date || p.date || p.created_at).toLocaleString('default', { month: 'long', year: 'numeric' }) : '',
      waivedReason: p.status === 'rejected' ? (p.review_note || p.notes) : undefined,
    }));
  }, [serverPenalties]);

  const typeOptions = useMemo(
    () => Array.from(new Set(penaltiesData.map((p: any) => p.type).filter(Boolean))),
    [penaltiesData],
  );

  const filtered = penaltiesData.filter((p: any) => {
    if (filter !== "all" && p.status.toLowerCase() !== filter) return false;
    if (typeFilter !== "all" && p.type !== typeFilter) return false;
    if (search && !p.reason.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const totalApplied = penaltiesData
    .filter((p: any) => p.status === "approved" || p.status === "acknowledged")
    .reduce((sum: number, p: any) => sum + p.amount, 0);
  const totalWaived = penaltiesData
    .filter((p: any) => p.status === "rejected")
    .reduce((sum: number, p: any) => sum + p.amount, 0);
  
  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const thisMonthTotal = penaltiesData
    .filter((p: any) => (p.status === "approved" || p.status === "acknowledged") && p.month === currentMonthName)
    .reduce((sum: number, p: any) => sum + p.amount, 0);

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledge(id);
      showToast("Penalty acknowledged.");
    } catch {
      showToast("Could not acknowledge penalty.", "error");
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Late Arrival":
        return "#e65100";
      case "Early Leave":
        return "#7b1fa2";
      case "Absent":
        return "#c62828";
      case "Policy Violation":
        return "#1565c0";
      default:
        return "var(--t2)";
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="pg-head">
        <div>
          <div className="pg-title">My Penalties</div>
          <div className="pg-sub">View your penalty history and deductions</div>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          className="card"
          style={{ padding: "16px 20px", borderLeft: "3px solid #c62828" }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--t3)",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            This Month
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#c62828" }}>
            {formatPKR(thisMonthTotal)}
          </div>
          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
            {currentMonthName}
          </div>
        </div>
        <div
          className="card"
          style={{ padding: "16px 20px", borderLeft: "3px solid #e65100" }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--t3)",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Total Deducted
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#e65100" }}>
            {formatPKR(totalApplied)}
          </div>
          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
            All time
          </div>
        </div>
        <div
          className="card"
          style={{ padding: "16px 20px", borderLeft: "3px solid #4caf50" }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--t3)",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Total Waived
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#4caf50" }}>
            {formatPKR(totalWaived)}
          </div>
          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
            All time
          </div>
        </div>
        <div
          className="card"
          style={{ padding: "16px 20px", borderLeft: "3px solid var(--p)" }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--t3)",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Total Records
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--p)" }}>
            {penaltiesData.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
            {penaltiesData.filter((p) => p.status === "approved").length} approved,{" "}
            {penaltiesData.filter((p) => p.status === "rejected").length} waived
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="ch">
          <div className="ct">
            <div
              className="ct-ico"
              style={{ background: "#ffebee", color: "#c62828" }}
            >
              <AlertTriangle size={13} />
            </div>
            Penalty History
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="input-wrap" style={{ width: 200 }}>
              <Search size={13} />
              <input
                className="input"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input select-input"
              style={{ width: 140 }}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="rejected">Waived</option>
            </select>
            <select
              className="input select-input"
              style={{ width: 140 }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--t3)" }}>
            Loading penalties...
          </div>
        ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Type</th>
              <th>Reason</th>
              <th>Amount</th>
              <th>Applied By</th>
              <th>Status</th>
              <th>ACK</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={i}>
                <td className="mono" style={{ fontSize: 11 }}>
                  {p.id}
                </td>
                <td className="mono">{p.date}</td>
                <td>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: getTypeColor(p.type),
                      padding: "3px 8px",
                      background: getTypeColor(p.type) + "15",
                      borderRadius: 4,
                    }}
                  >
                    {p.type}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: "var(--t2)", maxWidth: 250 }}>
                  {p.reason}
                  {p.waivedReason && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "#4caf50",
                        marginTop: 2,
                        fontStyle: "italic",
                      }}
                    >
                      Waived: {p.waivedReason}
                    </div>
                  )}
                </td>
                <td
                  className="mono"
                  style={{
                    fontWeight: 600,
                    color: (p.status === "approved" || p.status === "acknowledged") ? "#c62828" : "var(--t3)",
                    textDecoration:
                      p.status === "rejected" ? "line-through" : "none",
                  }}
                >
                  Rs. {(p.amount ?? 0).toLocaleString()}
                </td>
                <td style={{ fontSize: 11, color: "var(--t3)" }}>
                  {p.appliedBy}
                </td>
                <td>
                  <span
                    className={`pill ${(p.status === "approved" || p.status === "acknowledged") ? "pill-red" : p.status === "rejected" ? "pill-green" : "pill-amber"}`}
                  >
                    {(p.status === "approved" || p.status === "acknowledged") ? "Deducted" : p.status === "rejected" ? "Waived" : p.status.toUpperCase()}
                  </span>
                </td>
                <td>
                  {(p.status === "approved" || p.status === "acknowledged") && !p.acked ? (
                    <button className="btn btn-sm btn-primary" onClick={() => handleAcknowledge(p.id)}>
                      <CheckCircle2 size={12} /> ACK
                    </button>
                  ) : (
                    <span className={`pill ${p.acked ? "pill-green" : "pill-steel"}`}>
                      {p.acked ? "Acknowledged" : "-"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}

        {!isLoading && filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--t3)",
            }}
          >
            <AlertTriangle
              size={32}
              style={{ marginBottom: 8, opacity: 0.3 }}
            />
            <div>No penalties found matching your filters</div>
          </div>
        )}

        {/* Summary Footer */}
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            background: "#fff3e0",
            borderRadius: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={16} style={{ color: "#e65100" }} />
            <div style={{ fontSize: 12, color: "#e65100" }}>
              <strong>Note:</strong> Penalties are deducted from your salary at
              the end of each month. Contact HR for disputes.
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)" }}>
            Showing {filtered.length} of {penaltiesData.length} records
          </div>
        </div>
      </div>
    </div>
  );
}











