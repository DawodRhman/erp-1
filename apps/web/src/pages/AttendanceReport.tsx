import React, { useMemo, useState } from "react";
import { Download, Upload, FileText } from "lucide-react";
import { useData } from "../context/DataContext";

function csvEscape(value: string) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export default function AttendanceReport() {
  const { allAttendanceToday, attendanceLocks } = useData();
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [message, setMessage] = useState("");

  const rows = useMemo(() => {
    return allAttendanceToday.filter((row: any) => {
      const lockKey = `${row.branch || "Head Office"}-${reportDate}`;
      return attendanceLocks[lockKey]?.status === "finalized";
    });
  }, [allAttendanceToday, attendanceLocks, reportDate]);

  const exportCsv = () => {
    if (!rows.length) {
      setMessage("No finalized report available to export.");
      return;
    }
    const headers = ["Employee ID", "Name", "Department", "Branch", "Shift", "Check In", "Check Out", "Status", "Notes"];
    const body = rows.map((row: any) => [
      row.empId,
      row.name,
      row.dept,
      row.branch,
      row.shift,
      row.checkIn,
      row.checkOut,
      row.status,
      row.notes || "",
    ].map(csvEscape).join(","));
    const csv = [headers.map(csvEscape).join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "attendance-report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setMessage(`Imported ${file.name}. Use this data for reference or manual reconciliation.`);
  };

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">Final Attendance Report</div>
          <div className="pg-sub">View finalized attendance sheets and export approved reports.</div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--t3)' }}>
            Super Admin view only: this page shows only attendance sheets that have completed branch and head HR approval stages.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <label className="label">Report Date</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="input"
              style={{ minWidth: 180 }}
            />
          </div>
          <button className="btn btn-primary" type="button" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </button>
          <label className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <Upload size={14} /> Import CSV
            <input type="file" accept=".csv" style={{ display: "none" }} onChange={importFile} />
          </label>
        </div>
      </div>

      {message && (
        <div className="attendance-banner" style={{ marginBottom: 14 }}>
          <FileText size={14} /> {message}
        </div>
      )}

      <div className="card attendance-table-card" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Branch</th>
              <th>Department</th>
              <th>Shift</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row: any) => (
              <tr key={`${row.empId}-${row.branch}-${row.checkIn}`}>
                <td>{row.name}</td>
                <td>{row.branch}</td>
                <td>{row.dept}</td>
                <td>{row.shift}</td>
                <td>{row.checkIn}</td>
                <td>{row.checkOut}</td>
                <td><span className="pill pill-green">{row.status}</span></td>
                <td>{row.notes || "-"}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--t3)" }}>
                  No finalized attendance report available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
