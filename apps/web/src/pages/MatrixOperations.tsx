import React, { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  DollarSign,
  FileCheck,
  GitBranch,
  KeyRound,
  Plus,
  RefreshCw,
  ShoppingCart,
  Smartphone,
  Target,
  Truck,
} from 'lucide-react';
import {
  matrixApi,
  SalesLead,
  SalesQuotation,
  ERPProject,
  PurchaseRequisition,
  ServiceTicket,
  VirtualDebt,
} from '../services/matrixService';
import { inventoryApi, Customer } from '../services/inventoryService';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

type MatrixPhase = 'sales' | 'operations' | 'stockout' | 'handshake' | 'finance';

const pageStyle: React.CSSProperties = {
  padding: 24,
  maxWidth: 1600,
  margin: '0 auto',
  fontFamily: "'Outfit', sans-serif",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #dbe4f0',
  borderRadius: 16,
  boxShadow: '0 10px 28px rgba(15,23,42,0.06)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  color: '#475569',
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  background: 'linear-gradient(135deg,#e0f2fe,#ede9fe)',
};

const tdStyle: React.CSSProperties = {
  padding: '13px 14px',
  borderTop: '1px solid #edf2f7',
  color: '#0f172a',
  verticalAlign: 'middle',
};

const primaryButton: React.CSSProperties = {
  border: 'none',
  borderRadius: 10,
  padding: '10px 14px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  fontWeight: 900,
  fontSize: 13,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  justifyContent: 'center',
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  backgroundColor: '#f8fafc',
  color: '#334155',
  border: '1px solid #cbd5e1',
};

function money(value?: number) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function dateText(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status?: string) {
  const normalized = (status || 'NEW').toUpperCase();
  const palette =
    normalized.includes('WON') || normalized.includes('ACTIVE') || normalized.includes('CLOSED') || normalized.includes('RECONCILED')
      ? { bg: '#dcfce7', fg: '#047857' }
      : normalized.includes('OTP') || normalized.includes('SUBMITTED') || normalized.includes('DRAFT')
        ? { bg: '#fef3c7', fg: '#b45309' }
        : normalized.includes('UNRECONCILED')
          ? { bg: '#fee2e2', fg: '#b91c1c' }
          : { bg: '#dbeafe', fg: '#1d4ed8' };

  return (
    <span style={{ padding: '5px 9px', borderRadius: 999, backgroundColor: palette.bg, color: palette.fg, fontSize: 11, fontWeight: 900 }}>
      {normalized}
    </span>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ padding: 34, border: '1px dashed #cbd5e1', borderRadius: 14, backgroundColor: '#f8fafc', textAlign: 'center', color: '#64748b' }}>
      <CheckCircle2 size={34} style={{ color: '#10b981', marginBottom: 8 }} />
      <div style={{ fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{detail}</div>
    </div>
  );
}

function ModalShell({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 560, ...cardStyle, padding: 24, boxShadow: '0 24px 60px rgba(15,23,42,0.28)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{title}</h3>
            {subtitle && <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} style={{ ...secondaryButton, padding: '8px 11px' }}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function MatrixOperations() {
  const { activeRole } = useAuth();

  const allowedPhases = useMemo<MatrixPhase[]>(() => {
    if (activeRole === 'csr_officer') return ['sales'];
    if (activeRole === 'inventory_officer') return ['operations', 'stockout'];
    if (activeRole === 'finance_officer') return ['finance'];
    if (activeRole === 'inv_fin_admin') return ['operations', 'stockout', 'finance'];
    return ['sales', 'operations', 'stockout', 'handshake', 'finance'];
  }, [activeRole]);

  const [activePhase, setActivePhase] = useState<MatrixPhase>(allowedPhases[0]);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [quotations, setQuotations] = useState<SalesQuotation[]>([]);
  const [projects, setProjects] = useState<ERPProject[]>([]);
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [debts, setDebts] = useState<VirtualDebt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showPRModal, setShowPRModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showOTPVerifyModal, setShowOTPVerifyModal] = useState(false);

  const [selectedTicketForOTP, setSelectedTicketForOTP] = useState<ServiceTicket | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [photoProofUrl, setPhotoProofUrl] = useState('');
  const [customerSignature, setCustomerSignature] = useState('');

  const [newLead, setNewLead] = useState({ title: '', customer_id: '', estimated_value: 0 });
  const [newQuotation, setNewQuotation] = useState({ customer_id: '', quotation_type: 'PRODUCT' as 'PRODUCT' | 'SERVICE_PROJECT', total_amount: 0 });
  const [newPR, setNewPR] = useState({ project_id: '', pr_type: 'CLIENT_INVENTORY' as 'CLIENT_INVENTORY' | 'INTERNAL_ASSET', notes: '' });
  const [newTicket, setNewTicket] = useState({ customer_id: '', project_id: '', complaint_type: 'DEVICE_OFFLINE', description: '' });

  const loadMatrixData = async () => {
    setLoading(true);
    try {
      const [leadsRes, quotesRes, projRes, prsRes, tckRes, debtRes, custRes] = await Promise.all([
        matrixApi.getLeads().catch(() => []),
        matrixApi.getQuotations().catch(() => []),
        matrixApi.getProjects().catch(() => []),
        matrixApi.getPurchaseRequisitions().catch(() => []),
        matrixApi.getServiceTickets().catch(() => []),
        matrixApi.getVirtualDebts().catch(() => []),
        inventoryApi.getCustomers().catch(() => []),
      ]);

      setLeads(leadsRes);
      setQuotations(quotesRes);
      setProjects(projRes);
      setPrs(prsRes);
      setTickets(tckRes);
      setDebts(debtRes);
      setCustomers(custRes);
    } catch {
      toast.error('Error loading matrix data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrixData();
  }, []);

  useEffect(() => {
    if (!allowedPhases.includes(activePhase)) setActivePhase(allowedPhases[0]);
  }, [activePhase, allowedPhases]);

  const stats = [
    { label: 'Leads', value: leads.length, tone: '#2563eb' },
    { label: 'Quotations', value: quotations.length, tone: '#10b981' },
    { label: 'Projects', value: projects.length, tone: '#7c3aed' },
    { label: 'Tickets', value: tickets.length, tone: '#f59e0b' },
    { label: 'Open Debts', value: debts.filter((debt) => debt.status === 'UNRECONCILED').length, tone: '#dc2626' },
  ];

  const phaseTabs = [
    { id: 'sales' as const, label: 'Phase 1: Sales & CRM', icon: Target },
    { id: 'operations' as const, label: 'Phase 2: Operations & PR', icon: Briefcase },
    { id: 'stockout' as const, label: 'Phase 3: Stock Out Cases', icon: ShoppingCart },
    { id: 'handshake' as const, label: 'Phase 4: Digital OTP Handshake', icon: Smartphone },
    { id: 'finance' as const, label: 'Phase 5: Finance & Settlement', icon: DollarSign },
  ].filter((tab) => allowedPhases.includes(tab.id));

  const handleCreateLead = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newLead.title.trim()) return toast.error('Lead title is required');
    try {
      await matrixApi.createLead(newLead);
      toast.success('Sales lead generated');
      setShowLeadModal(false);
      setNewLead({ title: '', customer_id: '', estimated_value: 0 });
      loadMatrixData();
    } catch {
      toast.error('Failed to create lead');
    }
  };

  const handleCreateQuotation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newQuotation.customer_id) return toast.error('Select a customer for quotation');
    try {
      await matrixApi.createQuotation(newQuotation);
      toast.success('Quotation generated');
      setShowQuotationModal(false);
      setNewQuotation({ customer_id: '', quotation_type: 'PRODUCT', total_amount: 0 });
      loadMatrixData();
    } catch {
      toast.error('Failed to create quotation');
    }
  };

  const handleActivateProject = async (quotationId: string) => {
    try {
      const project = await matrixApi.activateProject(quotationId);
      toast.success(`Project ${project.project_number} activated`);
      loadMatrixData();
    } catch {
      toast.error('Failed to activate project');
    }
  };

  const handleCreatePR = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPR.project_id) return toast.error('Select a project before raising PR');
    try {
      await matrixApi.createPurchaseRequisition(newPR);
      toast.success('Purchase requisition submitted');
      setShowPRModal(false);
      setNewPR({ project_id: '', pr_type: 'CLIENT_INVENTORY', notes: '' });
      loadMatrixData();
    } catch {
      toast.error('Failed to submit PR');
    }
  };

  const handleCreateTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTicket.customer_id) return toast.error('Customer is required');
    try {
      await matrixApi.createServiceTicket(newTicket);
      toast.success('Field service ticket opened');
      setShowTicketModal(false);
      setNewTicket({ customer_id: '', project_id: '', complaint_type: 'DEVICE_OFFLINE', description: '' });
      loadMatrixData();
    } catch {
      toast.error('Failed to create ticket');
    }
  };

  const handleTriggerOTP = async (ticketId: string) => {
    try {
      const response = await matrixApi.triggerOTP(ticketId);
      toast.success(`OTP generated: ${response.otp_sent_to_customer}`);
      loadMatrixData();
    } catch {
      toast.error('Failed to trigger OTP');
    }
  };

  const handleVerifyOTP = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTicketForOTP || !otpInput.trim()) return toast.error('Enter OTP code');
    try {
      await matrixApi.verifyOTP({
        ticket_id: selectedTicketForOTP.id,
        input_otp: otpInput,
        photo_proof_url: photoProofUrl,
        customer_signature: customerSignature,
      });
      toast.success('OTP verified and ticket closed');
      setShowOTPVerifyModal(false);
      setSelectedTicketForOTP(null);
      setOtpInput('');
      setPhotoProofUrl('');
      setCustomerSignature('');
      loadMatrixData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid OTP code');
    }
  };

  const handleReconcileDebt = async (debtId: string) => {
    try {
      await matrixApi.reconcileDebt(debtId);
      toast.success('Virtual debt reconciled');
      loadMatrixData();
    } catch {
      toast.error('Failed to reconcile debt');
    }
  };

  return (
    <div style={pageStyle}>
      <div
        style={{
          ...cardStyle,
          padding: 26,
          marginBottom: 18,
          background: 'linear-gradient(135deg,#111827 0%,#1e1b4b 55%,#0f172a 100%)',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ padding: 13, borderRadius: 14, backgroundColor: 'rgba(99,102,241,0.22)', border: '1px solid rgba(191,219,254,0.25)' }}>
              <GitBranch size={30} style={{ color: '#93c5fd' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 900 }}>TRACK360 ERP — Matrix Operational Control</h1>
              <p style={{ margin: '7px 0 0', color: '#dbeafe', fontSize: 14 }}>
                {'Integrated Sales CRM -> Project Activation -> Operations PR -> Stock Out -> Digital OTP -> Finance Settlement.'}
              </p>
            </div>
          </div>
          <button onClick={loadMatrixData} style={{ ...secondaryButton, backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.22)' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Matrix
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 18 }}>
        {stats.map((item) => (
          <div key={item.label} style={{ ...cardStyle, padding: 16, borderTop: `4px solid ${item.tone}` }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900, color: '#0f172a' }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 22, backgroundColor: '#f1f5f9', padding: 7, borderRadius: 14, overflowX: 'auto' }}>
        {phaseTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activePhase === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActivePhase(tab.id)}
              style={{
                ...secondaryButton,
                backgroundColor: active ? '#2563eb' : '#ffffff',
                color: active ? '#ffffff' : '#475569',
                borderColor: active ? '#2563eb' : '#e2e8f0',
                boxShadow: active ? '0 8px 18px rgba(37,99,235,0.25)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activePhase === 'sales' && (
        <div style={{ display: 'grid', gap: 18 }}>
          <section style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#2563eb', fontSize: 11, fontWeight: 900, letterSpacing: 0.6, textTransform: 'uppercase' }}>Phase 1</div>
                <h2 style={{ margin: '4px 0', fontSize: 21, fontWeight: 900 }}>Sales CRM & Project Activation Flow</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Generate lead, create quotation, then mark quotation won to activate the project.</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={() => setShowLeadModal(true)} style={primaryButton}><Plus size={16} /> Generate Lead</button>
                <button onClick={() => setShowQuotationModal(true)} style={{ ...primaryButton, backgroundColor: '#10b981' }}><Plus size={16} /> Create Quotation</button>
              </div>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 18 }}>
            <section style={{ ...cardStyle, overflow: 'hidden' }}>
              <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', fontWeight: 900 }}><Target size={17} /> Active CRM Leads ({leads.length})</div>
              {leads.length === 0 ? <div style={{ padding: 16 }}><EmptyState title="No leads yet" detail="Click Generate Lead to create the first CRM lead." /></div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr><th style={thStyle}>Lead</th><th style={thStyle}>Client</th><th style={{ ...thStyle, textAlign: 'right' }}>Value</th><th style={thStyle}>Status</th></tr></thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        <td style={tdStyle}><strong>{lead.title}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{lead.lead_number}</span></td>
                        <td style={tdStyle}>{lead.customer_name || 'Prospect'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900 }}>{money(lead.estimated_value)}</td>
                        <td style={tdStyle}>{statusBadge(lead.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section style={{ ...cardStyle, overflow: 'hidden' }}>
              <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', fontWeight: 900 }}><FileCheck size={17} /> Quotations & Activation ({quotations.length})</div>
              {quotations.length === 0 ? <div style={{ padding: 16 }}><EmptyState title="No quotations yet" detail="Create a quotation and activate it into a project." /></div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr><th style={thStyle}>Quotation</th><th style={thStyle}>Client</th><th style={{ ...thStyle, textAlign: 'right' }}>Amount</th><th style={thStyle}>Action</th></tr></thead>
                  <tbody>
                    {quotations.map((quote) => (
                      <tr key={quote.id}>
                        <td style={tdStyle}><strong>{quote.quotation_number}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{quote.quotation_type}</span></td>
                        <td style={tdStyle}>{quote.customer_name || 'Client'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900 }}>{money(quote.total_amount)}</td>
                        <td style={tdStyle}>
                          {quote.status === 'WON' ? statusBadge('WON') : (
                            <button onClick={() => handleActivateProject(quote.id)} style={{ ...primaryButton, padding: '8px 10px', fontSize: 12, backgroundColor: '#10b981' }}>
                              Mark WON & Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </div>
      )}

      {activePhase === 'operations' && (
        <div style={{ display: 'grid', gap: 18 }}>
          <section style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#7c3aed', fontSize: 11, fontWeight: 900, letterSpacing: 0.6, textTransform: 'uppercase' }}>Phase 2</div>
                <h2 style={{ margin: '4px 0', fontSize: 21, fontWeight: 900 }}>Operations Projects & Purchase Requisitions</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Operations raises PRs against activated projects for client inventory or internal assets.</p>
              </div>
              <button onClick={() => setShowPRModal(true)} style={primaryButton}><Plus size={16} /> Raise PR</button>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 18 }}>
            <section style={{ ...cardStyle, overflow: 'hidden' }}>
              <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', fontWeight: 900 }}><Briefcase size={17} /> Activated Projects ({projects.length})</div>
              {projects.length === 0 ? <div style={{ padding: 16 }}><EmptyState title="No active projects" detail="Activate a quotation in Phase 1 first." /></div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr><th style={thStyle}>Project</th><th style={thStyle}>Client</th><th style={{ ...thStyle, textAlign: 'right' }}>Budget</th><th style={thStyle}>Status</th></tr></thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id}>
                        <td style={tdStyle}><strong>{project.project_number}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{project.project_name}</span></td>
                        <td style={tdStyle}>{project.customer_name || 'Client'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900 }}>{money(project.budget)}</td>
                        <td style={tdStyle}>{statusBadge(project.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section style={{ ...cardStyle, overflow: 'hidden' }}>
              <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', fontWeight: 900 }}><ShoppingCart size={17} /> Requisitions ({prs.length})</div>
              {prs.length === 0 ? <div style={{ padding: 16 }}><EmptyState title="No PRs yet" detail="Raise PR after project activation." /></div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr><th style={thStyle}>PR</th><th style={thStyle}>Project</th><th style={thStyle}>Type</th><th style={thStyle}>Status</th></tr></thead>
                  <tbody>
                    {prs.map((pr) => (
                      <tr key={pr.id}>
                        <td style={tdStyle}><strong>{pr.pr_number}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{dateText(pr.created_at)}</span></td>
                        <td style={tdStyle}>{pr.project_name || 'N/A'}</td>
                        <td style={tdStyle}>{pr.pr_type}</td>
                        <td style={tdStyle}>{statusBadge(pr.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </div>
      )}

      {activePhase === 'stockout' && (
        <div style={{ display: 'grid', gap: 18 }}>
          <section style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#059669', fontSize: 11, fontWeight: 900, letterSpacing: 0.6, textTransform: 'uppercase' }}>Phase 3</div>
                <h2 style={{ margin: '4px 0', fontSize: 21, fontWeight: 900 }}>Stock Out & Installer Handoff</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Inventory assigns serials/items and moves approved jobs into dispatch and billing.</p>
              </div>
              <button onClick={() => { window.location.href = '/inventory'; }} style={{ ...primaryButton, backgroundColor: '#10b981' }}><Truck size={16} /> Open Inventory Dispatch</button>
            </div>
          </section>

          <section style={{ ...cardStyle, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr><th style={thStyle}>Job / Quotation</th><th style={thStyle}>Customer</th><th style={{ ...thStyle, textAlign: 'right' }}>Amount</th><th style={thStyle}>Status</th><th style={thStyle}>Action</th></tr></thead>
              <tbody>
                {quotations.filter((quote) => ['WON', 'APPROVED'].includes(quote.status)).length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 18 }}><EmptyState title="No stock-out jobs" detail="Mark a quotation as won/approved first." /></td></tr>
                ) : quotations.filter((quote) => ['WON', 'APPROVED'].includes(quote.status)).map((quote) => (
                  <tr key={quote.id}>
                    <td style={tdStyle}><strong>{quote.quotation_number}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{quote.quotation_type}</span></td>
                    <td style={tdStyle}>{quote.customer_name || 'Client'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900 }}>{money(quote.total_amount)}</td>
                    <td style={tdStyle}>{statusBadge(quote.status)}</td>
                    <td style={tdStyle}><button onClick={() => { window.location.href = '/inventory'; }} style={{ ...primaryButton, padding: '8px 10px', fontSize: 12 }}>Assign Stock / Serials</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {activePhase === 'handshake' && (
        <div style={{ display: 'grid', gap: 18 }}>
          <section style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#ea580c', fontSize: 11, fontWeight: 900, letterSpacing: 0.6, textTransform: 'uppercase' }}>Phase 4</div>
                <h2 style={{ margin: '4px 0', fontSize: 21, fontWeight: 900 }}>Digital OTP Handshake</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Technician completion is verified with customer OTP, proof URL and signature notes.</p>
              </div>
              <button onClick={() => setShowTicketModal(true)} style={primaryButton}><Plus size={16} /> Open Service Ticket</button>
            </div>
          </section>

          <section style={{ ...cardStyle, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr><th style={thStyle}>Ticket</th><th style={thStyle}>Customer</th><th style={thStyle}>Complaint</th><th style={thStyle}>Status</th><th style={thStyle}>Handshake</th></tr></thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 18 }}><EmptyState title="No tickets yet" detail="Open a service ticket to test OTP flow." /></td></tr>
                ) : tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td style={tdStyle}><strong>{ticket.ticket_number}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{dateText(ticket.created_at)}</span></td>
                    <td style={tdStyle}>{ticket.customer_name || 'Client'}</td>
                    <td style={tdStyle}>{ticket.complaint_type}</td>
                    <td style={tdStyle}>{statusBadge(ticket.status)}</td>
                    <td style={tdStyle}>
                      {ticket.otp_verified ? (
                        <span style={{ color: '#047857', fontWeight: 900 }}>Verified</span>
                      ) : ticket.status === 'OTP_PENDING' ? (
                        <button onClick={() => { setSelectedTicketForOTP(ticket); setShowOTPVerifyModal(true); }} style={{ ...primaryButton, padding: '8px 10px', fontSize: 12, backgroundColor: '#f59e0b' }}>
                          Enter Customer OTP Code
                        </button>
                      ) : (
                        <button onClick={() => handleTriggerOTP(ticket.id)} style={{ ...primaryButton, padding: '8px 10px', fontSize: 12 }}>
                          Trigger OTP
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {activePhase === 'finance' && (
        <div style={{ display: 'grid', gap: 18 }}>
          <section style={{ ...cardStyle, padding: 20 }}>
            <div>
              <div style={{ color: '#dc2626', fontSize: 11, fontWeight: 900, letterSpacing: 0.6, textTransform: 'uppercase' }}>Phase 5</div>
              <h2 style={{ margin: '4px 0', fontSize: 21, fontWeight: 900 }}>Finance Settlement & Virtual Debt</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Field cash collection stays as technician virtual debt until Finance reconciles it.</p>
            </div>
          </section>

          <section style={{ ...cardStyle, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr><th style={thStyle}>Debt Ref</th><th style={thStyle}>Technician</th><th style={thStyle}>Ticket</th><th style={{ ...thStyle, textAlign: 'right' }}>Cash</th><th style={thStyle}>Status</th><th style={thStyle}>Action</th></tr></thead>
              <tbody>
                {debts.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 18 }}><EmptyState title="No active debt" detail="Virtual cash debts will appear here after field collection." /></td></tr>
                ) : debts.map((debt) => (
                  <tr key={debt.id}>
                    <td style={tdStyle}><strong>{debt.debt_number}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{dateText(debt.collected_at)}</span></td>
                    <td style={tdStyle}>{debt.technician_email || '-'}</td>
                    <td style={tdStyle}>{debt.ticket_number || '-'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900, color: '#b91c1c' }}>{money(debt.amount_collected)}</td>
                    <td style={tdStyle}>{statusBadge(debt.status)}</td>
                    <td style={tdStyle}>
                      {debt.status === 'UNRECONCILED' ? (
                        <button onClick={() => handleReconcileDebt(debt.id)} style={{ ...primaryButton, padding: '8px 10px', fontSize: 12, backgroundColor: '#10b981' }}>
                          Reconcile Cash
                        </button>
                      ) : <span style={{ color: '#64748b', fontSize: 12 }}>Completed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {showLeadModal && (
        <ModalShell title="Generate Sales Lead" subtitle="Create the first CRM record before quotation." onClose={() => setShowLeadModal(false)}>
          <form onSubmit={handleCreateLead} style={{ display: 'grid', gap: 12 }}>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>Lead Title *</span><input required value={newLead.title} onChange={(e) => setNewLead({ ...newLead, title: e.target.value })} style={inputStyle} placeholder="e.g. HBL camera upgrade" /></label>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>Customer</span><select value={newLead.customer_id} onChange={(e) => setNewLead({ ...newLead, customer_id: e.target.value })} style={inputStyle}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customer_name}</option>)}</select></label>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>Estimated Value</span><input type="number" min={0} value={newLead.estimated_value} onChange={(e) => setNewLead({ ...newLead, estimated_value: Number(e.target.value) })} style={inputStyle} /></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" onClick={() => setShowLeadModal(false)} style={secondaryButton}>Cancel</button><button type="submit" style={primaryButton}>Save Lead</button></div>
          </form>
        </ModalShell>
      )}

      {showQuotationModal && (
        <ModalShell title="Create Quotation" subtitle="Create a quotation that can be marked WON and activated into a project." onClose={() => setShowQuotationModal(false)}>
          <form onSubmit={handleCreateQuotation} style={{ display: 'grid', gap: 12 }}>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>Customer *</span><select required value={newQuotation.customer_id} onChange={(e) => setNewQuotation({ ...newQuotation, customer_id: e.target.value })} style={inputStyle}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customer_name}</option>)}</select></label>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>Quotation Type</span><select value={newQuotation.quotation_type} onChange={(e) => setNewQuotation({ ...newQuotation, quotation_type: e.target.value as 'PRODUCT' | 'SERVICE_PROJECT' })} style={inputStyle}><option value="PRODUCT">Product</option><option value="SERVICE_PROJECT">Service Project</option></select></label>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>Total Amount</span><input type="number" min={0} value={newQuotation.total_amount} onChange={(e) => setNewQuotation({ ...newQuotation, total_amount: Number(e.target.value) })} style={inputStyle} /></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" onClick={() => setShowQuotationModal(false)} style={secondaryButton}>Cancel</button><button type="submit" style={primaryButton}>Save Quotation</button></div>
          </form>
        </ModalShell>
      )}

      {showPRModal && (
        <ModalShell title="Raise Purchase Requisition" subtitle="Request inventory or internal assets against an active project." onClose={() => setShowPRModal(false)}>
          <form onSubmit={handleCreatePR} style={{ display: 'grid', gap: 12 }}>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>Project *</span><select required value={newPR.project_id} onChange={(e) => setNewPR({ ...newPR, project_id: e.target.value })} style={inputStyle}><option value="">Select active project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_number} - {project.project_name}</option>)}</select></label>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>PR Type</span><select value={newPR.pr_type} onChange={(e) => setNewPR({ ...newPR, pr_type: e.target.value as 'CLIENT_INVENTORY' | 'INTERNAL_ASSET' })} style={inputStyle}><option value="CLIENT_INVENTORY">Client Inventory</option><option value="INTERNAL_ASSET">Internal Asset</option></select></label>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>Notes</span><textarea value={newPR.notes} onChange={(e) => setNewPR({ ...newPR, notes: e.target.value })} style={{ ...inputStyle, minHeight: 86, resize: 'vertical' }} placeholder="Required material, approval note, urgency..." /></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" onClick={() => setShowPRModal(false)} style={secondaryButton}>Cancel</button><button type="submit" style={primaryButton}>Submit PR</button></div>
          </form>
        </ModalShell>
      )}

      {showTicketModal && (
        <ModalShell title="Open Service Ticket" subtitle="Create field work before OTP verification." onClose={() => setShowTicketModal(false)}>
          <form onSubmit={handleCreateTicket} style={{ display: 'grid', gap: 12 }}>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>Customer *</span><select required value={newTicket.customer_id} onChange={(e) => setNewTicket({ ...newTicket, customer_id: e.target.value })} style={inputStyle}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customer_name}</option>)}</select></label>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>Project</span><select value={newTicket.project_id} onChange={(e) => setNewTicket({ ...newTicket, project_id: e.target.value })} style={inputStyle}><option value="">No project selected</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_number}</option>)}</select></label>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>Complaint Type</span><select value={newTicket.complaint_type} onChange={(e) => setNewTicket({ ...newTicket, complaint_type: e.target.value })} style={inputStyle}><option value="DEVICE_OFFLINE">Device Offline</option><option value="INSTALLATION">Installation</option><option value="MAINTENANCE">Maintenance</option><option value="OTHER">Other</option></select></label>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>Description</span><textarea value={newTicket.description} onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })} style={{ ...inputStyle, minHeight: 86, resize: 'vertical' }} /></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" onClick={() => setShowTicketModal(false)} style={secondaryButton}>Cancel</button><button type="submit" style={primaryButton}>Save Ticket</button></div>
          </form>
        </ModalShell>
      )}

      {showOTPVerifyModal && selectedTicketForOTP && (
        <ModalShell title="Customer OTP Verification" subtitle={`Ticket ${selectedTicketForOTP.ticket_number}: enter customer OTP to close the job.`} onClose={() => setShowOTPVerifyModal(false)}>
          <form onSubmit={handleVerifyOTP} style={{ display: 'grid', gap: 12 }}>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>4 Digit OTP *</span><input required maxLength={4} value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))} style={{ ...inputStyle, textAlign: 'center', fontSize: 22, letterSpacing: 6, fontWeight: 900 }} placeholder="1234" /></label>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>Photo Proof URL</span><input value={photoProofUrl} onChange={(e) => setPhotoProofUrl(e.target.value)} style={inputStyle} placeholder="https://proof-image.jpg" /></label>
            <label><span style={{ fontSize: 12, fontWeight: 800 }}>Customer Signature / Name</span><input value={customerSignature} onChange={(e) => setCustomerSignature(e.target.value)} style={inputStyle} placeholder="Customer name or signature reference" /></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button type="button" onClick={() => setShowOTPVerifyModal(false)} style={secondaryButton}>Cancel</button><button type="submit" style={primaryButton}><KeyRound size={16} /> Verify & Close</button></div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
