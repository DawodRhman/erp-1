import React, { useEffect, useMemo, useState } from "react";
import { PackageCheck, RefreshCw, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { CrmButton, EmptyState, ErrorState, LoadingState, PageHeader, card, crmPage, dateText, input, money, statusBadge, tableWrap, td, th } from "./CrmShared";
import { CrmOrder, crmApi } from "./crmApi";

export default function OrdersTracker() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<CrmOrder[]>([]);
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setOrders(await crmApi.listOrders());
    } catch {
      setError("Orders tracker could not be loaded. Please check the backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) =>
      [order.order_number, order.token_number, order.quotation_number, order.customer_name, order.status].join(" ").toLowerCase().includes(q),
    );
  }, [orders, query]);

  const nextAction = (order: CrmOrder) => {
    const status = String(order.status || "").toUpperCase();
    if (status === "INVOICED") return <CrmButton to="/crm/invoices" tone="success">View Invoice</CrmButton>;
    if (["BILL_SENT", "BILL_REJECTED"].includes(status)) return <CrmButton to="/crm/invoices" tone="light">Finance Status</CrmButton>;
    if (["COMPLETED", "RETURN_PENDING", "RETURN_CONFIRMED"].includes(status)) return <CrmButton to="/inventory/reconciliation" tone="light">Reconciliation Status</CrmButton>;
    if (status === "DISPATCHED") return <CrmButton to="/inventory/field-service" tone="light">Track Field Service</CrmButton>;
    return <CrmButton to={`/inventory/queue?quotationId=${order.quotation_id}`} tone="light">Inventory Action</CrmButton>;
  };

  return (
    <main style={crmPage}>
      <PageHeader
        eyebrow="CRM orders"
        title="Orders Tracker"
        text="Track orders from approval to billing."
        actions={<CrmButton to="/inventory/queue" tone="success"><PackageCheck size={16} /> Open Inventory Queue</CrmButton>}
      />

      <section style={{ ...card, padding: 16, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Search size={18} color="#64748b" />
          <input style={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search order no, token, quotation or client" />
        </div>
        <CrmButton onClick={load} tone="light"><RefreshCw size={14} /> Refresh</CrmButton>
      </section>

      {loading ? <LoadingState labelText="Loading orders..." /> : error ? <ErrorState message={error} /> : filtered.length === 0 ? (
        <EmptyState title="No orders yet" detail="Open an approved quotation and click Convert to Order. It will appear here and in Inventory queue." />
      ) : (
        <section style={tableWrap}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Order / Token</th>
                <th style={th}>Client</th>
                <th style={th}>Quotation</th>
                <th style={th}>Status</th>
                <th style={th}>Items</th>
                <th style={th}>Amount</th>
                <th style={th}>Created</th>
                <th style={th}>Next Step</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id}>
                  <td style={td}>
                    <strong>{order.order_number}</strong>
                    <div style={{ color: "#2563eb", fontSize: 12, fontWeight: 950 }}>{order.token_number}</div>
                  </td>
                  <td style={td}>{order.customer_name || "-"}</td>
                  <td style={td}>{order.quotation_number || "-"}</td>
                  <td style={td}>{statusBadge(order.status)}</td>
                  <td style={td}>{order.item_count ?? "-"}</td>
                  <td style={td}>{money(order.total_amount)}</td>
                  <td style={td}>{dateText(order.created_at)}</td>
                  <td style={td}>{nextAction(order)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
