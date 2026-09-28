import React, { useEffect, useMemo, useState } from "react";
import { Building2, ClipboardList, FileText, Send, ShoppingBag, ShieldCheck } from "lucide-react";
import { CrmButton, ErrorState, LoadingState, MetricCard, PageHeader, card, crmPage } from "./CrmShared";
import { CrmComplaint, CrmCustomer, CrmInvoice, CrmLead, CrmOrder, CrmQuotation, crmApi } from "./crmApi";

export default function CrmDashboard() {
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [quotations, setQuotations] = useState<CrmQuotation[]>([]);
  const [orders, setOrders] = useState<CrmOrder[]>([]);
  const [complaints, setComplaints] = useState<CrmComplaint[]>([]);
  const [invoices, setInvoices] = useState<CrmInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [nextCustomers, nextLeads, nextQuotations, nextOrders, nextComplaints, nextInvoices] = await Promise.all([
          crmApi.listCustomers(),
          crmApi.listLeads(),
          crmApi.listQuotations(),
          crmApi.listOrders(),
          crmApi.listComplaints(),
          crmApi.listInvoices(),
        ]);
        if (!mounted) return;
        setCustomers(nextCustomers);
        setLeads(nextLeads);
        setQuotations(nextQuotations);
        setOrders(nextOrders);
        setComplaints(nextComplaints);
        setInvoices(nextInvoices);
      } catch {
        if (mounted) setError("CRM dashboard data could not be loaded. Please check the backend/API connection.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const counts = useMemo(() => {
    return {
      drafts: quotations.filter((quote) => quote.status === "DRAFT").length,
      sent: quotations.filter((quote) => quote.status === "SENT").length,
      approved: quotations.filter((quote) => quote.status === "APPROVED").length,
      rejected: quotations.filter((quote) => quote.status === "REJECTED").length,
    };
  }, [quotations]);

  return (
    <main style={crmPage} className="crm-page-shell crm-dashboard">
      <PageHeader
        eyebrow="CRM service"
        title="Client Requirement, Quotation and Approval"
        text="Clients, quotations and order activity."
        actions={
          <>
            <CrmButton to="/crm/clients/new" tone="light">
              <Building2 size={16} /> Add Client
            </CrmButton>
            <CrmButton to="/crm/quotations/new" tone="success">
              <FileText size={16} /> New Quotation
            </CrmButton>
          </>
        }
      />

      {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : null}

      <section className="crm-dashboard-metrics" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(170px, 1fr))", gap: 14 }}>
        <MetricCard label="Registered clients" value={customers.length} detail="Open client list" to="/crm/clients" />
        <MetricCard label="Draft quotations" value={counts.drafts} detail="Need CSR action" to="/crm/quotations?status=DRAFT" />
        <MetricCard label="Sent to client" value={counts.sent} detail="Waiting approval" to="/crm/quotations?status=SENT" />
        <MetricCard label="Approved for order" value={counts.approved} detail="Convert to order" to="/crm/quotations?status=APPROVED" />
      </section>

      <section className="crm-dashboard-content" style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 14 }}>
        <div className="crm-journey-panel" style={{ ...card, padding: 20 }}>
          <h2 style={{ margin: 0, fontSize: 19 }}>CRM user journey</h2>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {[
              ["1", "Client requirement comes to CSR/CRM.", "/crm/leads"],
              ["2", "CSR registers/selects client.", "/crm/clients"],
              ["3", "CSR creates quotation with stock products or custom purchase items.", "/crm/quotations/new"],
              ["4", "Generate & Send creates one QT number and one client approval link.", "/crm/quotations"],
              ["5", "Client approves/rejects without login from public link.", "/crm/quotations"],
              ["6", "Approved quotation converts to order and appears in Inventory queue.", "/crm/orders"],
            ].map(([step, text, to]) => (
              <a key={step} href={to} style={{ textDecoration: "none" }}>
                <div className="crm-journey-step" style={{ border: "1px solid #e2e8f0", borderRadius: 9, padding: 14, display: "flex", gap: 12, alignItems: "center", color: "#0f172a" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 999, background: "#dbeafe", color: "#2563eb", display: "grid", placeItems: "center", fontWeight: 950 }}>{step}</span>
                  <strong>{text}</strong>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="crm-health-panel" style={{ ...card, padding: 20, display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 19 }}>Quick health</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span><ClipboardList size={14} /> Leads</span><strong>{leads.length}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span><ShoppingBag size={14} /> Orders</span><strong>{orders.length}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span><ShieldCheck size={14} /> Complaints</span><strong>{complaints.length}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span><Send size={14} /> Invoices view</span><strong>{invoices.length}</strong></div>
          </div>
          <CrmButton to="/crm/orders" tone="dark" style={{ width: "100%" }}>
            Open Orders Tracker
          </CrmButton>
        </div>
      </section>
    </main>
  );
}
