import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  RefreshCw,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FieldDispatch,
  InventorySummary,
  InventoryWorkQueueJob,
  Product,
  PurchaseOrder,
  ReturnRequest,
  inventoryApi,
} from "../services/inventoryService";
import { useToastContext } from "../context/ToastContext";
import { useInventoryLiveEvents } from "../hooks/useInventoryLiveEvents";

type LoadingState = "idle" | "loading" | "ready" | "error";
type DashboardPeriod = "daily" | "weekly" | "monthly";

const periodOptions: Array<{ value: DashboardPeriod; label: string; detail: string }> = [
  { value: "daily", label: "Daily", detail: "Today" },
  { value: "weekly", label: "Weekly", detail: "Last 7 days" },
  { value: "monthly", label: "Monthly", detail: "This month" },
];

const statusColors: Record<string, { bg: string; color: string }> = {
  APPROVED: { bg: "#dcfce7", color: "#047857" },
  READY_FOR_INVENTORY: { bg: "#e0f2fe", color: "#0369a1" },
  TOKEN_GENERATED: { bg: "#dbeafe", color: "#1d4ed8" },
  STOCK_OK: { bg: "#dcfce7", color: "#047857" },
  RECEIVED: { bg: "#dcfce7", color: "#047857" },
  COMPLETED: { bg: "#dcfce7", color: "#047857" },
  AWAITING_STOCK: { bg: "#fef3c7", color: "#b45309" },
  ORDERED: { bg: "#fef3c7", color: "#b45309" },
  PENDING: { bg: "#fef3c7", color: "#b45309" },
  DISPATCHED: { bg: "#ede9fe", color: "#6d28d9" },
  IN_PROGRESS: { bg: "#ede9fe", color: "#6d28d9" },
};

async function safeLoad<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    console.warn(`Inventory dashboard ${label} load skipped`, error);
    return fallback;
  }
}

function fmt(value?: number) {
  return new Intl.NumberFormat("en-PK").format(Number(value || 0));
}

function dateText(value?: string) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function pill(status?: string) {
  const key = String(status || "PENDING").toUpperCase();
  const colors = statusColors[key] || { bg: "#e2e8f0", color: "#475569" };
  return (
    <span style={{ display: "inline-flex", borderRadius: 999, padding: "5px 8px", fontSize: 10, fontWeight: 900, background: colors.bg, color: colors.color }}>
      {key.replace(/_/g, " ")}
    </span>
  );
}

export default function InventoryDashboard() {
  const { showToast } = useToastContext();
  const [state, setState] = useState<LoadingState>("idle");
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [workQueue, setWorkQueue] = useState<InventoryWorkQueueJob[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [dispatches, setDispatches] = useState<FieldDispatch[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [period, setPeriod] = useState<DashboardPeriod>("monthly");

  const loadDashboard = useCallback(async () => {
    setState("loading");
    const [summaryRes, productRes, queueRes, purchaseOrderRes, dispatchRes, returnRes] = await Promise.all([
      safeLoad<InventorySummary | null>("summary", () => inventoryApi.getSummary({ period }), null),
      safeLoad<Product[]>("products", () => inventoryApi.getProducts({ limit: 500 }), []),
      safeLoad<InventoryWorkQueueJob[]>("incoming orders", () => inventoryApi.getWorkQueue(), []),
      safeLoad<PurchaseOrder[]>("purchase orders", () => inventoryApi.getPurchaseOrders(), []),
      safeLoad<FieldDispatch[]>("field service", () => inventoryApi.getDispatches(), []),
      safeLoad<ReturnRequest[]>("reconciliation", () => inventoryApi.getReturnRequests(), []),
    ]);

    setSummary(summaryRes);
    setProducts(productRes);
    setWorkQueue(queueRes);
    setPurchaseOrders(purchaseOrderRes);
    setDispatches(dispatchRes);
    setReturns(returnRes);

    const unavailable = !summaryRes && productRes.length === 0 && queueRes.length === 0 && purchaseOrderRes.length === 0;
    setState(unavailable ? "error" : "ready");
    if (unavailable) showToast("Inventory dashboard data could not be loaded.", "error");
  }, [period, showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  useInventoryLiveEvents(loadDashboard);

  const stockProducts = useMemo(() => products.filter((product) => product.product_type !== "SERVICE"), [products]);
  const lowStock = useMemo(
    () => stockProducts
      .filter((product) => Number(product.available_count ?? product.quantity ?? 0) <= Number(product.min_stock_level || 0))
      .sort((a, b) => (
        Number(b.min_stock_level || 0) - Number(b.available_count ?? b.quantity ?? 0)
      ) - (
        Number(a.min_stock_level || 0) - Number(a.available_count ?? a.quantity ?? 0)
      )),
    [stockProducts],
  );

  const stockReady = useMemo(
    () => workQueue.filter((job) => String(job.stock_status || job.status || "").toUpperCase() === "STOCK_OK"),
    [workQueue],
  );
  const shortages = useMemo(
    () => workQueue.filter((job) => String(job.stock_status || job.status || "").toUpperCase() === "AWAITING_STOCK"),
    [workQueue],
  );
  const openPurchaseOrders = useMemo(
    () => purchaseOrders.filter((po) => !["RECEIVED", "CANCELLED", "CLOSED"].includes(String(po.status || "").toUpperCase())),
    [purchaseOrders],
  );
  const activeDispatches = useMemo(
    () => dispatches.filter((dispatch) => ["PENDING", "ASSIGNED", "DISPATCHED", "IN_PROGRESS"].includes(String(dispatch.status || "").toUpperCase())),
    [dispatches],
  );
  const pendingReconciliation = useMemo(
    () => returns.filter((request) => !["STOCK_UPDATED", "NO_CHARGE", "BILL_SENT", "CLOSED"].includes(String(request.status || "").toUpperCase())),
    [returns],
  );

  const pendingIncoming = Number(summary?.pending_incoming_orders ?? workQueue.length);
  const activeDispatchCount = Number(summary?.active_dispatches ?? activeDispatches.length);
  const pendingReturnCount = Number(summary?.pending_returns ?? pendingReconciliation.length);
  const periodLabel = periodOptions.find((option) => option.value === period)?.detail || "Selected period";
  const availableUnits = Number(
    summary?.available_stock_qty
      ?? stockProducts.reduce((total, product) => total + Number(product.available_count ?? product.quantity ?? 0), 0),
  );
  const inventoryHealth = useMemo(() => {
    const outOfStock = stockProducts.filter((product) => Number(product.available_count ?? product.quantity ?? 0) <= 0).length;
    const belowThreshold = stockProducts.filter((product) => {
      const available = Number(product.available_count ?? product.quantity ?? 0);
      return available > 0 && available <= Number(product.min_stock_level || 0);
    }).length;
    return {
      healthy: Math.max(0, stockProducts.length - outOfStock - belowThreshold),
      belowThreshold,
      outOfStock,
    };
  }, [stockProducts]);

  const metrics = [
    { label: "Available Stock", value: availableUnits, detail: `${fmt(stockProducts.length)} stock-managed products`, icon: Warehouse, color: "#0f766e", to: "/inventory/products" },
    { label: "Replenishment Required", value: lowStock.length, detail: "Stock-managed products at or below minimum level", icon: AlertTriangle, color: "#d97706", to: "/inventory/products" },
    { label: "Pending Orders", value: pendingIncoming, detail: "Awaiting inventory intake and token control", icon: ClipboardCheck, color: "#2563eb", to: "/inventory/queue" },
    { label: "Open Purchase Orders", value: openPurchaseOrders.length, detail: `${openPurchaseOrders.filter((po) => po.expected_delivery_date).length} expected receipts scheduled`, icon: ShoppingCart, color: "#7c3aed", to: "/inventory/purchasing" },
  ];

  const movementChart = [
    { name: "Received", quantity: Number(summary?.period_stock_in_qty || 0), color: "#0f766e" },
    { name: "Issued", quantity: Number(summary?.period_stock_out_qty || 0), color: "#2563eb" },
    { name: "Returned", quantity: Number(summary?.period_return_qty || 0), color: "#d97706" },
  ];
  const workloadChart = [
    { name: "Incoming", count: pendingIncoming, color: "#2563eb" },
    { name: "Shortage", count: shortages.length, color: "#d97706" },
    { name: "Ready", count: stockReady.length, color: "#0f766e" },
    { name: "In field", count: activeDispatchCount, color: "#7c3aed" },
    { name: "Reconcile", count: pendingReturnCount, color: "#be123c" },
  ];
  const healthChart = [
    { name: "Healthy", value: inventoryHealth.healthy, color: "#0f766e" },
    { name: "Low stock", value: inventoryHealth.belowThreshold, color: "#d97706" },
    { name: "Out of stock", value: inventoryHealth.outOfStock, color: "#dc2626" },
  ];

  const priorityJobs = useMemo(
    () => [...shortages, ...stockReady, ...workQueue.filter((job) => !shortages.includes(job) && !stockReady.includes(job))].slice(0, 6),
    [shortages, stockReady, workQueue],
  );
  const recentDispatches = useMemo(
    () => [...dispatches]
      .sort((a, b) => new Date(b.dispatched_at || b.created_at || 0).getTime() - new Date(a.dispatched_at || a.created_at || 0).getTime())
      .slice(0, 6),
    [dispatches],
  );

  return (
    <main className="inventory-dashboard">
      <header className="inventory-dashboard-hero">
        <div>
          <div className="inventory-dashboard-hero__eyebrow">Inventory and fulfilment workspace</div>
          <h1>Operations Control Centre</h1>
          <p>One live view of approved demand, stock readiness, procurement, field fulfilment and material reconciliation.</p>
        </div>
        <div className="inventory-dashboard-hero__controls">
          <div className="inventory-period-switcher" aria-label="Dashboard reporting period">
            <CalendarDays size={16} />
            {periodOptions.map((option) => (
              <button key={option.value} type="button" className={period === option.value ? "is-active" : ""} onClick={() => setPeriod(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
          <button className="inventory-hero-refresh" type="button" onClick={loadDashboard} disabled={state === "loading"}>
            <RefreshCw size={15} /> {state === "loading" ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </header>

      <section className="inventory-stat-grid" aria-label="Inventory operational metrics">
        {metrics.map((metric) => (
          <Link key={metric.label} to={metric.to} className="inventory-stat-card inventory-surface" style={{ "--metric-color": metric.color } as React.CSSProperties}>
            <div className="inventory-stat-card__top">
              <span className="inventory-stat-card__label">{metric.label}</span>
              <span className="inventory-stat-card__icon"><metric.icon size={17} /></span>
            </div>
            <div className="inventory-stat-card__value">{fmt(metric.value)}</div>
            <div className="inventory-stat-card__detail">{metric.detail}</div>
          </Link>
        ))}
      </section>

      <section className="inventory-chart-grid" aria-label="Inventory analytics">
        <ChartCard title="Stock Movement" detail={`${periodLabel} | ${fmt(summary?.period_movement_count || 0)} recorded movements`} action="/inventory/movements">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={movementChart} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe4ef" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip cursor={{ fill: "#f1f5f9" }} />
              <Bar dataKey="quantity" name="Units" radius={[6, 6, 0, 0]} maxBarSize={54}>
                {movementChart.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fulfilment Workload" detail="Current orders by operational stage">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={workloadChart} layout="vertical" margin={{ top: 4, right: 18, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#dbe4ef" />
              <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={70} axisLine={false} tickLine={false} tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }} />
              <Tooltip cursor={{ fill: "#f1f5f9" }} />
              <Bar dataKey="count" name="Jobs" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {workloadChart.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Inventory Health" detail={`${fmt(stockProducts.length)} stock-managed products`} action="/inventory/products">
          <div className="inventory-health-chart">
            <ResponsiveContainer width="100%" height={164}>
              <PieChart>
                <Pie data={healthChart} dataKey="value" nameKey="name" innerRadius={46} outerRadius={70} paddingAngle={3}>
                  {healthChart.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="inventory-chart-legend">
              {healthChart.map((entry) => (
                <div key={entry.name}><span style={{ background: entry.color }} /><strong>{fmt(entry.value)}</strong> {entry.name}</div>
              ))}
            </div>
          </div>
        </ChartCard>
      </section>

      <section className="inventory-dashboard-grid">
        <DashboardTable
          title="Priority Work Queue"
          action={<Link className="inventory-table-action" to="/inventory/queue">View all<ArrowRight size={12} /></Link>}
          columns={["Order", "Client", "Readiness", "Next Action"]}
          rows={priorityJobs.map((job) => {
            const status = String(job.stock_status || job.status || "PENDING").toUpperCase();
            const target = status === "AWAITING_STOCK" ? "/inventory/purchasing" : status === "STOCK_OK" ? "/inventory/field-service" : "/inventory/queue";
            const action = status === "AWAITING_STOCK" ? "Open Procurement" : status === "STOCK_OK" ? "Prepare Dispatch" : "Review Order";
            return [
              <div><strong>{job.order_number || job.quotation_number || "-"}</strong><div style={{ marginTop: 3, color: "#64748b", fontSize: 11 }}>{job.item_count || 0} lines</div></div>,
              job.customer_name || "-",
              pill(status),
              <Link className="inventory-table-action" to={target}>{action}<ArrowRight size={12} /></Link>,
            ];
          })}
          empty={state === "loading" ? "Loading operational queue..." : "No approved order requires Inventory action."}
        />

        <DashboardTable
          title="Replenishment Watchlist"
          action={<Link className="inventory-table-action" to="/inventory/products">Open catalog<ArrowRight size={12} /></Link>}
          columns={["Product", "Available", "Minimum", "Action"]}
          rows={lowStock.slice(0, 6).map((product) => [
            <div><strong>{product.product_name}</strong><div style={{ marginTop: 3, color: "#64748b", fontSize: 11 }}>{product.sku || product.category_name || "Uncategorized"}</div></div>,
            fmt(product.available_count ?? product.quantity),
            fmt(product.min_stock_level),
            <Link className="inventory-table-action" to="/inventory/purchasing">Replenish<ArrowRight size={12} /></Link>,
          ])}
          empty="No product currently requires replenishment."
        />
      </section>

      <div className="inventory-dashboard-section">
        <DashboardTable
          title="Recent Dispatches"
          action={<Link className="inventory-table-action" to="/inventory/field-service">View all<ArrowRight size={12} /></Link>}
          columns={["Dispatch", "Client", "Field Technician", "Dispatch Date", "Status"]}
          rows={recentDispatches.map((dispatch) => [
            <strong>{dispatch.dispatch_number}</strong>,
            dispatch.customer_name || "-",
            dispatch.installer_name || dispatch.installer_email || "Unassigned",
            dateText(dispatch.dispatched_at || dispatch.created_at),
            pill(dispatch.status),
          ])}
          empty="No dispatch activity recorded."
        />
      </div>
    </main>
  );
}

function ChartCard({ title, detail, action, children }: { title: string; detail: string; action?: string; children: React.ReactNode }) {
  return (
    <section className="inventory-chart-card inventory-surface">
      <div className="inventory-chart-card__header">
        <div><h2>{title}</h2><p>{detail}</p></div>
        {action && <Link to={action}>View details<ArrowRight size={12} /></Link>}
      </div>
      {children}
    </section>
  );
}

function DashboardTable({ title, action, columns, rows, empty }: { title: string; action?: React.ReactNode; columns: string[]; rows: React.ReactNode[][]; empty: string }) {
  return (
    <section className="inventory-dashboard-table inventory-surface">
      <div className="inventory-dashboard-table__header"><h3>{title}</h3>{action}</div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={columns.length}>{empty}</td></tr> : rows.map((row, rowIndex) => (
              <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} data-label={columns[cellIndex]}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
