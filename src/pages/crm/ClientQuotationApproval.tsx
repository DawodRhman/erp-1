import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CrmButton, EmptyState, ErrorState, LoadingState, card, dateText, money, statusBadge, tableWrap, td, th } from "./CrmShared";
import { CrmQuotation, crmApi } from "./crmApi";

export default function ClientQuotationApproval() {
  const { token } = useParams();
  const [quote, setQuote] = useState<CrmQuotation | null>(null);
  const [clientName, setClientName] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!token) return;
      setLoading(true);
      try {
        const nextQuote = await crmApi.getPublicQuotation(token);
        if (mounted) setQuote(nextQuote);
      } catch {
        if (mounted) setError("Quotation link invalid ya expired hai.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const approve = async () => {
    if (!token || !quote) return;
    setBusy("approve");
    try {
      const saved = await crmApi.approvePublicQuotation(token, {
        client_name: clientName || quote.customer_name || "Client approved",
      });
      setQuote({ ...quote, ...saved, status: "APPROVED" });
    } finally {
      setBusy("");
    }
  };

  const reject = async () => {
    if (!token || !quote || !reason.trim()) return;
    setBusy("reject");
    try {
      const saved = await crmApi.rejectPublicQuotation(token, { rejection_reason: reason.trim() });
      setQuote({ ...quote, ...saved, status: "REJECTED", approval_remarks: reason.trim() });
    } finally {
      setBusy("");
    }
  };

  if (loading) return <main style={{ padding: 40 }}><LoadingState labelText="Loading quotation..." /></main>;
  if (error) return <main style={{ padding: 40 }}><ErrorState message={error} /></main>;
  if (!quote) return <main style={{ padding: 40 }}><EmptyState title="Quotation not found" detail="Please confirm the link with CRM." /></main>;

  const isClosed = ["APPROVED", "REJECTED"].includes(quote.status);

  return (
    <main style={{ minHeight: "100vh", background: "#f1f6ff", padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ ...card, maxWidth: 1100, margin: "0 auto", overflow: "hidden" }}>
        <div style={{ padding: 26, background: "linear-gradient(135deg, #0f172a, #1d4ed8)", color: "#fff" }}>
          <div style={{ textTransform: "uppercase", letterSpacing: 1.4, color: "#bfdbfe", fontWeight: 950, fontSize: 12 }}>Client quotation approval</div>
          <h1 style={{ margin: "8px 0" }}>{quote.quotation_number}</h1>
          <p style={{ margin: 0, color: "#dbeafe" }}>Review the quotation. Approve to move this job to Inventory, or reject with reason for CRM revision.</p>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 16 }}>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div style={{ ...card, padding: 14 }}><div style={{ color: "#64748b", fontWeight: 900 }}>Client</div><strong>{quote.customer_name || "-"}</strong></div>
            <div style={{ ...card, padding: 14 }}><div style={{ color: "#64748b", fontWeight: 900 }}>Status</div>{statusBadge(quote.status)}</div>
            <div style={{ ...card, padding: 14 }}><div style={{ color: "#64748b", fontWeight: 900 }}>Sent</div><strong>{dateText(quote.sent_at)}</strong></div>
            <div style={{ ...card, padding: 14 }}><div style={{ color: "#64748b", fontWeight: 900 }}>Total</div><strong>{money(quote.total_amount)}</strong></div>
          </section>

          <section style={tableWrap}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>#</th><th style={th}>Item</th><th style={th}>Qty</th><th style={th}>Unit Price</th><th style={th}>Line Total</th></tr></thead>
              <tbody>
                {(quote.items || []).map((item, index) => (
                  <tr key={item.id || index}>
                    <td style={td}>{index + 1}</td>
                    <td style={td}><strong>{item.description || item.product_name}</strong></td>
                    <td style={td}>{item.quantity}</td>
                    <td style={td}>{money(item.unit_price)}</td>
                    <td style={td}>{money(item.total_price ?? Number(item.quantity || 0) * Number(item.unit_price || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {isClosed ? (
            <div style={{ ...card, padding: 18, color: quote.status === "APPROVED" ? "#047857" : "#b91c1c", fontWeight: 950 }}>
              This quotation is already {quote.status.toLowerCase()}.
            </div>
          ) : (
            <section style={{ ...card, padding: 18, display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 7, fontSize: 12, color: "#475569", fontWeight: 850 }}>
                Your Name
                <input style={{ height: 42, border: "1px solid #cbd8ea", borderRadius: 9, padding: "0 12px" }} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Approver name" />
              </label>
              <label style={{ display: "grid", gap: 7, fontSize: 12, color: "#475569", fontWeight: 850 }}>
                Rejection Reason
                <textarea style={{ height: 86, border: "1px solid #cbd8ea", borderRadius: 9, padding: 12 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Only required if rejecting" />
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <CrmButton tone="danger" disabled={busy === "reject" || !reason.trim()} onClick={reject}>Reject Quotation</CrmButton>
                <CrmButton tone="success" disabled={busy === "approve"} onClick={approve}>Approve Quotation</CrmButton>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
