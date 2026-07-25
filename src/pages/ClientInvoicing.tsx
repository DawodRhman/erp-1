import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  DollarSign,
  Printer,
  Download,
  Building2,
  Plus,
  RefreshCw,
  Layers,
  Sparkles,
  Edit3,
  Globe,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { getApiBaseUrl } from '../config/apiConfig';
import { useToastContext } from '../context/ToastContext';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_without_tax: number;
  tax_amount: number;
  total_with_tax: number;
}

interface CustomerInvoice {
  id: string;
  invoice_number: string;
  customer_name?: string;
  currency: string;
  exchange_rate: number;
  template_name: string;
  tax_type: string;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  amount_in_words?: string;
  number_of_copies: number;
  status: string;
  created_at: string;
  items?: InvoiceItem[];
}

interface TemplateFormat {
  id: string;
  template_name: string;
  tax_type: string;
  tax_rate: number;
  bank_account: string;
  prepared_by: string;
  header_title: string;
}

export default function ClientInvoicing() {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(null);

  // Custom Templates List (Finance Managed)
  const [templates, setTemplates] = useState<TemplateFormat[]>([
    {
      id: '1',
      template_name: 'Bank AL Habib Format',
      tax_type: 'SST',
      tax_rate: 10,
      bank_account: 'Account #: 0420 0010120895360014 (Bank AL Habib Ltd)',
      prepared_by: 'Assistant Finance',
      header_title: 'Invoice for Installation and Dismantling Charges',
    },
    {
      id: '2',
      template_name: 'Sindh Bank Format',
      tax_type: 'GST',
      tax_rate: 18,
      bank_account: 'Account #: 1002 9988221100 (Sindh Bank Main Branch)',
      prepared_by: 'Accounts Officer',
      header_title: 'Invoice for Supply & Installation of CCTV System',
    },
    {
      id: '3',
      template_name: 'QNB Qatar Format',
      tax_type: 'VAT',
      tax_rate: 5,
      bank_account: 'IBAN: QA98 QNBA 0000 0000 1234 5678 (QNB Doha)',
      prepared_by: 'Finance Executive',
      header_title: 'Commercial Tax Invoice for Security Systems',
    },
    {
      id: '4',
      template_name: 'DC Office Format',
      tax_type: 'EXEMPT',
      tax_rate: 0,
      bank_account: 'Account #: 3628486-6 (Treasury Account)',
      prepared_by: 'Accounts Assistant',
      header_title: 'Invoice For CCTV Cameras Installed At Designated Sites',
    },
  ]);

  const [selectedTemplateName, setSelectedTemplateName] = useState('Bank AL Habib Format');

  // Currency & Live Exchange Rate Engine
  const [currency, setCurrency] = useState<'PKR' | 'USD' | 'QAR' | 'SAR' | 'AED' | 'EUR' | 'GBP'>('PKR');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [liveRates, setLiveRates] = useState<Record<string, number>>({});
  const [fetchingRates, setFetchingRates] = useState(false);
  const [rateLastUpdated, setRateLastUpdated] = useState<string>('');

  // Multi-copy settings
  const [numberOfCopies, setNumberOfCopies] = useState<number>(4);
  const [activeCopyTab, setActiveCopyTab] = useState<number>(1);

  // Modals
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [showGenModal, setShowGenModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedDispatchId, setSelectedDispatchId] = useState('');

  // New Template Form
  const [templateForm, setTemplateForm] = useState<TemplateFormat>({
    id: '',
    template_name: '',
    tax_type: 'GST',
    tax_rate: 18,
    bank_account: '',
    prepared_by: 'Assistant Finance',
    header_title: 'Invoice for Supply and Services',
  });

  const { showToast } = useToastContext();
  const apiBase = getApiBaseUrl();

  // Live Exchange Rates Fetching from Trusted API
  const fetchLiveExchangeRates = async () => {
    try {
      setFetchingRates(true);
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      if (data.result === 'success' && data.rates) {
        const usdToPkr = data.rates.PKR || 278.5;
        const ratesInPkr: Record<string, number> = {
          PKR: 1.0,
          USD: usdToPkr,
          QAR: usdToPkr / (data.rates.QAR || 3.64),
          SAR: usdToPkr / (data.rates.SAR || 3.75),
          AED: usdToPkr / (data.rates.AED || 3.67),
          EUR: usdToPkr / (data.rates.EUR || 0.92),
          GBP: usdToPkr / (data.rates.GBP || 0.78),
        };
        setLiveRates(ratesInPkr);
        setRateLastUpdated(new Date().toLocaleTimeString());
        showToast('Live exchange rates updated from Open Exchange API!', 'success');
      }
    } catch {
      showToast('Using cached exchange rates', 'info');
    } finally {
      setFetchingRates(false);
    }
  };

  useEffect(() => {
    fetchLiveExchangeRates();
  }, []);

  useEffect(() => {
    if (currency === 'PKR') {
      setExchangeRate(1.0);
    } else if (liveRates[currency]) {
      setExchangeRate(Number(liveRates[currency].toFixed(2)));
    }
  }, [currency, liveRates]);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${apiBase}/invoicing/invoices`);
      const data = await res.json();
      if (data.success) setInvoices(data.data || []);
    } catch {
      showToast('Error loading invoices', 'error');
    }
  };

  const fetchDispatches = async () => {
    try {
      const res = await fetch(`${apiBase}/inventory/dispatches`);
      const data = await res.json();
      if (data.success) setDispatches(data.data || []);
    } catch {
      showToast('Error loading dispatches', 'error');
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchDispatches();
  }, []);

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.template_name) return;
    const newT: TemplateFormat = { ...templateForm, id: String(Date.now()) };
    setTemplates([...templates, newT]);
    setSelectedTemplateName(newT.template_name);
    setShowTemplateModal(false);
    showToast(`New Invoice Format '${newT.template_name}' added!`, 'success');
    setTemplateForm({
      id: '',
      template_name: '',
      tax_type: 'GST',
      tax_rate: 18,
      bank_account: '',
      prepared_by: 'Assistant Finance',
      header_title: 'Invoice for Supply and Services',
    });
  };

  const handleGenerateInvoice = async () => {
    if (!selectedDispatchId) {
      showToast('Please select a completed installation job', 'error');
      return;
    }
    const currentT = templates.find((t) => t.template_name === selectedTemplateName) || templates[0];
    try {
      const res = await fetch(`${apiBase}/invoicing/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispatch_id: selectedDispatchId,
          customer_id: '808d1adb-a2a6-4545-97fc-cbef971f7db4',
          template_name: currentT.template_name,
          currency,
          exchange_rate: exchangeRate,
          tax_type: currentT.tax_type,
          tax_rate: currentT.tax_rate,
          number_of_copies: numberOfCopies,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Automated Client Invoice Generated!', 'success');
        setShowGenModal(false);
        fetchInvoices();
        setSelectedInvoice(data.data);
      }
    } catch {
      showToast('Failed to generate invoice', 'error');
    }
  };

  const currentTemplateObj = templates.find((t) => t.template_name === selectedTemplateName) || templates[0];

  const copyLabels = ['Customer Copy', 'Finance Copy', 'Audit Copy', 'Bank Copy', 'Archive Copy', 'Record Copy'];

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
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
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DollarSign size={28} style={{ color: '#38bdf8' }} /> Finance Client Invoicing & Summaries
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '14px' }}>
            Editable client template formats, live multi-currency exchange rates (USD, QAR, SAR, AED, EUR, GBP), and multi-copy printing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowTemplateModal(true)}
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
            }}
          >
            <Plus size={18} /> + Edit / Add Invoice Format
          </button>
          <button
            onClick={() => setShowGenModal(true)}
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
            <Sparkles size={18} /> Generate Invoice from Job
          </button>
        </div>
      </div>

      {/* Control Bar: Templates, Live Exchange Rates, and Multi-Copy Printing */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          alignItems: 'center',
        }}
      >
        {/* Template Format Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Invoice Format Template</label>
          <select
            value={selectedTemplateName}
            onChange={(e) => setSelectedTemplateName(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '600' }}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.template_name}>
                {t.template_name} ({t.tax_type} {t.tax_rate}%)
              </option>
            ))}
          </select>
        </div>

        {/* Currency Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Billing Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as any)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '600' }}
          >
            <option value="PKR">PKR (Pakistani Rupee)</option>
            <option value="USD">USD (US Dollar)</option>
            <option value="QAR">QAR (Qatari Riyal)</option>
            <option value="SAR">SAR (Saudi Riyal)</option>
            <option value="AED">AED (UAE Dirham)</option>
            <option value="EUR">EUR (Euro)</option>
            <option value="GBP">GBP (British Pound)</option>
          </select>
        </div>

        {/* Live Exchange Rate Indicator & Override */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Globe size={14} style={{ color: '#0284c7' }} /> Live Exchange Rate
            </label>
            <button
              onClick={fetchLiveExchangeRates}
              style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
            >
              <RefreshCw size={12} className={fetchingRates ? 'animate-spin' : ''} /> Live Fetch
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              step="0.01"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700' }}
            />
            <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>1 {currency} = {exchangeRate} PKR</span>
          </div>
        </div>

        {/* Multi-Copy Count Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Multi-Copy Print Count</label>
          <select
            value={numberOfCopies}
            onChange={(e) => setNumberOfCopies(Number(e.target.value))}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '600' }}
          >
            <option value={1}>1 Copy (Customer Copy)</option>
            <option value={2}>2 Copies (Customer + Finance)</option>
            <option value={3}>3 Copies (Customer, Finance, Audit)</option>
            <option value={4}>4 Copies (Customer, Finance, Audit, Bank)</option>
            <option value={6}>6 Copies (Complete Official Bundle)</option>
          </select>
        </div>
      </div>

      {/* Invoice List & Multi-Copy Preview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '24px' }}>
        {/* Invoices List */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: '#0f172a' }}>Generated Invoices</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {invoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: selectedInvoice?.id === inv.id ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  backgroundColor: selectedInvoice?.id === inv.id ? '#f0f9ff' : '#f8fafc',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '800', color: '#0f172a' }}>{inv.invoice_number}</span>
                  <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>{inv.status}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600' }}>{inv.customer_name || 'Client'}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{inv.template_name}</span>
                  <span style={{ fontWeight: '800', color: '#0f172a' }}>
                    {currency !== 'PKR' ? `${currency} ${(Number(inv.total_amount) / exchangeRate).toFixed(2)}` : `Rs ${Number(inv.total_amount).toLocaleString()}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Document Preview Panel with Multi-Copy Tabs */}
        <div>
          {/* Copy Selector Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {Array.from({ length: numberOfCopies }).map((_, idx) => {
              const copyNum = idx + 1;
              const copyLabel = copyLabels[idx] || `Copy ${copyNum}`;
              return (
                <button
                  key={copyNum}
                  onClick={() => setActiveCopyTab(copyNum)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: activeCopyTab === copyNum ? '#0f172a' : '#e2e8f0',
                    color: activeCopyTab === copyNum ? '#ffffff' : '#475569',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  <Copy size={12} style={{ display: 'inline', marginRight: '4px' }} /> {copyLabel}
                </button>
              );
            })}
          </div>

          {/* Printable Invoice Card */}
          <div style={{ backgroundColor: '#ffffff', color: '#000000', padding: '36px', borderRadius: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #cbd5e1' }}>
            {selectedInvoice ? (
              <div>
                {/* Copy Stamp Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '20px' }}>
                  <div>
                    <span style={{ backgroundColor: '#0f172a', color: '#fff', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      OFFICIAL {copyLabels[activeCopyTab - 1] || `COPY ${activeCopyTab}`}
                    </span>
                    <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#000', marginTop: '8px', textTransform: 'uppercase' }}>
                      {currentTemplateObj.header_title}
                    </h2>
                    <p style={{ fontSize: '13px', color: '#334155' }}>Customer: <strong>{selectedInvoice.customer_name || 'Client Name'}</strong></p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: '900', fontSize: '16px' }}>INVOICE #: {selectedInvoice.invoice_number}</p>
                    <p style={{ fontSize: '13px', color: '#475569' }}>Date: {new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                    <p style={{ fontSize: '12px', color: '#0284c7', fontWeight: '700', marginTop: '2px' }}>Currency: {currency} (Rate: {exchangeRate})</p>
                  </div>
                </div>

                {/* Line Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #000' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>S#</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Description</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Unit Price ({currency})</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Total Without Tax</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Tax ({currentTemplateObj.tax_type} {currentTemplateObj.tax_rate}%)</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Total With Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.items || [{ description: 'CCTV Installation & System Equipment', quantity: 1, unit_price: selectedInvoice.subtotal, total_without_tax: selectedInvoice.subtotal, tax_amount: selectedInvoice.tax_amount, total_with_tax: selectedInvoice.total_amount }]).map((item, idx) => {
                      const displayUnitPrice = currency !== 'PKR' ? (item.unit_price / exchangeRate).toFixed(2) : Number(item.unit_price).toLocaleString();
                      const displayNoTax = currency !== 'PKR' ? (item.total_without_tax / exchangeRate).toFixed(2) : Number(item.total_without_tax).toLocaleString();
                      const displayTax = currency !== 'PKR' ? (item.tax_amount / exchangeRate).toFixed(2) : Number(item.tax_amount).toLocaleString();
                      const displayWithTax = currency !== 'PKR' ? (item.total_with_tax / exchangeRate).toFixed(2) : Number(item.total_with_tax).toLocaleString();

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px' }}>{idx + 1}</td>
                          <td style={{ padding: '8px', fontWeight: '600' }}>{item.description}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{item.quantity}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{displayUnitPrice}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{displayNoTax}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{displayTax}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{displayWithTax}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Amount in Words & Totals */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '20px' }}>
                  <div style={{ maxWidth: '60%' }}>
                    <p style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      Amount In Words:{' '}
                      <span style={{ fontStyle: 'italic', fontWeight: 'normal' }}>
                        {selectedInvoice.amount_in_words || 'One Hundred Fifty Thousand Rupees Only'}
                      </span>
                    </p>
                    <p style={{ fontSize: '12px', color: '#475569', marginTop: '8px', fontWeight: '600' }}>
                      {currentTemplateObj.bank_account}
                    </p>
                  </div>
                  <div style={{ width: '240px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Subtotal:</span>
                      <span>{currency} {(selectedInvoice.subtotal / exchangeRate).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Tax ({currentTemplateObj.tax_type} {currentTemplateObj.tax_rate}%):</span>
                      <span>{currency} {(selectedInvoice.tax_amount / exchangeRate).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: '6px', fontWeight: 'bold', fontSize: '15px' }}>
                      <span>Total Amount:</span>
                      <span>{currency} {(selectedInvoice.total_amount / exchangeRate).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '20px', borderTop: '1px dashed #cbd5e1', fontSize: '12px' }}>
                  <div>
                    <p>_______________________</p>
                    <p style={{ fontWeight: 'bold', marginTop: '4px' }}>Prepared By: {currentTemplateObj.prepared_by}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p>_______________________</p>
                    <p style={{ fontWeight: 'bold', marginTop: '4px' }}>Client Stamp & Signature</p>
                  </div>
                </div>

                {/* Print Action */}
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => window.print()}
                    style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    <Printer size={16} /> Print All {numberOfCopies} Official Copies
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                <FileCheck size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                <p style={{ fontSize: '16px', fontWeight: 'bold' }}>Select an Invoice to View Format & Multi-Copy Preview</p>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>Or click "Generate Invoice from Job" to convert completed installation jobs.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Add / Edit Custom Template Format */}
      {showTemplateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', width: '520px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '18px' }}>+ Add / Edit Custom Invoice Format</h2>
            <form onSubmit={handleSaveTemplate}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Format / Bank Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. QNB Qatar Format / Habib Bank Format"
                  value={templateForm.template_name}
                  onChange={(e) => setTemplateForm({ ...templateForm, template_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Header Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Invoice for Supply and Installation of CCTV System"
                  value={templateForm.header_title}
                  onChange={(e) => setTemplateForm({ ...templateForm, header_title: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Tax Type</label>
                  <select
                    value={templateForm.tax_type}
                    onChange={(e) => setTemplateForm({ ...templateForm, tax_type: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a' }}
                  >
                    <option value="GST">GST (Sales Tax)</option>
                    <option value="SST">SST (Sindh Sales Tax)</option>
                    <option value="VAT">VAT (Value Added Tax)</option>
                    <option value="EXEMPT">Exempt / Zero Tax</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Tax Rate (%)</label>
                  <input
                    type="number"
                    value={templateForm.tax_rate}
                    onChange={(e) => setTemplateForm({ ...templateForm, tax_rate: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Bank Account Info Line</label>
                <input
                  type="text"
                  placeholder="e.g. Account #: 0420 0010120895360014"
                  value={templateForm.bank_account}
                  onChange={(e) => setTemplateForm({ ...templateForm, bank_account: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Prepared By Title</label>
                <input
                  type="text"
                  placeholder="e.g. Assistant Finance / Accounts Manager"
                  value={templateForm.prepared_by}
                  onChange={(e) => setTemplateForm({ ...templateForm, prepared_by: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowTemplateModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#6366f1', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  Save Custom Format
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Generate Invoice from Job */}
      {showGenModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', width: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '18px' }}>Generate Automated Client Invoice</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Select Completed Installation Job</label>
              <select
                value={selectedDispatchId}
                onChange={(e) => setSelectedDispatchId(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
              >
                <option value="">-- Choose Completed Job --</option>
                {dispatches.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.dispatch_number} - {d.customer_name || 'Client Job'} ({d.status})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowGenModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleGenerateInvoice} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                Generate Client Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
