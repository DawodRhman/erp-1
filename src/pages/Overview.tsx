// pages/OverviewPage.tsx
// Visible to: SuperAdmin, Head HR only
// Shows company-wide attendance summary across all branches

import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import FeaturePlaceholder from '../components/FeaturePlaceholder';
import { BRANCHES, EMP_DATA, INITIAL_LOCKS, nameGrad, getIni, SHARED_CSS } from './attendanceTypes';

export default function OverviewPage() {
  const { activeRole } = useAuth();

  // ── Aggregate all employees across all branches ──────────────────────────
  const allEmps = useMemo(() => Object.values(EMP_DATA).flat(), []);

  const stats = useMemo(() => ({
    total:   allEmps.length,
    present: allEmps.filter(e => e.status === 'Present').length,
    late:    allEmps.filter(e => e.status === 'Late').length,
    absent:  allEmps.filter(e => e.status === 'Absent').length,
    onLeave: allEmps.filter(e => e.status === 'On Leave').length,
  }), [allEmps]);

  const branchSummary = useMemo(() => BRANCHES.map(b => {
    const emps  = EMP_DATA[b.id] || [];
    const lock  = INITIAL_LOCKS[b.id];
    return {
      ...b,
      total:   emps.length,
      present: emps.filter(e => e.status === 'Present').length,
      late:    emps.filter(e => e.status === 'Late').length,
      absent:  emps.filter(e => e.status === 'Absent').length,
      onLeave: emps.filter(e => e.status === 'On Leave').length,
      lockStatus: lock?.status || 'unlocked',
    };
  }), []);

  const lockStats = useMemo(() => ({
    open:      Object.values(INITIAL_LOCKS).filter(l => l.status === 'unlocked').length,
    submitted: Object.values(INITIAL_LOCKS).filter(l => l.status === 'branch_locked').length,
    finalized: Object.values(INITIAL_LOCKS).filter(l => l.status === 'finalized').length,
    rejected:  Object.values(INITIAL_LOCKS).filter(l => l.status === 'rejected').length,
  }), []);

  const lockPillStyle: Record<string, React.CSSProperties> = {
    unlocked:      { background: '#eef2ff', color: '#4f46e5' },
    branch_locked: { background: '#fef3c7', color: '#d97706' },
    finalized:     { background: '#d1fae5', color: '#059669' },
    rejected:      { background: '#fee2e2', color: '#dc2626' },
  };
  const lockLabel: Record<string, string> = {
    unlocked: 'Open', branch_locked: 'Submitted', finalized: 'Finalized', rejected: 'Sent Back',
  };

  // Guard after hooks so this page remains stable across role changes.
  if (activeRole !== 'super_admin' && activeRole !== 'head_hr') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#94a3b8', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 40 }}></span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Access Restricted</span>
        <span style={{ fontSize: 12 }}>This page is only visible to SuperAdmin and Head HR.</span>
      </div>
    );
  }

  return (
    <FeaturePlaceholder>
    <>
      <style>{SHARED_CSS}</style>
      <div style={{ padding: '22px 24px', fontFamily: "'DM Sans',sans-serif" }}>

        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="page-title">
              <div className="page-title-ic" style={{ background: 'linear-gradient(135deg,#eef2ff,#dbeafe)' }}></div>
              Overview
            </div>
            <div className="page-sub">Company-wide attendance summary · All branches · {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <div className="topbar-right">
            <button className="btn btn-ghost" onClick={() => {
              const data = { exportedAt: new Date().toISOString(), stats, branches: branchSummary };
              const b = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'overview_report.json'; a.click();
            }}> Export Summary</button>
          </div>
        </div>

        {/* Main Stat Cards */}
        <div className="stat-grid-5">
          {[
            { cls: 'sc-green',  icon: '', val: stats.present, lbl: 'Present Today',  sub: `${Math.round(stats.present / stats.total * 100)}% attendance` },
            { cls: 'sc-amber',  icon: '⏰', val: stats.late,    lbl: 'Late Arrivals',  sub: 'Flagged check-ins' },
            { cls: 'sc-red',    icon: '', val: stats.absent,  lbl: 'Absent Today',   sub: 'Without leave' },
            { cls: 'sc-violet', icon: '', val: stats.onLeave, lbl: 'On Leave',       sub: 'Approved leaves' },
            { cls: 'sc-indigo', icon: '', val: stats.total,   lbl: 'Total Staff',    sub: `Across ${BRANCHES.length} branches` },
          ].map((s, i) => (
            <div key={i} className={`scard ${s.cls}`}>
              <div className="scard-icon">{s.icon}</div>
              <div className="scard-val">{s.val}</div>
              <div className="scard-lbl">{s.lbl}</div>
              <div className="scard-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Lock Status Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          {[
            { cls: 'sc-indigo', icon: '', val: lockStats.open,      lbl: 'Open Sheets',   sub: 'Not yet submitted' },
            { cls: 'sc-amber',  icon: '', val: lockStats.submitted, lbl: 'Submitted',     sub: 'Awaiting Head HR' },
            { cls: 'sc-green',  icon: '', val: lockStats.finalized, lbl: 'Finalized',     sub: 'Saved to reports' },
            { cls: 'sc-red',    icon: '↩️', val: lockStats.rejected,  lbl: 'Sent Back',     sub: 'Needs correction' },
          ].map((s, i) => (
            <div key={i} className={`scard ${s.cls}`}>
              <div className="scard-icon">{s.icon}</div>
              <div className="scard-val">{s.val}</div>
              <div className="scard-lbl">{s.lbl}</div>
              <div className="scard-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Branch Summary Table */}
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-header">
            <div className="card-title"> Branch-wise Summary</div>
            <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>{BRANCHES.length} branches</span>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>City</th>
                  <th>Manager</th>
                  <th>Total Staff</th>
                  <th>Present</th>
                  <th>Late</th>
                  <th>Absent</th>
                  <th>On Leave</th>
                  <th>Sheet Status</th>
                </tr>
              </thead>
              <tbody>
                {branchSummary.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div className="emp-cell">
                        <div className="av" style={{ background: nameGrad(b.name) }}>{getIni(b.name)}</div>
                        <div>
                          <div className="emp-name">{b.name}</div>
                          <div className="emp-code">{b.hrContact}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--t3)' }}>{b.city}</td>
                    <td style={{ fontSize: 11, fontWeight: 600 }}>{b.mgr}</td>
                    <td>
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)' }}>{b.total}</span>
                    </td>
                    <td><span style={{ fontWeight: 700, color: '#059669' }}>{b.present}</span></td>
                    <td><span style={{ fontWeight: 700, color: '#d97706' }}>{b.late}</span></td>
                    <td><span style={{ fontWeight: 700, color: '#dc2626' }}>{b.absent}</span></td>
                    <td><span style={{ fontWeight: 700, color: '#7c3aed' }}>{b.onLeave}</span></td>
                    <td>
                      <span className="pill" style={lockPillStyle[b.lockStatus]}>
                        {lockLabel[b.lockStatus] || b.lockStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* All Employees Table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"> All Employees Today</div>
            <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600 }}>{allEmps.length} total records</span>
          </div>
          <div className="tbl-wrap">
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
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {BRANCHES.map(b =>
                  (EMP_DATA[b.id] || []).map(e => {
                    const shiftStyle: Record<string, React.CSSProperties> = {
                      Morning: { background: '#dbeafe', color: '#1e40af' },
                      Evening: { background: '#fef3c7', color: '#92400e' },
                      Night:   { background: '#ede9fe', color: '#4c1d95' },
                    };
                    const statusStyle: Record<string, React.CSSProperties> = {
                      Present:    { background: '#d1fae5', color: '#059669' },
                      Late:       { background: '#fef3c7', color: '#d97706' },
                      Absent:     { background: '#fee2e2', color: '#dc2626' },
                      'On Leave': { background: '#ede9fe', color: '#7c3aed' },
                    };
                    return (
                      <tr key={`${b.id}-${e.code}`}>
                        <td>
                          <div className="emp-cell">
                            <div className="av" style={{ background: nameGrad(e.name) }}>{getIni(e.name)}</div>
                            <div>
                              <div className="emp-name">{e.name}</div>
                              <div className="emp-code">{e.code}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 10, background: '#f3f4f6', padding: '2px 7px', borderRadius: 5, color: 'var(--t2)', fontWeight: 600 }}>
                            {b.name}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 10, background: '#f3f4f6', padding: '2px 7px', borderRadius: 5, color: 'var(--t2)', fontWeight: 600 }}>
                            {e.dept}
                          </span>
                        </td>
                        <td>
                          <span className="pill" style={shiftStyle[e.shift] || {}}>{e.shift}</span>
                        </td>
                        <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{e.ci}</td>
                        <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{e.co}</td>
                        <td>
                          <span className="pill" style={statusStyle[e.status] || {}}>{e.status}</span>
                        </td>
                        <td style={{ fontSize: 10, color: 'var(--t3)' }}>{e.note || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
    </FeaturePlaceholder>
  );
}
