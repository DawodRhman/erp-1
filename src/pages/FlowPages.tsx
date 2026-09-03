import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Barcode,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileText,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingCart,
  Undo2,
  Wrench,
  XCircle,
} from "lucide-react";
import { useToastContext } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import TaxRateControl from "../components/common/TaxRateControl";
import { apiClient } from "../services/apiClient";
import {
  FieldDispatch,
  InventoryItem,
  InventoryCompanySettings,
  InventoryInstallerUser,
  InventoryPreferenceSettings,
  InventorySummary,
  InventoryToken,
  InventoryWorkQueueJob,
  ItemCategory,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  ReturnRequest,
  ReturnRequestItem,
  Vendor,
  inventoryApi,
} from "../services/inventoryService";
import { printHtmlDocument } from "../utils/printElement";

type Customer = {
  id: string;
  customer_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
};

type Lead = {
  id: string;
  title: string;
  customer_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  status: string;
  created_at: string;
};

type Quotation = {
  id: string;
  quotation_number: string;
  customer_id?: string;
  customer_name?: string;
  price_tier?: string;
  template_style?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  status: string;
  created_at: string;
  client_approval_token?: string;
  sent_at?: string;
  client_approved_at?: string;
  items?: Array<{
    id?: string;
    product_id?: string;
    product_name?: string;
    description?: string;
    item_description?: string;
    quantity?: number;
    unit_price?: number;
  }>;
};

type QuoteLine = {
  product_id: string;
  manual_description: string;
  quantity: number;
  unit_price: number;
};

const pageShell: React.CSSProperties = {
  padding: "4px 0 28px",
  maxWidth: "none",
  margin: "0 auto",
  fontFamily: "'Outfit', 'Segoe UI', sans-serif",
};

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe4f0",
  borderRadius: 10,
  boxShadow: "0 10px 28px rgba(15,23,42,.055)",
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#0f172a",
  background: "#fff",
  fontSize: 13,
  outline: "none",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  color: "#64748b",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: ".04em",
};

const td: React.CSSProperties = {
  padding: "12px 14px",
  borderTop: "1px solid #f1f5f9",
  color: "#334155",
  fontSize: 13,
  verticalAlign: "top",
};

function money(value?: number | string) {
  return `Rs ${Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })}`;
}

function dateText(value?: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function printSafe(value?: unknown) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function tokenReceiptHtml(token: InventoryToken) {
  const status = (token.status || "ACTIVE").replace(/_/g, " ").toUpperCase();
  const issueDate = dateText(token.created_at);
  const updatedDate = dateText(token.updated_at);

  return `
    <section style="font-family: Arial, sans-serif; color: #0f172a; border: 1px solid #cbd5e1; padding: 24px;">
      <header style="display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 18px;">
        <div>
          <div style="font-size: 13px; font-weight: 800; letter-spacing: .12em; color: #2563eb;">TRACK360 ERP</div>
          <h1 style="margin: 6px 0 0; font-size: 26px; line-height: 1.1;">Inventory Token Receipt</h1>
          <p style="margin: 8px 0 0; color: #475569; font-size: 13px;">One token is linked with one approved CRM order for stock, dispatch, returns and billing.</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 12px; color: #64748b; font-weight: 700;">Token No</div>
          <div style="font-size: 22px; font-weight: 900; color: #047857;">${printSafe(token.token_number)}</div>
          <div style="margin-top: 8px; display: inline-block; padding: 6px 10px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 800;">${printSafe(status)}</div>
        </div>
      </header>

      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 18px;">
        <tbody>
          <tr>
            <td style="width: 25%; padding: 10px; border: 1px solid #e2e8f0; font-weight: 800; background: #f8fafc;">Client</td>
            <td style="width: 25%; padding: 10px; border: 1px solid #e2e8f0;">${printSafe(token.customer_name)}</td>
            <td style="width: 25%; padding: 10px; border: 1px solid #e2e8f0; font-weight: 800; background: #f8fafc;">Issue Date</td>
            <td style="width: 25%; padding: 10px; border: 1px solid #e2e8f0;">${printSafe(issueDate)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 800; background: #f8fafc;">Order No</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${printSafe(token.order_number)}</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 800; background: #f8fafc;">Quotation No</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${printSafe(token.quotation_number)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 800; background: #f8fafc;">Items</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;">${printSafe(token.item_count || 0)} items</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 800; background: #f8fafc;">Total Value</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 900;">${printSafe(money(token.total_amount))}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: 800; background: #f8fafc;">Last Updated</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0;" colspan="3">${printSafe(updatedDate)}</td>
          </tr>
        </tbody>
      </table>

      <section style="border: 1px solid #e2e8f0; background: #f8fafc; padding: 14px; margin-bottom: 28px;">
        <div style="font-weight: 900; margin-bottom: 6px;">Receipt Purpose</div>
        <div style="color: #475569; font-size: 13px; line-height: 1.55;">
          This receipt confirms that the approved CRM order has been registered in Inventory and assigned a single tracking token.
          Stock check, dispatch, installer returns and finance billing must continue against this same token number.
        </div>
      </section>

      <footer style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 52px; font-size: 13px;">
        <div>
          <div style="border-top: 1px solid #0f172a; padding-top: 8px; font-weight: 800;">Inventory Officer</div>
          <div style="color: #64748b;">Prepared and issued by inventory</div>
        </div>
        <div>
          <div style="border-top: 1px solid #0f172a; padding-top: 8px; font-weight: 800;">Authorized Signature</div>
          <div style="color: #64748b;">For office record</div>
        </div>
      </footer>
    </section>
  `;
}

function resolveProductUnitPrice(product?: Product) {
  const raw = product as Product & { unitPrice?: number | string; price?: number | string } | undefined;
  return Number(raw?.unit_price ?? raw?.unitPrice ?? raw?.price ?? 0);
}

function productPriceDisplay(product: Product) {
  const unitPrice = resolveProductUnitPrice(product);
  if (unitPrice > 0) return money(unitPrice);

  return (
    <div>
      <span style={{ color: "#b45309", fontWeight: 900 }}>Price not set</span>
      <br />
      <Link to="/inventory" style={{ color: "#2563eb", fontSize: 12, fontWeight: 850, textDecoration: "none" }}>
        Edit price
      </Link>
    </div>
  );
}

function responseRows<T>(response: any): T[] {
  const payload = response?.data?.data ?? response?.data;
  return Array.isArray(payload) ? payload : [];
}

function makeIdempotencyKey(prefix: string) {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

function statusChip(status?: string) {
  const value = (status || "DRAFT").toUpperCase();
  const tone =
    value === "COMPLETED" || value === "STOCK_UPDATED" || value === "CANCELLED"
      ? ["#f1f5f9", "#64748b"]
      : value === "ACTIVE" || value === "DISPATCHED" || value.includes("SENT") || value === "TOKEN_GENERATED" || value === "CONFIRMED"
      ? ["#dbeafe", "#1d4ed8"]
      : value === "PARTIALLY_DISPATCHED" || value.includes("AWAITING") || value === "PENDING"
        ? ["#fef3c7", "#b45309"]
        : value.includes("APPROVED") || value === "FULLY_DISPATCHED" || value === "STOCK_OK" || value === "RECEIVED"
      ? ["#dcfce7", "#047857"]
      : value.includes("REJECT") || value.includes("DAMAGE")
          ? ["#fee2e2", "#b91c1c"]
          : ["#fef3c7", "#b45309"];
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "5px 9px",
        borderRadius: 999,
        background: tone[0],
        color: tone[1],
        fontSize: 11,
        fontWeight: 900,
      }}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

function orderStatusLabel(status?: string) {
  const value = String(status || "PENDING_REVIEW").toUpperCase();
  if (value === "READY_FOR_INVENTORY" || value === "PENDING_REVIEW") return "AWAITING_TOKEN";
  return value;
}

function orderStatusHelp(status?: string) {
  const value = orderStatusLabel(status);
  const copy: Record<string, string> = {
    AWAITING_TOKEN: "Order arrived from CRM. Generate token to start stock action.",
    TOKEN_GENERATED: "Token is ready. Check stock and create dispatch or PO.",
    STOCK_OK: "All items are available. Dispatch can be created.",
    AWAITING_STOCK: "Some items are short. Purchase order is required.",
    PARTIALLY_DISPATCHED: "Some stock has already been dispatched.",
    FULLY_DISPATCHED: "All stock is given to installer.",
    COMPLETED: "Installer work and returns are completed.",
    BILL_SENT: "Adjusted bill has been sent to Finance.",
  };
  return copy[value] || "Inventory action is pending.";
}

function queueActionStatus(job: InventoryWorkQueueJob, token: string, hasGaps: boolean) {
  const current = orderStatusLabel(job.order_status);
  if (["PARTIALLY_DISPATCHED", "FULLY_DISPATCHED", "COMPLETED", "BILL_SENT"].includes(current)) return current;
  if (!token) return "AWAITING_TOKEN";
  if (hasGaps) return "AWAITING_STOCK";
  return "STOCK_OK";
}

function tokenStatusHelp(status?: string) {
  const value = String(status || "ACTIVE").toUpperCase();
  const copy: Record<string, string> = {
    ACTIVE: "Token generated. Stock action is not dispatched yet.",
    PARTIALLY_DISPATCHED: "Some items have been sent to installer.",
    FULLY_DISPATCHED: "All required items have been sent to installer.",
    COMPLETED: "Job is complete and bill has moved forward.",
  };
  return copy[value] || "Token is active.";
}

function dispatchStatusLabel(status?: string) {
  const value = String(status || "PENDING").toUpperCase();
  if (value === "DISPATCHED") return "PENDING";
  if (["RETURN_PENDING", "RETURN_CONFIRMED", "RECONCILED", "BILL_SENT"].includes(value)) return "COMPLETED";
  if (["PENDING", "IN_PROGRESS", "COMPLETED"].includes(value)) return value;
  return value;
}

function hasStockGaps(job: InventoryWorkQueueJob) {
  const items = job.items || [];
  return items.some((item) => !item.stock_ok);
}

function stockCheckDetails(job: InventoryWorkQueueJob) {
  return (job.items || []).map((item) => {
    const required = Number(item.required_qty || 0);
    const available = Number(item.available_stock || 0);
    const missing = Math.max(0, required - available);
    return {
      ...item,
      required,
      available,
      missing,
      ok: Boolean(item.stock_ok) && missing === 0,
    };
  });
}

function Header({
  eyebrow,
  title,
  text,
  actions,
}: {
  eyebrow: string;
  title: string;
  text: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="inventory-page-hero"
      style={{
        ...card,
        padding: "24px 28px",
        marginBottom: 18,
        background: "linear-gradient(125deg,#10234d 0%,#1d4ed8 56%,#087f8c 100%)",
        color: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div>
        <div style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "#bfdbfe", fontWeight: 900 }}>
          {eyebrow}
        </div>
        <h1 style={{ margin: "8px 0 6px", fontSize: 28, lineHeight: 1.1 }}>{title}</h1>
        <p style={{ margin: 0, color: "#dbeafe", maxWidth: 860, lineHeight: 1.55 }}>{text}</p>
      </div>
      {actions && <div className="flow-header-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>{actions}</div>}
    </div>
  );
}

function Button({
  children,
  onClick,
  to,
  tone = "primary",
  disabled = false,
  prominent = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  to?: string;
  tone?: "primary" | "dark" | "light" | "success" | "warning";
  disabled?: boolean;
  prominent?: boolean;
}) {
  const colors = {
    primary: ["#2563eb", "#fff", "none"],
    dark: ["#0f172a", "#fff", "none"],
    success: ["#10b981", "#fff", "none"],
    warning: ["#f59e0b", "#fff", "none"],
    light: ["#f8fafc", "#334155", "1px solid #cbd5e1"],
  } as const;
  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: prominent ? "12px 18px" : "10px 13px",
        borderRadius: 8,
    border: colors[tone][2],
    background: colors[tone][0],
    color: colors[tone][1],
    fontSize: 13,
    fontWeight: 850,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: disabled ? 0.55 : 1,
    whiteSpace: "nowrap",
    boxShadow: prominent && !disabled ? "0 12px 22px rgba(16,185,129,.22)" : undefined,
  };
  if (to) return <Link className="flow-button" to={to} style={style}>{children}</Link>;
  return <button className="flow-button" type="button" onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

type DataTableRow = React.ReactNode[] | { key?: React.Key; cells: React.ReactNode[]; detail?: React.ReactNode };

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="flow-search-box" style={{ position: "relative", minWidth: 260, flex: "1 1 320px" }}>
      <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={{ ...input, paddingLeft: 36 }} />
    </div>
  );
}

function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: DataTableRow[];
  empty: string;
}) {
  return (
    <div className="flow-data-table" style={{ ...card, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
        <thead>
          <tr>{columns.map((column) => <th key={column} style={th}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => {
            const cells = Array.isArray(row) ? row : row.cells;
            const detail = Array.isArray(row) ? null : row.detail;
            const key = Array.isArray(row) ? index : row.key ?? index;
            return (
              <React.Fragment key={key}>
                <tr>{cells.map((cell, cellIndex) => <td key={cellIndex} style={td}>{cell}</td>)}</tr>
                {detail && (
                  <tr>
                    <td colSpan={columns.length} style={{ ...td, padding: 0, background: "#f8fafc" }}>{detail}</td>
                  </tr>
                )}
              </React.Fragment>
            );
          }) : (
            <tr>
              <td colSpan={columns.length} style={{ ...td, textAlign: "center", color: "#64748b", padding: 24 }}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FlowSteps() {
  const steps = [
    ["1", "CSR creates client request and quotation"],
    ["2", "Client approval creates token/receipt"],
    ["3", "Inventory checks stock and purchase gaps"],
    ["4", "Stock is dispatched to installer"],
    ["5", "Installer returns unused items and adds field purchases"],
    ["6", "CRM approves billing"],
    ["7", "Finance generates invoice"],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 18 }}>
      {steps.map(([n, label]) => (
        <div key={n} style={{ ...card, padding: 14 }}>
          <div style={{ width: 30, height: 30, borderRadius: 999, display: "grid", placeItems: "center", background: "#dbeafe", color: "#1d4ed8", fontWeight: 900 }}>{n}</div>
          <div style={{ marginTop: 10, color: "#0f172a", fontWeight: 850, fontSize: 13 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function useCrmData() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [customerRes, leadRes, quoteRes, productRes] = await Promise.all([
        apiClient.get("/crm/customers").catch(() => ({ data: { data: [] } })),
        apiClient.get("/crm/leads").catch(() => ({ data: { data: [] } })),
        apiClient.get("/crm/quotations").catch(() => ({ data: { data: [] } })),
        apiClient.get("/crm/products", { params: { limit: 500 } }).catch(() => ({ data: { data: [] } })),
      ]);
      setCustomers(customerRes.data.data || []);
      setLeads(leadRes.data.data || []);
      setQuotations(quoteRes.data.data || []);
      setProducts(productRes.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { customers, leads, quotations, products, loading, reload: load };
}

function useInventoryFlowData() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [workQueue, setWorkQueue] = useState<InventoryWorkQueueJob[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [dispatches, setDispatches] = useState<FieldDispatch[]>([]);
  const [tokens, setTokens] = useState<InventoryToken[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [summaryData, queueData, productData, itemData, vendorData, poData, dispatchData, tokenData] = await Promise.all([
        inventoryApi.getSummary().catch(() => null),
        inventoryApi.getWorkQueue().catch(() => []),
        inventoryApi.getProducts({ limit: 500 }).catch(() => []),
        inventoryApi.getItems({ limit: 500 }).catch(() => []),
        inventoryApi.getVendors().catch(() => []),
        inventoryApi.getPurchaseOrders().catch(() => []),
        inventoryApi.getDispatches().catch(() => []),
        inventoryApi.getTokens().catch(() => []),
      ]);
      setSummary(summaryData);
      setWorkQueue(queueData);
      setProducts(productData);
      setItems(itemData);
      setVendors(vendorData);
      setPurchaseOrders(poData);
      setDispatches(dispatchData);
      setTokens(tokenData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { summary, workQueue, products, items, vendors, purchaseOrders, dispatches, tokens, loading, reload: load };
}

function tokenForQuote(quote: Quotation | InventoryWorkQueueJob) {
  if ("token_number" in quote && quote.token_number) return quote.token_number;
  return "";
}

function clientQuotationUrl(token?: string) {
  if (!token) return "";
  return `${window.location.origin}/client/quotations/${token}`;
}

function productPrice(product?: Product, tierName = "TIER_A") {
  if (!product) return 0;
  const tierPrice = product.price_tiers?.[tierName];
  const amount = Number(tierPrice ?? product.unit_price ?? product.cost_price ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function CrmDashboardPage() {
  const { leads, quotations, customers, loading } = useCrmData();
  const approved = quotations.filter((item) => item.status === "APPROVED").length;
  const sent = quotations.filter((item) => item.status === "SENT").length;

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header
        eyebrow="CSR / CRM Service"
        title="Client Request, Quotation and Approval"
        text="CRM activity and next actions."
        actions={<Button to="/crm/quotations/new" tone="success"><Plus size={16} /> New Quotation</Button>}
      />
      <FlowSteps />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 18 }}>
        {[
          ["Sales Leads", leads.length, "/crm/leads"],
          ["Registered Clients", customers.length, "/crm/clients"],
          ["Sent To Client", sent, "/crm/quotations"],
          ["Approved For Inventory", approved, "/inventory/queue"],
        ].map(([label, value, href]) => (
          <Link key={String(label)} to={String(href)} style={{ ...card, padding: 18, textDecoration: "none" }}>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
            <div style={{ color: "#0f172a", fontSize: 30, fontWeight: 950, marginTop: 8 }}>{loading ? "-" : value}</div>
            <div style={{ color: "#2563eb", fontWeight: 850, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>Open page <ArrowRight size={14} /></div>
          </Link>
        ))}
      </div>
      <div style={{ ...card, padding: 18 }}>
        <h3 style={{ margin: 0 }}>Simple user journey</h3>
        <p style={{ color: "#64748b", lineHeight: 1.6 }}>
          First create or select the client. Then create a quotation with stock items from the dropdown and manual purchase-required items when stock is not available. On the Quotations page click Send to Client. The system creates a client approval link. For now CSR shares that link manually; email delivery will be connected later. The client opens the link and approves it. After approval, Inventory receives the job with a generated token.
        </p>
      </div>
    </div>
  );
}

export function CrmLeadsPage() {
  const { leads, customers, reload } = useCrmData();
  const { showToast } = useToastContext();
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ title: "", customer_id: "", contact_name: "", contact_email: "", contact_phone: "", notes: "" });
  const [showForm, setShowForm] = useState(false);
  const filtered = leads.filter((lead) => [lead.title, lead.customer_name, lead.contact_name, lead.status].join(" ").toLowerCase().includes(q.toLowerCase()));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiClient.post("/crm/leads", form);
    setForm({ title: "", customer_id: "", contact_name: "", contact_email: "", contact_phone: "", notes: "" });
    setShowForm(false);
    showToast("Lead saved. Next: CRM > Create Quotation.", "success");
    reload();
  };

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header eyebrow="CSR / CRM" title="Sales Leads Pipeline" text="Manage client inquiries." actions={<Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Lead</Button>} />
      <div style={{ ...card, padding: 14, marginBottom: 14, display: "flex", gap: 12 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search lead, customer, contact or status" />
        <Button to="/crm/quotations/new" tone="success"><FileText size={16} /> Create Quotation</Button>
      </div>
      {showForm && (
        <form onSubmit={submit} style={{ ...card, padding: 18, marginBottom: 14, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12 }}>
            <input required style={input} placeholder="Lead title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select style={input} value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">New / unlinked client</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customer_name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            <input style={input} placeholder="Contact person" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            <input style={input} placeholder="Email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            <input style={input} placeholder="Phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button tone="light" onClick={() => setShowForm(false)}>Cancel</Button>
            <button className="btn btn-primary" type="submit">Save Lead</button>
          </div>
        </form>
      )}
      <DataTable
        columns={["Lead", "Client", "Contact", "Status", "Next Step"]}
        rows={filtered.map((lead) => [
          <strong>{lead.title}</strong>,
          lead.customer_name || "Direct lead",
          <div>{lead.contact_name || "-"}<br /><span style={{ color: "#64748b" }}>{lead.contact_phone || lead.contact_email || ""}</span></div>,
          statusChip(lead.status),
          <Button to="/crm/quotations/new" tone="light"><FileText size={14} /> Quote</Button>,
        ])}
        empty="No leads found."
      />
    </div>
  );
}

export function CrmClientsPage() {
  const { customers, reload } = useCrmData();
  const { showToast } = useToastContext();
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ customer_name: "", contact_person: "", email: "", phone: "", address: "" });
  const [showForm, setShowForm] = useState(false);
  const filtered = customers.filter((customer) => [customer.customer_name, customer.contact_person, customer.email, customer.phone].join(" ").toLowerCase().includes(q.toLowerCase()));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiClient.post("/crm/customers", form);
    setForm({ customer_name: "", contact_person: "", email: "", phone: "", address: "" });
    setShowForm(false);
    showToast("Client saved. Next: CRM > Create Quotation.", "success");
    reload();
  };

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header eyebrow="CSR / CRM" title="Client Directory" text="Manage client records." actions={<Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Client</Button>} />
      <div style={{ ...card, padding: 14, marginBottom: 14, display: "flex", gap: 12 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search client, email, phone or contact person" />
      </div>
      {showForm && (
        <form onSubmit={submit} style={{ ...card, padding: 18, marginBottom: 14, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            <input required style={input} placeholder="Client / company name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            <input style={input} placeholder="Contact person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            <input type="email" style={input} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input style={input} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <input style={input} placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button tone="light" onClick={() => setShowForm(false)}>Cancel</Button>
            <button className="btn btn-primary" type="submit">Save Client</button>
          </div>
        </form>
      )}
      <DataTable
        columns={["Client", "Contact", "Email", "Phone", "Actions"]}
        rows={filtered.map((customer) => [
          <strong>{customer.customer_name}</strong>,
          customer.contact_person || "-",
          customer.email || "-",
          customer.phone || "-",
          <Button to={`/crm/quotations/new?customerId=${customer.id}`} tone="light"><FileText size={14} /> Create Quote</Button>,
        ])}
        empty="No clients found."
      />
    </div>
  );
}

export function CrmQuotationsPage() {
  const location = useLocation();
  const { showToast } = useToastContext();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const highlightedId = (location.state as { createdQuotationId?: string } | null)?.createdQuotationId;

  const loadQuotations = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await apiClient.get("/crm/quotations");
      setQuotations(responseRows<Quotation>(response));
    } catch (error) {
      setQuotations([]);
      setLoadError("Unable to load quotations from the backend.");
      showToast("Quotations could not be loaded. Please check the backend/API connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  const filtered = quotations.filter((quote) => {
    const matchesSearch = [quote.quotation_number, quote.customer_name, quote.status, quote.template_style]
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateStatus = async (id: string, status: string) => {
    const response = await apiClient.patch(`/crm/quotations/${id}/status`, { status });
    const updated = response.data?.data as Quotation | undefined;
    if (status === "SENT") {
      const link = clientQuotationUrl(updated?.client_approval_token);
      if (link && navigator.clipboard) {
        await navigator.clipboard.writeText(link).catch(() => undefined);
      }
      showToast(link ? "Quotation sent status saved. Client approval link copied." : "Quotation sent status saved.", "success");
    } else {
      showToast(status === "APPROVED" ? "Quotation approved. Next: Inventory > Incoming Orders." : `Quotation marked ${status}.`, "success");
    }
    await loadQuotations();
  };

  const copyClientLink = async (quote: Quotation) => {
    const link = clientQuotationUrl(quote.client_approval_token);
    if (!link) return showToast("Client approval link is missing. Click Send first.", "error");
    await navigator.clipboard?.writeText(link).catch(() => undefined);
    showToast("Client approval link copied.", "success");
  };

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header eyebrow="CSR / CRM" title="Quotations Gallery" text="Create, send and track quotations." actions={<Button to="/crm/quotations/new" tone="success"><Plus size={16} /> New Quotation</Button>} />
      <div style={{ ...card, padding: 14, marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search quotation number, client or status" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ ...input, width: 220 }}>
          <option value="ALL">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <Button onClick={loadQuotations} tone="light"><RefreshCw size={15} /> Refresh</Button>
      </div>
      {loadError && (
        <div style={{ ...card, padding: 14, marginBottom: 14, color: "#b91c1c", background: "#fef2f2" }}>
          {loadError}
        </div>
      )}
      <DataTable
        columns={["Quotation", "Client", "Client Approval", "Token / Receipt", "Amount", "Status", "Actions"]}
        rows={filtered.map((quote) => [
          <div style={quote.id === highlightedId ? { padding: 8, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe" } : undefined}>
            <strong>{quote.quotation_number || "Draft quotation"}</strong>
            {quote.id === highlightedId && <div style={{ color: "#2563eb", fontSize: 11, fontWeight: 850 }}>Just saved</div>}
          </div>,
          quote.customer_name || "-",
          quote.status === "DRAFT"
            ? <span style={{ color: "#94a3b8" }}>Click Send to generate/share client link</span>
            : <Button onClick={() => copyClientLink(quote)} tone="light"><FileText size={14} /> Copy Approval Link</Button>,
          quote.status === "APPROVED" ? <span style={{ color: "#64748b" }}>Inventory will generate token</span> : <span style={{ color: "#94a3b8" }}>After client approval</span>,
          money(quote.total_amount),
          statusChip(quote.status),
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={() => updateStatus(quote.id, "SENT")} tone="light"><ArrowRight size={14} /> Send</Button>
            <Button onClick={() => updateStatus(quote.id, "APPROVED")} tone="success"><CheckCircle2 size={14} /> Client Approved</Button>
            <Button to={`/inventory/queue?quotationId=${quote.id}`} tone="dark"><Package size={14} /> Inventory</Button>
          </div>,
        ])}
        empty={loading ? "Loading quotations..." : "No quotations found."}
      />
    </div>
  );
}

export function CrmCreateQuotationPage() {
  const { customers, products, reload } = useCrmData();
  const { showToast } = useToastContext();
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const [customerId, setCustomerId] = useState(params.get("customerId") || "");
  const [priceTier, setPriceTier] = useState("TIER_A");
  const [templateStyle, setTemplateStyle] = useState("HBL Sales Tax Invoice");
  const [taxRate, setTaxRate] = useState(18);
  const [lines, setLines] = useState<QuoteLine[]>([{ product_id: "", manual_description: "", quantity: 1, unit_price: 0 }]);
  const [savingQuotation, setSavingQuotation] = useState(false);
  const savingQuotationRef = useRef(false);
  const quotationIdempotencyKeyRef = useRef(makeIdempotencyKey("quotation"));

  useEffect(() => {
    setLines((current) =>
      current.map((line) => {
        if (!line.product_id) return line;
        const product = products.find((item) => item.id === line.product_id);
        return { ...line, unit_price: productPrice(product, priceTier) };
      }),
    );
  }, [priceTier, products]);

  const normalizedLines = lines.map((line) => {
    const product = products.find((item) => item.id === line.product_id);
    return {
      product_id: line.product_id || "",
      description: product?.product_name || line.manual_description,
      quantity: Number(line.quantity || 1),
      unit_price: line.product_id ? productPrice(product, priceTier) : Number(line.unit_price || 0),
      stock_available: product ? Number(product.available_count ?? product.quantity ?? 0) >= Number(line.quantity || 1) : false,
    };
  });
  const subtotal = normalizedLines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const tax = (subtotal * taxRate) / 100;

  const updateLine = (index: number, patch: Partial<QuoteLine>) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const submitQuotation = async (nextStatus: "DRAFT" | "SENT") => {
    if (savingQuotationRef.current) return;
    if (!customerId) return showToast("Select a client first.", "error");
    if (normalizedLines.some((line) => !line.description || line.quantity <= 0)) {
      return showToast("Each line needs a product or manual purchase description.", "error");
    }
    savingQuotationRef.current = true;
    setSavingQuotation(true);
    try {
      const response = await apiClient.post("/crm/quotations", {
        idempotency_key: quotationIdempotencyKeyRef.current,
        customer_id: customerId,
        price_tier: priceTier,
        template_style: templateStyle,
        tax_amount: tax,
        items: normalizedLines.map((line) => ({
          product_id: line.product_id || null,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
        })),
      });
      let savedQuotation = response.data?.data as Quotation | undefined;
      if (nextStatus === "SENT" && savedQuotation?.id) {
        const sentResponse = await apiClient.patch(`/crm/quotations/${savedQuotation.id}/status`, { status: "SENT" });
        savedQuotation = sentResponse.data?.data || savedQuotation;
        const link = clientQuotationUrl(savedQuotation?.client_approval_token);
        if (link && navigator.clipboard) {
          await navigator.clipboard.writeText(link).catch(() => undefined);
        }
        showToast(link ? `${savedQuotation?.quotation_number} sent. Next: client approval.` : "Quotation sent. Next: client approval.", "success");
      } else {
        showToast(`Quotation saved once as ${savedQuotation?.quotation_number || "new draft"}.`, "success");
      }
      quotationIdempotencyKeyRef.current = makeIdempotencyKey("quotation");
      reload();
      navigate("/crm/quotations", { state: { createdQuotationId: savedQuotation?.id } });
    } finally {
      savingQuotationRef.current = false;
      setSavingQuotation(false);
    }
  };

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header eyebrow="CSR / CRM" title="Create Client Quotation" text="Add catalog or custom items." />
      <form onSubmit={(event) => { event.preventDefault(); submitQuotation("DRAFT"); }} style={{ display: "grid", gap: 14 }}>
        <div style={{ ...card, padding: 18, display: "grid", gridTemplateColumns: "1.4fr .8fr .8fr", gap: 12 }}>
          <label>
            <span style={{ fontSize: 12, fontWeight: 900, color: "#475569" }}>Client</span>
            <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={input}>
              <option value="">Select registered client</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customer_name}</option>)}
            </select>
          </label>
          <label>
            <span style={{ fontSize: 12, fontWeight: 900, color: "#475569" }}>Price Tier</span>
            <select value={priceTier} onChange={(e) => setPriceTier(e.target.value)} style={input}>
              <option value="TIER_A">Standard</option>
              <option value="TIER_B">Corporate</option>
              <option value="TIER_C">Government</option>
              <option value="TIER_D">VIP</option>
            </select>
          </label>
          <label>
            <span style={{ fontSize: 12, fontWeight: 900, color: "#475569" }}>Template</span>
            <select value={templateStyle} onChange={(e) => setTemplateStyle(e.target.value)} style={input}>
              <option>HBL Sales Tax Invoice</option>
              <option>Custom Billing Template</option>
            </select>
          </label>
        </div>
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Quotation line items</h3>
            <Button onClick={() => setLines([...lines, { product_id: "", manual_description: "", quantity: 1, unit_price: 0 }])}><Plus size={14} /> Add Line</Button>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {lines.map((line, index) => {
              const product = products.find((item) => item.id === line.product_id);
              return (
                <div key={index} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr .5fr .7fr .7fr 40px", gap: 8, alignItems: "center" }}>
                  <select value={line.product_id} onChange={(e) => {
                    const product = products.find((p) => p.id === e.target.value);
                    updateLine(index, {
                      product_id: e.target.value,
                      manual_description: e.target.value ? "" : line.manual_description,
                      unit_price: productPrice(product, priceTier),
                    });
                  }} style={input}>
                    <option value="">Manual purchase / not in stock</option>
                    {products.map((productItem) => (
                      <option key={productItem.id} value={productItem.id}>
                        {productItem.product_name} - {money(productPrice(productItem, priceTier))} - available {productItem.available_count ?? productItem.quantity ?? 0}
                      </option>
                    ))}
                  </select>
                  <input style={input} placeholder="Manual item needed to buy" value={line.manual_description} onChange={(e) => updateLine(index, { manual_description: e.target.value })} disabled={Boolean(line.product_id)} />
                  <input type="number" min="1" style={input} value={line.quantity} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) || 1 })} />
                  <input
                    type="number"
                    min="0"
                    style={{ ...input, background: line.product_id ? "#eef6ff" : input.background }}
                    value={line.unit_price}
                    onChange={(e) => updateLine(index, { unit_price: Number(e.target.value) || 0 })}
                    readOnly={Boolean(line.product_id)}
                    title={line.product_id ? "Auto-filled from selected product" : "Manual purchase estimate"}
                  />
                  <div style={{ fontWeight: 900, textAlign: "right" }}>{money(Number(line.quantity || 0) * Number(line.unit_price || 0))}<br /><span style={{ color: product && Number(product.available_count ?? product.quantity ?? 0) < Number(line.quantity || 1) ? "#b45309" : "#047857", fontSize: 11 }}>{product ? "Stock check" : "Purchase required"}</span></div>
                  <Button tone="light" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, i) => i !== index))}>X</Button>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginTop: 18, fontWeight: 900 }}>
            <span>Subtotal: {money(subtotal)}</span>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>GST % <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} style={{ ...input, width: 90 }} /></label>
            <span>Total: {money(subtotal + tax)}</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button to="/crm/quotations" tone="light">Cancel</Button>
          <button type="submit" className="btn btn-secondary" disabled={savingQuotation}>{savingQuotation ? "Saving..." : "Save as Draft"}</button>
          <button type="button" className="btn btn-primary" disabled={savingQuotation} onClick={() => submitQuotation("SENT")}>
            {savingQuotation ? "Generating..." : "Generate & Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ClientQuotationApprovalPage() {
  const { token = "" } = useParams();
  const { showToast } = useToastContext();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [clientName, setClientName] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/crm/public/quotations/${token}`);
      setQuotation(response.data.data || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const approve = async () => {
    if (!quotation || approving) return;
    setApproving(true);
    try {
      const response = await apiClient.post(`/crm/public/quotations/${token}/approve`, {
        client_name: clientName || quotation.customer_name || "Client approved",
      });
      setQuotation({ ...quotation, ...response.data.data, status: "APPROVED" });
      showToast("Quotation approved. Next: Inventory > Incoming Orders.", "success");
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, fontFamily: "'Outfit', sans-serif" }}>Loading quotation...</div>;
  }

  if (!quotation) {
    return (
      <div style={{ padding: 40, fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ ...card, padding: 24, maxWidth: 720, margin: "80px auto" }}>
          <h1 style={{ marginTop: 0 }}>Quotation link not found</h1>
          <p style={{ color: "#64748b" }}>Please ask CSR to send the latest approval link.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#eef6ff,#f8fbff)", padding: 28, fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ ...card, padding: 24, marginBottom: 16, background: "#0f172a", color: "#ffffff" }}>
          <div style={{ color: "#bfdbfe", fontWeight: 900, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" }}>TRACK360 Client Approval</div>
          <h1 style={{ margin: "10px 0 8px" }}>Quotation {quotation.quotation_number}</h1>
          <p style={{ margin: 0, color: "#dbeafe" }}>
            Review the quotation items below. Once approved, the job moves to Inventory for stock and installer dispatch.
          </p>
        </div>

        <div style={{ ...card, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>Client</div>
              <div style={{ fontWeight: 900 }}>{quotation.customer_name || "-"}</div>
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>Status</div>
              {statusChip(quotation.status)}
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>Total</div>
              <div style={{ fontWeight: 950, fontSize: 22 }}>{money(quotation.total_amount)}</div>
            </div>
          </div>
        </div>

        <DataTable
          columns={["Item", "Quantity", "Unit Price", "Total"]}
          rows={(quotation.items || []).map((item) => [
            <strong>{item.description || item.item_description || item.product_name || "Quotation item"}</strong>,
            item.quantity || 1,
            money(item.unit_price || 0),
            money(Number(item.quantity || 1) * Number(item.unit_price || 0)),
          ])}
          empty="No quotation items found."
        />

        <div style={{ ...card, padding: 18, marginTop: 16 }}>
          <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
            <span style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>Approver name / remarks</span>
            <input style={input} value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Your name or approval note" />
          </label>
          <button className="btn btn-primary" disabled={approving || quotation.status === "APPROVED"} onClick={approve}>
            {quotation.status === "APPROVED" ? "Already Approved" : approving ? "Approving..." : "Approve Quotation"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function InventoryFlowDashboardPage() {
  const { summary, workQueue, products, items, purchaseOrders, dispatches, tokens, loading } = useInventoryFlowData();
  const cards = [
    ["Dashboard", summary?.total_products || products.length, "/inventory-dashboard", "Live stock, dispatch, return and low-stock health"],
    ["Incoming Orders", summary?.pending_incoming_orders || workQueue.length, "/inventory/queue", "CRM converted orders waiting for inventory action"],
    ["Token Management", summary?.active_tokens || tokens.length, "/inventory/tokens", "Generated receipts linked one-to-one with orders"],
    ["Product Catalog", products.length, "/inventory/products", "Stock master used by CRM quotation pricing"],
    ["Serial / Barcode Scan", items.filter((item) => item.current_status === "AVAILABLE").length, "/inventory/serials", "Serial and IMEI items ready to issue"],
    ["Purchase Orders", purchaseOrders.length, "/inventory/purchasing", "Buy missing items and receive vendor stock"],
    ["Dispatch", summary?.active_dispatches || dispatches.length, "/inventory/dispatches", "Give stock to installer and track handoff"],
    ["Returns", summary?.pending_returns || 0, "/inventory/returns", "Installer returns and adjusted bill reconciliation"],
  ];
  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header eyebrow="Inventory / Logistics Service" title="Inventory Portal Flow" text="Stock, purchasing, dispatch and returns." actions={<Button to="/inventory/queue" tone="success"><ClipboardCheck size={16} /> Start Incoming Orders</Button>} />
      <FlowSteps />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
        {cards.map(([label, value, href, help]) => (
          <Link key={String(label)} to={String(href)} style={{ ...card, padding: 18, textDecoration: "none" }}>
            <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
            <div style={{ color: "#0f172a", fontSize: 32, fontWeight: 950, marginTop: 8 }}>{loading ? "-" : value}</div>
            <div style={{ color: "#64748b", minHeight: 38 }}>{help}</div>
            <div style={{ color: "#2563eb", fontWeight: 850, marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>Open page <ArrowRight size={14} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function InventoryQueuePage() {
  const { workQueue, reload } = useInventoryFlowData();
  const { showToast } = useToastContext();
  const [q, setQ] = useState("");
  const [generatingOrderId, setGeneratingOrderId] = useState("");
  const [expandedStockRows, setExpandedStockRows] = useState<Record<string, boolean>>({});
  const filtered = workQueue.filter((job) => [job.token_number, job.order_number, job.quotation_number, job.customer_name, job.order_status, job.status].join(" ").toLowerCase().includes(q.toLowerCase()));

  const toggleStockDetails = (rowKey: string) => {
    setExpandedStockRows((current) => ({ ...current, [rowKey]: !current[rowKey] }));
  };

  const generateToken = async (job: InventoryWorkQueueJob) => {
    if (!job.order_id) {
      showToast("Order id missing. Convert this quotation to order again from CRM.", "error");
      return;
    }
    setGeneratingOrderId(job.order_id);
    try {
      const token = await inventoryApi.generateOrderToken(job.order_id);
      showToast(
        token.already_generated
          ? `${token.token_number} already exists for this order.`
          : `${token.token_number} generated. Stock check is ready.`,
        "success",
      );
      await reload();
    } catch (error) {
      showToast("Token could not be generated. Please check backend/API connection.", "error");
    } finally {
      setGeneratingOrderId("");
    }
  };

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header
        eyebrow="Inventory Step 1"
        title="Incoming Orders and Client Tokens"
        text="Generate a token and review stock readiness."
        actions={<Button onClick={reload} tone="light"><RefreshCw size={15} /> Refresh</Button>}
      />
      <div style={{ ...card, padding: 14, marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search order, token, quotation or client" />
        <Button to="/inventory/tokens" tone="light"><ReceiptText size={15} /> Token Management</Button>
      </div>
      <DataTable
        columns={["Order / Token", "Client", "Quotation", "Stock Check", "Amount", "Status", "Next Actions"]}
        rows={filtered.map((job) => {
          const token = tokenForQuote(job);
          const gaps = hasStockGaps(job);
          const stockDetails = stockCheckDetails(job);
          const rowKey = job.order_id || job.id || job.quotation_number;
          const shortItems = stockDetails.filter((item) => !item.ok).length;
          const totalItems = stockDetails.length;
          const canDispatch = Boolean(token && stockDetails.some((item) => item.ok || item.available > 0));
          const actionStatus = queueActionStatus(job, token, gaps);
          const detailRow = token && expandedStockRows[rowKey] ? (
            <div style={{ padding: "14px 18px 18px" }}>
              <div style={{ ...card, padding: 0, overflow: "hidden", boxShadow: "none" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Item Name", "Required", "Available", "Short"].map((column) => (
                        <th key={column} style={{ ...th, background: "#f1f5f9" }}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stockDetails.map((item) => (
                      <tr key={item.id || item.product_id || item.product_name}>
                        <td style={td}>{item.product_name}</td>
                        <td style={td}>{item.required}</td>
                        <td style={td}>{item.available}</td>
                        <td style={{ ...td, color: item.missing ? "#b91c1c" : "#047857", fontWeight: 900 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {item.missing ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                            {item.missing ? `-${item.missing}` : "0"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null;
          return {
            key: rowKey,
            detail: detailRow,
            cells: [
            <div>
              <strong>{job.order_number || "Order pending"}</strong>
              <div style={{ marginTop: 5, color: token ? "#047857" : "#b45309", fontWeight: 850 }}>
                {token || "Token not generated"}
              </div>
              {token && (
                <Link to="/inventory/tokens" style={{ display: "inline-block", marginTop: 5, color: "#2563eb", fontSize: 12, fontWeight: 850, textDecoration: "none" }}>
                  View receipt
                </Link>
              )}
            </div>,
            job.customer_name || "-",
            <strong>{job.quotation_number}</strong>,
            <div style={{ display: "grid", gap: 7 }}>
              {!token && <span style={{ color: "#64748b", fontWeight: 750 }}>Generate token to run stock check.</span>}
              {token && shortItems === 0 && (
                <span style={{ color: "#047857", background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 999, padding: "6px 10px", fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 6, width: "fit-content" }}>
                  <CheckCircle2 size={14} /> All items available
                </span>
              )}
              {token && shortItems > 0 && (
                <>
                  <span style={{ color: "#b45309", fontWeight: 900 }}>{shortItems} of {totalItems} items short</span>
                  <button
                    type="button"
                    onClick={() => toggleStockDetails(rowKey)}
                    style={{ border: 0, background: "transparent", padding: 0, color: "#2563eb", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 850, width: "fit-content" }}
                  >
                    {expandedStockRows[rowKey] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {expandedStockRows[rowKey] ? "Hide details" : "View details"}
                  </button>
                </>
              )}
            </div>,
            money(job.total_amount),
            <div>
              {statusChip(actionStatus)}
              <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>{orderStatusHelp(actionStatus)}</div>
            </div>,
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!token && (
                <Button onClick={() => generateToken(job)} disabled={generatingOrderId === job.order_id} tone="success" prominent>
                  <ReceiptText size={14} /> {generatingOrderId === job.order_id ? "Generating..." : "Generate Token"}
                </Button>
              )}
              {token && gaps && <Button to={`/inventory/purchasing?orderId=${job.order_id}&quotationId=${job.id}`} tone="warning"><ShoppingCart size={14} /> Create PO</Button>}
              {canDispatch && <Button to={`/inventory/dispatches?orderId=${job.order_id}&quotationId=${job.id}`} tone="success"><Wrench size={14} /> Create Dispatch</Button>}
            </div>,
            ],
          };
        })}
        empty="No converted CRM orders are waiting."
      />
    </div>
  );
}

export function InventoryTokensPage() {
  const { tokens, loading, reload } = useInventoryFlowData();
  const [q, setQ] = useState("");
  const filtered = tokens.filter((token) => [token.token_number, token.order_number, token.quotation_number, token.customer_name, token.status].join(" ").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header
        eyebrow="Inventory Step 1B"
        title="Token Management and Receipts"
        text="One linked token per order."
        actions={<Button onClick={reload} tone="light"><RefreshCw size={15} /> Refresh</Button>}
      />
      <div style={{ ...card, padding: 14, marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search token, order, quotation or client" />
        <Button to="/inventory/queue" tone="success"><ClipboardCheck size={15} /> Incoming Orders</Button>
      </div>
      <DataTable
        columns={["Token No", "Order", "Client", "Items", "Total Value", "Status", "Actions"]}
        rows={filtered.map((token) => [
          <strong>{token.token_number}</strong>,
          <div>{token.order_number}<br /><span style={{ color: "#64748b" }}>{token.quotation_number || "-"}</span></div>,
          token.customer_name || "-",
          `${token.item_count || 0} items`,
          money(token.total_amount),
          <div>
            {statusChip(token.status)}
            <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>{tokenStatusHelp(token.status)}</div>
          </div>,
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button to={`/inventory/dispatches?orderId=${token.id}`} tone="success"><Wrench size={14} /> View Dispatch</Button>
            <Button onClick={() => printHtmlDocument(tokenReceiptHtml(token), token.token_number || "Token Receipt")} tone="light"><ReceiptText size={14} /> Print Receipt</Button>
          </div>,
        ])}
        empty={loading ? "Loading tokens..." : "No tokens generated yet. Open Incoming Orders and click Generate Token."}
      />
    </div>
  );
}

export function InventoryProductsPage() {
  const { products, reload } = useInventoryFlowData();
  const { showToast } = useToastContext();
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyProduct = {
    product_name: "",
    product_type: "ASSET" as Product["product_type"],
    tracking_type: "SERIAL" as Product["tracking_type"],
    quantity: 0,
    min_stock_level: 5,
    unit_price: 0,
    cost_price: 0,
    description: "",
  };
  const [draft, setDraft] = useState(emptyProduct);
  const filtered = products.filter((product) => [product.product_name, product.category_name, product.product_type].join(" ").toLowerCase().includes(q.toLowerCase()));

  const saveProduct = async () => {
    if (!draft.product_name.trim()) {
      showToast("Product name is required.", "error");
      return;
    }
    if (Number(draft.unit_price) <= 0) {
      showToast("Enter a unit price greater than zero.", "error");
      return;
    }
    setSaving(true);
    try {
      await inventoryApi.createProduct(draft);
      await reload();
      setDraft(emptyProduct);
      setShowForm(false);
      showToast("Product added to the catalog.", "success");
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Product could not be added.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header eyebrow="Inventory Master" title="Product Catalog and Stock Levels" text="Products, prices and stock levels." actions={<Button onClick={() => setShowForm((open) => !open)} tone="light"><Plus size={15} /> {showForm ? "Close Form" : "Add Product"}</Button>} />
      {showForm && (
        <div style={{ ...card, padding: 18, marginBottom: 14 }}>
          <h3 style={{ margin: "0 0 14px" }}>Add Product</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Product Name *
              <input value={draft.product_name} onChange={(event) => setDraft({ ...draft, product_name: event.target.value })} style={{ ...input, marginTop: 6 }} />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Product Type
              <select value={draft.product_type} onChange={(event) => setDraft({ ...draft, product_type: event.target.value as Product["product_type"] })} style={{ ...input, marginTop: 6 }}>
                <option value="ASSET">Asset</option><option value="CONSUMABLE">Consumable</option><option value="SERVICE">Service</option>
              </select>
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Tracking
              <select value={draft.tracking_type} onChange={(event) => setDraft({ ...draft, tracking_type: event.target.value as Product["tracking_type"] })} style={{ ...input, marginTop: 6 }}>
                <option value="SERIAL">Serial</option><option value="IMEI">IMEI</option><option value="NONE">None</option>
              </select>
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Opening Quantity
              <input type="number" min="0" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: Number(event.target.value) })} style={{ ...input, marginTop: 6 }} />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Minimum Stock
              <input type="number" min="0" value={draft.min_stock_level} onChange={(event) => setDraft({ ...draft, min_stock_level: Number(event.target.value) })} style={{ ...input, marginTop: 6 }} />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Unit Price (PKR) *
              <input type="number" min="0" value={draft.unit_price} onChange={(event) => setDraft({ ...draft, unit_price: Number(event.target.value) })} style={{ ...input, marginTop: 6 }} />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Cost Price (PKR)
              <input type="number" min="0" value={draft.cost_price} onChange={(event) => setDraft({ ...draft, cost_price: Number(event.target.value) })} style={{ ...input, marginTop: 6 }} />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12, gridColumn: "1 / -1" }}>Description
              <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} style={{ ...input, marginTop: 6, minHeight: 72, resize: "vertical" }} />
            </label>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            <Button onClick={() => setShowForm(false)} tone="light">Cancel</Button>
            <Button onClick={saveProduct} tone="success" disabled={saving}>{saving ? "Saving..." : "Save Product"}</Button>
          </div>
        </div>
      )}
      <div style={{ ...card, padding: 14, marginBottom: 14, display: "flex", gap: 12 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search product, category or type" />
        <Button onClick={reload} tone="light"><RefreshCw size={15} /> Refresh</Button>
      </div>
      <DataTable
        columns={["Product", "Type", "Tracking", "Available", "Min Stock", "Price", "Action"]}
        rows={filtered.map((product) => [
          <div><strong>{product.product_name}</strong><br /><span style={{ color: "#64748b" }}>{product.category_name || "Uncategorized"}</span></div>,
          product.product_type,
          product.tracking_type,
          Number(product.available_count ?? product.quantity ?? 0),
          product.min_stock_level,
          productPriceDisplay(product),
          resolveProductUnitPrice(product) <= 0 ? <Button to="/inventory" tone="warning">Set Price</Button> : Number(product.quantity || 0) <= Number(product.min_stock_level || 0) ? <Button to="/inventory/purchasing" tone="light"><ShoppingCart size={14} /> Create PO</Button> : statusChip("IN STOCK"),
        ])}
        empty="No products found."
      />
    </div>
  );
}

export function InventorySerialsPage() {
  const { items } = useInventoryFlowData();
  const [q, setQ] = useState("");
  const filtered = items.filter((item) => [item.product_name, item.serial_number, item.imei, item.current_status].join(" ").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header eyebrow="Inventory Barcode" title="Serial / IMEI Scan and Assignment" text="Read-only serial and item status." />
      <div style={{ ...card, padding: 14, marginBottom: 14, display: "flex", gap: 12 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Scan or search serial / IMEI / product" />
        <Button to="/inventory/dispatches" tone="success"><Wrench size={15} /> Dispatch Serial</Button>
      </div>
      <DataTable
        columns={["Product", "Serial", "IMEI", "Status", "Location"]}
        rows={filtered.map((item) => [
          item.product_name || "-",
          <strong>{item.serial_number || "-"}</strong>,
          item.imei || "-",
          statusChip(item.current_status),
          item.location || "Warehouse",
        ])}
        empty="No serial/IMEI items found."
      />
    </div>
  );
}

export function InventoryPurchasingPage() {
  const { products, vendors, purchaseOrders, workQueue, reload } = useInventoryFlowData();
  const { showToast } = useToastContext();
  const navigate = useNavigate();
  const location = useLocation();
  const sourceParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const sourceOrderId = sourceParams.get("orderId") || "";
  const sourceQuotationId = sourceParams.get("quotationId") || "";
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const newLine = () => ({
    local_id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    product_id: "",
    quotation_item_id: "",
    product_name: "",
    quantity: 1,
    unit_price: 0,
    required_qty: 1,
    available_stock: 0,
    source: "manual",
  });
  type PurchaseDraftLine = ReturnType<typeof newLine>;
  const [form, setForm] = useState({
    vendor_id: "",
    order_date: new Date().toISOString().slice(0, 10),
    expected_delivery_date: "",
    tax_rate: 18,
    notes: "",
    order_id: sourceOrderId,
    quotation_id: sourceQuotationId,
  });
  const [poItems, setPoItems] = useState<PurchaseDraftLine[]>([newLine()]);
  const [receivePo, setReceivePo] = useState<PurchaseOrder | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});
  const prefillKeyRef = useRef("");

  const sourceJob = useMemo(
    () => workQueue.find((job) => (sourceOrderId && job.order_id === sourceOrderId) || (sourceQuotationId && job.id === sourceQuotationId)),
    [sourceOrderId, sourceQuotationId, workQueue],
  );

  function resolveAutoSupplierId(rows: PurchaseDraftLine[] = poItems) {
    if (!vendors.length) return "";

    const vendorIds = new Set(vendors.map((vendor) => vendor.id));
    const candidates = [
      (sourceJob as any)?.vendor_id,
      (sourceJob as any)?.supplier_id,
      (sourceJob as any)?.preferred_vendor_id,
      ...(sourceJob?.items || []).flatMap((item) => [
        item.vendor_id,
        item.supplier_id,
        (item as any).preferred_vendor_id,
      ]),
      ...rows.flatMap((line) => {
        const product = products.find((row) => row.id === line.product_id);
        return [product?.vendor_id, product?.supplier_id, (product as any)?.preferred_vendor_id];
      }),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    return candidates.find((value) => vendorIds.has(value)) || vendors[0]?.id || "";
  }

  const selectedSupplier = useMemo(
    () => vendors.find((vendor) => vendor.id === form.vendor_id),
    [form.vendor_id, vendors],
  );

  useEffect(() => {
    if (!sourceOrderId && !sourceQuotationId) return;
    if (!sourceJob) return;
    const key = `${sourceJob.order_id || sourceOrderId}|${sourceJob.id || sourceQuotationId}|${sourceJob.updated_at || ""}|${products.length}`;
    if (prefillKeyRef.current === key) return;

    const sourceItems = (sourceJob.items || []).filter((item) => !item.stock_ok);
    const rows = (sourceItems.length ? sourceItems : sourceJob.items || []).map((item) => {
      const product = products.find((row) => row.id === item.product_id);
      const requiredQty = Math.max(1, Number(item.required_qty || 1));
      const availableQty = Math.max(0, Number(item.available_stock || 0));
      const shortageQty = item.stock_ok ? requiredQty : Math.max(1, requiredQty - availableQty);
      return {
        ...newLine(),
        product_id: item.product_id || "",
        quotation_item_id: item.id || "",
        product_name: item.product_name || item.description || "Purchase item",
        quantity: shortageQty,
        unit_price: Number(product?.cost_price || item.unit_price || resolveProductUnitPrice(product) || 0),
        required_qty: requiredQty,
        available_stock: availableQty,
        source: item.stock_ok ? "CRM item" : "CRM shortage",
      };
    });

    if (rows.length) {
      setPoItems(rows);
      setForm((current) => ({
        ...current,
        vendor_id: current.vendor_id || resolveAutoSupplierId(rows),
        order_id: sourceJob.order_id || sourceOrderId,
        quotation_id: sourceJob.id || sourceQuotationId,
        notes:
          current.notes ||
          `Auto generated from ${sourceJob.order_number || "CRM order"} / ${sourceJob.quotation_number}. Buy only shortage items, then receive stock to make this order dispatch-ready.`,
      }));
      setShowForm(true);
      prefillKeyRef.current = key;
    }
  }, [products, sourceJob, sourceOrderId, sourceQuotationId, vendors]);

  useEffect(() => {
    if (!showForm || form.vendor_id || !vendors.length) return;
    const vendorId = resolveAutoSupplierId(poItems);
    if (vendorId) {
      setForm((current) => (current.vendor_id ? current : { ...current, vendor_id: vendorId }));
    }
  }, [showForm, form.vendor_id, vendors, poItems, products, sourceJob]);

  const resetForm = () => {
    setForm({
      vendor_id: vendors[0]?.id || "",
      order_date: new Date().toISOString().slice(0, 10),
      expected_delivery_date: "",
      tax_rate: 18,
      notes: "",
      order_id: sourceOrderId,
      quotation_id: sourceQuotationId,
    });
    setPoItems([newLine()]);
  };

  const updateLine = (localId: string, patch: Partial<PurchaseDraftLine>) => {
    setPoItems((current) => current.map((line) => (line.local_id === localId ? { ...line, ...patch } : line)));
  };

  const changeProduct = (localId: string, productId: string) => {
    const product = products.find((row) => row.id === productId);
    updateLine(localId, {
      product_id: productId,
      product_name: product?.product_name || "",
      unit_price: Number(product?.cost_price || resolveProductUnitPrice(product) || 0),
    });
  };

  const removeLine = (localId: string) => {
    setPoItems((current) => (current.length > 1 ? current.filter((line) => line.local_id !== localId) : [newLine()]));
  };

  const poSubtotal = useMemo(
    () => poItems.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0)) * Math.max(0, Number(item.unit_price || 0)), 0),
    [poItems],
  );
  const poTaxAmount = useMemo(() => Number((poSubtotal * Math.max(0, Number(form.tax_rate || 0)) / 100).toFixed(2)), [poSubtotal, form.tax_rate]);
  const poGrandTotal = useMemo(() => Number((poSubtotal + poTaxAmount).toFixed(2)), [poSubtotal, poTaxAmount]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.vendor_id) {
      showToast("Please select a supplier before saving PO.", "error");
      return;
    }
    if (!form.expected_delivery_date) {
      showToast("Please select expected delivery date before saving PO.", "error");
      return;
    }
    const validItems = poItems.filter((item) => item.product_id || item.product_name.trim());
    if (!validItems.length) {
      showToast("Please add at least one purchase item.", "error");
      return;
    }
    try {
      setSaving(true);
      await inventoryApi.createPurchaseOrder({
        vendor_id: form.vendor_id,
        order_date: form.order_date,
        expected_delivery_date: form.expected_delivery_date,
        tax_rate: form.tax_rate,
        order_id: form.order_id || undefined,
        quotation_id: form.quotation_id || undefined,
        notes: form.notes,
        items: validItems.map((item) => ({
          product_id: item.product_id || undefined,
          quotation_item_id: item.quotation_item_id || undefined,
          product_name: item.product_name.trim(),
          remarks: item.product_name.trim(),
          quantity: Math.max(1, Number(item.quantity || 1)),
          unit_price: Math.max(0, Number(item.unit_price || 0)),
        })),
      });
      showToast("Purchase order saved. Next: receive stock.", "success");
      setShowForm(false);
      resetForm();
      reload();
    } finally {
      setSaving(false);
    }
  };

  const openReceive = (po: PurchaseOrder) => {
    const quantities: Record<string, number> = {};
    (po.items || []).forEach((item) => {
      quantities[item.id] = Math.max(0, Number(item.quantity || 0) - Number(item.received_quantity || 0));
    });
    setReceiveQty(quantities);
    setReceivePo(po);
  };

  const submitReceive = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!receivePo) return;
    const items = Object.entries(receiveQty)
      .map(([id, received_qty]) => ({ id, received_qty: Number(received_qty || 0) }))
      .filter((item) => item.received_qty > 0);
    if (!items.length) {
      showToast("Enter received quantity for at least one item.", "error");
      return;
    }
    const receivingPo = receivePo;
    await inventoryApi.receivePurchaseOrder(receivingPo.id, { items });
    setReceivePo(null);
    setReceiveQty({});
    await reload();

    const refreshedQueue = await inventoryApi.getWorkQueue({ stock_status: "STOCK_OK" }).catch(() => []);
    const readyJob = refreshedQueue.find((job) =>
      (receivingPo.crm_order_id && job.order_id === receivingPo.crm_order_id)
      || (receivingPo.quotation_id && job.id === receivingPo.quotation_id),
    );
    if (readyJob) {
      showToast("Stock received. Next: Inventory > Installer Dispatch.", "success");
      navigate(`/inventory/dispatches?orderId=${readyJob.order_id || ""}&quotationId=${readyJob.id}`);
      return;
    }
    showToast("Partial receipt saved. Next: receive remaining stock.", "success");
  };

  const fieldLabel = (label: string, child: React.ReactNode) => (
    <label style={{ display: "grid", gap: 6, color: "#475569", fontSize: 12, fontWeight: 850 }}>
      {label}
      {child}
    </label>
  );

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header
        eyebrow="Inventory Step 2"
        title="Purchase Orders for Missing Items"
        text="Purchase and receive missing stock."
        actions={<Button onClick={() => setShowForm(true)}><Plus size={16} /> New PO</Button>}
      />
      {showForm && (
        <form onSubmit={submit} style={{ ...card, padding: 18, marginBottom: 14, display: "grid", gap: 12 }}>
          {(sourceJob || form.order_id || form.quotation_id) && (
            <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 750 }}>
              Auto-filled from CRM: <strong>{sourceJob?.order_number || "Linked order"}</strong>
              {sourceJob?.customer_name ? ` for ${sourceJob.customer_name}` : ""}. Short items are already loaded below; you can still add or remove lines if needed.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            {fieldLabel("Supplier *", (
              <div style={{ display: "grid", gap: 6 }}>
                <select required value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} style={input}>
                  <option value="">Select supplier</option>
                  {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                </select>
                {selectedSupplier ? (
                  <span style={{ color: "#047857", fontSize: 11, fontWeight: 800 }}>
                    Auto-selected supplier: {selectedSupplier.name}. Change it if this PO should go to another supplier.
                  </span>
                ) : (
                  <span style={{ color: "#b45309", fontSize: 11, fontWeight: 800 }}>
                    Add a supplier in Master Setup to auto-fill this field.
                  </span>
                )}
              </div>
            ))}
            {fieldLabel("PO Date", <input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} style={input} />)}
            {fieldLabel("Expected Delivery *", <input required type="date" min={form.order_date || new Date().toISOString().slice(0, 10)} value={form.expected_delivery_date} onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })} style={input} />)}
            <TaxRateControl value={form.tax_rate} onChange={(tax_rate) => setForm({ ...form, tax_rate })} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>PO Items</h3>
            <Button tone="light" onClick={() => setPoItems((current) => [...current, newLine()])}><Plus size={14} /> Add Item</Button>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr .55fr .7fr .75fr 86px", background: "#eef4ff", color: "#475569", fontSize: 11, fontWeight: 900, letterSpacing: ".04em", textTransform: "uppercase" }}>
              {["Product / Manual Item", "Source", "Qty", "Unit Cost", "Line Total", "Action"].map((label) => (
                <div key={label} style={{ padding: "10px 12px" }}>{label}</div>
              ))}
            </div>
            {poItems.map((item) => {
              const product = products.find((row) => row.id === item.product_id);
              const lineTotal = Math.max(0, Number(item.quantity || 0)) * Math.max(0, Number(item.unit_price || 0));
              return (
                <div key={item.local_id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr .55fr .7fr .75fr 86px", gap: 0, alignItems: "center", borderTop: "1px solid #e2e8f0" }}>
                  <div style={{ padding: 10, display: "grid", gap: 8 }}>
                    <select value={item.product_id} onChange={(e) => changeProduct(item.local_id, e.target.value)} style={input}>
                      <option value="">Manual / purchase-only item</option>
                      {products.map((productRow) => (
                        <option key={productRow.id} value={productRow.id}>
                          {productRow.product_name} - {money(Number(productRow.cost_price || resolveProductUnitPrice(productRow) || 0))}
                        </option>
                      ))}
                    </select>
                    <input
                      value={item.product_name}
                      onChange={(e) => updateLine(item.local_id, { product_name: e.target.value })}
                      style={input}
                      placeholder="Item name"
                    />
                  </div>
                  <div style={{ padding: 10, color: "#64748b", fontSize: 12 }}>
                    <strong style={{ color: item.source === "CRM shortage" ? "#b45309" : "#475569" }}>{item.source || "Manual"}</strong>
                    <br />
                    Required {Number(item.required_qty || item.quantity || 0)} | Stock {Number(product?.quantity ?? item.available_stock ?? 0)}
                  </div>
                  <div style={{ padding: 10 }}>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLine(item.local_id, { quantity: Number(e.target.value) || 1 })}
                      style={input}
                    />
                  </div>
                  <div style={{ padding: 10 }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateLine(item.local_id, { unit_price: Number(e.target.value) || 0 })}
                      style={input}
                    />
                  </div>
                  <div style={{ padding: 10, fontWeight: 900, color: "#0f172a" }}>{money(lineTotal)}</div>
                  <div style={{ padding: 10 }}>
                    <Button tone="light" onClick={() => removeLine(item.local_id)}>Remove</Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
            <div style={{ ...card, padding: 12 }}><div style={{ color: "#64748b", fontSize: 11, fontWeight: 900 }}>Subtotal</div><strong>{money(poSubtotal)}</strong></div>
            <div style={{ ...card, padding: 12 }}><div style={{ color: "#64748b", fontSize: 11, fontWeight: 900 }}>GST {Number(form.tax_rate || 0)}%</div><strong>{money(poTaxAmount)}</strong></div>
            <div style={{ ...card, padding: 12 }}><div style={{ color: "#64748b", fontSize: 11, fontWeight: 900 }}>Grand Total</div><strong>{money(poGrandTotal)}</strong></div>
          </div>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={input} placeholder="Notes / purchase reason" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button tone="light" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            <button type="submit" className="btn btn-primary" disabled={!vendors.length || saving}>{saving ? "Saving..." : "Save Purchase Order"}</button>
          </div>
          {!vendors.length && <div style={{ color: "#b45309", fontWeight: 850 }}>No supplier found. Add a real supplier in Master Setup before creating a PO.</div>}
        </form>
      )}
      <DataTable
        columns={["PO Number", "Vendor", "Created Date", "Expected Delivery", "Items", "Status", "Amount", "Action"]}
        rows={purchaseOrders.map((po) => {
          const poStatus = String(po.status || "").toUpperCase();
          const receiveAction = poStatus === "RECEIVED"
            ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "0 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", color: "#64748b", fontSize: 12, fontWeight: 900 }}>
                <CheckCircle2 size={15} /> Stock Received
              </span>
            )
            : poStatus === "CANCELLED"
              ? <span style={{ color: "#94a3b8", fontWeight: 850 }}>Cancelled</span>
              : (
                <Button onClick={() => openReceive(po)} tone="success">
                  <Package size={14} /> {poStatus === "PARTIALLY_RECEIVED" ? "Receive Remaining" : "Receive Stock"}
                </Button>
              );
          return [
            <strong>{po.po_number}</strong>,
            po.vendor_name || "Not set",
            dateText(po.created_at || po.order_date),
            dateText(po.expected_delivery_date),
            <div>
              <strong>{po.item_count || 0} lines</strong>
              {(po.customer_name || po.order_number || po.quotation_number) && (
                <div style={{ color: "#64748b", fontSize: 12 }}>
                  {po.customer_name || "Linked CRM"} {po.order_number ? `| ${po.order_number}` : ""} {po.quotation_number ? `| ${po.quotation_number}` : ""}
                </div>
              )}
            </div>,
            statusChip(po.status),
            money(po.total_amount),
            receiveAction,
          ];
        })}
        empty="No purchase orders yet."
      />
      {receivePo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15, 23, 42, .48)", display: "grid", placeItems: "center", padding: 18 }}>
          <form onSubmit={submitReceive} style={{ ...card, width: "min(920px, 100%)", maxHeight: "calc(100vh - 36px)", overflowY: "auto", padding: 18, display: "grid", gap: 14, boxShadow: "0 24px 70px rgba(15, 23, 42, .24)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <div style={{ color: "#2563eb", fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".05em" }}>Purchase Order Receipt</div>
                <h3 style={{ margin: "4px 0 0" }}>Receive Stock</h3>
                <p style={{ margin: "5px 0 0", color: "#64748b" }}>
                  {receivePo.po_number} | {receivePo.vendor_name || "Supplier not set"} | Expected {dateText(receivePo.expected_delivery_date)}
                </p>
              </div>
              <Button onClick={() => setReceivePo(null)} tone="light">Close</Button>
            </div>
            <div style={{ border: "1px solid #bfdbfe", borderRadius: 10, background: "#eff6ff", color: "#1e3a8a", padding: 11, fontSize: 13, fontWeight: 750 }}>
              Enter the quantity physically received. When all shortages are covered, the linked job will open automatically in Installer Dispatch.
            </div>
            <DataTable
              columns={["Product", "Ordered", "Already Received", "Receive Now", "Unit Cost"]}
              rows={(receivePo.items || []).map((item: PurchaseOrderItem) => {
                const remaining = Math.max(0, Number(item.quantity || 0) - Number(item.received_quantity || 0));
                return [
                  <strong>{item.product_name || "Stock item"}</strong>,
                  Number(item.quantity || 0),
                  Number(item.received_quantity || 0),
                  <input
                    type="number"
                    min="0"
                    max={remaining}
                    value={receiveQty[item.id] ?? 0}
                    onChange={(event) => setReceiveQty({ ...receiveQty, [item.id]: Math.max(0, Number(event.target.value) || 0) })}
                    style={{ ...input, maxWidth: 140 }}
                  />,
                  money(item.unit_price),
                ];
              })}
              empty="This PO has no item lines to receive."
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <Button onClick={() => setReceivePo(null)} tone="light">Cancel</Button>
              <button type="submit" className="btn btn-primary">Confirm Receive Stock</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function InventoryDispatchesPage() {
  const { dispatches, reload } = useInventoryFlowData();
  const { showToast } = useToastContext();
  const params = new URLSearchParams(window.location.search);
  const initialQuotationId = params.get("quotationId") || "";
  const initialOrderId = params.get("orderId") || "";
  const [showForm, setShowForm] = useState(Boolean(initialQuotationId || initialOrderId));
  const [installers, setInstallers] = useState<InventoryInstallerUser[]>([]);
  const [readyQueue, setReadyQueue] = useState<InventoryWorkQueueJob[]>([]);
  const [readyLoading, setReadyLoading] = useState(true);
  const [form, setForm] = useState({
    quotation_id: initialQuotationId,
    customer_id: "",
    installer_id: "",
    site_address: "",
    notes: "",
  });

  const activeDispatchQuoteIds = useMemo(
    () => new Set(dispatches.filter((dispatch) => !["CANCELLED", "COMPLETED", "BILL_SENT"].includes(String(dispatch.status || "").toUpperCase())).map((dispatch) => dispatch.quotation_id).filter(Boolean)),
    [dispatches],
  );
  const readyJobs = readyQueue.filter((job) => {
    const token = tokenForQuote(job);
    const status = orderStatusLabel(job.order_status);
    const stockStatus = String(job.stock_status || job.order_status || "").toUpperCase();
    return Boolean(token)
      && !activeDispatchQuoteIds.has(job.id)
      && stockStatus === "STOCK_OK"
      && !["FULLY_DISPATCHED", "COMPLETED", "BILL_SENT", "CANCELLED"].includes(status);
  });
  const selectedJob = readyJobs.find((job) => job.id === form.quotation_id || (initialOrderId && job.order_id === initialOrderId));
  const selectedReadyItems = (selectedJob?.items || [])
    .filter((item) => item.product_id && item.stock_ok)
    .map((item) => ({
      product_id: item.product_id,
      quantity_issued: Number(item.required_qty || 1),
      unit_price: Number(item.unit_price || 0),
      unit_of_measure: "UNITS",
    }));

  const loadReadyQueue = async () => {
    setReadyLoading(true);
    try {
      setReadyQueue(await inventoryApi.getWorkQueue({ stock_status: "STOCK_OK" }));
    } catch {
      setReadyQueue([]);
      showToast("Ready dispatch queue could not be loaded.", "error");
    } finally {
      setReadyLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedJob) return;
    setForm((current) => ({
      ...current,
      quotation_id: selectedJob.id,
      customer_id: selectedJob.customer_id || "",
    }));
  }, [selectedJob?.id]);

  useEffect(() => {
    inventoryApi.getInstallers().then(setInstallers).catch(() => setInstallers([]));
  }, []);

  useEffect(() => {
    loadReadyQueue();
  }, []);

  const clearPreparedJob = () => {
    setShowForm(false);
    setForm({ quotation_id: "", customer_id: "", installer_id: "", site_address: "", notes: "" });
    window.history.replaceState(null, "", "/inventory/dispatches");
  };

  useEffect(() => {
    if (readyLoading || !showForm || selectedJob) return;
    clearPreparedJob();
  }, [readyLoading, selectedJob?.id, showForm]);

  const prepareJob = (job: InventoryWorkQueueJob) => {
    setForm((current) => ({
      ...current,
      quotation_id: job.id,
      customer_id: job.customer_id || "",
      site_address: current.site_address,
    }));
    setShowForm(true);
    window.history.replaceState(null, "", `/inventory/dispatches?orderId=${job.order_id || ""}&quotationId=${job.id}`);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.customer_id) return showToast("Select an approved job first.", "error");
    if (!form.installer_id) return showToast("Select installer before confirming dispatch.", "error");
    const stockStatus = String(selectedJob?.stock_status || selectedJob?.order_status || "").toUpperCase();
    if (stockStatus !== "STOCK_OK") return showToast("This order is not stock-ready. Create PO or receive stock first.", "error");
    if (!selectedReadyItems.length) return showToast("No available stock is ready for this job. Create PO or receive stock first.", "error");
    await inventoryApi.createDispatch({
      quotation_id: form.quotation_id || null,
      customer_id: form.customer_id,
      installer_id: form.installer_id,
      site_address: form.site_address,
      notes: form.notes,
      items: selectedReadyItems,
    });
    showToast("Dispatch confirmed. Next: Installer completes the job.", "success");
    setShowForm(false);
    await loadReadyQueue();
    reload();
  };

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header eyebrow="Inventory Step 3" title="Give Stock To Installer" text="Create dispatch from a stock-ready order." />
      <div style={{ ...card, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <div style={{ color: "#2563eb", fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".05em" }}>Ready Queue</div>
            <h3 style={{ margin: "4px 0 0", color: "#0f172a" }}>STOCK_OK Tokenized Jobs Waiting For Dispatch</h3>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={loadReadyQueue} tone="light"><RefreshCw size={15} /> Refresh</Button>
            <Button to="/inventory/queue" tone="light"><ClipboardCheck size={15} /> Incoming Orders</Button>
          </div>
        </div>
        <DataTable
          columns={["Order / Token", "Client", "Stock Readiness", "Amount", "Action"]}
          rows={readyJobs.map((job) => {
            const details = stockCheckDetails(job);
            const readyLines = details.filter((item) => item.ok).length;
            return [
              <div>
                <strong>{job.order_number || "Order pending"}</strong>
                <div style={{ marginTop: 5, color: "#047857", fontWeight: 900 }}>{tokenForQuote(job)}</div>
                <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>{job.quotation_number || job.order_number || "CRM order linked"}</div>
              </div>,
              job.customer_name || "-",
              <div style={{ display: "grid", gap: 6 }}>
                {statusChip("STOCK_OK")}
                <span style={{ color: "#047857", fontSize: 12, fontWeight: 850 }}>{readyLines} item line(s) available</span>
              </div>,
              money(job.total_amount),
              <Button onClick={() => prepareJob(job)} tone="success" prominent><Wrench size={14} /> Select Job</Button>,
            ];
          })}
          empty={readyLoading ? "Loading STOCK_OK dispatch queue..." : "No job is ready to select. Generate a token in Incoming Orders, then receive any missing stock in Purchase Orders."}
        />
        {!readyLoading && readyJobs.length === 0 && (
          <div style={{ marginTop: 12, border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong style={{ color: "#1e3a8a" }}>There is currently no dispatch-ready job.</strong>
              <div style={{ marginTop: 4, color: "#475569", fontSize: 13 }}>Open Incoming Orders to generate a token. If it shows AWAITING STOCK, receive its PO first; the job will then appear here with a Select Job button.</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button to="/inventory/queue" tone="primary"><ClipboardCheck size={15} /> Incoming Orders</Button>
              <Button to="/inventory/purchasing" tone="light"><ShoppingCart size={15} /> Purchase Orders</Button>
            </div>
          </div>
        )}
      </div>
      {showForm && (
        <form onSubmit={submit} style={{ ...card, padding: 18, marginBottom: 14, display: "grid", gap: 12 }}>
          {selectedJob && (
            <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 12 }}>
              <div style={{ color: "#1d4ed8", fontWeight: 950, fontSize: 12, textTransform: "uppercase" }}>Selected Job</div>
              <div style={{ marginTop: 4, color: "#0f172a", fontWeight: 900 }}>{selectedJob.customer_name} - {tokenForQuote(selectedJob) || selectedJob.order_number}</div>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {(selectedJob.items || []).map((item) => (
                  <div key={item.id || item.product_id || item.product_name} style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "#334155", fontSize: 13 }}>
                    <span>{item.product_name}</span>
                    <span>Req {item.required_qty} / Available {item.available_stock}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
            <input readOnly value={selectedJob ? `${selectedJob.order_number || "Order"} / ${tokenForQuote(selectedJob)}` : "Select a STOCK_OK order from Ready Queue"} style={{ ...input, background: "#f8fafc" }} />
            <select required disabled={!selectedJob} value={form.installer_id} onChange={(e) => setForm({ ...form, installer_id: e.target.value })} style={input}>
              <option value="">Select installer / field user</option>
              {installers.map((installer) => (
                <option key={installer.id} value={installer.id}>
                  {installer.display_name || installer.email} {installer.email ? `(${installer.email})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <input disabled={!selectedJob} value={form.site_address} onChange={(e) => setForm({ ...form, site_address: e.target.value })} style={input} placeholder="Site / branch address" />
          </div>
          <DataTable
            columns={["Item", "Required Qty", "Available", "Unit Price"]}
            rows={(selectedJob?.items || []).map((item) => [
              <strong>{item.product_name}</strong>,
              item.required_qty,
              item.available_stock,
              money(item.unit_price),
            ])}
            empty="No dispatch items loaded."
          />
          <input disabled={!selectedJob} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={input} placeholder="Dispatch notes" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button tone="light" onClick={clearPreparedJob}>Cancel</Button>
            <button type="submit" className="btn btn-primary" disabled={!selectedJob || !form.installer_id || selectedReadyItems.length === 0}>Confirm Dispatch</button>
          </div>
        </form>
      )}
      <h3 style={{ margin: "8px 0 10px", color: "#0f172a" }}>Active Installer Dispatches</h3>
      <DataTable
        columns={["Dispatch No", "Client", "Token No", "Installer Name", "Items Count", "Status", "Dispatched Date", "Actions"]}
        rows={dispatches
          .filter((dispatch) => !["CANCELLED", "COMPLETED", "RETURN_PENDING", "RETURN_CONFIRMED", "RECONCILED", "BILL_SENT"].includes(String(dispatch.status || "").toUpperCase()))
          .map((dispatch) => [
          <strong>{dispatch.dispatch_number}</strong>,
          dispatch.customer_name || "-",
          <div><strong>{dispatch.token_number || "-"}</strong><br /><span style={{ color: "#64748b", fontSize: 12 }}>{dispatch.order_number || dispatch.quotation_number || "-"}</span></div>,
          dispatch.installer_name || dispatch.installer_email || "Installer missing",
          dispatch.item_count ?? dispatch.items?.length ?? "-",
          statusChip(dispatchStatusLabel(dispatch.status)),
          dispatch.dispatched_at ? new Date(dispatch.dispatched_at).toLocaleDateString("en-GB") : "-",
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button to={`/inventory/serials?dispatchId=${dispatch.id}`} tone="light"><Barcode size={14} /> View QR Codes</Button>
            <Button to={`/inventory/returns?dispatchId=${dispatch.id}`} tone="dark"><Wrench size={14} /> Complete Job</Button>
          </div>,
        ])}
        empty="No active installer dispatches yet. Prepare a dispatch from the ready queue above."
      />
    </div>
  );
}

export function InstallerReturnsPage() {
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const params = new URLSearchParams(window.location.search);
  const selectedId = params.get("returnId") || params.get("dispatchId") || "";
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [items, setItems] = useState<ReturnRequestItem[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [completingJob, setCompletingJob] = useState(false);
  const [sendingBill, setSendingBill] = useState(false);

  const loadReturns = async () => {
    setLoading(true);
    try {
      setReturns(await inventoryApi.getReturnRequests());
    } catch {
      showToast("Unable to load installer return requests.", "error");
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReturnDetail = async (id: string) => {
    try {
      const detail = await inventoryApi.getReturnRequest(id);
      setSelectedReturn(detail);
      setItems((detail.items || []).map((item) => ({
        ...item,
        condition: item.condition || "GOOD",
        confirm: Boolean(item.confirm ?? item.confirmed),
        quantity_returned: Number(item.quantity_returned || 0),
      })));
    } catch {
      showToast("Unable to load return request detail.", "error");
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  useEffect(() => {
    if (selectedId) loadReturnDetail(selectedId);
  }, [selectedId]);

  const updateItem = (index: number, patch: Partial<ReturnRequestItem>) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const completeFieldJob = async () => {
    if (!selectedId || !selectedReturn) return;
    const unmarked = items.some((item) => {
      const issued = Number(item.quantity_issued || 0);
      return Number(item.quantity_used || 0) + Number(item.quantity_returned || 0) !== issued;
    });
    if (unmarked) {
      showToast("Mark every item as Given / Installed or Not Used before completing the job.", "error");
      return;
    }
    setCompletingJob(true);
    try {
      const updated: any = await inventoryApi.reconcileDispatch(selectedId, {
        items: items.map((item) => ({
          id: item.id,
          quantity_used: Number(item.quantity_used || 0),
          quantity_returned: Number(item.quantity_returned || 0),
          notes: item.notes || "Inventory recorded field job result.",
        })),
        notes: "Field job completed and submitted for return review.",
      });
      if (updated?.invoice || updated?.status === "STOCK_UPDATED" || updated?.dispatch_status === "BILL_SENT") {
        showToast("Job completed. Next: Finance > Billing Approvals.", "success");
        navigate("/inventory/dispatches");
        return;
      }
      showToast("Job completed. Next: Inventory > Installer Returns.", "success");
      await loadReturnDetail(selectedId);
      await loadReturns();
    } catch {
      showToast("Job completion could not be saved. Check every item and try again.", "error");
    } finally {
      setCompletingJob(false);
    }
  };

  const bill = useMemo(() => {
    const original = items.reduce((sum, item) => sum + Number(item.quantity_issued || 0) * Number(item.unit_price || 0), 0);
    const returned = items.reduce((sum, item) => {
      const condition = String(item.condition || "GOOD").toUpperCase();
      if (!item.confirm || condition === "CONSUMABLE_USED") return sum;
      return sum + Number(item.quantity_returned || 0) * Number(item.unit_price || 0);
    }, 0);
    const extra = (selectedReturn?.on_the_go_purchases || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const saved = selectedReturn?.bill_adjustment;
    if (saved && String(selectedReturn?.status || "").toUpperCase() !== "PENDING") {
      return {
        original: Number(saved.original_installed_amount || 0),
        returned: Number(saved.returned_deduction_amount || 0),
        extra: Number(saved.extra_added_amount || 0),
        final: Number(saved.final_adjusted_total || 0),
      };
    }
    return {
      original,
      returned,
      extra,
      final: Math.max(0, original - returned + extra),
    };
  }, [items, selectedReturn]);

  const filteredReturns = returns.filter((request) => {
    const haystack = [
      request.return_request_no,
      request.token_number,
      request.order_number,
      request.customer_name,
      request.installer_name,
      request.status,
    ].join(" ").toLowerCase();
    return haystack.includes(q.toLowerCase());
  });

  const confirmReturns = async () => {
    if (!selectedId) return;
    const hasPhysicalReturns = items.some((item) => Number(item.quantity_returned || 0) > 0);
    if (hasPhysicalReturns && !items.some((item) => item.confirm)) {
      showToast("Select at least one item to confirm.", "error");
      return;
    }
    setConfirming(true);
    try {
      const updated = await inventoryApi.confirmReturnRequest(selectedId, {
        items: items.map((item) => ({
          id: item.id,
          quantity_returned: Number(item.quantity_returned || 0),
          condition: item.condition || "GOOD",
          confirmed: Boolean(item.confirm),
          notes: item.notes || "",
        })),
        notes: "Inventory reviewed and confirmed installer returns.",
      });
      showToast("Returns confirmed. Stock and bill adjustment updated.", "success");
      setSelectedReturn(updated);
      await loadReturns();
      await loadReturnDetail(selectedId);
    } catch {
      showToast("Return confirmation failed. Please check backend/API connection.", "error");
    } finally {
      setConfirming(false);
    }
  };

  const sendBill = async () => {
    if (!selectedId) return;
    setSendingBill(true);
    try {
      const updated = await inventoryApi.sendAdjustedBillToFinance(selectedId);
      showToast(
        updated.no_charge
          ? "No-charge job closed. All chargeable items were returned, so no Finance invoice was generated."
          : "Adjusted bill sent to Finance. Order status is BILL_SENT.",
        "success",
      );
      setSelectedReturn(updated);
      await loadReturns();
      await loadReturnDetail(selectedId);
    } catch {
      showToast("Adjusted bill could not be sent to Finance.", "error");
    } finally {
      setSendingBill(false);
    }
  };

  if (selectedId) {
    const status = selectedReturn?.status || "PENDING";
    const dispatchStatus = String(selectedReturn?.dispatch_status || "").toUpperCase();
    const fieldJobPending = ["DISPATCHED", "PENDING", "IN_PROGRESS"].includes(dispatchStatus);
    const allJobItemsMarked = items.length > 0 && items.every((item) => (
      Number(item.quantity_used || 0) + Number(item.quantity_returned || 0)
      === Number(item.quantity_issued || 0)
    ));
    return (
      <div className="flow-page-shell" style={pageShell}>
        <Header
          eyebrow={fieldJobPending ? "Inventory Step 4" : "Installer Returns Detail"}
          title={selectedReturn ? `${fieldJobPending ? "Complete Job" : selectedReturn.return_request_no} - ${selectedReturn.customer_name || "Client"}` : "Job Review"}
          text={fieldJobPending ? "Mark each dispatched item." : "Confirm returns and send billing."}
          actions={<Button onClick={() => navigate("/inventory/returns")} tone="light"><ArrowRight size={15} /> Back to Returns List</Button>}
        />

        {selectedReturn && fieldJobPending && (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ ...card, padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
              {[
                ["Dispatch", selectedReturn.dispatch_number || "-"],
                ["Token / Order", `${selectedReturn.token_number || "-"} / ${selectedReturn.order_number || "-"}`],
                ["Client", selectedReturn.customer_name || "-"],
                ["Installer", selectedReturn.installer_name || selectedReturn.installer_email || "-"],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ marginTop: 6, color: "#0f172a", fontWeight: 850 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card, padding: 18 }}>
              <h3 style={{ margin: "0 0 5px" }}>Job Items</h3>
              <p style={{ margin: "0 0 14px", color: "#64748b" }}>Choose the actual site result for every item. Nothing is sent to Finance until the job and return review are complete.</p>
              <DataTable
                columns={["Item", "Serial / IMEI", "Issued", "Site Result"]}
                rows={items.map((item, index) => {
                  const issued = Number(item.quantity_issued || 0);
                  const result = Number(item.quantity_returned || 0) > 0 ? "NOT_USED" : Number(item.quantity_used || 0) > 0 ? "GIVEN" : "";
                  return [
                    <strong>{item.product_name || "Dispatch item"}</strong>,
                    item.serial_number || item.imei || "Quantity item",
                    issued,
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Button
                        tone={result === "GIVEN" ? "success" : "light"}
                        onClick={() => updateItem(index, { quantity_used: issued, quantity_returned: 0 })}
                      >
                        <CheckCircle2 size={15} /> Installed / Given
                      </Button>
                      <Button
                        tone={result === "NOT_USED" ? "warning" : "light"}
                        onClick={() => updateItem(index, { quantity_used: 0, quantity_returned: issued })}
                      >
                        <Undo2 size={15} /> Not Used / Return
                      </Button>
                    </div>,
                  ];
                })}
                empty="No dispatched items were found for this job."
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button onClick={completeFieldJob} disabled={completingJob || !allJobItemsMarked} tone="success" prominent>
                <CheckCircle2 size={16} /> {completingJob ? "Completing..." : "Complete Job & Submit Returns"}
              </Button>
            </div>
          </div>
        )}

        {selectedReturn && !fieldJobPending && (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ ...card, padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
              {[
                ["Token / Order", `${selectedReturn.token_number || "-"} / ${selectedReturn.order_number || "-"}`],
                ["Client", selectedReturn.customer_name || "-"],
                ["Installer", selectedReturn.installer_name || selectedReturn.installer_email || "-"],
                ["Status", statusChip(status)],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ marginTop: 6, color: "#0f172a", fontWeight: 850 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card, padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>Items to Return</h3>
              <DataTable
                columns={["Item Name", "Qty Returned", "Condition", "Confirm"]}
                rows={items.map((item, index) => [
                  <div>
                    <strong>{item.product_name || item.serial_number || item.imei || "Dispatch item"}</strong>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Issued: {item.quantity_issued || 0} {item.unit_of_measure || "units"} | Unit: {money(item.unit_price)}</div>
                  </div>,
                  <input
                    type="number"
                    min="0"
                    max={Number(item.quantity_issued || 0)}
                    value={item.quantity_returned || 0}
                    onChange={(e) => updateItem(index, { quantity_returned: Number(e.target.value) || 0 })}
                    disabled={status !== "PENDING"}
                    style={{ ...input, maxWidth: 120 }}
                  />,
                  <select
                    value={item.condition || "GOOD"}
                    onChange={(e) => updateItem(index, { condition: e.target.value as ReturnRequestItem["condition"] })}
                    disabled={status !== "PENDING"}
                    style={input}
                  >
                    <option value="GOOD">Good</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="CONSUMABLE_USED">Consumable Used</option>
                  </select>,
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 850 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(item.confirm)}
                      onChange={(e) => updateItem(index, { confirm: e.target.checked })}
                      disabled={status !== "PENDING"}
                    />
                    Confirm
                  </label>,
                ])}
                empty="No returned items are attached to this request."
              />
            </div>

            <div style={{ ...card, padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>Bill Adjustment</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
                {[
                  ["Original items installed / given", money(bill.original), "#eff6ff", "#1d4ed8"],
                  ["Items being returned / deducted", `- ${money(bill.returned)}`, "#fff1f2", "#b91c1c"],
                  ["Extra items added", `+ ${money(bill.extra)}`, "#f0fdf4", "#047857"],
                  ["Final adjusted total", money(bill.final), "#f8fafc", "#0f172a"],
                ].map(([label, value, bg, color]) => (
                  <div key={String(label)} style={{ border: "1px solid #dbe4f0", borderRadius: 12, padding: 14, background: String(bg) }}>
                    <div style={{ color: "#64748b", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
                    <div style={{ marginTop: 8, color: String(color), fontWeight: 950, fontSize: 22 }}>{value}</div>
                  </div>
                ))}
              </div>
              {bill.final <= 0 && (
                <div style={{ marginTop: 12, border: "1px solid #bfdbfe", borderRadius: 10, padding: 12, color: "#1e3a8a", background: "#eff6ff", fontWeight: 800 }}>
                  No charge: all chargeable items were returned. Closing this request will not generate a Finance invoice.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              {status === "PENDING" && (
                <Button onClick={confirmReturns} disabled={confirming} tone="primary">
                  <CheckCircle2 size={16} /> {confirming ? "Confirming..." : "Confirm Returns"}
                </Button>
              )}
              {status === "CONFIRMED" && (
                <Button onClick={sendBill} disabled={sendingBill} tone="success" prominent>
                  <ReceiptText size={16} /> {sendingBill ? "Processing..." : bill.final <= 0 ? "Close as No Charge" : "Send Adjusted Bill to Finance"}
                </Button>
              )}
              {status === "STOCK_UPDATED" && statusChip("BILL_SENT")}
              {status === "NO_CHARGE" && statusChip("NO_CHARGE")}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header
        eyebrow="Installer Returns"
        title="Pending Return Requests"
        text="Confirm returns and send billing to Finance."
        actions={<Button onClick={loadReturns} tone="light"><RefreshCw size={15} /> Refresh</Button>}
      />
      <div style={{ ...card, padding: 14, marginBottom: 14 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search return no, token, order, client or installer" />
      </div>
      <DataTable
        columns={["Return Request No", "Token / Order", "Client Name", "Installer Name", "Items to Return", "Status", "Submitted Date", "Action"]}
        rows={filteredReturns.map((request) => [
          <strong>{request.return_request_no}</strong>,
          <div>
            <strong>{request.token_number || "-"}</strong>
            <div style={{ color: "#64748b", fontSize: 12 }}>{request.order_number || "-"}</div>
          </div>,
          request.customer_name || "-",
          request.installer_name || request.installer_email || "-",
          `${request.items_to_return_count || 0} items`,
          statusChip(request.status),
          request.submitted_date ? new Date(request.submitted_date).toLocaleDateString("en-GB") : "-",
          <Button to={`/inventory/returns?returnId=${request.id}`} tone={request.status === "PENDING" ? "primary" : "light"}>
            <Undo2 size={14} /> Review & Confirm
          </Button>,
        ])}
        empty={loading ? "Loading return requests..." : "No installer return requests found."}
      />
    </div>
  );
}

const defaultCompanySettings: InventoryCompanySettings = {
  company_name: "Electronic Safety & Security Private Limited",
  ntn_number: "3628486-6",
  gst_number: "1700362848614",
  address: "",
  phone: "",
  bank_account_number: "24438000016603",
};

const defaultInventorySettings: InventoryPreferenceSettings = {
  default_min_stock_threshold: 5,
  low_stock_alert_email: "",
};

function SettingsSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ ...card, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 18 }}>{title}</h2>
          {description && <p style={{ margin: "5px 0 0", color: "#64748b", lineHeight: 1.45 }}>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function InventoryMasterSetupPage() {
  const { showToast } = useToastContext();
  const auth = useAuth();
  const canManageInstallerAccounts = auth.activeRole === "super_admin";
  const [company, setCompany] = useState<InventoryCompanySettings>(defaultCompanySettings);
  const [inventory, setInventory] = useState<InventoryPreferenceSettings>(defaultInventorySettings);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [installers, setInstallers] = useState<InventoryInstallerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryForm, setCategoryForm] = useState({ id: "", category_name: "" });
  const [vendorForm, setVendorForm] = useState({ id: "", name: "", contact_person: "", email: "", phone: "" });

  const loadSetup = async () => {
    setLoading(true);
    try {
      const [settings, categoryRows, vendorRows, installerRows] = await Promise.all([
        inventoryApi.getMasterSettings().catch(() => ({ company: defaultCompanySettings, inventory: defaultInventorySettings })),
        inventoryApi.getCategories().catch(() => []),
        inventoryApi.getVendors().catch(() => []),
        inventoryApi.getInstallers({ includeInactive: true }).catch(() => []),
      ]);
      setCompany(settings.company || defaultCompanySettings);
      setInventory(settings.inventory || defaultInventorySettings);
      setCategories(categoryRows);
      setVendors(vendorRows);
      setInstallers(installerRows);
    } catch {
      showToast("Master setup data could not be loaded. Please check backend connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSetup();
  }, []);

  const saveCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const saved = await inventoryApi.updateCompanySettings(company);
      setCompany(saved);
      showToast("Company settings saved.", "success");
    } catch {
      showToast("Company settings could not be saved.", "error");
    }
  };

  const saveInventory = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const saved = await inventoryApi.updateInventorySettings(inventory);
      setInventory(saved);
      showToast("Inventory settings saved.", "success");
    } catch {
      showToast("Inventory settings could not be saved.", "error");
    }
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryForm.category_name.trim()) return showToast("Category name is required.", "error");
    try {
      if (categoryForm.id) {
        await inventoryApi.updateCategory(categoryForm.id, { category_name: categoryForm.category_name.trim() });
        showToast("Category updated.", "success");
      } else {
        await inventoryApi.createCategory({ category_name: categoryForm.category_name.trim() });
        showToast("Category added.", "success");
      }
      setCategoryForm({ id: "", category_name: "" });
      loadSetup();
    } catch {
      showToast("Category could not be saved.", "error");
    }
  };

  const deleteCategory = async (category: ItemCategory) => {
    if (!window.confirm(`Delete category "${category.category_name}"?`)) return;
    try {
      await inventoryApi.deleteCategory(category.id);
      showToast("Category deleted.", "success");
      loadSetup();
    } catch {
      showToast("Category could not be deleted. It may still have products.", "error");
    }
  };

  const saveVendor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!vendorForm.name.trim()) return showToast("Supplier name is required.", "error");
    try {
      if (vendorForm.id) {
        await inventoryApi.updateVendor(vendorForm.id, vendorForm);
        showToast("Supplier updated.", "success");
      } else {
        await inventoryApi.createVendor(vendorForm);
        showToast("Supplier added.", "success");
      }
      setVendorForm({ id: "", name: "", contact_person: "", email: "", phone: "" });
      loadSetup();
    } catch {
      showToast("Supplier could not be saved.", "error");
    }
  };

  const deleteVendor = async (vendor: Vendor) => {
    if (!window.confirm(`Delete supplier "${vendor.name}"?`)) return;
    try {
      await inventoryApi.deleteVendor(vendor.id);
      showToast("Supplier deleted.", "success");
      loadSetup();
    } catch {
      showToast("Supplier could not be deleted. It may be linked with a PO.", "error");
    }
  };

  const toggleInstaller = async (installer: InventoryInstallerUser) => {
    try {
      await inventoryApi.updateInstallerStatus(installer.id, installer.is_active === false);
      showToast("Installer status updated.", "success");
      loadSetup();
    } catch {
      showToast("Installer status could not be updated.", "error");
    }
  };

  const field = (label: string, children: React.ReactNode) => (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>{label}</span>
      {children}
    </label>
  );

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header
        eyebrow="Inventory Settings"
        title="Master Setup"
        text="Simple configuration only: company profile, inventory defaults, categories, suppliers and installers."
        actions={<Button onClick={loadSetup} tone="light"><RefreshCw size={15} /> Refresh</Button>}
      />

      <div style={{ display: "grid", gap: 16 }}>
        <SettingsSection title="Company Settings" description="These values are used as official defaults for receipts and invoice documents.">
          <form onSubmit={saveCompany} style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              {field("Company Name", <input required style={input} value={company.company_name} onChange={(e) => setCompany({ ...company, company_name: e.target.value })} />)}
              {field("NTN Number", <input style={input} value={company.ntn_number} onChange={(e) => setCompany({ ...company, ntn_number: e.target.value })} />)}
              {field("GST Number", <input style={input} value={company.gst_number} onChange={(e) => setCompany({ ...company, gst_number: e.target.value })} />)}
              {field("Phone", <input style={input} value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />)}
              {field("Bank Account Number", <input style={input} value={company.bank_account_number} onChange={(e) => setCompany({ ...company, bank_account_number: e.target.value })} />)}
              {field("Address", <input style={input} value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} />)}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary">Save Company Settings</button>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection title="Inventory Settings" description="Low-stock defaults and notification routing for warehouse monitoring.">
          <form onSubmit={saveInventory} style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
              {field("Default Minimum Stock Threshold", <input type="number" min="0" style={input} value={inventory.default_min_stock_threshold} onChange={(e) => setInventory({ ...inventory, default_min_stock_threshold: Number(e.target.value) || 0 })} />)}
              {field("Low Stock Alert Email", <input type="email" style={input} value={inventory.low_stock_alert_email} onChange={(e) => setInventory({ ...inventory, low_stock_alert_email: e.target.value })} placeholder="warehouse@esspl.com.pk" />)}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary">Save Inventory Settings</button>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection
          title="Categories Management"
          description="Keep product categories clean. Product counts come from the catalog."
          action={<Button onClick={() => setCategoryForm({ id: "", category_name: "" })} tone="success"><Plus size={15} /> Add New Category</Button>}
        >
          <form onSubmit={saveCategory} style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <input style={{ ...input, flex: "1 1 280px" }} value={categoryForm.category_name} onChange={(e) => setCategoryForm({ ...categoryForm, category_name: e.target.value })} placeholder="Category name" />
            <button type="submit" className="btn btn-primary">{categoryForm.id ? "Update Category" : "Save Category"}</button>
            {categoryForm.id && <Button onClick={() => setCategoryForm({ id: "", category_name: "" })} tone="light">Cancel</Button>}
          </form>
          <DataTable
            columns={["Category Name", "Products Count", "Edit", "Delete"]}
            rows={categories.map((category) => [
              <strong>{category.category_name}</strong>,
              category.product_count ?? 0,
              <Button onClick={() => setCategoryForm({ id: category.id, category_name: category.category_name })} tone="light">Edit</Button>,
              <Button onClick={() => deleteCategory(category)} tone="light"><XCircle size={14} /> Delete</Button>,
            ])}
            empty={loading ? "Loading categories..." : "No categories found."}
          />
        </SettingsSection>

        <SettingsSection
          title="Suppliers List"
          description="Suppliers are used by purchase orders and stock receipts."
          action={<Button onClick={() => setVendorForm({ id: "", name: "", contact_person: "", email: "", phone: "" })} tone="success"><Plus size={15} /> Add New Supplier</Button>}
        >
          <form onSubmit={saveVendor} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr)) auto auto", gap: 10, marginBottom: 12, alignItems: "end" }}>
            {field("Supplier Name", <input required style={input} value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} />)}
            {field("Contact", <input style={input} value={vendorForm.contact_person} onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })} />)}
            {field("Email", <input type="email" style={input} value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />)}
            {field("Phone", <input style={input} value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />)}
            <button type="submit" className="btn btn-primary">{vendorForm.id ? "Update Supplier" : "Save Supplier"}</button>
            {vendorForm.id && <Button onClick={() => setVendorForm({ id: "", name: "", contact_person: "", email: "", phone: "" })} tone="light">Cancel</Button>}
          </form>
          <DataTable
            columns={["Supplier Name", "Contact", "Email", "Phone", "Edit", "Delete"]}
            rows={vendors.map((vendor) => [
              <strong>{vendor.name}</strong>,
              vendor.contact_person || "-",
              vendor.email || "-",
              vendor.phone || "-",
              <Button onClick={() => setVendorForm({ id: vendor.id, name: vendor.name || "", contact_person: vendor.contact_person || "", email: vendor.email || "", phone: vendor.phone || "" })} tone="light">Edit</Button>,
              <Button onClick={() => deleteVendor(vendor)} tone="light"><XCircle size={14} /> Delete</Button>,
            ])}
            empty={loading ? "Loading suppliers..." : "No suppliers found."}
          />
        </SettingsSection>

        <SettingsSection
          title="Installers List"
          description="Installer accounts appear here from system users. Dispatch pages use active installers only."
          action={
            canManageInstallerAccounts ? (
              <Button to="/accounts" tone="success"><Plus size={15} /> Add New Installer</Button>
            ) : (
              <Button onClick={() => showToast("Installer accounts are created from User Accounts by Super Admin.", "error")} tone="success">
                <Plus size={15} /> Add New Installer
              </Button>
            )
          }
        >
          <DataTable
            columns={["Installer Name", "Email", "Phone", "Active / Inactive", "Edit"]}
            rows={installers.map((installer) => [
              <strong>{installer.display_name || installer.email}</strong>,
              installer.email || "-",
              installer.phone || "-",
              statusChip(installer.is_active === false ? "INACTIVE" : "ACTIVE"),
              <Button onClick={() => toggleInstaller(installer)} tone="light">
                {installer.is_active === false ? "Activate" : "Deactivate"}
              </Button>,
            ])}
            empty={loading ? "Loading installers..." : "No installer accounts found."}
          />
        </SettingsSection>
      </div>
    </div>
  );
}

export function InventoryMovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    inventoryApi.getMovements({ limit: 500 }).then(setMovements).catch(() => setMovements([]));
  }, []);
  const filtered = movements.filter((movement) => [movement.product_name, movement.serial_number, movement.movement_type, movement.reference_type, movement.notes].join(" ").toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header eyebrow="Inventory Ledger" title="Stock Movement Ledger" text="Stock movement audit trail." />
      <div style={{ ...card, padding: 14, marginBottom: 14 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search product, serial, reference or notes" />
      </div>
      <DataTable
        columns={["Date", "Product", "Movement", "Quantity", "Reference", "Notes"]}
        rows={filtered.map((movement) => [
          movement.created_at ? new Date(movement.created_at).toLocaleString() : "-",
          movement.product_name || movement.serial_number || "-",
          statusChip(movement.movement_type),
          movement.quantity,
          movement.reference_type || "-",
          movement.notes || "-",
        ])}
        empty="No stock movements yet."
      />
    </div>
  );
}
