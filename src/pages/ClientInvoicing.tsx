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
  Save,
  Trash2,
  Layout,
  Grid,
  Calculator,
  FileSpreadsheet,
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
  customer_name: string;
  template_name: string;
  header_title: string;
  tax_type: string;
  tax_rate: number;
  number_of_copies: number;
  currency: string;
  bank_account: string;
  prepared_by: string;
  footer_disclaimer: string;
  show_branch_code: boolean;
  show_ntn_gst: boolean;
  ntn_number: string;
  gst_number: string;
}

export default function ClientInvoicing() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'summaries' | 'excel_grid' | 'template_designer' | 'workflow'>('invoices');

  // Excel Spreadsheet Grid State
  const [excelSheetTitle, setExcelSheetTitle] = useState('Bank AL Habib Ltd - July 2026 Master Branch Billing Grid');
  const [excelHeaders, setExcelHeaders] = useState<string[]>([
    'Sr #',
    'Branch Name',
    'Branch Code',
    'Invoice #',
    'Subtotal (PKR)',
    'SST 10% (PKR)',
    'Total With Tax (PKR)',
  ]);

  const [excelRows, setExcelRows] = useState<string[][]>([
    ['1', 'Main Commercial Branch', '0042', 'INV-2026-BALH-001', '450000', '45000', '495000'],
    ['2', 'Gulshan Branch', '0089', 'INV-2026-BALH-004', '350000', '35000', '385000'],
    ['3', 'DHA Phase 5 Branch', '0112', 'INV-2026-BALH-005', '600000', '60000', '660000'],
    ['4', 'North Nazimabad Branch', '0031', 'INV-2026-BALH-006', '400000', '40000', '440000'],
  ]);

  // System Saved Templates
  const [templates, setTemplates] = useState<TemplateFormat[]>([
    {
      id: 'tmpl-1',
      customer_name: 'Bank AL Habib Ltd',
      template_name: 'Bank AL Habib SST 10% Format',
      header_title: 'Invoice for Installation and Dismantling Charges',
      tax_type: 'SST',
      tax_rate: 10,
      number_of_copies: 4,
      currency: 'PKR',
      bank_account: 'Account #: 0420 0010120895360014 (Bank AL Habib Ltd)',
      prepared_by: 'Assistant Finance Manager',
      footer_disclaimer: 'Payment due within 30 days of receiving official invoice statement.',
      show_branch_code: true,
      show_ntn_gst: true,
      ntn_number: 'NTN: 0819284-9',
      gst_number: 'SST Reg #: 17-00-9988-001',
    },
    {
      id: 'tmpl-2',
      customer_name: 'Sindh Bank Ltd',
      template_name: 'Sindh Bank GST 18% Format',
      header_title: 'Invoice for Supply & Installation of CCTV Security Systems',
      tax_type: 'GST',
      tax_rate: 18,
      number_of_copies: 4,
      currency: 'PKR',
      bank_account: 'Account #: 1002 9988221100 (Sindh Bank Main Branch)',
      prepared_by: 'Accounts Officer',
      footer_disclaimer: 'GST 18% applied as per Sindh Revenue Authority regulations.',
      show_branch_code: true,
      show_ntn_gst: true,
      ntn_number: 'NTN: 3948192-1',
      gst_number: 'GST Reg #: 11-00-1122-334',
    },
    {
      id: 'tmpl-3',
      customer_name: 'QNB Qatar',
      template_name: 'QNB Qatar Multi-Currency VAT 5% Format',
      header_title: 'Commercial Tax Invoice for Surveillance & Access Systems',
      tax_type: 'VAT',
      tax_rate: 5,
      number_of_copies: 3,
      currency: 'QAR',
      bank_account: 'IBAN: QA98 QNBA 0000 0000 1234 5678 (QNB Doha)',
      prepared_by: 'Finance Executive',
      footer_disclaimer: 'Converted to Qatari Riyal at live official bank exchange rate.',
      show_branch_code: false,
      show_ntn_gst: false,
      ntn_number: '',
      gst_number: '',
    },
    {
      id: 'tmpl-4',
      customer_name: 'Office of Deputy Commissioner (DC)',
      template_name: 'DC Office SRB Exempt Format',
      header_title: 'Invoice For CCTV Cameras Installed At Designated Government Sites',
      tax_type: 'EXEMPT',
      tax_rate: 0,
      number_of_copies: 4,
      currency: 'PKR',
      bank_account: 'Account #: 3628486-6 (State Bank Treasury)',
      prepared_by: 'Senior Accounts Assistant',
      footer_disclaimer: 'Tax Exempt under Government Public Safety Order SRB 2026.',
      show_branch_code: true,
      show_ntn_gst: true,
      ntn_number: 'NTN: 0000111-0',
      gst_number: 'Exempt License #: SRB-EX-992',
    },
  ]);

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateFormat>(templates[0]);
  const [designerForm, setDesignerForm] = useState<TemplateFormat>({ ...templates[0] });

  // Invoices & Summaries Data
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([
    {
      id: 'inv-001',
      invoice_number: 'INV-2026-BALH-001',
      customer_name: 'Bank AL Habib Ltd',
      branch_name: 'Main Commercial Branch',
      branch_code: '0042',
      currency: 'PKR',
      exchange_rate: 1.0,
      template_name: 'Bank AL Habib SST 10% Format',
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
          tax_amount: 30000,
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
      branch_name: 'Clifton Branch',
      branch_code: '1002',
      currency: 'PKR',
      exchange_rate: 1.0,
      template_name: 'Sindh Bank GST 18% Format',
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
  ]);

  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(invoices[0]);

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
      total_branches: 2,
      total_jobs: 2,
      subtotal_pkr: 1400000,
      tax_amount_pkr: 252000,
      total_amount_pkr: 1652000,
      status: 'DRAFT',
      branches_breakdown: [
        { sr_no: 1, branch_name: 'Clifton Branch', branch_code: '1002', inv_number: 'INV-2026-SNDB-002', amount_no_tax: 680000, tax_amount: 122400, total_with_tax: 802400 },
        { sr_no: 2, branch_name: 'Hyderabad Main', branch_code: '1045', inv_number: 'INV-2026-SNDB-007', amount_no_tax: 720000, tax_amount: 129600, total_with_tax: 849600 },
      ],
    },
  ]);

  const [selectedSummary, setSelectedSummary] = useState<ClientSummary | null>(summaries[0]);

  // Currency & Multi-copy
  const [currency, setCurrency] = useState<'PKR' | 'USD' | 'QAR' | 'SAR' | 'AED' | 'EUR' | 'GBP'>('PKR');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [liveRates, setLiveRates] = useState<Record<string, number>>({});
  const [fetchingRates, setFetchingRates] = useState(false);
  const [numberOfCopies, setNumberOfCopies] = useState<number>(4);
  const [activeCopyTab, setActiveCopyTab] = useState<number>(1);

  // Modals & Ticket Handoff
  const [showGenModal, setShowGenModal] = useState(false);
  const [showImportTicketModal, setShowImportTicketModal] = useState(false);
  const [showNewSummaryModal, setShowNewSummaryModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState('TKT-2026-BALH-088');

  const [availableTickets, setAvailableTickets] = useState([
    {
      ticket_number: 'TKT-2026-BALH-088',
      customer_name: 'Bank AL Habib Ltd',
      branch_name: 'DHA Phase 5 Branch',
      branch_code: '0112',
      technician_name: 'Tariq Mehmood (Senior Installer)',
      items_summary: '1x 32-CH NVR, 4x 4MP IP Cameras, 300ft CAT6 Cable used',
      subtotal: 600000,
      tax_amount: 60000,
      total_amount: 660000,
      amount_in_words: 'Six Hundred Sixty Thousand Pakistani Rupees Only',
      template_name: 'Bank AL Habib SST 10% Format',
      tax_type: 'SST',
      tax_rate: 10,
    },
    {
      ticket_number: 'TKT-2026-SNDB-045',
      customer_name: 'Sindh Bank Ltd',
      branch_name: 'Hyderabad Main Branch',
      branch_code: '1045',
      technician_name: 'Kamran Shah (Field Engineer)',
      items_summary: '1x Biometric Gate Barrier, 2x Motion Detectors',
      subtotal: 720000,
      tax_amount: 129600,
      total_amount: 849600,
      amount_in_words: 'Eight Hundred Forty Nine Thousand Six Hundred Pakistani Rupees Only',
      template_name: 'Sindh Bank GST 18% Format',
      tax_type: 'GST',
      tax_rate: 18,
    },
  ]);

  const [newSummaryClient, setNewSummaryClient] = useState('Bank AL Habib Ltd');
  const [newSummaryPeriod, setNewSummaryPeriod] = useState('August 2026 Monthly Statement');

  const { showToast } = useToastContext();
  const apiBase = getApiBaseUrl();

  // Exchange Rates
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

  // Excel Grid Handlers
  const handleCellChange = (rowIndex: number, colIndex: number, newValue: string) => {
    const newRows = excelRows.map((row, rIdx) => {
      if (rIdx === rowIndex) {
        const updatedRow = [...row];
        updatedRow[colIndex] = newValue;
        return updatedRow;
      }
      return row;
    });
    setExcelRows(newRows);
  };

  const handleHeaderChange = (colIndex: number, newHeader: string) => {
    const updatedHeaders = [...excelHeaders];
    updatedHeaders[colIndex] = newHeader;
    setExcelHeaders(updatedHeaders);
  };

  const handleAddExcelRow = () => {
    const emptyRow = Array(excelHeaders.length).fill('');
    emptyRow[0] = String(excelRows.length + 1);
    setExcelRows([...excelRows, emptyRow]);
    showToast('New Row added to Excel Grid', 'info');
  };

  const handleAddExcelColumn = () => {
    const colLetter = String.fromCharCode(65 + excelHeaders.length);
    setExcelHeaders([...excelHeaders, `Custom ${colLetter}`]);
    setExcelRows(excelRows.map((r) => [...r, '']));
    showToast(`New Column ${colLetter} added!`, 'info');
  };

  const handleAutoSumExcel = () => {
    let subtotal = 0;
    let taxTotal = 0;

    excelRows.forEach((r) => {
      const sub = parseFloat(r[4]) || 0;
      const tax = parseFloat(r[5]) || 0;
      subtotal += sub;
      taxTotal += tax;
    });

    const grandTotal = subtotal + taxTotal;
    const summaryRow = ['TOTAL', 'GRAND TOTAL ALL BRANCHES', '-', '-', String(subtotal), String(taxTotal), String(grandTotal)];
    setExcelRows([...excelRows, summaryRow]);
    showToast(`AutoSum calculated! Grand Total: Rs ${grandTotal.toLocaleString()}`, 'success');
  };

  const handleExportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' + [excelHeaders.join(','), ...excelRows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${excelSheetTitle.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Excel CSV exported successfully!', 'success');
  };

  // Load Preset Excel Template
  const handleLoadExcelTemplate = (clientKey: string) => {
    if (clientKey === 'BALH') {
      setExcelSheetTitle('Bank AL Habib Ltd - July 2026 Master Branch Billing Grid');
      setExcelHeaders(['Sr #', 'Branch Name', 'Branch Code', 'Invoice #', 'Subtotal (PKR)', 'SST 10% (PKR)', 'Total With Tax (PKR)']);
      setExcelRows([
        ['1', 'Main Commercial Branch', '0042', 'INV-2026-BALH-001', '450000', '45000', '495000'],
        ['2', 'Gulshan Branch', '0089', 'INV-2026-BALH-004', '350000', '35000', '385000'],
        ['3', 'DHA Phase 5 Branch', '0112', 'INV-2026-BALH-005', '600000', '60000', '660000'],
        ['4', 'North Nazimabad Branch', '0031', 'INV-2026-BALH-006', '400000', '40000', '440000'],
      ]);
    } else if (clientKey === 'SNDB') {
      setExcelSheetTitle('Sindh Bank Ltd - Regional CCTV Security Installation Grid');
      setExcelHeaders(['Sr #', 'Customer', 'Branch Name', 'Branch Code', 'Invoice #', 'GST #', 'NTN #', 'Subtotal', 'GST 18%', 'Total']);
      setExcelRows([
        ['1', 'Sindh Bank', 'Clifton Branch', '1002', 'INV-2026-SNDB-002', '11-00-1122', '3948192-1', '680000', '122400', '802400'],
        ['2', 'Sindh Bank', 'Hyderabad Main', '1045', 'INV-2026-SNDB-007', '11-00-1122', '3948192-1', '720000', '129600', '849600'],
      ]);
    } else if (clientKey === 'DC') {
      setExcelSheetTitle('Office of Deputy Commissioner (DC) - Government Site Surveillance Grid');
      setExcelHeaders(['Sr #', 'Office of DC', 'Designated Site', 'Inv #', 'GST Status', 'NTN #', 'SRB License', 'Subtotal', 'Tax', 'Net Total']);
      setExcelRows([
        ['1', 'DC Complex', 'DC Office Site A', 'INV-2026-DC-01', 'EXEMPT', '0000111-0', 'SRB-EX-992', '550000', '0', '550000'],
        ['2', 'DC Complex', 'District Treasury Vault B', 'INV-2026-DC-02', 'EXEMPT', '0000111-0', 'SRB-EX-992', '400000', '0', '400000'],
      ]);
    }
    showToast(`Loaded ${clientKey} Excel Grid Template!`, 'info');
  };

  const handleSaveDesignerTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designerForm.template_name) return;
    const existingIdx = templates.findIndex((t) => t.id === designerForm.id);
    let updatedTmpls = [...templates];
    if (existingIdx >= 0) updatedTmpls[existingIdx] = designerForm;
    else updatedTmpls.push({ ...designerForm, id: `tmpl-${Date.now()}` });
    setTemplates(updatedTmpls);
    setSelectedTemplate(designerForm);
    showToast(`Template '${designerForm.template_name}' SAVED PERMANENTLY!`, 'success');
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
      ],
    };
    setSummaries([newSum, ...summaries]);
    setSelectedSummary(newSum);
    setShowNewSummaryModal(false);
    showToast(`Master Summary Statement created for ${newSummaryClient}!`, 'success');
  };

  const handleImportTicketToInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const ticket = availableTickets.find((t) => t.ticket_number === selectedTicketId) || availableTickets[0];
    const newInv: CustomerInvoice = {
      id: `inv-${Date.now()}`,
      invoice_number: `INV-2026-${ticket.ticket_number.split('-')[2] || 'TKT'}-${Math.floor(Math.random() * 900 + 100)}`,
      customer_name: ticket.customer_name,
      branch_name: ticket.branch_name,
      branch_code: ticket.branch_code,
      currency: 'PKR',
      exchange_rate: 1.0,
      template_name: ticket.template_name,
      tax_type: ticket.tax_type,
      tax_rate: ticket.tax_rate,
      subtotal: ticket.subtotal,
      tax_amount: ticket.tax_amount,
      total_amount: ticket.total_amount,
      amount_in_words: ticket.amount_in_words,
      number_of_copies: 4,
      status: 'APPROVED',
      created_at: new Date().toISOString(),
      items: [
        {
          description: `Dispatched Field Ticket #${ticket.ticket_number}: ${ticket.items_summary}`,
          quantity: 1,
          unit_price: ticket.subtotal,
          total_without_tax: ticket.subtotal,
          tax_amount: ticket.tax_amount,
          total_with_tax: ticket.total_amount,
        },
      ],
    };

    setInvoices([newInv, ...invoices]);
    setSelectedInvoice(newInv);
    setShowImportTicketModal(false);
    showToast(`Invoice ${newInv.invoice_number} generated from Ticket ${ticket.ticket_number}!`, 'success');
  };

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
            <FileSpreadsheet size={28} style={{ color: '#10b981' }} /> Excel-Style Client Invoicing & Grid Builder
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '14px' }}>
            Full spreadsheet functionality: edit cells, add custom columns/rows, run AutoSUM formulas, and save client templates.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setActiveTab('excel_grid')}
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
              fontWeight: '700',
              boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
            }}
          >
            <Grid size={18} /> Open Excel Grid Builder
          </button>
          <button
            onClick={() => setShowImportTicketModal(true)}
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
              fontWeight: '700',
            }}
          >
            <CheckCircle2 size={18} /> + Import Ticket
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
          <FileText size={18} /> Client Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('excel_grid')}
          style={{
            padding: '10px 22px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'excel_grid' ? '#10b981' : 'transparent',
            color: activeTab === 'excel_grid' ? '#ffffff' : '#64748b',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: activeTab === 'excel_grid' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Grid size={18} /> 🟢 Excel Grid Builder
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
          onClick={() => setActiveTab('template_designer')}
          style={{
            padding: '10px 22px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'template_designer' ? '#ffffff' : 'transparent',
            color: activeTab === 'template_designer' ? '#0f172a' : '#64748b',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: activeTab === 'template_designer' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Layout size={18} /> Visual Template Designer
        </button>
      </div>

      {/* TAB: EXCEL SPREADSHEET GRID BUILDER */}
      {activeTab === 'excel_grid' && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          {/* Excel Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', padding: '14px 20px', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <FileSpreadsheet size={24} style={{ color: '#16a34a' }} />
              <input
                type="text"
                value={excelSheetTitle}
                onChange={(e) => setExcelSheetTitle(e.target.value)}
                style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', border: '1px dashed #16a34a', padding: '6px 12px', borderRadius: '8px', width: '70%', backgroundColor: '#ffffff' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleLoadExcelTemplate('BALH')} style={{ backgroundColor: '#e0e7ff', color: '#3730a3', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                Load Bank AL Habib
              </button>
              <button onClick={() => handleLoadExcelTemplate('SNDB')} style={{ backgroundColor: '#e0e7ff', color: '#3730a3', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                Load Sindh Bank
              </button>
              <button onClick={() => handleLoadExcelTemplate('DC')} style={{ backgroundColor: '#e0e7ff', color: '#3730a3', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                Load DC Office
              </button>
            </div>
          </div>

          {/* Grid Action Controls */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button onClick={handleAddExcelRow} style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> + Add Row
            </button>
            <button onClick={handleAddExcelColumn} style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> + Add Column
            </button>
            <button onClick={handleAutoSumExcel} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calculator size={16} /> 🧮 AutoSum Totals
            </button>
            <button onClick={handleExportCSV} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} /> 📥 Export to Excel (.CSV)
            </button>
            <button onClick={() => window.print()} style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> 🖨️ Print Grid
            </button>
          </div>

          {/* Interactive Excel Grid Table */}
          <div style={{ overflowX: 'auto', border: '2px solid #0f172a', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', backgroundColor: '#ffffff' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '10px', border: '1px solid #334155', width: '40px', textAlign: 'center' }}>#</th>
                  {excelHeaders.map((header, colIdx) => (
                    <th key={colIdx} style={{ padding: '8px 12px', border: '1px solid #334155', minWidth: '150px' }}>
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                        style={{ width: '100%', backgroundColor: 'transparent', color: '#ffffff', fontWeight: '800', border: 'none', outline: 'none', fontSize: '13px', textAlign: colIdx > 3 ? 'right' : 'left' }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {excelRows.map((row, rowIdx) => (
                  <tr key={rowIdx} style={{ backgroundColor: row[0] === 'TOTAL' ? '#f0fdf4' : rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '8px', border: '1px solid #cbd5e1', backgroundColor: '#e2e8f0', textAlign: 'center', fontWeight: '700', color: '#475569' }}>
                      {rowIdx + 1}
                    </td>
                    {row.map((cellVal, colIdx) => (
                      <td key={colIdx} style={{ padding: '4px 6px', border: '1px solid #cbd5e1' }}>
                        <input
                          type="text"
                          value={cellVal}
                          onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: 'none',
                            outline: 'none',
                            backgroundColor: 'transparent',
                            fontWeight: row[0] === 'TOTAL' ? '900' : colIdx === 1 ? '700' : 'normal',
                            color: row[0] === 'TOTAL' ? '#166534' : '#0f172a',
                            fontSize: '13px',
                            textAlign: colIdx > 3 ? 'right' : 'left',
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1: INVOICES & MULTI-COPY PRINT */}
      {activeTab === 'invoices' && (
        <div>
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
                value={selectedTemplate.template_name}
                onChange={(e) => {
                  const tmpl = templates.find((t) => t.template_name === e.target.value);
                  if (tmpl) {
                    setSelectedTemplate(tmpl);
                    setDesignerForm(tmpl);
                  }
                }}
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
                        {selectedTemplate.header_title}
                      </h2>
                      <p style={{ fontSize: '13px', color: '#334155' }}>
                        Customer: <strong>{selectedInvoice.customer_name}</strong> {selectedTemplate.show_branch_code && `(Branch Code: ${selectedInvoice.branch_code || '0042'})`}
                      </p>
                      {selectedTemplate.show_ntn_gst && (
                        <p style={{ fontSize: '12px', color: '#64748b' }}>{selectedTemplate.ntn_number} | {selectedTemplate.gst_number}</p>
                      )}
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
                        <th style={{ padding: '8px', textAlign: 'right' }}>Tax ({selectedTemplate.tax_type} {selectedTemplate.tax_rate}%)</th>
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
                      <p style={{ fontSize: '12px', color: '#475569', marginTop: '8px', fontWeight: '600' }}>{selectedTemplate.bank_account}</p>
                      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>{selectedTemplate.footer_disclaimer}</p>
                    </div>
                    <div style={{ width: '240px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Subtotal:</span>
                        <span>{currency} {(selectedInvoice.subtotal / exchangeRate).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Tax ({selectedTemplate.tax_type} {selectedTemplate.tax_rate}%):</span>
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
                      <p style={{ fontWeight: 'bold', marginTop: '4px' }}>Prepared By: {selectedTemplate.prepared_by}</p>
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
                <button onClick={() => window.print()} style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  <Printer size={14} style={{ display: 'inline', marginRight: '6px' }} /> Print Statement Sheet
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VISUAL TEMPLATE DESIGNER */}
      {activeTab === 'template_designer' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '24px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layout size={20} style={{ color: '#6366f1' }} /> Visual Template Designer
            </h3>

            <form onSubmit={handleSaveDesignerTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Target Client / Organization</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Bank AL Habib Ltd / QNB Qatar"
                  value={designerForm.customer_name}
                  onChange={(e) => setDesignerForm({ ...designerForm, customer_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Template Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Bank AL Habib SST 10% Format"
                  value={designerForm.template_name}
                  onChange={(e) => setDesignerForm({ ...designerForm, template_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px', fontWeight: '700' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Document Header Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Invoice for Supply and Services"
                  value={designerForm.header_title}
                  onChange={(e) => setDesignerForm({ ...designerForm, header_title: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Tax Type</label>
                  <select
                    value={designerForm.tax_type}
                    onChange={(e) => setDesignerForm({ ...designerForm, tax_type: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  >
                    <option value="GST">GST (Sales Tax)</option>
                    <option value="SST">SST (Sindh Sales Tax)</option>
                    <option value="VAT">VAT (Value Added Tax)</option>
                    <option value="EXEMPT">EXEMPT (Zero Tax)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Tax Rate (%)</label>
                  <input
                    type="number"
                    value={designerForm.tax_rate}
                    onChange={(e) => setDesignerForm({ ...designerForm, tax_rate: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Bank Account Info Line</label>
                <input
                  type="text"
                  placeholder="e.g. Account #: 0420 0010120895360014"
                  value={designerForm.bank_account}
                  onChange={(e) => setDesignerForm({ ...designerForm, bank_account: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '12px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                }}
              >
                <Save size={20} /> SAVE AS CLIENT TEMPLATE
              </button>
            </form>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '14px', border: '2px solid #6366f1', boxShadow: '0 4px 20px rgba(99,102,241,0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e0e7ff', padding: '8px 14px', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', fontWeight: '700', color: '#4338ca' }}>
              <span>✏️ DIRECT VISUAL DESIGNER: Click any title or header directly on this sheet to edit!</span>
              <button type="button" onClick={handleSaveDesignerTemplate} style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '800', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Save size={14} /> SAVE TEMPLATE
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '14px', marginBottom: '20px' }}>
              <div style={{ width: '65%' }}>
                <span style={{ backgroundColor: '#6366f1', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '800' }}>
                  TEMPLATE: {designerForm.template_name || 'CUSTOM FORMAT'}
                </span>
                
                <input
                  type="text"
                  value={designerForm.header_title}
                  onChange={(e) => setDesignerForm({ ...designerForm, header_title: e.target.value })}
                  placeholder="Click to Edit Document Title..."
                  style={{ width: '100%', fontSize: '19px', fontWeight: '900', color: '#000000', marginTop: '8px', textTransform: 'uppercase', border: '1px dashed #6366f1', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#faf5ff' }}
                />

                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155' }}>
                  <strong>Customer:</strong>
                  <input
                    type="text"
                    value={designerForm.customer_name}
                    onChange={(e) => setDesignerForm({ ...designerForm, customer_name: e.target.value })}
                    style={{ border: '1px dashed #6366f1', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#faf5ff', fontWeight: '700', fontSize: '13px', color: '#0f172a', width: '220px' }}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'right', width: '30%' }}>
                <p style={{ fontWeight: '900', fontSize: '15px' }}>INVOICE #: INV-2026-SAMPLE</p>
                <p style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #000' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>S#</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Description / Item Specifications</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Unit Price ({designerForm.currency})</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Tax ({designerForm.tax_type} {designerForm.tax_rate}%)</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Total With Tax</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px' }}>1</td>
                  <td style={{ padding: '8px', fontWeight: '600' }}>Supply & Installation of 16-CH CCTV Cameras & DVR</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>1</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>150,000</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{((150000 * designerForm.tax_rate) / 100).toLocaleString()}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{(150000 + (150000 * designerForm.tax_rate) / 100).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
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

      {/* Modal: Import Ticket to Invoice */}
      {showImportTicketModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', width: '560px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>+ Import Dispatched Job Ticket to Invoice</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Select a completed field installation ticket handoff from CRM & Inventory to auto-generate a client invoice.
            </p>
            <form onSubmit={handleImportTicketToInvoice}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>Active Dispatched Field Tickets</label>
                <select
                  value={selectedTicketId}
                  onChange={(e) => setSelectedTicketId(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '700' }}
                >
                  {availableTickets.map((t) => (
                    <option key={t.ticket_number} value={t.ticket_number}>
                      {t.ticket_number} - {t.customer_name} ({t.branch_name}) [Rs {t.total_amount.toLocaleString()}]
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowImportTicketModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  Generate Invoice from Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
