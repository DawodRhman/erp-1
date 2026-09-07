import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";
import { useToastContext } from "../../context/ToastContext";
import TaxRateControl from "../../components/common/TaxRateControl";
import SearchableSelect from "../../components/common/SearchableSelect";
import { dashboardPeriodLabel, dashboardPeriodOptions, type DashboardPeriod } from "../../utils/dashboardPeriod";
import {
  financeService,
  DirectFinanceInvoicePayload,
  FinanceBillingApproval,
  FinanceCustomer,
  FinanceExpenseType,
  FinanceInvoice,
  FinanceInvoiceItem,
} from "../../services/financeService";
import { printElementById } from "../../utils/printElement";
import "../../styles/finance.css";

const expenseTabs: Array<{ key: "all" | FinanceExpenseType; label: string }> = [
  { key: "all", label: "All" },
  { key: "operational_expenses", label: "Operational" },
  { key: "capital_expenses", label: "Capital" },
  { key: "complex_expenses", label: "Complex" },
  { key: "rental_expenses", label: "Rental" },
  { key: "footage_expenses", label: "Footage" },
];

const invoiceFormats = [
  { key: "hbl_single", label: "HBL Sale Tax Invoice" },
  { key: "hbl_summary", label: "HBL GST Summary Invoice" },
];

const expenseOptions: Array<{ key: FinanceExpenseType; label: string }> = [
  { key: "operational_expenses", label: "Operational Expenses" },
  { key: "capital_expenses", label: "Capital Expenses" },
  { key: "complex_expenses", label: "Complex Expenses" },
  { key: "rental_expenses", label: "Rental Expenses" },
  { key: "footage_expenses", label: "Footage Expenses" },
];

const company = {
  company_name: "Electronic Safety & Security PVT LTD",
  address: "Suit no 201, 2nd floor Kawish Crown, DAECHS Shahrah e Faisal Karachi",
  phone: "021-34330896",
  ntn: "3628486-6",
  gst: "1400362848614",
  account_title: "Electronic Safety & Security PVT LTD",
  account_no: "2443-80000-16603",
  compact_account_no: "24438000016603",
  bank: "Shahrah e Faisal Br 2443",
};

const hblBuyer = {
  name: "Habib Bank Limited",
  address: "06-Habib Bank Plaza I I Chundrigar Road Karachi Pakistan",
  phone: "92-21-32463238",
  ntn: "0698187-9",
  gst: "1700981301655",
};

const todayInput = () => new Date().toISOString().slice(0, 10);

function financeSummaryPath(invoice?: Partial<FinanceInvoice> | null) {
  const invoiceDate = String(invoice?.invoice_date || invoice?.created_at || todayInput());
  const month = /^\d{4}-\d{2}/.test(invoiceDate) ? invoiceDate.slice(0, 7) : todayInput().slice(0, 7);
  const params = new URLSearchParams({ month });
  if (invoice?.expense_type) params.set("expense_type", invoice.expense_type);
  if (invoice?.region) params.set("region", invoice.region);
  return `/finance/summaries?${params.toString()}`;
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `finance-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function numberToWords(value?: number | string | null) {
  const numeric = Math.floor(Number(value || 0));
  if (!numeric) return "Zero Rupees Only";
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const words = (n: number): string => {
    if (n < 20) return units[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${units[n % 10]}` : ""}`;
    if (n < 1000) return `${units[Math.floor(n / 100)]} Hundred${n % 100 ? ` and ${words(n % 100)}` : ""}`;
    if (n < 100000) return `${words(Math.floor(n / 1000))} Thousand${n % 1000 ? ` ${words(n % 1000)}` : ""}`;
    if (n < 10000000) return `${words(Math.floor(n / 100000))} Lakh${n % 100000 ? ` ${words(n % 100000)}` : ""}`;
    return `${words(Math.floor(n / 10000000))} Crore${n % 10000000 ? ` ${words(n % 10000000)}` : ""}`;
  };
  return `${words(numeric)} Rupees Only`;
}

function money(value?: number | string | null) {
  const numeric = Number(value || 0);
  return `PKR ${numeric.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
}

function amountValue(value?: number | string | null) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function dateText(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
}

function monthText(value: string) {
  const date = new Date(`${value || todayInput().slice(0, 7)}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function normalizeSummaryRows(rows: any[] = []) {
  return rows.map((row, index) => ({
    ...row,
    local_id: row.local_id || row.id || `${row.invoice_no || row.invoice_number || "summary"}-${index}`,
    invoice_no: row.invoice_no || row.invoice_number || "",
    client: row.client || row.customer_name || "",
    expense_type_label: row.expense_type_label || row.expense_type || "",
    region: row.region || "",
    amount_excl_tax: amountValue(row.amount_excl_tax || row.subtotal),
    sale_tax: amountValue(row.sale_tax || row.tax_amount),
    amount_incl_tax: amountValue(row.amount_incl_tax || row.total_amount),
    status: row.status || "ISSUED",
  }));
}

function statusLabel(status?: string) {
  if (!status) return "-";
  if (status === "CANCELLED") return "VOIDED";
  return status.replace(/_/g, " ");
}

function StatusBadge({ status }: { status?: string }) {
  const normalized = (status || "").toUpperCase();
  return <span className={`finance-badge finance-badge-${normalized.toLowerCase().replace(/_/g, "-")}`}>{statusLabel(normalized)}</span>;
}

function FinanceHero({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="finance-hero">
      <div>
        <p className="finance-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="finance-hero-action">{action}</div> : null}
    </section>
  );
}

function LoadingBlock() {
  return <div className="finance-card finance-muted">Loading finance data...</div>;
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="finance-card finance-error-box">
      <AlertTriangle size={20} />
      <span>{message}</span>
      {onRetry ? (
        <button type="button" className="finance-btn secondary" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, hint, tone = "blue" }: { label: string; value: React.ReactNode; hint?: string; tone?: string }) {
  return (
    <article className={`finance-stat finance-stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}

function getInvoiceNotes(invoice: FinanceInvoice) {
  const notes = ((invoice as any).notes_json || invoice.notes || {}) as Record<string, any>;
  return notes;
}

function getInvoiceRows(invoice: FinanceInvoice, notes: Record<string, any>) {
  const baseRows = invoice.items?.length
    ? invoice.items
    : [{ description: notes.work_description || invoice.work_description || "Service work", quantity: 1, unit_price: invoice.subtotal || invoice.total_amount || 0, total_without_tax: invoice.subtotal || 0, tax_amount: invoice.tax_amount || 0, total_with_tax: invoice.total_amount || 0 }];
  return Array.isArray(notes.footage_rows) && notes.footage_rows.length ? notes.footage_rows : baseRows;
}

function invoiceTotals(invoice: FinanceInvoice, rows: FinanceInvoiceItem[]) {
  const totalExcl = rows.reduce((sum: number, item: FinanceInvoiceItem) => sum + Number(item.total_without_tax || item.amount_excl_tax || 0), 0) || Number(invoice.subtotal || 0);
  const totalTax = rows.reduce((sum: number, item: FinanceInvoiceItem) => sum + Number(item.tax_amount || item.sale_tax || 0), 0) || Number(invoice.tax_amount || 0);
  const totalIncl = rows.reduce((sum: number, item: FinanceInvoiceItem) => sum + Number(item.total_with_tax || item.amount_incl_tax || 0), 0) || Number(invoice.total_amount || 0);
  return { totalExcl, totalTax, totalIncl };
}

function InvoiceDocument({ invoice }: { invoice: FinanceInvoice }) {
  const notes = getInvoiceNotes(invoice);
  const format = String(notes.invoice_format || invoice.invoice_format || "").toLowerCase();
  if (format === "hbl_summary" || format === "hbl_footage" || invoice.expense_type === "footage_expenses") {
    return <HblSummaryInvoiceDocument invoice={invoice} notes={notes} />;
  }
  return <HblSingleInvoiceDocument invoice={invoice} notes={notes} />;
}

function HblSingleInvoiceDocument({ invoice, notes }: { invoice: FinanceInvoice; notes: Record<string, any> }) {
  const rows = getInvoiceRows(invoice, notes);
  const invoiceDate = invoice.invoice_date || invoice.created_at || todayInput();
  const { totalIncl } = invoiceTotals(invoice, rows);
  const paddedRows = [...rows, ...Array.from({ length: Math.max(0, 5 - rows.length) }, () => ({} as FinanceInvoiceItem))];

  return (
    <div className="finance-invoice-sheet hbl-single" id="finance-invoice-preview">
      <div className="hbl-sale-title">Sale Tax Invoice</div>
      <div className="hbl-sale-meta">
        <div><strong>{hblBuyer.name}:</strong></div>
        <div><strong>Invoice no.</strong></div>
        <div>{invoice.invoice_number || "Pending"}</div>

        <div><strong>Branch Code:-</strong> {invoice.branch_code || notes.branch_code || "-"}</div>
        <div><strong>Date</strong></div>
        <div>{dateText(invoiceDate)}</div>

        <div><strong>PO#</strong> {invoice.po_number || notes.po_number || "-"}</div>
        <div><strong>NTN no.</strong></div>
        <div>{company.ntn}</div>

        <div><strong>Region:{invoice.region || notes.region || "Karachi"}</strong></div>
        <div><strong>GST No.</strong></div>
        <div>{company.gst}</div>

        <div></div>
        <div><strong>D/C No</strong></div>
        <div>{notes.dc_no || invoice.dispatch_number || invoice.token_number || "-"}</div>
      </div>

      <table className="finance-invoice-table hbl-sale-table">
        <thead>
          <tr>
            <th>S No</th>
            <th>Model Number/Brand Name</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Value Excl.</th>
            <th>GST Amount</th>
            <th>Value Incl.</th>
          </tr>
        </thead>
        <tbody>
          {paddedRows.map((item, index) => {
            const hasItem = Boolean(item.description || item.product_name || item.brand_model);
            return (
              <tr key={`${item.description || item.product_name || "blank"}-${index}`}>
                <td>{hasItem ? index + 1 : ""}</td>
                <td>{item.brand_model || item.product_name || item.description || ""}</td>
                <td>{item.description || item.product_name || ""}</td>
                <td>{hasItem ? Number(item.quantity || 1) : ""}</td>
                <td>{hasItem ? money(item.unit_price || 0).replace("PKR ", "Rs ") : ""}</td>
                <td>{hasItem ? money(item.total_without_tax || item.amount_excl_tax || 0).replace("PKR ", "Rs ") : ""}</td>
                <td>{hasItem ? money(item.tax_amount || item.sale_tax || 0).replace("PKR ", "Rs ") : ""}</td>
                <td>{hasItem ? money(item.total_with_tax || item.amount_incl_tax || 0).replace("PKR ", "Rs ") : ""}</td>
              </tr>
            );
          })}
          <tr className="finance-invoice-total-row">
            <td colSpan={7}>Total</td>
            <td>{money(totalIncl).replace("PKR ", "Rs ")}</td>
          </tr>
        </tbody>
      </table>

      <div className="finance-invoice-footer hbl-sale-footer">
        <p><strong>Amount in word:</strong> {invoice.amount_in_words || numberToWords(totalIncl)}</p>
        <p>Please make the payment in favor of <strong>Electronic Safety &amp; Security Private Limited</strong></p>
        <p><strong>Account #:</strong> {company.compact_account_no}</p>
        <div className="finance-signature">
          <span>Prepared By</span>
          <strong>{notes.prepared_by || "Accounts department"}</strong>
        </div>
      </div>
    </div>
  );
}

function HblSummaryInvoiceDocument({ invoice, notes }: { invoice: FinanceInvoice; notes: Record<string, any> }) {
  const rows = getInvoiceRows(invoice, notes);
  const invoiceDate = invoice.invoice_date || invoice.created_at || todayInput();
  const subtitle = `FOR HBL ${notes.work_description || invoice.work_description || invoice.expense_type_label || "SERVICES"}`;
  const { totalExcl, totalTax, totalIncl } = invoiceTotals(invoice, rows);

  return (
    <div className="finance-invoice-sheet hbl-summary-layout" id="finance-invoice-preview">
      <div className="finance-invoice-header">
        <div>
          <p><strong>Supplier&apos;s Name:</strong> {company.company_name}</p>
          <p><strong>Address:</strong> {company.address}</p>
          <p><strong>Telephone No:</strong> {company.phone}</p>
          <p><strong>NTN #:</strong> {company.ntn}</p>
          <p><strong>ST Registration No.:</strong> {company.gst}</p>
          <p><strong>Account Title:</strong> {company.account_title}</p>
          <p><strong>Account No.:</strong> {company.account_no}</p>
          <p><strong>Branch Name &amp; Code:</strong> {company.bank}</p>
        </div>
        <div>
          <p><strong>Ref #:</strong> {invoice.ref_no || notes.ref_no || "-"}</p>
          <p><strong>Date:</strong> {dateText(invoiceDate)}</p>
          <p><strong>Buyer&apos;s Name:</strong> {hblBuyer.name}</p>
          <p><strong>Address:</strong> {hblBuyer.address}</p>
          <p><strong>Telephone No.:</strong> {hblBuyer.phone}</p>
          <p><strong>NTN #:</strong> {hblBuyer.ntn}</p>
          <p><strong>ST Registration No.:</strong> {hblBuyer.gst}</p>
        </div>
      </div>

      <div className="finance-invoice-title">
        <h2>GENERAL SALE TAX INVOICE (GST)</h2>
        <p>{subtitle}</p>
      </div>

      <table className="finance-invoice-table hbl-summary">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Branch Code</th>
            <th>Branch Name</th>
            <th>Region</th>
            <th>Nature of Work</th>
            <th>PO Number</th>
            <th>Invoice Date</th>
            <th>Invoice No</th>
            <th>FBR Invoice number</th>
            <th>Amount Exclusive of Sale Tax</th>
            <th>Sale Tax</th>
            <th>Amount Inclusive of Sale Tax</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item: FinanceInvoiceItem, index: number) => (
            <tr key={`${item.description || item.product_name || "row"}-${index}`}>
              <td>{index + 1}</td>
              <td>{item.branch_code || invoice.branch_code || notes.branch_code || "-"}</td>
              <td>{item.branch_name || invoice.branch_name || notes.branch_name || invoice.customer_name || "-"}</td>
              <td>{item.region || invoice.region || notes.region || "Karachi"}</td>
              <td>{item.description || item.product_name || invoice.work_description || notes.work_description || "-"}</td>
              <td>{item.po_number || invoice.po_number || notes.po_number || "-"}</td>
              <td>{dateText(item.invoice_date || invoiceDate)}</td>
              <td>{item.invoice_no || invoice.invoice_number || "Pending"}</td>
              <td>{item.fbr_invoice_no || invoice.fbr_invoice_no || notes.fbr_invoice_no || "-"}</td>
              <td>{money(item.total_without_tax || (item as any).amount_excl_tax)}</td>
              <td>{money(item.tax_amount || (item as any).sale_tax)}</td>
              <td>{money(item.total_with_tax || (item as any).amount_incl_tax)}</td>
            </tr>
          ))}
          <tr className="finance-invoice-total-row">
            <td colSpan={9}>Total</td>
            <td>{money(totalExcl || invoice.subtotal)}</td>
            <td>{money(totalTax || invoice.tax_amount)}</td>
            <td>{money(totalIncl)}</td>
          </tr>
        </tbody>
      </table>

      <div className="finance-invoice-footer">
        <p><strong>Amount In Words:</strong> {invoice.amount_in_words || numberToWords(totalIncl)}</p>
        <p>Please make the payment in favor of <strong>Electronic Safety &amp; Security Private Limited</strong></p>
        <p><strong>Account #:</strong> {company.compact_account_no}</p>
        <div className="finance-signature">
          <span>Prepared By</span>
          <strong>{notes.prepared_by || "Finance Officer"}</strong>
          <strong>Accounts Department</strong>
        </div>
      </div>
    </div>
  );
}

function ApprovalBreakdown({ approval }: { approval: FinanceBillingApproval }) {
  const breakdown = approval.bill_breakdown || approval.breakdown;
  if (!breakdown) {
    return <div className="finance-muted">No detailed breakdown is attached to this bill yet.</div>;
  }

  const renderItems = (items: Array<Record<string, any>>, empty: string) => {
    if (!items?.length) return <p className="finance-muted">{empty}</p>;
    return (
      <ul className="finance-breakdown-list">
        {items.map((item, index) => (
          <li key={`${item.product_name || item.description || "item"}-${index}`}>
            <span>{item.product_name || item.description || "Inventory item"} x {Number(item.quantity || item.qty || 0)}</span>
            <strong>{money(item.total_with_tax || item.amount || item.total || 0)}</strong>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="finance-breakdown-grid">
      <section>
        <h3>Items Installed</h3>
        {renderItems(breakdown.installed_items, "No installed items recorded.")}
      </section>
      <section>
        <h3>Returns Deducted</h3>
        {renderItems(breakdown.returned_items, "No return deduction.")}
      </section>
      <section>
        <h3>Extra Items Added</h3>
        {renderItems(breakdown.extra_items, "No extra items added.")}
      </section>
      <section className="finance-final-total">
        <h3>Final Bill</h3>
        <p><span>Original Total</span><strong>{money(breakdown.original_total)}</strong></p>
        <p><span>Returns Deducted</span><strong>-{money(breakdown.returns_deducted)}</strong></p>
        <p><span>Extra Added</span><strong>{money(breakdown.extra_added)}</strong></p>
        <p><span>Final Amount</span><strong>{Number(breakdown.final_amount || 0) <= 0 ? "No charge" : money(breakdown.final_amount)}</strong></p>
      </section>
    </div>
  );
}

export function FinanceDashboard() {
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState<DashboardPeriod>("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await financeService.getDashboard({ period }));
    } catch {
      setError("Finance dashboard data could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [period]);

  if (loading) return <main className="finance-page"><LoadingBlock /></main>;
  if (error) return <main className="finance-page"><ErrorBlock message={error} onRetry={load} /></main>;

  return (
    <main className="finance-page">
      <FinanceHero
        eyebrow="Finance Service"
        title="Finance Dashboard"
        description="Approvals, invoices and payments."
        action={<button className="finance-btn secondary" onClick={load}><RefreshCw size={16} /> Refresh</button>}
      />

      <section className="finance-period-filter" aria-label="Finance dashboard period">
        <div>
          <strong>Dashboard Period</strong>
          <span>Showing live finance activity for {dashboardPeriodLabel(period).toLowerCase()}.</span>
        </div>
        <div className="finance-period-buttons">
          {dashboardPeriodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={period === option.value ? "is-active" : ""}
              onClick={() => setPeriod(option.value)}
              disabled={loading}
            >
              {option.label}
              <small>{option.detail}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="finance-stat-grid four">
        <StatCard label="Pending Billing Approvals" value={data?.stats?.pending_billing_approvals || 0} hint={`${dashboardPeriodLabel(period)} intake`} />
        <StatCard label={`Invoices - ${dashboardPeriodLabel(period)}`} value={data?.stats?.invoices_in_period ?? data?.stats?.invoices_this_month ?? 0} hint="Issued and paid" tone="green" />
        <StatCard label={`Revenue - ${dashboardPeriodLabel(period)}`} value={money(data?.stats?.revenue_in_period ?? data?.stats?.revenue_this_month)} hint="Issued invoice total" tone="teal" />
        <StatCard label="Pending Payments" value={data?.stats?.pending_payments || 0} hint={`${dashboardPeriodLabel(period)} issued invoices`} tone="orange" />
      </section>

      <section className="finance-two-col">
        <div className="finance-card">
          <div className="finance-card-head">
            <div>
              <p className="finance-eyebrow dark">{dashboardPeriodLabel(period)} - Last 5</p>
              <h2>Pending Billing Approvals</h2>
            </div>
            <Link to="/finance/billing-approvals" className="finance-link">Open all</Link>
          </div>
          <table className="finance-table">
            <thead>
              <tr><th>Token / Order</th><th>Client</th><th>Final Amount</th><th>Action</th></tr>
            </thead>
            <tbody>
              {(data?.pending_approvals || []).map((item: FinanceBillingApproval) => (
                <tr key={item.id}>
                  <td>{item.token_number || item.order_number || item.invoice_number}</td>
                  <td>{item.customer_name}</td>
                  <td>{money(item.total_amount)}</td>
                  <td><Link className="finance-small-btn" to={`/finance/billing-approvals/${item.id}`}>Review</Link></td>
                </tr>
              ))}
              {!data?.pending_approvals?.length ? <tr><td colSpan={4}>No pending approvals.</td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="finance-card">
          <div className="finance-card-head">
            <div>
              <p className="finance-eyebrow dark">{dashboardPeriodLabel(period)} - Last 5</p>
              <h2>Recent Invoices</h2>
            </div>
            <Link to="/finance/invoices" className="finance-link">Open ledger</Link>
          </div>
          <table className="finance-table">
            <thead>
              <tr><th>Invoice</th><th>Client</th><th>Status</th><th>Total</th></tr>
            </thead>
            <tbody>
              {(data?.recent_invoices || []).map((item: FinanceInvoice) => (
                <tr key={item.id}>
                  <td>{item.invoice_number}</td>
                  <td>{item.customer_name}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>{money(item.total_amount)}</td>
                </tr>
              ))}
              {!data?.recent_invoices?.length ? <tr><td colSpan={4}>No invoices yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export function BillingApprovals() {
  const [approvals, setApprovals] = useState<FinanceBillingApproval[]>([]);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setApprovals(await financeService.getBillingApprovals({ status: status === "ALL" ? undefined : status, search }));
    } catch {
      setError("Billing approvals could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  return (
    <main className="finance-page">
      <FinanceHero
        eyebrow="Finance Step 1"
        title="Billing Approvals"
        description="Review billing and issue the invoice."
        action={<button className="finance-btn secondary" onClick={load}><RefreshCw size={16} /> Refresh</button>}
      />
      <section className="finance-toolbar">
        <div className="finance-search">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && load()} placeholder="Search token, order, client or invoice" />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="NO_CHARGE">No charge</option>
        </select>
        <button className="finance-btn secondary" onClick={load}>Search</button>
      </section>

      <div className="finance-flow-note">
        <CheckCircle2 size={18} />
        <div>
          <strong>Inventory billing handoff</strong>
          <span>Pending bills require Finance review. Approved bills remain visible here as issued history.</span>
        </div>
      </div>

      {loading ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={load} /> : (
        <section className="finance-card">
          <table className="finance-table">
            <thead>
              <tr>
                <th>Token / Order</th>
                <th>Client</th>
                <th>Original Amount</th>
                <th>Returns Deducted</th>
                <th>Final Amount</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((approval) => {
                const finalAmount = Number(approval.bill_breakdown?.final_amount ?? approval.final_amount ?? approval.total_amount ?? 0);
                return (
                <tr key={approval.id}>
                  <td><strong>{approval.token_number || approval.order_number || approval.invoice_number}</strong><small>{approval.invoice_number}</small></td>
                  <td>{approval.customer_name}</td>
                  <td>{money(approval.bill_breakdown?.original_total ?? approval.original_amount ?? approval.subtotal)}</td>
                  <td>-{money(approval.bill_breakdown?.returns_deducted ?? approval.returns_deducted ?? 0)}</td>
                  <td>{finalAmount <= 0 ? <span className="finance-no-charge-value">No charge</span> : money(finalAmount)}</td>
                  <td>{dateText(approval.submitted_date || approval.created_at)}</td>
                  <td><StatusBadge status={approval.approval_status || approval.status} /></td>
                  <td><Link className="finance-small-btn" to={`/finance/billing-approvals/${approval.id}`}><Eye size={14} /> {(approval.approval_status || "PENDING") === "PENDING" ? "Review" : "View"}</Link></td>
                </tr>
                );
              })}
              {!approvals.length ? (
                <tr><td colSpan={8} className="finance-empty-cell">
                  {status === "PENDING"
                    ? "No pending bills. A bill appears here after Inventory confirms returns and sends the adjusted bill to Finance."
                    : `No ${status.toLowerCase()} billing records found.`}
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}

export function BillingApprovalDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const [approval, setApproval] = useState<FinanceBillingApproval | null>(null);
  const [expenseType, setExpenseType] = useState<FinanceExpenseType>("operational_expenses");
  const [invoiceFormat, setInvoiceFormat] = useState("hbl_single");
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await financeService.getBillingApproval(id);
      setApproval(data);
      setExpenseType((data.expense_type as FinanceExpenseType) || "operational_expenses");
      setInvoiceFormat(data.invoice_format === "hbl_single_branch" ? "hbl_single" : data.invoice_format || "hbl_single");
    } catch {
      setError("Billing approval detail could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const approve = async () => {
    if (!approval) return;
    setSaving(true);
    try {
      const next = await financeService.approveBillingApproval(approval.id, { expense_type: expenseType, invoice_format: invoiceFormat });
      setApproval(next);
      showToast("Invoice issued. Next: open Invoices or Monthly Summaries.", "success");
    } catch {
      showToast("Invoice could not be issued.", "error");
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    if (!approval) return;
    if (!rejectReason.trim()) {
      showToast("Please enter a rejection note first.", "error");
      return;
    }
    setSaving(true);
    try {
      const next = await financeService.rejectBillingApproval(approval.id, rejectReason);
      setApproval(next);
      showToast("Billing request rejected.", "success");
    } catch {
      showToast("Billing request could not be rejected.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="finance-page"><LoadingBlock /></main>;
  if (error || !approval) return <main className="finance-page"><ErrorBlock message={error || "Billing approval not found."} onRetry={load} /></main>;

  const finalAmount = Number(approval.bill_breakdown?.final_amount ?? approval.breakdown?.final_amount ?? approval.final_amount ?? approval.total_amount ?? 0);
  const isNoCharge = finalAmount <= 0 || (approval.approval_status || "").toUpperCase() === "NO_CHARGE";
  const isIssued = (approval.approval_status || approval.status || "").toUpperCase() === "ISSUED";

  return (
    <main className="finance-page">
      <FinanceHero
        eyebrow="Billing Review"
        title={approval.invoice_number}
        description={`${approval.customer_name || "Client"} - ${approval.token_number || approval.order_number || "No token reference"}`}
        action={<button className="finance-btn secondary" onClick={() => navigate("/finance/billing-approvals")}>Back to approvals</button>}
      />

      <section className="finance-review-grid">
        <div className="finance-card">
          <div className="finance-card-head">
            <div>
              <p className="finance-eyebrow dark">Full breakdown</p>
              <h2>Inventory Bill Detail</h2>
            </div>
            <StatusBadge status={approval.approval_status || approval.status} />
          </div>
          <ApprovalBreakdown approval={approval} />
        </div>

        <div className="finance-card finance-action-panel">
          <h2>Finance Action</h2>
          {isNoCharge ? (
            <div className="finance-no-charge-note">
              <strong>No payable invoice</strong>
              <span>Every chargeable item was returned. This record is kept as a no-charge closure and cannot be issued as an invoice.</span>
            </div>
          ) : null}
          <label>Expense type</label>
          <select value={expenseType} onChange={(event) => setExpenseType(event.target.value as FinanceExpenseType)}>
            {expenseOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
          <label>Invoice format</label>
          <select value={invoiceFormat} onChange={(event) => setInvoiceFormat(event.target.value)}>
            {invoiceFormats.map((format) => <option key={format.key} value={format.key}>{format.label}</option>)}
          </select>
          <button className="finance-btn primary" onClick={approve} disabled={saving || approval.status === "ISSUED" || isNoCharge}>
            <CheckCircle2 size={18} /> Approve & Generate Invoice
          </button>
          {isIssued ? (
            <div className="finance-next-actions">
              <button className="finance-btn secondary" onClick={() => navigate("/finance/invoices")}><FileText size={17} /> View Invoice</button>
              <button className="finance-btn primary" onClick={() => navigate(financeSummaryPath(approval))}><FileSpreadsheet size={17} /> Open Monthly Summary</button>
            </div>
          ) : null}
          <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Rejection note for Inventory / CRM" />
          <button className="finance-btn danger" onClick={reject} disabled={saving || approval.status === "ISSUED" || isNoCharge}>
            <XCircle size={18} /> Reject Bill
          </button>
          <button className="finance-btn secondary" onClick={() => printElementById("finance-invoice-preview", approval.invoice_number)} disabled={isNoCharge}>
            <Printer size={18} /> Print Preview
          </button>
        </div>
      </section>

      <section className="finance-card">
        <div className="finance-card-head">
          <div>
            <p className="finance-eyebrow dark">Preview</p>
            <h2>Invoice Format</h2>
          </div>
        </div>
        {isNoCharge ? (
          <div className="finance-no-charge-preview">
            <CheckCircle2 size={28} />
            <strong>No invoice generated</strong>
            <span>The adjusted total is zero because all chargeable items were returned.</span>
          </div>
        ) : (
          <InvoiceDocument invoice={{ ...approval, expense_type: expenseType, invoice_format: invoiceFormat }} />
        )}
      </section>
    </main>
  );
}

type DirectInvoiceRow = FinanceInvoiceItem & {
  local_id: string;
  gst_rate: number;
};

interface DirectInvoiceForm {
  expense_type: FinanceExpenseType;
  invoice_format: string;
  customer_id: string;
  branch_name: string;
  branch_code: string;
  region: string;
  ref_no: string;
  invoice_date: string;
  po_number: string;
  work_description: string;
  fbr_invoice_no: string;
}

function newDirectRow(expenseType: FinanceExpenseType): DirectInvoiceRow {
  return {
    local_id: createIdempotencyKey(),
    description: "",
    quantity: 1,
    unit_price: 0,
    gst_rate: expenseType === "rental_expenses" || expenseType === "footage_expenses" ? 10 : 18,
    total_without_tax: 0,
    tax_amount: 0,
    total_with_tax: 0,
    branch_code: "",
    branch_name: "",
    region: "Karachi",
    footage_approval_date: todayInput(),
    footage_retrieval_date: todayInput(),
    invoice_date: todayInput(),
    invoice_no: "",
  };
}

function buildCalculatedRows(rows: DirectInvoiceRow[], form: DirectInvoiceForm): DirectInvoiceRow[] {
  return rows.map((row) => {
    const quantity = form.expense_type === "footage_expenses" ? 1 : Number(row.quantity || 0);
    const gstRate = Number(row.gst_rate ?? 18);
    const amountExcl = form.expense_type === "footage_expenses"
      ? Number(row.amount_excl_tax || row.total_without_tax || 0)
      : quantity * Number(row.unit_price || 0);
    const saleTax = form.expense_type === "footage_expenses"
      ? Number(row.sale_tax || row.tax_amount || amountExcl * (gstRate / 100))
      : amountExcl * (gstRate / 100);
    const amountIncl = form.expense_type === "footage_expenses"
      ? Number(row.amount_incl_tax || row.total_with_tax || amountExcl + saleTax)
      : amountExcl + saleTax;

    return {
      ...row,
      quantity,
      gst_rate: gstRate,
      total_without_tax: amountExcl,
      tax_amount: saleTax,
      total_with_tax: amountIncl,
      amount_excl_tax: amountExcl,
      sale_tax: saleTax,
      amount_incl_tax: amountIncl,
      branch_code: row.branch_code || form.branch_code,
      branch_name: row.branch_name || form.branch_name,
      region: row.region || form.region || "Karachi",
      invoice_date: row.invoice_date || form.invoice_date,
      po_number: row.po_number || form.po_number,
      fbr_invoice_no: row.fbr_invoice_no || form.fbr_invoice_no,
    };
  });
}

function NewInvoiceWizard({
  onClose,
  onGenerated,
}: {
  onClose: () => void;
  onGenerated: (invoice: FinanceInvoice) => void;
}) {
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<FinanceCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState<FinanceInvoice | null>(null);
  const [idempotencyKey] = useState(() => createIdempotencyKey());
  const [form, setForm] = useState<DirectInvoiceForm>({
    expense_type: "operational_expenses",
    invoice_format: "hbl_single",
    customer_id: "",
    branch_name: "",
    branch_code: "",
    region: "Karachi",
    ref_no: "",
    invoice_date: todayInput(),
    po_number: "",
    work_description: "",
    fbr_invoice_no: "",
  });
  const [rows, setRows] = useState<DirectInvoiceRow[]>(() => [newDirectRow("operational_expenses")]);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const data = await financeService.getCustomers();
      setCustomers(data);
    } catch {
      showToast("Client list could not be loaded.", "error");
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const selectedCustomer = customers.find((customer) => customer.id === form.customer_id);
  const calculatedRows = useMemo(() => buildCalculatedRows(rows, form), [rows, form]);
  const totals = useMemo(() => ({
    subtotal: calculatedRows.reduce((sum, row) => sum + Number(row.total_without_tax || 0), 0),
    tax: calculatedRows.reduce((sum, row) => sum + Number(row.tax_amount || 0), 0),
    total: calculatedRows.reduce((sum, row) => sum + Number(row.total_with_tax || 0), 0),
  }), [calculatedRows]);
  const expenseLabel = expenseOptions.find((option) => option.key === form.expense_type)?.label || "Operational Expenses";

  const previewInvoice: FinanceInvoice = generated || {
    id: "preview",
    invoice_number: "Pending until generated",
    customer_id: form.customer_id,
    customer_name: selectedCustomer?.customer_name || "Habib Bank Limited",
    expense_type: form.expense_type,
    expense_type_label: expenseLabel,
    invoice_format: form.invoice_format,
    status: "PREVIEW",
    invoice_date: form.invoice_date,
    subtotal: totals.subtotal,
    tax_amount: totals.tax,
    total_amount: totals.total,
    amount_in_words: numberToWords(totals.total),
    branch_name: form.branch_name,
    branch_code: form.branch_code,
    region: form.region,
    po_number: form.po_number,
    fbr_invoice_no: form.fbr_invoice_no,
    work_description: form.work_description,
    notes_json: {
      ...form,
      prepared_by: "Finance Officer",
      invoice_format: form.invoice_format,
      footage_rows: form.expense_type === "footage_expenses" ? calculatedRows : [],
    },
    items: calculatedRows,
  };

  const updateForm = (patch: Partial<DirectInvoiceForm>) => setForm((current) => ({ ...current, ...patch }));
  const updateRow = (localId: string, patch: Partial<DirectInvoiceRow>) => {
    setRows((current) => current.map((row) => row.local_id === localId ? { ...row, ...patch } : row));
  };

  const switchExpenseType = (expenseType: FinanceExpenseType) => {
    updateForm({ expense_type: expenseType });
    setRows([newDirectRow(expenseType)]);
    setGenerated(null);
    setStep(2);
  };

  const addRow = () => {
    if (rows.length >= 20) {
      showToast("Maximum 20 rows allowed.", "error");
      return;
    }
    setRows((current) => [...current, newDirectRow(form.expense_type)]);
  };

  const removeRow = (localId: string) => {
    setRows((current) => current.length === 1 ? current : current.filter((row) => row.local_id !== localId));
  };

  const validate = () => {
    if (!form.customer_id) return "Please select a client / bank.";
    if (!form.work_description.trim()) return "Work description is required.";
    if (!calculatedRows.every((row) => String(row.description || "").trim())) return "Each row needs a description.";
    if (!calculatedRows.some((row) => Number(row.total_with_tax || 0) > 0)) return "At least one row must have an amount.";
    return "";
  };

  const generateInvoice = async () => {
    const message = validate();
    if (message) {
      showToast(message, "error");
      return;
    }
    setSaving(true);
    try {
      const payload: DirectFinanceInvoicePayload = {
        idempotency_key: idempotencyKey,
        expense_type: form.expense_type,
        invoice_format: form.invoice_format,
        customer_id: form.customer_id,
        branch_name: form.branch_name,
        branch_code: form.branch_code,
        region: form.region,
        ref_no: form.ref_no,
        invoice_date: form.invoice_date,
        po_number: form.po_number,
        work_description: form.work_description,
        fbr_invoice_no: form.fbr_invoice_no,
        items: calculatedRows,
      };
      const invoice = await financeService.createInvoice(payload);
      setGenerated(invoice);
      onGenerated(invoice);
      setStep(4);
      showToast("Invoice issued. Next: download it or open Monthly Summaries.", "success");
    } catch {
      showToast("Invoice could not be generated.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="finance-modal-backdrop">
      <section className="finance-modal finance-new-invoice">
        <div className="finance-modal-head">
          <div>
            <p className="finance-eyebrow dark">Direct Invoice</p>
            <h2>New HBL Invoice</h2>
          </div>
          <button className="finance-small-btn" onClick={onClose}>Close</button>
        </div>

        <div className="finance-stepper">
          {[1, 2, 3, 4].map((item) => (
            <button key={item} className={step === item ? "active" : ""} onClick={() => setStep(item)}>
              Step {item}
            </button>
          ))}
        </div>

        <div className="finance-wizard-section">
          <h3>Step 1 - Select Invoice Type</h3>
          <div className="finance-type-grid">
            {expenseOptions.map((option) => (
              <button key={option.key} className={form.expense_type === option.key ? "active" : ""} onClick={() => switchExpenseType(option.key)}>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="finance-wizard-section">
          <h3>Step 2 - Invoice Details</h3>
          <div className="finance-form-grid">
            <label>Client / Bank
              <SearchableSelect
                disabled={loadingCustomers}
                value={form.customer_id}
                onChange={(customer_id) => updateForm({ customer_id })}
                placeholder={loadingCustomers ? "Loading clients..." : "Search or select client / bank"}
                options={customers.map((customer) => ({
                  value: customer.id,
                  label: `${customer.customer_name}${customer.email ? ` - ${customer.email}` : ""}`,
                }))}
              />
            </label>
            <label>Branch Name<input value={form.branch_name} onChange={(event) => updateForm({ branch_name: event.target.value })} /></label>
            <label>Branch Code<input value={form.branch_code} onChange={(event) => updateForm({ branch_code: event.target.value })} /></label>
            <label>Region<input value={form.region} onChange={(event) => updateForm({ region: event.target.value })} /></label>
            <label>Ref #<input value={form.ref_no} onChange={(event) => updateForm({ ref_no: event.target.value })} placeholder="Auto if empty" /></label>
            <label>Invoice Date<input type="date" value={form.invoice_date} onChange={(event) => updateForm({ invoice_date: event.target.value })} /></label>
            <label>Invoice Format
              <select value={form.invoice_format} onChange={(event) => updateForm({ invoice_format: event.target.value })}>
                {invoiceFormats.map((format) => <option key={format.key} value={format.key}>{format.label}</option>)}
              </select>
            </label>
            <label>PO Number<input value={form.po_number} onChange={(event) => updateForm({ po_number: event.target.value })} placeholder="Optional" /></label>
            <label>FBR Invoice No<input value={form.fbr_invoice_no} onChange={(event) => updateForm({ fbr_invoice_no: event.target.value })} placeholder="Optional" /></label>
            <label className="finance-span-2">Work Description<textarea value={form.work_description} onChange={(event) => updateForm({ work_description: event.target.value })} placeholder="HBL CCTV camera reinstalled bill month of May 2026" /></label>
          </div>
        </div>

        <div className="finance-wizard-section">
          <div className="finance-card-head">
            <h3>Step 3 - Items Table</h3>
            <button className="finance-btn primary" onClick={addRow}><Plus size={16} /> Add Row</button>
          </div>
          <div className="finance-edit-table-wrap">
            {form.expense_type === "footage_expenses" ? (
              <table className="finance-table finance-edit-table">
                <thead><tr><th>S.No</th><th>Branch Code</th><th>Branch Name</th><th>Region</th><th>Approval Date</th><th>Retrieval Date</th><th>Invoice Date</th><th>Invoice No</th><th>Description</th><th>Amount Excl.</th><th>Sale Tax</th><th>Incl.</th><th></th></tr></thead>
                <tbody>
                  {calculatedRows.map((row, index) => (
                    <tr key={row.local_id}>
                      <td>{index + 1}</td>
                      <td><input value={row.branch_code || ""} onChange={(event) => updateRow(row.local_id, { branch_code: event.target.value })} /></td>
                      <td><input value={row.branch_name || ""} onChange={(event) => updateRow(row.local_id, { branch_name: event.target.value })} /></td>
                      <td><input value={row.region || ""} onChange={(event) => updateRow(row.local_id, { region: event.target.value })} /></td>
                      <td><input type="date" value={row.footage_approval_date || ""} onChange={(event) => updateRow(row.local_id, { footage_approval_date: event.target.value })} /></td>
                      <td><input type="date" value={row.footage_retrieval_date || ""} onChange={(event) => updateRow(row.local_id, { footage_retrieval_date: event.target.value })} /></td>
                      <td><input type="date" value={row.invoice_date || form.invoice_date} onChange={(event) => updateRow(row.local_id, { invoice_date: event.target.value })} /></td>
                      <td><input value={row.invoice_no || ""} onChange={(event) => updateRow(row.local_id, { invoice_no: event.target.value })} /></td>
                      <td><input value={row.description || ""} onChange={(event) => updateRow(row.local_id, { description: event.target.value })} /></td>
                      <td><input type="number" value={row.total_without_tax || ""} onChange={(event) => updateRow(row.local_id, { amount_excl_tax: Number(event.target.value), total_without_tax: Number(event.target.value) })} /></td>
                      <td><input type="number" value={row.tax_amount || ""} onChange={(event) => updateRow(row.local_id, { sale_tax: Number(event.target.value), tax_amount: Number(event.target.value) })} /></td>
                      <td>{money(row.total_with_tax)}</td>
                      <td><button className="finance-icon-btn" onClick={() => removeRow(row.local_id)}><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="finance-table finance-edit-table">
                <thead><tr><th>S.No</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount Excl.</th><th>GST%</th><th>Tax</th><th>Incl.</th><th></th></tr></thead>
                <tbody>
                  {calculatedRows.map((row, index) => (
                    <tr key={row.local_id}>
                      <td>{index + 1}</td>
                      <td><input value={row.description || ""} onChange={(event) => updateRow(row.local_id, { description: event.target.value })} /></td>
                      <td><input type="number" min="0" value={row.quantity || ""} onChange={(event) => updateRow(row.local_id, { quantity: Number(event.target.value) })} /></td>
                      <td><input type="number" min="0" value={row.unit_price || ""} onChange={(event) => updateRow(row.local_id, { unit_price: Number(event.target.value) })} /></td>
                      <td>{money(row.total_without_tax)}</td>
                      <td><TaxRateControl compact value={row.gst_rate} onChange={(gst_rate) => updateRow(row.local_id, { gst_rate })} label={`GST rate for row ${index + 1}`} /></td>
                      <td>{money(row.tax_amount)}</td>
                      <td>{money(row.total_with_tax)}</td>
                      <td><button className="finance-icon-btn" onClick={() => removeRow(row.local_id)}><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="finance-total-strip">
            <span>Subtotal: <strong>{money(totals.subtotal)}</strong></span>
            <span>GST: <strong>{money(totals.tax)}</strong></span>
            <span>Grand Total: <strong>{money(totals.total)}</strong></span>
          </div>
        </div>

        <div className="finance-wizard-section">
          <div className="finance-card-head">
            <div>
              <h3>Step 4 - Review & Generate</h3>
              <p className="finance-muted">Amount in words: {numberToWords(totals.total)}</p>
            </div>
            <div className="finance-action-cell">
              <button className="finance-btn primary" onClick={generateInvoice} disabled={saving || Boolean(generated)}>
                <FileText size={16} /> {generated ? "Generated" : saving ? "Generating..." : "Generate Invoice"}
              </button>
              {generated ? <button className="finance-btn secondary" onClick={() => printElementById("finance-invoice-preview", generated.invoice_number)}><Download size={16} /> Download PDF</button> : null}
              {generated ? <button className="finance-btn primary" onClick={() => navigate(financeSummaryPath(generated))}><FileSpreadsheet size={16} /> Open Summary</button> : null}
            </div>
          </div>
          <InvoiceDocument invoice={previewInvoice} />
        </div>
      </section>
    </div>
  );
}

function invoiceRowsToEditable(invoice: FinanceInvoice): DirectInvoiceRow[] {
  const notes = getInvoiceNotes(invoice);
  const rows = getInvoiceRows(invoice, notes);
  const expenseType = normalizeExpenseTypeFrontend(invoice.expense_type || notes.expense_type);

  if (!rows.length) return [newDirectRow(expenseType)];

  return rows.map((row, index) => {
    const quantity = amountValue(row.quantity || 1) || 1;
    const amountExcl = amountValue(row.total_without_tax || row.amount_excl_tax || quantity * amountValue(row.unit_price));
    const tax = amountValue(row.tax_amount || row.sale_tax);
    const fallbackGstRate = expenseType === "rental_expenses" || expenseType === "footage_expenses" ? 10 : 18;
    const gstRate = amountExcl > 0 ? Number(((tax / amountExcl) * 100).toFixed(2)) : amountValue(row.gst_rate) || fallbackGstRate;

    return {
      ...row,
      local_id: `${invoice.id}-${index}-${createIdempotencyKey()}`,
      description: row.description || row.product_name || row.brand_model || notes.work_description || "Service work",
      quantity,
      unit_price: amountValue(row.unit_price || (quantity ? amountExcl / quantity : 0)),
      gst_rate: Number.isFinite(gstRate) ? gstRate : 18,
      total_without_tax: amountExcl,
      tax_amount: tax,
      total_with_tax: amountValue(row.total_with_tax || row.amount_incl_tax || amountExcl + tax),
      amount_excl_tax: amountExcl,
      sale_tax: tax,
      amount_incl_tax: amountValue(row.total_with_tax || row.amount_incl_tax || amountExcl + tax),
      branch_code: row.branch_code || invoice.branch_code || notes.branch_code || "",
      branch_name: row.branch_name || invoice.branch_name || notes.branch_name || "",
      region: row.region || invoice.region || notes.region || "Karachi",
      invoice_date: row.invoice_date || invoice.invoice_date || todayInput(),
      invoice_no: row.invoice_no || invoice.invoice_number || "",
      po_number: row.po_number || invoice.po_number || notes.po_number || "",
      fbr_invoice_no: row.fbr_invoice_no || invoice.fbr_invoice_no || notes.fbr_invoice_no || "",
    };
  });
}

function normalizeExpenseTypeFrontend(value?: string): FinanceExpenseType {
  return (expenseOptions.some((option) => option.key === value) ? value : "operational_expenses") as FinanceExpenseType;
}

function EditInvoiceModal({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: FinanceInvoice;
  onClose: () => void;
  onSaved: (invoice: FinanceInvoice) => void;
}) {
  const { showToast } = useToastContext();
  const notes = getInvoiceNotes(invoice);
  const [customers, setCustomers] = useState<FinanceCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(invoice.status || "ISSUED");
  const [form, setForm] = useState<DirectInvoiceForm>({
    expense_type: normalizeExpenseTypeFrontend(invoice.expense_type || notes.expense_type),
    invoice_format: invoice.invoice_format || notes.invoice_format || "hbl_single",
    customer_id: invoice.customer_id || "",
    branch_name: invoice.branch_name || notes.branch_name || "",
    branch_code: invoice.branch_code || notes.branch_code || "",
    region: invoice.region || notes.region || "Karachi",
    ref_no: invoice.ref_no || notes.ref_no || "",
    invoice_date: (invoice.invoice_date || todayInput()).slice(0, 10),
    po_number: invoice.po_number || notes.po_number || "",
    work_description: invoice.work_description || notes.work_description || "",
    fbr_invoice_no: invoice.fbr_invoice_no || notes.fbr_invoice_no || "",
  });
  const [rows, setRows] = useState<DirectInvoiceRow[]>(() => invoiceRowsToEditable(invoice));

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const data = await financeService.getCustomers();
      setCustomers(data);
    } catch {
      showToast("Client list could not be loaded.", "error");
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const selectedCustomer = customers.find((customer) => customer.id === form.customer_id);
  const calculatedRows = useMemo(() => buildCalculatedRows(rows, form), [rows, form]);
  const totals = useMemo(() => ({
    subtotal: calculatedRows.reduce((sum, row) => sum + Number(row.total_without_tax || 0), 0),
    tax: calculatedRows.reduce((sum, row) => sum + Number(row.tax_amount || 0), 0),
    total: calculatedRows.reduce((sum, row) => sum + Number(row.total_with_tax || 0), 0),
  }), [calculatedRows]);

  const updateForm = (patch: Partial<DirectInvoiceForm>) => setForm((current) => ({ ...current, ...patch }));
  const updateRow = (localId: string, patch: Partial<DirectInvoiceRow>) => {
    setRows((current) => current.map((row) => row.local_id === localId ? { ...row, ...patch } : row));
  };
  const addRow = () => setRows((current) => [...current, newDirectRow(form.expense_type)]);
  const removeRow = (localId: string) => {
    setRows((current) => current.length === 1 ? current : current.filter((row) => row.local_id !== localId));
  };

  const previewInvoice: FinanceInvoice = {
    ...invoice,
    customer_id: form.customer_id,
    customer_name: selectedCustomer?.customer_name || invoice.customer_name,
    expense_type: form.expense_type,
    expense_type_label: expenseOptions.find((option) => option.key === form.expense_type)?.label,
    invoice_format: form.invoice_format,
    status,
    invoice_date: form.invoice_date,
    subtotal: totals.subtotal,
    tax_amount: totals.tax,
    total_amount: totals.total,
    amount_in_words: numberToWords(totals.total),
    branch_name: form.branch_name,
    branch_code: form.branch_code,
    region: form.region,
    po_number: form.po_number,
    fbr_invoice_no: form.fbr_invoice_no,
    work_description: form.work_description,
    notes_json: {
      ...notes,
      ...form,
      invoice_format: form.invoice_format,
      footage_rows: form.expense_type === "footage_expenses" ? calculatedRows : [],
    },
    items: calculatedRows,
  };

  const validate = () => {
    if (!form.customer_id) return "Please select a client / bank.";
    if (!form.work_description.trim()) return "Work description is required.";
    if (!calculatedRows.every((row) => String(row.description || "").trim())) return "Every invoice row needs a description.";
    return "";
  };

  const saveChanges = async () => {
    const message = validate();
    if (message) {
      showToast(message, "error");
      return;
    }
    setSaving(true);
    try {
      const saved = await financeService.updateInvoice(invoice.id, {
        expense_type: form.expense_type,
        invoice_format: form.invoice_format,
        customer_id: form.customer_id,
        branch_name: form.branch_name,
        branch_code: form.branch_code,
        region: form.region,
        ref_no: form.ref_no,
        invoice_date: form.invoice_date,
        po_number: form.po_number,
        work_description: form.work_description,
        fbr_invoice_no: form.fbr_invoice_no,
        status,
        items: calculatedRows,
      });
      showToast("Invoice updated.", "success");
      onSaved(saved);
    } catch {
      showToast("Invoice update failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="finance-modal-backdrop">
      <section className="finance-modal finance-new-invoice">
        <div className="finance-modal-head">
          <div>
            <p className="finance-eyebrow dark">Edit Invoice</p>
            <h2>{invoice.invoice_number}</h2>
            <p className="finance-muted">Edit fields, rows, GST and totals. Save will update the database invoice.</p>
          </div>
          <button className="finance-small-btn" onClick={onClose}>Close</button>
        </div>

        <div className="finance-wizard-section">
          <h3>Invoice Details</h3>
          <div className="finance-form-grid">
            <label>Client / Bank
              <SearchableSelect
                disabled={loadingCustomers}
                value={form.customer_id}
                onChange={(customer_id) => updateForm({ customer_id })}
                placeholder={loadingCustomers ? "Loading clients..." : "Search or select client / bank"}
                options={customers.map((customer) => ({
                  value: customer.id,
                  label: `${customer.customer_name}${customer.email ? ` - ${customer.email}` : ""}`,
                }))}
              />
            </label>
            <label>Status
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="DRAFT">Draft</option>
                <option value="ISSUED">Issued</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Voided</option>
              </select>
            </label>
            <label>Expense Type
              <select value={form.expense_type} onChange={(event) => updateForm({ expense_type: event.target.value as FinanceExpenseType })}>
                {expenseOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
              </select>
            </label>
            <label>Invoice Format
              <select value={form.invoice_format} onChange={(event) => updateForm({ invoice_format: event.target.value })}>
                {invoiceFormats.map((format) => <option key={format.key} value={format.key}>{format.label}</option>)}
              </select>
            </label>
            <label>Invoice Date<input type="date" value={form.invoice_date} onChange={(event) => updateForm({ invoice_date: event.target.value })} /></label>
            <label>Ref #<input value={form.ref_no} onChange={(event) => updateForm({ ref_no: event.target.value })} /></label>
            <label>Branch Name<input value={form.branch_name} onChange={(event) => updateForm({ branch_name: event.target.value })} /></label>
            <label>Branch Code<input value={form.branch_code} onChange={(event) => updateForm({ branch_code: event.target.value })} /></label>
            <label>Region<input value={form.region} onChange={(event) => updateForm({ region: event.target.value })} /></label>
            <label>PO Number<input value={form.po_number} onChange={(event) => updateForm({ po_number: event.target.value })} /></label>
            <label>FBR Invoice No<input value={form.fbr_invoice_no} onChange={(event) => updateForm({ fbr_invoice_no: event.target.value })} /></label>
            <label className="finance-span-2">Work Description<textarea value={form.work_description} onChange={(event) => updateForm({ work_description: event.target.value })} /></label>
          </div>
        </div>

        <div className="finance-wizard-section">
          <div className="finance-card-head">
            <h3>Editable Invoice Rows</h3>
            <button className="finance-btn primary" onClick={addRow}><Plus size={16} /> Add Row</button>
          </div>
          <div className="finance-edit-table-wrap">
            <table className="finance-table finance-edit-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>GST %</th>
                  <th>Amount Excl.</th>
                  <th>GST Amount</th>
                  <th>Amount Incl.</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {calculatedRows.map((row, index) => (
                  <tr key={row.local_id}>
                    <td>{index + 1}</td>
                    <td><input value={row.description || ""} onChange={(event) => updateRow(row.local_id, { description: event.target.value, brand_model: event.target.value })} /></td>
                    <td><input type="number" min="0" value={row.quantity || ""} onChange={(event) => updateRow(row.local_id, { quantity: Number(event.target.value) })} /></td>
                    <td><input type="number" min="0" value={row.unit_price || ""} onChange={(event) => updateRow(row.local_id, { unit_price: Number(event.target.value) })} /></td>
                    <td><TaxRateControl compact value={row.gst_rate} onChange={(gst_rate) => updateRow(row.local_id, { gst_rate })} label={`GST rate for row ${index + 1}`} /></td>
                    <td>{money(row.total_without_tax)}</td>
                    <td>{money(row.tax_amount)}</td>
                    <td>{money(row.total_with_tax)}</td>
                    <td><button className="finance-icon-btn" onClick={() => removeRow(row.local_id)}><Trash2 size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="finance-total-strip">
            <span>Subtotal: <strong>{money(totals.subtotal)}</strong></span>
            <span>GST: <strong>{money(totals.tax)}</strong></span>
            <span>Grand Total: <strong>{money(totals.total)}</strong></span>
          </div>
        </div>

        <div className="finance-wizard-section">
          <div className="finance-card-head">
            <div>
              <h3>Live Preview</h3>
              <p className="finance-muted">Preview updates before saving.</p>
            </div>
            <div className="finance-action-cell">
              <button className="finance-btn secondary" onClick={onClose}>Cancel</button>
              <button className="finance-btn primary" onClick={saveChanges} disabled={saving}><CheckCircle2 size={16} /> {saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
          <InvoiceDocument invoice={previewInvoice} />
        </div>
      </section>
    </div>
  );
}

export function FinanceInvoices() {
  const { expenseType } = useParams();
  const defaultTab = (expenseTabs.find((tab) => tab.key === expenseType)?.key || "all") as "all" | FinanceExpenseType;
  const [activeTab, setActiveTab] = useState<"all" | FinanceExpenseType>(defaultTab);
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [selected, setSelected] = useState<FinanceInvoice | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<FinanceInvoice | null>(null);
  const { showToast } = useToastContext();

  const loadInvoiceDetail = async (invoice: FinanceInvoice, printAfter = false) => {
    setSelectedLoading(true);
    try {
      const detail = await financeService.getInvoice(invoice.id);
      setSelected(detail);
      if (printAfter) {
        window.setTimeout(() => printElementById("finance-invoice-preview", detail.invoice_number), 80);
      }
      return detail;
    } catch {
      setSelected(invoice);
      showToast("Full invoice detail could not be loaded.", "error");
      if (printAfter) {
        window.setTimeout(() => printElementById("finance-invoice-preview", invoice.invoice_number), 80);
      }
      return invoice;
    } finally {
      setSelectedLoading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await financeService.getInvoices({
        expense_type: activeTab === "all" ? undefined : activeTab,
        status: status === "ALL" ? undefined : status,
        search,
      });
      setInvoices(data);
      if (data[0]) {
        await loadInvoiceDetail(data[0]);
      } else {
        setSelected(null);
      }
    } catch {
      showToast("Finance invoices could not be loaded.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeTab, status]);

  const openEditInvoice = async (invoice: FinanceInvoice) => {
    const detail = await loadInvoiceDetail(invoice);
    setEditingInvoice(detail);
  };

  const deleteInvoice = async (invoice: FinanceInvoice) => {
    const ok = window.confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`);
    if (!ok) return;
    try {
      await financeService.deleteInvoice(invoice.id);
      setInvoices((current) => current.filter((item) => item.id !== invoice.id));
      if (selected?.id === invoice.id) setSelected(null);
      showToast("Invoice deleted successfully.", "success");
    } catch {
      showToast("Invoice delete failed.", "error");
    }
  };

  const saveEditedInvoice = (invoice: FinanceInvoice) => {
    setEditingInvoice(null);
    setSelected(invoice);
    setInvoices((current) => current.map((item) => item.id === invoice.id ? { ...item, ...invoice } : item));
  };

  return (
    <main className="finance-page">
      <FinanceHero
        eyebrow="Finance Invoices"
        title="Invoice Ledger"
        description="Create, edit and issue invoices."
        action={(
          <div className="finance-action-cell">
            <button className="finance-btn secondary" onClick={load}><RefreshCw size={16} /> Refresh</button>
            <Link className="finance-btn secondary" to="/finance/summaries"><FileSpreadsheet size={16} /> Summaries</Link>
            <button className="finance-btn primary" onClick={() => setShowNewInvoice(true)}><Plus size={16} /> New Invoice</button>
          </div>
        )}
      />
      <div className="finance-tabs">
        {expenseTabs.map((tab) => (
          <button key={tab.key} className={activeTab === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
        ))}
      </div>
      <section className="finance-toolbar">
        <div className="finance-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && load()} placeholder="Search invoice no, client, token or branch" /></div>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="ALL">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ISSUED">Issued</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Voided</option>
        </select>
        <button className="finance-btn secondary" onClick={load}>Search</button>
      </section>

      <section className="finance-ledger-layout finance-invoices-layout">
        <div className="finance-card">
          <table className="finance-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Ref</th>
                <th>Client / Bank</th>
                <th>Branch</th>
                <th>Expense Type</th>
                <th>Invoice Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9}>Loading invoices...</td></tr> : invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.invoice_number}</strong></td>
                  <td>{invoice.token_number || invoice.order_number || invoice.quotation_number || "-"}</td>
                  <td>{invoice.customer_name}</td>
                  <td>{invoice.branch_name || invoice.branch_code || "-"}</td>
                  <td>{invoice.expense_type_label || "-"}</td>
                  <td>{dateText(invoice.invoice_date || invoice.created_at)}</td>
                  <td>{money(invoice.total_amount)}</td>
                  <td><StatusBadge status={invoice.status} /></td>
                  <td className="finance-action-cell">
                    <button className="finance-small-btn" onClick={() => loadInvoiceDetail(invoice)}><Eye size={14} /> View</button>
                    <button className="finance-small-btn" onClick={() => loadInvoiceDetail(invoice, true)}><Download size={14} /> PDF</button>
                    <button className="finance-small-btn" onClick={() => showToast("Email sending will be connected after SMTP approval.", "success")}><Send size={14} /> Email</button>
                    <button className="finance-small-btn" onClick={() => openEditInvoice(invoice)}><Edit3 size={14} /> Edit</button>
                    <button className="finance-small-btn danger" onClick={() => deleteInvoice(invoice)}><Trash2 size={14} /> Delete</button>
                  </td>
                </tr>
              ))}
              {!loading && !invoices.length ? <tr><td colSpan={9}>No invoices found.</td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="finance-card">
          <div className="finance-card-head">
            <div>
              <p className="finance-eyebrow dark">Selected invoice</p>
              <h2>{selected?.invoice_number || "No invoice selected"}</h2>
            </div>
            {selected ? (
              <div className="finance-action-cell">
                <Link className="finance-small-btn" to={financeSummaryPath(selected)}><FileSpreadsheet size={14} /> Summary</Link>
                <button className="finance-small-btn" onClick={() => printElementById("finance-invoice-preview", selected.invoice_number)}><Printer size={14} /> Print</button>
              </div>
            ) : null}
          </div>
          <div className="finance-invoice-preview-shell">
            {selectedLoading ? <p className="finance-muted">Loading full invoice detail...</p> : selected ? <InvoiceDocument invoice={selected} /> : <p className="finance-muted">Select an invoice to preview it.</p>}
          </div>
        </div>
      </section>
      {showNewInvoice ? (
        <NewInvoiceWizard
          onClose={() => setShowNewInvoice(false)}
          onGenerated={(invoice) => {
            setSelected(invoice);
            setActiveTab(invoice.expense_type || "all");
            load();
          }}
        />
      ) : null}
      {editingInvoice ? (
        <EditInvoiceModal
          key={editingInvoice.id}
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaved={saveEditedInvoice}
        />
      ) : null}
    </main>
  );
}

export function FinanceSummaries() {
  const [searchParams] = useSearchParams();
  const requestedMonth = searchParams.get("month") || "";
  const requestedExpenseType = searchParams.get("expense_type") || "all";
  const [month, setMonth] = useState(() => /^\d{4}-\d{2}$/.test(requestedMonth) ? requestedMonth : new Date().toISOString().slice(0, 7));
  const [expenseType, setExpenseType] = useState(() => expenseOptions.some((option) => option.key === requestedExpenseType) ? requestedExpenseType : "all");
  const [region, setRegion] = useState(() => searchParams.get("region") || "");
  const [data, setData] = useState<any>(null);
  const [editableRows, setEditableRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToastContext();

  const load = async () => {
    setLoading(true);
    try {
      const result = await financeService.getSummaries({ month, expense_type: expenseType === "all" ? undefined : expenseType, region });
      setData(result);
      setEditableRows(normalizeSummaryRows(result?.monthly_summary || result?.rows || []));
    } catch {
      showToast("Finance summaries could not be loaded.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const exportCsv = () => {
    const rows = editableRows;
    const csv = [
      ["Ref #", "Date", "Client", "Branch", "Region", "Description", "Invoice No", "PO No", "Amount Excl. Tax", "Sale Tax", "Amount Incl. Tax"],
      ...rows.map((row: any) => [
        row.ref_no || "",
        dateText(row.date || row.invoice_date || row.created_at),
        row.client || row.customer_name || "",
        row.branch || row.branch_name || "",
        row.region || "",
        row.work_description || row.description || "",
        row.invoice_no || row.invoice_number || "",
        row.po_no || row.po_number || "",
        row.amount_excl_tax || row.subtotal || 0,
        row.sale_tax || row.tax_amount || 0,
        row.amount_incl_tax || row.total_amount || 0,
      ]),
    ].map((row) => row.map((cell: any) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `finance-summary-${month}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const updateSummaryRow = (localId: string, patch: Record<string, any>) => {
    setEditableRows((rows) => rows.map((row) => {
      if (row.local_id !== localId) return row;
      const next = { ...row, ...patch };
      if ("amount_excl_tax" in patch || "sale_tax" in patch) {
        next.amount_incl_tax = amountValue(next.amount_excl_tax) + amountValue(next.sale_tax);
      }
      return next;
    }));
  };

  const removeSummaryRow = (localId: string) => {
    if (!window.confirm("Remove this row from the printable summary? The original invoice will stay saved.")) return;
    setEditableRows((rows) => rows.filter((row) => row.local_id !== localId));
  };

  const addSummaryRow = () => {
    setEditableRows((rows) => [
      ...rows,
      {
        local_id: createIdempotencyKey(),
        invoice_no: "",
        client: "Habib Bank Limited",
        expense_type_label: expenseOptions.find((option) => option.key === expenseType)?.label || "Operational Expenses",
        region: region || "Karachi",
        branch_name: "",
        description: "",
        po_number: "",
        date: todayInput(),
        amount_excl_tax: 0,
        sale_tax: 0,
        amount_incl_tax: 0,
        status: "ISSUED",
      },
    ]);
  };

  const monthlyRows = editableRows;
  const hasMonthlyRows = Boolean(monthlyRows.length);
  const computedTotals = monthlyRows.reduce((totals: any, row: any) => {
    totals.amount_excl_tax += amountValue(row.amount_excl_tax || row.subtotal);
    totals.sale_tax += amountValue(row.sale_tax || row.tax_amount);
    totals.amount_incl_tax += amountValue(row.amount_incl_tax || row.total_amount);
    totals.invoice_count += 1;
    return totals;
  }, { amount_excl_tax: 0, sale_tax: 0, amount_incl_tax: 0, invoice_count: 0 });
  const rowsByExpense = Object.values(monthlyRows.reduce((groups: Record<string, any>, row: any) => {
    const key = row.expense_type_label || row.expense_type || "Uncategorized";
    groups[key] ||= { label: key, count: 0, amount_incl_tax: 0 };
    groups[key].count += 1;
    groups[key].amount_incl_tax += amountValue(row.amount_incl_tax || row.total_amount);
    return groups;
  }, {}));
  const rowsByClient = Object.values(monthlyRows.reduce((groups: Record<string, any>, row: any) => {
    const key = row.client || row.customer_name || "Unknown Client";
    groups[key] ||= { client: key, count: 0, amount_incl_tax: 0 };
    groups[key].count += 1;
    groups[key].amount_incl_tax += amountValue(row.amount_incl_tax || row.total_amount);
    return groups;
  }, {}));
  const summaryItems: FinanceInvoiceItem[] = monthlyRows.map((row: any) => {
    const amountExcl = amountValue(row.amount_excl_tax || row.subtotal);
    const saleTax = amountValue(row.sale_tax || row.tax_amount);
    const amountIncl = amountValue(row.amount_incl_tax || row.total_amount);
    return {
      description: row.work_description || row.description || row.expense_type_label || "Services",
      quantity: 1,
      unit_price: amountExcl,
      total_without_tax: amountExcl,
      tax_amount: saleTax,
      total_with_tax: amountIncl,
      amount_excl_tax: amountExcl,
      sale_tax: saleTax,
      amount_incl_tax: amountIncl,
      branch_code: row.branch_code || "-",
      branch_name: row.branch || row.branch_name || row.client || row.customer_name || "-",
      region: row.region || "Karachi",
      invoice_date: row.date || row.invoice_date || row.created_at,
      invoice_no: row.invoice_no || row.invoice_number,
      po_number: row.po_no || row.po_number || "-",
      fbr_invoice_no: row.fbr_invoice_no || "-",
    };
  });
  const summaryTotals = computedTotals;
  const summaryTotalAmount = amountValue(summaryTotals.amount_incl_tax);
  const summaryPreviewInvoice: FinanceInvoice | null = hasMonthlyRows ? {
    id: `summary-${month}`,
    invoice_number: `HBL-SUMMARY-${month.replace("-", "")}`,
    customer_name: "Habib Bank Limited",
    expense_type: expenseType === "all" ? "operational_expenses" : (expenseType as FinanceExpenseType),
    expense_type_label: "HBL Monthly Summary",
    invoice_format: "hbl_summary",
    status: "PREVIEW",
    invoice_date: todayInput(),
    subtotal: amountValue(summaryTotals.amount_excl_tax),
    tax_amount: amountValue(summaryTotals.sale_tax),
    total_amount: summaryTotalAmount,
    amount_in_words: numberToWords(summaryTotalAmount),
    branch_name: "Multiple branches",
    branch_code: "Multiple",
    region: region || "Karachi",
    work_description: `CCTV CAMERA REINSTALLED BILL MONTH OF ${monthText(month)}`,
    notes_json: {
      invoice_format: "hbl_summary",
      ref_no: summaryItems[0]?.po_number || "-",
      work_description: `CCTV CAMERA REINSTALLED BILL MONTH OF ${monthText(month)}`,
      prepared_by: "Accounts department",
    },
    items: summaryItems,
  } : null;

  return (
    <main className="finance-page">
      <FinanceHero
        eyebrow="Finance Summaries"
        title="Monthly Client Summaries"
        description="Generate client and period summaries."
        action={(
          <div className="finance-action-cell">
            <button className="finance-btn primary" onClick={exportCsv}><FileSpreadsheet size={16} /> Export CSV</button>
            {summaryPreviewInvoice ? (
              <button className="finance-btn secondary" onClick={() => printElementById("finance-summary-preview", summaryPreviewInvoice.invoice_number, { orientation: "landscape" })}>
                <Printer size={16} /> Print HBL Summary
              </button>
            ) : null}
          </div>
        )}
      />
      <section className="finance-toolbar">
        <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        <select value={expenseType} onChange={(event) => setExpenseType(event.target.value)}>
          <option value="all">All expense types</option>
          {expenseOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
        <input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Region" />
        <button className="finance-btn secondary" onClick={load}>Apply filters</button>
      </section>

      <section className="finance-stat-grid three">
        <StatCard label="Grand Total" value={money(summaryTotals.amount_incl_tax)} hint="Editable summary total" />
        <StatCard label="Tax Total" value={money(summaryTotals.sale_tax)} hint="GST / SST" tone="orange" />
        <StatCard label="Invoices" value={summaryTotals.invoice_count} hint="Rows in this summary" tone="green" />
      </section>

      {!loading && !hasMonthlyRows ? (
        <section className="finance-empty-state">No invoices found for {monthText(month)}.</section>
      ) : null}

      <section className="finance-two-col">
        <div className="finance-card">
          <h2>By Expense Type</h2>
          <table className="finance-table">
            <thead><tr><th>Type</th><th>Invoices</th><th>Total</th></tr></thead>
            <tbody>
              {(rowsByExpense as any[]).map((row: any) => (
                <tr key={row.label}><td>{row.label}</td><td>{row.count}</td><td>{money(row.amount_incl_tax)}</td></tr>
              ))}
              {rowsByExpense.length ? (
                <tr className="finance-summary-total"><td>TOTAL</td><td>{summaryTotals.invoice_count}</td><td>{money(summaryTotals.amount_incl_tax)}</td></tr>
              ) : null}
              {loading ? <tr><td colSpan={3}>Loading...</td></tr> : null}
              {!loading && !rowsByExpense.length ? <tr><td colSpan={3}>No invoices found for {monthText(month)}.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="finance-card">
          <h2>By Client</h2>
          <table className="finance-table">
            <thead><tr><th>Client</th><th>Invoices</th><th>Total</th></tr></thead>
            <tbody>
              {(rowsByClient as any[]).map((row: any) => (
                <tr key={row.client}><td>{row.client}</td><td>{row.count}</td><td>{money(row.amount_incl_tax)}</td></tr>
              ))}
              {loading ? <tr><td colSpan={3}>Loading...</td></tr> : null}
              {!loading && !rowsByClient.length ? <tr><td colSpan={3}>No invoices found for {monthText(month)}.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="finance-card">
        <div className="finance-card-head">
          <div>
            <h2>Editable Monthly Summary Table</h2>
            <p className="finance-muted">Edit or remove rows before printing/exporting. This does not delete the original invoice from the database.</p>
          </div>
          <div className="finance-action-cell">
            <button className="finance-small-btn" onClick={() => setEditableRows(normalizeSummaryRows(data?.monthly_summary || data?.rows || []))}><RefreshCw size={14} /> Reset</button>
            <button className="finance-small-btn" onClick={addSummaryRow}><Plus size={14} /> Add Row</button>
          </div>
        </div>
        <div className="finance-edit-table-wrap">
          <table className="finance-table finance-edit-table finance-summary-edit-table">
            <thead>
              <tr><th>Invoice</th><th>Client</th><th>Expense</th><th>Region</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {monthlyRows.map((row: any) => (
                <tr key={row.local_id}>
                  <td><input value={row.invoice_no || ""} onChange={(event) => updateSummaryRow(row.local_id, { invoice_no: event.target.value })} /></td>
                  <td><input value={row.client || ""} onChange={(event) => updateSummaryRow(row.local_id, { client: event.target.value })} /></td>
                  <td><input value={row.expense_type_label || ""} onChange={(event) => updateSummaryRow(row.local_id, { expense_type_label: event.target.value })} /></td>
                  <td><input value={row.region || ""} onChange={(event) => updateSummaryRow(row.local_id, { region: event.target.value })} /></td>
                  <td><input type="number" value={row.amount_excl_tax ?? ""} onChange={(event) => updateSummaryRow(row.local_id, { amount_excl_tax: Number(event.target.value) })} /></td>
                  <td><input type="number" value={row.sale_tax ?? ""} onChange={(event) => updateSummaryRow(row.local_id, { sale_tax: Number(event.target.value) })} /></td>
                  <td><input type="number" value={row.amount_incl_tax ?? ""} onChange={(event) => updateSummaryRow(row.local_id, { amount_incl_tax: Number(event.target.value) })} /></td>
                  <td>
                    <select value={row.status || "ISSUED"} onChange={(event) => updateSummaryRow(row.local_id, { status: event.target.value })}>
                      <option value="DRAFT">Draft</option>
                      <option value="ISSUED">Issued</option>
                      <option value="PAID">Paid</option>
                      <option value="CANCELLED">Voided</option>
                    </select>
                  </td>
                  <td><button className="finance-icon-btn" onClick={() => removeSummaryRow(row.local_id)}><Trash2 size={15} /></button></td>
                </tr>
              ))}
              {!loading && !monthlyRows.length ? <tr><td colSpan={9}>No invoices found for {monthText(month)}.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {summaryPreviewInvoice ? (
        <section className="finance-card finance-summary-preview">
          <div className="finance-card-head">
            <div>
              <p className="finance-eyebrow dark">Book1 Format</p>
              <h2>HBL Printable Summary Preview</h2>
            </div>
            <button className="finance-small-btn" onClick={() => printElementById("finance-summary-preview", summaryPreviewInvoice.invoice_number, { orientation: "landscape" })}>
              <Printer size={14} /> Print
            </button>
          </div>
          <div id="finance-summary-preview">
            <InvoiceDocument invoice={summaryPreviewInvoice} />
          </div>
        </section>
      ) : null}
    </main>
  );
}

export function FinanceAccounts() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToastContext();

  useEffect(() => {
    financeService.getAccounts()
      .then(setData)
      .catch(() => showToast("Accounts data could not be loaded.", "error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="finance-page">
      <FinanceHero
        eyebrow="Accounts"
        title="Finance Accounts Overview"
        description="Accounts, ledger and financial summary."
      />
      {loading ? <LoadingBlock /> : (
        <>
          <section className="finance-stat-grid three">
            <StatCard label="Total Debit" value={money(data?.summary?.debit)} />
            <StatCard label="Total Credit" value={money(data?.summary?.credit)} tone="green" />
            <StatCard label="Closing Balance" value={money(data?.summary?.balance)} tone="teal" />
          </section>
          <section className="finance-two-col">
            <div className="finance-card">
              <h2>Chart of Accounts</h2>
              <table className="finance-table">
                <thead><tr><th>Code</th><th>Account</th><th>Type</th></tr></thead>
                <tbody>{(data?.chart_of_accounts || []).map((row: any) => <tr key={row.code}><td>{row.code}</td><td>{row.name}</td><td>{row.type}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="finance-card">
              <h2>General Ledger</h2>
              <table className="finance-table">
                <thead><tr><th>Date</th><th>Account</th><th>Description</th><th>Debit</th><th>Credit</th></tr></thead>
                <tbody>{(data?.ledger || []).map((row: any, index: number) => <tr key={`${row.date}-${row.account}-${row.description}-${index}`}><td>{dateText(row.date)}</td><td>{row.account}</td><td>{row.description}</td><td>{money(row.debit)}</td><td>{money(row.credit)}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
