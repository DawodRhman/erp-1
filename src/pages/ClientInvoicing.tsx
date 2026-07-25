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
  Table,
  FileText,
  Sliders,
  CheckSquare,
  ArrowRight,
  TrendingUp,
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
  branch_name?: string;
  branch_code?: string;
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

interface ClientSummary {
  id: string;
  client_name: string;
  summary_period: string;
  total_branches: number;
  total_jobs: number;
  subtotal_pkr: number;
  tax_amount_pkr: number;
  total_amount_pkr: number;
  status: string;
  branches_breakdown: Array<{
    sr_no: number;
    branch_name: string;
    branch_code: string;
    inv_number: string;
    amount_no_tax: number;
    tax_amount: number;
    total_with_tax: number;
  }>;
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
  const [activeTab, setActiveTab] = useState<'invoices' | 'summaries' | 'workflow'>('invoices');

  // Pre-populated Initial Sample Invoices (Visible immediately)
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([
    {
      id: 'inv-001',
      invoice_number: 'INV-2026-BALH-001',
      customer_name: 'Bank AL Habib Ltd',
      branch_name: 'Main Commercial Branch (0042)',
      branch_code: '0042',
      currency: 'PKR',
      exchange_rate: 1.0,
      template_name: 'Bank AL Habib Format',
      tax_type: 'SST',
      tax_rate: 10,
      subtotal: 450000,
      tax_amount: 45000,
      total_amount: 495000,
      amount_in_words: 'Four Hundred Ninety Five Thousand Pakistani Rupees Only',
      number_of_copies: 4,
      status: 'APPROVED',
      created_at: new Date().toISOString(),
      items: [
        {
          description: 'Supply & Installation of 16-Channel HD CCTV Cameras with DVR',
          quantity: 1,
          unit_price: 300000,
          total_without_tax: 300000,
          tax_amount: 3000,
          total_with_tax: 330000,
        },
        {
          description: 'Ethernet CAT6 Cable Roll (200ft installed) & Connectors',
          quantity: 2,
          unit_price: 75000,
          total_without_tax: 150000,
          tax_amount: 15000,
          total_with_tax: 165000,
        },
      ],
    },
    {
      id: 'inv-002',
      invoice_number: 'INV-2026-SNDB-002',
      customer_name: 'Sindh Bank Ltd',
      branch_name: 'Clifton Branch (1002)',
      branch_code: '1002',
      currency: 'PKR',
      exchange_rate: 1.0,
      template_name: 'Sindh Bank Format',
      tax_type: 'GST',
      tax_rate: 18,
      subtotal: 680000,
      tax_amount: 122400,
      total_amount: 802400,
      amount_in_words: 'Eight Hundred Two Thousand Four Hundred Pakistani Rupees Only',
      number_of_copies: 4,
      status: 'PENDING_REVIEW',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      items: [
        {
          description: 'Biometric Access Control & Fire Alarm Panel 8-Zone',
          quantity: 1,
          unit_price: 680000,
          total_without_tax: 680000,
          tax_amount: 122400,
          total_with_tax: 802400,
        },
      ],
    },
    {
      id: 'inv-003',
      invoice_number: 'INV-2026-JK-003',
      customer_name: 'Jamat Khana Regional Trust',
      branch_name: 'Garden East Branch',
      branch_code: 'JK-08',
      currency: 'PKR',
      exchange_rate: 1.0,
      template_name: 'Jamat Khana Format',
      tax_type: 'EXEMPT',
      tax_rate: 0,
      subtotal: 250000,
      tax_amount: 0,
      total_amount: 250000,
      amount_in_words: 'Two Hundred Fifty Thousand Pakistani Rupees Only',
      number_of_copies: 3,
      status: 'PAID',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      items: [
        {
          description: 'Security System Dismantling & Device Swaps',
          quantity: 1,
          unit_price: 250000,
          total_without_tax: 250000,
          tax_amount: 0,
          total_with_tax: 250000,
        },
      ],
    },
  ]);

  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(invoices[0]);

  // Pre-populated Client Summaries (Bank AL Habib, Sindh Bank, Jamat Khana, DC Office)
  const [summaries, setSummaries] = useState<ClientSummary[]>([
    {
      id: 'sum-01',
      client_name: 'Bank AL Habib Ltd',
      summary_period: 'July 2026 Monthly Master Billing Statement',
      total_branches: 4,
      total_jobs: 6,
      subtotal_pkr: 1800000,
      tax_amount_pkr: 180000,
      total_amount_pkr: 1980000,
      status: 'VERIFIED',
      branches_breakdown: [
        { sr_no: 1, branch_name: 'Main Commercial Branch', branch_code: '0042', inv_number: 'INV-2026-BALH-001', amount_no_tax: 450000, tax_amount: 45000, total_with_tax: 495000 },
        { sr_no: 2, branch_name: 'Gulshan Branch', branch_code: '0089', inv_number: 'INV-2026-BALH-004', amount_no_tax: 350000, tax_amount: 35000, total_with_tax: 385000 },
        { sr_no: 3, branch_name: 'DHA Phase 5 Branch', branch_code: '0112', inv_number: 'INV-2026-BALH-005', amount_no_tax: 600000, tax_amount: 60000, total_with_tax: 660000 },
        { sr_no: 4, branch_name: 'North Nazimabad Branch', branch_code: '0031', inv_number: 'INV-2026-BALH-006', amount_no_tax: 400000, tax_amount: 40000, total_with_tax: 440000 },
      ],
    },
    {
      id: 'sum-02',
      client_name: 'Sindh Bank Ltd',
      summary_period: 'Q3 2026 Regional Security Installation Summary',
      total_branches: 3,
      total_jobs: 3,
      subtotal_pkr: 1400000,
      tax_amount_pkr: 252000,
      total_amount_pkr: 1652000,
      status: 'DRAFT',
      branches_breakdown: [
        { sr_no: 1, branch_name: 'Clifton Branch', branch_code: '1002', inv_number: 'INV-2026-SNDB-002', amount_no_tax: 680000, tax_amount: 122400, total_with_tax: 802400 },
        { sr_no: 2, branch_name: 'Hyderabad Main', branch_code: '1045', inv_number: 'INV-2026-SNDB-007', amount_no_tax: 720000, tax_amount: 129600, total_with_tax: 849600 },
      ],
    },
    {
      id: 'sum-03',
      client_name: 'Office of Deputy Commissioner (DC)',
      summary_period: 'Government Security Surveillance Site Summary',
      total_branches: 2,
      total_jobs: 2,
      subtotal_pkr: 950000,
      tax_amount_pkr: 0,
      total_amount_pkr: 950000,
      status: 'APPROVED',
      branches_breakdown: [
        { sr_no: 1, branch_name: 'DC Office Complex Site A', branch_code: 'DC-01', inv_number: 'INV-2026-DC-01', amount_no_tax: 550000, tax_amount: 0, total_with_tax: 550000 },
        { sr_no: 2, branch_name: 'District Treasury Vault Site B', branch_code: 'DC-02', inv_number: 'INV-2026-DC-02', amount_no_tax: 400000, tax_amount: 0, total_with_tax: 400000 },
      ],
    },
  ]);

  const [selectedSummary, setSelectedSummary] = useState<ClientSummary | null>(summaries[0]);

  // Editable Workflow Config
  const [workflowStages, setWorkflowStages] = useState([
    { id: 1, name: 'CSR Quotation Approval', role: 'CSR', auto: true, description: 'Client quotation approved & dispatched' },
    { id: 2, name: 'Inventory Stock Out', role: 'Inventory Manager', auto: true, description: 'Serials & cables issued to installer' },
    { id: 3, name: 'Field Installation & Return Reconcile', role: 'Field Installer', auto: false, description: 'Exact cable ft used & returns accounted' },
    { id: 4, name: 'Zero-Entry Draft Invoice Generation', role: 'System Engine', auto: true, description: 'Auto-maps items into client template' },
    { id: 5, name: 'Finance Review & Multi-Copy Print', role: 'Finance Officer', auto: false, description: 'Currency conversion & 4-copy print' },
    { id: 6, name: 'Payment Settlement', role: 'Accounts Officer', auto: false, description: 'Bank ledger entry & receipt' },
  ]);

  // Custom Templates List (Finance Managed)
  const [templates, setTemplates] = useState<TemplateFormat[]>([
    {
      id: '1',
      template_name: 'Bank AL Habib Format',
      tax_type: 'SST',
      tax_rate: 10,
      bank_account: 'Account #: 0420 0010120895360014 (Bank AL Habib Ltd)',
      prepared_by: 'Assistant Finance Manager',
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

  // Multi-copy settings
  const [numberOfCopies, setNumberOfCopies] = useState<number>(4);
  const [activeCopyTab, setActiveCopyTab] = useState<number>(1);

  // Modals
  const [showGenModal, setShowGenModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showNewSummaryModal, setShowNewSummaryModal] = useState(false);
  const [selectedDispatchId, setSelectedDispatchId] = useState('');

  // Forms
  const [templateForm, setTemplateForm] = useState<TemplateFormat>({
    id: '',
    template_name: '',
    tax_type: 'GST',
    tax_rate: 18,
    bank_account: '',
    prepared_by: 'Assistant Finance',
    header_title: 'Invoice for Supply and Services',
  });

  const [newSummaryClient, setNewSummaryClient] = useState('Bank AL Habib Ltd');
  const [newSummaryPeriod, setNewSummaryPeriod] = useState('August 2026 Monthly Statement');

  const { showToast } = useToastContext();
  const apiBase = getApiBaseUrl();

  // Live Exchange Rates Fetching
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
        showToast('Live exchange rates updated!', 'success');
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
    if (currency === 'PKR') setExchangeRate(1.0);
    else if (liveRates[currency]) setExchangeRate(Number(liveRates[currency].toFixed(2)));
  }, [currency, liveRates]);

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.template_name) return;
    const newT: TemplateFormat = { ...templateForm, id: String(Date.now()) };
    setTemplates([...templates, newT]);
    setSelectedTemplateName(newT.template_name);
    setShowTemplateModal(false);
    showToast(`New Invoice Format '${newT.template_name}' saved!`, 'success');
  };

  const handleCreateNewSummary = (e: React.FormEvent) => {
    e.preventDefault();
    const newSum: ClientSummary = {
      id: `sum-${Date.now()}`,
      client_name: newSummaryClient,
      summary_period: newSummaryPeriod,
      total_branches: 3,
      total_jobs: 3,
      subtotal_pkr: 1200000,
      tax_amount_pkr: 120000,
      total_amount_pkr: 1320000,
      status: 'VERIFIED',
      branches_breakdown: [
        { sr_no: 1, branch_name: 'Commercial Branch 1', branch_code: '001', inv_number: 'INV-2026-001', amount_no_tax: 400000, tax_amount: 40000, total_with_tax: 440000 },
        { sr_no: 2, branch_name: 'Commercial Branch 2', branch_code: '002', inv_number: 'INV-2026-002', amount_no_tax: 400000, tax_amount: 40000, total_with_tax: 440000 },
        { sr_no: 3, branch_name: 'Commercial Branch 3', branch_code: '003', inv_number: 'INV-2026-003', amount_no_tax: 400000, tax_amount: 40000, total_with_tax: 440000 },
      ],
    };
    setSummaries([newSum, ...summaries]);
    setSelectedSummary(newSum);
    setShowNewSummaryModal(false);
    showToast(`Master Summary Statement generated for ${newSummaryClient}!`, 'success');
  };

  const currentTemplateObj = templates.find((t) => t.template_name === selectedTemplateName) || templates[0];
  const copyLabels = ['Customer Copy', 'Finance Copy', 'Audit Copy', 'Bank Copy', 'Archive Copy', 'Record Copy'];

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
      {/* Top Banner */}
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
            <DollarSign size={28} style={{ color: '#38bdf8' }} /> Finance Client Invoicing, Summaries & Flow Engine
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '14px' }}>
            Generate client master summaries, edit custom template formats, switch live multi-currency exchange rates, and configure workflow stages.
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
            <Edit3 size={18} /> + Edit / Add Invoice Format
          </button>
          <button
            onClick={() => setShowNewSummaryModal(true)}
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
            }}
          >
            <Table size={18} /> + Create Master Client Summary
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('invoices')}
          style={{
            padding: '10px 22px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'invoices' ? '#ffffff' : 'transparent',
            color: activeTab === 'invoices' ? '#0f172a' : '#64748b',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: activeTab === 'invoices' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileText size={18} /> Client Invoices & Multi-Copy Print ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('summaries')}
          style={{
            padding: '10px 22px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'summaries' ? '#ffffff' : 'transparent',
            color: activeTab === 'summaries' ? '#0f172a' : '#64748b',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: activeTab === 'summaries' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Table size={18} /> Client Master Summaries ({summaries.length})
        </button>
        <button
          onClick={() => setActiveTab('workflow')}
          style={{
            padding: '10px 22px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'workflow' ? '#ffffff' : 'transparent',
            color: activeTab === 'workflow' ? '#0f172a' : '#64748b',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: activeTab === 'workflow' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Sliders size={18} /> Editable Invoice Flow & Rules
        </button>
      </div>

      {/* TAB 1: INVOICES & MULTI-COPY PRINT */}
      {activeTab === 'invoices' && (
        <div>
          {/* Controls Bar */}
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

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Globe size={14} style={{ color: '#0284c7' }} /> Live Exchange Rate
                </label>
                <button onClick={fetchLiveExchangeRates} style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                  <RefreshCw size={12} className={fetchingRates ? 'animate-spin' : ''} /> Live Fetch
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700' }}
              />
            </div>

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

          {/* Invoices List & Document Viewer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '24px' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: '#0f172a' }}>Client Invoices</h3>
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
                    <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600' }}>{inv.customer_name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{inv.branch_name || inv.template_name}</span>
                      <span style={{ fontWeight: '800', color: '#0f172a' }}>
                        {currency !== 'PKR' ? `${currency} ${(Number(inv.total_amount) / exchangeRate).toFixed(2)}` : `Rs ${Number(inv.total_amount).toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Printable Document Preview */}
            <div>
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

              {selectedInvoice && (
                <div style={{ backgroundColor: '#ffffff', color: '#000000', padding: '36px', borderRadius: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '20px' }}>
                    <div>
                      <span style={{ backgroundColor: '#0f172a', color: '#fff', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                        OFFICIAL {copyLabels[activeCopyTab - 1] || `COPY ${activeCopyTab}`}
                      </span>
                      <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#000', marginTop: '8px', textTransform: 'uppercase' }}>
                        {currentTemplateObj.header_title}
                      </h2>
                      <p style={{ fontSize: '13px', color: '#334155' }}>Customer: <strong>{selectedInvoice.customer_name}</strong> ({selectedInvoice.branch_name || 'Main'})</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: '900', fontSize: '16px' }}>INVOICE #: {selectedInvoice.invoice_number}</p>
                      <p style={{ fontSize: '13px', color: '#475569' }}>Date: {new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                      <p style={{ fontSize: '12px', color: '#0284c7', fontWeight: '700', marginTop: '2px' }}>Currency: {currency} (Rate: {exchangeRate})</p>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #000' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>S#</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Description</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Unit Price ({currency})</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Tax ({currentTemplateObj.tax_type} {currentTemplateObj.tax_rate}%)</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Total With Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedInvoice.items || []).map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px' }}>{idx + 1}</td>
                          <td style={{ padding: '8px', fontWeight: '600' }}>{item.description}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{item.quantity}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            {currency !== 'PKR' ? (item.unit_price / exchangeRate).toFixed(2) : Number(item.unit_price).toLocaleString()}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            {currency !== 'PKR' ? (item.tax_amount / exchangeRate).toFixed(2) : Number(item.tax_amount).toLocaleString()}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                            {currency !== 'PKR' ? (item.total_with_tax / exchangeRate).toFixed(2) : Number(item.total_with_tax).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '20px' }}>
                    <div style={{ maxWidth: '60%' }}>
                      <p style={{ fontSize: '13px', fontWeight: 'bold' }}>
                        Amount In Words: <span style={{ fontStyle: 'italic', fontWeight: 'normal' }}>{selectedInvoice.amount_in_words}</span>
                      </p>
                      <p style={{ fontSize: '12px', color: '#475569', marginTop: '8px', fontWeight: '600' }}>{currentTemplateObj.bank_account}</p>
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

                  <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => window.print()}
                      style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700' }}
                    >
                      <Printer size={16} /> Print All {numberOfCopies} Official Copies
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLIENT MASTER SUMMARIES */}
      {activeTab === 'summaries' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '24px' }}>
          {/* Summaries List */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Master Statements</h3>
              <button
                onClick={() => setShowNewSummaryModal(true)}
                style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                + New Statement
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {summaries.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSummary(s)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: selectedSummary?.id === s.id ? '2px solid #0284c7' : '1px solid #e2e8f0',
                    backgroundColor: selectedSummary?.id === s.id ? '#f0f9ff' : '#f8fafc',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>{s.client_name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{s.summary_period}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px' }}>
                    <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>{s.status}</span>
                    <span style={{ fontWeight: '800', color: '#0f172a' }}>Rs {s.total_amount_pkr.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Master Summary Breakdown Sheet */}
          {selectedSummary && (
            <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '14px', border: '1px solid #cbd5e1', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '20px' }}>
                <div>
                  <span style={{ backgroundColor: '#0284c7', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '800' }}>
                    OFFICIAL CLIENT MASTER SUMMARY STATEMENT
                  </span>
                  <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', marginTop: '6px' }}>{selectedSummary.client_name}</h2>
                  <p style={{ fontSize: '13.5px', color: '#475569' }}>{selectedSummary.summary_period}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>Total Branches: <strong>{selectedSummary.total_branches}</strong></p>
                  <p style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>
                    Grand Total: Rs {selectedSummary.total_amount_pkr.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Breakdown Table (Book3.xlsx Format) */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #0f172a' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Sr #</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Branch Name</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Branch Code</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Invoice #</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Amount (No Tax)</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Tax</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Total (With Tax)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSummary.branches_breakdown.map((row) => (
                    <tr key={row.sr_no} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px' }}>{row.sr_no}</td>
                      <td style={{ padding: '10px', fontWeight: '700', color: '#0f172a' }}>{row.branch_name}</td>
                      <td style={{ padding: '10px', color: '#64748b' }}>{row.branch_code}</td>
                      <td style={{ padding: '10px', fontWeight: '600' }}>{row.inv_number}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>Rs {row.amount_no_tax.toLocaleString()}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#0284c7' }}>Rs {row.tax_amount.toLocaleString()}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>Rs {row.total_with_tax.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  Statement Status: <span style={{ fontWeight: '800', color: '#16a34a' }}>{selectedSummary.status}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => window.print()} style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                    <Printer size={14} style={{ display: 'inline', marginRight: '6px' }} /> Print Statement
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EDITABLE INVOICE WORKFLOW & STAGES */}
      {activeTab === 'workflow' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '28px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Editable Invoice & Billing Workflow Engine</h3>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
            Configure operational handoff stages between CSR, Inventory, Field Installers, and Finance.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {workflowStages.map((stage) => (
              <div
                key={stage.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  padding: '16px 20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' }}>
                    {stage.id}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>{stage.name}</h4>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>{stage.description}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                    Role: {stage.role}
                  </span>
                  <span style={{ backgroundColor: stage.auto ? '#dcfce7' : '#fef3c7', color: stage.auto ? '#166534' : '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                    {stage.auto ? 'AUTOMATED' : 'MANUAL REVIEW'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add Custom Template Format */}
      {showTemplateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', width: '520px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '18px' }}>+ Edit / Add Custom Invoice Format</h2>
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

      {/* Modal: Create Master Client Summary */}
      {showNewSummaryModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', width: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '18px' }}>+ Create Client Master Summary Statement</h2>
            <form onSubmit={handleCreateNewSummary}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Select Client / Organization</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Bank AL Habib Ltd / Sindh Bank"
                  value={newSummaryClient}
                  onChange={(e) => setNewSummaryClient(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Summary Period / Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. August 2026 Monthly Master Billing Statement"
                  value={newSummaryPeriod}
                  onChange={(e) => setNewSummaryPeriod(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowNewSummaryModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#0284c7', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  Generate Master Summary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
