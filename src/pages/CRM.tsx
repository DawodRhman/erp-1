import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Plus,
  Send,
  CheckCircle,
  Clock,
  Building2,
  DollarSign,
  Mail,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { getApiBaseUrl } from '../config/apiConfig';
import { useToastContext } from '../context/ToastContext';

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
  const [activeTab, setActiveTab] = useState<'leads' | 'quotations'>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToastContext();

  // Modals
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // Form states
  const [leadForm, setLeadForm] = useState({ title: '', contact_name: '', contact_email: '', contact_phone: '', notes: '' });
  const [quoteForm, setQuoteForm] = useState({
    customer_name: '',
    price_tier: 'TIER_A',
    template_style: 'Bank AL Habib',
    tax_rate: 18,
    items: [{ description: 'CCTV Installation & Equipment', quantity: 1, unit_price: 150000 }],
  });

  const apiBase = getApiBaseUrl();

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
    if (activeTab === 'leads') fetchLeads();
    else fetchQuotations();
  }, [activeTab]);

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
        showToast('Lead created successfully', 'success');
        setShowLeadModal(false);
        setLeadForm({ title: '', contact_name: '', contact_email: '', contact_phone: '', notes: '' });
        fetchLeads();
      }
    } catch {
      showToast('Failed to create lead', 'error');
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBase}/crm/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: '808d1adb-a2a6-4545-97fc-cbef971f7db4', // Demo customer fallback
          price_tier: quoteForm.price_tier,
          template_style: quoteForm.template_style,
          tax_amount: (quoteForm.items.reduce((s, i) => s + i.quantity * i.unit_price, 0) * quoteForm.tax_rate) / 100,
          items: quoteForm.items,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Quotation created & ready for dispatch', 'success');
        setShowQuoteModal(false);
        fetchQuotations();
      }
    } catch {
      showToast('Failed to create quotation', 'error');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`${apiBase}/crm/quotations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Quotation status updated to ${status}`, 'success');
        fetchQuotations();
      }
    } catch {
      showToast('Error updating quotation', 'error');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--t1)' }}>CRM & Customer Sales</h1>
          <p style={{ color: 'var(--t3)', marginTop: '4px' }}>
            Manage leads, generate custom client quotations with price tiers, and trigger inventory dispatch.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {activeTab === 'leads' ? (
            <button
              onClick={() => setShowLeadModal(true)}
              style={{
                backgroundColor: 'var(--p1)',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600',
              }}
            >
              <Plus size={18} /> New Lead
            </button>
          ) : (
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
              }}
            >
              <FileText size={18} /> Create Quotation
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--b2)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('leads')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'leads' ? '2px solid var(--p1)' : 'none',
            color: activeTab === 'leads' ? 'var(--p1)' : 'var(--t3)',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Users size={18} /> Leads Pipeline ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('quotations')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'quotations' ? '2px solid var(--p1)' : 'none',
            color: activeTab === 'quotations' ? 'var(--p1)' : 'var(--t3)',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileText size={18} /> Quotations Gallery ({quotations.length})
        </button>
      </div>

      {/* Leads Tab Content */}
      {activeTab === 'leads' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {leads.map((lead) => (
            <div
              key={lead.id}
              style={{
                backgroundColor: 'var(--bg2)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid var(--b2)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: '#3b82f6',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {lead.status}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--t3)' }}>
                  {new Date(lead.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--t1)', marginBottom: '8px' }}>
                {lead.title}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={14} /> {lead.contact_name || 'Individual Client'}
              </p>
              {lead.contact_email && (
                <p style={{ fontSize: '13px', color: 'var(--t3)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} /> {lead.contact_email}
                </p>
              )}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--b2)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setQuoteForm({ ...quoteForm, customer_name: lead.contact_name || lead.title });
                    setShowQuoteModal(true);
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--p1)',
                    border: '1px solid var(--p1)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
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

      {/* Quotations Tab Content */}
      {activeTab === 'quotations' && (
        <div style={{ overflowX: 'auto', backgroundColor: 'var(--bg2)', borderRadius: '12px', border: '1px solid var(--b2)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--b2)', backgroundColor: 'var(--bg3)' }}>
                <th style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--t3)' }}>Quotation #</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--t3)' }}>Customer / Style</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--t3)' }}>Price Tier</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--t3)' }}>Total Amount</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--t3)' }}>Status</th>
                <th style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--t3)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id} style={{ borderBottom: '1px solid var(--b2)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--t1)' }}>{q.quotation_number}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '500', color: 'var(--t1)' }}>{q.customer_name || 'Client'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--t3)' }}>Template: {q.template_style}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                      {q.price_tier}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--t1)' }}>
                    Rs {Number(q.total_amount).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ backgroundColor: q.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: q.status === 'APPROVED' ? '#10b981' : '#f59e0b', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                      {q.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {q.status !== 'APPROVED' ? (
                      <button
                        onClick={() => handleStatusChange(q.id, 'APPROVED')}
                        style={{
                          backgroundColor: '#10b981',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Approve & Dispatch to Inventory
                      </button>
                    ) : (
                      <span style={{ color: 'var(--t3)', fontSize: '13px' }}>Handed off to Inventory</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Lead Modal */}
      {showLeadModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg2)', borderRadius: '12px', padding: '24px', width: '450px', border: '1px solid var(--b2)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Create New Lead</h2>
            <form onSubmit={handleCreateLead}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--t3)', marginBottom: '4px' }}>Lead Title / Project</label>
                <input
                  required
                  type="text"
                  value={leadForm.title}
                  onChange={(e) => setLeadForm({ ...leadForm, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--b2)', backgroundColor: 'var(--bg3)', color: 'var(--t1)' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--t3)', marginBottom: '4px' }}>Client / Contact Name</label>
                <input
                  type="text"
                  value={leadForm.contact_name}
                  onChange={(e) => setLeadForm({ ...leadForm, contact_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--b2)', backgroundColor: 'var(--bg3)', color: 'var(--t1)' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--t3)', marginBottom: '4px' }}>Contact Email</label>
                <input
                  type="email"
                  value={leadForm.contact_email}
                  onChange={(e) => setLeadForm({ ...leadForm, contact_email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--b2)', backgroundColor: 'var(--bg3)', color: 'var(--t1)' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowLeadModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--b2)', background: 'none', color: 'var(--t2)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--p1)', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Quotation Modal */}
      {showQuoteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg2)', borderRadius: '12px', padding: '24px', width: '550px', border: '1px solid var(--b2)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Generate Client Quotation</h2>
            <form onSubmit={handleCreateQuote}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--t3)', marginBottom: '4px' }}>Price Tier</label>
                  <select
                    value={quoteForm.price_tier}
                    onChange={(e) => setQuoteForm({ ...quoteForm, price_tier: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--b2)', backgroundColor: 'var(--bg3)', color: 'var(--t1)' }}
                  >
                    <option value="TIER_A">Price Tier A (Standard)</option>
                    <option value="TIER_B">Price Tier B (Corporate)</option>
                    <option value="TIER_C">Price Tier C (Government)</option>
                    <option value="TIER_D">Price Tier D (VIP Client)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--t3)', marginBottom: '4px' }}>Template Style</label>
                  <select
                    value={quoteForm.template_style}
                    onChange={(e) => setQuoteForm({ ...quoteForm, template_style: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--b2)', backgroundColor: 'var(--bg3)', color: 'var(--t1)' }}
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

              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Quotation Line Item</h4>
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
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--b2)', backgroundColor: 'var(--bg3)', color: 'var(--t1)' }}
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
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--b2)', backgroundColor: 'var(--bg3)', color: 'var(--t1)' }}
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
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--b2)', backgroundColor: 'var(--bg3)', color: 'var(--t1)' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowQuoteModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--b2)', background: 'none', color: 'var(--t2)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>
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
