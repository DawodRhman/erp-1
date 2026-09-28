import React, { useEffect, useMemo, useState } from "react";
import { Eye, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useToastContext } from "../../context/ToastContext";
import { CrmButton, EmptyState, ErrorState, LoadingState, PageHeader, card, crmPage, input, statusBadge, tableWrap, td, th } from "./CrmShared";
import { CrmCustomer, crmApi } from "./crmApi";

export default function ClientsList() {
  const { showToast } = useToastContext();
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setCustomers(await crmApi.listCustomers());
    } catch {
      setError("Clients could not be loaded. Please check the backend connection or CRM permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) =>
      [customer.customer_name, customer.contact_person, customer.email, customer.phone, customer.address]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [customers, query]);

  const removeCustomer = async (customer: CrmCustomer) => {
    if (!window.confirm(`Delete client "${customer.customer_name}"? Linked quotations/invoices can block this safely.`)) return;
    try {
      await crmApi.deleteCustomer(customer.id);
      showToast("Client deleted.", "success");
      load();
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || "Client could not be deleted.", "error");
    }
  };

  const clientStatus = (customer: CrmCustomer) => {
    const status = String(customer.status || "").toUpperCase();
    if (status === "INACTIVE" || customer.is_active === false || customer.deleted_at || customer.disabled_at) {
      return "INACTIVE";
    }
    return "ACTIVE";
  };

  return (
    <main style={crmPage}>
      <PageHeader
        eyebrow="CRM clients"
        title="Client Directory"
        text="Manage clients and linked activity."
        actions={
          <CrmButton to="/crm/clients/new" tone="success">
            <Plus size={16} /> Add Client
          </CrmButton>
        }
      />

      <section style={{ ...card, padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <Search size={18} color="#64748b" />
        <input style={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search client name, email, phone or address" />
      </section>

      {loading ? <LoadingState labelText="Loading clients..." /> : error ? <ErrorState message={error} /> : filtered.length === 0 ? (
        <EmptyState title="No clients found" detail="Register a new client first, then create a quotation from that client profile." />
      ) : (
        <section style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Client / Company</th>
                <th style={th}>Contact</th>
                <th style={th}>Email</th>
                <th style={th}>Phone</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id}>
                  <td style={td}>
                    <strong>{customer.customer_name}</strong>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{customer.company_name || customer.customer_type || "Corporate client"}</div>
                  </td>
                  <td style={td}>{customer.contact_person || "-"}</td>
                  <td style={td}>{customer.email || "-"}</td>
                  <td style={td}>{customer.phone || "-"}</td>
                  <td style={td}>{statusBadge(clientStatus(customer))}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <CrmButton to={`/crm/clients/${customer.id}`} tone="light"><Eye size={14} /> View</CrmButton>
                      <CrmButton to={`/crm/clients/${customer.id}/edit`} tone="light"><Pencil size={14} /> Edit</CrmButton>
                      <CrmButton to={`/crm/quotations/new?customerId=${customer.id}`} tone="primary"><FileText size={14} /> Quote</CrmButton>
                      <CrmButton tone="danger" onClick={() => removeCustomer(customer)}><Trash2 size={14} /> Delete</CrmButton>
                    </div>
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
