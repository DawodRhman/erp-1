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

export default function ClientInvoicing() {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('Bank AL Habib');
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [exchangeRate, setExchangeRate] = useState(278.5);
  const [numberOfCopies, setNumberOfCopies] = useState(4);

  const [dispatches, setDispatches] = useState<any[]>([]);
  const [showGenModal, setShowGenModal] = useState(false);
  const [selectedDispatchId, setSelectedDispatchId] = useState('');

  const { showToast } = useToastContext();
  const apiBase = getApiBaseUrl();

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

  const handleGenerateInvoice = async () => {
    if (!selectedDispatchId) {
      showToast('Please select a completed inventory dispatch', 'error');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/invoicing/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispatch_id: selectedDispatchId,
          customer_id: '808d1adb-a2a6-4545-97fc-cbef971f7db4',
          template_name: selectedTemplate,
          currency,
          exchange_rate: currency === 'USD' ? exchangeRate : 1.0,
          tax_type: selectedTemplate.includes('GST') ? 'GST' : 'SST',
          tax_rate: selectedTemplate === 'Bank AL Habib' ? 10 : 18,
          number_of_copies: numberOfCopies,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Automated Client Invoice & Summary Generated!', 'success');
        setShowGenModal(false);
        fetchInvoices();
        setSelectedInvoice(data.data);
      }
    } catch {
      showToast('Failed to generate client invoice', 'error');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--t1)' }}>Client Automated Invoicing & Summaries</h1>
          <p style={{ color: 'var(--t3)', marginTop: '4px' }}>
            Zero-manual-entry invoicing with client-specific templates (Bank AL Habib, Sindh Bank, Jamat Khana, DC Office, Private), USD/PKR conversion, and multi-copy printing.
          </p>
        </div>
        <button
          onClick={() => setShowGenModal(true)}
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
          <Sparkles size={18} /> Generate Invoice from Job
        </button>
      </div>

      {/* Controls Bar */}
      <div
        style={{
          backgroundColor: 'var(--bg2)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--b2)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--t3)', marginBottom: '4px' }}>Client Template Format</label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--b2)', backgroundColor: 'var(--bg3)', color: 'var(--t1)', fontWeight: '500' }}
          >
            <option value="Bank AL Habib">Bank AL Habib Format (SST 10%)</option>
            <option value="Sindh Bank">Sindh Bank Format (GST 18%)</option>
            <option value="Jamat Khana">Jamat Khana Format</option>
            <option value="DC Office">DC Office Format (SRB Exempt)</option>
            <option value="Private">Private Customer Format</option>
            <option value="Privat quotation on GST">Private GST Format</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--t3)', marginBottom: '4px' }}>Billing Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as any)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--b2)', backgroundColor: 'var(--bg3)', color: 'var(--t1)', fontWeight: '500' }}
          >
            <option value="PKR">PKR (Pakistani Rupee)</option>
            <option value="USD">USD (US Dollar)</option>
          </select>
        </div>

        {currency === 'USD' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--t3)', marginBottom: '4px' }}>USD Rate (PKR)</label>
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
              style={{ width: '100px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--b2)', backgroundColor: 'var(--bg3)', color: 'var(--t1)' }}
            />
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--t3)', marginBottom: '4px' }}>Multi-Copy Print</label>
          <select
            value={numberOfCopies}
            onChange={(e) => setNumberOfCopies(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--b2)', backgroundColor: 'var(--bg3)', color: 'var(--t1)', fontWeight: '500' }}
          >
            <option value={1}>1 Copy (Customer Copy)</option>
            <option value={2}>2 Copies (Customer + Finance)</option>
            <option value={4}>4 Copies (Customer, Finance, Audit, Bank)</option>
          </select>
        </div>
      </div>

      {/* Invoice Layout & Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Invoice List */}
        <div style={{ backgroundColor: 'var(--bg2)', borderRadius: '12px', border: '1px solid var(--b2)', padding: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--t1)' }}>Invoices & Summaries</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {invoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: selectedInvoice?.id === inv.id ? '2px solid var(--p1)' : '1px solid var(--b2)',
                  backgroundColor: selectedInvoice?.id === inv.id ? 'rgba(59,130,246,0.05)' : 'var(--bg3)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--t1)' }}>{inv.invoice_number}</span>
                  <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>{inv.status}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--t2)' }}>{inv.customer_name || 'Client'}</div>
                <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Format: {inv.template_name}</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--t1)' }}>Rs {Number(inv.total_amount).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Live Printable Document (Client Specific Template Display) */}
        <div style={{ backgroundColor: '#fff', color: '#000', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
          {selectedInvoice ? (
            <div>
              {/* Document Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#000', textTransform: 'uppercase' }}>{selectedInvoice.template_name} INVOICE</h2>
                  <p style={{ fontSize: '13px', color: '#4b5563' }}>Customer: {selectedInvoice.customer_name || 'Bank AL Habib Ltd'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '16px' }}>Invoice #: {selectedInvoice.invoice_number}</p>
                  <p style={{ fontSize: '13px', color: '#4b5563' }}>Date: {new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #000' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Sr #</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Unit Price</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total without Tax</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Tax ({selectedInvoice.tax_rate}%)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total with Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.items || [{ description: 'CCTV Installation & Equipment', quantity: 1, unit_price: selectedInvoice.subtotal, total_without_tax: selectedInvoice.subtotal, tax_amount: selectedInvoice.tax_amount, total_with_tax: selectedInvoice.total_amount }]).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px' }}>{idx + 1}</td>
                      <td style={{ padding: '8px', fontWeight: '500' }}>{item.description}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>Rs {Number(item.unit_price).toLocaleString()}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>Rs {Number(item.total_without_tax).toLocaleString()}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>Rs {Number(item.tax_amount).toLocaleString()}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Rs {Number(item.total_with_tax).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '20px' }}>
                <div style={{ maxWidth: '60%' }}>
                  <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#1f2937' }}>
                    Amount In Words: <span style={{ fontStyle: 'italic', fontWeight: 'normal' }}>{selectedInvoice.amount_in_words || 'One Hundred Fifty Thousand Rupees Only'}</span>
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                    Account #: 0420 0010120895360014 | Bank AL Habib Main Branch
                  </p>
                </div>
                <div style={{ width: '220px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Subtotal:</span>
                    <span>Rs {Number(selectedInvoice.subtotal).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Tax ({selectedInvoice.tax_type} {selectedInvoice.tax_rate}%):</span>
                    <span>Rs {Number(selectedInvoice.tax_amount).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: '4px', fontWeight: 'bold', fontSize: '15px' }}>
                    <span>Total Amount:</span>
                    <span>Rs {Number(selectedInvoice.total_amount).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Multi Copy Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '20px', borderTop: '1px dashed #d1d5db', fontSize: '12px' }}>
                <div>
                  <p>_______________________</p>
                  <p style={{ fontWeight: 'bold', marginTop: '4px' }}>Prepared By: Assistant Finance</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p>_______________________</p>
                  <p style={{ fontWeight: 'bold', marginTop: '4px' }}>Client Stamp & Signature</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => window.print()}
                  style={{ backgroundColor: '#1f2937', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600' }}
                >
                  <Printer size={16} /> Print {numberOfCopies} Official Copies
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
              <FileCheck size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', fontWeight: 'bold' }}>Select an Invoice to View Client Summary Format</p>
              <p style={{ fontSize: '14px', marginTop: '4px' }}>Or click "Generate Invoice from Job" to convert completed installation jobs directly.</p>
            </div>
          )}
        </div>
      </div>

      {/* Generate Invoice Modal */}
      {showGenModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg2)', borderRadius: '12px', padding: '24px', width: '500px', border: '1px solid var(--b2)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Generate Automated Client Invoice</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--t3)', marginBottom: '4px' }}>Select Completed Installation Job</label>
              <select
                value={selectedDispatchId}
                onChange={(e) => setSelectedDispatchId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--b2)', backgroundColor: 'var(--bg3)', color: 'var(--t1)' }}
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
              <button onClick={() => setShowGenModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--b2)', background: 'none', color: 'var(--t2)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleGenerateInvoice} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--p1)', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>
                Generate Client Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
