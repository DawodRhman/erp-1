import React from 'react';
import { Wallet } from 'lucide-react';

export default function MyPayslips() {
  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">My Payslips</div>
          <div className="pg-sub">Payroll self-service is not available in this Tab 1 build.</div>
        </div>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: 44, color: 'var(--t3)' }}>
        <Wallet size={34} style={{ margin: '0 auto 10px', opacity: .35 }} />
        <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--t1)', marginBottom: 4 }}>
          Payslips are coming soon
        </div>
        <div style={{ fontSize: 12 }}>
          No payroll data is shown until the backend endpoint is available.
        </div>
      </div>
    </div>
  );
}
