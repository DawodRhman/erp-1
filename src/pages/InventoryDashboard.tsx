import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Boxes,
  ClipboardCheck,
  FileText,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  InventoryItem,
  InventorySummary,
  InventoryWorkQueueJob,
  InventoryMovement,
  Product,
  PurchaseOrder,
  Invoice,
  inventoryApi,
} from "../services/inventoryService";
import { useToastContext } from "../context/ToastContext";

type LoadingState = "idle" | "loading" | "ready" | "error";

const statusColors: Record<string, { bg: string; color: string }> = {
  AVAILABLE: { bg: "#dcfce7", color: "#047857" },
  ALLOCATED: { bg: "#dbeafe", color: "#1d4ed8" },
  INSTALLED: { bg: "#ede9fe", color: "#6d28d9" },
  DAMAGED: { bg: "#fee2e2", color: "#b91c1c" },
  RETURNED: { bg: "#fef3c7", color: "#b45309" },
  DRAFT: { bg: "#fef3c7", color: "#b45309" },
  APPROVED: { bg: "#dcfce7", color: "#047857" },
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

function currency(value?: number) {
  return `Rs ${fmt(value)}`;
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
      {key}
    </span>
  );
}

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const [state, setState] = useState<LoadingState>("idle");
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [workQueue, setWorkQueue] = useState<InventoryWorkQueueJob[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      setState("loading");
      const [summaryRes, productRes, itemRes, movementRes, poRes, invoiceRes, queueRes] = await Promise.all([
        safeLoad<InventorySummary | null>("summary", () => inventoryApi.getSummary(), null),
        safeLoad<Product[]>("products", () => inventoryApi.getProducts({ limit: 500 }), []),
        safeLoad<InventoryItem[]>("serials", () => inventoryApi.getItems({ limit: 500 }), []),
        safeLoad<InventoryMovement[]>("stock ledger", () => inventoryApi.getMovements({ limit: 10 }), []),
        safeLoad<PurchaseOrder[]>("purchase orders", () => inventoryApi.getPurchaseOrders(), []),
        safeLoad<Invoice[]>("invoices", () => inventoryApi.getInvoices(), []),
        safeLoad<InventoryWorkQueueJob[]>("CSR queue", () => inventoryApi.getWorkQueue(), []),
      ]);

      setSummary(summaryRes);
      setProducts(productRes);
      setItems(itemRes);
      setMovements(movementRes);
      setPurchaseOrders(poRes);
      setInvoices(invoiceRes);
      setWorkQueue(queueRes);
      setState("ready");
      if (!summaryRes && productRes.length === 0 && itemRes.length === 0) {
        showToast("Inventory dashboard ka core data abhi available nahi hai", "error");
      }
    } catch (error) {
      console.error(error);
      setState("error");
      showToast("Inventory dashboard data load nahi ho saka", "error");
    }
  }, [showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    const serialStockIn = items.length || summary?.total_serials || 0;
    const nonSerialQty = products
      .filter((product) => product.tracking_type === "NONE")
      .reduce((total, product) => total + Number(product.quantity || 0), 0);
    const stockIn = serialStockIn + nonSerialQty;
    const allocated = items.filter((item) => item.current_status === "ALLOCATED").length || summary?.allocated_serials || 0;
    const installed = items.filter((item) => item.current_status === "INSTALLED").length || summary?.installed_serials || 0;
    const damaged = items.filter((item) => item.current_status === "DAMAGED").length || summary?.damaged_serials || 0;
    const returned = items.filter((item) => item.current_status === "RETURNED").length;
    const available = items.filter((item) => item.current_status === "AVAILABLE").length || summary?.available_serials || 0;
    const stockOut = allocated + installed;
    const lowStock = products.filter((product) => Number(product.quantity || 0) <= Number(product.min_stock_level || 0));
    const totalValue = products.reduce(
      (total, product) => total + Number(product.quantity || 0) * Number(product.unit_price || product.cost_price || 0),
      0,
    );

    return {
      stockIn,
      stockOut,
      available,
      allocated,
      installed,
      damaged,
      returned,
      lowStock,
      totalValue: totalValue || summary?.total_inventory_value || 0,
    };
  }, [items, products, summary]);

  const topProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0))
        .slice(0, 7),
    [products],
  );

  const recentSerials = useMemo(() => items.slice(0, 8), [items]);
  const recentMovements = useMemo(() => movements.slice(0, 8), [movements]);
  const recentOrders = useMemo(() => purchaseOrders.slice(0, 5), [purchaseOrders]);
  const recentReceipts = useMemo(() => invoices.slice(0, 5), [invoices]);

  const stockOutPercent =
    metrics.stockIn > 0 ? Math.min(100, Math.round((metrics.stockOut / metrics.stockIn) * 100)) : 0;
  const availablePercent =
    metrics.stockIn > 0 ? Math.min(100, Math.round((metrics.available / metrics.stockIn) * 100)) : 0;

  const statCards = [
    {
      label: "Total Stock In",
      value: fmt(metrics.stockIn),
      note: "Serials plus non-serial quantity recorded",
      icon: ArrowDownToLine,
      color: "#2563eb",
      bg: "#dbeafe",
    },
    {
      label: "Total Stock Out",
      value: fmt(metrics.stockOut),
      note: `${fmt(metrics.allocated)} allocated, ${fmt(metrics.installed)} installed`,
      icon: ArrowUpFromLine,
      color: "#0f766e",
      bg: "#ccfbf1",
    },
    {
      label: "Available To Issue",
      value: fmt(metrics.available),
      note: `${availablePercent}% of tracked stock is available`,
      icon: PackageCheck,
      color: "#059669",
      bg: "#dcfce7",
    },
    {
      label: "Low Stock Alerts",
      value: fmt(summary?.low_stock_count || metrics.lowStock.length),
      note: "At or below reorder level",
      icon: AlertTriangle,
      color: "#b45309",
      bg: "#fef3c7",
    },
  ];

  return (
    <div
      style={{
        padding: "32px",
        minHeight: "100%",
        background:
          "linear-gradient(135deg, rgba(239,246,255,.9), rgba(248,250,252,.95) 42%, rgba(236,253,245,.55))",
      }}
    >
      <section
        style={{
          borderRadius: 18,
          padding: 28,
          color: "white",
          background: "linear-gradient(135deg, #0f172a, #1e3a8a 56%, #0f766e)",
          boxShadow: "0 22px 50px rgba(15,23,42,.18)",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 24,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,.12)",
              border: "1px solid rgba(255,255,255,.18)",
            }}
          >
            <Warehouse size={30} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: ".12em", color: "#bfdbfe" }}>
              INVENTORY SERVICE DASHBOARD
            </div>
            <h1 style={{ margin: "8px 0 8px", fontSize: 32, lineHeight: 1.1 }}>
              Stock, Purchasing, Dispatch & Billing Health
            </h1>
            <p style={{ margin: 0, maxWidth: 900, color: "#dbeafe", fontSize: 15 }}>
              Total stock, stock-in, stock-out, available serials, low-stock alerts, CSR handoff and vendor receipts in one command view.
            </p>
          </div>
        </div>
        <button
          onClick={loadDashboard}
          disabled={state === "loading"}
          style={{
            border: "1px solid rgba(255,255,255,.28)",
            background: "rgba(255,255,255,.12)",
            color: "white",
            borderRadius: 12,
            padding: "12px 16px",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={16} />
          {state === "loading" ? "Refreshing..." : "Refresh Live Data"}
        </button>
      </section>

      <section
        style={{
          marginTop: 22,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(180px, 1fr))",
          gap: 16,
        }}
      >
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: "white",
              border: "1px solid #dbe5f2",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 14px 30px rgba(15,23,42,.07)",
              borderTop: `4px solid ${card.color}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, letterSpacing: ".08em" }}>
                {card.label.toUpperCase()}
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 12,
                  background: card.bg,
                  color: card.color,
                }}
              >
                <card.icon size={20} />
              </div>
            </div>
            <div style={{ marginTop: 16, fontSize: 34, fontWeight: 950, color: "#0f172a" }}>{card.value}</div>
            <div style={{ marginTop: 5, fontSize: 13, color: "#64748b" }}>{card.note}</div>
          </div>
        ))}
      </section>

      <section style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 16 }}>
        <div
          style={{
            background: "white",
            border: "1px solid #dbe5f2",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 14px 30px rgba(15,23,42,.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 900, letterSpacing: ".1em" }}>STOCK MOVEMENT</div>
              <h2 style={{ margin: "6px 0 0", fontSize: 20 }}>Inventory Position</h2>
            </div>
            <button
              onClick={() => navigate("/inventory")}
              style={{
                border: 0,
                borderRadius: 11,
                padding: "10px 14px",
                color: "white",
                background: "#2563eb",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Open Inventory Logistics
            </button>
          </div>
          <div style={{ marginTop: 20, display: "grid", gap: 14 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 900 }}>
                <span>Available stock</span>
                <span>{availablePercent}%</span>
              </div>
              <div style={{ marginTop: 8, height: 10, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                <div style={{ width: `${availablePercent}%`, height: "100%", background: "#10b981" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 900 }}>
                <span>Stock out / issued</span>
                <span>{stockOutPercent}%</span>
              </div>
              <div style={{ marginTop: 8, height: 10, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                <div style={{ width: `${stockOutPercent}%`, height: "100%", background: "#2563eb" }} />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              ["Catalog Products", summary?.total_products || products.length],
              ["Allocated", metrics.allocated],
              ["Installed", metrics.installed],
              ["Damaged/Returned", metrics.damaged + metrics.returned],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ background: "#f8fafc", borderRadius: 12, padding: 14, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 18, fontWeight: 950, color: "#0f172a" }}>{fmt(Number(value))}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #dbe5f2",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 14px 30px rgba(15,23,42,.06)",
          }}
        >
          <div style={{ fontSize: 12, color: "#0f766e", fontWeight: 900, letterSpacing: ".1em" }}>OPERATION QUEUE</div>
          <h2 style={{ margin: "6px 0 16px", fontSize: 20 }}>What Needs Action</h2>
          {[
            { label: "CSR approved jobs", value: summary?.approved_csr_jobs || workQueue.length, icon: ClipboardCheck, to: "/inventory" },
            { label: "Purchase orders", value: summary?.total_pos || purchaseOrders.length, icon: ShoppingCart, to: "/inventory" },
            { label: "Vendor receipts", value: summary?.total_invoices || invoices.length, icon: FileText, to: "/inventory" },
            { label: "Inventory value", value: currency(metrics.totalValue), icon: BarChart3, to: "/inventory" },
          ].map((row) => (
            <button
              key={row.label}
              onClick={() => navigate(row.to)}
              style={{
                width: "100%",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                borderRadius: 13,
                padding: 13,
                marginBottom: 10,
                display: "grid",
                gridTemplateColumns: "34px 1fr auto",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ color: "#2563eb" }}>
                <row.icon size={20} />
              </span>
              <span style={{ color: "#334155", fontWeight: 800 }}>{row.label}</span>
              <span style={{ color: "#0f172a", fontWeight: 950 }}>{row.value}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <DashboardTable
          title="Top Stock Position"
          eyebrow="PRODUCTS"
          actionLabel="+ New Product"
          onAction={() => navigate("/inventory")}
          columns={["Product", "Type", "Qty", "Reorder", "Value"]}
          rows={topProducts.map((product) => [
            product.product_name,
            product.product_type,
            fmt(product.quantity),
            fmt(product.min_stock_level),
            currency(Number(product.quantity || 0) * Number(product.unit_price || product.cost_price || 0)),
          ])}
          empty="No products found."
        />
        <DashboardTable
          title="Recent Serial Movement"
          eyebrow="SERIALS / IMEI"
          actionLabel="Assign Serial"
          onAction={() => navigate("/inventory")}
          columns={["Product", "Serial", "Status", "Location"]}
          rows={recentSerials.map((item) => [
            item.product_name || "-",
            item.serial_number || item.imei || "N/A",
            pill(item.current_status),
            item.location || "Warehouse Main",
          ])}
          empty="No serial records found."
        />
      </section>

      <section style={{ marginTop: 16 }}>
        <DashboardTable
          title="Latest Stock Ledger"
          eyebrow="AUDIT TRAIL"
          actionLabel="Open Full Ledger"
          onAction={() => navigate("/inventory")}
          columns={["Date", "Movement", "Product", "Qty", "Reference", "By"]}
          rows={recentMovements.map((movement) => [
            new Date(movement.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            pill(movement.movement_type),
            movement.product_name || movement.serial_number || "Stock item",
            fmt(movement.quantity),
            movement.reference_type || "Manual",
            movement.created_by_email || "System",
          ])}
          empty="No stock movement ledger records yet."
        />
      </section>

      <section style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <FlowCard
          title="Stock-In Flow"
          icon={ArrowDownToLine}
          steps={["Create purchase order", "Receive vendor stock", "Record serials / quantity", "Make stock available"]}
          button="Start Purchasing"
          onClick={() => navigate("/inventory")}
        />
        <FlowCard
          title="Stock-Out Flow"
          icon={ArrowUpFromLine}
          steps={["Open CSR approved job", "Assign serial / stock", "Create installer handoff", "Track installed and returned items"]}
          button="Open CSR Queue"
          onClick={() => navigate("/inventory")}
        />
        <FlowCard
          title="Billing Handoff"
          icon={FileText}
          steps={["Open billing from job", "Auto-fill invoice rows", "Edit missing/manual items", "Save draft and generate summary"]}
          button="Open Invoice Builder"
          onClick={() => navigate("/invoice-builder")}
        />
      </section>

      <section style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <DashboardTable
          title="Purchase Orders"
          eyebrow="STOCK-IN"
          actionLabel="Create PO"
          onAction={() => navigate("/inventory")}
          columns={["PO", "Vendor", "Status", "Amount"]}
          rows={recentOrders.map((order) => [
            order.po_number,
            order.vendor_name || "-",
            pill(order.status),
            currency(order.total_amount),
          ])}
          empty="No purchase orders yet."
        />
        <DashboardTable
          title="Vendor Receipts / Invoices"
          eyebrow="GRN"
          actionLabel="Open Receipts"
          onAction={() => navigate("/inventory")}
          columns={["Invoice", "Party", "Status", "Amount"]}
          rows={recentReceipts.map((invoice) => [
            invoice.invoice_number,
            invoice.customer_name || "Vendor / Supplier",
            pill(invoice.status),
            currency(invoice.total_amount),
          ])}
          empty="No receipts yet."
        />
      </section>
    </div>
  );
}

function DashboardTable({
  title,
  eyebrow,
  actionLabel,
  onAction,
  columns,
  rows,
  empty,
}: {
  title: string;
  eyebrow: string;
  actionLabel: string;
  onAction: () => void;
  columns: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  return (
    <div style={{ background: "white", border: "1px solid #dbe5f2", borderRadius: 16, overflow: "hidden", boxShadow: "0 14px 30px rgba(15,23,42,.06)" }}>
      <div style={{ padding: 18, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div>
          <div style={{ color: "#2563eb", fontSize: 11, fontWeight: 900, letterSpacing: ".1em" }}>{eyebrow}</div>
          <h3 style={{ margin: "5px 0 0", fontSize: 18 }}>{title}</h3>
        </div>
        <button
          onClick={onAction}
          style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", padding: "9px 12px", borderRadius: 10, fontWeight: 900, cursor: "pointer" }}
        >
          {actionLabel}
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "linear-gradient(90deg, #e0f2fe, #ede9fe)" }}>
              {columns.map((column) => (
                <th key={column} style={{ textAlign: "left", padding: "12px 14px", fontSize: 11, color: "#334155", letterSpacing: ".09em" }}>
                  {column.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 20, color: "#64748b" }}>
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} style={{ padding: "12px 14px", borderTop: "1px solid #edf2f7", color: "#0f172a", fontSize: 13, fontWeight: cellIndex === 0 ? 800 : 600 }}>
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

function FlowCard({
  title,
  icon: Icon,
  steps,
  button,
  onClick,
}: {
  title: string;
  icon: React.ComponentType<any>;
  steps: string[];
  button: string;
  onClick: () => void;
}) {
  return (
    <div style={{ background: "white", border: "1px solid #dbe5f2", borderRadius: 16, padding: 18, boxShadow: "0 14px 30px rgba(15,23,42,.06)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", background: "#eff6ff", color: "#2563eb" }}>
          <Icon size={20} />
        </div>
        <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
      </div>
      <div style={{ marginTop: 16, display: "grid", gap: 9 }}>
        {steps.map((step, index) => (
          <div key={step} style={{ display: "grid", gridTemplateColumns: "28px 1fr", alignItems: "center", gap: 10 }}>
            <span style={{ width: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: index === steps.length - 1 ? "#dcfce7" : "#eef2ff", color: index === steps.length - 1 ? "#047857" : "#2563eb", fontSize: 12, fontWeight: 950 }}>
              {index + 1}
            </span>
            <span style={{ color: "#334155", fontWeight: 700, fontSize: 13 }}>{step}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onClick}
        style={{ marginTop: 18, width: "100%", border: 0, background: "#0f172a", color: "white", borderRadius: 11, padding: "11px 14px", fontWeight: 900, cursor: "pointer" }}
      >
        {button}
      </button>
    </div>
  );
}
