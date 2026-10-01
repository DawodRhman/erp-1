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
  FieldMaterialRequest,
  InventoryItem,
  InventoryLocation,
  InventoryAdjustment,
  InventoryCompanySettings,
  InventoryInstallerUser,
  InventoryPreferenceSettings,
  InventorySummary,
  InventoryToken,
  InventoryWorkQueueJob,
  ItemCategory,
  Product,
  ProductCustomFieldDefinition,
  PurchaseOrder,
  PurchaseOrderItem,
  ReturnRequest,
  ReturnRequestItem,
  Vendor,
  inventoryApi,
} from "../services/inventoryService";
import { printHtmlDocument } from "../utils/printElement";
import { useInventoryLiveEvents } from "../hooks/useInventoryLiveEvents";
import { QRCodeSVG } from "qrcode.react";

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

const formLabel: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#475569",
  fontSize: 12,
  fontWeight: 850,
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
          <h1 style="margin: 6px 0 0; font-size: 26px; line-height: 1.1;">Stock Check Record</h1>
          <p style="margin: 8px 0 0; color: #475569; font-size: 13px;">One token links the approved order to stock allocation, field fulfilment, reconciliation and billing.</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 12px; color: #64748b; font-weight: 700;">Stock Check Reference</div>
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
          Stock checks, material issue, field reconciliation and Finance billing must continue against this same token number.
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
    AWAITING_TOKEN: "Released order is ready. Run its stock check to begin fulfilment.",
    TOKEN_GENERATED: "Stock check is ready. Reserve available stock or create a purchase order for shortages.",
    STOCK_OK: "All items are available. Dispatch can be created.",
    AWAITING_STOCK: "Some items are short. Purchase order is required.",
    PARTIALLY_DISPATCHED: "Some stock has already been dispatched.",
    FULLY_DISPATCHED: "All required material has been issued to the field team.",
    COMPLETED: "Field service and material reconciliation are complete.",
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
    ACTIVE: "Stock check completed. Material has not been issued yet.",
    PARTIALLY_DISPATCHED: "Some required material has been issued to the field team.",
    FULLY_DISPATCHED: "All required material has been issued to the field team.",
    COMPLETED: "Field service is complete and the verified billing record has moved forward.",
  };
  return copy[value] || "Stock check is active.";
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
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  to?: string;
  tone?: "primary" | "dark" | "light" | "success" | "warning";
  disabled?: boolean;
  prominent?: boolean;
  type?: "button" | "submit" | "reset";
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
  return <button className="flow-button" type={type} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
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

function TablePager({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        marginTop: 12,
        color: "#64748b",
        fontSize: 13,
        fontWeight: 750,
      }}
    >
      <span>Showing {first}-{last} of {total} records</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)} tone="light">Previous</Button>
        <span>Page {Math.min(page, totalPages)} of {totalPages}</span>
        <Button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} tone="light">Next</Button>
      </div>
    </div>
  );
}

function FlowSteps() {
  const steps = [
    ["1", "CRM records the client requirement and prepares a quotation"],
    ["2", "Senior Management reviews and approves the quotation"],
    ["3", "The client reviews and accepts the approved offer"],
    ["4", "Inventory allocates stock or completes procurement"],
    ["5", "The field team completes delivery or deployment with client sign-off"],
    ["6", "Inventory reconciles issued, used and returned material"],
    ["7", "Finance verifies billing and issues the invoice"],
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

function useInventoryFlowData(options: { includeCosts?: boolean } = {}) {
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
        inventoryApi.getProducts({ limit: 500, ...(options.includeCosts ? { view: "purchasing" } : {}) }).catch(() => []),
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
  useInventoryLiveEvents(load);

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
        eyebrow="Client & Commercial Workspace"
        title="Client Requirement, Quotation and Approval"
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
      <Header eyebrow="Client & Commercial" title="Sales Leads Pipeline" text="Manage client inquiries." actions={<Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Lead</Button>} />
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
      <Header eyebrow="Client & Commercial" title="Client Directory" text="Manage client records." actions={<Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Client</Button>} />
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
      <Header eyebrow="Client & Commercial" title="Quotations Gallery" text="Create, send and track quotations." actions={<Button to="/crm/quotations/new" tone="success"><Plus size={16} /> New Quotation</Button>} />
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
        columns={["Quotation", "Client", "Client Approval", "Stock Check", "Amount", "Status", "Actions"]}
        rows={filtered.map((quote) => [
          <div style={quote.id === highlightedId ? { padding: 8, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe" } : undefined}>
            <strong>{quote.quotation_number || "Draft quotation"}</strong>
            {quote.id === highlightedId && <div style={{ color: "#2563eb", fontSize: 11, fontWeight: 850 }}>Just saved</div>}
          </div>,
          quote.customer_name || "-",
          quote.status === "DRAFT"
            ? <span style={{ color: "#94a3b8" }}>Click Send to generate/share client link</span>
            : <Button onClick={() => copyClientLink(quote)} tone="light"><FileText size={14} /> Copy Approval Link</Button>,
          quote.status === "APPROVED" ? <span style={{ color: "#64748b" }}>Inventory will run the stock check</span> : <span style={{ color: "#94a3b8" }}>After client approval</span>,
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
      <Header eyebrow="Client & Commercial" title="Create Client Quotation" text="Add catalog or custom items." />
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
            Review the quotation items below. After Management approval and client acceptance, the order moves to Inventory for fulfilment.
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
            {quotation.status === "APPROVED" ? "Already Accepted" : approving ? "Saving..." : "I Accept This Offer"}
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
    ["Released Orders", summary?.pending_incoming_orders || workQueue.length, "/inventory/queue", "Approved sales orders waiting for Inventory action"],
    ["Stock Checks", summary?.active_tokens || tokens.length, "/inventory/tokens", "Availability and reservation records linked one-to-one with released orders"],
    ["Product Catalog", products.length, "/inventory/products", "Stock master used by CRM quotation pricing"],
    ["Serial & Batch Register", items.filter((item) => item.current_status === "AVAILABLE").length, "/inventory/serials", "Tracked units available for controlled material issue"],
    ["Procurement & Receipts", purchaseOrders.length, "/inventory/purchasing", "Procure shortages and record vendor receipts"],
    ["Field Service", summary?.active_dispatches || dispatches.length, "/inventory/field-service", "Issue material and track field fulfilment"],
    ["Reconciliation", summary?.pending_returns || 0, "/inventory/reconciliation", "Reconcile used, installed and returned material"],
  ];
  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header eyebrow="Inventory & Fulfilment" title="Inventory Workflow" text="Released orders, stock checks, procurement, material issue and closeout." actions={<Button to="/inventory/queue" tone="primary"><ClipboardCheck size={16} /> Review Released Orders</Button>} />
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
      showToast("Stock check could not be completed. Please retry or check the API connection.", "error");
    } finally {
      setGeneratingOrderId("");
    }
  };

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header
        eyebrow="Order Intake"
        title="Approved Order Intake"
        text="Review released demand, run the stock check and resolve any shortage."
        actions={<Button onClick={reload} tone="light"><RefreshCw size={15} /> Refresh</Button>}
      />
      <div style={{ ...card, padding: 14, marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search order, stock check, quotation or client" />
        <Button to="/inventory/tokens" tone="light"><ReceiptText size={15} /> Stock Checks</Button>
      </div>
      <DataTable
        columns={["Order / Stock Check", "Client", "Quotation", "Availability", "Amount", "Status", "Next Actions"]}
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
                {token || "Stock check not run"}
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
                  <ReceiptText size={14} /> {generatingOrderId === job.order_id ? "Checking..." : "Run Stock Check"}
                </Button>
              )}
              {token && gaps && <Button to={`/inventory/purchasing?orderId=${job.order_id}&quotationId=${job.id}`} tone="warning"><ShoppingCart size={14} /> Create PO</Button>}
              {canDispatch && <Button to={`/inventory/field-service?orderId=${job.order_id}&quotationId=${job.id}`} tone="success"><Wrench size={14} /> Prepare Field Service</Button>}
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
        eyebrow="Inventory Control"
        title="Stock Checks and Readiness"
        text="Maintain one traceable availability and reservation record for each released order."
        actions={<Button onClick={reload} tone="light"><RefreshCw size={15} /> Refresh</Button>}
      />
      <div style={{ ...card, padding: 14, marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search stock check, order, quotation or client" />
        <Button to="/inventory/queue" tone="primary"><ClipboardCheck size={15} /> Released Orders</Button>
      </div>
      <DataTable
        columns={["Stock Check", "Order", "Client", "Items", "Total Value", "Status", "Actions"]}
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
            <Button to={`/inventory/field-service?orderId=${token.id}`} tone="success"><Wrench size={14} /> View Field Service</Button>
            <Button onClick={() => printHtmlDocument(tokenReceiptHtml(token), token.token_number || "Stock Check")} tone="light"><ReceiptText size={14} /> Print Record</Button>
          </div>,
        ])}
        empty={loading ? "Loading stock checks..." : "No stock check exists yet. Open Released Orders and run the stock check."}
      />
    </div>
  );
}

export function InventoryProductsPage() {
  const { products, reload } = useInventoryFlowData();
  const { showToast } = useToastContext();
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [conditionFilter, setConditionFilter] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [customFields, setCustomFields] = useState<ProductCustomFieldDefinition[]>([]);
  const emptyProduct = {
    product_name: "",
    category_id: "",
    sub_category: "",
    brand_make: "",
    condition: "NEW",
    sku: "",
    model_no: "",
    product_type: "ASSET" as Product["product_type"],
    tracking_type: "SERIAL" as Product["tracking_type"],
    min_stock_level: 5,
    selling_price: 0,
    country_of_origin: "",
    batch_lot_number: "",
    expiry_date: "",
    warranty_date: "",
    product_image_url: "",
    warehouse_location: "Main Warehouse",
    room_number: "",
    rack_number: "",
    custom_attributes: {} as Record<string, any>,
    description: "",
  };
  const [draft, setDraft] = useState(emptyProduct);
  const locations = Array.from(new Set(products.map((product) => product.warehouse_location).filter(Boolean) as string[])).sort();
  const filtered = products.filter((product) => {
    const matchesSearch = [
      product.product_name,
      product.category_name,
      product.sub_category,
      product.brand_make,
      product.sku,
      product.model_no,
      product.product_type,
      product.condition,
      product.warehouse_location,
      product.room_number,
      product.rack_number,
    ].join(" ").toLowerCase().includes(q.toLowerCase());
    const quantity = Number(product.available_count ?? product.quantity ?? 0);
    const minimum = Number(product.min_stock_level || 0);
    const matchesStock = stockFilter === "ALL"
      || (stockFilter === "IN_STOCK" && quantity > minimum)
      || (stockFilter === "LOW_STOCK" && quantity > 0 && quantity <= minimum)
      || (stockFilter === "OUT_OF_STOCK" && quantity === 0);
    return matchesSearch
      && (categoryFilter === "ALL" || product.category_id === categoryFilter)
      && (typeFilter === "ALL" || product.product_type === typeFilter)
      && (conditionFilter === "ALL" || product.condition === conditionFilter)
      && (locationFilter === "ALL" || product.warehouse_location === locationFilter)
      && matchesStock;
  });

  useEffect(() => {
    Promise.all([
      inventoryApi.getCategories().catch(() => []),
      inventoryApi.getProductCustomFields().catch(() => []),
    ]).then(([categoryRows, fields]) => {
      setCategories(categoryRows);
      setCustomFields(fields.filter((field) => String(field.applies_to || "PRODUCT").toUpperCase() === "PRODUCT"));
    });
  }, []);

  const setCustomValue = (fieldKey: string, value: any) => {
    setDraft((current) => ({
      ...current,
      custom_attributes: {
        ...(current.custom_attributes || {}),
        [fieldKey]: value,
      },
    }));
  };

  const saveProduct = async () => {
    if (!draft.product_name.trim()) {
      showToast("Product name is required.", "error");
      return;
    }
    if (!draft.category_id) {
      showToast("Select a category.", "error");
      return;
    }
    if (Number(draft.selling_price) <= 0) {
      showToast("Enter a selling price greater than zero.", "error");
      return;
    }
    setSaving(true);
    try {
      await inventoryApi.createProduct({ ...draft, unit_price: Number(draft.selling_price), quantity: 0, cost_price: 0 });
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
      <Header eyebrow="Inventory Master" title="Product & Service Catalog" text="Maintain sellable products and services. Physical stock is added only through a verified stock receipt." actions={<Button onClick={() => setShowForm((open) => !open)} tone="light"><Plus size={15} /> {showForm ? "Close Form" : "Add Product / Service"}</Button>} />
      {showForm && (
        <div style={{ ...card, padding: 18, marginBottom: 14 }}>
          <h3 style={{ margin: "0 0 14px" }}>Add Product / Service</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Product Name *
              <input value={draft.product_name} onChange={(event) => setDraft({ ...draft, product_name: event.target.value })} style={{ ...input, marginTop: 6 }} />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Category *
              <select required value={draft.category_id} onChange={(event) => setDraft({ ...draft, category_id: event.target.value })} style={{ ...input, marginTop: 6 }}>
                <option value="">Select category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.category_name}</option>)}
              </select>
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Sub-category
              <input value={draft.sub_category} onChange={(event) => setDraft({ ...draft, sub_category: event.target.value })} style={{ ...input, marginTop: 6 }} placeholder="CCTV, HR staffing, access control" />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Brand / Make
              <input value={draft.brand_make} onChange={(event) => setDraft({ ...draft, brand_make: event.target.value })} style={{ ...input, marginTop: 6 }} placeholder="Hikvision, ZKTeco, ESSPL service" />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Condition
              <select value={draft.condition} onChange={(event) => setDraft({ ...draft, condition: event.target.value })} style={{ ...input, marginTop: 6 }}>
                <option value="NEW">New</option><option value="USED">Used</option><option value="REFURBISHED">Refurbished</option>
              </select>
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>SKU
              <input value={draft.sku} onChange={(event) => setDraft({ ...draft, sku: event.target.value })} style={{ ...input, marginTop: 6 }} placeholder="Internal stock code" />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Model No
              <input value={draft.model_no} onChange={(event) => setDraft({ ...draft, model_no: event.target.value })} style={{ ...input, marginTop: 6 }} />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Product Type
              <select value={draft.product_type} onChange={(event) => {
                const productType = event.target.value as Product["product_type"];
                setDraft({
                  ...draft,
                  product_type: productType,
                  tracking_type: productType === "SERVICE" ? "NONE" : draft.tracking_type,
                  min_stock_level: productType === "SERVICE" ? 0 : draft.min_stock_level,
                  warehouse_location: productType === "SERVICE" ? "" : draft.warehouse_location || "Main Warehouse",
                  room_number: productType === "SERVICE" ? "" : draft.room_number,
                  rack_number: productType === "SERVICE" ? "" : draft.rack_number,
                });
              }} style={{ ...input, marginTop: 6 }}>
                <option value="ASSET">Asset</option><option value="CONSUMABLE">Consumable</option><option value="SERVICE">Service</option>
              </select>
            </label>
            {draft.product_type !== "SERVICE" && (
              <label style={{ fontWeight: 800, fontSize: 12 }}>Tracking Method
                <select value={draft.tracking_type} onChange={(event) => setDraft({ ...draft, tracking_type: event.target.value as Product["tracking_type"] })} style={{ ...input, marginTop: 6 }}>
                  <option value="SERIAL">Serial Number</option><option value="IMEI">IMEI</option><option value="NONE">Quantity Only</option>
                </select>
              </label>
            )}
            {draft.product_type !== "SERVICE" && (
              <label style={{ fontWeight: 800, fontSize: 12 }}>Minimum Stock
                <input type="number" min="0" value={draft.min_stock_level} onChange={(event) => setDraft({ ...draft, min_stock_level: Number(event.target.value) })} style={{ ...input, marginTop: 6 }} />
              </label>
            )}
            <label style={{ fontWeight: 800, fontSize: 12 }}>Selling Price (PKR) *
              <input type="number" min="0" value={draft.selling_price} onChange={(event) => setDraft({ ...draft, selling_price: Number(event.target.value) })} style={{ ...input, marginTop: 6 }} />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Country of Origin
              <input value={draft.country_of_origin} onChange={(event) => setDraft({ ...draft, country_of_origin: event.target.value })} style={{ ...input, marginTop: 6 }} />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Batch / Lot No
              <input value={draft.batch_lot_number} onChange={(event) => setDraft({ ...draft, batch_lot_number: event.target.value })} style={{ ...input, marginTop: 6 }} />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Expiry Date
              <input type="date" value={draft.expiry_date} onChange={(event) => setDraft({ ...draft, expiry_date: event.target.value })} style={{ ...input, marginTop: 6 }} />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Warranty Date
              <input type="date" value={draft.warranty_date} onChange={(event) => setDraft({ ...draft, warranty_date: event.target.value })} style={{ ...input, marginTop: 6 }} />
            </label>
            <label style={{ fontWeight: 800, fontSize: 12 }}>Product Image URL
              <input value={draft.product_image_url} onChange={(event) => setDraft({ ...draft, product_image_url: event.target.value })} style={{ ...input, marginTop: 6 }} placeholder="Image path/URL for quotation and invoice" />
            </label>
            {draft.product_type !== "SERVICE" && (
              <label style={{ fontWeight: 800, fontSize: 12 }}>Warehouse / Location
                <input value={draft.warehouse_location} onChange={(event) => setDraft({ ...draft, warehouse_location: event.target.value })} style={{ ...input, marginTop: 6 }} />
              </label>
            )}
            {draft.product_type !== "SERVICE" && (
              <label style={{ fontWeight: 800, fontSize: 12 }}>Room Number
                <input value={draft.room_number} onChange={(event) => setDraft({ ...draft, room_number: event.target.value })} style={{ ...input, marginTop: 6 }} />
              </label>
            )}
            {draft.product_type !== "SERVICE" && (
              <label style={{ fontWeight: 800, fontSize: 12 }}>Rack Number
                <input value={draft.rack_number} onChange={(event) => setDraft({ ...draft, rack_number: event.target.value })} style={{ ...input, marginTop: 6 }} />
              </label>
            )}
            {customFields.map((fieldDef) => (
              <label key={fieldDef.id || fieldDef.field_key} style={{ fontWeight: 800, fontSize: 12 }}>
                {fieldDef.label}{fieldDef.required ? " *" : ""}
                {String(fieldDef.field_type).toUpperCase() === "SELECT" ? (
                  <select
                    value={draft.custom_attributes?.[fieldDef.field_key] || ""}
                    onChange={(event) => setCustomValue(fieldDef.field_key, event.target.value)}
                    style={{ ...input, marginTop: 6 }}
                  >
                    <option value="">Select</option>
                    {(fieldDef.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <input
                    type={String(fieldDef.field_type).toUpperCase() === "NUMBER" ? "number" : String(fieldDef.field_type).toUpperCase() === "DATE" ? "date" : "text"}
                    value={draft.custom_attributes?.[fieldDef.field_key] || ""}
                    onChange={(event) => setCustomValue(fieldDef.field_key, event.target.value)}
                    style={{ ...input, marginTop: 6 }}
                  />
                )}
              </label>
            ))}
            <label style={{ fontWeight: 800, fontSize: 12, gridColumn: "1 / -1" }}>Description
              <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} style={{ ...input, marginTop: 6, minHeight: 72, resize: "vertical" }} />
            </label>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
            <Button onClick={() => setShowForm(false)} tone="light">Cancel</Button>
            <Button onClick={saveProduct} tone="success" disabled={saving}>{saving ? "Saving..." : "Save Product / Service"}</Button>
          </div>
        </div>
      )}
      <div style={{ ...card, padding: 14, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search product, category or type" />
        <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={{ ...input, width: 180 }}>
          <option value="ALL">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.category_name}</option>)}
        </select>
        <select aria-label="Filter by product type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} style={{ ...input, width: 160 }}>
          <option value="ALL">All types</option><option value="ASSET">Assets</option><option value="CONSUMABLE">Consumables</option><option value="SERVICE">Services</option>
        </select>
        <select aria-label="Filter by condition" value={conditionFilter} onChange={(event) => setConditionFilter(event.target.value)} style={{ ...input, width: 160 }}>
          <option value="ALL">All conditions</option><option value="NEW">New</option><option value="USED">Used</option><option value="REFURBISHED">Refurbished</option>
        </select>
        <select aria-label="Filter by stock status" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} style={{ ...input, width: 170 }}>
          <option value="ALL">All stock levels</option><option value="IN_STOCK">In stock</option><option value="LOW_STOCK">Low stock</option><option value="OUT_OF_STOCK">Out of stock</option>
        </select>
        <select aria-label="Filter by location" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} style={{ ...input, width: 180 }}>
          <option value="ALL">All locations</option>
          {locations.map((location) => <option key={location} value={location}>{location}</option>)}
        </select>
        <Button onClick={reload} tone="light"><RefreshCw size={15} /> Refresh</Button>
      </div>
      <DataTable
        columns={["Product", "SKU / Model", "Type", "Location", "Available", "Selling Price", "Action"]}
        rows={filtered.map((product) => [
          <div>
            <strong>{product.product_name}</strong>
            <br /><span style={{ color: "#64748b" }}>{product.brand_make || product.category_name || "Uncategorized"}{product.condition ? ` | ${product.condition}` : ""}</span>
          </div>,
          <div>{product.sku || "-"}<br /><span style={{ color: "#64748b" }}>{product.model_no || product.sub_category || "-"}</span></div>,
          <div>{product.product_type}<br /><span style={{ color: "#64748b" }}>{product.product_type === "SERVICE" ? "Not stock-tracked" : product.tracking_type}</span></div>,
          product.product_type === "SERVICE"
            ? <span style={{ color: "#64748b" }}>Not applicable</span>
            : <div>{product.warehouse_location || "Warehouse"}<br /><span style={{ color: "#64748b" }}>{[product.room_number, product.rack_number].filter(Boolean).join(" / ") || "Room/Rack not set"}</span></div>,
          product.product_type === "SERVICE" ? "-" : Number(product.available_count ?? product.quantity ?? 0),
          money(Number(product.selling_price ?? product.unit_price ?? 0)),
          resolveProductUnitPrice(product) <= 0
            ? <Button to="/inventory" tone="warning">Set Price</Button>
            : product.product_type === "SERVICE"
              ? statusChip("AVAILABLE")
              : Number(product.quantity || 0) <= Number(product.min_stock_level || 0)
                ? <Button to="/inventory/purchasing" tone="light"><ShoppingCart size={14} /> Create PO</Button>
                : statusChip("IN STOCK"),
        ])}
        empty="No products found."
      />
    </div>
  );
}

export function InventorySerialsPage() {
  const { items } = useInventoryFlowData();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const filtered = items.filter((item) => [item.product_name, item.serial_number, item.imei, item.current_status].join(" ").toLowerCase().includes(q.toLowerCase()));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [q]);

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header eyebrow="Asset Traceability" title="Serial and Batch Register" text="Review serial, IMEI, batch and item availability before controlled material issue." />
      <div style={{ ...card, padding: 14, marginBottom: 14, display: "flex", gap: 12 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Scan or search serial / IMEI / product" />
        <Button to="/inventory/field-service" tone="success"><Wrench size={15} /> Issue Serialized Item</Button>
      </div>
      <DataTable
        columns={["Product", "Serial", "IMEI", "Status", "Location"]}
        rows={pageRows.map((item) => [
          item.product_name || "-",
          <strong>{item.serial_number || "-"}</strong>,
          item.imei || "-",
          statusChip(item.current_status),
          item.location || "Warehouse",
        ])}
        empty="No serial/IMEI items found."
      />
      <TablePager page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
    </div>
  );
}

export function InventoryPurchasingPage() {
  const { products, vendors, purchaseOrders, workQueue, loading, reload } = useInventoryFlowData({ includeCosts: true });
  const { showToast } = useToastContext();
  const navigate = useNavigate();
  const location = useLocation();
  const sourceParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const sourceOrderId = sourceParams.get("orderId") || "";
  const sourceQuotationId = sourceParams.get("quotationId") || "";
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [purchaseCustomFields, setPurchaseCustomFields] = useState<ProductCustomFieldDefinition[]>([]);
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
    currency_code: "PKR",
    exchange_rate: 1,
    payment_terms: "",
    warehouse_location: "Main Warehouse",
    room_number: "",
    rack_number: "",
    custom_attributes: {} as Record<string, any>,
    notes: "",
    order_id: sourceOrderId,
    quotation_id: sourceQuotationId,
  });
  const [poItems, setPoItems] = useState<PurchaseDraftLine[]>([newLine()]);
  const [receivePo, setReceivePo] = useState<PurchaseOrder | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});
  const [receiveSerials, setReceiveSerials] = useState<Record<string, string>>({});
  const [receiveBatches, setReceiveBatches] = useState<Record<string, string>>({});
  const [receiptKey, setReceiptKey] = useState("");
  const [receiptEvidence, setReceiptEvidence] = useState<File | null>(null);
  const [poSearch, setPoSearch] = useState("");
  const [poStatus, setPoStatus] = useState("ALL");
  const [poPage, setPoPage] = useState(1);
  const prefillKeyRef = useRef("");
  const poPageSize = 10;
  const filteredPurchaseOrders = useMemo(() => purchaseOrders.filter((po) => {
    const status = String(po.status || "").toUpperCase();
    const haystack = [po.po_number, po.vendor_name, po.customer_name, po.order_number, po.quotation_number].join(" ").toLowerCase();
    return (poStatus === "ALL" || status === poStatus) && haystack.includes(poSearch.trim().toLowerCase());
  }), [purchaseOrders, poSearch, poStatus]);
  const pagedPurchaseOrders = filteredPurchaseOrders.slice((poPage - 1) * poPageSize, poPage * poPageSize);
  useEffect(() => { setPoPage(1); }, [poSearch, poStatus]);

  useEffect(() => {
    inventoryApi.getProductCustomFields()
      .then((fields) => setPurchaseCustomFields(fields.filter((field) => ["PURCHASE", "STOCK_IN"].includes(String(field.applies_to || "").toUpperCase()))))
      .catch(() => setPurchaseCustomFields([]));
  }, []);

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
      currency_code: "PKR",
      exchange_rate: 1,
      payment_terms: "",
      warehouse_location: "Main Warehouse",
      room_number: "",
      rack_number: "",
      custom_attributes: {},
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
    const missingCustomField = purchaseCustomFields.find((field) => field.required && !String(form.custom_attributes?.[field.field_key] ?? "").trim());
    if (missingCustomField) {
      showToast(`${missingCustomField.label} is required.`, "error");
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
        currency_code: form.currency_code,
        exchange_rate: form.exchange_rate,
        payment_terms: form.payment_terms,
        warehouse_location: form.warehouse_location,
        room_number: form.room_number,
        rack_number: form.rack_number,
        custom_attributes: form.custom_attributes,
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
      showToast("Purchase order saved as Draft. Next: approve and issue it before receipt.", "success");
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
    setReceiveSerials({});
    setReceiveBatches({});
    setReceiptKey(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `receipt-${po.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    setReceiptEvidence(null);
    setReceivePo(po);
  };

  const transitionPo = async (po: PurchaseOrder, action: "APPROVE" | "ISSUE" | "CLOSE" | "CANCEL") => {
    try {
      await inventoryApi.transitionPurchaseOrder(po.id, action);
      const actionLabels = { APPROVE: "approved", ISSUE: "issued", CLOSE: "closed", CANCEL: "cancelled" } as const;
      showToast(`Purchase order ${actionLabels[action]} successfully.`, "success");
      await reload();
    } catch (error: any) {
      showToast(error?.response?.data?.message || "Purchase order status could not be changed.", "error");
    }
  };

  const submitReceive = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!receivePo) return;
    const items = Object.entries(receiveQty)
      .map(([id, received_qty]) => ({
        id,
        received_qty: Number(received_qty || 0),
        condition: "NEW" as const,
        batch_lot_number: receiveBatches[id]?.trim() || undefined,
        serial_numbers: String(receiveSerials[id] || "")
          .split(/\r?\n|,/)
          .map((value) => value.trim())
          .filter(Boolean),
      }))
      .filter((item) => item.received_qty > 0);
    if (!items.length) {
      showToast("Enter received quantity for at least one item.", "error");
      return;
    }
    const receivingPo = receivePo;
    const uploadedEvidence = receiptEvidence ? await inventoryApi.uploadProductImage(receiptEvidence) : null;
    await inventoryApi.receivePurchaseOrder(receivingPo.id, { idempotency_key: receiptKey, evidence_url: uploadedEvidence?.url, items });
    setReceivePo(null);
    setReceiveQty({});
    setReceiveSerials({});
    setReceiveBatches({});
    setReceiptKey("");
    setReceiptEvidence(null);
    await reload();

    const refreshedQueue = await inventoryApi.getWorkQueue({ stock_status: "STOCK_OK" }).catch(() => []);
    const readyJob = refreshedQueue.find((job) =>
      (receivingPo.crm_order_id && job.order_id === receivingPo.crm_order_id)
      || (receivingPo.quotation_id && job.id === receivingPo.quotation_id),
    );
    if (readyJob) {
      showToast("Stock received. The order is ready for field service preparation.", "success");
      navigate(`/inventory/field-service?orderId=${readyJob.order_id || ""}&quotationId=${readyJob.id}`);
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
        eyebrow="Procurement and Receipt"
        title="Purchase Orders and Stock Receipt"
        text="Procure approved shortages and record actual quantities received into stock."
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
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
                    Add a supplier in Configuration to auto-fill this field.
                  </span>
                )}
              </div>
            ))}
            {fieldLabel("PO Date", <input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} style={input} />)}
            {fieldLabel("Expected Delivery *", <input required type="date" min={form.order_date || new Date().toISOString().slice(0, 10)} value={form.expected_delivery_date} onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })} style={input} />)}
            <TaxRateControl value={form.tax_rate} onChange={(tax_rate) => setForm({ ...form, tax_rate })} />
            {fieldLabel("Currency", (
              <select value={form.currency_code} onChange={(event) => setForm({ ...form, currency_code: event.target.value })} style={input}>
                <option value="PKR">PKR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            ))}
            {fieldLabel("Exchange Rate to PKR", <input type="number" min="0.000001" step="0.000001" value={form.exchange_rate} onChange={(event) => setForm({ ...form, exchange_rate: Math.max(0.000001, Number(event.target.value) || 1) })} style={input} />)}
            {fieldLabel("Payment Terms", <input value={form.payment_terms} onChange={(event) => setForm({ ...form, payment_terms: event.target.value })} style={input} placeholder="Net 15, COD, advance" />)}
            {fieldLabel("Warehouse / Location", <input value={form.warehouse_location} onChange={(e) => setForm({ ...form, warehouse_location: e.target.value })} style={input} placeholder="Main Warehouse" />)}
            {fieldLabel("Room Number", <input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} style={input} placeholder="Room A" />)}
            {fieldLabel("Rack Number", <input value={form.rack_number} onChange={(e) => setForm({ ...form, rack_number: e.target.value })} style={input} placeholder="Rack 01" />)}
            {purchaseCustomFields.map((fieldDef) => fieldLabel(`${fieldDef.label}${fieldDef.required ? " *" : ""}`, (
              String(fieldDef.field_type).toUpperCase() === "SELECT" ? (
                <select
                  required={fieldDef.required}
                  value={form.custom_attributes?.[fieldDef.field_key] || ""}
                  onChange={(event) => setForm({
                    ...form,
                    custom_attributes: { ...form.custom_attributes, [fieldDef.field_key]: event.target.value },
                  })}
                  style={input}
                >
                  <option value="">Select</option>
                  {(fieldDef.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ) : (
                <input
                  required={fieldDef.required}
                  type={String(fieldDef.field_type).toUpperCase() === "NUMBER" ? "number" : String(fieldDef.field_type).toUpperCase() === "DATE" ? "date" : "text"}
                  value={form.custom_attributes?.[fieldDef.field_key] || ""}
                  onChange={(event) => setForm({
                    ...form,
                    custom_attributes: { ...form.custom_attributes, [fieldDef.field_key]: event.target.value },
                  })}
                  style={input}
                />
              )
            )))}
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
          {!vendors.length && <div style={{ color: "#b45309", fontWeight: 850 }}>No supplier found. Add a supplier in Configuration before creating a PO.</div>}
        </form>
      )}
      <div style={{ ...card, padding: 12, marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
        <SearchBox value={poSearch} onChange={setPoSearch} placeholder="Search PO, vendor, client, order or quotation" />
        <select aria-label="Purchase order status" value={poStatus} onChange={(event) => setPoStatus(event.target.value)} style={input}>
          <option value="ALL">All statuses</option>
          <option value="DRAFT">Draft</option><option value="APPROVED">Approved</option><option value="ISSUED">Issued</option><option value="ORDERED">Legacy ordered</option><option value="PARTIALLY_RECEIVED">Partially received</option><option value="RECEIVED">Received</option><option value="CLOSED">Closed</option><option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      <DataTable
        columns={["PO Number", "Vendor", "Created Date", "Expected Delivery", "Items", "Status", "Amount", "Action"]}
        rows={pagedPurchaseOrders.map((po) => {
          const poStatus = String(po.status || "").toUpperCase();
          const receiveAction = poStatus === "RECEIVED"
            ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "0 12px", border: "1px solid #bbf7d0", borderRadius: 8, background: "#f0fdf4", color: "#047857", fontSize: 12, fontWeight: 900 }}>
                  <CheckCircle2 size={15} /> Stock Received
                </span>
                <Button onClick={() => transitionPo(po, "CLOSE")} tone="light">Close PO</Button>
              </div>
            )
            : poStatus === "CANCELLED"
              ? <span style={{ color: "#94a3b8", fontWeight: 850 }}>Cancelled</span>
              : poStatus === "DRAFT"
                ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button onClick={() => transitionPo(po, "APPROVE")} tone="success">Approve</Button><Button onClick={() => transitionPo(po, "CANCEL")} tone="light">Cancel</Button></div>
              : poStatus === "APPROVED"
                ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button onClick={() => transitionPo(po, "ISSUE")} tone="success">Issue to Supplier</Button><Button onClick={() => transitionPo(po, "CANCEL")} tone="light">Cancel</Button></div>
              : poStatus === "CLOSED"
                ? <span style={{ color: "#64748b", fontWeight: 850 }}>Closed</span>
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
        empty={loading ? "Loading purchase orders..." : "No purchase orders match the selected filters."}
      />
      {!loading && <TablePager page={poPage} pageSize={poPageSize} total={filteredPurchaseOrders.length} onPageChange={setPoPage} />}
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
              Enter the quantity physically received. When all shortages are cleared, the linked order becomes ready for material issue.
            </div>
            <label style={{ display: "grid", gap: 6, color: "#475569", fontSize: 12, fontWeight: 850 }}>
              Receipt evidence (optional JPG, PNG or WebP)
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setReceiptEvidence(event.target.files?.[0] || null)} style={input} />
            </label>
            <DataTable
              columns={["Product", "Ordered", "Already Received", "Receive Now", "Traceability", "Unit Cost"]}
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
                  ["SERIAL", "IMEI"].includes(String(item.tracking_type || "").toUpperCase()) ? (
                    <textarea
                      value={receiveSerials[item.id] || ""}
                      onChange={(event) => setReceiveSerials({ ...receiveSerials, [item.id]: event.target.value })}
                      placeholder={`Enter one ${item.tracking_type === "IMEI" ? "IMEI" : "serial number"} per line`}
                      rows={3}
                      style={{ ...input, minWidth: 230, resize: "vertical" }}
                    />
                  ) : String(item.tracking_type || "").toUpperCase() === "BATCH" ? (
                    <input
                      value={receiveBatches[item.id] || ""}
                      onChange={(event) => setReceiveBatches({ ...receiveBatches, [item.id]: event.target.value })}
                      placeholder="Batch / lot number"
                      style={{ ...input, minWidth: 180 }}
                    />
                  ) : "Not required",
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
  const { dispatches, products, reload } = useInventoryFlowData();
  const { showToast } = useToastContext();
  const params = new URLSearchParams(window.location.search);
  const initialQuotationId = params.get("quotationId") || "";
  const initialOrderId = params.get("orderId") || "";
  const [showForm, setShowForm] = useState(Boolean(initialQuotationId || initialOrderId));
  const [installers, setInstallers] = useState<InventoryInstallerUser[]>([]);
  const [readyQueue, setReadyQueue] = useState<InventoryWorkQueueJob[]>([]);
  const [readyLoading, setReadyLoading] = useState(true);
  const [qrDispatch, setQrDispatch] = useState<FieldDispatch | null>(null);
  const [materialRequests, setMaterialRequests] = useState<FieldMaterialRequest[]>([]);
  const [requestDraft, setRequestDraft] = useState({ dispatch_id: "", product_id: "", requested_quantity: 1, reason: "" });
  const [form, setForm] = useState({
    quotation_id: initialQuotationId,
    customer_id: "",
    installer_id: "",
    site_address: "",
    notes: "",
  });

  const activeDispatchQuoteIds = useMemo(
    () => new Set(dispatches.filter((dispatch) => ["PENDING", "ASSIGNED", "DISPATCHED", "IN_PROGRESS"].includes(String(dispatch.status || "").toUpperCase())).map((dispatch) => dispatch.quotation_id).filter(Boolean)),
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
    inventoryApi.getMaterialRequests().then(setMaterialRequests).catch(() => setMaterialRequests([]));
  }, []);

  const clearPreparedJob = () => {
    setShowForm(false);
    setForm({ quotation_id: "", customer_id: "", installer_id: "", site_address: "", notes: "" });
    window.history.replaceState(null, "", "/inventory/field-service");
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
    window.history.replaceState(null, "", `/inventory/field-service?orderId=${job.order_id || ""}&quotationId=${job.id}`);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.customer_id) return showToast("Select an approved field service assignment first.", "error");
    if (!form.installer_id) return showToast("Select a field technician before issuing material.", "error");
    const stockStatus = String(selectedJob?.stock_status || selectedJob?.order_status || "").toUpperCase();
    if (stockStatus !== "STOCK_OK") return showToast("This order is not stock-ready. Create PO or receive stock first.", "error");
    if (!selectedReadyItems.length) return showToast("No stock is available for this assignment. Create a purchase order or receive stock first.", "error");
    await inventoryApi.createDispatch({
      quotation_id: form.quotation_id || null,
      customer_id: form.customer_id,
      installer_id: form.installer_id,
      site_address: form.site_address,
      notes: form.notes,
      items: selectedReadyItems,
    });
    showToast("Material issued. The field team can now complete the assignment and obtain client sign-off.", "success");
    setShowForm(false);
    await loadReadyQueue();
    reload();
  };

  const openQrCodes = async (dispatchId: string) => {
    try {
      setQrDispatch(await inventoryApi.getDispatch(dispatchId));
    } catch {
      showToast("QR codes could not be loaded.", "error");
    }
  };

  const submitMaterialRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const product = products.find((row) => row.id === requestDraft.product_id);
    if (!requestDraft.dispatch_id || !product || !requestDraft.reason.trim()) return showToast("Select a product and enter the request reason.", "error");
    await inventoryApi.createMaterialRequest(requestDraft.dispatch_id, { product_id: product.id, item_description: product.product_name, requested_quantity: requestDraft.requested_quantity, reason: requestDraft.reason });
    setRequestDraft({ dispatch_id: "", product_id: "", requested_quantity: 1, reason: "" });
    setMaterialRequests(await inventoryApi.getMaterialRequests());
    showToast("Additional material request submitted for Inventory review.", "success");
  };

  const reviewMaterial = async (request: FieldMaterialRequest, status: "APPROVED" | "REJECTED") => {
    await inventoryApi.reviewMaterialRequest(request.id, { status });
    setMaterialRequests(await inventoryApi.getMaterialRequests());
    showToast(`Material request ${status.toLowerCase()}.`, "success");
  };

  const issueMaterial = async (request: FieldMaterialRequest) => {
    await inventoryApi.issueMaterialRequest(request.id);
    setMaterialRequests(await inventoryApi.getMaterialRequests());
    await reload();
    showToast("Additional material issued and stock updated.", "success");
  };

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header eyebrow="Field Fulfilment" title="Material Issue and Field Assignment" text="Issue verified stock against a stock-ready approved order and assigned field technician." />
      <div style={{ ...card, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <div style={{ color: "#2563eb", fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".05em" }}>Ready Queue</div>
            <h3 style={{ margin: "4px 0 0", color: "#0f172a" }}>Stock-Ready Assignments Awaiting Material Issue</h3>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={loadReadyQueue} tone="light"><RefreshCw size={15} /> Refresh</Button>
            <Button to="/inventory/queue" tone="light"><ClipboardCheck size={15} /> Released Orders</Button>
          </div>
        </div>
        <DataTable
          columns={["Order / Stock Check", "Client", "Stock Readiness", "Amount", "Action"]}
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
              <Button onClick={() => prepareJob(job)} tone="success" prominent><Wrench size={14} /> Prepare Assignment</Button>,
            ];
          })}
          empty={readyLoading ? "Loading ready orders..." : "No order is ready. Run its stock check, then receive any shortage against the linked purchase order."}
        />
        {!readyLoading && readyJobs.length === 0 && (
          <div style={{ marginTop: 12, border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong style={{ color: "#1e3a8a" }}>There is currently no field-service assignment ready for material issue.</strong>
              <div style={{ marginTop: 4, color: "#475569", fontSize: 13 }}>Run a stock check from Released Orders. If stock is short, receive the linked purchase order first; the order will then appear here.</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button to="/inventory/queue" tone="primary"><ClipboardCheck size={15} /> Released Orders</Button>
              <Button to="/inventory/purchasing" tone="light"><ShoppingCart size={15} /> Procurement & Receipts</Button>
            </div>
          </div>
        )}
      </div>
      {showForm && (
        <form onSubmit={submit} style={{ ...card, padding: 18, marginBottom: 14, display: "grid", gap: 12 }}>
          {selectedJob && (
            <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 12 }}>
              <div style={{ color: "#1d4ed8", fontWeight: 950, fontSize: 12, textTransform: "uppercase" }}>Selected Assignment</div>
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
            <input readOnly value={selectedJob ? `${selectedJob.order_number || "Order"} / ${tokenForQuote(selectedJob)}` : "Prepare a stock-ready assignment from the queue above"} style={{ ...input, background: "#f8fafc" }} />
            <select required disabled={!selectedJob} value={form.installer_id} onChange={(e) => setForm({ ...form, installer_id: e.target.value })} style={input}>
              <option value="">Select field technician</option>
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
            empty="No field service items loaded."
          />
          <input disabled={!selectedJob} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={input} placeholder="Material issue and field service notes" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button tone="light" onClick={clearPreparedJob}>Cancel</Button>
            <button type="submit" className="btn btn-primary" disabled={!selectedJob || !form.installer_id || selectedReadyItems.length === 0}>Confirm Material Issue</button>
          </div>
        </form>
      )}
      <h3 style={{ margin: "8px 0 10px", color: "#0f172a" }}>Active Field Service Assignments</h3>
      <DataTable
        columns={["Field Job", "Client", "Stock Check", "Field Technician", "Items Issued", "Status", "Issued Date", "Actions"]}
        rows={dispatches
          .filter((dispatch) => ["PENDING", "ASSIGNED", "DISPATCHED", "IN_PROGRESS"].includes(String(dispatch.status || "").toUpperCase()))
          .map((dispatch) => [
          <strong>{dispatch.dispatch_number}</strong>,
          dispatch.customer_name || "-",
          <div><strong>{dispatch.token_number || "-"}</strong><br /><span style={{ color: "#64748b", fontSize: 12 }}>{dispatch.order_number || dispatch.quotation_number || "-"}</span></div>,
          dispatch.installer_name || dispatch.installer_email || "Not assigned",
          dispatch.item_count ?? dispatch.items?.length ?? "-",
          statusChip(dispatchStatusLabel(dispatch.status)),
          dispatch.dispatched_at ? new Date(dispatch.dispatched_at).toLocaleDateString("en-GB") : "-",
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={() => openQrCodes(dispatch.id)} tone="light"><Barcode size={14} /> View QR Codes</Button>
            <Button onClick={() => setRequestDraft({ dispatch_id: dispatch.id, product_id: "", requested_quantity: 1, reason: "" })} tone="light"><Plus size={14} /> Request Material</Button>
            <Button to={`/inventory/reconciliation?dispatchId=${dispatch.id}`} tone="dark"><Wrench size={14} /> Record Completion</Button>
          </div>,
        ])}
        empty="No active field service assignments. Prepare an assignment from the ready queue above."
      />
      <h3 style={{ margin: "18px 0 10px", color: "#0f172a" }}>Additional Material Requests</h3>
      <DataTable
        columns={["Request", "Assignment", "Client", "Material", "Quantity", "Reason", "Status", "Actions"]}
        rows={materialRequests.map((request) => [
          <strong>{request.request_number}</strong>,
          request.dispatch_number || "-",
          request.customer_name || "-",
          request.product_name || request.item_description,
          Number(request.requested_quantity || 0),
          request.reason,
          statusChip(request.status),
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {request.status === "PENDING" && <><Button onClick={() => reviewMaterial(request, "APPROVED")} tone="success">Approve</Button><Button onClick={() => reviewMaterial(request, "REJECTED")} tone="light">Reject</Button></>}
            {request.status === "APPROVED" && <Button onClick={() => issueMaterial(request)} tone="success">Issue Stock</Button>}
            {request.status === "ISSUED" && <span style={{ color: "#047857", fontWeight: 900 }}>Stock issued</span>}
          </div>,
        ])}
        empty="No additional material requests."
      />
      {requestDraft.dispatch_id && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(15,23,42,.52)", display: "grid", placeItems: "center", padding: 18 }}>
          <form onSubmit={submitMaterialRequest} style={{ ...card, width: "min(620px,100%)", padding: 18, display: "grid", gap: 12 }}>
            <div><div style={{ color: "#2563eb", fontSize: 11, fontWeight: 950, textTransform: "uppercase" }}>Field Material Control</div><h3 style={{ margin: "4px 0" }}>Request Additional Material</h3><p style={{ margin: 0, color: "#64748b" }}>Inventory approval is required before extra stock can be issued.</p></div>
            <select required value={requestDraft.product_id} onChange={(event) => setRequestDraft({ ...requestDraft, product_id: event.target.value })} style={input}><option value="">Select available product</option>{products.filter((product) => product.product_type !== "SERVICE").map((product) => <option key={product.id} value={product.id}>{product.product_name} (Available {Number(product.available_count ?? product.quantity ?? 0)})</option>)}</select>
            <input required type="number" min="1" value={requestDraft.requested_quantity} onChange={(event) => setRequestDraft({ ...requestDraft, requested_quantity: Number(event.target.value) || 1 })} style={input} placeholder="Quantity" />
            <textarea required value={requestDraft.reason} onChange={(event) => setRequestDraft({ ...requestDraft, reason: event.target.value })} style={{ ...input, minHeight: 90 }} placeholder="Why is additional material required?" />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button onClick={() => setRequestDraft({ dispatch_id: "", product_id: "", requested_quantity: 1, reason: "" })} tone="light">Cancel</Button><button className="btn btn-primary" type="submit">Submit Request</button></div>
          </form>
        </div>
      )}
      {qrDispatch && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(15,23,42,.52)", display: "grid", placeItems: "center", padding: 18 }}>
          <div style={{ ...card, width: "min(960px,100%)", maxHeight: "calc(100vh - 36px)", overflowY: "auto", padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
              <div><div style={{ color: "#2563eb", fontSize: 11, fontWeight: 950, textTransform: "uppercase" }}>Material Traceability</div><h3 style={{ margin: "4px 0" }}>{qrDispatch.dispatch_number} QR Codes</h3><p style={{ margin: 0, color: "#64748b" }}>{qrDispatch.token_number || "Stock check pending"} | {qrDispatch.customer_name || "Client"}</p></div>
              <Button onClick={() => setQrDispatch(null)} tone="light">Close</Button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              {(qrDispatch.items || []).map((item) => {
                const payload = item.qr_payload || JSON.stringify({ token_number: qrDispatch.token_number, dispatch_number: qrDispatch.dispatch_number, item: item.product_name, serial_number: item.serial_number || item.imei || null, quantity: item.quantity_issued });
                return <div key={item.id || `${item.product_id}-${item.serial_number || item.imei || item.product_name}`} style={{ border: "1px solid #dbe3ef", borderRadius: 8, padding: 14, background: "#fff", textAlign: "center" }}><QRCodeSVG value={payload} size={150} level="M" /><strong style={{ display: "block", marginTop: 10 }}>{item.product_name || "Issued item"}</strong><span style={{ display: "block", marginTop: 4, color: "#64748b", fontSize: 12 }}>{item.serial_number || item.imei || `Quantity ${item.quantity_issued}`}</span></div>;
              })}
              {!qrDispatch.items?.length && <div style={{ color: "#64748b" }}>No issued items found for this assignment.</div>}
            </div>
          </div>
        </div>
      )}
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
  const [clientSignoffName, setClientSignoffName] = useState("");
  const [clientSignoffNote, setClientSignoffNote] = useState("");
  const [fieldPurchases, setFieldPurchases] = useState<Array<{
    item_description: string;
    vendor_name: string;
    amount: number;
    receipt_url: string;
    notes: string;
  }>>([]);

  const loadReturns = async () => {
    setLoading(true);
    try {
      setReturns(await inventoryApi.getReturnRequests());
    } catch {
      showToast("Unable to load material reconciliation records.", "error");
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReturnDetail = async (id: string) => {
    try {
      const detail = await inventoryApi.getReturnRequest(id);
      setSelectedReturn(detail);
      setClientSignoffName(detail.client_signoff_name || "");
      setClientSignoffNote(detail.client_signoff_note || "");
      setFieldPurchases((detail.on_the_go_purchases || []).map((item) => ({
        item_description: item.item_description || "",
        vendor_name: item.vendor_name || "",
        amount: Number(item.amount || 0),
        receipt_url: item.receipt_url || "",
        notes: item.notes || "",
      })));
      setItems((detail.items || []).map((item) => ({
        ...item,
        condition: item.condition || "GOOD",
        confirm: Boolean(item.confirm ?? item.confirmed),
        quantity_returned: Number(item.quantity_returned || 0),
      })));
    } catch {
      showToast("Unable to load material reconciliation detail.", "error");
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
    if (!clientSignoffName.trim()) {
      showToast("Enter the authorized client sign-off name before completing field service.", "error");
      return;
    }
    const unmarked = items.some((item) => {
      const issued = Number(item.quantity_issued || 0);
      return Number(item.quantity_used || 0) + Number(item.quantity_returned || 0) !== issued;
    });
    if (unmarked) {
      showToast("Record the actual result for every issued item before completing field service.", "error");
      return;
    }
    setCompletingJob(true);
    try {
      const updated: any = await inventoryApi.reconcileDispatch(selectedId, {
        items: items.map((item) => ({
          id: item.id,
          quantity_used: Number(item.quantity_used || 0),
          quantity_returned: Number(item.quantity_returned || 0),
          notes: item.notes || "Inventory recorded the field service result.",
        })),
        on_the_go_purchases: fieldPurchases
          .filter((item) => item.item_description.trim() && Number(item.amount) > 0)
          .map((item) => ({ ...item, amount: Number(item.amount) })),
        client_signoff_name: clientSignoffName.trim(),
        client_signoff_note: clientSignoffNote.trim(),
        notes: "Field service completed with client sign-off and submitted for material reconciliation.",
      });
      if (updated?.invoice || updated?.status === "STOCK_UPDATED" || updated?.dispatch_status === "BILL_SENT") {
        showToast("Field service completed. The verified billing record is now available to Finance.", "success");
        navigate("/inventory/field-service");
        return;
      }
      showToast("Field service completed. Reconcile any unused or returned material next.", "success");
      await loadReturnDetail(selectedId);
      await loadReturns();
    } catch {
      showToast("Field service completion could not be saved. Check every item and try again.", "error");
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
        notes: "Inventory reviewed and confirmed the material reconciliation.",
      });
      showToast("Material reconciliation confirmed. Stock and billing adjustments are updated.", "success");
      setSelectedReturn(updated);
      await loadReturns();
      await loadReturnDetail(selectedId);
    } catch {
      showToast("Material reconciliation could not be confirmed. Check the connection and try again.", "error");
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
          ? "Zero-balance record closed. All chargeable items were returned, so no Finance invoice was generated."
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
          eyebrow={fieldJobPending ? "Field Job Completion" : "Material Closeout Detail"}
          title={selectedReturn ? `${fieldJobPending ? "Complete Field Service" : selectedReturn.return_request_no} - ${selectedReturn.customer_name || "Client"}` : "Field Service Review"}
          text={fieldJobPending ? "Record each issued item's site result and obtain client sign-off." : "Verify returned material and submit the adjusted billing record."}
          actions={<Button onClick={() => navigate("/inventory/reconciliation")} tone="light"><ArrowRight size={15} /> Back to Reconciliation</Button>}
        />

        {selectedReturn && fieldJobPending && (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ ...card, padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
              {[
                ["Dispatch", selectedReturn.dispatch_number || "-"],
                ["Stock Check / Order", `${selectedReturn.token_number || "-"} / ${selectedReturn.order_number || "-"}`],
                ["Client", selectedReturn.customer_name || "-"],
                ["Field Technician", selectedReturn.installer_name || selectedReturn.installer_email || "-"],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ marginTop: 6, color: "#0f172a", fontWeight: 850 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card, padding: 18 }}>
              <h3 style={{ margin: "0 0 5px" }}>Issued Material Results</h3>
              <p style={{ margin: "0 0 14px", color: "#64748b" }}>Record the actual result for every issued item. Finance receives nothing until field completion and material reconciliation are verified.</p>
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
                empty="No issued material was found for this assignment."
              />
            </div>

            <div style={{ ...card, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: "0 0 5px" }}>Additional Items Used On Site</h3>
                  <p style={{ margin: 0, color: "#64748b" }}>Add only items purchased or used outside the original dispatch. They will be included in the Finance bill.</p>
                </div>
                <Button
                  type="button"
                  tone="light"
                  onClick={() => setFieldPurchases((current) => [...current, {
                    item_description: "",
                    vendor_name: "",
                    amount: 0,
                    receipt_url: "",
                    notes: "",
                  }])}
                >
                  <Plus size={15} /> Add Extra Item
                </Button>
              </div>
              {fieldPurchases.length === 0 ? (
                <div style={{ marginTop: 14, padding: 14, border: "1px dashed #cbd5e1", borderRadius: 8, color: "#64748b" }}>No additional site items recorded.</div>
              ) : (
                <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                  {fieldPurchases.map((purchase, index) => (
                    <div key={index} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, alignItems: "end" }}>
                      <label style={formLabel}>Item description<input style={input} value={purchase.item_description} onChange={(event) => setFieldPurchases((current) => current.map((item, i) => i === index ? { ...item, item_description: event.target.value } : item))} /></label>
                      <label style={formLabel}>Vendor<input style={input} value={purchase.vendor_name} onChange={(event) => setFieldPurchases((current) => current.map((item, i) => i === index ? { ...item, vendor_name: event.target.value } : item))} /></label>
                      <label style={formLabel}>Amount (PKR)<input style={input} type="number" min="0" value={purchase.amount || ""} onChange={(event) => setFieldPurchases((current) => current.map((item, i) => i === index ? { ...item, amount: Number(event.target.value) } : item))} /></label>
                      <Button type="button" tone="light" onClick={() => setFieldPurchases((current) => current.filter((_, i) => i !== index))}><XCircle size={15} /> Remove</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...card, padding: 18 }}>
              <h3 style={{ margin: "0 0 5px" }}>Client Sign-off</h3>
              <p style={{ margin: "0 0 14px", color: "#64748b" }}>Required after on-site work. This confirms the client received the installed items or completed service.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
                <label style={formLabel}>Authorized client name *<input style={input} value={clientSignoffName} onChange={(event) => setClientSignoffName(event.target.value)} placeholder="Name of person accepting the work" /></label>
                <label style={formLabel}>Sign-off note<input style={input} value={clientSignoffNote} onChange={(event) => setClientSignoffNote(event.target.value)} placeholder="Completion note, designation or reference" /></label>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button onClick={completeFieldJob} disabled={completingJob || !allJobItemsMarked || !clientSignoffName.trim()} tone="success" prominent>
                <CheckCircle2 size={16} /> {completingJob ? "Completing..." : "Save Sign-off & Complete Field Service"}
              </Button>
            </div>
          </div>
        )}

        {selectedReturn && !fieldJobPending && (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ ...card, padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
              {[
                ["Stock Check / Order", `${selectedReturn.token_number || "-"} / ${selectedReturn.order_number || "-"}`],
                ["Client", selectedReturn.customer_name || "-"],
                ["Field Technician", selectedReturn.installer_name || selectedReturn.installer_email || "-"],
                ["Status", statusChip(status)],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <div style={{ color: "#64748b", fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ marginTop: 6, color: "#0f172a", fontWeight: 850 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card, padding: 18 }}>
              <h3 style={{ marginTop: 0 }}>Returned Material Verification</h3>
              <DataTable
                columns={["Item", "Returned Quantity", "Condition", "Verified"]}
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
                empty="No returned material is attached to this reconciliation record."
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
                  Zero balance: all chargeable items were returned. Closing this record will not generate a Finance invoice.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              {status === "PENDING" && (
                <Button onClick={confirmReturns} disabled={confirming} tone="primary">
                  <CheckCircle2 size={16} /> {confirming ? "Confirming..." : "Confirm Reconciliation"}
                </Button>
              )}
              {status === "CONFIRMED" && (
                <Button onClick={sendBill} disabled={sendingBill} tone="success" prominent>
                  <ReceiptText size={16} /> {sendingBill ? "Processing..." : bill.final <= 0 ? "Close Zero-Balance Record" : "Submit Verified Billing Record"}
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
        eyebrow="Material Control"
        title="Field Completion & Material Closeout"
        text="Verify field results, reconcile returned material and submit an auditable billing record to Finance."
        actions={<Button onClick={loadReturns} tone="light"><RefreshCw size={15} /> Refresh</Button>}
      />
      <div style={{ ...card, padding: 14, marginBottom: 14 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search closeout, stock check, order, client or technician" />
      </div>
      <DataTable
        columns={["Closeout No", "Stock Check / Order", "Client", "Field Technician", "Returned Items", "Status", "Submitted", "Action"]}
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
          <Button to={`/inventory/reconciliation?returnId=${request.id}`} tone={request.status === "PENDING" ? "primary" : "light"}>
            <Undo2 size={14} /> Review Reconciliation
          </Button>,
        ])}
        empty={loading ? "Loading reconciliation records..." : "No material reconciliation records found."}
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
  theme_preset: "executive",
  primary_color: "#0B2447",
  accent_color: "#0D9488",
  page_color: "#F4F6FA",
  surface_color: "#FFFFFF",
};

const inventoryThemePresets = [
  { id: "executive", label: "Harbor Navy", primary: "#0B2447", accent: "#0D9488", page: "#F4F6FA", surface: "#FFFFFF" },
  { id: "ocean", label: "Ocean", primary: "#164E63", accent: "#0284C7", page: "#F0F9FF", surface: "#FFFFFF" },
  { id: "emerald", label: "Emerald", primary: "#134E4A", accent: "#059669", page: "#ECFDF5", surface: "#FFFFFF" },
  { id: "graphite", label: "Graphite", primary: "#1E293B", accent: "#475569", page: "#F1F5F9", surface: "#FFFFFF" },
] as const;

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
  const [customFields, setCustomFields] = useState<ProductCustomFieldDefinition[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryForm, setCategoryForm] = useState({ id: "", category_name: "" });
  const emptyVendorForm = { id: "", name: "", vendor_code: "", contact_person: "", email: "", phone: "", address: "", ntn_number: "", gst_number: "", payment_terms: "", status: "ACTIVE", notes: "" };
  const [vendorForm, setVendorForm] = useState(emptyVendorForm);
  const emptyCustomFieldForm = { id: "", label: "", field_key: "", field_type: "TEXT", applies_to: "PRODUCT", required: false, optionsText: "", sort_order: 0 };
  const [customFieldForm, setCustomFieldForm] = useState(emptyCustomFieldForm);
  const emptyLocationForm = { id: "", location_code: "", warehouse_name: "", room_number: "", rack_number: "", active: true };
  const [locationForm, setLocationForm] = useState(emptyLocationForm);

  const loadSetup = async () => {
    setLoading(true);
    try {
      const [settings, categoryRows, vendorRows, installerRows, customFieldRows, locationRows] = await Promise.all([
        inventoryApi.getMasterSettings().catch(() => ({ company: defaultCompanySettings, inventory: defaultInventorySettings })),
        inventoryApi.getCategories().catch(() => []),
        inventoryApi.getVendors().catch(() => []),
        inventoryApi.getInstallers({ includeInactive: true }).catch(() => []),
        inventoryApi.getProductCustomFields().catch(() => []),
        inventoryApi.getLocations().catch(() => []),
      ]);
      setCompany(settings.company || defaultCompanySettings);
      setInventory({ ...defaultInventorySettings, ...(settings.inventory || {}) });
      setCategories(categoryRows);
      setVendors(vendorRows);
      setInstallers(installerRows);
      setCustomFields(customFieldRows);
      setLocations(locationRows);
    } catch {
      showToast("Master setup data could not be loaded. Please check backend connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  const saveLocation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!locationForm.location_code.trim() || !locationForm.warehouse_name.trim()) {
      showToast("Location code and warehouse name are required.", "error");
      return;
    }
    try {
      if (locationForm.id) await inventoryApi.updateLocation(locationForm.id, locationForm);
      else await inventoryApi.createLocation(locationForm);
      showToast(locationForm.id ? "Storage location updated." : "Storage location added.", "success");
      setLocationForm(emptyLocationForm);
      await loadSetup();
    } catch {
      showToast("Storage location could not be saved. Check that the code and room/rack combination are unique.", "error");
    }
  };

  const toggleLocation = async (locationRow: InventoryLocation) => {
    try {
      await inventoryApi.updateLocation(locationRow.id, { ...locationRow, active: !locationRow.active });
      showToast(locationRow.active ? "Storage location archived." : "Storage location activated.", "success");
      await loadSetup();
    } catch {
      showToast("Storage location status could not be changed.", "error");
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
      window.dispatchEvent(new Event("track360:inventory-theme-updated"));
      showToast("Inventory controls and workspace appearance saved.", "success");
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
      setVendorForm(emptyVendorForm);
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
      showToast("Field technician status updated.", "success");
      loadSetup();
    } catch {
      showToast("Field technician status could not be updated.", "error");
    }
  };

  const saveCustomField = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customFieldForm.label.trim()) return showToast("Field label is required.", "error");
    try {
      await inventoryApi.upsertProductCustomField({
        label: customFieldForm.label.trim(),
        field_key: customFieldForm.field_key.trim() || customFieldForm.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        field_type: customFieldForm.field_type,
        applies_to: customFieldForm.applies_to,
        required: customFieldForm.required,
        sort_order: customFieldForm.sort_order,
        options: customFieldForm.optionsText.split(",").map((option) => option.trim()).filter(Boolean),
      });
      setCustomFieldForm(emptyCustomFieldForm);
      showToast("Custom purchasing/product field saved.", "success");
      loadSetup();
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Custom field could not be saved.", "error");
    }
  };

  const deleteCustomField = async (fieldDef: ProductCustomFieldDefinition) => {
    if (!window.confirm(`Remove custom field "${fieldDef.label}"?`)) return;
    try {
      await inventoryApi.deleteProductCustomField(fieldDef.id);
      showToast("Custom field removed.", "success");
      loadSetup();
    } catch {
      showToast("Custom field could not be removed.", "error");
    }
  };

  const field = (label: string, children: React.ReactNode) => (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>{label}</span>
      {children}
    </label>
  );

  const selectThemePreset = (preset: (typeof inventoryThemePresets)[number]) => {
    setInventory({
      ...inventory,
      theme_preset: preset.id,
      primary_color: preset.primary,
      accent_color: preset.accent,
      page_color: preset.page,
      surface_color: preset.surface,
    });
  };

  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header
        eyebrow="Inventory Administration"
        title="Configuration and Master Data"
        text="Configure company details, inventory controls, categories, vendors, dynamic fields and field-team access."
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

        <SettingsSection title="Workspace Appearance and Inventory Controls" description="Choose an approved visual theme or configure workspace colors, low-stock rules and alert routing.">
          <form onSubmit={saveInventory} style={{ display: "grid", gap: 12 }}>
            <div className="inventory-theme-presets" aria-label="Inventory workspace theme presets">
              {inventoryThemePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`inventory-theme-preset${inventory.theme_preset === preset.id ? " is-active" : ""}`}
                  onClick={() => selectThemePreset(preset)}
                >
                  <span className="inventory-theme-preset__swatches" aria-hidden="true">
                    {[preset.primary, preset.accent, preset.page, preset.surface].map((color, index) => <span key={`${preset.id}-${index}`} style={{ background: color }} />)}
                  </span>
                  <strong>{preset.label}</strong>
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
              {field("Header and Primary Actions", (
                <span className="inventory-color-control">
                  <input type="color" aria-label="Inventory primary color" value={inventory.primary_color} onChange={(e) => setInventory({ ...inventory, theme_preset: "custom", primary_color: e.target.value.toUpperCase() })} />
                  <input style={input} value={inventory.primary_color} onChange={(e) => setInventory({ ...inventory, theme_preset: "custom", primary_color: e.target.value })} />
                </span>
              ))}
              {field("Inventory Accent", (
                <span className="inventory-color-control">
                  <input type="color" aria-label="Inventory accent color" value={inventory.accent_color} onChange={(e) => setInventory({ ...inventory, theme_preset: "custom", accent_color: e.target.value.toUpperCase() })} />
                  <input style={input} value={inventory.accent_color} onChange={(e) => setInventory({ ...inventory, theme_preset: "custom", accent_color: e.target.value })} />
                </span>
              ))}
              {field("Workspace Background", (
                <span className="inventory-color-control">
                  <input type="color" aria-label="Inventory workspace background" value={inventory.page_color} onChange={(e) => setInventory({ ...inventory, theme_preset: "custom", page_color: e.target.value.toUpperCase() })} />
                  <input style={input} value={inventory.page_color} onChange={(e) => setInventory({ ...inventory, theme_preset: "custom", page_color: e.target.value })} />
                </span>
              ))}
              {field("Cards and Forms", (
                <span className="inventory-color-control">
                  <input type="color" aria-label="Inventory surface color" value={inventory.surface_color} onChange={(e) => setInventory({ ...inventory, theme_preset: "custom", surface_color: e.target.value.toUpperCase() })} />
                  <input style={input} value={inventory.surface_color} onChange={(e) => setInventory({ ...inventory, theme_preset: "custom", surface_color: e.target.value })} />
                </span>
              ))}
            </div>
            <div style={{ padding: 14, borderRadius: 8, border: `1px solid ${inventory.accent_color}`, background: inventory.page_color }}>
              <div style={{ padding: "12px 14px", borderRadius: 7, background: inventory.primary_color, color: "#fff", fontWeight: 900 }}>Inventory workspace preview</div>
              <div style={{ marginTop: 8, padding: 12, borderRadius: 7, border: "1px solid rgba(15,23,42,.12)", background: inventory.surface_color, color: "#10213f" }}>
                <span style={{ display: "inline-block", width: 8, height: 8, marginRight: 8, borderRadius: 999, background: inventory.accent_color }} />
                Operational cards, forms and tables use this saved appearance.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
              {field("Default Minimum Stock Threshold", <input type="number" min="0" style={input} value={inventory.default_min_stock_threshold} onChange={(e) => setInventory({ ...inventory, default_min_stock_threshold: Number(e.target.value) || 0 })} />)}
              {field("Low Stock Alert Email", <input type="email" style={input} value={inventory.low_stock_alert_email} onChange={(e) => setInventory({ ...inventory, low_stock_alert_email: e.target.value })} placeholder="warehouse@esspl.com.pk" />)}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary">Save Appearance and Controls</button>
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
          title="Dynamic Product Fields"
          description="Create purchasing/product fields without code changes. These fields appear on the Product Catalog form and are stored in custom attributes."
          action={<Button onClick={() => setCustomFieldForm(emptyCustomFieldForm)} tone="success"><Plus size={15} /> New Field</Button>}
        >
          <form onSubmit={saveCustomField} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr)) auto", gap: 10, marginBottom: 12, alignItems: "end" }}>
            {field("Field Label", <input required style={input} value={customFieldForm.label} onChange={(e) => setCustomFieldForm({ ...customFieldForm, label: e.target.value })} placeholder="Field A, cable type, capacity" />)}
            {field("Field Key", <input style={input} value={customFieldForm.field_key} onChange={(e) => setCustomFieldForm({ ...customFieldForm, field_key: e.target.value })} placeholder="auto if blank" />)}
            {field("Type", (
              <select style={input} value={customFieldForm.field_type} onChange={(e) => setCustomFieldForm({ ...customFieldForm, field_type: e.target.value })}>
                <option value="TEXT">Text</option><option value="NUMBER">Number</option><option value="DATE">Date</option><option value="SELECT">Dropdown</option><option value="BOOLEAN">Yes / No</option>
              </select>
            ))}
            {field("Applies To", (
              <select style={input} value={customFieldForm.applies_to} onChange={(e) => setCustomFieldForm({ ...customFieldForm, applies_to: e.target.value })}>
                <option value="PRODUCT">Product master</option><option value="PURCHASE">Purchasing</option><option value="STOCK_IN">Stock-in</option>
              </select>
            ))}
            {field("Dropdown Options", <input style={input} value={customFieldForm.optionsText} onChange={(e) => setCustomFieldForm({ ...customFieldForm, optionsText: e.target.value })} placeholder="Option 1, Option 2" />)}
            {field("Sort", <input type="number" style={input} value={customFieldForm.sort_order} onChange={(e) => setCustomFieldForm({ ...customFieldForm, sort_order: Number(e.target.value) || 0 })} />)}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 850, color: "#475569" }}>
              <input type="checkbox" checked={customFieldForm.required} onChange={(e) => setCustomFieldForm({ ...customFieldForm, required: e.target.checked })} /> Required
            </label>
            <button type="submit" className="btn btn-primary">Save Field</button>
          </form>
          <DataTable
            columns={["Field", "Key", "Type", "Applies To", "Required", "Action"]}
            rows={customFields.map((fieldDef) => [
              <strong>{fieldDef.label}</strong>,
              fieldDef.field_key,
              fieldDef.field_type,
              fieldDef.applies_to,
              fieldDef.required ? "Yes" : "No",
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button onClick={() => setCustomFieldForm({
                  id: fieldDef.id,
                  label: fieldDef.label || "",
                  field_key: fieldDef.field_key || "",
                  field_type: String(fieldDef.field_type || "TEXT"),
                  applies_to: String(fieldDef.applies_to || "PRODUCT"),
                  required: Boolean(fieldDef.required),
                  optionsText: (fieldDef.options || []).join(", "),
                  sort_order: Number(fieldDef.sort_order || 0),
                })} tone="light">Edit</Button>
                <Button onClick={() => deleteCustomField(fieldDef)} tone="light"><XCircle size={14} /> Delete</Button>
              </div>,
            ])}
            empty={loading ? "Loading custom fields..." : "No custom fields yet."}
          />
        </SettingsSection>

        <SettingsSection
          title="Storage Locations"
          description="Maintain selectable warehouse, room and rack combinations used by products, purchase receipts and stock filters."
          action={<Button onClick={() => setLocationForm(emptyLocationForm)} tone="success"><Plus size={15} /> New Location</Button>}
        >
          <form onSubmit={saveLocation} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr)) auto", gap: 10, marginBottom: 12, alignItems: "end" }}>
            {field("Location Code", <input required style={input} value={locationForm.location_code} onChange={(event) => setLocationForm({ ...locationForm, location_code: event.target.value.toUpperCase() })} placeholder="MAIN-R1-A" />)}
            {field("Warehouse", <input required style={input} value={locationForm.warehouse_name} onChange={(event) => setLocationForm({ ...locationForm, warehouse_name: event.target.value })} placeholder="Main Warehouse" />)}
            {field("Room Number", <input style={input} value={locationForm.room_number} onChange={(event) => setLocationForm({ ...locationForm, room_number: event.target.value })} />)}
            {field("Rack Number", <input style={input} value={locationForm.rack_number} onChange={(event) => setLocationForm({ ...locationForm, rack_number: event.target.value })} />)}
            <button type="submit" className="btn btn-primary">{locationForm.id ? "Update Location" : "Save Location"}</button>
            {locationForm.id && <Button onClick={() => setLocationForm(emptyLocationForm)} tone="light">Cancel</Button>}
          </form>
          <DataTable
            columns={["Code", "Warehouse", "Room", "Rack", "Status", "Actions"]}
            rows={locations.map((locationRow) => [
              <strong>{locationRow.location_code}</strong>,
              locationRow.warehouse_name,
              locationRow.room_number || "-",
              locationRow.rack_number || "-",
              statusChip(locationRow.active ? "ACTIVE" : "INACTIVE"),
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button onClick={() => setLocationForm({
                  id: locationRow.id,
                  location_code: locationRow.location_code,
                  warehouse_name: locationRow.warehouse_name,
                  room_number: locationRow.room_number || "",
                  rack_number: locationRow.rack_number || "",
                  active: locationRow.active,
                })} tone="light">Edit</Button>
                <Button onClick={() => toggleLocation(locationRow)} tone="light">{locationRow.active ? "Archive" : "Activate"}</Button>
              </div>,
            ])}
            empty={loading ? "Loading storage locations..." : "No storage locations configured."}
          />
        </SettingsSection>

        <SettingsSection
          title="Suppliers List"
          description="Suppliers are used by purchase orders and stock receipts."
          action={<Button onClick={() => setVendorForm(emptyVendorForm)} tone="success"><Plus size={15} /> Add New Supplier</Button>}
        >
          <form onSubmit={saveVendor} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr)) auto auto", gap: 10, marginBottom: 12, alignItems: "end" }}>
            {field("Supplier Name", <input required style={input} value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} />)}
            {field("Supplier Code", <input style={input} value={vendorForm.vendor_code} onChange={(e) => setVendorForm({ ...vendorForm, vendor_code: e.target.value })} />)}
            {field("Contact", <input style={input} value={vendorForm.contact_person} onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })} />)}
            {field("Email", <input type="email" style={input} value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />)}
            {field("Phone", <input style={input} value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />)}
            {field("NTN", <input style={input} value={vendorForm.ntn_number} onChange={(e) => setVendorForm({ ...vendorForm, ntn_number: e.target.value })} />)}
            {field("GST", <input style={input} value={vendorForm.gst_number} onChange={(e) => setVendorForm({ ...vendorForm, gst_number: e.target.value })} />)}
            {field("Payment Terms", <input style={input} value={vendorForm.payment_terms} onChange={(e) => setVendorForm({ ...vendorForm, payment_terms: e.target.value })} placeholder="Net 15, COD, advance" />)}
            {field("Status", (
              <select style={input} value={vendorForm.status} onChange={(e) => setVendorForm({ ...vendorForm, status: e.target.value })}>
                <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
              </select>
            ))}
            <button type="submit" className="btn btn-primary">{vendorForm.id ? "Update Supplier" : "Save Supplier"}</button>
            {vendorForm.id && <Button onClick={() => setVendorForm(emptyVendorForm)} tone="light">Cancel</Button>}
          </form>
          <DataTable
            columns={["Supplier", "Contact", "Tax / Terms", "Status", "Edit", "Delete"]}
            rows={vendors.map((vendor) => [
              <div><strong>{vendor.name}</strong><br /><span style={{ color: "#64748b" }}>{vendor.vendor_code || "No supplier code"}</span></div>,
              <div>{vendor.contact_person || "-"}<br /><span style={{ color: "#64748b" }}>{vendor.email || vendor.phone || "-"}</span></div>,
              <div>{vendor.ntn_number || vendor.gst_number || "-"}<br /><span style={{ color: "#64748b" }}>{vendor.payment_terms || "-"}</span></div>,
              statusChip(vendor.status || "ACTIVE"),
              <Button onClick={() => setVendorForm({
                ...emptyVendorForm,
                id: vendor.id,
                name: vendor.name || "",
                vendor_code: vendor.vendor_code || "",
                contact_person: vendor.contact_person || "",
                email: vendor.email || "",
                phone: vendor.phone || "",
                address: vendor.address || "",
                ntn_number: vendor.ntn_number || "",
                gst_number: vendor.gst_number || "",
                payment_terms: vendor.payment_terms || "",
                status: vendor.status || "ACTIVE",
                notes: vendor.notes || "",
              })} tone="light">Edit</Button>,
              <Button onClick={() => deleteVendor(vendor)} tone="light"><XCircle size={14} /> Delete</Button>,
            ])}
            empty={loading ? "Loading suppliers..." : "No suppliers found."}
          />
        </SettingsSection>

        <SettingsSection
          title="Field Team Directory"
          description="Active field technicians can be assigned to approved field service work. User access is managed by Senior Management."
          action={
            canManageInstallerAccounts ? (
              <Button to="/accounts" tone="success"><Plus size={15} /> Add Field Technician</Button>
            ) : (
              <Button onClick={() => showToast("Field technician accounts are created from User Management by Senior Management.", "error")} tone="success">
                <Plus size={15} /> Add Field Technician
              </Button>
            )
          }
        >
          <DataTable
            columns={["Field Technician", "Email", "Phone", "Access Status", "Action"]}
            rows={installers.map((installer) => [
              <strong>{installer.display_name || installer.email}</strong>,
              installer.email || "-",
              installer.phone || "-",
              statusChip(installer.is_active === false ? "INACTIVE" : "ACTIVE"),
              <Button onClick={() => toggleInstaller(installer)} tone="light">
                {installer.is_active === false ? "Activate" : "Deactivate"}
              </Button>,
            ])}
            empty={loading ? "Loading field team..." : "No field technician accounts found."}
          />
        </SettingsSection>
      </div>
    </div>
  );
}

export function InventoryMovementsPage() {
  const { showToast } = useToastContext();
  const [movements, setMovements] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [adjustment, setAdjustment] = useState({ product_id: "", quantity_delta: 0, reason: "" });
  const [q, setQ] = useState("");
  const [movementType, setMovementType] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const load = () => Promise.all([
    inventoryApi.getMovements({ limit: 500 }).catch(() => []),
    inventoryApi.getAdjustments().catch(() => []),
    inventoryApi.getProducts({ limit: 500 }).catch(() => []),
  ]).then(([movementRows, adjustmentRows, productRows]) => {
    setMovements(movementRows);
    setAdjustments(adjustmentRows);
    setProducts(productRows.filter((product) => product.product_type !== "SERVICE"));
  });

  const submitAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adjustment.product_id || Number(adjustment.quantity_delta) === 0 || !adjustment.reason.trim()) {
      showToast("Select a product, enter a non-zero quantity change and provide a reason.", "error");
      return;
    }
    try {
      await inventoryApi.createAdjustment({ ...adjustment, reason: adjustment.reason.trim() });
      setAdjustment({ product_id: "", quantity_delta: 0, reason: "" });
      setShowAdjustment(false);
      showToast("Stock adjustment submitted for independent review.", "success");
      await load();
    } catch {
      showToast("Stock adjustment could not be submitted.", "error");
    }
  };

  const decideAdjustment = async (row: InventoryAdjustment, decision: "APPROVE" | "REJECT") => {
    try {
      await inventoryApi.decideAdjustment(row.id, decision);
      showToast(decision === "APPROVE" ? "Adjustment approved and stock updated." : "Adjustment rejected.", "success");
      await load();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Adjustment decision could not be saved.";
      showToast(message, "error");
    }
  };

  useEffect(() => {
    load();
  }, []);
  useInventoryLiveEvents(load);

  const filtered = movements.filter((movement) => {
    const matchesText = [movement.product_name, movement.serial_number, movement.movement_type, movement.reference_type, movement.notes]
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase());
    return matchesText && (movementType === "ALL" || movement.movement_type === movementType);
  });
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [q, movementType]);
  return (
    <div className="flow-page-shell" style={pageShell}>
      <Header
        eyebrow="Inventory Audit"
        title="Stock Movement Ledger"
        text="Trace every receipt, issue, return and approved adjustment against its source record."
        actions={<Button onClick={() => setShowAdjustment((value) => !value)} tone="success"><Plus size={15} /> Request Adjustment</Button>}
      />
      {showAdjustment && (
        <form onSubmit={submitAdjustment} style={{ ...card, padding: 16, marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, alignItems: "end" }}>
          <label style={formLabel}>Product
            <select required style={input} value={adjustment.product_id} onChange={(event) => setAdjustment({ ...adjustment, product_id: event.target.value })}>
              <option value="">Select stock-managed product</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.product_name} ({product.sku || "No SKU"}) - on hand {product.quantity}</option>)}
            </select>
          </label>
          <label style={formLabel}>Quantity Change
            <input type="number" step="1" style={input} value={adjustment.quantity_delta} onChange={(event) => setAdjustment({ ...adjustment, quantity_delta: Number(event.target.value) || 0 })} placeholder="e.g. -1 or 5" />
          </label>
          <label style={formLabel}>Reason
            <input required style={input} value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} placeholder="Physical count variance, damage, correction..." />
          </label>
          <button type="submit" className="btn btn-primary">Submit for Review</button>
        </form>
      )}
      <div style={{ ...card, padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div><strong>Controlled Stock Adjustments</strong><div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>A requester cannot approve their own adjustment; approved changes post to this ledger.</div></div>
          {statusChip(`${adjustments.filter((row) => row.status === "PENDING").length} PENDING`)}
        </div>
        <DataTable
          columns={["Adjustment", "Product", "Change", "Reason", "Requested By", "Status", "Actions"]}
          rows={adjustments.slice(0, 12).map((row) => [
            <strong>{row.adjustment_number}</strong>,
            <div>{row.product_name || "-"}<br /><span style={{ color: "#64748b" }}>{row.sku || "No SKU"}</span></div>,
            <strong style={{ color: Number(row.quantity_delta) > 0 ? "#047857" : "#b91c1c" }}>{Number(row.quantity_delta) > 0 ? "+" : ""}{row.quantity_delta}</strong>,
            row.reason,
            row.requested_by_email || "System user",
            statusChip(row.status),
            row.status === "PENDING" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <Button onClick={() => decideAdjustment(row, "APPROVE")} tone="success">Approve</Button>
                <Button onClick={() => decideAdjustment(row, "REJECT")} tone="light">Reject</Button>
              </div>
            ) : row.approved_by_email || "-",
          ])}
          empty="No stock adjustment requests."
        />
      </div>
      <div style={{ ...card, padding: 14, marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search product, serial, reference or notes" />
        <select aria-label="Filter movement type" value={movementType} onChange={(event) => setMovementType(event.target.value)} style={{ ...input, width: 190 }}>
          <option value="ALL">All movement types</option>
          <option value="STOCK_IN">Stock received</option>
          <option value="STOCK_OUT">Stock issued</option>
          <option value="RETURN">Material returned</option>
          <option value="ADJUSTMENT">Stock adjustment</option>
        </select>
        <Button onClick={load} tone="light"><RefreshCw size={15} /> Refresh</Button>
      </div>
      <DataTable
        columns={["Date", "Product", "Movement", "Quantity", "Reference", "Notes"]}
        rows={pageRows.map((movement) => [
          movement.created_at ? new Date(movement.created_at).toLocaleString() : "-",
          movement.product_name || movement.serial_number || "-",
          statusChip(movement.movement_type),
          movement.quantity,
          movement.reference_type || "-",
          movement.notes || "-",
        ])}
        empty="No stock movements yet."
      />
      <TablePager page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
    </div>
  );
}
