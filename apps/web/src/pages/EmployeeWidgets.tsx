import React, { useState } from "react";

const allWidgets = ["Attendance Today", "Leave Balance", "Announcements", "Penalty Snapshot", "Team Birthdays"];

export default function EmployeeWidgets() {
  const [enabled, setEnabled] = useState<string[]>(["Attendance Today", "Leave Balance", "Announcements"]);

  const toggle = (name: string) =>
    setEnabled((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">Personal Dashboard Widgets</div>
          <div className="pg-sub">Customize visible widgets on employee dashboard.</div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        {allWidgets.map((widget) => (
          <label key={widget} style={{ display: "flex", gap: 8, padding: "8px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={enabled.includes(widget)} onChange={() => toggle(widget)} />
            {widget}
          </label>
        ))}
      </div>
      <div className="card">
        <div className="ct" style={{ marginBottom: 10 }}>Preview</div>
        <div className="g3">
          {enabled.map((widget) => (
            <div key={widget} className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{widget}</div>
              <div style={{ fontSize: 11, color: "var(--t3)" }}>Widget active on dashboard</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
