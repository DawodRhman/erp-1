import React, { useEffect, useMemo, useState } from "react";
import { Eye, Plus, RefreshCw, Save, Search, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useToastContext } from "../../context/ToastContext";
import { CrmButton, EmptyState, ErrorState, LoadingState, PageHeader, card, crmPage, dateText, input, label, statusBadge, tableWrap, td, th } from "./CrmShared";
import { CrmComplaint, CrmCustomer, CrmOrder, crmApi } from "./crmApi";

export default function ComplaintsList() {
  const { showToast } = useToastContext();
  const [searchParams] = useSearchParams();
  const [complaints, setComplaints] = useState<CrmComplaint[]>([]);
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [orders, setOrders] = useState<CrmOrder[]>([]);
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<CrmComplaint | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    crm_order_id: "",
    priority: "MEDIUM",
    description: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [nextComplaints, nextCustomers, nextOrders] = await Promise.all([
        crmApi.listComplaints(),
        crmApi.listCustomers(),
        crmApi.listOrders(),
      ]);
      setComplaints(nextComplaints);
      setCustomers(nextCustomers);
      setOrders(nextOrders);
    } catch {
      setError("Complaints could not be loaded. Please check the backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return complaints;
    return complaints.filter((complaint) =>
      [complaint.complaint_no, complaint.customer_name, complaint.order_number, complaint.tracker_serial, complaint.complaint_type, complaint.priority, complaint.status]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [complaints, query]);

  const customerOrders = useMemo(
    () => orders.filter((order) => !form.customer_id || order.customer_id === form.customer_id),
    [orders, form.customer_id],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.customer_id) {
      showToast("Select a client before submitting complaint.", "error");
      return;
    }
    if (!form.description.trim()) {
      showToast("Complaint description is required.", "error");
      return;
    }
    setSaving(true);
    try {
      await crmApi.createComplaint({
        customer_id: form.customer_id,
        crm_order_id: form.crm_order_id || null,
        priority: form.priority,
        complaint_type: "CLIENT_COMPLAINT",
        description: form.description.trim(),
      });
      showToast("Complaint logged successfully.", "success");
      setShowForm(false);
      setForm({ customer_id: "", crm_order_id: "", priority: "MEDIUM", description: "" });
      await load();
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || "Complaint could not be saved.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={crmPage}>
      <PageHeader
        eyebrow="CRM complaints"
        title="Complaints List"
        text="Log and track client complaints."
        actions={
          <>
            <CrmButton onClick={load} tone="light"><RefreshCw size={14} /> Refresh</CrmButton>
            <CrmButton onClick={() => setShowForm((current) => !current)} tone="success">
              {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? "Close Form" : "Log New Complaint"}
            </CrmButton>
          </>
        }
      />

      {showForm ? (
        <form onSubmit={submit} style={{ ...card, padding: 18, display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 180px", gap: 12 }}>
            <label style={label}>Client
              <select
                style={input}
                value={form.customer_id}
                onChange={(event) => setForm((current) => ({ ...current, customer_id: event.target.value, crm_order_id: "" }))}
                required
              >
                <option value="">Search/select client</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customer_name} {customer.email ? `- ${customer.email}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label style={label}>Related Order (optional)
              <select
                style={input}
                value={form.crm_order_id}
                onChange={(event) => setForm((current) => ({ ...current, crm_order_id: event.target.value }))}
              >
                <option value="">No related order</option>
                {customerOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.order_number} / {order.token_number} - {order.customer_name || "Client"}
                  </option>
                ))}
              </select>
            </label>
            <label style={label}>Priority
              <select style={input} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>
          </div>
          <label style={label}>Complaint Description
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              required
              placeholder="Write the client complaint clearly..."
              style={{ ...input, height: 110, paddingTop: 12, resize: "vertical" }}
            />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <CrmButton onClick={() => setShowForm(false)} tone="light">Cancel</CrmButton>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minHeight: 40, borderRadius: 9, fontWeight: 900 }}>
              <Save size={14} /> {saving ? "Submitting..." : "Submit Complaint"}
            </button>
          </div>
        </form>
      ) : null}

      <section style={{ ...card, padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <Search size={18} color="#64748b" />
        <input style={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search complaint no, client, tracker, status" />
      </section>

      {selectedComplaint ? (
        <section style={{ ...card, padding: 18, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div>
              <div style={{ textTransform: "uppercase", color: "#2563eb", letterSpacing: 1, fontSize: 12, fontWeight: 950 }}>Complaint detail</div>
              <h2 style={{ margin: "6px 0", fontSize: 22 }}>{selectedComplaint.complaint_no}</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {statusBadge(selectedComplaint.status)}
                {statusBadge(selectedComplaint.priority || "MEDIUM")}
                <span style={{ color: "#64748b", fontWeight: 850 }}>{selectedComplaint.customer_name || "No client linked"}</span>
              </div>
            </div>
            <CrmButton onClick={() => setSelectedComplaint(null)} tone="light"><X size={14} /> Close</CrmButton>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
            <div style={{ ...card, padding: 12, boxShadow: "none" }}><strong>Client</strong><br />{selectedComplaint.customer_name || "-"}</div>
            <div style={{ ...card, padding: 12, boxShadow: "none" }}><strong>Related order</strong><br />{selectedComplaint.order_number || "-"}</div>
            <div style={{ ...card, padding: 12, boxShadow: "none" }}><strong>Tracker</strong><br />{selectedComplaint.tracker_serial || "-"}</div>
            <div style={{ ...card, padding: 12, boxShadow: "none" }}><strong>Reported</strong><br />{dateText(selectedComplaint.reported_at)}</div>
          </div>
          <div style={{ ...card, padding: 14, boxShadow: "none", background: "#f8fafc" }}>
            <strong>Description</strong>
            <p style={{ margin: "8px 0 0", color: "#334155", lineHeight: 1.6 }}>{selectedComplaint.description || "-"}</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {selectedComplaint.customer_id ? (
              <CrmButton to={`/crm/clients/${selectedComplaint.customer_id}`} tone="light">Open Client</CrmButton>
            ) : null}
            {selectedComplaint.order_number ? (
              <CrmButton to={`/crm/orders?search=${encodeURIComponent(selectedComplaint.order_number)}`} tone="light">Open Order</CrmButton>
            ) : null}
          </div>
        </section>
      ) : null}

      {loading ? <LoadingState labelText="Loading complaints..." /> : error ? <ErrorState message={error} /> : filtered.length === 0 ? (
        <EmptyState title="No complaints found" detail="Inventory/customer support complaints will appear here for CRM visibility." />
      ) : (
        <section style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Complaint</th><th style={th}>Client</th><th style={th}>Order</th><th style={th}>Priority</th><th style={th}>Type</th><th style={th}>Tracker</th><th style={th}>Status</th><th style={th}>Reported</th><th style={th}>Description</th><th style={th}>Actions</th></tr></thead>
            <tbody>
              {filtered.map((complaint) => (
                <tr key={complaint.id}>
                  <td style={td}><strong>{complaint.complaint_no}</strong></td>
                  <td style={td}>{complaint.customer_name || "-"}</td>
                  <td style={td}>{complaint.order_number || "-"}</td>
                  <td style={td}>{complaint.priority || "MEDIUM"}</td>
                  <td style={td}>{complaint.complaint_type || "-"}</td>
                  <td style={td}>{complaint.tracker_serial || "-"}</td>
                  <td style={td}>{statusBadge(complaint.status)}</td>
                  <td style={td}>{dateText(complaint.reported_at)}</td>
                  <td style={td}>{complaint.description || "-"}</td>
                  <td style={td}>
                    <CrmButton onClick={() => setSelectedComplaint(complaint)} tone="light"><Eye size={14} /> View</CrmButton>
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
