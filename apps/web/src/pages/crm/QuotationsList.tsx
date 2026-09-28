import React, { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Eye, FileText, Pencil, RefreshCw, Send } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToastContext } from "../../context/ToastContext";
import { CrmButton, EmptyState, ErrorState, LoadingState, PageHeader, card, copyText, crmPage, dateText, input, money, statusBadge, tableWrap, td, th } from "./CrmShared";
import { CrmQuotation, approvalLink, crmApi } from "./crmApi";

const statuses = ["ALL", "DRAFT", "SENT", "APPROVED", "REJECTED", "EXPIRED"] as const;

function quotationSortNumber(value?: string) {
  const match = String(value || "").match(/(\d+)$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export default function QuotationsList() {
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const [searchParams] = useSearchParams();
  const [quotations, setQuotations] = useState<CrmQuotation[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(searchParams.get("status") || "ALL");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = status !== "ALL" ? { status } : undefined;
      setQuotations(await crmApi.listQuotations(params));
    } catch {
      setError("Quotation list could not be loaded. Saved quotations should appear here after saving.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const filtered = useMemo(() => {
    const ordered = [...quotations].sort((a, b) => {
      const numberDiff = quotationSortNumber(a.quotation_number) - quotationSortNumber(b.quotation_number);
      if (numberDiff !== 0) return numberDiff;
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    });
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((quote) =>
      [quote.quotation_number, quote.customer_name, quote.customer_email, quote.status, quote.template_style]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [quotations, query]);

  const sendQuotation = async (quote: CrmQuotation) => {
    setBusyId(quote.id);
    try {
      const saved = await crmApi.updateQuotationStatus(quote.id, "SENT");
      const link = approvalLink(saved.client_approval_token || quote.client_approval_token);
      if (link) await copyText(link);
      showToast(link ? "Client approval link copied. Email service can send this link when SMTP is configured." : "Quotation marked as sent.", "success");
      load();
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || "Quotation could not be sent.", "error");
    } finally {
      setBusyId("");
    }
  };

  const convertToOrder = async (quote: CrmQuotation) => {
    setBusyId(quote.id);
    try {
      const order = await crmApi.convertQuotationToOrder(quote.id);
      showToast(`${order.order_number} created. The order is ready in the Inventory queue.`, "success");
      navigate("/crm/orders");
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || "Order conversion could not be completed.", "error");
    } finally {
      setBusyId("");
    }
  };

  const openClientApproval = (quote: CrmQuotation) => {
    if (!quote.client_approval_token) {
      showToast("Client approval link is not available. Send the quotation first.", "error");
      return;
    }
    navigate(`/client/quotations/${encodeURIComponent(quote.client_approval_token)}`);
  };

  const nextStepFor = (quote: CrmQuotation) => {
    if (quote.status === "DRAFT") return "Draft: send it to the client";
    if (quote.status === "SENT") return "Waiting for client approval";
    if (quote.status === "APPROVED") return quote.order_number ? `Order created: ${quote.order_number}` : "Approved: convert to order";
    if (quote.status === "REJECTED") return "Rejected: edit and resend";
    return "Expired: resend to client";
  };

  const actionsFor = (quote: CrmQuotation) => {
    const disabled = busyId === quote.id;
    if (quote.status === "DRAFT") {
      return (
        <>
          <CrmButton to={`/crm/quotations/${quote.id}`} tone="light"><Eye size={14} /> View</CrmButton>
          <CrmButton to={`/crm/quotations/${quote.id}/edit`} tone="light"><Pencil size={14} /> Edit</CrmButton>
          <CrmButton disabled={disabled} onClick={() => sendQuotation(quote)}><Send size={14} /> Send</CrmButton>
        </>
      );
    }
    if (quote.status === "SENT") {
      return (
        <>
          <CrmButton to={`/crm/quotations/${quote.id}`} tone="light"><Eye size={14} /> View</CrmButton>
          <CrmButton disabled={!quote.client_approval_token} onClick={() => openClientApproval(quote)} tone="dark"><ExternalLink size={14} /> Open Client Approval</CrmButton>
          <CrmButton disabled={disabled} onClick={() => sendQuotation(quote)} tone="light"><RefreshCw size={14} /> Resend</CrmButton>
        </>
      );
    }
    if (quote.status === "APPROVED") {
      return (
        <>
          <CrmButton to={`/crm/quotations/${quote.id}`} tone="light"><Eye size={14} /> View</CrmButton>
          {quote.order_number
            ? <CrmButton to="/crm/orders" tone="success"><FileText size={14} /> View {quote.order_number}</CrmButton>
            : <CrmButton disabled={disabled} onClick={() => convertToOrder(quote)} tone="success"><FileText size={14} /> Convert to Order</CrmButton>}
        </>
      );
    }
    if (quote.status === "REJECTED") {
      return (
        <>
          <CrmButton to={`/crm/quotations/${quote.id}`} tone="light"><Eye size={14} /> View</CrmButton>
          <CrmButton to={`/crm/quotations/${quote.id}/edit`} tone="light"><Pencil size={14} /> Edit</CrmButton>
          <CrmButton disabled={disabled} onClick={() => sendQuotation(quote)}><Send size={14} /> Resend</CrmButton>
        </>
      );
    }
    return (
      <>
        <CrmButton to={`/crm/quotations/${quote.id}`} tone="light"><Eye size={14} /> View</CrmButton>
        <CrmButton disabled={disabled} onClick={() => sendQuotation(quote)} tone="light"><RefreshCw size={14} /> Resend</CrmButton>
      </>
    );
  };

  return (
    <main style={crmPage}>
      <PageHeader
        eyebrow="CRM quotations"
        title="Quotation List"
        text="Track quotation status and approvals."
        actions={<CrmButton to="/crm/quotations/new" tone="success"><FileText size={16} /> New Quotation</CrmButton>}
      />

      <section style={{ ...card, padding: 16, display: "grid", gridTemplateColumns: "1fr 220px auto", gap: 12, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 7, fontSize: 12, color: "#475569", fontWeight: 850 }}>Search
          <input style={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search QT number, client or status" />
        </label>
        <label style={{ display: "grid", gap: 7, fontSize: 12, color: "#475569", fontWeight: 850 }}>Status
          <select style={input} value={status} onChange={(e) => setStatus(e.target.value)}>
            {statuses.map((item) => <option key={item} value={item}>{item === "ALL" ? "All statuses" : item}</option>)}
          </select>
        </label>
        <CrmButton onClick={load} tone="light"><RefreshCw size={14} /> Refresh</CrmButton>
      </section>

      {loading ? <LoadingState labelText="Loading quotations..." /> : error ? <ErrorState message={error} /> : filtered.length === 0 ? (
        <EmptyState title="No quotations found" detail="Create a quotation first. It should immediately appear here after Save Draft or Generate & Send." />
      ) : (
        <section style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Quotation</th>
                <th style={th}>Client</th>
                <th style={th}>Status</th>
                <th style={th}>Items</th>
                <th style={th}>Total</th>
                <th style={th}>Client link</th>
                <th style={th}>Next step</th>
                <th style={th}>Created</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((quote) => {
                const link = approvalLink(quote.client_approval_token);
                return (
                  <tr key={quote.id}>
                    <td style={td}><strong>{quote.quotation_number || "Draft quotation"}</strong><div style={{ color: "#64748b", fontSize: 12 }}>{quote.template_style || "Standard"}</div></td>
                    <td style={td}>{quote.customer_name || "-"}</td>
                    <td style={td}>{statusBadge(quote.status)}</td>
                    <td style={td}>{quote.item_count ?? quote.items?.length ?? 0}</td>
                    <td style={td}><strong>{money(quote.total_amount)}</strong></td>
                    <td style={td}>
                      {link ? <CrmButton tone="light" onClick={() => copyText(link).then(() => showToast("Client approval link copied.", "success"))}><Copy size={14} /> Copy</CrmButton> : "-"}
                    </td>
                    <td style={td}><span style={{ color: "#475569", fontWeight: 850 }}>{nextStepFor(quote)}</span></td>
                    <td style={td}>{dateText(quote.created_at)}</td>
                    <td style={td}><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actionsFor(quote)}</div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
