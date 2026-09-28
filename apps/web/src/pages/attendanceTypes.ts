export type LockStatus = 'unlocked' | 'branch_locked' | 'finalized' | 'rejected';

export interface Branch {
  id: string;
  name: string;
  city: string;
  mgr: string;
  hrContact: string;
}

export interface EmpRecord {
  name: string;
  code: string;
  dept: string;
  shift: string;
  ci: string;
  co: string;
  status: 'Present' | 'Late' | 'Absent' | 'On Leave';
  note: string;
}

export interface LockState {
  status: LockStatus;
  lockedBy: string;
  lockedAt: string;
  verifiedBy?: string;
  verifiedAt?: string;
  reason?: string;
}

export interface SavedReport {
  id: string;
  branch: string;
  date: string;
  lockedBy: string;
  verifiedBy: string;
  verifiedAt: string;
  empCount: number;
  data: EmpRecord[];
}

export const BRANCHES: Branch[] = [
  { id: 'head-office', name: 'Head Office', city: 'Karachi, SITE', mgr: 'Usman Tariq', hrContact: 'hr.headoffice@co.pk' },
  { id: 'clifton', name: 'Clifton Branch', city: 'Karachi, Clifton', mgr: 'Sara Malik', hrContact: 'hr.clifton@co.pk' },
  { id: 'gulshan', name: 'Gulshan Branch', city: 'Karachi, Gulshan', mgr: 'Ahmed Raza', hrContact: 'hr.gulshan@co.pk' },
  { id: 'dha', name: 'DHA Branch', city: 'Karachi, DHA Phase 5', mgr: 'Nadia Sheikh', hrContact: 'hr.dha@co.pk' },
  { id: 'lahore', name: 'Lahore Office', city: 'Lahore, Gulberg', mgr: 'Bilal Khan', hrContact: 'hr.lahore@co.pk' },
];

export const EMP_DATA: Record<string, EmpRecord[]> = {
  'head-office': [
    { name: 'Ahmed Raza', code: 'E-101', dept: 'Sales', shift: 'Morning', ci: '09:04', co: '06:02', status: 'Present', note: '' },
    { name: 'Sana Iqbal', code: 'E-102', dept: 'Accounts', shift: 'Morning', ci: '09:18', co: '06:10', status: 'Late', note: 'Traffic on Shahrah' },
    { name: 'Bilal Khan', code: 'E-103', dept: 'IT', shift: 'Evening', ci: '02:00', co: '10:05', status: 'Present', note: 'Covering for Hamza' },
    { name: 'Hira Saleem', code: 'E-104', dept: 'HR', shift: 'Morning', ci: '--', co: '--', status: 'On Leave', note: 'CL approved' },
    { name: 'Usman Tariq', code: 'E-105', dept: 'Warehouse', shift: 'Night', ci: '10:11', co: '06:01', status: 'Present', note: 'Shift swap' },
  ],
  'clifton': [
    { name: 'Mariam Yousuf', code: 'E-106', dept: 'Marketing', shift: 'Morning', ci: '--', co: '--', status: 'Absent', note: 'No leave application' },
    { name: 'Faraz Ali', code: 'E-107', dept: 'Sales', shift: 'Morning', ci: '09:02', co: '06:00', status: 'Present', note: 'DHA visit' },
    { name: 'Zoya Hashmi', code: 'E-108', dept: 'Accounts', shift: 'Evening', ci: '14:25', co: '22:10', status: 'Late', note: 'Bank work' },
  ],
  'gulshan': [
    { name: 'Hassan Malik', code: 'E-117', dept: 'Operations', shift: 'Morning', ci: '08:55', co: '17:58', status: 'Present', note: '' },
  ],
  'dha': [
    { name: 'Adnan Khan', code: 'E-120', dept: 'Accounts', shift: 'Morning', ci: '--', co: '--', status: 'On Leave', note: 'EL approved' },
  ],
  'lahore': [
    { name: 'Imran Butt', code: 'E-123', dept: 'Operations', shift: 'Night', ci: '22:00', co: '06:00', status: 'Present', note: '' },
  ],
};

export const INITIAL_LOCKS: Record<string, LockState> = {
  'head-office': { status: 'branch_locked', lockedBy: 'Usman Tariq', lockedAt: '2026-05-07 08:55' },
  'clifton': { status: 'finalized', lockedBy: 'Sara Malik', lockedAt: '2026-05-07 09:10', verifiedBy: 'Head Admin', verifiedAt: '2026-05-07 10:30' },
  'gulshan': { status: 'unlocked', lockedBy: '', lockedAt: '' },
  'dha': { status: 'branch_locked', lockedBy: 'Nadia Sheikh', lockedAt: '2026-05-07 09:20' },
  'lahore': { status: 'unlocked', lockedBy: '', lockedAt: '' },
};

export const INITIAL_REPORTS: SavedReport[] = [
  { id: 'r1', branch: 'Clifton Branch', date: '2026-05-07', lockedBy: 'Sara Malik', verifiedBy: 'Head Admin', verifiedAt: '2026-05-07 10:30', empCount: EMP_DATA['clifton'].length, data: EMP_DATA['clifton'] },
];

export const nameGrad = (name: string) => {
  const palette = ['#818cf8', '#c084fc', '#f97316', '#14b8a6', '#10b981', '#3b82f6', '#8b5cf6'];
  return palette[(name.charCodeAt(0) || 0) % palette.length];
};

export const getIni = (name: string) => {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

export const STATUS_CFG = {
  Present: { label: 'Present', color: '#059669' },
  Late: { label: 'Late', color: '#d97706' },
  Absent: { label: 'Absent', color: '#dc2626' },
  'On Leave': { label: 'On Leave', color: '#7c3aed' },
};

export const SHIFT_STYLE: Record<string, React.CSSProperties> = {
  Morning: { background: '#dbeafe', color: '#1e40af' },
  Evening: { background: '#fef3c7', color: '#92400e' },
  Night: { background: '#ede9fe', color: '#4c1d95' },
};

export const STATUS_STYLE: Record<string, React.CSSProperties> = {
  Present:    { background: '#d1fae5', color: '#059669' },
  Late:       { background: '#fef3c7', color: '#d97706' },
  Absent:     { background: '#fee2e2', color: '#dc2626' },
  'On Leave': { background: '#ede9fe', color: '#7c3aed' },
};

export const SHARED_CSS = `
  .page-title { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 800; color: #1e1b4b; }
  .page-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .topbar { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 22px; }
  .topbar-right { display: flex; align-items: center; gap: 8px; }
  .btn { height: 34px; border-radius: 9px; border: 1.5px solid transparent; padding: 0 14px; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all .18s; font-family: inherit; white-space: nowrap; }
  .btn:hover { opacity: 0.95; }
  .btn-ghost { background: #fff; color: #374151; border-color: #e5e7eb; }
  .btn-green { background: #10b981; color: #fff; border-color: #10b981; }
  .btn-red { background: #ef4444; color: #fff; border-color: #ef4444; }
  /* Additional button variants used across Branch HR pages */
  .btn-on-gradient { background: rgba(255,255,255,.15); color: #fff; border-color: rgba(255,255,255,.2); }
  .btn-danger { background: rgba(239,68,68,.85); color: #fff; border: none; }
  .btn-success { background: rgba(16,185,129,.9); color: #fff; border: none; }
  .card { background: #fff; border-radius: 18px; border: 1px solid #e5e7eb; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); overflow: hidden; }
  .card-header { padding: 16px 20px; border-bottom: 1px solid #eef2ff; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .card-title { font-size: 14px; font-weight: 700; color: #111827; }
  .tbl-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #f3f4f6; }
  th { font-size: 10px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: .08em; background: #f9fafb; }
  tr:hover td { background: #f8fafc; }
  .stat-grid-5 { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
  .scard { border-radius: 18px; padding: 18px 20px; color: #111827; border: 1px solid transparent; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05); }
  .scard-icon { font-size: 20px; margin-bottom: 10px; }
  .scard-val { font-size: 30px; font-weight: 800; }
  .scard-lbl { font-size: 11px; font-weight: 700; margin-top: 4px; }
  .scard-sub { font-size: 10px; opacity: .75; margin-top: 4px; }
  .pill { padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; }
  .modal-ov { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 100; }
  .modal-box { width: 100%; max-width: 640px; background: #fff; border-radius: 18px; overflow: hidden; box-shadow: 0 24px 72px rgba(15, 23, 42, 0.18); }
  .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid #eef2ff; }
  .modal-title { font-size: 15px; font-weight: 700; }
  .modal-close { border: none; background: #f8fafc; width: 34px; height: 34px; border-radius: 12px; cursor: pointer; }
  .modal-body { padding: 18px 22px; }
  .modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 22px; border-top: 1px solid #eef2ff; background: #f8fafc; }
  .mini-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
  .ms-card { background: #f8fafc; border-radius: 14px; padding: 14px 16px; }
  .ms-val { font-size: 18px; font-weight: 800; }
  .ms-lbl { font-size: 10px; color: #6b7280; margin-top: 4px; }
  .saved-list { display: grid; gap: 12px; }
  .saved-item { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #fff; border: 1px solid #eef2ff; border-radius: 18px; padding: 16px; }
  .saved-item-left { display: flex; align-items: center; gap: 12px; }
  .saved-ic { width: 42px; height: 42px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .saved-name { font-size: 14px; font-weight: 700; }
  .saved-meta { font-size: 11px; color: #6b7280; margin-top: 4px; }
  .tab-btn { padding: 10px 14px; border: none; background: transparent; color: #4b5563; font-size: 12px; font-weight: 700; border-radius: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
  .tab-btn.on { background: #eef2ff; color: #3730a3; }
  .tab-count { font-size: 8px; border-radius: 999px; padding: 2px 6px; color: #fff; }
  .empty { text-align: center; padding: 40px; color: #94a3b8; }
  .empty-ic { font-size: 32px; display: block; margin-bottom: 10px; }
  .toast { position: fixed; bottom: 24px; right: 24px; background: #111827; color: #fff; border-radius: 14px; padding: 12px 16px; display: inline-flex; align-items: center; gap: 10px; opacity: 0; transform: translateY(40px); transition: all .2s ease; }
  .toast.show { opacity: 1; transform: translateY(0); }
  @media (max-width: 960px) { .stat-grid-5 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;
