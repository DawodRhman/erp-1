import React, { useMemo, useState } from 'react';
import { CalendarDays, Plus, Wallet } from 'lucide-react';
import { getStatusColor } from '../services/api';
import Modal from '../components/common/Modal';
import { useToastContext } from '../context/ToastContext';
import { useLeaves, useMyLeaveBalances } from '../hooks/useLeaves';
import { useAuth } from '../context/AuthContext';

function formatDateOnly(value?: string) {
  if (!value) return '-';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date);
}

function daysBetweenInclusive(start?: string, end?: string) {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
}

function normalizeBalance(row: any, index: number) {
  const total = Number(row.total ?? row.balance ?? row.allowed ?? row.allocated ?? 0);
  const used = Number(row.used ?? row.consumed ?? 0);
  const remaining = Number(row.remaining ?? row.available ?? Math.max(total - used, 0));
  return {
    id: row.leave_type_id || row.leaveTypeId || row.type_id || row.id || '',
    type: row.leave_type?.name || row.leave_type_name || row.type || row.name || `Leave ${index + 1}`,
    total,
    used,
    remaining,
    color: index % 3 === 0 ? 'var(--p)' : index % 3 === 1 ? 'var(--green)' : 'var(--teal)',
  };
}

function normalizeLeave(row: any) {
  const from = row.start_date || row.from || row.date_from;
  const to = row.effective_end_date || row.end_by_force || row.end_date || row.to || row.date_to;
  return {
    id: row.id,
    type: row.leave_type?.name || row.leave_type_name || row.leave_type || row.leaveType || row.type || row.name || 'Leave',
    from,
    to,
    days: row.days || row.total_days || row.duration || daysBetweenInclusive(from, to) || '-',
    reason: row.reason || row.notes || 'Not provided',
    reviewNote: row.review_note || row.rejection_reason || row.reject_reason || row.reviewed_note || '',
    appliedOn: row.applied_on || row.created_at || row.requested_at,
    status: row.status || '-',
  };
}

export default function MyLeave() {
  const { user } = useAuth();
  const { showToast } = useToastContext();
  const { data: leaveRows = [], isLoading, create } = useLeaves(
    user?.employeeId ? { employee_id: user.employeeId } : undefined,
  );
  const { data: balanceRows = [], isLoading: balancesLoading } = useMyLeaveBalances();
  const [modal, setModal] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const balances = useMemo(
    () => (Array.isArray(balanceRows) ? balanceRows : []).map(normalizeBalance),
    [balanceRows],
  );
  const leaves = useMemo(
    () => (Array.isArray(leaveRows) ? leaveRows : []).map(normalizeLeave),
    [leaveRows],
  );
  const selectedBalance = balances.find((b) => b.id === leaveTypeId) || balances[0];
  const effectiveLeaveTypeId = leaveTypeId || selectedBalance?.id || '';

  const days = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    return Math.max(
      0,
      Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000) + 1,
    );
  }, [fromDate, toDate]);
  const overBalance = selectedBalance && days > selectedBalance.remaining;

  const resetForm = () => {
    setFromDate('');
    setToDate('');
    setReason('');
    setLeaveTypeId('');
  };

  const submit = async () => {
    if (!user?.employeeId) {
      showToast('Your employee profile is not linked yet.', 'error');
      return;
    }
    if (!effectiveLeaveTypeId) {
      showToast('No leave type is assigned to your profile yet.', 'error');
      return;
    }
    if (!fromDate || !toDate || !reason) {
      showToast('Please fill all mandatory fields.', 'error');
      return;
    }
    if (overBalance) {
      showToast('Requested days exceed your available balance.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await create({
        employee_id: user.employeeId,
        leave_type_id: effectiveLeaveTypeId,
        start_date: fromDate,
        end_date: toDate,
        reason,
      });
      showToast('Leave request submitted.');
      setModal(false);
      resetForm();
    } catch {
      showToast('Could not submit leave request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">My Leave</div>
          <div className="pg-sub">Your leave wallet and request history</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={13} /> Apply for Leave
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {balancesLoading ? (
          <div className="card" style={{ color: 'var(--t3)', textAlign: 'center' }}>Loading leave wallet...</div>
        ) : balances.length ? (
          balances.map((b) => (
            <div key={`${b.id}-${b.type}`} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>{b.type}</div>
              <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: b.color }}>
                {b.remaining}
                <span style={{ fontSize: 13, color: 'var(--t3)' }}> / {b.total}</span>
              </div>
              <div className="progress-bar" style={{ marginTop: 8 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${b.total ? Math.min(100, (b.remaining / b.total) * 100) : 0}%`,
                    background: b.color,
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 6 }}>{b.used} used</div>
            </div>
          ))
        ) : (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--t3)' }}>
            <Wallet size={28} style={{ margin: '0 auto 8px', opacity: .35 }} />
            Leave balances are not assigned yet.
          </div>
        )}
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Loading leave requests...</div>
        ) : leaves.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>
            <CalendarDays size={32} style={{ margin: '0 auto 8px', opacity: .4 }} />
            <p>No leave requests yet.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Review Note</th><th>Applied</th><th>Status</th></tr>
            </thead>
            <tbody>
              {leaves.map((l: any, i: number) => (
                <tr key={l.id || i}>
                  <td>{l.type}</td>
                  <td className="mono">{formatDateOnly(l.from)}</td>
                  <td className="mono">{formatDateOnly(l.to)}</td>
                  <td className="mono">{l.days}</td>
                  <td>{l.reason}</td>
                  <td>{l.reviewNote || 'Not provided'}</td>
                  <td className="mono">{formatDateOnly(l.appliedOn)}</td>
                  <td><span className={`pill ${getStatusColor(l.status)}`}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Apply for Leave" footer={<><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={submitting || !!overBalance || !balances.length}>{submitting ? 'Submitting...' : 'Submit'}</button></>}>
        <div style={{ marginBottom: 16 }}>
          {balances.length ? balances.map((b) => (
            <div key={`${b.id}-modal`} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
              <span>{b.type}</span>
              <span className="mono" style={{ color: b.color, fontWeight: 600 }}>{b.remaining} remaining</span>
            </div>
          )) : (
            <div style={{ color: 'var(--t3)', fontSize: 12 }}>No leave balances are assigned to your profile.</div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Leave Type</label>
          <select className="input select-input" value={effectiveLeaveTypeId} onChange={e => setLeaveTypeId(e.target.value)} disabled={!balances.length}>
            {balances.map(b => <option key={b.id || b.type} value={b.id}>{b.type} ({b.remaining} remaining)</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">From</label><input className="input" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">To</label><input className="input" type="date" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        </div>
        {days > 0 && selectedBalance && (
          <div style={{ fontSize: 12, marginBottom: 8, color: overBalance ? 'var(--red)' : 'var(--p)', fontWeight: 600 }}>
            {days} day(s) requested{overBalance ? `, exceeds balance of ${selectedBalance.remaining}` : `, ${selectedBalance.remaining - days} will remain`}
          </div>
        )}
        <div className="form-group"><label className="form-label">Reason *</label><textarea className="input" rows={3} value={reason} onChange={e => setReason(e.target.value)} /></div>
      </Modal>
    </div>
  );
}
