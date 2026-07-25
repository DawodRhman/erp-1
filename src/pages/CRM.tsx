import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Plus,
  Building2,
  Mail,
  Phone,
  Search,
  CheckCircle2,
  Send,
  DollarSign,
  UserPlus,
  Shield,
} from 'lucide-react';
import { getApiBaseUrl } from '../config/apiConfig';
import { useToastContext } from '../context/ToastContext';

interface Customer {
  id: string;
  customer_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Lead {
  id: string;
  title: string;
  customer_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  status: string;
  created_at: string;
}

interface Quotation {
  id: string;
  quotation_number: string;
  customer_name?: string;
  price_tier: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  template_style: string;
  created_at: string;
}

export default function CRM() {
  const [activeTab, setActiveTab] = useState<'leads' | 'quotations' | 'customers'>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToastContext();

  // Modals
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // Forms
  const [customerForm, setCustomerForm] = useState({ customer_name: '', contact_person: '', email: '', phone: '', address: '' });
  const [leadForm, setLeadForm] = useState({ title: '', customer_id: '', contact_name: '', contact_email: '', contact_phone: '', notes: '' });
  const [quoteForm, setQuoteForm] = useState({
    customer_id: '',
    price_tier: 'TIER_A',
    template_style: 'Bank AL Habib',
    tax_rate: 18,
    items: [{ description: 'CCTV Camera System Installation & Configuration', quantity: 1, unit_price: 150000 }],
  });

  const apiBase = getApiBaseUrl();

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${apiBase}/inventory/customers`);
      const data = await res.json();
      if (data.success) setCustomers(data.data || []);
    } catch {
      showToast('Error loading customers', 'error');
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/crm/leads`);
      const data = await res.json();
      if (data.success) setLeads(data.data || []);
    } catch {
      showToast('Error loading leads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/crm/quotations`);
      const data = await res.json();
      if (data.success) setQuotations(data.data || []);
    } catch {
      showToast('Error loading quotations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    if (activeTab === 'leads') fetchLeads();
    else if (activeTab === 'quotations') fetchQuotations();
  }, [activeTab]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBase}/inventory/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast('New Customer registered by CSR!', 'success');
        setShowCustomerModal(false);
        setCustomerForm({ customer_name: '', contact_person: '', email: '', phone: '', address: '' });
        fetchCustomers();
      }
    } catch {
      showToast('Failed to register customer', 'error');
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBase}/crm/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast('New Lead created', 'success');
        setShowLeadModal(false);
        setLeadForm({ title: '', customer_id: '', contact_name: '', contact_email: '', contact_phone: '', notes: '' });
        fetchLeads();
      }
    } catch {
      showToast('Failed to create lead', 'error');
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedCustId = quoteForm.customer_id || customers[0]?.id || '808d1adb-a2a6-4545-97fc-cbef971f7db4';
      const subtotal = quoteForm.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
      const taxAmt = (subtotal * Number(quoteForm.tax_rate)) / 100;

      const res = await fetch(`${apiBase}/crm/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustId,
          price_tier: quoteForm.price_tier,
          template_style: quoteForm.template_style,
          tax_amount: taxAmt,
          items: quoteForm.items,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Quotation created & sent to client', 'success');
        setShowQuoteModal(false);
        fetchQuotations();
      }
    } catch {
      showToast('Failed to create quotation', 'error');
    }
  };

  const handleApproveQuote = async (id: string) => {
    try {
      const res = await fetch(`${apiBase}/crm/quotations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Quotation Approved! Handed off to Inventory for Dispatch.', 'success');
        fetchQuotations();
      }
    } catch {
      showToast('Error approving quotation', 'error');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#fff',
          padding: '24px 32px',
          borderRadius: '16px',
          marginBottom: '24px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 24px rgba(15,23,42,0.15)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={28} style={{ color: '#38bdf8' }} /> CSR & Sales CRM Management
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '14px' }}>
            Register new clients, manage sales leads, generate custom price-tiered quotations, and handoff approved jobs to Inventory.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowLeadModal(true)}
            style={{
              backgroundColor: '#6366f1',
              color: '#fff',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
            }}
          >
            <Plus size={18} /> + Add Sales Lead
          </button>
          <button
            onClick={() => setShowCustomerModal(true)}
            style={{
              backgroundColor: '#0284c7',
              color: '#fff',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(2,132,199,0.3)',
            }}
          >
            <UserPlus size={18} /> Register New Client
          </button>
          <button
            onClick={() => setShowQuoteModal(true)}
            style={{
              backgroundColor: '#10b981',
              color: '#fff',
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
            }}
          >
            <FileText size={18} /> Create Quotation
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('leads')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'leads' ? '#ffffff' : 'transparent',
            color: activeTab === 'leads' ? '#0f172a' : '#64748b',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: activeTab === 'leads' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Users size={16} /> Leads Pipeline ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('quotations')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'quotations' ? '#ffffff' : 'transparent',
            color: activeTab === 'quotations' ? '#0f172a' : '#64748b',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: activeTab === 'quotations' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileText size={16} /> Quotations Gallery ({quotations.length})
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'customers' ? '#ffffff' : 'transparent',
            color: activeTab === 'customers' ? '#0f172a' : '#64748b',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: activeTab === 'customers' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Building2 size={16} /> Registered Clients ({customers.length})
        </button>
      </div>

      {/* Leads Tab */}
      {activeTab === 'leads' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {leads.map((lead) => (
            <div
              key={lead.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span
                  style={{
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '700',
                  }}
                >
                  {lead.status}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {new Date(lead.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                {lead.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Building2 size={15} style={{ color: '#0284c7' }} /> {lead.contact_name || lead.customer_name || 'Direct Lead'}
              </p>
              {lead.contact_email && (
                <p style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} /> {lead.contact_email}
                </p>
              )}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setQuoteForm({ ...quoteForm, customer_id: lead.id });
                    setShowQuoteModal(true);
                  }}
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#0284c7',
                    border: '1px solid #cbd5e1',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Generate Quotation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quotations Tab */}
      {activeTab === 'quotations' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Quotation #</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Customer / Style</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Price Tier</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Total Amount</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: '#0f172a' }}>{q.quotation_number}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{q.customer_name || 'Bank Client'}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Format: {q.template_style}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                      {q.price_tier}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: '#0f172a' }}>
                    Rs {Number(q.total_amount).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        backgroundColor: q.status === 'APPROVED' ? '#dcfce7' : '#fef3c7',
                        color: q.status === 'APPROVED' ? '#166534' : '#92400e',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '700',
                      }}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {q.status !== 'APPROVED' ? (
                      <button
                        onClick={() => handleApproveQuote(q.id)}
                        style={{
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(16,185,129,0.2)',
                        }}
                      >
                        Approve & Send to Inventory
                      </button>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Dispatched to Inventory</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Registered Clients Tab */}
      {activeTab === 'customers' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>CSR Client Directory</h3>
            <button
              onClick={() => setShowCustomerModal(true)}
              style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
            >
              + Add Customer
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>Customer / Company</th>
                <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>Contact Person</th>
                <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>Email</th>
                <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>Phone</th>
                <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>Address</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontWeight: '700', color: '#0f172a' }}>{c.customer_name}</td>
                  <td style={{ padding: '12px' }}>{c.contact_person || '-'}</td>
                  <td style={{ padding: '12px' }}>{c.email || '-'}</td>
                  <td style={{ padding: '12px' }}>{c.phone || '-'}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{c.address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SOLID Crisp Modal: Add Sales Lead */}
      {showLeadModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', width: '520px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '18px' }}>+ Add Sales Lead / Inquiry</h2>
            <form onSubmit={handleCreateLead}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Select Registered Client (Optional)</label>
                <select
                  value={leadForm.customer_id}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const cust = customers.find((c) => c.id === selId);
                    setLeadForm({
                      ...leadForm,
                      customer_id: selId,
                      contact_name: cust ? cust.contact_person || cust.customer_name : leadForm.contact_name,
                      contact_email: cust ? cust.email || '' : leadForm.contact_email,
                      contact_phone: cust ? cust.phone || '' : leadForm.contact_phone,
                    });
                  }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                >
                  <option value="">-- Or Select Existing Registered Client --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_name} ({c.contact_person || 'Client'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Lead Title / Inquiry</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 50 CCTV Camera Installation for New Branch"
                  value={leadForm.title}
                  onChange={(e) => setLeadForm({ ...leadForm, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Contact Person</label>
                  <input
                    type="text"
                    placeholder="Name"
                    value={leadForm.contact_name}
                    onChange={(e) => setLeadForm({ ...leadForm, contact_name: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Phone</label>
                  <input
                    type="text"
                    placeholder="Phone number"
                    value={leadForm.contact_phone}
                    onChange={(e) => setLeadForm({ ...leadForm, contact_phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowLeadModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#6366f1', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  Create Sales Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOLID Crisp Modal: Register New Client */}
      {showCustomerModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', width: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '18px' }}>CSR Client Registration</h2>
            <form onSubmit={handleCreateCustomer}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Company / Client Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Bank AL Habib Ltd / Sindh Bank"
                  value={customerForm.customer_name}
                  onChange={(e) => setCustomerForm({ ...customerForm, customer_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Contact Person</label>
                <input
                  type="text"
                  placeholder="Manager / Representative"
                  value={customerForm.contact_person}
                  onChange={(e) => setCustomerForm({ ...customerForm, contact_person: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Email</label>
                  <input
                    type="email"
                    placeholder="client@bank.com"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Phone</label>
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Address</label>
                <input
                  type="text"
                  placeholder="Main Branch / Office Address"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowCustomerModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#0284c7', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  Register Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOLID Crisp Modal: Generate Quotation */}
      {showQuoteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', width: '580px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '18px' }}>Generate Client Quotation</h2>
            <form onSubmit={handleCreateQuote}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Select Client</label>
                <select
                  value={quoteForm.customer_id}
                  onChange={(e) => setQuoteForm({ ...quoteForm, customer_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                >
                  <option value="">-- Choose Registered Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.customer_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Price Tier</label>
                  <select
                    value={quoteForm.price_tier}
                    onChange={(e) => setQuoteForm({ ...quoteForm, price_tier: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  >
                    <option value="TIER_A">Price Tier A (Standard)</option>
                    <option value="TIER_B">Price Tier B (Corporate)</option>
                    <option value="TIER_C">Price Tier C (Government)</option>
                    <option value="TIER_D">Price Tier D (VIP Client)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Quotation Template Style</label>
                  <select
                    value={quoteForm.template_style}
                    onChange={(e) => setQuoteForm({ ...quoteForm, template_style: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  >
                    <option value="Bank AL Habib">Bank AL Habib Format</option>
                    <option value="Sindh Bank">Sindh Bank Format</option>
                    <option value="Jamat Khana">Jamat Khana Format</option>
                    <option value="DC Office">DC Office Format</option>
                    <option value="Private">Private Customer Format</option>
                    <option value="Privat quotation on GST">Private GST Format</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>Line Items</h4>
                {quoteForm.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...quoteForm.items];
                        newItems[idx].description = e.target.value;
                        setQuoteForm({ ...quoteForm, items: newItems });
                      }}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '13px' }}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...quoteForm.items];
                        newItems[idx].quantity = Number(e.target.value);
                        setQuoteForm({ ...quoteForm, items: newItems });
                      }}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '13px' }}
                    />
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unit_price}
                      onChange={(e) => {
                        const newItems = [...quoteForm.items];
                        newItems[idx].unit_price = Number(e.target.value);
                        setQuoteForm({ ...quoteForm, items: newItems });
                      }}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '13px' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowQuoteModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  Generate & Send Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
