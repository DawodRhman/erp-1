import React, { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

const requestsSeed = [
  { id: "LC-1", employee: "Ahmed Ali", branch: "Head Office", department: "Engineering", date: "2026-05-10" },
  { id: "LC-2", employee: "Sara Khan", branch: "Head Office", department: "Engineering", date: "2026-05-10" },
  { id: "LC-3", employee: "Usman Malik", branch: "Head Office", department: "Engineering", date: "2026-05-10" },
];

export default function LeaveCapacity() {
  const [capacity, setCapacity] = useState(2);
  const [requests] = useState(requestsSeed);

  const grouped = useMemo(() => {
    const key = "Head Office-Engineering-2026-05-10";
    return { key, count: requests.length, rows: requests };
  }, [requests]);

  const conflict = grouped.count > capacity;

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">Leave Capacity & Conflict Alert</div>
          <div className="pg-sub">Daily team leave limits with branch conflict warnings.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <label className="form-label">Max leaves allowed per team/day</label>
        <input className="input" type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value || 0))} />
      </div>

      {conflict && (
        <div className="attendance-banner" style={{ background: "rgba(239,68,68,.12)", borderColor: "rgba(239,68,68,.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} />
            Conflict: {grouped.count} requests exceed capacity {capacity}.
          </div>
          <span className="pill pill-red">CONFLICT</span>
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>ID</th><th>Employee</th><th>Branch</th><th>Department</th><th>Date</th></tr></thead>
          <tbody>
            {requests.map((row) => (
              <tr key={row.id}>
                <td className="mono">{row.id}</td>
                <td>{row.employee}</td>
                <td>{row.branch}</td>
                <td>{row.department}</td>
                <td className="mono">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
