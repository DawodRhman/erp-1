import React from "react";
import { WalletCards } from "lucide-react";

export default function Payroll() {
  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">Payroll</div>
          <div className="pg-sub">Payroll and payslip processing will be enabled after the backend payroll module is ready.</div>
        </div>
      </div>

      <div
        className="card"
        style={{
          minHeight: 360,
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          background: "linear-gradient(135deg, rgba(37,99,235,.10), rgba(13,148,136,.10))",
        }}
      >
        <div>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              display: "grid",
              placeItems: "center",
              margin: "0 auto 18px",
              background: "rgba(37,99,235,.12)",
              color: "var(--p)",
            }}
          >
            <WalletCards size={34} />
          </div>
          <h1 style={{ margin: 0, fontSize: 36, color: "var(--t1)" }}>Coming Soon</h1>
          <p style={{ maxWidth: 520, margin: "12px auto 0", color: "var(--t2)", lineHeight: 1.6 }}>
            Payslips, salary processing, payroll approvals, and export-ready reports will appear here once the production payroll API is available.
          </p>
        </div>
      </div>
    </div>
  );
}
