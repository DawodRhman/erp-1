import React, { useEffect, useState } from "react";
import { Copy, ExternalLink, FileText, Pencil, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToastContext } from "../../context/ToastContext";
import { useAuthStore } from "../../store/useAuthStore";
import { CrmButton, EmptyState, ErrorState, LoadingState, PageHeader, card, copyText, crmPage, dateText, money, statusBadge, tableWrap, td, th } from "./CrmShared";
import { CrmQuotation, approvalLink, crmApi, quotationDeliveryNotice, quotationEmailSetupPending } from "./crmApi";

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const activeRole = useAuthStore((state) => state.activeRole);
  const canApproveManagement = activeRole === "super_admin" || activeRole === "inv_fin_admin";
  const [quote, setQuote] = useState<CrmQuotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = async (silent = false) => {
    if (!id) return;
    if (!silent) { setLoading(true); setError(""); }
    try {
      setQuote(await crmApi.getQuotation(id));
    } catch {
      if (!silent) setError("Quotation detail could not be loaded. Please check the backend connection.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const refresh = () => { if (document.visibilityState === "visible") load(true); };
    const timer = window.setInterval(refresh, 2000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [id]);

  const updateStatus = async (status: "MANAGEMENT_PENDING" | "MANAGEMENT_APPROVED" | "SENT") => {
    if (!quote) return;
    setBusy(status);
    try {
      const saved = status === "SENT" && quote.status === "SENT" ? await crmApi.sendQuotationEmail(quote.id) : await crmApi.updateQuotationStatus(quote.id, status);
      setQuote(saved);
      if (status === "SENT") {
        const notice = quotationDeliveryNotice(saved);
        showToast(notice.message, notice.type);
      } else {
        showToast(status === "MANAGEMENT_PENDING" ? "Quotation submitted for management approval." : "Management approval saved. Next: send to client.", "success");
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || "Quotation could not be updated.", "error");
    } finally {
      setBusy("");
    }
  };

  const convert = async () => {
    if (!quote) return;
    setBusy("ORDER");
    try {
      const order = await crmApi.convertQuotationToOrder(quote.id);
      showToast(`${order.order_number} created for Inventory.`, "success");
      navigate("/crm/orders");
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || "Order could not be created.", "error");
    } finally {
      setBusy("");
    }
  };

  const openClientApproval = () => {
    if (!quote) return;
    if (!quote.client_approval_token) {
      showToast("Client approval link is not available. Send the quotation first.", "error");
      return;
    }
    navigate(`/client/quotations/${encodeURIComponent(quote.client_approval_token)}`);
  };

  if (loading) return <main style={crmPage}><LoadingState labelText="Loading quotation..." /></main>;
  if (error) return <main style={crmPage}><ErrorState message={error} /></main>;
  if (!quote) return <main style={crmPage}><EmptyState title="Quotation not found" detail="Open the quotation list and select an existing quotation." /></main>;

  const clientLink = approvalLink(quote.client_approval_token);
  const manualApproval = quotationEmailSetupPending(quote);
  const itemSubtotal = (quote.items || []).reduce((sum, item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
    const lineTotal = Number(item.total_price || 0);
    return sum + (lineTotal > 0 ? lineTotal : quantity * unitPrice);
  }, 0);
  const savedSubtotal = Number(quote.subtotal || 0);
  const savedTax = Number(quote.tax_amount || 0);
  const subtotal = savedSubtotal > 0 ? savedSubtotal : itemSubtotal;
  const tax = savedTax > 0 ? savedTax : subtotal * (Number(quote.tax_rate || 0) / 100);
  const hasSavedBreakdown = savedSubtotal > 0 || savedTax > 0;
  const savedTotal = Number(quote.total_amount || 0);
  const total = hasSavedBreakdown && savedTotal > 0 ? savedTotal : subtotal + tax;
  const timeline = [
    { label: "Created", date: quote.created_at, active: true },
    { label: "Management", date: quote.management_approved_at, active: ["MANAGEMENT_APPROVED", "SENT", "APPROVED", "REJECTED", "EXPIRED"].includes(quote.status) },
    { label: "Sent", date: quote.sent_at, active: ["SENT", "APPROVED", "REJECTED", "EXPIRED"].includes(quote.status) },
    { label: quote.status === "REJECTED" ? "Rejected" : "Approved", date: quote.status === "REJECTED" ? quote.updated_at : quote.client_approved_at, active: ["APPROVED", "REJECTED"].includes(quote.status) },
  ];
  const flowHint =
    quote.status === "SENT"
      ? "Awaiting client approval. Email status and the approval link are shown below."
      : quote.status === "APPROVED"
        ? quote.order_number
          ? `${quote.order_number} has already been created and is visible in CRM Orders Tracker and Inventory.`
          : "Client has approved this quotation. Convert it to an order so Inventory can receive it in the queue."
        : quote.status === "MANAGEMENT_PENDING"
          ? "This quotation is waiting for senior management approval before it can be sent to the client."
          : quote.status === "MANAGEMENT_APPROVED"
            ? "Senior management has approved this quotation. Send it to the client for review."
            : quote.status === "DRAFT"
          ? "This quotation is still a draft. Submit it for management approval when the details are ready."
          : quote.status === "REJECTED"
            ? "Client rejected this quotation. Edit and resend it with the required changes."
            : "This quotation is expired. Resend it if the client still needs it.";

  return (
    <main style={crmPage}>
      <PageHeader
        eyebrow="Quotation detail"
        title={quote.quotation_number || "Draft quotation"}
        text={flowHint}
        actions={
          <>
            <CrmButton to="/crm/quotations" tone="light">Back to list</CrmButton>
            {quote.status === "DRAFT" ? <CrmButton to={`/crm/quotations/${quote.id}/edit`} tone="light"><Pencil size={16} /> Edit</CrmButton> : null}
            {quote.status === "DRAFT" ? <CrmButton onClick={() => updateStatus("MANAGEMENT_PENDING")} disabled={Boolean(busy)}><Send size={16} /> Submit for Approval</CrmButton> : null}
            {quote.status === "MANAGEMENT_PENDING" && canApproveManagement ? <CrmButton onClick={() => updateStatus("MANAGEMENT_APPROVED")} disabled={Boolean(busy)} tone="success"><FileText size={16} /> Approve as Management</CrmButton> : null}
            {quote.status === "MANAGEMENT_APPROVED" ? <CrmButton onClick={() => updateStatus("SENT")} disabled={Boolean(busy)}><Send size={16} /> Send to Client</CrmButton> : null}
            {quote.status === "SENT" ? <CrmButton onClick={openClientApproval} disabled={!clientLink} tone="dark"><ExternalLink size={16} /> Open Client Approval</CrmButton> : null}
            {quote.status === "SENT" && !manualApproval ? <CrmButton onClick={() => updateStatus("SENT")} disabled={Boolean(busy)} tone="light"><Send size={16} /> Resend</CrmButton> : null}
            {quote.status === "REJECTED" ? <CrmButton to={`/crm/quotations/${quote.id}/edit`} tone="light"><Pencil size={16} /> Edit & Resend</CrmButton> : null}
            {quote.status === "EXPIRED" ? <CrmButton onClick={() => updateStatus("SENT")} disabled={Boolean(busy)} tone="light"><Send size={16} /> Resend</CrmButton> : null}
            {quote.status === "APPROVED" && quote.order_number ? <CrmButton to="/crm/orders" tone="success"><FileText size={16} /> View {quote.order_number}</CrmButton> : null}
            {quote.status === "APPROVED" && !quote.order_number ? <CrmButton onClick={convert} disabled={Boolean(busy)} tone="success"><FileText size={16} /> Convert to Order</CrmButton> : null}
          </>
        }
      />

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ ...card, padding: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Client & Status</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "10px 18px", marginTop: 16 }}>
            <dt style={{ color: "#64748b" }}>QT Number</dt><dd style={{ margin: 0, fontWeight: 900 }}>{quote.quotation_number || "-"}</dd>
            <dt style={{ color: "#64748b" }}>Version</dt><dd style={{ margin: 0, fontWeight: 900 }}>v{quote.version || 1}</dd>
            <dt style={{ color: "#64748b" }}>Client</dt><dd style={{ margin: 0, fontWeight: 900 }}>{quote.customer_name || "-"}</dd>
            <dt style={{ color: "#64748b" }}>Email</dt><dd style={{ margin: 0 }}>{quote.customer_email || "-"}</dd>
            <dt style={{ color: "#64748b" }}>Phone</dt><dd style={{ margin: 0 }}>{quote.customer_phone || "-"}</dd>
            <dt style={{ color: "#64748b" }}>Status</dt><dd style={{ margin: 0 }}>{statusBadge(quote.status)}</dd>
            <dt style={{ color: "#64748b" }}>Sent</dt><dd style={{ margin: 0 }}>{dateText(quote.sent_at)}</dd>
            <dt style={{ color: "#64748b" }}>Approved</dt><dd style={{ margin: 0 }}>{dateText(quote.client_approved_at)}</dd>
            <dt style={{ color: "#64748b" }}>Remarks</dt><dd style={{ margin: 0 }}>{quote.approval_remarks || "-"}</dd>
          </dl>
        </div>
        <div style={{ ...card, padding: 20, display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Client Approval Link</h2>
          <p style={{ margin: 0, color: manualApproval ? "#475569" : quote.email_delivery_status === "FAILED" ? "#b91c1c" : "#64748b" }} role="status">
            {manualApproval ? "Share the client approval link manually. Automatic email setup is pending."
              : quote.email_delivery_status === "SENT" ? `Email submitted to ${quote.email_recipient || quote.customer_email}. ${dateText(quote.email_sent_at)}`
              : quote.email_delivery_status === "FAILED" ? `Email not sent: ${quote.email_error || "Retry sending the quotation."}`
              : quote.email_delivery_status === "SENDING" ? "Sending quotation email..." : "No email has been sent for this quotation yet."}
          </p>
          {quote.status === "SENT" && quote.email_delivery_status === "FAILED" && !manualApproval ? <CrmButton onClick={() => updateStatus("SENT")} disabled={Boolean(busy)}><Send size={16} /> Retry Email</CrmButton> : null}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, wordBreak: "break-all", background: "#f8fafc" }}>{clientLink || "Link token not available"}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <CrmButton tone="dark" onClick={() => copyText(clientLink).then(() => showToast("Client approval link copied.", "success"))} disabled={!clientLink}>
              <Copy size={16} /> Copy Client Link
            </CrmButton>
            <CrmButton tone="light" onClick={openClientApproval} disabled={!clientLink}>
              <ExternalLink size={16} /> Open Client Approval
            </CrmButton>
          </div>
        </div>
      </section>

      <section style={tableWrap}>
        <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0", fontWeight: 950 }}>Quotation Items</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>#</th>
              <th style={th}>Product / Item</th>
              <th style={th}>Description</th>
              <th style={th}>Qty</th>
              <th style={th}>Unit Price</th>
              <th style={th}>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {(quote.items || []).map((item, index) => (
              <tr key={item.id || index}>
                <td style={td}>{index + 1}</td>
                <td style={td}><strong>{item.product_name || item.description}</strong></td>
                <td style={td}>{item.description || item.item_description || "-"}</td>
                <td style={td}>{Number(item.quantity || 0)}</td>
                <td style={td}>{money(item.unit_price)}</td>
                <td style={td}>{money(item.total_price ?? Number(item.quantity || 0) * Number(item.unit_price || 0))}</td>
              </tr>
            ))}
            {!quote.items?.length ? <tr><td style={{ ...td, textAlign: "center", color: "#64748b" }} colSpan={6}>No quotation items found.</td></tr> : null}
          </tbody>
        </table>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <div style={{ ...card, padding: 16 }}><div style={{ color: "#64748b", fontWeight: 900 }}>Subtotal</div><strong style={{ fontSize: 24 }}>{money(subtotal)}</strong></div>
        <div style={{ ...card, padding: 16 }}><div style={{ color: "#64748b", fontWeight: 900 }}>GST</div><strong style={{ fontSize: 24 }}>{money(tax)}</strong></div>
        <div style={{ ...card, padding: 16 }}><div style={{ color: "#64748b", fontWeight: 900 }}>Grand Total</div><strong style={{ fontSize: 24 }}>{money(total)}</strong></div>
      </section>

      <section style={{ ...card, padding: 20, display: "grid", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Notes</h2>
          <p style={{ margin: "8px 0 0", color: "#334155", lineHeight: 1.55 }}>{quote.notes || quote.terms || "No notes added."}</p>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Status Timeline</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 12 }}>
            {timeline.map((step) => (
              <div
                key={step.label}
                style={{
                  border: `1px solid ${step.active ? "#93c5fd" : "#e2e8f0"}`,
                  background: step.active ? "#eff6ff" : "#f8fafc",
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div style={{ color: step.active ? "#1d4ed8" : "#94a3b8", fontWeight: 950 }}>{step.label}</div>
                <div style={{ color: "#475569", marginTop: 6 }}>{dateText(step.date)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
