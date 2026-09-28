import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { formatPKR } from '../services/api';
import { Plus, Calendar as CalendarIcon, Filter, TrendingUp, Award, Users, DollarSign, ChevronUp, History, Briefcase, Clock } from 'lucide-react';
import Modal from '../components/common/Modal';
import { useToastContext } from '../context/ToastContext';

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
  .pr-page { font-family:'Segoe UI',system-ui,-apple-system,sans-serif; padding:22px 28px; background:#f0f2f8; min-height:100vh; }
  .pr-card { background:#fff; border-radius:16px; padding:20px; box-shadow:0 1px 10px rgba(0,0,0,.07); animation:fadeUp .35s ease both; }
  .pr-input {
    height:38px; border:1.5px solid #e5e7eb; border-radius:10px; padding:0 12px;
    font-size:12px; color:#374151; background:#fff; outline:none;
    transition:border .15s,box-shadow .15s; font-family:inherit; width:100%;
  }
  .pr-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
  .pr-input:disabled { background:#f8fafc; color:#9ca3af; cursor:not-allowed; }
  .pr-textarea { resize:vertical; height:80px; padding:10px 12px; line-height:1.5; }
  .pr-select { cursor:pointer; }
  .pr-btn {
    height:38px; border:none; border-radius:10px; padding:0 18px; font-size:12px;
    font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px;
    transition:opacity .15s,transform .15s; font-family:inherit;
  }
  .pr-btn:hover { opacity:.88; transform:translateY(-1px); }
  .pr-btn-primary { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 4px 14px rgba(99,102,241,.35); }
  .pr-btn-ghost   { background:#f3f4f6; color:#374151; border:1.5px solid #e5e7eb; }
  .pr-btn-danger  { background:#fef2f2; color:#dc2626; border:1.5px solid #fecaca; }
  .pr-table { width:100%; border-collapse:collapse; }
  .pr-table thead tr { border-bottom:2px solid #f1f5f9; }
  .pr-table th { text-align:left; padding:10px 14px; font-size:10px; font-weight:700; color:#9ca3af; letter-spacing:.06em; text-transform:uppercase; white-space:nowrap; }
  .pr-table td { padding:13px 14px; font-size:12px; color:#374151; border-bottom:1px solid #f8fafc; vertical-align:middle; }
  .pr-table tbody tr { transition:background .1s; }
  .pr-table tbody tr:hover td { background:#f8faff; }
  .pr-table tbody tr:last-child td { border-bottom:none; }
  .pr-av { width:34px; height:34px; border-radius:10px; color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; }
  .pr-chip { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:9px; font-weight:700; white-space:nowrap; }
  .pr-form-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .pr-form-group { display:flex; flex-direction:column; gap:5px; }
  .pr-form-label { font-size:11px; font-weight:600; color:#374151; }
  .pr-stat-card { border-radius:14px; padding:16px 18px; color:#fff; position:relative; overflow:hidden; }
  .pr-stat-card::after { content:''; position:absolute; width:70px; height:70px; border-radius:50%; background:rgba(255,255,255,.08); bottom:-15px; right:-15px; }
  ::-webkit-scrollbar { height:4px; width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
`;

const AV_GRADS = [
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#ec4899,#f9a8d4)',
  'linear-gradient(135deg,#f97316,#fbbf24)',
  'linear-gradient(135deg,#14b8a6,#06b6d4)',
  'linear-gradient(135deg,#10b981,#34d399)',
  'linear-gradient(135deg,#3b82f6,#60a5fa)',
];
const avGrad = (name: string) => AV_GRADS[(name?.charCodeAt(0) || 0) % AV_GRADS.length];
const getInitials = (name: string) => (name || '').split(' ').filter(Boolean).map((n:string) => n[0]).join('').slice(0,2).toUpperCase();

const salaryDelta = (oldS: number, newS: number) => {
  const diff = newS - oldS;
  const pct  = oldS > 0 ? Math.round((diff / oldS) * 100) : 0;
  return { diff, pct };
};

// ══════════════════════════════════════════════════════════════════════════════
export default function Promotions() {
  const { promotions, setPromotions, employees, setEmployees } = useData();
  const [modal, setModal] = useState(false);
  const { showToast } = useToastContext();

  // Job History state
  const [jobHistory, setJobHistory] = useState([
    {
      id: 'JH001',
      empId: 'EMP001',
      empName: 'John Doe',
      changeType: 'promotion',
      oldDesignation: 'Junior Developer',
      newDesignation: 'Senior Developer',
      oldSalary: 50000,
      newSalary: 75000,
      changeDate: '2024-01-15',
      effectiveDate: '2024-02-01',
      approvedBy: 'Super Admin',
      notes: 'Excellent performance in Q4 projects'
    },
    {
      id: 'JH002',
      empId: 'EMP002',
      empName: 'Jane Smith',
      changeType: 'promotion',
      oldDesignation: 'Marketing Executive',
      newDesignation: 'Marketing Manager',
      oldSalary: 45000,
      newSalary: 65000,
      changeDate: '2024-01-20',
      effectiveDate: '2024-02-01',
      approvedBy: 'Super Admin',
      notes: 'Led successful campaign launch'
    },
    {
      id: 'JH003',
      empId: 'EMP001',
      empName: 'John Doe',
      changeType: 'salary_adjustment',
      oldDesignation: 'Senior Developer',
      newDesignation: 'Senior Developer',
      oldSalary: 75000,
      newSalary: 80000,
      changeDate: '2024-02-15',
      effectiveDate: '2024-03-01',
      approvedBy: 'HR Manager',
      notes: 'Annual salary review'
    }
  ]);

  // Modal form states — unchanged
  const [empId,     setEmpId]     = useState('EMP001');
  const [promoDate, setPromoDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDesig,  setNewDesig]  = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [notes,     setNotes]     = useState('');

  // Filter states — unchanged
  const [dateFilter,  setDateFilter]  = useState('');
  const [desigFilter, setDesigFilter] = useState('');

  const designationsList = [
    "Junior Developer","Senior Developer","Lead Developer",
    "Marketing Executive","Marketing Manager","HR Specialist",
  ];

  const emp = employees.find((e: any) => e.id === empId);

  // Filter logic — unchanged
  const filteredPromotions = promotions.filter((p: any) => {
    const matchesDate  = dateFilter  ? p.date === dateFilter           : true;
    const matchesDesig = desigFilter ? p.newDesignation === desigFilter : true;
    return matchesDate && matchesDesig;
  });

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewSalary(e.target.value.replace(/\D/g, ''));
  };

  // savePromo — logic unchanged
  const savePromo = () => {
    if (!newDesig || !newSalary) { showToast('Please fill all mandatory fields'); return; }
    const nSalary = parseInt(newSalary);
    const newRecord = {
      id: 'PR' + String(promotions.length + 1).padStart(3, '0'),
      empId,
      empName:        emp?.name || '',
      oldDesignation: emp?.designation || '',
      newDesignation: newDesig,
      oldSalary:      emp?.salary.basic || 0,
      newSalary:      nSalary,
      date:           promoDate,
      notes,
      approvedBy:     'Super Admin',
    };
    setPromotions((prev: any) => [...prev, newRecord]);

    // Auto-insert into job history (employee_job_history table)
    const historyRecord = {
      id: 'JH' + String(jobHistory.length + 1).padStart(3, '0'),
      empId,
      empName: emp?.name || '',
      changeType: 'promotion',
      oldDesignation: emp?.designation || '',
      newDesignation: newDesig,
      oldSalary: emp?.salary.basic || 0,
      newSalary: nSalary,
      changeDate: promoDate,
      effectiveDate: promoDate,
      approvedBy: 'Super Admin',
      notes: notes || 'Promotion recorded'
    };
    setJobHistory((prev: any) => [...prev, historyRecord]);

    if (setEmployees) {
      setEmployees((prevEmps: any) => prevEmps.map((e: any) =>
        e.id === empId ? { ...e, designation: newDesig, salary: { ...e.salary, basic: nSalary } } : e
      ));
    }
    showToast(`Promotion recorded for ${emp?.name}`);
    setModal(false);
    setNewDesig(''); setNewSalary(''); setNotes('');
  };

  // ── Summary stats ──
  const totalPromos  = promotions.length;
  const thisMonth    = promotions.filter((p: any) => p.date?.slice(0,7) === new Date().toISOString().slice(0,7)).length;
  const avgHike      = promotions.length
    ? Math.round(promotions.reduce((acc: number, p: any) => acc + (p.oldSalary > 0 ? ((p.newSalary - p.oldSalary) / p.oldSalary) * 100 : 0), 0) / promotions.length)
    : 0;
  const uniqueEmp    = new Set(promotions.map((p: any) => p.empId)).size;
  const hasFilters   = dateFilter || desigFilter;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="pr-page">

        {/* ── Page Header ── */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{margin:0,fontSize:26,fontWeight:800,color:'#1e1b4b'}}>Promotions</h1>
            <p style={{margin:'4px 0 0',fontSize:12,color:'#9ca3af'}}>
              Track employee promotions and career growth &nbsp;·&nbsp;
              <span style={{color:'#6366f1',fontWeight:600}}>{totalPromos} total records</span>
            </p>
          </div>
          <button className="pr-btn pr-btn-primary" onClick={() => setModal(true)}>
            <Plus size={13}/> Record Promotion
          </button>
        </div>

        {/* ── Summary Stat Cards ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:18}}>
          {[
            { label:'Total Promotions',  val:totalPromos, sub:'All time',        icon:<Award size={16} color="#fff"/>,      grad:'linear-gradient(135deg,#6366f1,#8b5cf6)', glow:'rgba(99,102,241,.3)' },
            { label:'This Month',        val:thisMonth,   sub:'Current month',   icon:<CalendarIcon size={16} color="#fff"/>,grad:'linear-gradient(135deg,#ec4899,#f43f5e)', glow:'rgba(236,72,153,.3)' },
            { label:'Avg Salary Hike',   val:`${avgHike}%`,sub:'Across all',    icon:<TrendingUp size={16} color="#fff"/>,   grad:'linear-gradient(135deg,#f97316,#fbbf24)', glow:'rgba(249,115,22,.3)' },
            { label:'Employees Promoted',val:uniqueEmp,   sub:'Unique employees',icon:<Users size={16} color="#fff"/>,       grad:'linear-gradient(135deg,#14b8a6,#06b6d4)', glow:'rgba(20,184,166,.3)' },
          ].map((c,i)=>(
            <div key={i} className="pr-stat-card" style={{background:c.grad,boxShadow:`0 8px 24px ${c.glow}`,animationDelay:`${i*.07}s`}}>
              <div style={{width:34,height:34,borderRadius:9,background:'rgba(255,255,255,.22)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10}}>
                {c.icon}
              </div>
              <div style={{fontSize:26,fontWeight:800,color:'#fff',lineHeight:1}}>{c.val}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.85)',marginTop:4}}>{c.label}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,.6)',marginTop:2}}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <div className="pr-card" style={{marginBottom:14,padding:'14px 18px'}}>
          <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:7,background:'#f8fafc',border:'1.5px solid #e5e7eb',borderRadius:10,padding:'0 12px',height:38,flex:'0 0 auto'}}>
              <CalendarIcon size={13} color="#9ca3af"/>
              <input
                type="date"
                style={{border:'none',background:'transparent',outline:'none',fontSize:12,color:'#374151',fontFamily:'inherit',cursor:'pointer'}}
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
              />
            </div>
            <div style={{display:'flex',alignItems:'center',gap:7,background:'#f8fafc',border:'1.5px solid #e5e7eb',borderRadius:10,padding:'0 12px',height:38}}>
              <Filter size={13} color="#9ca3af"/>
              <select
                style={{border:'none',background:'transparent',outline:'none',fontSize:12,color:'#374151',fontFamily:'inherit',cursor:'pointer',minWidth:170}}
                value={desigFilter}
                onChange={e => setDesigFilter(e.target.value)}
              >
                <option value="">All Designations</option>
                {designationsList.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {hasFilters && (
              <button className="pr-btn pr-btn-danger" style={{height:34,fontSize:11}} onClick={()=>{setDateFilter('');setDesigFilter('');}}>
                Clear 
              </button>
            )}
            <span style={{marginLeft:'auto',fontSize:11,color:'#9ca3af'}}>
              {filteredPromotions.length} record{filteredPromotions.length!==1?'s':''}{hasFilters?' (filtered)':''}
            </span>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="pr-card">
          <div style={{overflowX:'auto'}}>
            <table className="pr-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Old Designation</th>
                  <th>New Designation</th>
                  <th>Salary Before</th>
                  <th>Salary After</th>
                  <th>Hike</th>
                  <th>Date</th>
                  <th>Approved By</th>
                </tr>
              </thead>
              <tbody>
                {filteredPromotions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{textAlign:'center',padding:'48px 20px'}}>
                      <div style={{fontSize:28,marginBottom:8}}></div>
                      <div style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:4}}>No promotions found</div>
                      <div style={{fontSize:11,color:'#9ca3af'}}>{hasFilters ? 'Try adjusting your filters' : 'Record your first promotion to get started'}</div>
                    </td>
                  </tr>
                ) : filteredPromotions.map((p: any, i: number) => {
                  const { diff, pct } = salaryDelta(p.oldSalary, p.newSalary);
                  return (
                    <tr key={i}>
                      {/* Employee */}
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div className="pr-av" style={{background:avGrad(p.empName)}}>
                            {getInitials(p.empName)}
                          </div>
                          <div>
                            <div style={{fontWeight:700,color:'#1e1b4b',fontSize:12}}>{p.empName}</div>
                            <div style={{fontSize:9,color:'#9ca3af',marginTop:1}}>{p.empId}</div>
                          </div>
                        </div>
                      </td>

                      {/* Old Designation */}
                      <td>
                        <span style={{fontSize:11,color:'#6b7280',background:'#f3f4f6',padding:'3px 9px',borderRadius:20,fontWeight:500}}>
                          {p.oldDesignation}
                        </span>
                      </td>

                      {/* New Designation */}
                      <td>
                        <span style={{fontSize:11,color:'#6366f1',background:'#eff6ff',padding:'3px 9px',borderRadius:20,fontWeight:700,display:'inline-flex',alignItems:'center',gap:4}}>
                          <ChevronUp size={11}/> {p.newDesignation}
                        </span>
                      </td>

                      {/* Old Salary */}
                      <td>
                        <span style={{fontFamily:'monospace',fontSize:12,color:'#9ca3af'}}>{formatPKR(p.oldSalary)}</span>
                      </td>

                      {/* New Salary */}
                      <td>
                        <span style={{fontFamily:'monospace',fontSize:12,fontWeight:700,color:'#10b981'}}>{formatPKR(p.newSalary)}</span>
                      </td>

                      {/* Hike % */}
                      <td>
                        <span className="pr-chip" style={{background:'#dcfce7',color:'#166534'}}>
                          ↑ {pct}%
                        </span>
                      </td>

                      {/* Date */}
                      <td>
                        <span style={{fontFamily:'monospace',fontSize:11,color:'#6b7280',background:'#f8fafc',padding:'3px 8px',borderRadius:7}}>
                          {p.date}
                        </span>
                      </td>

                      {/* Approved By */}
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:20,height:20,borderRadius:6,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'#fff',fontWeight:700}}>
                            {getInitials(p.approvedBy)}
                          </div>
                          <span style={{fontSize:11,color:'#374151'}}>{p.approvedBy}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Job History Section ── */}
        <div className="pr-card" style={{marginTop:20}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
            <History size={18} color="#6366f1"/>
            <h2 style={{margin:0,fontSize:18,fontWeight:700,color:'#1e1b4b'}}>Employee Job History</h2>
            <span style={{fontSize:11,color:'#9ca3af',marginLeft:'auto'}}>{jobHistory.length} record{jobHistory.length!==1?'s':''}</span>
          </div>

          <div style={{overflowX:'auto'}}>
            <table className="pr-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Change Type</th>
                  <th>Old Position</th>
                  <th>New Position</th>
                  <th>Salary Change</th>
                  <th>Change Date</th>
                  <th>Effective Date</th>
                  <th>Approved By</th>
                </tr>
              </thead>
              <tbody>
                {jobHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{textAlign:'center',padding:'48px 20px'}}>
                      <div style={{fontSize:28,marginBottom:8}}></div>
                      <div style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:4}}>No job history records</div>
                      <div style={{fontSize:11,color:'#9ca3af'}}>Job history will be automatically recorded when promotions are made</div>
                    </td>
                  </tr>
                ) : jobHistory.map((h: any, i: number) => {
                  const { diff, pct } = salaryDelta(h.oldSalary, h.newSalary);
                  return (
                    <tr key={i}>
                      {/* Employee */}
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div className="pr-av" style={{background:avGrad(h.empName)}}>
                            {getInitials(h.empName)}
                          </div>
                          <div>
                            <div style={{fontWeight:700,color:'#1e1b4b',fontSize:12}}>{h.empName}</div>
                            <div style={{fontSize:9,color:'#9ca3af',marginTop:1}}>{h.empId}</div>
                          </div>
                        </div>
                      </td>

                      {/* Change Type */}
                      <td>
                        <span className="pr-chip" style={{
                          background: h.changeType === 'promotion' ? '#eff6ff' : '#f0fdf4',
                          color: h.changeType === 'promotion' ? '#1d4ed8' : '#166534'
                        }}>
                          {h.changeType === 'promotion' ? ' Promotion' : ' Salary Adjustment'}
                        </span>
                      </td>

                      {/* Old Position */}
                      <td>
                        <div>
                          <div style={{fontSize:11,color:'#6b7280',fontWeight:500}}>{h.oldDesignation}</div>
                          <div style={{fontSize:10,color:'#9ca3af',fontFamily:'monospace'}}>{formatPKR(h.oldSalary)}</div>
                        </div>
                      </td>

                      {/* New Position */}
                      <td>
                        <div>
                          <div style={{fontSize:11,color:'#6366f1',fontWeight:700}}>{h.newDesignation}</div>
                          <div style={{fontSize:10,color:'#10b981',fontFamily:'monospace',fontWeight:600}}>{formatPKR(h.newSalary)}</div>
                        </div>
                      </td>

                      {/* Salary Change */}
                      <td>
                        {h.oldSalary !== h.newSalary ? (
                          <span className="pr-chip" style={{background:'#dcfce7',color:'#166534'}}>
                            {diff > 0 ? '↑' : '↓'} {Math.abs(pct)}%
                          </span>
                        ) : (
                          <span style={{fontSize:10,color:'#9ca3af'}}>No change</span>
                        )}
                      </td>

                      {/* Change Date */}
                      <td>
                        <span style={{fontFamily:'monospace',fontSize:11,color:'#6b7280',background:'#f8fafc',padding:'3px 8px',borderRadius:7}}>
                          {h.changeDate}
                        </span>
                      </td>

                      {/* Effective Date */}
                      <td>
                        <span style={{fontFamily:'monospace',fontSize:11,color:'#374151',background:'#eff6ff',padding:'3px 8px',borderRadius:7}}>
                          {h.effectiveDate}
                        </span>
                      </td>

                      {/* Approved By */}
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:20,height:20,borderRadius:6,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'#fff',fontWeight:700}}>
                            {getInitials(h.approvedBy)}
                          </div>
                          <span style={{fontSize:11,color:'#374151'}}>{h.approvedBy}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <Modal
          open={modal}
          onClose={() => setModal(false)}
          title="Record Promotion"
          footer={
            <>
              <button className="pr-btn pr-btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="pr-btn pr-btn-primary" onClick={savePromo}>Save Promotion</button>
            </>
          }
        >
          <div style={{display:'flex',flexDirection:'column',gap:14}}>

            {/* Employee select */}
            <div className="pr-form-group">
              <label className="pr-form-label">Employee</label>
              <select className="pr-input pr-select" value={empId} onChange={e => setEmpId(e.target.value)}>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.id} — {e.name}</option>)}
              </select>
            </div>

            {/* Selected employee preview */}
            {emp && (
              <div style={{display:'flex',alignItems:'center',gap:12,background:'#f8fafc',borderRadius:12,padding:'10px 14px',border:'1.5px solid #e5e7eb'}}>
                <div className="pr-av" style={{background:avGrad(emp.name),width:38,height:38,fontSize:13}}>
                  {getInitials(emp.name)}
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'#1e1b4b'}}>{emp.name}</div>
                  <div style={{fontSize:10,color:'#9ca3af',marginTop:1}}>{emp.designation} &nbsp;·&nbsp; {formatPKR(emp.salary?.basic || 0)}</div>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="pr-form-group">
              <label className="pr-form-label">Promotion Date</label>
              <input className="pr-input" type="date" value={promoDate} onChange={e => setPromoDate(e.target.value)}/>
            </div>

            {/* Old / New Designation */}
            <div className="pr-form-row">
              <div className="pr-form-group">
                <label className="pr-form-label">Old Designation</label>
                <input className="pr-input" value={emp?.designation || ''} disabled/>
              </div>
              <div className="pr-form-group">
                <label className="pr-form-label">New Designation <span style={{color:'#ef4444'}}>*</span></label>
                <select className="pr-input pr-select" value={newDesig} onChange={e => setNewDesig(e.target.value)}>
                  <option value="">Select Designation</option>
                  {designationsList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Old / New Salary */}
            <div className="pr-form-row">
              <div className="pr-form-group">
                <label className="pr-form-label">Old Salary</label>
                <input className="pr-input" style={{fontFamily:'monospace'}} value={formatPKR(emp?.salary?.basic || 0)} disabled/>
              </div>
              <div className="pr-form-group">
                <label className="pr-form-label">New Salary <span style={{color:'#ef4444'}}>*</span></label>
                <input className="pr-input" style={{fontFamily:'monospace'}} type="text" value={newSalary} onChange={handleSalaryChange} placeholder="e.g. 75000"/>
              </div>
            </div>

            {/* Hike preview */}
            {newSalary && emp?.salary?.basic > 0 && (
              <div style={{background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
                <TrendingUp size={14} color="#10b981"/>
                <span style={{fontSize:12,color:'#166534',fontWeight:600}}>
                  Salary hike: {salaryDelta(emp.salary.basic, parseInt(newSalary)||0).pct}%
                  &nbsp;(+{formatPKR(salaryDelta(emp.salary.basic, parseInt(newSalary)||0).diff)})
                </span>
              </div>
            )}

            {/* Notes */}
            <div className="pr-form-group">
              <label className="pr-form-label">Notes / Remarks</label>
              <textarea
                className="pr-input pr-textarea"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Reason for promotion, performance notes, etc."
              />
            </div>

          </div>
        </Modal>

      </div>
    </>
  );
}
