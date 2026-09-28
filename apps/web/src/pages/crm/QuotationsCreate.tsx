import React, { useEffect, useMemo, useRef, useState } from "react";
import { FilePlus2, PackageSearch, Plus, Save, Send, Trash2, X } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useToastContext } from "../../context/ToastContext";
import { clientCategoryLabel, normalizeClientCategory, serviceSummary } from "../../utils/customerProfile";
import TaxRateControl from "../../components/common/TaxRateControl";
import SearchableSelect from "../../components/common/SearchableSelect";
import {
  CrmButton,
  ErrorState,
  LoadingState,
  PageHeader,
  card,
  crmPage,
  input,
  label,
  money,
  tableWrap,
  td,
  th,
} from "./CrmShared";
import { CrmCustomer, CrmProduct, CrmQuotationItem, crmApi, makeIdempotencyKey, productPrice } from "./crmApi";

type DraftLine = {
  rowId: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  source: "product" | "custom";
};

const priceTiers = [
  { value: "TIER_A", label: "Tier A / Standard" },
  { value: "TIER_B", label: "Tier B / Corporate" },
  { value: "TIER_C", label: "Tier C / Government" },
  { value: "TIER_D", label: "Tier D / Special" },
];

const templates = ["HBL Sales Tax Invoice", "Standard Service Quotation", "Custom Client Quotation"];

function errorMessage(err: any, fallback: string) {
  return err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || fallback;
}

function newRow(overrides: Partial<DraftLine> = {}): DraftLine {
  return {
    rowId: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    product_id: null,
    description: "",
    quantity: 1,
    unit_price: 0,
    source: "custom",
    ...overrides,
  };
}

function toLine(item: CrmQuotationItem): DraftLine {
  return newRow({
    product_id: item.product_id || null,
    description: item.description || item.item_description || item.product_name || "",
    quantity: Number(item.quantity || 1),
    unit_price: Number(item.unit_price || 0),
    source: item.product_id ? "product" : "custom",
  });
}

export default function QuotationsCreate() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const editingId = params.id || searchParams.get("quotationId") || "";
  const preselectedCustomerId = searchParams.get("customerId") || "";

  const idempotencyKeyRef = useRef(makeIdempotencyKey("quotation"));
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [products, setProducts] = useState<CrmProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState<"" | "draft" | "approval">("");
  const [generatedOnce, setGeneratedOnce] = useState(false);
  const [form, setForm] = useState({
    customer_id: preselectedCustomerId,
    price_tier: "TIER_A",
    tax_rate: 18,
    template_style: "HBL Sales Tax Invoice",
    terms: "Payment within 30 days of quotation approval.",
    notes: "",
  });
  const [lines, setLines] = useState<DraftLine[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [nextCustomers, nextProducts] = await Promise.all([
          crmApi.listCustomers(),
          crmApi.listProducts({ limit: 500 }),
        ]);
        if (!mounted) return;
        setCustomers(nextCustomers);
        setProducts(nextProducts);

        if (editingId) {
          const quote = await crmApi.getQuotation(editingId);
          if (!mounted) return;
          setForm({
            customer_id: quote.customer_id || "",
            price_tier: quote.price_tier || "TIER_A",
            tax_rate: Number(quote.tax_rate ?? 18),
            template_style: quote.template_style || "HBL Sales Tax Invoice",
            terms: quote.terms || "Payment within 30 days of quotation approval.",
            notes: quote.notes || "",
          });
          setLines((quote.items || []).map(toLine));
          setGeneratedOnce(["MANAGEMENT_PENDING", "MANAGEMENT_APPROVED", "SENT", "APPROVED"].includes(quote.status));
        }
      } catch (err) {
        if (mounted) setError(errorMessage(err, "Quotation form data could not be loaded. Please check the backend connection and try again."));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [editingId]);

  useEffect(() => {
    let active = true;
    const refreshCustomers = async () => {
      try {
        const nextCustomers = await crmApi.listCustomers();
        if (active) setCustomers(nextCustomers);
      } catch {
        // Keep the current list during a background refresh; initial load shows errors.
      }
    };
    const handleFocus = () => refreshCustomers();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshCustomers();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const selectedCustomer = customers.find((customer) => customer.id === form.customer_id);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products
      .filter((product) => !q || [product.product_name, product.description, product.category_name].join(" ").toLowerCase().includes(q))
      .slice(0, 60);
  }, [products, productSearch]);

  const subtotal = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0), 0);
  const taxAmount = (subtotal * Number(form.tax_rate || 0)) / 100;
  const grandTotal = subtotal + taxAmount;

  const updateLine = (rowId: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((line) => (line.rowId === rowId ? { ...line, ...patch } : line)));
  };

  const selectProduct = (product: CrmProduct) => {
    setLines((prev) => [
      ...prev,
      newRow({
        product_id: product.id,
        description: product.product_name,
        quantity: 1,
        unit_price: productPrice(product, form.price_tier),
        source: "product",
      }),
    ]);
    setProductSearch("");
    setShowProductModal(false);
  };

  const changePriceTier = (price_tier: string) => {
    setForm((prev) => ({ ...prev, price_tier }));
    setLines((prev) =>
      prev.map((line) => {
        if (line.source !== "product" || !line.product_id) return line;
        const product = products.find((item) => item.id === line.product_id);
        return product ? { ...line, unit_price: productPrice(product, price_tier) } : line;
      }),
    );
  };

  const validate = (status: "DRAFT" | "MANAGEMENT_PENDING") => {
    if (!form.customer_id) return "Please select a client before saving the quotation.";
    if (!lines.length) return "Add at least one catalog product or custom item.";
    const invalidLine = lines.find((line) => !line.description.trim() || Number(line.quantity || 0) <= 0);
    if (invalidLine) return "Each quotation line must have an item name and a valid quantity.";
    if (status === "MANAGEMENT_PENDING" && lines.some((line) => Number(line.unit_price || 0) <= 0)) {
      return "Submit for Approval requires every item to have a price greater than zero.";
    }
    return "";
  };

  const payload = (status: "DRAFT" | "MANAGEMENT_PENDING") => ({
    ...form,
    status,
    tax_rate: Number(form.tax_rate || 0),
    items: lines.map((line) => ({
      product_id: line.product_id || null,
      description: line.description.trim(),
      quantity: Number(line.quantity || 1),
      unit_price: Number(line.unit_price || 0),
    })),
  });

  const save = async (status: "DRAFT" | "MANAGEMENT_PENDING") => {
    const validation = validate(status);
    if (validation) {
      showToast(validation, "error");
      return;
    }
    if (status === "MANAGEMENT_PENDING" && generatedOnce && !editingId) {
      showToast("This quotation has already been submitted. Duplicate quotation creation is blocked.", "error");
      return;
    }

    setSubmitting(status === "MANAGEMENT_PENDING" ? "approval" : "draft");
    try {
      const saved = editingId
        ? await crmApi.updateQuotation(editingId, payload(status))
        : await crmApi.createQuotation(payload(status), idempotencyKeyRef.current);
      if (status === "MANAGEMENT_PENDING") {
        setGeneratedOnce(true);
        showToast(`${saved.quotation_number || "Quotation"} submitted for management approval.`, "success");
      } else {
        showToast(`Draft ${saved.quotation_number || "quotation"} saved and visible in list.`, "success");
      }
      navigate(`/crm/quotations/${saved.id}`);
    } catch (err: any) {
      showToast(errorMessage(err, "Quotation could not be saved. Please check the backend connection and try again."), "error");
    } finally {
      setSubmitting("");
    }
  };

  if (loading) return <main style={crmPage}><LoadingState labelText="Loading quotation builder..." /></main>;

  return (
    <main style={crmPage}>
      <PageHeader
        eyebrow="CRM quotations"
        title={editingId ? "Edit Quotation" : "Create Quotation"}
        text="Select a client and add quotation items."
        actions={
          <>
            <CrmButton to="/crm/quotations" tone="light">Quotation List</CrmButton>
            <CrmButton onClick={() => save("DRAFT")} disabled={Boolean(submitting)} tone="light">
              <Save size={16} /> {submitting === "draft" ? "Saving..." : "Save as Draft"}
            </CrmButton>
            <CrmButton onClick={() => save("MANAGEMENT_PENDING")} disabled={Boolean(submitting) || (generatedOnce && !editingId)} tone="success">
              <Send size={16} /> {submitting === "approval" ? "Submitting..." : "Submit for Approval"}
            </CrmButton>
          </>
        }
      />

      {error ? <ErrorState message={error} /> : null}

      <form className="crm-builder-layout" onSubmit={(event) => { event.preventDefault(); save("DRAFT"); }}>
        <section className="crm-setup-panel" style={{ ...card, padding: 18, alignSelf: "start" }}>
          <div className="crm-section-title">
            <span>01</span>
            <div><h2>Client & Commercial Details</h2><p>Select the client, pricing tier, tax rate and document template.</p></div>
          </div>
          <div className="crm-setup-fields">
            <div style={label}>
              <span>Select Client *</span>
              <SearchableSelect
                inputStyle={input}
                value={form.customer_id}
                onChange={(customer_id) => setForm((prev) => ({ ...prev, customer_id }))}
                placeholder="Search or select registered client"
                emptyText="No matching client found. Add the client first, then return here."
                options={customers.map((customer) => ({
                  value: customer.id,
                  label: `${customer.customer_name} - ${clientCategoryLabel(normalizeClientCategory(customer))}${customer.email ? ` - ${customer.email}` : customer.phone ? ` - ${customer.phone}` : ""}`,
                  searchText: [customer.customer_name, customer.company_name, customer.email, customer.phone, customer.contact_person,
                    customer.customer_category, customer.organization_type, serviceSummary(customer, ""), customer.service_description].filter(Boolean).join(" "),
                }))}
              />
            </div>
            <label style={label}>Price Tier
              <select style={input} value={form.price_tier} onChange={(e) => changePriceTier(e.target.value)}>
                {priceTiers.map((tier) => <option key={tier.value} value={tier.value}>{tier.label}</option>)}
              </select>
            </label>
            <label style={label}>Template
              <select style={input} value={form.template_style} onChange={(e) => setForm((prev) => ({ ...prev, template_style: e.target.value }))}>
                {templates.map((template) => <option key={template}>{template}</option>)}
              </select>
            </label>
            {selectedCustomer ? (
              <div className="crm-selected-client" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, color: "#334155", fontSize: 13 }}>
                <strong style={{ color: "#0f172a" }}>{selectedCustomer.customer_name}</strong>
                <div>{clientCategoryLabel(normalizeClientCategory(selectedCustomer))}</div>
                <div>{serviceSummary(selectedCustomer, "No service interests recorded")}</div>
                <div>{selectedCustomer.email || "No email saved"}</div>
                <div>{selectedCustomer.phone || "No phone saved"}</div>
              </div>
            ) : <div className="crm-selected-client crm-selected-client-empty">Client details will appear here after selection.</div>}
            <div className="crm-tax-field">
              <TaxRateControl
                value={form.tax_rate}
                onChange={(tax_rate) => setForm((prev) => ({ ...prev, tax_rate }))}
              />
            </div>
            <label className="crm-notes-field" style={label}>Notes
              <textarea style={{ ...input, height: 84, paddingTop: 12 }} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Internal CRM note" />
            </label>
          </div>
        </section>

        <section className="crm-builder-workspace" style={{ display: "grid", gap: 16 }}>
          <div className="crm-section-toolbar" style={{ ...card, padding: 18, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div className="crm-section-title">
              <span>02</span>
              <div>
              <h2>Quotation Items</h2>
              <p style={{ margin: "4px 0 0", color: "#64748b" }}>Product price auto-fills from catalog. Custom items can be typed manually.</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <CrmButton onClick={() => setShowProductModal(true)}><PackageSearch size={16} /> Add Product</CrmButton>
              <CrmButton onClick={() => setLines((prev) => [...prev, newRow()])} tone="light"><Plus size={16} /> Add Custom Item</CrmButton>
            </div>
          </div>

          <section className="crm-data-surface" style={tableWrap}>
            <table className="crm-data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Item</th>
                  <th style={th}>Source</th>
                  <th style={th}>Qty</th>
                  <th style={th}>Unit Price</th>
                  <th style={th}>Line Total</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr><td style={{ ...td, textAlign: "center", color: "#64748b" }} colSpan={6}>Add product from catalog or add a custom purchase-required item.</td></tr>
                ) : lines.map((line) => (
                  <tr key={line.rowId}>
                    <td style={td}>
                      <input
                        style={input}
                        value={line.description}
                        onChange={(e) => updateLine(line.rowId, { description: e.target.value })}
                        readOnly={line.source === "product"}
                      />
                    </td>
                    <td style={td}>{line.source === "product" ? "Catalog product" : "Custom item"}</td>
                    <td style={td}>
                      <input style={{ ...input, maxWidth: 110 }} type="number" min={1} value={line.quantity} onChange={(e) => updateLine(line.rowId, { quantity: Number(e.target.value) })} />
                    </td>
                    <td style={td}>
                      <input
                        style={{ ...input, maxWidth: 150, background: line.source === "product" ? "#f8fafc" : "#fff" }}
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unit_price}
                        readOnly={line.source === "product"}
                        onChange={(e) => updateLine(line.rowId, { unit_price: Number(e.target.value) })}
                      />
                    </td>
                    <td style={td}><strong>{money(Number(line.quantity || 0) * Number(line.unit_price || 0))}</strong></td>
                    <td style={td}>
                      <CrmButton tone="danger" onClick={() => setLines((prev) => prev.filter((item) => item.rowId !== line.rowId))}>
                        <Trash2 size={14} /> Remove
                      </CrmButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="crm-total-grid">
            <div className="crm-total-card"><div>Subtotal</div><strong>{money(subtotal)}</strong><small>Before tax</small></div>
            <div className="crm-total-card tax"><div>GST {form.tax_rate}%</div><strong>{money(taxAmount)}</strong><small>Adjustable tax</small></div>
            <div className="crm-total-card grand"><div>Grand Total</div><strong>{money(grandTotal)}</strong><small>Client payable</small></div>
          </section>
        </section>
      </form>

      {showProductModal ? (
        <div className="crm-modal-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "grid", placeItems: "center", zIndex: 80, padding: 24 }}>
          <section className="crm-product-modal" role="dialog" aria-modal="true" aria-labelledby="crm-product-modal-title" style={{ ...card }}>
            <div style={{ padding: 18, borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" }}>
              <div>
                <h2 id="crm-product-modal-title" style={{ margin: 0 }}>Add Product From Inventory</h2>
                <p style={{ margin: "4px 0 0", color: "#64748b" }}>Select product; price will auto-fill from selected tier.</p>
              </div>
              <CrmButton tone="light" onClick={() => setShowProductModal(false)}><X size={16} /> Close</CrmButton>
            </div>
            <div style={{ padding: 16 }}>
              <input style={input} autoFocus value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search product, category or description" />
            </div>
            <div className="crm-product-list">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => selectProduct(product)}
                  style={{
                    border: "1px solid #dbe4f0",
                    background: "#fff",
                    borderRadius: 10,
                    padding: 14,
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    alignItems: "center",
                    gap: 14,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span>
                    <strong>{product.product_name}</strong>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{product.category_name || product.product_type || "Inventory product"}</div>
                  </span>
                  <span style={{ color: "#64748b" }}>Available: <strong>{Number(product.quantity || 0)}</strong></span>
                  <strong>{money(productPrice(product, form.price_tier))}</strong>
                </button>
              ))}
              {filteredProducts.length === 0 ? <div className="crm-product-empty">No product found. Use custom item for purchase-required items.</div> : null}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
