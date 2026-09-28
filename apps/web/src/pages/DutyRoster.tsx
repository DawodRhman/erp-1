import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Calendar, Clock, MapPin, User, Plus, Trash2, Filter, Link2 } from 'lucide-react';
import { DutyRoster, DutyRosterTemplate } from '../services/api';
import { getVisibleEmployees } from '../utils/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type ShiftCode = 'M' | 'E' | 'N' | 'Off';
interface WeeklyEntry { empId: string; empName: string; department: string; days: Record<string, ShiftCode>; }

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'MON' }, { key: 'tue', label: 'TUE' }, { key: 'wed', label: 'WED' },
  { key: 'thu', label: 'THU' }, { key: 'fri', label: 'FRI' }, { key: 'sat', label: 'SAT' },
];

const CYCLE: ShiftCode[] = ['M', 'E', 'N', 'Off'];
const cycleNext = (cur: ShiftCode): ShiftCode => CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];

const SHIFT_META: Record<ShiftCode, { bg: string; color: string; dot: string; label: string }> = {
  M:   { bg: '#dcfce7', color: '#16a34a', dot: '#22c55e',  label: 'Morning' },
  E:   { bg: '#fff7ed', color: '#ea580c', dot: '#f97316',  label: 'Evening' },
  N:   { bg: '#eff6ff', color: '#2563eb', dot: '#3b82f6',  label: 'Night' },
  Off: { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444',  label: 'Off' },
};

// Penalty rules
const PENALTY_RULES = [
  { icon: '⏰', title: 'Late Arrival',     condition: 'CheckIn > ShiftStart + 10m',        penalty: '–3 Days Salary',       color: '#ef4444', approved: false },
  { icon: '', title: 'Saturday Absent',  condition: 'Day=Sat & Status=Absent & !Leave',  penalty: '–2 Days + 1 CL Cut',  color: '#ef4444', approved: false },
  { icon: '', title: 'Uninformed Leave', condition: 'Status=Absent & No Application',    penalty: 'Paid · No Deduction',  color: '#f97316', approved: false },
  { icon: '', title: 'CEO Approved',     condition: 'Leave.Approver = CEO',              penalty: 'Waived',               color: '#16a34a', approved: true  },
];

const AV_GRADS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#ec4899,#f9a8d4)',
  'linear-gradient(135deg,#f97316,#fbbf24)',
  'linear-gradient(135deg,#14b8a6,#06b6d4)',
  'linear-gradient(135deg,#10b981,#34d399)',
  'linear-gradient(135deg,#3b82f6,#60a5fa)',
];
const avGrad  = (name: string) => AV_GRADS[(name?.charCodeAt(0) || 0) % AV_GRADS.length];
const getIni  = (name: string) => (name || '').split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
const chipClass = (s: DutyRoster['status']) =>
  `dr-chip ${ s==='Scheduled'?'dr-chip-scheduled': s==='Completed'?'dr-chip-completed': s==='Cancelled'?'dr-chip-cancelled':'dr-chip-onleave'}`;

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.6} }

  .dr-page {
    font-family:'DM Sans',system-ui,sans-serif;
    padding:24px 30px; background:#f0f2f8; min-height:100vh;
  }

  /* Cards */
  .dr-card {
    background:#fff; border-radius:18px; padding:22px;
    box-shadow:0 2px 12px rgba(0,0,0,.07); animation:fadeUp .3s ease both;
  }

  /* Inputs */
  .dr-input {
    height:38px; border:1.5px solid #e5e7eb; border-radius:10px; padding:0 12px;
    font-size:12px; color:#374151; background:#fff; outline:none;
    transition:border .15s,box-shadow .15s; font-family:inherit; width:100%;
  }
  .dr-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
  .dr-select { cursor:pointer; }
  .dr-textarea { resize:vertical; height:72px; padding:10px 12px; line-height:1.5; }

  /* Buttons */
  .dr-btn {
    height:38px; border:none; border-radius:10px; padding:0 18px; font-size:12px;
    font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px;
    transition:opacity .15s,transform .15s; font-family:inherit;
  }
  .dr-btn:hover { opacity:.88; transform:translateY(-1px); }
  .dr-btn-primary { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 4px 14px rgba(99,102,241,.35); }
  .dr-btn-teal    { background:linear-gradient(135deg,#14b8a6,#06b6d4); color:#fff; box-shadow:0 4px 14px rgba(20,184,166,.35); }
  .dr-btn-outline { background:#fff; color:#374151; border:1.5px solid #e5e7eb; }
  .dr-btn-ghost   { background:#f3f4f6; color:#374151; border:1.5px solid #e5e7eb; }
  .dr-btn-danger  { background:#fef2f2; color:#dc2626; border:1.5px solid #fecaca; }
  .dr-btn-sm      { height:30px; padding:0 12px; font-size:11px; border-radius:8px; }
  .dr-btn-icon    { width:30px; height:30px; padding:0; border-radius:8px; justify-content:center; }

  /* Table */
  .dr-table { width:100%; border-collapse:collapse; }
  .dr-table thead tr { border-bottom:2px solid #f1f5f9; }
  .dr-table th { text-align:left; padding:10px 14px; font-size:10px; font-weight:700; color:#9ca3af; letter-spacing:.06em; text-transform:uppercase; white-space:nowrap; }
  .dr-table td { padding:12px 14px; font-size:12px; color:#374151; border-bottom:1px solid #f8fafc; vertical-align:middle; }
  .dr-table tbody tr:hover td { background:#f8faff; }
  .dr-table tbody tr:last-child td { border-bottom:none; }

  /* Avatar */
  .dr-av { width:32px; height:32px; border-radius:9px; color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; }

  /* Stat card */
  .dr-stat-card { border-radius:16px; padding:18px 20px; color:#fff; position:relative; overflow:hidden; cursor:default; transition:transform .2s,box-shadow .2s; }
  .dr-stat-card:hover { transform:translateY(-3px); }
  .dr-stat-card::after { content:''; position:absolute; width:80px; height:80px; border-radius:50%; background:rgba(255,255,255,.12); bottom:-20px; right:-20px; }

  /* Chips */
  .dr-chip { display:inline-flex; align-items:center; padding:3px 9px; border-radius:20px; font-size:9px; font-weight:700; white-space:nowrap; }
  .dr-chip-scheduled { background:#eff6ff; color:#2563eb; }
  .dr-chip-completed { background:#dcfce7; color:#166534; }
  .dr-chip-cancelled { background:#fef2f2; color:#dc2626; }
  .dr-chip-onleave   { background:#fef3c7; color:#d97706; }

  /* Status select in table */
  .dr-status-sel { height:28px; border:1.5px solid #e5e7eb; border-radius:8px; padding:0 8px; font-size:11px; font-family:inherit; outline:none; cursor:pointer; background:#fff; color:#374151; }
  .dr-status-sel:focus { border-color:#6366f1; }

  /* Modal */
  .dr-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; backdrop-filter:blur(3px); }
  .dr-modal { background:#fff; border-radius:20px; width:100%; max-width:520px; box-shadow:0 24px 60px rgba(0,0,0,.2); animation:fadeUp .25s ease both; overflow:hidden; }
  .dr-modal-lg { max-width:700px; }
  .dr-modal-header { padding:18px 22px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; }
  .dr-modal-body { padding:20px 22px; max-height:70vh; overflow-y:auto; display:flex; flex-direction:column; gap:14px; }
  .dr-modal-footer { padding:14px 22px; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:10px; }

  /* Form */
  .dr-form-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .dr-form-group { display:flex; flex-direction:column; gap:5px; }
  .dr-form-label { font-size:11px; font-weight:600; color:#374151; }

  /* Weekly grid */
  .wg-cell {
    width:42px; height:38px; border-radius:9px; font-size:13px; font-weight:700;
    cursor:pointer; border:none; transition:transform .12s,box-shadow .12s;
    display:flex; align-items:center; justify-content:center; user-select:none;
  }
  .wg-cell:hover { transform:scale(1.12); box-shadow:0 4px 12px rgba(0,0,0,.18); }
  .wg-cell:active { transform:scale(.95); }

  /* Penalty card */
  .pe-rule { padding:12px 0; border-bottom:1px solid #f3f4f6; }
  .pe-rule:last-child { border-bottom:none; }

  /* 3 Lates banner */
  .lates-banner {
    background:linear-gradient(135deg,#fff7ed,#fff3e0);
    border:1.5px solid #fed7aa; border-radius:12px;
    padding:12px 18px; display:flex; align-items:center; gap:10px;
    font-size:13px; font-weight:700; color:#9a3412;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { height:4px; width:4px; }
  ::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
`;

// ─── Default weekly data ───────────────────────────────────────────────────────
const makeDefaultWeekly = (employees: any[]): WeeklyEntry[] =>
  employees.slice(0, 8).map(emp => ({
    empId:      emp.id || emp.empId || '',
    empName:    emp.name || '',
    department: emp.department || '',
    days: { mon:'M', tue:'M', wed:'M', thu:'E', fri:'M', sat:'M' } as Record<string, ShiftCode>,
  }));

// ══════════════════════════════════════════════════════════════════════════════
const DutyRosterPage: React.FC = () => {
  const navigate                                           = useNavigate();
  const { user, activeRole }                                           = useAuth();
  const { dutyRosterData, dutyRosterTemplates, employees } = useData();

  // ── Safe defaults — prevent white page if context returns undefined ──
  const safeRosters   = Array.isArray(dutyRosterData)      ? dutyRosterData      : [];
  const safeTemplates = Array.isArray(dutyRosterTemplates)  ? dutyRosterTemplates : [];
  const safeEmployees = Array.isArray(employees)            ? employees           : [];

  // ── State — all logic unchanged ──
  const [rosters,            setRosters]            = useState<DutyRoster[]>(safeRosters);
  const [templates,          setTemplates]          = useState<DutyRosterTemplate[]>(safeTemplates);
  const [filteredRosters,    setFilteredRosters]    = useState<DutyRoster[]>(safeRosters);
  const [selectedDate,       setSelectedDate]       = useState(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedShift,      setSelectedShift]      = useState('All');
  const [isAddDialogOpen,    setIsAddDialogOpen]    = useState(false);
  const [isTemplateDialog,   setIsTemplateDialog]   = useState(false);

  // Weekly grid state
  const visibleEmployees = getVisibleEmployees(user, activeRole, safeEmployees);
  const [weeklyData, setWeeklyData] = useState<WeeklyEntry[]>(() => makeDefaultWeekly(visibleEmployees));

  // View toggle: 'roster' | 'weekly'
  const [view, setView] = useState<'roster' | 'weekly'>('weekly');

  // Filter effect
  useEffect(() => {
    let f = rosters;
    if (selectedDate)                f = f.filter(r => r.date === selectedDate);
    if (selectedDepartment !== 'All') f = f.filter(r => r.department === selectedDepartment);
    if (selectedShift !== 'All')      f = f.filter(r => r.shift === selectedShift);
    setFilteredRosters(f);
  }, [rosters, selectedDate, selectedDepartment, selectedShift]);

  // Sync weekly data when employees change
  useEffect(() => {
    if (weeklyData.length === 0 && visibleEmployees.length > 0) {
      setWeeklyData(makeDefaultWeekly(visibleEmployees));
    }
  }, [visibleEmployees]);

  // Handlers
  const handleAddRoster = (newRoster: Omit<DutyRoster, 'id' | 'assignedBy' | 'assignedAt'>) => {
    const roster: DutyRoster = {
      ...newRoster,
      id:         `DR${Date.now()}`,
      assignedBy: user?.name || 'System',
      assignedAt: new Date().toISOString(),
    };
    setRosters([...rosters, roster]);
    setIsAddDialogOpen(false);
  };

  const handleUpdateStatus = (id: string, status: DutyRoster['status']) =>
    setRosters(rosters.map(r => r.id === id ? { ...r, status } : r));

  const handleDeleteRoster = (id: string) =>
    setRosters(rosters.filter(r => r.id !== id));

  // Weekly grid: click to cycle shift
  const handleCellClick = (empIdx: number, day: string) => {
    setWeeklyData(prev => {
      const updated = [...prev];
      updated[empIdx] = {
        ...updated[empIdx],
        days: { ...updated[empIdx].days, [day]: cycleNext(updated[empIdx].days[day]) },
      };
      return updated;
    });
  };

  const departments = ['All', ...Array.from(new Set(rosters.map(r => r.department).filter(Boolean)))];
  const shifts      = ['All', ...Array.from(new Set(rosters.map(r => r.shift).filter(Boolean)))];
  const hasFilters  = selectedDepartment !== 'All' || selectedShift !== 'All';

  // Stats
  const totalEntries = rosters.length;
  const scheduled    = rosters.filter(r => r.status === 'Scheduled').length;
  const completed    = rosters.filter(r => r.status === 'Completed').length;
  const onLeave      = rosters.filter(r => r.status === 'On Leave').length;

  const STATS = [
    { label:'Total Entries', val:totalEntries, sub:'All roster entries', icon:'', grad:'linear-gradient(135deg,#6366f1,#8b5cf6)', glow:'rgba(99,102,241,.3)' },
    { label:'Scheduled',     val:scheduled,    sub:'Upcoming duties',    icon:'', grad:'linear-gradient(135deg,#3b82f6,#06b6d4)', glow:'rgba(59,130,246,.3)' },
    { label:'Completed',     val:completed,    sub:'Duties done',        icon:'', grad:'linear-gradient(135deg,#10b981,#34d399)', glow:'rgba(16,185,129,.3)' },
    { label:'On Leave',      val:onLeave,      sub:'Staff on leave',     icon:'', grad:'linear-gradient(135deg,#f97316,#fbbf24)', glow:'rgba(249,115,22,.3)'  },
  ];

  // Weekly summary counts
  const shiftCount = (code: ShiftCode) =>
    weeklyData.reduce((s, e) => s + Object.values(e.days).filter(d => d === code).length, 0);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="dr-page">

        {/* ── Top Header ── */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{margin:0,fontSize:26,fontWeight:800,color:'#1e1b4b'}}>Duty Roster</h1>
            <p style={{margin:'4px 0 0',fontSize:12,color:'#9ca3af'}}>
              Manage employee duty assignments &amp; shift cycles &nbsp;·&nbsp;
              <span style={{color:'#6366f1',fontWeight:600}}>{filteredRosters.length} entries</span>
            </p>
          </div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {/* View toggle */}
            <div style={{display:'flex',background:'#f3f4f6',borderRadius:10,padding:3,gap:2}}>
              {(['weekly','roster'] as const).map(v => (
                <button key={v} onClick={()=>setView(v)} style={{
                  height:32,padding:'0 14px',borderRadius:8,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',
                  background:view===v?'#fff':'transparent',
                  color:view===v?'#6366f1':'#9ca3af',
                  boxShadow:view===v?'0 2px 8px rgba(0,0,0,.1)':'none',
                  transition:'all .2s',
                }}>
                  {v==='weekly' ? ' Weekly Grid' : ' Roster List'}
                </button>
              ))}
            </div>
            <button className="dr-btn dr-btn-outline" onClick={()=>setIsTemplateDialog(true)}>
              <Filter size={13}/> Templates
            </button>
            <button className="dr-btn dr-btn-primary" onClick={()=>setIsAddDialogOpen(true)}>
              <Plus size={13}/> Add Entry
            </button>
          </div>
        </div>

        {/* ── Two-column layout: Penalty Engine + Weekly/Roster ── */}
        <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:18,alignItems:'start'}}>

          {/* ══ LEFT: Penalty Engine ══════════════════════════════════════ */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>

            {/* Penalty Engine Card */}
            <div style={{
              borderRadius:18,overflow:'hidden',
              boxShadow:'0 8px 28px rgba(236,72,153,.25)',
              animation:'fadeUp .3s ease both',
            }}>
              {/* Header gradient */}
              <div style={{background:'linear-gradient(135deg,#ec4899,#f97316)',padding:'16px 18px'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                  <span style={{fontSize:18}}></span>
                  <span style={{fontSize:15,fontWeight:800,color:'#fff'}}>Penalty Engine</span>
                </div>
                <div style={{fontSize:10,color:'rgba(255,255,255,.75)'}}>Backend rule book · runs nightly</div>
              </div>

              <div style={{background:'#fff',padding:'14px 16px'}}>
                {/* 3 Lates banner */}
                <div className="lates-banner" style={{marginBottom:14}}>
                  <span style={{fontSize:18}}></span>
                  <span>3 Lates = 1 Day Cut</span>
                </div>

                {/* Rules */}
                {PENALTY_RULES.map((rule, i) => (
                  <div key={i} className="pe-rule">
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
                      <span style={{fontSize:14}}>{rule.icon}</span>
                      <span style={{fontSize:12,fontWeight:700,color:'#1e1b4b'}}>{rule.title}</span>
                    </div>
                    <div style={{fontSize:10,color:'#9ca3af',marginBottom:5,paddingLeft:21}}>{rule.condition}</div>
                    <div style={{fontSize:12,fontWeight:700,color:rule.color,paddingLeft:21}}>{rule.penalty}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shift Legend */}
            <div className="dr-card" style={{padding:'14px 16px'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:10,textTransform:'uppercase',letterSpacing:'.06em'}}>Shift Legend</div>
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                {(Object.keys(SHIFT_META) as ShiftCode[]).map(k => (
                  <div key={k} style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:28,height:24,borderRadius:6,background:SHIFT_META[k].bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:SHIFT_META[k].color}}>
                      {k}
                    </div>
                    <span style={{fontSize:11,color:'#6b7280'}}>
                      <b style={{color:SHIFT_META[k].dot}}>●</b>&nbsp;{SHIFT_META[k].label}
                    </span>
                  </div>
                ))}
                <div style={{marginTop:6,padding:'8px 10px',background:'#f8fafc',borderRadius:8,fontSize:10,color:'#9ca3af',lineHeight:1.6}}>
                   Click any cell to cycle:<br/>
                  <span style={{fontWeight:600,color:'#374151'}}>M → E → N → Off → M</span>
                </div>
              </div>
            </div>

            {/* Attendance Link Card */}
            <div className="dr-card" style={{padding:'14px 16px',background:'linear-gradient(135deg,#eff6ff,#f0f9ff)',border:'1.5px solid #bfdbfe'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                <Link2 size={14} color="#3b82f6"/>
                <span style={{fontSize:12,fontWeight:700,color:'#1e40af'}}>Linked · Attendance</span>
              </div>
              <div style={{fontSize:10,color:'#6b7280',lineHeight:1.6,marginBottom:10}}>
                Duty roster shifts are synced with the Attendance module. Mark attendance based on assigned shift automatically.
              </div>
              <button
                className="dr-btn dr-btn-sm"
                style={{background:'linear-gradient(135deg,#3b82f6,#6366f1)',color:'#fff',border:'none',width:'100%',justifyContent:'center',height:32,fontSize:11}}
                onClick={() => {
                  // Auto-detect attendance route from current URL structure
                  const base = window.location.pathname.split('/').slice(0, 2).join('/');
                  const routes = ['/attendance', `${base}/attendance`, '/hr/attendance', '/dashboard/attendance'];
                  try {
                    navigate('/attendance');
                  } catch {
                    window.location.href = routes[0];
                  }
                }}
              >
                <Link2 size={11}/> Go to Attendance
              </button>
            </div>

            {/* Weekly shift summary */}
            <div className="dr-card" style={{padding:'14px 16px'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:10,textTransform:'uppercase',letterSpacing:'.06em'}}>This Week</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {(Object.keys(SHIFT_META) as ShiftCode[]).map(k => (
                  <div key={k} style={{background:SHIFT_META[k].bg,borderRadius:10,padding:'10px 12px',textAlign:'center'}}>
                    <div style={{fontSize:20,fontWeight:800,color:SHIFT_META[k].color}}>{shiftCount(k)}</div>
                    <div style={{fontSize:10,color:SHIFT_META[k].color,fontWeight:600}}>{SHIFT_META[k].label}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ══ RIGHT: Main Content ═══════════════════════════════════════ */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>

            {/* Stat Cards */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
              {STATS.map((c,i) => (
                <div key={i} className="dr-stat-card" style={{background:c.grad,boxShadow:`0 6px 20px ${c.glow}`,animationDelay:`${i*.07}s`}}>
                  <div style={{fontSize:22,marginBottom:8}}>{c.icon}</div>
                  <div style={{fontSize:28,fontWeight:800,color:'#fff',lineHeight:1}}>{c.val}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.85)',marginTop:5}}>{c.label}</div>
                  <div style={{fontSize:9,color:'rgba(255,255,255,.6)',marginTop:2}}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* ── WEEKLY GRID VIEW ── */}
            {view === 'weekly' && (
              <div className="dr-card" style={{padding:0,overflow:'hidden'}}>
                {/* Grid header */}
                <div style={{
                  background:'linear-gradient(135deg,#06b6d4,#3b82f6)',
                  padding:'14px 20px',display:'flex',alignItems:'center',gap:10
                }}>
                  <span style={{fontSize:16}}></span>
                  <div>
                    <div style={{fontSize:14,fontWeight:800,color:'#fff'}}>Duty Roster · Is Hafte</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,.75)'}}>Click on any cell to change shift cycle</div>
                  </div>
                </div>

                <div style={{overflowX:'auto',padding:'0 0 4px'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',minWidth:520}}>
                    {/* Column headers */}
                    <thead>
                      <tr style={{background:'#f8fafc'}}>
                        <th style={{padding:'12px 20px',textAlign:'left',fontSize:10,fontWeight:700,color:'#9ca3af',letterSpacing:'.06em',width:160}}>STAFF</th>
                        {DAYS.map(d => (
                          <th key={d.key} style={{padding:'12px 8px',textAlign:'center',fontSize:10,fontWeight:700,color:'#9ca3af',letterSpacing:'.06em',width:54}}>
                            {d.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyData.map((entry, empIdx) => (
                        <tr key={entry.empId} style={{borderBottom:'1px solid #f1f5f9'}}>
                          {/* Employee name */}
                          <td style={{padding:'10px 20px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:9}}>
                              <div className="dr-av" style={{background:avGrad(entry.empName),width:30,height:30,fontSize:10}}>
                                {getIni(entry.empName)}
                              </div>
                              <div>
                                <div style={{fontSize:12,fontWeight:700,color:'#1e1b4b'}}>{entry.empName.split(' ')[0]}</div>
                                <div style={{fontSize:9,color:'#9ca3af'}}>{entry.department.slice(0,12)}</div>
                              </div>
                            </div>
                          </td>
                          {/* Shift cells */}
                          {DAYS.map(d => {
                            const code = entry.days[d.key];
                            const meta = SHIFT_META[code];
                            return (
                              <td key={d.key} style={{padding:'8px',textAlign:'center'}}>
                                <button
                                  className="wg-cell"
                                  style={{background:meta.bg,color:meta.color,margin:'0 auto'}}
                                  onClick={() => handleCellClick(empIdx, d.key)}
                                  title={`Click to cycle: ${meta.label} → ${SHIFT_META[cycleNext(code)].label}`}
                                >
                                  {code}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── ROSTER LIST VIEW ── */}
            {view === 'roster' && (
              <>
                {/* Filters */}
                <div className="dr-card" style={{padding:'14px 18px'}}>
                  <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                    <div style={{display:'flex',alignItems:'center',gap:7,background:'#f8fafc',border:'1.5px solid #e5e7eb',borderRadius:10,padding:'0 12px',height:38}}>
                      <Calendar size={13} color="#9ca3af"/>
                      <input type="date" style={{border:'none',background:'transparent',outline:'none',fontSize:12,color:'#374151',fontFamily:'inherit',cursor:'pointer'}}
                        value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:7,background:'#f8fafc',border:'1.5px solid #e5e7eb',borderRadius:10,padding:'0 12px',height:38}}>
                      <User size={13} color="#9ca3af"/>
                      <select style={{border:'none',background:'transparent',outline:'none',fontSize:12,color:'#374151',fontFamily:'inherit',cursor:'pointer',minWidth:130}}
                        value={selectedDepartment} onChange={e=>setSelectedDepartment(e.target.value)}>
                        {departments.map(d=><option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:7,background:'#f8fafc',border:'1.5px solid #e5e7eb',borderRadius:10,padding:'0 12px',height:38}}>
                      <Clock size={13} color="#9ca3af"/>
                      <select style={{border:'none',background:'transparent',outline:'none',fontSize:12,color:'#374151',fontFamily:'inherit',cursor:'pointer',minWidth:110}}
                        value={selectedShift} onChange={e=>setSelectedShift(e.target.value)}>
                        {shifts.map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {hasFilters && (
                      <button className="dr-btn dr-btn-danger" style={{height:34,fontSize:11}}
                        onClick={()=>{setSelectedDepartment('All');setSelectedShift('All');}}>
                        Clear 
                      </button>
                    )}
                    <span style={{marginLeft:'auto',fontSize:11,color:'#9ca3af'}}>
                      {filteredRosters.length} result{filteredRosters.length!==1?'s':''}
                    </span>
                  </div>
                </div>

                {/* Roster Table */}
                <div className="dr-card">
                  <div style={{overflowX:'auto'}}>
                    <table className="dr-table">
                      <thead>
                        <tr>
                          {['Employee','Department','Date','Shift','Time','Location','Status','Actions'].map(h=>(
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRosters.length===0 ? (
                          <tr><td colSpan={8} style={{textAlign:'center',padding:'48px 20px'}}>
                            <div style={{fontSize:28,marginBottom:8}}></div>
                            <div style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:4}}>No roster entries found</div>
                            <div style={{fontSize:11,color:'#9ca3af'}}>Try adjusting your filters or add a new entry</div>
                          </td></tr>
                        ) : filteredRosters.map(r=>(
                          <tr key={r.id}>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:10}}>
                                <div className="dr-av" style={{background:avGrad(r.empName)}}>{getIni(r.empName)}</div>
                                <div>
                                  <div style={{fontWeight:700,color:'#1e1b4b',fontSize:12}}>{r.empName}</div>
                                  <div style={{fontSize:9,color:'#9ca3af',marginTop:1}}>{r.id}</div>
                                </div>
                              </div>
                            </td>
                            <td><span style={{fontSize:11,background:'#f3f4f6',color:'#6b7280',padding:'3px 9px',borderRadius:20,fontWeight:500}}>{r.department}</span></td>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:5}}>
                                <Calendar size={11} color="#9ca3af"/>
                                <span style={{fontFamily:'monospace',fontSize:11,color:'#6b7280'}}>
                                  {new Date(r.date).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})}
                                </span>
                              </div>
                            </td>
                            <td><span style={{fontSize:11,color:'#6366f1',background:'#eff6ff',padding:'3px 9px',borderRadius:20,fontWeight:600}}>{r.shift}</span></td>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:5}}>
                                <Clock size={11} color="#9ca3af"/>
                                <span style={{fontFamily:'monospace',fontSize:11,color:'#374151'}}>{r.startTime} – {r.endTime}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:5}}>
                                <MapPin size={11} color="#9ca3af"/>
                                <span style={{fontSize:11,color:'#374151'}}>{r.location}</span>
                              </div>
                            </td>
                            <td><span className={chipClass(r.status)}>{r.status}</span></td>
                            <td>
                              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                                <select className="dr-status-sel" value={r.status} onChange={e=>handleUpdateStatus(r.id,e.target.value as DutyRoster['status'])}>
                                  <option value="Scheduled">Scheduled</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled</option>
                                  <option value="On Leave">On Leave</option>
                                </select>
                                <button className="dr-btn dr-btn-danger dr-btn-sm dr-btn-icon" onClick={()=>handleDeleteRoster(r.id)} title="Delete">
                                  <Trash2 size={12}/>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>

        {/* ══ Add Roster Modal ══════════════════════════════════════════════ */}
        {isAddDialogOpen && (
          <div className="dr-modal-overlay" onClick={()=>setIsAddDialogOpen(false)}>
            <div className="dr-modal" onClick={e=>e.stopPropagation()}>
              <div className="dr-modal-header" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:'#fff'}}>Add Roster Entry</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>Assign duty to an employee</div>
                </div>
                <button className="dr-btn dr-btn-sm" style={{background:'rgba(255,255,255,.2)',color:'#fff',border:'none'}} onClick={()=>setIsAddDialogOpen(false)}></button>
              </div>
              <AddRosterForm employees={visibleEmployees} onSubmit={handleAddRoster} onCancel={()=>setIsAddDialogOpen(false)}/>
            </div>
          </div>
        )}

        {/* ══ Templates Modal ═══════════════════════════════════════════════ */}
        {isTemplateDialog && (
          <div className="dr-modal-overlay" onClick={()=>setIsTemplateDialog(false)}>
            <div className="dr-modal dr-modal-lg" onClick={e=>e.stopPropagation()}>
              <div className="dr-modal-header" style={{background:'linear-gradient(135deg,#14b8a6,#06b6d4)'}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:'#fff'}}>Duty Roster Templates</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>{templates.length} templates available</div>
                </div>
                <button className="dr-btn dr-btn-sm" style={{background:'rgba(255,255,255,.2)',color:'#fff',border:'none'}} onClick={()=>setIsTemplateDialog(false)}></button>
              </div>
              <div style={{padding:22,display:'flex',flexDirection:'column',gap:14,maxHeight:'70vh',overflowY:'auto'}}>
                {templates.map(tmpl=>(
                  <div key={tmpl.id} style={{border:'1.5px solid #e5e7eb',borderRadius:14,overflow:'hidden'}}>
                    <div style={{padding:'12px 16px',background:'#f8fafc',borderBottom:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:'#1e1b4b'}}>{tmpl.name}</div>
                        <div style={{fontSize:10,color:'#9ca3af',marginTop:2}}>Department: {tmpl.department}</div>
                      </div>
                      <span style={{fontSize:10,background:'#eff6ff',color:'#2563eb',padding:'3px 10px',borderRadius:20,fontWeight:600}}>
                        {tmpl.shifts?.length||0} shifts
                      </span>
                    </div>
                    <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:8}}>
                      {tmpl.shifts?.map((s:any,idx:number)=>(
                        <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#f9fafb',borderRadius:10,border:'1px solid #f1f5f9'}}>
                          <div>
                            <span style={{fontSize:12,fontWeight:600,color:'#1e1b4b'}}>{s.shiftName}</span>
                            <span style={{fontSize:11,color:'#9ca3af',marginLeft:10,fontFamily:'monospace'}}>{s.startTime} – {s.endTime}</span>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:10,color:'#6b7280'}}>Mandatory staff: <strong>{s.requiredStaff}</strong></span>
                            <span style={{fontSize:10,background:'#eff6ff',color:'#2563eb',padding:'2px 8px',borderRadius:20,fontWeight:600}}>{s.location}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// AddRosterForm (logic unchanged, styled)
// ══════════════════════════════════════════════════════════════════════════════
interface AddRosterFormProps {
  employees: any[];
  onSubmit: (r: Omit<DutyRoster, 'id'|'assignedBy'|'assignedAt'>) => void;
  onCancel: () => void;
}

const AddRosterForm: React.FC<AddRosterFormProps> = ({ employees, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    empId:'', empName:'', department:'', shift:'',
    date: new Date().toISOString().split('T')[0],
    startTime:'09:00', endTime:'18:00',
    location:'Head Office', status:'Scheduled' as DutyRoster['status'], notes:'',
  });

  const handleEmployeeChange = (empId: string) => {
    const emp = employees.find(e=>e.id===empId);
    if (emp) setFormData({...formData, empId, empName:emp.name, department:emp.department});
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(formData); };
  const set = (k: string, v: string) => setFormData(p=>({...p,[k]:v}));

  return (
    <form onSubmit={handleSubmit}>
      <div className="dr-modal-body">
        <div className="dr-form-group">
          <label className="dr-form-label">Employee</label>
          <select className="dr-input dr-select" value={formData.empId} onChange={e=>handleEmployeeChange(e.target.value)}>
            <option value="">Select employee…</option>
            {employees.map(e=><option key={e.id} value={e.id}>{e.name} — {e.department}</option>)}
          </select>
        </div>

        {formData.empName && (
          <div style={{display:'flex',alignItems:'center',gap:10,background:'#f8fafc',borderRadius:10,padding:'10px 14px',border:'1.5px solid #e5e7eb'}}>
            <div className="dr-av" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',width:36,height:36,fontSize:12}}>
              {getIni(formData.empName)}
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'#1e1b4b'}}>{formData.empName}</div>
              <div style={{fontSize:10,color:'#9ca3af'}}>{formData.department}</div>
            </div>
          </div>
        )}

        <div className="dr-form-row">
          <div className="dr-form-group">
            <label className="dr-form-label">Shift</label>
            <select className="dr-input dr-select" value={formData.shift} onChange={e=>set('shift',e.target.value)}>
              <option value="">Select shift…</option>
              <option value="Morning Shift">Morning Shift</option>
              <option value="Evening Shift">Evening Shift</option>
              <option value="Night Shift">Night Shift</option>
            </select>
          </div>
          <div className="dr-form-group">
            <label className="dr-form-label">Date</label>
            <input className="dr-input" type="date" value={formData.date} onChange={e=>set('date',e.target.value)}/>
          </div>
        </div>

        <div className="dr-form-row">
          <div className="dr-form-group">
            <label className="dr-form-label">Start Time</label>
            <input className="dr-input" type="time" value={formData.startTime} onChange={e=>set('startTime',e.target.value)}/>
          </div>
          <div className="dr-form-group">
            <label className="dr-form-label">End Time</label>
            <input className="dr-input" type="time" value={formData.endTime} onChange={e=>set('endTime',e.target.value)}/>
          </div>
        </div>

        <div className="dr-form-group">
          <label className="dr-form-label">Location</label>
          <select className="dr-input dr-select" value={formData.location} onChange={e=>set('location',e.target.value)}>
            <option value="Head Office">Head Office</option>
            <option value="Branch B">Branch B</option>
          </select>
        </div>

        <div className="dr-form-group">
          <label className="dr-form-label">Notes (optional)</label>
          <textarea className="dr-input dr-textarea" value={formData.notes}
            onChange={e=>set('notes',e.target.value)} placeholder="Any additional notes…"/>
        </div>
      </div>

      <div className="dr-modal-footer">
        <button type="button" className="dr-btn dr-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="dr-btn dr-btn-primary">Add Roster Entry</button>
      </div>
    </form>
  );
};

export default DutyRosterPage;
