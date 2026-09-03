import React, { useState, useEffect, useMemo } from 'react';
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
  Edit,
  Trash2,
} from 'lucide-react';
import { useToastContext } from '../context/ToastContext';
import { apiClient } from '../services/apiClient';

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
  customer_id?: string;
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
  customer_id?: string;
  customer_name?: string;
  price_tier: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  template_style: string;
  created_at: string;
}

interface PipelineItem {
  id: string;
  source: 'lead' | 'quotation';
  title: string;
  customerName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: string;
  createdAt: string;
  amount?: number;
  quotationNumber?: string;
  templateStyle?: string;
  customerId?: string;
}

interface ProductOption {
  id: string;
  product_name: string;
  category_name?: string;
  product_type?: string;
  tracking_type?: string;
  unit_price?: number;
  quantity?: number;
}

interface QuoteLineItem {
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

const emptyQuoteItem = (): QuoteLineItem => ({
  product_id: '',
  description: '',
  quantity: 1,
  unit_price: 0,
});

export default function CRM() {
  const [activeTab, setActiveTab] = useState<'leads' | 'quotations' | 'customers'>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToastContext();

  // Modals
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [selectedCrmItem, setSelectedCrmItem] = useState<PipelineItem | null>(null);

  // Forms
  const [customerForm, setCustomerForm] = useState({ customer_name: '', contact_person: '', email: '', phone: '', address: '' });
  const [leadForm, setLeadForm] = useState({ title: '', customer_id: '', contact_name: '', contact_email: '', contact_phone: '', notes: '' });
  const [quoteForm, setQuoteForm] = useState({
    customer_id: '',
    price_tier: 'TIER_A',
    template_style: 'HBL Sales Tax Invoice',
    tax_rate: 18,
    items: [emptyQuoteItem()],
  });

  const fetchCustomers = async () => {
    try {
      const res = await apiClient.get('/crm/customers');
      setCustomers(res.data.data || []);
    } catch {
      showToast('Error loading customers', 'error');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/crm/products');
      setProducts(res.data.data || []);
    } catch {
      showToast('Error loading quotation products', 'error');
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/crm/leads');
      setLeads(res.data.data || []);
    } catch {
      showToast('Error loading leads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/crm/quotations');
      setQuotations(res.data.data || []);
    } catch {
      showToast('Error loading quotations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchLeads();
    fetchQuotations();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const quoteSubtotal = quoteForm.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0
  );
  const quoteTaxAmount = (quoteSubtotal * Number(quoteForm.tax_rate || 0)) / 100;
  const quoteGrandTotal = quoteSubtotal + quoteTaxAmount;

  const updateQuoteItem = (idx: number, patch: Partial<QuoteLineItem>) => {
    const newItems = [...quoteForm.items];
    newItems[idx] = { ...newItems[idx], ...patch };
    setQuoteForm({ ...quoteForm, items: newItems });
  };

  const handleQuoteProductChange = (idx: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    updateQuoteItem(idx, {
      product_id: productId,
      description: product?.product_name || '',
      unit_price: Number(product?.unit_price || 0),
    });
  };

  const resetCustomerForm = () => {
    setCustomerForm({ customer_name: '', contact_person: '', email: '', phone: '', address: '' });
    setEditingCustomerId(null);
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomerId) {
        await apiClient.patch(`/crm/customers/${editingCustomerId}`, customerForm);
        showToast('Client updated successfully', 'success');
      } else {
        await apiClient.post('/crm/customers', customerForm);
        showToast('New customer registered by CSR', 'success');
      }
      setShowCustomerModal(false);
      resetCustomerForm();
      fetchCustomers();
    } catch {
      showToast(editingCustomerId ? 'Failed to update client' : 'Failed to register customer', 'error');
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    setCustomerForm({
      customer_name: customer.customer_name || '',
      contact_person: customer.contact_person || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setShowCustomerModal(true);
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`Delete client "${customer.customer_name}"? Linked quotations/invoices will block unsafe deletion.`)) return;
    try {
      await apiClient.delete(`/crm/customers/${customer.id}`);
      showToast('Client deleted', 'success');
      fetchCustomers();
      fetchLeads();
      fetchQuotations();
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || 'Unable to delete client. It may have linked records.';
      showToast(message, 'error');
    }
  };

  const selectCustomerForLead = (customer: Customer) => {
    setLeadForm({
      title: `${customer.customer_name} inquiry`,
      customer_id: customer.id,
      contact_name: customer.contact_person || customer.customer_name,
      contact_email: customer.email || '',
      contact_phone: customer.phone || '',
      notes: '',
    });
    setShowLeadModal(true);
  };

  const selectCustomerForQuote = (customer: Customer) => {
    setQuoteForm((prev) => ({
      ...prev,
      customer_id: customer.id,
    }));
    setShowQuoteModal(true);
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/crm/leads', leadForm);
      showToast('New lead created', 'success');
      setShowLeadModal(false);
      setLeadForm({ title: '', customer_id: '', contact_name: '', contact_email: '', contact_phone: '', notes: '' });
      fetchLeads();
    } catch {
      showToast('Failed to create lead', 'error');
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedCustId = quoteForm.customer_id;
      if (!selectedCustId) {
        showToast('Please select a customer before creating a quotation', 'error');
        return;
      }
      const invalidItem = quoteForm.items.some((item) => !item.product_id || Number(item.quantity) <= 0 || Number(item.unit_price) < 0);
      if (invalidItem) {
        showToast('Please select a product/service and enter valid quantity and price for every line item', 'error');
        return;
      }

      await apiClient.post('/crm/quotations', {
        customer_id: selectedCustId,
        price_tier: quoteForm.price_tier,
        template_style: quoteForm.template_style,
        tax_amount: quoteTaxAmount,
        items: quoteForm.items,
      });
      showToast('Quotation created and ready for client approval', 'success');
      setShowQuoteModal(false);
      setQuoteForm({
        customer_id: '',
        price_tier: 'TIER_A',
        template_style: 'HBL Sales Tax Invoice',
        tax_rate: 18,
        items: [emptyQuoteItem()],
      });
      fetchQuotations();
      fetchLeads();
    } catch {
      showToast('Failed to create quotation', 'error');
    }
  };

  const handleUpdateQuoteStatus = async (id: string, status: string, successMessage: string) => {
    try {
      await apiClient.patch(`/crm/quotations/${id}/status`, { status });
      showToast(successMessage, 'success');
      fetchQuotations();
      fetchLeads();
    } catch {
      showToast('Unable to update quotation status', 'error');
    }
  };

  const handleSendQuoteToClient = (id: string) =>
    handleUpdateQuoteStatus(id, 'SENT', 'Quotation sent to client');

  const handleApproveQuote = (id: string) =>
    handleUpdateQuoteStatus(id, 'APPROVED', 'Client approved. Job sent to inventory queue');

  const quotationToPipelineItem = (quote: Quotation): PipelineItem => ({
    id: `quote-${quote.id}`,
    source: 'quotation',
    title: quote.quotation_number,
    customerName: quote.customer_name || 'Bank Client',
    status: quote.status || 'DRAFT',
    createdAt: quote.created_at,
    amount: quote.total_amount,
    quotationNumber: quote.quotation_number,
    templateStyle: quote.template_style,
    customerId: quote.customer_id,
  });

  const getQuoteStatusStyle = (status: string) => {
    if (status === 'APPROVED') return { backgroundColor: '#dcfce7', color: '#166534' };
    if (status === 'SENT') return { backgroundColor: '#dbeafe', color: '#1e40af' };
    if (status === 'REJECTED') return { backgroundColor: '#fee2e2', color: '#991b1b' };
    return { backgroundColor: '#fef3c7', color: '#92400e' };
  };

  const pipelineItems = useMemo<PipelineItem[]>(() => {
    const leadCards = leads.map((lead) => ({
      id: `lead-${lead.id}`,
      source: 'lead' as const,
      title: lead.title,
      customerName: lead.customer_name || lead.contact_name || 'Direct Lead',
      contactEmail: lead.contact_email,
      contactPhone: lead.contact_phone,
      status: lead.status || 'NEW',
      createdAt: lead.created_at,
      customerId: lead.customer_id,
    }));

    const quotationCards = quotations.map((quote) => quotationToPipelineItem(quote));

    return [...leadCards, ...quotationCards]
      .filter((item) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.trim().toLowerCase();
        return [
          item.title,
          item.customerName,
          item.status,
          item.contactEmail,
          item.contactPhone,
          item.quotationNumber,
          item.templateStyle,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [leads, quotations, searchTerm]);

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) =>
      [
        customer.customer_name,
        customer.contact_person,
        customer.email,
        customer.phone,
        customer.address,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [customers, searchTerm]);

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
          <Users size={16} /> Leads Pipeline ({pipelineItems.length})
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
        <div style={{ display: 'grid', gap: '18px' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search leads, quotation no, customer, status..."
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <span style={{ padding: '8px 11px', borderRadius: '999px', backgroundColor: '#eef2ff', color: '#4338ca', fontSize: '12px', fontWeight: 900, whiteSpace: 'nowrap' }}>
              {leads.length} direct leads
            </span>
            <span style={{ padding: '8px 11px', borderRadius: '999px', backgroundColor: '#ecfdf5', color: '#047857', fontSize: '12px', fontWeight: 900, whiteSpace: 'nowrap' }}>
              {quotations.length} quotations
            </span>
          </div>

          {pipelineItems.length === 0 ? (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1', padding: '42px', textAlign: 'center', color: '#64748b' }}>
              <Users size={42} style={{ color: '#94a3b8', marginBottom: '10px' }} />
              <h3 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '18px', fontWeight: 900 }}>No pipeline records yet</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>Add a sales lead or create a quotation. It will appear here automatically.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {pipelineItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedCrmItem(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedCrmItem(item);
                    }
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    padding: '20px',
                    border: item.source === 'quotation' ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                    boxShadow: '0 2px 10px rgba(15,23,42,0.05)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
                    <span
                      style={{
                        backgroundColor: item.source === 'quotation' ? '#dbeafe' : '#eef2ff',
                        color: item.source === 'quotation' ? '#1e40af' : '#4338ca',
                        padding: '5px 10px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.source === 'quotation' ? 'Quotation Flow' : 'Sales Lead'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 6px' }}>
                    <Building2 size={15} style={{ color: '#0284c7' }} /> {item.customerName || 'Direct Lead'}
                  </p>
                  {item.contactEmail && (
                    <p style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 4px' }}>
                      <Mail size={14} /> {item.contactEmail}
                    </p>
                  )}
                  {item.contactPhone && (
                    <p style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <Phone size={14} /> {item.contactPhone}
                    </p>
                  )}

                  {item.source === 'quotation' && (
                    <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>STATUS</div>
                        <div style={{ marginTop: '4px', fontWeight: 900, color: getQuoteStatusStyle(item.status).color }}>{item.status}</div>
                      </div>
                      <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>VALUE</div>
                        <div style={{ marginTop: '4px', fontWeight: 900, color: '#0f172a' }}>{formatCurrency(item.amount || 0)}</div>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                    {item.source === 'lead' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuoteForm({ ...quoteForm, customer_id: item.customerId || '' });
                          setShowQuoteModal(true);
                        }}
                        style={{
                          backgroundColor: '#f8fafc',
                          color: '#0284c7',
                          border: '1px solid #cbd5e1',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Generate Quotation
                      </button>
                    ) : (
                      <>
                        {item.status === 'DRAFT' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendQuoteToClient(item.id.replace('quote-', ''));
                            }}
                            style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
                          >
                            Send to Client
                          </button>
                        )}
                        {item.status !== 'APPROVED' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveQuote(item.id.replace('quote-', ''));
                            }}
                            style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
                          >
                            Client Approved / Send to Inventory
                          </button>
                        ) : (
                          <span style={{ color: '#047857', backgroundColor: '#dcfce7', padding: '8px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 900 }}>
                            Inventory queue ready
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <tr
                  key={q.id}
                  onClick={() => setSelectedCrmItem(quotationToPipelineItem(q))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedCrmItem(quotationToPipelineItem(q));
                    }
                  }}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                >
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: '#0f172a' }}>
                    <span style={{ color: '#1d4ed8', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{q.quotation_number}</span>
                  </td>
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
                        ...getQuoteStatusStyle(q.status),
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
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {q.status === 'DRAFT' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendQuoteToClient(q.id);
                          }}
                          style={{
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(37,99,235,0.2)',
                          }}
                        >
                          Send to Client
                        </button>
                      )}
                      {q.status !== 'APPROVED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveQuote(q.id);
                          }}
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
                          Client Approved / Send to Inventory
                        </button>
                      )}
                      {q.status === 'APPROVED' && (
                        <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Inventory queue ready</span>
                      )}
                    </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>CSR Client Directory</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12px' }}>
                Select a client directly for lead or quotation, or maintain client master data.
              </p>
            </div>
            <button
              onClick={() => {
                resetCustomerForm();
                setShowCustomerModal(true);
              }}
              style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
            >
              + Add Customer
            </button>
          </div>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search client by name, email, phone, contact person..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 38px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13.5px', fontWeight: '600' }}
            />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>Customer / Company</th>
                <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>Contact Person</th>
                <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>Email</th>
                <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>Phone</th>
                <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>Address</th>
                <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontWeight: '700', color: '#0f172a' }}>{c.customer_name}</td>
                  <td style={{ padding: '12px' }}>{c.contact_person || '-'}</td>
                  <td style={{ padding: '12px' }}>{c.email || '-'}</td>
                  <td style={{ padding: '12px' }}>{c.phone || '-'}</td>
                  <td style={{ padding: '12px', color: '#64748b' }}>{c.address || '-'}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => selectCustomerForQuote(c)}
                        style={{ border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', borderRadius: '8px', padding: '7px 10px', fontWeight: 800, cursor: 'pointer', fontSize: '12px' }}
                      >
                        Select for Quote
                      </button>
                      <button
                        type="button"
                        onClick={() => selectCustomerForLead(c)}
                        style={{ border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', borderRadius: '8px', padding: '7px 10px', fontWeight: 800, cursor: 'pointer', fontSize: '12px' }}
                      >
                        Select for Lead
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditCustomer(c)}
                        aria-label={`Edit ${c.customer_name}`}
                        style={{ border: '1px solid #bae6fd', background: '#f0f9ff', color: '#0369a1', borderRadius: '8px', padding: '7px 9px', cursor: 'pointer' }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomer(c)}
                        aria-label={`Delete ${c.customer_name}`}
                        style={{ border: '1px solid #fecaca', background: '#fff1f2', color: '#dc2626', borderRadius: '8px', padding: '7px 9px', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '28px 12px', textAlign: 'center', color: '#64748b' }}>
                    No client found for this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CRM Item Detail */}
      {selectedCrmItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.62)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, padding: '20px' }}>
          <div style={{ width: 'min(680px, 100%)', backgroundColor: '#ffffff', borderRadius: '18px', boxShadow: '0 24px 60px rgba(15,23,42,0.28)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '22px 24px', background: selectedCrmItem.source === 'quotation' ? 'linear-gradient(135deg,#eff6ff,#eef2ff)' : 'linear-gradient(135deg,#f8fafc,#eef2ff)', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', backgroundColor: selectedCrmItem.source === 'quotation' ? '#dbeafe' : '#e0e7ff', color: selectedCrmItem.source === 'quotation' ? '#1d4ed8' : '#4338ca', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase' }}>
                    {selectedCrmItem.source === 'quotation' ? <FileText size={14} /> : <Users size={14} />}
                    {selectedCrmItem.source === 'quotation' ? 'Quotation Detail' : 'Lead Detail'}
                  </span>
                  <h2 style={{ margin: '14px 0 6px', color: '#0f172a', fontSize: '22px', fontWeight: 900 }}>{selectedCrmItem.title}</h2>
                  <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>
                    {selectedCrmItem.customerName || 'Direct Lead'} {selectedCrmItem.createdAt ? `- ${new Date(selectedCrmItem.createdAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCrmItem(null)}
                  style={{ border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontWeight: 800 }}
                >
                  Close
                </button>
              </div>
            </div>

            <div style={{ padding: '22px 24px', display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 900, textTransform: 'uppercase' }}>Customer</div>
                  <div style={{ marginTop: '6px', color: '#0f172a', fontWeight: 900 }}>{selectedCrmItem.customerName || 'Direct Lead'}</div>
                </div>
                <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 900, textTransform: 'uppercase' }}>Status</div>
                  <div style={{ marginTop: '6px', fontWeight: 900, color: getQuoteStatusStyle(selectedCrmItem.status).color }}>{selectedCrmItem.status}</div>
                </div>
                {selectedCrmItem.source === 'quotation' && (
                  <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 900, textTransform: 'uppercase' }}>Value</div>
                    <div style={{ marginTop: '6px', color: '#0f172a', fontWeight: 900 }}>{formatCurrency(selectedCrmItem.amount || 0)}</div>
                  </div>
                )}
              </div>

              {(selectedCrmItem.contactEmail || selectedCrmItem.contactPhone || selectedCrmItem.templateStyle) && (
                <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', display: 'grid', gap: '8px' }}>
                  {selectedCrmItem.contactEmail && <div style={{ color: '#475569', fontSize: '13px' }}><Mail size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{selectedCrmItem.contactEmail}</div>}
                  {selectedCrmItem.contactPhone && <div style={{ color: '#475569', fontSize: '13px' }}><Phone size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{selectedCrmItem.contactPhone}</div>}
                  {selectedCrmItem.templateStyle && <div style={{ color: '#475569', fontSize: '13px' }}><FileText size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Template: {selectedCrmItem.templateStyle}</div>}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
                {selectedCrmItem.source === 'lead' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuoteForm({ ...quoteForm, customer_id: selectedCrmItem.customerId || '' });
                      setSelectedCrmItem(null);
                      setShowQuoteModal(true);
                    }}
                    style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 900, cursor: 'pointer' }}
                  >
                    Generate Quotation
                  </button>
                ) : (
                  <>
                    {selectedCrmItem.status === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => {
                          handleSendQuoteToClient(selectedCrmItem.id.replace('quote-', ''));
                          setSelectedCrmItem(null);
                        }}
                        style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 900, cursor: 'pointer' }}
                      >
                        Send to Client
                      </button>
                    )}
                    {selectedCrmItem.status !== 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => {
                          handleApproveQuote(selectedCrmItem.id.replace('quote-', ''));
                          setSelectedCrmItem(null);
                        }}
                        style={{ backgroundColor: '#10b981', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 900, cursor: 'pointer' }}
                      >
                        Client Approved / Send to Inventory
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
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
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '18px' }}>
              {editingCustomerId ? 'Edit Client Details' : 'CSR Client Registration'}
            </h2>
            <form onSubmit={handleSubmitCustomer}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Company / Client Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Habib Bank Limited"
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
                <button type="button" onClick={() => { setShowCustomerModal(false); resetCustomerForm(); }} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#0284c7', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  {editingCustomerId ? 'Save Changes' : 'Register Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOLID Crisp Modal: Generate Quotation */}
      {showQuoteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', width: 'min(960px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.28)', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f8fafc 0%, #eef6ff 100%)', borderRadius: '18px 18px 0 0' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Generate Client Quotation</h2>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>Select a registered client, choose product/service lines from inventory, then save a clean quotation draft.</p>
            </div>
            <form onSubmit={handleCreateQuote}>
              <div style={{ padding: '24px 28px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Select Client</label>
                <select
                  required
                  value={quoteForm.customer_id}
                  onChange={(e) => setQuoteForm({ ...quoteForm, customer_id: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '14px', outline: 'none' }}
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
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '14px' }}
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
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '14px' }}
                  >
                    <option value="HBL Sales Tax Invoice">HBL Sales Tax Invoice</option>
                    <option value="Private Customer Quote">Private Customer Quote</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Line Items</h4>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0' }}>Choose products/services from catalog. Prices stay editable for quotation changes.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuoteForm({ ...quoteForm, items: [...quoteForm.items, emptyQuoteItem()] })}
                    style={{ padding: '8px 12px', borderRadius: '9px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    + Add Line
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.8fr) minmax(72px, 0.5fr) minmax(110px, 0.8fr) minmax(120px, 0.9fr) 42px', gap: '10px', color: '#64748b', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '0 4px 8px' }}>
                  <span>Product / Service</span>
                  <span>Qty</span>
                  <span>Unit Price</span>
                  <span>Line Total</span>
                  <span></span>
                </div>
                {quoteForm.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.8fr) minmax(72px, 0.5fr) minmax(110px, 0.8fr) minmax(120px, 0.9fr) 42px', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                    <select
                      required
                      value={item.product_id}
                      onChange={(e) => handleQuoteProductChange(idx, e.target.value)}
                      style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '13px' }}
                    >
                      <option value="">Select product/service</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.product_name} {product.category_name ? `- ${product.category_name}` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateQuoteItem(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '13px', textAlign: 'right' }}
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Unit Price"
                      value={item.unit_price}
                      onChange={(e) => updateQuoteItem(idx, { unit_price: Math.max(0, Number(e.target.value) || 0) })}
                      style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontSize: '13px', textAlign: 'right' }}
                    />
                    <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #dbeafe', backgroundColor: '#eff6ff', color: '#1e3a8a', fontSize: '13px', fontWeight: '800', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {formatCurrency(Number(item.quantity || 0) * Number(item.unit_price || 0))}
                    </div>
                    <button
                      type="button"
                      disabled={quoteForm.items.length === 1}
                      onClick={() => setQuoteForm({ ...quoteForm, items: quoteForm.items.filter((_, lineIdx) => lineIdx !== idx) })}
                      style={{ width: '38px', height: '38px', borderRadius: '10px', border: '1px solid #fecaca', background: quoteForm.items.length === 1 ? '#f8fafc' : '#fff1f2', color: quoteForm.items.length === 1 ? '#cbd5e1' : '#dc2626', cursor: quoteForm.items.length === 1 ? 'not-allowed' : 'pointer', fontWeight: '900' }}
                    >
                      x
                    </button>
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '16px', marginTop: '16px', alignItems: 'start' }}>
                  <div style={{ padding: '12px', borderRadius: '12px', background: '#ffffff', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '13px' }}>
                    Tip: The product dropdown comes from the inventory catalog. If a product is missing, add it in Inventory Logistics first.
                  </div>
                  <div style={{ padding: '14px', borderRadius: '12px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#475569' }}>
                      <span>Subtotal</span>
                      <strong>{formatCurrency(quoteSubtotal)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '13px', color: '#475569' }}>
                      <span>GST</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={quoteForm.tax_rate}
                          onChange={(e) => setQuoteForm({ ...quoteForm, tax_rate: Math.max(0, Number(e.target.value) || 0) })}
                          style={{ width: '66px', boxSizing: 'border-box', padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'right' }}
                        />
                        <strong>{formatCurrency(quoteTaxAmount)}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '15px', color: '#0f172a' }}>
                      <span style={{ fontWeight: '900' }}>Grand Total</span>
                      <strong>{formatCurrency(quoteGrandTotal)}</strong>
                    </div>
                  </div>
                </div>
              </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '18px 28px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '0 0 18px 18px' }}>
                <button type="button" onClick={() => setShowQuoteModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  Generate Quotation Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
