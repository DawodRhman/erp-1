import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Barcode,
  Building2,
  CheckCircle2,
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
} from "lucide-react";
import { useToastContext } from "../context/ToastContext";
import { apiClient } from "../services/apiClient";
import {
  FieldDispatch,
  FieldDispatchItem,
  InventoryItem,
  InventoryWorkQueueJob,
  Product,
  PurchaseOrder,
  Vendor,
  inventoryApi,
} from "../services/inventoryService";
import { ClientInvoice, invoicingApi } from "../services/invoicingService";

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
  padding: "24px",
  maxWidth: 1500,
  margin: "0 auto",
  fontFamily: "'Outfit', 'Segoe UI', sans-serif",
};

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe4f0",
  borderRadius: 14,
  boxShadow: "0 12px 28px rgba(15,23,42,.06)",
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
    value.includes("APPROVED") || value.includes("COMPLETED")
      ? ["#dcfce7", "#047857"]
      : value.includes("SENT") || value.includes("DISPATCHED") || value.includes("IN_PROGRESS")
        ? ["#dbeafe", "#1d4ed8"]
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
      style={{
        ...card,
        padding: "24px 28px",
        marginBottom: 18,
        background: "linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#0f766e 100%)",
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
      {actions && <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>{actions}</div>}
    </div>
  );
}

function Button({
  children,
  onClick,
  to,
  tone = "primary",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  to?: string;
  tone?: "primary" | "dark" | "light" | "success";
  disabled?: boolean;
}) {
  const colors = {
    primary: ["#2563eb", "#fff", "none"],
    dark: ["#0f172a", "#fff", "none"],
    success: ["#10b981", "#fff", "none"],
    light: ["#f8fafc", "#334155", "1px solid #cbd5e1"],
  } as const;
  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 13px",
    borderRadius: 10,
    border: colors[tone][2],
    background: colors[tone][0],
    color: colors[tone][1],
    fontSize: 13,
    fontWeight: 850,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: disabled ? 0.55 : 1,
    whiteSpace: "nowrap",
  };
  if (to) return <Link to={to} style={style}>{children}</Link>;
  return <button type="button" onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div style={{ position: "relative", minWidth: 260, flex: "1 1 320px" }}>
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
  rows: React.ReactNode[][];
  empty: string;
}) {
  return (
    <div style={{ ...card, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
        <thead>
          <tr>{columns.map((column) => <th key={column} style={th}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} style={td}>{cell}</td>)}</tr>
          )) : (
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
  const [workQueue, setWorkQueue] = useState<InventoryWorkQueueJob[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [dispatches, setDispatches] = useState<FieldDispatch[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [queueData, productData, itemData, vendorData, poData, dispatchData, invoiceData] = await Promise.all([
        inventoryApi.getWorkQueue().catch(() => []),
        inventoryApi.getProducts({ limit: 500 }).catch(() => []),
        inventoryApi.getItems({ limit: 500 }).catch(() => []),
        inventoryApi.getVendors().catch(() => []),
        inventoryApi.getPurchaseOrders().catch(() => []),
        inventoryApi.getDispatches().catch(() => []),
        invoicingApi.getInvoices().catch(() => []),
      ]);
      setWorkQueue(queueData);
      setProducts(productData);
      setItems(itemData);
      setVendors(vendorData);
      setPurchaseOrders(poData);
      setDispatches(dispatchData);
      setInvoices(invoiceData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { workQueue, products, items, vendors, purchaseOrders, dispatches, invoices, loading, reload: load };
}

function tokenForQuote(quote: Quotation | InventoryWorkQueueJob) {
  const base = "quotation_number" in quote ? quote.quotation_number : quote.id;
  return `TOK-${String(base || "").replace(/[^0-9A-Z]/gi, "").slice(-10).toUpperCase()}`;
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
    <div style={pageShell}>
      <Header
        eyebrow="CSR / CRM Service"
        title="Client Request, Quotation and Approval"
        text="This dashboard only explains the CRM flow. Use the separate pages below to create leads, register clients, create quotations and approve client responses."
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
    showToast("Lead saved. Next step is quotation.", "success");
    reload();
  };

  return (
    <div style={pageShell}>
      <Header eyebrow="CSR / CRM" title="Sales Leads Pipeline" text="Every client inquiry starts here. Keep leads separate from quotation and billing so the flow stays easy." actions={<Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Lead</Button>} />
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
    showToast("Client registered. You can now create a quotation.", "success");
    reload();
  };

  return (
    <div style={pageShell}>
      <Header eyebrow="CSR / CRM" title="Client Directory" text="Every client has a clear section. Select a client from quotation pages and billing pages." actions={<Button onClick={() => setShowForm(true)}><Plus size={16} /> Add Client</Button>} />
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
  const { quotations, reload } = useCrmData();
  const { showToast } = useToastContext();
  const [q, setQ] = useState("");
  const filtered = quotations.filter((quote) => [quote.quotation_number, quote.customer_name, quote.status, quote.template_style].join(" ").toLowerCase().includes(q.toLowerCase()));

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
      showToast(status === "APPROVED" ? "Client approval recorded. Inventory queue received this job." : `Quotation marked ${status}.`, "success");
    }
    reload();
  };

  const copyClientLink = async (quote: Quotation) => {
    const link = clientQuotationUrl(quote.client_approval_token);
    if (!link) return showToast("Client approval link is missing. Click Send first.", "error");
    await navigator.clipboard?.writeText(link).catch(() => undefined);
    showToast("Client approval link copied.", "success");
  };

  return (
    <div style={pageShell}>
      <Header eyebrow="CSR / CRM" title="Quotations Gallery" text="Quotations live here only. Sent and approved jobs automatically guide the next inventory step." actions={<Button to="/crm/quotations/new" tone="success"><Plus size={16} /> New Quotation</Button>} />
      <div style={{ ...card, padding: 14, marginBottom: 14, display: "flex", gap: 12 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search quotation number, client or status" />
      </div>
      <DataTable
        columns={["Quotation", "Client", "Client Approval", "Token / Receipt", "Amount", "Status", "Actions"]}
        rows={filtered.map((quote) => [
          <strong>{quote.quotation_number}</strong>,
          quote.customer_name || "-",
          quote.status === "DRAFT"
            ? <span style={{ color: "#94a3b8" }}>Click Send to generate/share client link</span>
            : <Button onClick={() => copyClientLink(quote)} tone="light"><FileText size={14} /> Copy Approval Link</Button>,
          quote.status === "APPROVED" ? <strong>{tokenForQuote(quote)}</strong> : <span style={{ color: "#94a3b8" }}>Generated after approval</span>,
          money(quote.total_amount),
          statusChip(quote.status),
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button onClick={() => updateStatus(quote.id, "SENT")} tone="light"><ArrowRight size={14} /> Send</Button>
            <Button onClick={() => updateStatus(quote.id, "APPROVED")} tone="success"><CheckCircle2 size={14} /> Client Approved</Button>
            <Button to={`/inventory/queue?quotationId=${quote.id}`} tone="dark"><Package size={14} /> Inventory</Button>
          </div>,
        ])}
        empty="No quotations found."
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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
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
      quotationIdempotencyKeyRef.current = makeIdempotencyKey("quotation");
      showToast(`Quotation saved once as ${response.data?.data?.quotation_number || "new draft"}. Next: send to client from quotations page.`, "success");
      reload();
      navigate("/crm/quotations");
    } finally {
      savingQuotationRef.current = false;
      setSavingQuotation(false);
    }
  };

  return (
    <div style={pageShell}>
      <Header eyebrow="CSR / CRM" title="Create Client Quotation" text="Select available stock from dropdown. If an item is not in stock, type it manually so Inventory knows what must be purchased." />
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
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
          <button type="submit" className="btn btn-primary" disabled={savingQuotation}>{savingQuotation ? "Saving..." : "Save Quotation Draft"}</button>
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
      showToast("Quotation approved. The inventory team can now process this job.", "success");
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
  const { workQueue, products, items, purchaseOrders, dispatches, invoices, loading } = useInventoryFlowData();
  const cards = [
    ["Approved CSR Jobs", workQueue.length, "/inventory/queue", "Client approved jobs waiting for stock action"],
    ["Catalog Products", products.length, "/inventory/products", "Stock master with low-stock visibility"],
    ["Available Serials", items.filter((item) => item.current_status === "AVAILABLE").length, "/inventory/serials", "Barcode/serial items ready to issue"],
    ["Purchase Orders", purchaseOrders.length, "/inventory/purchasing", "Items to buy for quotation gaps"],
    ["Installer Dispatches", dispatches.length, "/inventory/dispatches", "Given to installer and field stock"],
    ["Billing Queue", invoices.length, "/inventory/billing-approval", "Ready for CRM/finance invoice approval"],
  ];
  return (
    <div style={pageShell}>
      <Header eyebrow="Inventory / Logistics Service" title="Stock, Purchase, Dispatch and Billing Control" text="This is the clear inventory command center. Each action opens its own page so the team can follow the exact flow without confusion." actions={<Button to="/inventory/queue" tone="success"><ClipboardCheck size={16} /> Start Queue</Button>} />
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
  const [q, setQ] = useState("");
  const filtered = workQueue.filter((job) => [job.quotation_number, job.customer_name, job.status].join(" ").toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={pageShell}>
      <Header eyebrow="Inventory Step 1" title="Approved Jobs and Client Tokens" text="Once CSR marks client approval, the job appears here. Token/receipt is shown here before stock, purchase or dispatch work starts." actions={<Button onClick={reload} tone="light"><RefreshCw size={15} /> Refresh</Button>} />
      <div style={{ ...card, padding: 14, marginBottom: 14, display: "flex", gap: 12 }}>
        <SearchBox value={q} onChange={setQ} placeholder="Search token, quotation or client" />
      </div>
      <DataTable
        columns={["Token / Receipt", "Quotation", "Client", "Qty", "Amount", "Status", "Next Actions"]}
        rows={filtered.map((job) => [
          <strong>{tokenForQuote(job)}</strong>,
          <strong>{job.quotation_number}</strong>,
          job.customer_name || "-",
          `${job.total_requested_qty || 0} requested`,
          money(job.total_amount),
          statusChip(job.status),
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button to={`/inventory/purchasing?quotationId=${job.id}`} tone="light"><ShoppingCart size={14} /> Purchase Gaps</Button>
            <Button to={`/inventory/dispatches?quotationId=${job.id}`} tone="success"><Wrench size={14} /> Give To Installer</Button>
            <Button to={`/invoice-builder?quotationId=${job.id}`} tone="dark"><ReceiptText size={14} /> Open Billing</Button>
          </div>,
        ])}
        empty="No client approved jobs are waiting."
      />
    </div>
  );
}

export function InventoryProductsPage() {
  const { products, reload } = useInventoryFlowData();
  const [q, setQ] = useState("");
  const filtered = products.filter((product) => [product.product_name, product.category_name, product.product_type].join(" ").toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={pageShell}>
      <Header eyebrow="Inventory Master" title="Product Catalog and Stock Levels" text="All assets, consumables and services stay here. Quotations and invoices pull products from this catalog." actions={<Button to="/inventory" tone="light"><Plus size={15} /> Add Product in old form</Button>} />
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
          money(product.unit_price),
          Number(product.quantity || 0) <= Number(product.min_stock_level || 0) ? <Button to="/inventory/purchasing" tone="light"><ShoppingCart size={14} /> Create PO</Button> : statusChip("IN STOCK"),
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
    <div style={pageShell}>
      <Header eyebrow="Inventory Barcode" title="Serial / IMEI Scan and Assignment" text="Barcode reader support works like keyboard input: scan or type the serial number, then assign it in dispatch. Consumables are marked by quantity." />
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
  const { products, vendors, purchaseOrders, reload } = useInventoryFlowData();
  const { showToast } = useToastContext();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vendor_id: "", product_id: "", quantity: 1, unit_price: 0, order_date: new Date().toISOString().slice(0, 10), expected_delivery_date: "", notes: "" });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await inventoryApi.createPurchaseOrder({
      vendor_id: form.vendor_id || null,
      order_date: form.order_date,
      expected_delivery_date: form.expected_delivery_date || null,
      notes: form.notes,
      items: [{ product_id: form.product_id, quantity: form.quantity, unit_price: form.unit_price }],
    });
    showToast("Purchase order saved and stock-in recorded.", "success");
    setShowForm(false);
    reload();
  };

  return (
    <div style={pageShell}>
      <Header eyebrow="Inventory Step 2" title="Purchase Orders for Missing Items" text="If quotation includes items that are not available, create a purchase order here. PO date and expected delivery stay visible." actions={<Button onClick={() => setShowForm(true)}><Plus size={16} /> New PO</Button>} />
      {showForm && (
        <form onSubmit={submit} style={{ ...card, padding: 18, marginBottom: 14, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <select value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} style={input}>
              <option value="">Select vendor</option>
              {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
            </select>
            <select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} style={input}>
              <option value="">Select product to buy</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}
            </select>
            <input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} style={input} />
            <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) || 1 })} style={input} />
            <input type="number" min="0" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) || 0 })} style={input} />
            <input type="date" value={form.expected_delivery_date} onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })} style={input} />
          </div>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={input} placeholder="Notes / purchase reason" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button tone="light" onClick={() => setShowForm(false)}>Cancel</Button>
            <button type="submit" className="btn btn-primary">Save Purchase Order</button>
          </div>
        </form>
      )}
      <DataTable
        columns={["PO Number", "Vendor", "Date", "Items", "Status", "Amount"]}
        rows={purchaseOrders.map((po) => [
          <strong>{po.po_number}</strong>,
          po.vendor_name || "-",
          po.order_date || "-",
          `${po.item_count || 0} lines`,
          statusChip(po.status),
          money(po.total_amount),
        ])}
        empty="No purchase orders yet."
      />
    </div>
  );
}

export function InventoryDispatchesPage() {
  const { workQueue, products, items, dispatches, reload } = useInventoryFlowData();
  const { showToast } = useToastContext();
  const params = new URLSearchParams(window.location.search);
  const [showForm, setShowForm] = useState(Boolean(params.get("quotationId")));
  const [form, setForm] = useState({
    quotation_id: params.get("quotationId") || "",
    customer_id: "",
    site_address: "",
    product_id: "",
    inventory_item_id: "",
    quantity_issued: 1,
    unit_price: 0,
    notes: "",
  });

  const selectedJob = workQueue.find((job) => job.id === form.quotation_id);
  useEffect(() => {
    if (selectedJob && form.customer_id !== selectedJob.customer_id) setForm((current) => ({ ...current, customer_id: selectedJob.customer_id || "" }));
  }, [selectedJob?.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.customer_id) return showToast("Select an approved job first.", "error");
    await inventoryApi.createDispatch({
      quotation_id: form.quotation_id || null,
      customer_id: form.customer_id,
      site_address: form.site_address,
      notes: form.notes,
      items: [{
        product_id: form.product_id || items.find((item) => item.id === form.inventory_item_id)?.product_id || null,
        inventory_item_id: form.inventory_item_id || null,
        quantity_issued: form.quantity_issued,
        unit_price: form.unit_price,
      }],
    });
    showToast("Stock marked given to installer. It is now in installer dispatch account.", "success");
    setShowForm(false);
    reload();
  };

  return (
    <div style={pageShell}>
      <Header eyebrow="Inventory Step 3" title="Give Stock To Installer" text="Create a dispatch when stock is physically handed to installer. Serialized items can be selected by serial/IMEI; consumables are entered by quantity." actions={<Button onClick={() => setShowForm(true)}><Wrench size={16} /> New Dispatch</Button>} />
      {showForm && (
        <form onSubmit={submit} style={{ ...card, padding: 18, marginBottom: 14, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 12 }}>
            <select required value={form.quotation_id} onChange={(e) => setForm({ ...form, quotation_id: e.target.value })} style={input}>
              <option value="">Select approved job/token</option>
              {workQueue.map((job) => <option key={job.id} value={job.id}>{tokenForQuote(job)} - {job.customer_name}</option>)}
            </select>
            <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value, unit_price: Number(products.find((p) => p.id === e.target.value)?.unit_price || 0) })} style={input}>
              <option value="">Consumable/product by quantity</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}
            </select>
            <select value={form.inventory_item_id} onChange={(e) => setForm({ ...form, inventory_item_id: e.target.value })} style={input}>
              <option value="">Serial / barcode item</option>
              {items.filter((item) => item.current_status === "AVAILABLE").map((item) => <option key={item.id} value={item.id}>{item.product_name} - {item.serial_number || item.imei}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: ".7fr .7fr 1.4fr", gap: 12 }}>
            <input type="number" min="1" value={form.quantity_issued} onChange={(e) => setForm({ ...form, quantity_issued: Number(e.target.value) || 1 })} style={input} />
            <input type="number" min="0" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) || 0 })} style={input} />
            <input value={form.site_address} onChange={(e) => setForm({ ...form, site_address: e.target.value })} style={input} placeholder="Site / branch address" />
          </div>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={input} placeholder="Dispatch notes" />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button tone="light" onClick={() => setShowForm(false)}>Cancel</Button>
            <button type="submit" className="btn btn-primary">Mark Given To Installer</button>
          </div>
        </form>
      )}
      <DataTable
        columns={["Dispatch", "Client", "Quotation", "Installer", "Status", "Next"]}
        rows={dispatches.map((dispatch) => [
          <strong>{dispatch.dispatch_number}</strong>,
          dispatch.customer_name || "-",
          dispatch.quotation_number || "-",
          dispatch.installer_email || "Installer account not selected",
          statusChip(dispatch.status),
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button to={`/inventory/returns?dispatchId=${dispatch.id}`} tone="light"><Undo2 size={14} /> Returns</Button>
            <Button to={`/invoice-builder?dispatchId=${dispatch.id}`} tone="dark"><ReceiptText size={14} /> Invoice</Button>
          </div>,
        ])}
        empty="No installer dispatches yet."
      />
    </div>
  );
}

export function InstallerReturnsPage() {
  const { dispatches, reload } = useInventoryFlowData();
  const { showToast } = useToastContext();
  const params = new URLSearchParams(window.location.search);
  const [dispatchId, setDispatchId] = useState(params.get("dispatchId") || "");
  const [dispatchDetail, setDispatchDetail] = useState<FieldDispatch | null>(null);
  const [items, setItems] = useState<FieldDispatchItem[]>([]);
  const [fieldPurchase, setFieldPurchase] = useState({ item_description: "", vendor_name: "", amount: 0, notes: "" });
  const selectedDispatch = dispatches.find((dispatch) => dispatch.id === dispatchId);

  const loadDispatch = async (id: string) => {
    if (!id) return;
    const detail = await inventoryApi.getDispatch(id);
    setDispatchDetail(detail);
    setItems((detail.items || []).map((item) => ({
      ...item,
      quantity_used: item.quantity_used || item.quantity_issued || 0,
      quantity_returned: item.quantity_returned || 0,
    })));
  };

  useEffect(() => {
    loadDispatch(dispatchId);
  }, [dispatchId]);

  const updateItem = (index: number, patch: Partial<FieldDispatchItem>) => {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const submit = async () => {
    if (!dispatchId) return showToast("Select a dispatch first.", "error");
    await inventoryApi.reconcileDispatch(dispatchId, {
      items,
      on_the_go_purchases: fieldPurchase.item_description ? [fieldPurchase] : [],
      notes: "Installer return and field reconciliation completed.",
    });
    showToast("Installer return adjusted. Used stock, returned stock and field purchases are saved.", "success");
    reload();
    loadDispatch(dispatchId);
  };

  return (
    <div style={pageShell}>
      <Header eyebrow="Installer Step" title="Installer Return and Bill Adjustment" text="After installation, unused items come back here. Add field purchases or extra consumables, then reconcile before CRM billing approval." />
      <div style={{ ...card, padding: 18, marginBottom: 14 }}>
        <label>
          <span style={{ fontSize: 12, fontWeight: 900, color: "#475569" }}>Dispatch</span>
          <select value={dispatchId} onChange={(e) => setDispatchId(e.target.value)} style={input}>
            <option value="">Select installer dispatch</option>
            {dispatches.map((dispatch) => <option key={dispatch.id} value={dispatch.id}>{dispatch.dispatch_number} - {dispatch.customer_name}</option>)}
          </select>
        </label>
      </div>
      {selectedDispatch && dispatchDetail && (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ ...card, padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>{selectedDispatch.customer_name} return sheet</h3>
            <DataTable
              columns={["Item", "Issued", "Used / Installed", "Returned", "Notes"]}
              rows={items.map((item, index) => [
                <strong>{item.product_name || item.serial_number || item.imei || "Dispatch item"}</strong>,
                item.quantity_issued,
                <input type="number" min="0" value={item.quantity_used || 0} onChange={(e) => updateItem(index, { quantity_used: Number(e.target.value) || 0 })} style={input} />,
                <input type="number" min="0" value={item.quantity_returned || 0} onChange={(e) => updateItem(index, { quantity_returned: Number(e.target.value) || 0 })} style={input} />,
                <input value={item.notes || ""} onChange={(e) => updateItem(index, { notes: e.target.value })} style={input} />,
              ])}
              empty="This dispatch has no items."
            />
          </div>
          <div style={{ ...card, padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>Extra field purchase / addition</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr .7fr 1fr", gap: 10 }}>
              <input style={input} placeholder="Extra item description" value={fieldPurchase.item_description} onChange={(e) => setFieldPurchase({ ...fieldPurchase, item_description: e.target.value })} />
              <input style={input} placeholder="Vendor/shop" value={fieldPurchase.vendor_name} onChange={(e) => setFieldPurchase({ ...fieldPurchase, vendor_name: e.target.value })} />
              <input type="number" style={input} placeholder="Amount" value={fieldPurchase.amount} onChange={(e) => setFieldPurchase({ ...fieldPurchase, amount: Number(e.target.value) || 0 })} />
              <input style={input} placeholder="Notes" value={fieldPurchase.notes} onChange={(e) => setFieldPurchase({ ...fieldPurchase, notes: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={submit} tone="success"><CheckCircle2 size={16} /> Complete Reconciliation</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function InventoryBillingApprovalPage() {
  const { dispatches, invoices } = useInventoryFlowData();
  return (
    <div style={pageShell}>
      <Header eyebrow="CRM Billing Approval" title="Billing Approval Queue" text="CRM reviews reconciled installer work, confirms billing, then finance generates the final invoice." />
      <DataTable
        columns={["Source", "Client", "Status", "Billing Action"]}
        rows={[
          ...dispatches.map((dispatch) => [
            <strong>{dispatch.dispatch_number}</strong>,
            dispatch.customer_name || "-",
            statusChip(dispatch.status),
            <Button to={`/invoice-builder?dispatchId=${dispatch.id}`} tone="dark"><ReceiptText size={14} /> Generate Invoice</Button>,
          ]),
          ...invoices.map((invoice) => [
            <strong>{invoice.invoice_number}</strong>,
            invoice.customer_name || "-",
            statusChip(invoice.status),
            <Button to="/client-invoicing" tone="light"><FileText size={14} /> View Finance Ledger</Button>,
          ]),
        ]}
        empty="No billing records yet."
      />
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
    <div style={pageShell}>
      <Header eyebrow="Inventory Ledger" title="Stock Movement Ledger" text="Every stock-in, stock-out, dispatch and return movement is visible here for audit." />
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
