import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpFromLine,
  Boxes,
  CalendarDays,
  ClipboardCheck,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  FieldDispatch,
  InventorySummary,
  InventoryWorkQueueJob,
  Product,
  inventoryApi,
} from "../services/inventoryService";
import { useToastContext } from "../context/ToastContext";

type LoadingState = "idle" | "loading" | "ready" | "error";
type DashboardPeriod = "daily" | "weekly" | "monthly";

const periodOptions: Array<{ value: DashboardPeriod; label: string; detail: string }> = [
  { value: "daily", label: "Daily", detail: "Today" },
  { value: "weekly", label: "Weekly", detail: "Last 7 days" },
  { value: "monthly", label: "Monthly", detail: "This month" },
];

const statusColors: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: "#fef3c7", color: "#b45309" },
  SENT: { bg: "#dbeafe", color: "#1d4ed8" },
  APPROVED: { bg: "#dcfce7", color: "#047857" },
  PENDING_REVIEW: { bg: "#fef3c7", color: "#b45309" },
  READY_FOR_INVENTORY: { bg: "#e0f2fe", color: "#0369a1" },
  TOKEN_GENERATED: { bg: "#dbeafe", color: "#1d4ed8" },
  STOCK_OK: { bg: "#dcfce7", color: "#047857" },
  AWAITING_STOCK: { bg: "#fee2e2", color: "#b91c1c" },
  DISPATCHED: { bg: "#ede9fe", color: "#6d28d9" },
  COMPLETED: { bg: "#dcfce7", color: "#047857" },
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

function pill(status?: string) {
  const key = String(status || "-").toUpperCase();
  const colors = statusColors[key] || { bg: "#e2e8f0", color: "#475569" };
  return (
    <span
      style={{
        display: "inline-flex",
        borderRadius: 999,
        padding: "5px 9px",
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: ".02em",
        background: colors.bg,
        color: colors.color,
      }}
    >
      {key.replace(/_/g, " ")}
    </span>
  );
}

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const [state, setState] = useState<LoadingState>("idle");
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [workQueue, setWorkQueue] = useState<InventoryWorkQueueJob[]>([]);
  const [dispatches, setDispatches] = useState<FieldDispatch[]>([]);
  const [period, setPeriod] = useState<DashboardPeriod>("monthly");

  const loadDashboard = useCallback(async () => {
    try {
      setState("loading");
      const [summaryRes, productRes, queueRes, dispatchRes] = await Promise.all([
        safeLoad<InventorySummary | null>("summary", () => inventoryApi.getSummary({ period }), null),
        safeLoad<Product[]>("products", () => inventoryApi.getProducts({ limit: 500 }), []),
        safeLoad<InventoryWorkQueueJob[]>("incoming orders", () => inventoryApi.getWorkQueue(), []),
        safeLoad<FieldDispatch[]>("dispatches", () => inventoryApi.getDispatches(), []),
      ]);

      setSummary(summaryRes);
      setProducts(productRes);
      setWorkQueue(queueRes);
      setDispatches(dispatchRes);
      setState("ready");

      if (!summaryRes && productRes.length === 0 && queueRes.length === 0) {
        showToast("Inventory dashboard data could not be loaded.", "error");
      }
    } catch (error) {
      console.error(error);
      setState("error");
      showToast("Inventory dashboard data could not be loaded.", "error");
    }
  }, [period, showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const lowStockAlerts = useMemo(
    () =>
      products
        .filter((product) => Number(product.quantity || 0) <= Number(product.min_stock_level || 0))
        .sort((a, b) => {
          const shortA = Number(a.min_stock_level || 0) - Number(a.quantity || 0);
          const shortB = Number(b.min_stock_level || 0) - Number(b.quantity || 0);
          return shortB - shortA;
        })
        .slice(0, 5),
    [products],
  );

  const incomingOrders = useMemo(() => workQueue.slice(0, 5), [workQueue]);

  const activeDispatches = useMemo(
    () =>
      dispatches.filter(
        (dispatch) => ["PENDING", "ASSIGNED", "DISPATCHED", "IN_PROGRESS"].includes(String(dispatch.status || "").toUpperCase()),
      ),
    [dispatches],
  );

  const pendingIncomingOrders =
    summary?.pending_incoming_orders ??
    workQueue.filter((order) =>
      ["PENDING_REVIEW", "READY_FOR_INVENTORY"].includes(String(order.order_status || order.status || "").toUpperCase()),
    ).length;

  const totalStockQty = Number(
    summary?.total_stock_qty ??
      products.reduce((sum, product) => sum + Number(product.quantity || 0), 0),
  );
  const availableStockQty = Number(summary?.available_stock_qty ?? summary?.available_serials ?? 0);
  const periodLabel = periodOptions.find((option) => option.value === period)?.detail || "Selected period";
  const stockInQty = Number(summary?.period_stock_in_qty || 0);
  const stockOutQty = Number(summary?.period_stock_out_qty || 0);
  const pendingReturns = Number(summary?.pending_returns || 0);
  const pendingBills = Number(summary?.pending_bills || 0);
  const activeDispatchCount = Number(summary?.active_dispatches ?? activeDispatches.length);

  const statCards = [
    {
      label: "Total Products",
      value: fmt(summary?.total_products || products.length),
      detail: `${fmt(totalStockQty)} total stock units | ${fmt(availableStockQty)} available now`,
      icon: Boxes,
      color: "#2563eb",
      bg: "#dbeafe",
    },
    {
      label: "Pending Incoming Orders",
      value: fmt(pendingIncomingOrders),
      detail: "CRM approved jobs waiting for inventory",
      icon: ClipboardCheck,
      color: "#0f766e",
      bg: "#ccfbf1",
    },
    {
      label: "Low Stock Alerts",
      value: fmt(summary?.low_stock_count || lowStockAlerts.length),
      detail: "Products at or below minimum level",
      icon: AlertTriangle,
      color: "#b45309",
      bg: "#fef3c7",
    },
    {
      label: "Active Dispatches",
      value: fmt(activeDispatchCount),
      detail: "Installer jobs currently in progress",
      icon: ArrowUpFromLine,
      color: "#7c3aed",
      bg: "#ede9fe",
    },
    {
      label: "Pending Returns",
      value: fmt(pendingReturns),
      detail: "Installer returns waiting for Inventory review",
      icon: RefreshCw,
      color: "#0284c7",
      bg: "#e0f2fe",
    },
    {
      label: "Pending Bills",
      value: fmt(pendingBills),
      detail: "Confirmed returns ready to send to Finance",
      icon: FileText,
      color: "#059669",
      bg: "#d1fae5",
    },
  ];

  return (
    <div
      className="inventory-dashboard"
      style={{
        padding: "22px 28px",
        minHeight: "100%",
        background: "linear-gradient(135deg, rgba(239,246,255,.9), rgba(248,250,252,.96) 55%, rgba(236,253,245,.5))",
      }}
    >
      <section
        className="inventory-dashboard-hero"
        style={{
          marginBottom: 14,
          background: "linear-gradient(135deg,#14213d,#155e75)",
          borderRadius: 18,
          padding: 18,
          boxShadow: "0 16px 35px rgba(15,23,42,.14)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 18,
          color: "white",
        }}
      >
        <div>
          <div style={{ textTransform: "uppercase", letterSpacing: ".12em", fontSize: 12, fontWeight: 950, color: "#bae6fd" }}>
            Inventory service dashboard
          </div>
          <h1 style={{ margin: "7px 0 4px", fontSize: 28, lineHeight: 1.1 }}>Stock Movement Health</h1>
          <p style={{ margin: 0, color: "#dbeafe", fontSize: 14 }}>
            Total stock, issued stock, incoming orders, low-stock alerts and billing queues refresh from live backend data.
          </p>
        </div>
        <div className="inventory-period-switcher" style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.22)", padding: 7, borderRadius: 14 }}>
          <CalendarDays size={18} />
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              style={{
                border: 0,
                borderRadius: 10,
                padding: "9px 12px",
                background: period === option.value ? "#ffffff" : "transparent",
                color: period === option.value ? "#0f172a" : "#dbeafe",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="inventory-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(140px, 1fr))", gap: 14 }}>
        {statCards.map((card) => (
          <div
            className="inventory-stat-card"
            key={card.label}
            style={{
              background: "white",
              border: "1px solid #dbe5f2",
              borderRadius: 14,
              padding: "16px 16px 14px",
              boxShadow: "0 10px 24px rgba(15,23,42,.06)",
              borderTop: `4px solid ${card.color}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div style={{ color: "#64748b", fontSize: 11, fontWeight: 900, letterSpacing: ".06em", lineHeight: 1.35 }}>
                {card.label.toUpperCase()}
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 11,
                  background: card.bg,
                  color: card.color,
                  flex: "0 0 auto",
                }}
              >
                <card.icon size={18} />
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 30, fontWeight: 950, color: "#0f172a", lineHeight: 1 }}>{card.value}</div>
            <div style={{ marginTop: 7, color: "#64748b", fontSize: 12, fontWeight: 800, lineHeight: 1.35 }}>{card.detail}</div>
          </div>
        ))}
      </section>

      <section
        className="inventory-mini-grid"
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        <MiniMetric label={`${periodLabel} Stock In`} value={fmt(stockInQty)} />
        <MiniMetric label={`${periodLabel} Stock Out`} value={fmt(stockOutQty)} />
        <MiniMetric label="Available Serials" value={fmt(summary?.available_serials || 0)} />
        <MiniMetric label="Installed Serials" value={fmt(summary?.installed_serials || 0)} />
      </section>

      <section
        className="inventory-dashboard-tables"
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          alignItems: "start",
        }}
      >
        <DashboardTable
          title="Incoming Orders"
          actionLabel={state === "loading" ? "Refreshing..." : "Refresh"}
          onAction={loadDashboard}
          columns={["Order No", "Client", "Status", "Action"]}
          rows={incomingOrders.map((order) => [
            order.order_number || order.quotation_number || "-",
            order.customer_name || "-",
            pill(order.order_status || order.status || "PENDING_REVIEW"),
            <button
              onClick={() => navigate("/inventory/queue")}
              style={tableButtonStyle}
            >
              Open
            </button>,
          ])}
          empty="No incoming orders from CRM."
        />

        <DashboardTable
          title="Low Stock Alerts"
          columns={["Product", "Stock", "Min", "Short"]}
          rows={lowStockAlerts.map((product) => {
            const stock = Number(product.quantity || 0);
            const min = Number(product.min_stock_level || 0);
            return [
              product.product_name,
              fmt(stock),
              fmt(min),
              <span style={{ color: "#b91c1c", fontWeight: 950 }}>{fmt(Math.max(0, min - stock))}</span>,
            ];
          })}
          empty="No low stock alerts."
        />
      </section>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="inventory-mini-metric"
      style={{
        background: "rgba(255,255,255,.82)",
        border: "1px solid #dbe5f2",
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>{label}</span>
      <strong style={{ color: "#0f172a", fontSize: 18 }}>{value}</strong>
    </div>
  );
}

const tableButtonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 9,
  padding: "7px 10px",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

function DashboardTable({
  title,
  actionLabel,
  onAction,
  columns,
  rows,
  empty,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  columns: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  return (
    <div
      className="inventory-dashboard-table"
      style={{
        background: "white",
        border: "1px solid #dbe5f2",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 10px 24px rgba(15,23,42,.06)",
      }}
    >
      <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>{title}</h3>
        {actionLabel && onAction ? (
          <button
            onClick={onAction}
            style={{
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              color: "#1d4ed8",
              padding: "8px 11px",
              borderRadius: 10,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#eef4fb" }}>
              {columns.map((column) => (
                <th
                  key={column}
                  style={{
                    textAlign: "left",
                    padding: "11px 14px",
                    fontSize: 11,
                    color: "#334155",
                    letterSpacing: ".08em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {column.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 18, color: "#64748b" }}>
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${rowIndex}-${cellIndex}`}
                      style={{
                        padding: "12px 14px",
                        borderTop: "1px solid #e2e8f0",
                        color: "#0f172a",
                        fontWeight: cellIndex === 0 ? 900 : 700,
                        fontSize: 13,
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
