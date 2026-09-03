import React, { useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, Search, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { CrmButton, EmptyState, ErrorState, LoadingState, PageHeader, card, crmPage, dateText, input, money, statusBadge, tableWrap, td, th } from "./CrmShared";
import { CrmInvoice, crmApi } from "./crmApi";

const statuses = ["ALL", "DRAFT", "ISSUED", "PAID", "CANCELLED"] as const;

export default function InvoicesView() {
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<CrmInvoice[]>([]);
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<CrmInvoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setInvoices(await crmApi.listInvoices(searchParams.get("customer_id") ? { customer_id: searchParams.get("customer_id") } : undefined));
    } catch {
      setError("CRM invoice view could not be loaded. Please check the backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((invoice) =>
      (status === "ALL" || String(invoice.status || "DRAFT").toUpperCase() === status) &&
      (!q || [invoice.invoice_number, invoice.customer_name, invoice.status].join(" ").toLowerCase().includes(q)),
    );
  }, [invoices, query, status]);

  const counts = useMemo(
    () => statuses.reduce<Record<string, number>>((next, item) => {
      next[item] = item === "ALL"
        ? invoices.length
        : invoices.filter((invoice) => String(invoice.status || "DRAFT").toUpperCase() === item).length;
      return next;
    }, {}),
    [invoices],
  );

  const viewInvoice = async (invoice: CrmInvoice) => {
    setSelectedInvoice(invoice);
    setDetailLoading(true);
    try {
      setSelectedInvoice(await crmApi.getInvoice(invoice.id));
    } catch {
      setSelectedInvoice(invoice);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <main style={crmPage}>
      <PageHeader
        eyebrow="CRM invoices"
        title="Invoices View Only"
        text="View client invoices."
        actions={<CrmButton onClick={load} tone="light"><RefreshCw size={14} /> Refresh</CrmButton>}
      />

      <section style={{ ...card, padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <Search size={18} color="#64748b" />
        <input style={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice number, client or status" />
        <select style={{ ...input, maxWidth: 190 }} value={status} onChange={(event) => setStatus(event.target.value)}>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item === "ALL" ? `All statuses (${counts.ALL || 0})` : `${item} (${counts[item] || 0})`}
            </option>
          ))}
        </select>
      </section>

      {selectedInvoice ? (
        <section style={{ ...card, padding: 18, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div>
              <div style={{ textTransform: "uppercase", color: "#2563eb", letterSpacing: 1, fontSize: 12, fontWeight: 950 }}>Invoice detail</div>
              <h2 style={{ margin: "6px 0", fontSize: 22 }}>{selectedInvoice.invoice_number}</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {statusBadge(selectedInvoice.status)}
                <span style={{ color: "#64748b", fontWeight: 850 }}>{selectedInvoice.customer_name || "No client linked"}</span>
              </div>
            </div>
            <CrmButton onClick={() => setSelectedInvoice(null)} tone="light"><X size={14} /> Close</CrmButton>
          </div>
          {detailLoading ? <LoadingState labelText="Loading invoice detail..." /> : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                <div style={{ ...card, padding: 12, boxShadow: "none" }}><strong>Subtotal</strong><br />{money(selectedInvoice.subtotal)}</div>
                <div style={{ ...card, padding: 12, boxShadow: "none" }}><strong>Tax</strong><br />{money(selectedInvoice.tax_amount)}</div>
                <div style={{ ...card, padding: 12, boxShadow: "none" }}><strong>Total</strong><br />{money(selectedInvoice.total_amount)}</div>
                <div style={{ ...card, padding: 12, boxShadow: "none" }}><strong>Created</strong><br />{dateText(selectedInvoice.created_at)}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, color: "#334155" }}>
                <div><strong>Client contact:</strong> {selectedInvoice.customer_email || "-"} / {selectedInvoice.customer_phone || "-"}</div>
                <div><strong>Template:</strong> {selectedInvoice.template_name || "-"} / {selectedInvoice.currency || "PKR"}</div>
                <div><strong>Address:</strong> {selectedInvoice.customer_address || "-"}</div>
                <div><strong>Amount in words:</strong> {selectedInvoice.amount_in_words || "-"}</div>
              </div>
              {selectedInvoice.bill_breakdown ? (
                <section style={{ ...card, padding: 14, boxShadow: "none", display: "grid", gap: 12 }}>
                  <strong style={{ fontSize: 17 }}>Adjusted Bill Breakdown</strong>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                    {[
                      ["Items Installed", selectedInvoice.bill_breakdown.installed_items || []],
                      ["Returns Deducted", selectedInvoice.bill_breakdown.returned_items || []],
                      ["Extra Items Added", selectedInvoice.bill_breakdown.extra_items || []],
                    ].map(([title, rows]) => (
                      <div key={String(title)} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12 }}>
                        <strong>{String(title)}</strong>
                        {(rows as Array<any>).length ? (rows as Array<any>).map((item, index) => (
                          <div key={item.id || index} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8, color: "#475569" }}>
                            <span>{item.product_name || "Inventory item"} x {Number(item.quantity || 0)}</span>
                            <strong>{money(item.amount)}</strong>
                          </div>
                        )) : <div style={{ marginTop: 8, color: "#94a3b8" }}>None</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
                    <div><span style={{ color: "#64748b" }}>Original</span><br /><strong>{money(selectedInvoice.bill_breakdown.original_total ?? selectedInvoice.bill_breakdown.original_amount)}</strong></div>
                    <div><span style={{ color: "#64748b" }}>Returned</span><br /><strong>-{money(selectedInvoice.bill_breakdown.returns_deducted)}</strong></div>
                    <div><span style={{ color: "#64748b" }}>Extra</span><br /><strong>{money(selectedInvoice.bill_breakdown.extra_added)}</strong></div>
                    <div><span style={{ color: "#64748b" }}>Final</span><br /><strong>{money(selectedInvoice.bill_breakdown.final_amount)}</strong></div>
                  </div>
                </section>
              ) : null}
              {selectedInvoice.items?.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={th}>Item</th><th style={th}>Qty</th><th style={th}>Unit Price</th><th style={th}>Tax</th><th style={th}>Total</th></tr></thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={item.id || index}>
                          <td style={td}>{item.description || "-"}</td>
                          <td style={td}>{Number(item.quantity || 0).toLocaleString("en-PK")}</td>
                          <td style={td}>{money(item.unit_price)}</td>
                          <td style={td}>{money(item.tax_amount)}</td>
                          <td style={td}><strong>{money(item.total_with_tax ?? item.total_without_tax)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !selectedInvoice.bill_breakdown ? (
                <EmptyState title="No line items attached" detail="This invoice record is visible, but no item rows were returned for CRM view." />
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {loading ? <LoadingState labelText="Loading invoices..." /> : error ? <ErrorState message={error} /> : filtered.length === 0 ? (
        <EmptyState title="No invoices found" detail="Finance-generated invoices will appear here as read-only CRM records." />
      ) : (
        <section style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Invoice</th><th style={th}>Client</th><th style={th}>Status</th><th style={th}>Subtotal</th><th style={th}>Tax</th><th style={th}>Total</th><th style={th}>Created</th><th style={th}>Actions</th></tr></thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id}>
                  <td style={td}><strong>{invoice.invoice_number}</strong></td>
                  <td style={td}>{invoice.customer_name || "-"}</td>
                  <td style={td}>{statusBadge(invoice.status)}</td>
                  <td style={td}>{money(invoice.subtotal)}</td>
                  <td style={td}>{money(invoice.tax_amount)}</td>
                  <td style={td}><strong>{money(invoice.total_amount)}</strong></td>
                  <td style={td}>{dateText(invoice.created_at)}</td>
                  <td style={td}>
                    <CrmButton onClick={() => viewInvoice(invoice)} tone="light"><Eye size={14} /> View</CrmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
