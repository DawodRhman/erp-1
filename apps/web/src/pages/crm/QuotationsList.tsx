import React, { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Eye, FileText, Pencil, RefreshCw, Send } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToastContext } from "../../context/ToastContext";
import { useAuthStore } from "../../store/useAuthStore";
import { CrmButton, EmptyState, ErrorState, LoadingState, PageHeader, card, copyText, crmPage, dateText, input, money, statusBadge, tableWrap, td, th } from "./CrmShared";
import { CrmQuotation, approvalLink, crmApi, quotationDeliveryNotice, quotationEmailSetupPending } from "./crmApi";

const statuses = ["ALL", "DRAFT", "MANAGEMENT_PENDING", "MANAGEMENT_APPROVED", "SENT", "APPROVED", "REJECTED", "EXPIRED"] as const;

function quotationSortNumber(value?: string) {
  const match = String(value || "").match(/(\d+)$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export default function QuotationsList() {
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const activeRole = useAuthStore((state) => state.activeRole);
  const canApproveManagement = activeRole === "super_admin" || activeRole === "inv_fin_admin";
  const [searchParams] = useSearchParams();
  const [quotations, setQuotations] = useState<CrmQuotation[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(searchParams.get("status") || "ALL");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = async (silent = false) => {
    if (!silent) { setLoading(true); setError(""); }
    try {
      const params = status !== "ALL" ? { status } : undefined;
      setQuotations(await crmApi.listQuotations(params));
    } catch {
      if (!silent) setError("Quotation list could not be loaded. Saved quotations should appear here after saving.");
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
      const saved = quote.status === "SENT" ? await crmApi.sendQuotationEmail(quote.id) : await crmApi.updateQuotationStatus(quote.id, "SENT");
      const notice = quotationDeliveryNotice(saved);
      showToast(notice.message, notice.type);
      load();
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || "Quotation could not be sent.", "error");
    } finally {
      setBusyId("");
    }
  };

  const updateWorkflowStatus = async (quote: CrmQuotation, status: CrmQuotation["status"]) => {
    setBusyId(quote.id);
    try {
      await crmApi.updateQuotationStatus(quote.id, status);
      showToast(
        status === "MANAGEMENT_PENDING"
          ? "Quotation submitted for management approval."
          : status === "MANAGEMENT_APPROVED"
            ? "Management approval saved. Next: send to client review."
            : "Quotation status updated.",
        "success",
      );
      load();
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || "Quotation status could not be updated.", "error");
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
    if (quote.status === "DRAFT") return "Draft: submit for management approval";
    if (quote.status === "MANAGEMENT_PENDING") return "Waiting for senior management approval";
    if (quote.status === "MANAGEMENT_APPROVED") return "Management approved: send to client";
    if (quote.status === "SENT") return quotationEmailSetupPending(quote) ? "Share client link for approval" : quote.email_delivery_status === "FAILED" ? `Email not sent: ${quote.email_error || "Retry email"}` : "Waiting for client approval";
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
          <CrmButton disabled={disabled} onClick={() => updateWorkflowStatus(quote, "MANAGEMENT_PENDING")}><Send size={14} /> Submit for Approval</CrmButton>
        </>
      );
    }
    if (quote.status === "MANAGEMENT_PENDING") {
      return (
        <>
          <CrmButton to={`/crm/quotations/${quote.id}`} tone="light"><Eye size={14} /> View</CrmButton>
          {canApproveManagement
            ? <CrmButton disabled={disabled} onClick={() => updateWorkflowStatus(quote, "MANAGEMENT_APPROVED")} tone="success"><FileText size={14} /> Approve as Management</CrmButton>
            : <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>Senior management action required</span>}
        </>
      );
    }
    if (quote.status === "MANAGEMENT_APPROVED") {
      return (
        <>
          <CrmButton to={`/crm/quotations/${quote.id}`} tone="light"><Eye size={14} /> View</CrmButton>
          <CrmButton disabled={disabled} onClick={() => sendQuotation(quote)}><Send size={14} /> Send to Client</CrmButton>
        </>
      );
    }
    if (quote.status === "SENT") {
      return (
        <>
          <CrmButton to={`/crm/quotations/${quote.id}`} tone="light"><Eye size={14} /> View</CrmButton>
          <CrmButton disabled={!quote.client_approval_token} onClick={() => openClientApproval(quote)} tone="dark"><ExternalLink size={14} /> Open Client Approval</CrmButton>
          {!quotationEmailSetupPending(quote) ? <CrmButton disabled={disabled} onClick={() => sendQuotation(quote)} tone="light"><RefreshCw size={14} /> Resend</CrmButton> : null}
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
        <CrmButton onClick={() => load()} tone="light"><RefreshCw size={14} /> Refresh</CrmButton>
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
