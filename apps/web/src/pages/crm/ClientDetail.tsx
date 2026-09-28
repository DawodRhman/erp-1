import React, { useEffect, useMemo, useState } from "react";
import { FileText, Pencil } from "lucide-react";
import { useParams } from "react-router-dom";
import { clientCategoryLabel, normalizeClientCategory, organizationTypeLabel, serviceCategoryLabel } from "../../utils/customerProfile";
import { CrmButton, EmptyState, ErrorState, LoadingState, PageHeader, card, crmPage, dateText, money, statusBadge, tableWrap, td, th } from "./CrmShared";
import { CrmComplaint, CrmCustomer, CrmInvoice, CrmOrder, CrmQuotation, crmApi } from "./crmApi";
import "./clientProfile.css";

type DetailTab = "quotations" | "orders" | "invoices" | "complaints";

export default function ClientDetail() {
  const { id } = useParams();
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [quotations, setQuotations] = useState<CrmQuotation[]>([]);
  const [orders, setOrders] = useState<CrmOrder[]>([]);
  const [invoices, setInvoices] = useState<CrmInvoice[]>([]);
  const [complaints, setComplaints] = useState<CrmComplaint[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>("quotations");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [nextCustomers, nextQuotations, nextOrders, nextInvoices, nextComplaints] = await Promise.all([
          crmApi.listCustomers(),
          crmApi.listQuotations({ customer_id: id }),
          crmApi.listOrders({ customer_id: id }),
          crmApi.listInvoices({ customer_id: id }),
          crmApi.listComplaints(),
        ]);
        if (!mounted) return;
        setCustomers(nextCustomers);
        setQuotations(nextQuotations);
        setOrders(nextOrders);
        setInvoices(nextInvoices);
        setComplaints(nextComplaints.filter((complaint) => complaint.customer_id === id));
      } catch {
        if (mounted) setError("Client profile could not be loaded. Please check the backend connection.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const customer = useMemo(() => customers.find((item) => item.id === id), [customers, id]);

  if (loading) return <main style={crmPage}><LoadingState labelText="Loading client profile..." /></main>;
  if (error) return <main style={crmPage}><ErrorState message={error} /></main>;
  if (!customer) return <main style={crmPage}><EmptyState title="Client not found" detail="Open the client list and select an existing client." /></main>;
  const category = normalizeClientCategory(customer);
  const isIndividual = category === "INDIVIDUAL";
  const services = Array.isArray(customer.service_categories) ? customer.service_categories : [];

  return (
    <main style={crmPage}>
      <PageHeader
        eyebrow="Client profile"
        title={customer.customer_name}
        text="Client activity and linked records."
        actions={
          <>
            <CrmButton to={`/crm/clients/${customer.id}/edit`} tone="light"><Pencil size={16} /> Edit</CrmButton>
            <CrmButton to={`/crm/quotations/new?customerId=${customer.id}`} tone="success"><FileText size={16} /> Create Quotation</CrmButton>
          </>
        }
      />

      <section className="crm-client-profile-grid">
        <div style={{ ...card, padding: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Profile & Contact</h2>
          <dl className="crm-client-profile-details">
            <dt>Client Category</dt><dd>{clientCategoryLabel(category)}</dd>
            {!isIndividual ? <><dt>Organization Type</dt><dd>{organizationTypeLabel(customer.organization_type || customer.customer_type)}</dd></> : null}
            {!isIndividual && customer.company_name ? <><dt>Legal Registered Name</dt><dd>{customer.company_name}</dd></> : null}
            <dt>{isIndividual ? "Alternate Contact" : "Primary Contact"}</dt><dd>{customer.contact_person || "-"}</dd>
            <dt>Email</dt><dd>{customer.email || "-"}</dd>
            <dt>Phone</dt><dd>{customer.phone || "-"}</dd>
            <dt>Address</dt><dd>{customer.address || "-"}</dd>
          </dl>
        </div>
        <div style={{ ...card, padding: 20, display: "grid", gap: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Service Profile</h2>
            <div className="crm-service-chips" style={{ marginTop: 14 }}>
              {services.length ? services.map((service) => <span key={service} className="crm-service-chip">{serviceCategoryLabel(service)}</span>) : <span style={{ color: "#64748b" }}>No service interests recorded.</span>}
            </div>
            {customer.service_description ? <p style={{ margin: "14px 0 0", color: "#334155", lineHeight: 1.55 }}>{customer.service_description}</p> : null}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <div><div style={{ color: "#64748b", fontWeight: 900 }}>Quotations</div><strong style={{ fontSize: 28 }}>{quotations.length}</strong></div>
            <div><div style={{ color: "#64748b", fontWeight: 900 }}>Orders</div><strong style={{ fontSize: 28 }}>{orders.length}</strong></div>
            <div><div style={{ color: "#64748b", fontWeight: 900 }}>Invoices</div><strong style={{ fontSize: 28 }}>{invoices.length}</strong></div>
            <div><div style={{ color: "#64748b", fontWeight: 900 }}>Complaints</div><strong style={{ fontSize: 28 }}>{complaints.length}</strong></div>
          </div>
        </div>
      </section>

      <section style={{ ...card, padding: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {([
          ["quotations", `Quotations (${quotations.length})`],
          ["orders", `Orders (${orders.length})`],
          ["invoices", `Invoices (${invoices.length})`],
          ["complaints", `Complaints (${complaints.length})`],
        ] as const).map(([key, labelText]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            style={{
              border: "1px solid #cbd8ea",
              borderRadius: 9,
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
              background: activeTab === key ? "#2563eb" : "#fff",
              color: activeTab === key ? "#fff" : "#334155",
            }}
          >
            {labelText}
          </button>
        ))}
      </section>

      {activeTab === "quotations" ? (
      <section style={tableWrap}>
        <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0", fontWeight: 950 }}>Client Quotations</div>
        {quotations.length === 0 ? <div style={{ padding: 16 }}><EmptyState title="No quotations" detail="Create the first quotation from this client profile." /></div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Quotation</th><th style={th}>Status</th><th style={th}>Total</th><th style={th}>Created</th><th style={th}>Action</th></tr></thead>
            <tbody>
              {quotations.map((quote) => (
                <tr key={quote.id}>
                  <td style={td}><strong>{quote.quotation_number}</strong></td>
                  <td style={td}>{statusBadge(quote.status)}</td>
                  <td style={td}>{money(quote.total_amount)}</td>
                  <td style={td}>{dateText(quote.created_at)}</td>
                  <td style={td}><CrmButton to={`/crm/quotations/${quote.id}`} tone="light">View</CrmButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      ) : null}

      {activeTab === "orders" ? (
      <section style={tableWrap}>
        <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0", fontWeight: 950 }}>Client Orders</div>
        {orders.length === 0 ? <div style={{ padding: 16, color: "#64748b" }}>No orders converted yet.</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Order</th><th style={th}>Token</th><th style={th}>Quotation</th><th style={th}>Status</th><th style={th}>Amount</th><th style={th}>Action</th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={td}><strong>{order.order_number}</strong></td>
                  <td style={td}>{order.token_number}</td>
                  <td style={td}>{order.quotation_number || "-"}</td>
                  <td style={td}>{statusBadge(order.status)}</td>
                  <td style={td}>{money(order.total_amount)}</td>
                  <td style={td}><CrmButton to={`/crm/orders?search=${encodeURIComponent(order.order_number)}`} tone="light">View</CrmButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      ) : null}

      {activeTab === "invoices" ? (
      <section style={tableWrap}>
        <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0", fontWeight: 950 }}>Client Invoices</div>
        {invoices.length === 0 ? <div style={{ padding: 16, color: "#64748b" }}>No invoices generated yet.</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Invoice</th><th style={th}>Status</th><th style={th}>Amount</th><th style={th}>Created</th><th style={th}>Action</th></tr></thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td style={td}><strong>{invoice.invoice_number}</strong></td>
                  <td style={td}>{statusBadge(invoice.status)}</td>
                  <td style={td}>{money(invoice.total_amount)}</td>
                  <td style={td}>{dateText(invoice.created_at)}</td>
                  <td style={td}><CrmButton to={`/crm/invoices?search=${encodeURIComponent(invoice.invoice_number)}`} tone="light">View</CrmButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      ) : null}

      {activeTab === "complaints" ? (
      <section style={tableWrap}>
        <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0", fontWeight: 950 }}>Client Complaints</div>
        {complaints.length === 0 ? <div style={{ padding: 16, color: "#64748b" }}>No complaints logged yet.</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Complaint</th><th style={th}>Priority</th><th style={th}>Status</th><th style={th}>Reported</th><th style={th}>Action</th></tr></thead>
            <tbody>
              {complaints.map((complaint) => (
                <tr key={complaint.id}>
                  <td style={td}><strong>{complaint.complaint_no}</strong></td>
                  <td style={td}>{complaint.priority || "MEDIUM"}</td>
                  <td style={td}>{statusBadge(complaint.status)}</td>
                  <td style={td}>{dateText(complaint.reported_at)}</td>
                  <td style={td}><CrmButton to={`/crm/complaints?search=${encodeURIComponent(complaint.complaint_no)}`} tone="light">View</CrmButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      ) : null}
    </main>
  );
}
