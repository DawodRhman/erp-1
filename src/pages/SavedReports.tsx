// pages/SavedReports.tsx
// Visible to: SuperAdmin, Head HR only
// Finalized / Pending / Rejected tabs for saved attendance reports

import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import FeaturePlaceholder from '../components/FeaturePlaceholder';
import {
  BRANCHES, EMP_DATA, INITIAL_LOCKS, INITIAL_REPORTS,
  nameGrad, getIni, SHARED_CSS,
  Branch, EmpRecord, LockState, SavedReport,
  STATUS_CFG, SHIFT_STYLE, STATUS_STYLE,
} from './attendanceTypes';

// ── Toast hook (same pattern) ─────────────────────────────────────────────────
function useToast() {
  const [msg,     setMsg]     = useState('');
  const [type,    setType]    = useState<'success'|'error'|'info'>('success');
  const [visible, setVisible] = useState(false);
  const show = useCallback((m: string, t: 'success'|'error'|'info' = 'success') => {
    setMsg(m); setType(t); setVisible(true);
    setTimeout(() => setVisible(false), 3200);
  }, []);
  const ToastEl = (
    <div className={`toast${visible ? ' show' : ''}`} style={{ background: type === 'error' ? '#7f1d1d' : '#1e293b' }}>
      <span>{type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info'}</span>
      <span>{msg}</span>
    </div>
  );
  return { show, ToastEl };
}

// ── Report Detail Modal ───────────────────────────────────────────────────────
interface DetailModalProps {
  report: SavedReport;
  onClose: () => void;
  onExport: () => void;
}
function DetailModal({ report, onClose, onExport }: DetailModalProps) {
  const [empSearch, setEmpSearch] = useState('');
  const filteredEmps = useMemo(() => {
    if (!empSearch.trim()) return report.data;
    const t = empSearch.toLowerCase();
    return report.data.filter(e => e.name.toLowerCase().includes(t) || e.dept.toLowerCase().includes(t));
  }, [report.data, empSearch]);

  return (
    <div className="modal-ov" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 860, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,.25)' }}>
        {/* Modal Header */}
        <div style={{ background: nameGrad(report.branch), padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}> {report.branch} — {report.date}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', marginTop: 3 }}>
              Locked by {report.lockedBy} · Verified by {report.verifiedBy} at {report.verifiedAt} · {report.empCount} employees
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn"
              style={{ background: 'rgba(255,255,255,.15)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}
              onClick={onExport}>
               Export
            </button>
            <button
              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
              onClick={onClose}></button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[
            { lbl: 'Present', val: report.data.filter(e => e.status === 'Present').length, color: 'var(--green)' },
            { lbl: 'Late',    val: report.data.filter(e => e.status === 'Late').length,    color: 'var(--amber)' },
            { lbl: 'Absent',  val: report.data.filter(e => e.status === 'Absent').length,  color: 'var(--red)' },
            { lbl: 'On Leave',val: report.data.filter(e => e.status === 'On Leave').length,color: 'var(--violet)' },
          ].map((s, i) => (
            <div key={i} className="ms-card">
              <div className="ms-val" style={{ color: s.color }}>{s.val}</div>
              <div className="ms-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div className="fsrc">
            <span></span>
            <input type="text" placeholder="Search employee or department..." value={empSearch} onChange={e => setEmpSearch(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', background: '#fafbff', borderBottom: '2px solid var(--border)', position: 'sticky', top: 0 }}>Employee</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', background: '#fafbff', borderBottom: '2px solid var(--border)', position: 'sticky', top: 0 }}>Department</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', background: '#fafbff', borderBottom: '2px solid var(--border)', position: 'sticky', top: 0 }}>Shift</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', background: '#fafbff', borderBottom: '2px solid var(--border)', position: 'sticky', top: 0 }}>Check In</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', background: '#fafbff', borderBottom: '2px solid var(--border)', position: 'sticky', top: 0 }}>Check Out</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', background: '#fafbff', borderBottom: '2px solid var(--border)', position: 'sticky', top: 0 }}>Status</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.08em', background: '#fafbff', borderBottom: '2px solid var(--border)', position: 'sticky', top: 0 }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmps.length === 0 ? (
                <tr><td colSpan={7} className="empty"><span className="empty-ic"></span>No matching employees</td></tr>
              ) : filteredEmps.map(e => (
                <tr key={e.code} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '11px 14px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div className="av" style={{ background: nameGrad(e.name) }}>{getIni(e.name)}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--t1)' }}>{e.name}</div>
                        <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: "'JetBrains Mono',monospace" }}>{e.code}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px' }}><span style={{ fontSize: 10, background: '#f3f4f6', padding: '2px 7px', borderRadius: 5, color: 'var(--t2)', fontWeight: 600 }}>{e.dept}</span></td>
                  <td style={{ padding: '11px 14px' }}><span className="pill" style={SHIFT_STYLE[e.shift] || {}}>{e.shift}</span></td>
                  <td style={{ padding: '11px 14px', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{e.ci}</td>
                  <td style={{ padding: '11px 14px', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{e.co}</td>
                  <td style={{ padding: '11px 14px' }}><span className="pill" style={STATUS_STYLE[e.status] || {}}>{e.status}</span></td>
                  <td style={{ padding: '11px 14px', fontSize: 10, color: 'var(--t3)' }}>{e.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SavedReports() {
  const { activeRole } = useAuth();
  const { show: toast, ToastEl } = useToast();

  // ── State ─────────────────────────────────────────────────────────────────
  const [reports,      setReports]      = useState<SavedReport[]>(INITIAL_REPORTS);
  const [locks,        setLocks]        = useState(INITIAL_LOCKS);
  const [activeTab,    setActiveTab]    = useState<'finalized' | 'pending' | 'rejected'>('finalized');
  const [viewReport,   setViewReport]   = useState<SavedReport | null>(null);
  const [monthFilter,  setMonthFilter]  = useState('all');
  const [searchReport, setSearchReport] = useState('');

  // ── Computed ──────────────────────────────────────────────────────────────
  const finalizedReports = useMemo(() =>
    reports.filter(r => {
      const b = BRANCHES.find(x => x.name === r.branch);
      return b && locks[b.id]?.status === 'finalized';
    }), [reports, locks]);

  const pendingBranches = useMemo(() =>
    BRANCHES.filter(b => locks[b.id]?.status === 'branch_locked'),
    [locks]);

  const rejectedBranches = useMemo(() =>
    BRANCHES.filter(b => locks[b.id]?.status === 'rejected'),
    [locks]);

  const filteredFinal = useMemo(() => {
    let list = finalizedReports;
    if (monthFilter !== 'all') list = list.filter(r => r.date.startsWith(monthFilter));
    if (searchReport) list = list.filter(r => r.branch.toLowerCase().includes(searchReport.toLowerCase()));
    return list;
  }, [finalizedReports, monthFilter, searchReport]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const exportReport = (r: SavedReport) => {
    const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `report_${r.branch.replace(/ /g, '_')}_${r.date}.json`; a.click();
    toast(' Report exported', 'success');
  };

  const bulkExport = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), reports: finalizedReports }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `all_reports_${new Date().toISOString().split('T')[0]}.json`; a.click();
    toast(' Bulk export complete', 'success');
  };

  // Guard after hooks so role changes never alter the hook order.
  if (activeRole !== 'super_admin' && activeRole !== 'head_hr') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12, color: '#94a3b8' }}>
        <span style={{ fontSize: 40 }}></span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Access Restricted</span>
        <span style={{ fontSize: 12 }}>Only SuperAdmin and Head HR can access this page.</span>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <FeaturePlaceholder>
    <>
      <style>{SHARED_CSS}</style>
      {ToastEl}

      <div style={{ padding: '22px 24px', fontFamily: "'DM Sans',sans-serif" }}>

        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="page-title">
              <div className="page-title-ic" style={{ background: 'linear-gradient(135deg,#d1fae5,#ccfbf1)' }}></div>
              Saved Reports
            </div>
            <div className="page-sub">Finalized attendance sheets · Verified by Head HR</div>
          </div>
          <div className="topbar-right">
            <select className="fsel" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
              <option value="all"> All Months</option>
              <option value="2026-05">May 2026</option>
              <option value="2026-04">April 2026</option>
              <option value="2026-03">March 2026</option>
            </select>
            <button className="btn btn-ghost" onClick={bulkExport}> Bulk Export</button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          <div className="scard sc-green" onClick={() => setActiveTab('finalized')} style={{ cursor: 'pointer' }}>
            <div className="scard-icon"></div>
            <div className="scard-val">{finalizedReports.length}</div>
            <div className="scard-lbl">Finalized Reports</div>
            <div className="scard-sub">Saved & verified</div>
          </div>
          <div className="scard sc-amber" onClick={() => setActiveTab('pending')} style={{ cursor: 'pointer' }}>
            <div className="scard-icon">⏳</div>
            <div className="scard-val">{pendingBranches.length}</div>
            <div className="scard-lbl">Pending Review</div>
            <div className="scard-sub">Awaiting Head HR</div>
          </div>
          <div className="scard sc-red" onClick={() => setActiveTab('rejected')} style={{ cursor: 'pointer' }}>
            <div className="scard-icon">↩️</div>
            <div className="scard-val">{rejectedBranches.length}</div>
            <div className="scard-lbl">Sent Back</div>
            <div className="scard-sub">Needs correction</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ maxWidth: 500, marginBottom: 16 }}>
          {([
            { key: 'finalized', label: ' Finalized', count: finalizedReports.length, countBg: 'var(--indigo)' },
            { key: 'pending',   label: '⏳ Pending',   count: pendingBranches.length,  countBg: 'var(--amber)' },
            { key: 'rejected',  label: '↩️ Rejected',  count: rejectedBranches.length, countBg: 'var(--red)' },
          ] as const).map(t => (
            <button
              key={t.key}
              className={`tab-btn${activeTab === t.key ? ' on' : ''}`}
              onClick={() => setActiveTab(t.key)}>
              {t.label}
              <span className="tab-count" style={{ background: t.countBg }}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* ── TAB: FINALIZED ── */}
        {activeTab === 'finalized' && (
          <>
            {/* Search */}
            <div className="frow" style={{ marginBottom: 14 }}>
              <div className="fsrc">
                <span></span>
                <input type="text" placeholder="Search branch name..." value={searchReport} onChange={e => setSearchReport(e.target.value)} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 600, marginLeft: 'auto' }}>
                {filteredFinal.length} report{filteredFinal.length !== 1 ? 's' : ''}
              </span>
            </div>

            {filteredFinal.length === 0 ? (
              <div className="card">
                <div className="empty"><span className="empty-ic"></span>No finalized reports yet</div>
              </div>
            ) : (
              <div className="saved-list">
                {filteredFinal.map(r => (
                  <div key={r.id} className="saved-item">
                    <div className="saved-item-left">
                      <div className="saved-ic" style={{ background: 'var(--green-l)' }}></div>
                      <div>
                        <div className="saved-name">{r.branch} — {r.date}</div>
                        <div className="saved-meta">
                          Locked by {r.lockedBy} · Verified by {r.verifiedBy} at {r.verifiedAt} · {r.empCount} employees
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="pill pill-green">FINALIZED</span>
                          <span style={{ fontSize: 10, color: 'var(--t3)' }}>
                            Present: {r.data.filter(e => e.status === 'Present').length} ·
                            Late: {r.data.filter(e => e.status === 'Late').length} ·
                            Absent: {r.data.filter(e => e.status === 'Absent').length} ·
                            On Leave: {r.data.filter(e => e.status === 'On Leave').length}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="saved-btns">
                      <button className="btn btn-ghost" onClick={() => setViewReport(r)}> View</button>
                      <button className="btn btn-outline-green" onClick={() => exportReport(r)}> Export</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB: PENDING ── */}
        {activeTab === 'pending' && (
          <>
            {pendingBranches.length === 0 ? (
              <div className="card">
                <div className="empty"><span className="empty-ic"></span>No pending sheets — all clear!</div>
              </div>
            ) : (
              <div className="saved-list">
                {pendingBranches.map(b => {
                  const lk = locks[b.id];
                  const emps = EMP_DATA[b.id] || [];
                  return (
                    <div key={b.id} className="saved-item">
                      <div className="saved-item-left">
                        <div className="saved-ic" style={{ background: 'var(--amber-l)' }}></div>
                        <div>
                          <div className="saved-name">{b.name}</div>
                          <div className="saved-meta">
                            Locked by {lk.lockedBy} at {lk.lockedAt} · Awaiting Head HR review
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span className="pill pill-amber">SUBMITTED</span>
                            <span style={{ fontSize: 10, color: 'var(--t3)' }}>
                              {emps.length} employees · {b.city}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="saved-btns">
                        <button
                          className="btn btn-green"
                          onClick={() => {
                            const now = new Date().toLocaleString('en-PK', { hour12: false }).slice(0, 16);
                            const newLock = { ...lk, status: 'finalized' as const, verifiedBy: 'Head Admin', verifiedAt: now };
                            setLocks(p => ({ ...p, [b.id]: newLock }));
                            const rep: SavedReport = {
                              id: 'r' + Date.now(), branch: b.name, date: new Date().toISOString().split('T')[0],
                              lockedBy: lk.lockedBy, verifiedBy: 'Head Admin', verifiedAt: now,
                              empCount: emps.length, data: emps,
                            };
                            setReports(p => [...p, rep]);
                            toast(` ${b.name} verified & finalized!`, 'success');
                          }}>
                           Verify
                        </button>
                        <button
                          className="btn btn-outline-red"
                          onClick={() => {
                            const reason = window.prompt(`Reason for sending back ${b.name}?`);
                            if (!reason) return;
                            setLocks(p => ({ ...p, [b.id]: { ...p[b.id], status: 'rejected', reason } }));
                            toast(`↩️ ${b.name} sent back`, 'info');
                          }}>
                          ↩️ Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB: REJECTED ── */}
        {activeTab === 'rejected' && (
          <>
            {rejectedBranches.length === 0 ? (
              <div className="card">
                <div className="empty"><span className="empty-ic"></span>No rejected sheets</div>
              </div>
            ) : (
              <div className="saved-list">
                {rejectedBranches.map(b => {
                  const lk = locks[b.id];
                  return (
                    <div key={b.id} className="saved-item">
                      <div className="saved-item-left">
                        <div className="saved-ic" style={{ background: 'var(--red-l)' }}>↩️</div>
                        <div>
                          <div className="saved-name">{b.name}</div>
                          <div className="saved-meta">
                            Sent back · Reason: {lk.reason || '—'}
                          </div>
                          <div style={{ marginTop: 6 }}>
                            <span className="pill pill-red">REJECTED</span>
                          </div>
                        </div>
                      </div>
                      <div className="saved-btns">
                        <button
                          className="btn btn-ghost"
                          onClick={() => {
                            setLocks(p => ({ ...p, [b.id]: { ...p[b.id], status: 'unlocked', reason: undefined } }));
                            toast(` ${b.name} reopened for correction`, 'info');
                          }}>
                           Reopen
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {viewReport && (
        <DetailModal
          report={viewReport}
          onClose={() => setViewReport(null)}
          onExport={() => { exportReport(viewReport); }}
        />
      )}
    </>
    </FeaturePlaceholder>
  );
}
