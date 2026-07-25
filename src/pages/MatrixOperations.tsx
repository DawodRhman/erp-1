import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Target,
  Briefcase,
  ShoppingCart,
  ShieldCheck,
  DollarSign,
  Plus,
  RefreshCw,
  CheckCircle2,
  Lock,
  Smartphone,
  CheckSquare,
  KeyRound,
  FileCheck,
  TrendingUp,
  UserCheck,
  Truck,
  Car,
  Clock,
  AlertCircle,
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

export default function MatrixOperations() {
  const [activePhase, setActivePhase] = useState<
    'sales' | 'operations' | 'stockout' | 'handshake' | 'finance'
  >('sales');

  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [quotations, setQuotations] = useState<SalesQuotation[]>([]);
  const [projects, setProjects] = useState<ERPProject[]>([]);
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [debts, setDebts] = useState<VirtualDebt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Modals & Handlers State
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showPRModal, setShowPRModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showOTPVerifyModal, setShowOTPVerifyModal] = useState(false);

  const [selectedTicketForOTP, setSelectedTicketForOTP] = useState<ServiceTicket | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [photoProofUrl, setPhotoProofUrl] = useState('');
  const [customerSignature, setCustomerSignature] = useState('');

  // Form States
  const [newLead, setNewLead] = useState({ title: '', customer_id: '', estimated_value: 0 });
  const [newQuotation, setNewQuotation] = useState({ customer_id: '', quotation_type: 'PRODUCT' as const, total_amount: 0 });
  const [newPR, setNewPR] = useState({ project_id: '', pr_type: 'CLIENT_INVENTORY' as const, notes: '' });
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
    } catch (err) {
      toast.error('Error loading matrix data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrixData();
  }, []);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.title.trim()) return toast.error('Lead title is required');
    try {
      await matrixApi.createLead(newLead);
      toast.success('Sales lead generated!');
      setShowLeadModal(false);
      setNewLead({ title: '', customer_id: '', estimated_value: 0 });
      loadMatrixData();
    } catch (err: any) {
      toast.error('Failed to create lead');
    }
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await matrixApi.createQuotation(newQuotation);
      toast.success('Quotation generated!');
      setShowQuotationModal(false);
      setNewQuotation({ customer_id: '', quotation_type: 'PRODUCT', total_amount: 0 });
      loadMatrixData();
    } catch (err: any) {
      toast.error('Failed to create quotation');
    }
  };

  const handleActivateProject = async (quotationId: string) => {
    try {
      const proj = await matrixApi.activateProject(quotationId);
      toast.success(`Project ${proj.project_number} activated from Quotation!`);
      loadMatrixData();
    } catch (err: any) {
      toast.error('Failed to activate project');
    }
  };

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await matrixApi.createPurchaseRequisition(newPR);
      toast.success('Purchase Requisition (PR) submitted!');
      setShowPRModal(false);
      setNewPR({ project_id: '', pr_type: 'CLIENT_INVENTORY', notes: '' });
      loadMatrixData();
    } catch (err) {
      toast.error('Failed to submit PR');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.customer_id) return toast.error('Customer is required');
    try {
      await matrixApi.createServiceTicket(newTicket);
      toast.success('Field Service Ticket opened!');
      setShowTicketModal(false);
      setNewTicket({ customer_id: '', project_id: '', complaint_type: 'DEVICE_OFFLINE', description: '' });
      loadMatrixData();
    } catch (err) {
      toast.error('Failed to create ticket');
    }
  };

  const handleTriggerOTP = async (ticketId: string) => {
    try {
      const res = await matrixApi.triggerOTP(ticketId);
      toast.success(`OTP ${res.otp_sent_to_customer} dispatched to customer's mobile!`);
      loadMatrixData();
    } catch (err) {
      toast.error('Failed to trigger OTP');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketForOTP || !otpInput.trim()) return toast.error('Please enter the 4-digit OTP code');
    try {
      await matrixApi.verifyOTP({
        ticket_id: selectedTicketForOTP.id,
        input_otp: otpInput,
        photo_proof_url: photoProofUrl,
        customer_signature: customerSignature,
      });
      toast.success('OTP Handshake Verified! Ticket Closed & Technician Visit Fee Triggered!');
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
      toast.success('Virtual Debt Reconciled by Finance!');
      loadMatrixData();
    } catch (err) {
      toast.error('Failed to reconcile debt');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
          color: '#ffffff',
          padding: '24px 32px',
          borderRadius: '16px',
          marginBottom: '24px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 24px rgba(15,23,42,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(129, 140, 248, 0.3)', borderRadius: '12px' }}>
            <GitBranch size={28} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>TRACK360 ERP — Matrix Operational Control</h1>
            <p style={{ color: '#c7d2fe', marginTop: '6px', fontSize: '14px' }}>
              Integrated Sales CRM → Project Activation → Operations PR → Digital OTP Handshake → Finance Settlement.
            </p>
          </div>
        </div>

        <button
          onClick={loadMatrixData}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '10px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Matrix
        </button>
      </div>

      {/* 5 Phase Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '12px', overflowX: 'auto' }}>
        {[
          { id: 'sales', label: 'Phase 1: Sales & CRM', icon: Target },
          { id: 'operations', label: 'Phase 2: Operations & PR', icon: Briefcase },
          { id: 'stockout', label: 'Phase 3: Stock Out Cases', icon: ShoppingCart },
          { id: 'handshake', label: 'Phase 4: Digital OTP Handshake', icon: Smartphone },
          { id: 'finance', label: 'Phase 5: Finance & Settlement', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activePhase === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActivePhase(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? '#6366f1' : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: isActive ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* PHASE 1: SALES & CRM */}
      {activePhase === 'sales' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Sales CRM & Project Activation Flow</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowLeadModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
                + Generate Lead
              </button>
              <button onClick={() => setShowQuotationModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold">
                + Create Quotation
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leads Panel */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500" /> Active CRM Leads ({leads.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {leads.map((lead) => (
                  <div key={lead.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold">{lead.title}</div>
                      <div className="text-xs text-slate-500">{lead.lead_number} | {lead.customer_name || 'Prospect'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-emerald-600">PKR {lead.estimated_value.toLocaleString()}</div>
                      <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded">
                        {lead.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quotations & Activation Panel */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-500" /> Quotations & Activation ({quotations.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {quotations.map((q) => (
                  <div key={q.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold">{q.quotation_number} ({q.quotation_type})</div>
                      <div className="text-xs text-slate-500">{q.customer_name || 'Client'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900 dark:text-white">PKR {q.total_amount.toLocaleString()}</span>
                      {q.status === 'WON' ? (
                        <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full">
                          ACTIVATED (WON)
                        </span>
                      ) : (
                        <button
                          onClick={() => handleActivateProject(q.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition"
                        >
                          Mark WON & Activate Project
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 2: OPERATIONS & PR */}
      {activePhase === 'operations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Active Projects & Purchase Requisitions (PR)</h2>
            <button onClick={() => setShowPRModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
              + Raise Purchase Requisition (PR)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active ERP Projects */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-500" /> Active Activated Projects ({projects.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {projects.map((proj) => (
                  <div key={proj.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{proj.project_number}</div>
                      <div className="text-xs text-slate-500">{proj.project_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600">Budget: PKR {proj.budget.toLocaleString()}</div>
                      <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded">
                        {proj.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Purchase Requisitions (PR) */}
            <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-violet-500" /> Requisitions (PR: Materials & Internal Assets)
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {prs.map((pr) => (
                  <div key={pr.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold">{pr.pr_number}</div>
                      <div className="text-xs text-slate-500">
                        Type: <span className="font-semibold text-indigo-600">{pr.pr_type}</span> | Project: {pr.project_name || 'N/A'}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full">
                      {pr.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 4: DIGITAL OTP HANDSHAKE */}
      {activePhase === 'handshake' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Phase 4: Field Service Digital Handshake</h2>
              <p className="text-xs text-slate-500">Technician completion validation via 4-digit Customer OTP & Visual Proof.</p>
            </div>
            <button onClick={() => setShowTicketModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
              + Open Service Ticket
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Ticket No</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Complaint Type</th>
                  <th className="px-6 py-4">Technician</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Digital Handshake</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tickets.map((tck) => (
                  <tr key={tck.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-4 font-bold">{tck.ticket_number}</td>
                    <td className="px-6 py-4">{tck.customer_name}</td>
                    <td className="px-6 py-4">{tck.complaint_type}</td>
                    <td className="px-6 py-4 text-slate-500">{tck.technician_email || 'Unassigned'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          tck.status === 'CLOSED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : tck.status === 'OTP_PENDING'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {tck.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {tck.otp_verified ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" /> Verified Handshake
                        </span>
                      ) : tck.status === 'OTP_PENDING' ? (
                        <button
                          onClick={() => {
                            setSelectedTicketForOTP(tck);
                            setShowOTPVerifyModal(true);
                          }}
                          className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold animate-pulse"
                        >
                          Enter Customer OTP Code
                        </button>
                      ) : (
                        <button
                          onClick={() => handleTriggerOTP(tck.id)}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                        >
                          Trigger Customer OTP
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PHASE 5: FINANCE & SETTLEMENT */}
      {activePhase === 'finance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Technician Virtual Debt & Financial Reconciliation</h2>
              <p className="text-xs text-slate-500">Field cash collections placed as Virtual Debt on Technician ID until Finance reconciles.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Debt Ref No</th>
                  <th className="px-6 py-4">Technician Email</th>
                  <th className="px-6 py-4">Cash Collected</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {debts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No active virtual cash debts found.
                    </td>
                  </tr>
                ) : (
                  debts.map((debt) => (
                    <tr key={debt.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-bold">{debt.debt_number}</td>
                      <td className="px-6 py-4 font-mono">{debt.technician_email}</td>
                      <td className="px-6 py-4 font-bold text-rose-600">PKR {debt.amount_collected.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                            debt.status === 'RECONCILED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {debt.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {debt.status === 'UNRECONCILED' ? (
                          <button
                            onClick={() => handleReconcileDebt(debt.id)}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow"
                          >
                            Finance Reconcile Cash
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Reconciled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: VERIFY OTP */}
      {showOTPVerifyModal && selectedTicketForOTP && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-500" /> Customer OTP Handshake Verification
            </h3>
            <p className="text-xs text-slate-500">
              Enter the 4-digit code sent to the customer's phone to prove job completion.
            </p>

            <form onSubmit={handleVerifyOTP} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">4-Digit OTP Code *</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="e.g. 4821"
                  className="w-full text-center text-2xl font-mono tracking-widest p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Photo Proof URL (Optional)</label>
                <input
                  type="text"
                  value={photoProofUrl}
                  onChange={(e) => setPhotoProofUrl(e.target.value)}
                  placeholder="https://proof-image-url.jpg"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowOTPVerifyModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow">
                  Verify & Close Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
