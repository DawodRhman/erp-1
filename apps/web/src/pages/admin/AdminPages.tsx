import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileSpreadsheet,
  GitBranch,
  Package,
  ReceiptText,
  RefreshCw,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  UserX,
} from "lucide-react";
import { crmApi, type CrmComplaint, type CrmCustomer, type CrmInvoice, type CrmOrder, type CrmQuotation } from "../crm/crmApi";
import {
  inventoryApi,
  type FieldDispatch,
  type InventorySummary,
  type InventoryWorkQueueJob,
  type Product,
  type ReturnRequest,
} from "../../services/inventoryService";
import { financeService, type FinanceBillingApproval, type FinanceInvoice } from "../../services/financeService";
import { useFilteredAccounts, useUpdateAccountStatus } from "../../hooks/useAccounts";
import { useAuditLogs } from "../../hooks/useAuditLogs";
import { useToastContext } from "../../context/ToastContext";
import {
  dashboardPeriodLabel,
  dashboardPeriodOptions,
  isWithinDashboardPeriod,
  type DashboardPeriod,
} from "../../utils/dashboardPeriod";
import { getRolePortalMeta } from "../../utils/rolePortalMeta";
import "../../styles/admin.css";

type AdminData = {
  customers: CrmCustomer[];
  quotations: CrmQuotation[];
  orders: CrmOrder[];
  complaints: CrmComplaint[];
  crmInvoices: CrmInvoice[];
  inventorySummary?: InventorySummary | null;
  products: Product[];
  workQueue: InventoryWorkQueueJob[];
  dispatches: FieldDispatch[];
  returns: ReturnRequest[];
  financeApprovals: FinanceBillingApproval[];
  financeInvoices: FinanceInvoice[];
};

const emptyAdminData: AdminData = {
  customers: [],
  quotations: [],
  orders: [],
  complaints: [],
  crmInvoices: [],
  inventorySummary: null,
  products: [],
  workQueue: [],
  dispatches: [],
  returns: [],
  financeApprovals: [],
  financeInvoices: [],
};

const adminPortalCards = [
  { label: "CRM Overview", to: "/admin/crm", icon: Building2, description: "Clients, quotations, approvals, orders and complaints." },
  { label: "Inventory Overview", to: "/admin/inventory", icon: Package, description: "Approved orders, stock health, field fulfilment and reconciliation." },
  { label: "Finance Overview", to: "/admin/finance", icon: DollarSign, description: "Billing approvals, invoices, value and accounts health." },
  { label: "EMS Workspace", to: "/dashboard", icon: Users, description: "Employee management, attendance, leave and HR operations." },
  { label: "User Management", to: "/admin/users", icon: ShieldCheck, description: "Portal roles, access ownership and active/inactive users." },
  { label: "All Orders Tracker", to: "/admin/orders", icon: GitBranch, description: "End-to-end flow from CRM approval to finance invoice." },
  { label: "System Logs", to: "/admin/logs", icon: ClipboardList, description: "Audit trail for user actions, API paths and modules." },
  { label: "Settings", to: "/admin/settings", icon: Settings, description: "Company, inventory and global configuration shortcuts." },
];

const adminDashboardPages = ["Overview", "Portal Health", "Live Snapshots", "Admin Areas"];

async function safeLoad<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

function money(value?: number | string | null) {
  const amount = Number(value || 0);
  return `Rs ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0)}`;
}

function number(value?: number | string | null) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function normalizeStatus(status?: string | null) {
  return String(status || "UNKNOWN").replace(/\s+/g, "_").toUpperCase();
}

function statusTone(status?: string | null) {
  const normalized = normalizeStatus(status);
  if (["APPROVED", "ISSUED", "PAID", "COMPLETED", "FULLY_DISPATCHED", "STOCK_OK", "ACTIVE"].includes(normalized)) return "green";
  if (["SENT", "IN_PROGRESS", "PARTIALLY_DISPATCHED", "PENDING", "PENDING_REVIEW", "AWAITING_STOCK"].includes(normalized)) return "amber";
  if (["DRAFT", "ASSIGNED", "TOKEN_GENERATED"].includes(normalized)) return "blue";
  if (["REJECTED", "EXPIRED", "LOW_STOCK", "DAMAGED"].includes(normalized)) return "red";
  return "steel";
}

function StatusBadge({ status }: { status?: string | null }) {
  const normalized = normalizeStatus(status);
  return <span className={`admin-badge admin-badge-${statusTone(normalized)}`}>{normalized.replace(/_/g, " ")}</span>;
}

function recent<T>(items: T[], count: number, key: keyof T = "created_at" as keyof T) {
  return [...items]
    .sort((a: any, b: any) => new Date(b?.[key] || 0).getTime() - new Date(a?.[key] || 0).getTime())
    .slice(0, count);
}

function monthKey(date: Date) {
  return date.toLocaleDateString("en-GB", { month: "short" });
}

function useAdminData() {
  const [data, setData] = useState<AdminData>(emptyAdminData);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    const [
      customers,
      quotations,
      orders,
      complaints,
      crmInvoices,
      inventorySummary,
      products,
      workQueue,
      dispatches,
      returns,
      financeApprovals,
      financeInvoices,
    ] = await Promise.all([
      safeLoad(crmApi.listCustomers(), []),
      safeLoad(crmApi.listQuotations(), []),
      safeLoad(crmApi.listOrders(), []),
      safeLoad(crmApi.listComplaints(), []),
      safeLoad(crmApi.listInvoices(), []),
      safeLoad(inventoryApi.getSummary(), null),
      safeLoad(inventoryApi.getProducts(), []),
      safeLoad(inventoryApi.getWorkQueue(), []),
      safeLoad(inventoryApi.getDispatches(), []),
      safeLoad(inventoryApi.getReturnRequests(), []),
      safeLoad(financeService.getBillingApprovals({ status: "PENDING" }), []),
      safeLoad(financeService.getInvoices(), []),
    ]);

    setData({
      customers,
      quotations,
      orders,
      complaints,
      crmInvoices,
      inventorySummary,
      products,
      workQueue,
      dispatches,
      returns,
      financeApprovals,
      financeInvoices,
    });
    setUpdatedAt(new Date());
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    const guardedLoad = async () => {
      await load();
      if (!mounted) return;
    };
    guardedLoad();
    const timer = window.setInterval(guardedLoad, 60_000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return { data, loading, updatedAt, refresh: load };
}

function AdminShell({
  title,
  kicker,
  description,
  actions,
  children,
}: {
  title: string;
  kicker: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <div className="admin-kicker">{kicker}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions ? <div className="admin-hero-actions">{actions}</div> : null}
      </section>
      {children}
    </div>
  );
}

function RefreshButton({ loading, updatedAt, onClick }: { loading: boolean; updatedAt?: Date | null; onClick: () => void }) {
  return (
    <button className="admin-btn admin-btn-light" type="button" onClick={onClick} disabled={loading}>
      <RefreshCw size={16} className={loading ? "admin-spin" : ""} />
      {updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Refresh"}
    </button>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  to,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ComponentType<any>;
  to: string;
  tone?: "blue" | "green" | "amber" | "red" | "teal" | "purple" | "steel";
}) {
  return (
    <Link className={`admin-stat admin-stat-${tone}`} to={to}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
      <div className="admin-stat-icon">
        <Icon size={22} />
      </div>
    </Link>
  );
}

function MiniTable({
  title,
  action,
  columns,
  rows,
  empty,
}: {
  title: string;
  action?: React.ReactNode;
  columns: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="admin-empty">{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function amountOf(row: any) {
  return Number(row?.total_amount ?? row?.amount ?? row?.final_amount ?? 0) || 0;
}

function buildMetrics(data: AdminData) {
  const activeQuotations = data.quotations.filter((q) => ["DRAFT", "MANAGEMENT_PENDING", "MANAGEMENT_APPROVED", "SENT"].includes(normalizeStatus(q.status))).length;
  const managementApprovals = data.quotations.filter((q) => normalizeStatus(q.status) === "MANAGEMENT_PENDING");
  const pendingOrders = data.orders.filter((order) => !["COMPLETED", "CANCELLED", "BILL_SENT"].includes(normalizeStatus(order.status))).length;
  const lowStockItems = data.products.filter((product) => Number(product.quantity || 0) <= Number(product.min_stock_level || 0));
  const activeDispatches = data.dispatches.filter((dispatch) => !["COMPLETED", "CANCELLED", "BILL_SENT"].includes(normalizeStatus(dispatch.status)));
  const pendingReturns = data.returns.filter((item) => normalizeStatus(item.status) === "PENDING");
  const pendingBills = data.financeApprovals.filter((item) => !["APPROVED", "REJECTED", "ISSUED"].includes(normalizeStatus(item.status || item.approval_status)));
  return { activeQuotations, managementApprovals, pendingOrders, lowStockItems, activeDispatches, pendingReturns, pendingBills, invoicesInPeriod: data.financeInvoices };
}

function RevenueSummary({ invoices }: { invoices: FinanceInvoice[] }) {
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return { label: monthKey(date), month: date.getMonth(), year: date.getFullYear(), total: 0 };
    });
  }, []);

  const chart = useMemo(() => {
    const rows = months.map((month) => ({ ...month }));
    invoices.forEach((invoice) => {
      const date = new Date(invoice.invoice_date || invoice.created_at || "");
      if (Number.isNaN(date.getTime())) return;
      const target = rows.find((row) => row.month === date.getMonth() && row.year === date.getFullYear());
      if (target) target.total += amountOf(invoice);
    });
    const max = Math.max(...rows.map((row) => row.total), 1);
    return rows.map((row) => ({ ...row, pct: Math.max(6, Math.round((row.total / max) * 100)) }));
  }, [invoices, months]);

  const now = new Date();
  const currentMonthTotal = invoices
    .filter((invoice) => {
      const date = new Date(invoice.invoice_date || invoice.created_at || "");
      return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const outstanding = invoices
    .filter((invoice) => !["PAID", "RECEIVED"].includes(normalizeStatus(invoice.status)))
    .reduce((sum, invoice) => sum + amountOf(invoice), 0);

  return (
    <section className="admin-panel admin-revenue">
      <div className="admin-panel-head">
        <h2>Revenue Summary</h2>
        <Link to="/finance/invoices">Finance <ArrowUpRight size={13} /></Link>
      </div>
      <div className="admin-money-grid">
        <div><span>This Month</span><strong>{money(currentMonthTotal)}</strong></div>
        <div><span>Outstanding</span><strong>{money(outstanding)}</strong></div>
      </div>
      <div className="admin-bars" aria-label="Revenue chart for last six months">
        {chart.map((row) => (
          <div className="admin-bar-item" key={`${row.label}-${row.year}`}>
            <div className="admin-bar-track"><span style={{ height: `${row.pct}%` }} /></div>
            <small>{row.label}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardAreaCard({
  title,
  subtitle,
  icon: Icon,
  to,
  rows,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  to: string;
  rows: Array<{ label: string; value: React.ReactNode; to?: string }>;
}) {
  return (
    <section className="admin-panel admin-area-card">
      <div className="admin-area-head">
        <span className="admin-portal-card-icon"><Icon size={19} /></span>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <Link to={to} className="admin-arrow-link">Open <ArrowUpRight size={13} /></Link>
      </div>
      <div className="admin-area-metrics">
        {rows.map((row) => {
          const content = (
            <>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </>
          );
          return row.to ? (
            <Link key={row.label} to={row.to}>{content}</Link>
          ) : (
            <div key={row.label}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}

export function AdminDashboard() {
  const { data, loading, updatedAt, refresh } = useAdminData();
  const [activePage, setActivePage] = useState(0);
  const [period, setPeriod] = useState<DashboardPeriod>("monthly");
  const periodData = useMemo<AdminData>(() => {
    const filter = <T,>(rows: T[], dateOf: (row: T) => unknown) => rows.filter((row) => isWithinDashboardPeriod(dateOf(row), period));
    return {
      ...data,
      customers: filter(data.customers, (row: any) => row.created_at),
      quotations: filter(data.quotations, (row: any) => row.created_at),
      orders: filter(data.orders, (row: any) => row.created_at),
      complaints: filter(data.complaints, (row: any) => row.created_at),
      crmInvoices: filter(data.crmInvoices, (row: any) => row.created_at),
      workQueue: filter(data.workQueue, (row: any) => row.created_at),
      dispatches: filter(data.dispatches, (row: any) => row.dispatched_at || row.created_at),
      returns: filter(data.returns, (row: any) => row.submitted_date || row.created_at),
      financeApprovals: filter(data.financeApprovals, (row: any) => row.submitted_date || row.created_at),
      financeInvoices: filter(data.financeInvoices, (row: any) => row.invoice_date || row.created_at),
    };
  }, [data, period]);
  const metrics = useMemo(() => buildMetrics(periodData), [periodData]);
  const recentOrders = recent(periodData.orders, 5);
  const recentQuotations = recent(periodData.quotations, 5);
  const lowStockRows = metrics.lowStockItems.slice(0, 5);
  const awaitingStock = periodData.workQueue.filter((job) => normalizeStatus(job.stock_status || job.status) === "AWAITING_STOCK").length;
  const issuedValue = periodData.financeInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const outstandingValue = periodData.financeInvoices
    .filter((invoice) => !["PAID", "RECEIVED"].includes(normalizeStatus(invoice.status)))
    .reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const isFirstPage = activePage === 0;
  const isLastPage = activePage === adminDashboardPages.length - 1;
  const goToPage = (page: number) => setActivePage(Math.max(0, Math.min(adminDashboardPages.length - 1, page)));
  const previousPage = () => goToPage(activePage - 1);
  const nextPage = () => goToPage(activePage + 1);

  return (
    <AdminShell
      kicker="SUPER ADMIN COMMAND CENTER"
      title="TRACK360 ERP Control Tower"
      description="Cross-portal status and actions."
      actions={<RefreshButton loading={loading} updatedAt={updatedAt} onClick={refresh} />}
    >
      <section className="admin-period-filter" aria-label="Super Admin dashboard period">
        <div>
          <strong>Dashboard Period</strong>
          <span>Showing cross-portal activity for {dashboardPeriodLabel(period).toLowerCase()}.</span>
        </div>
        <div className="admin-period-buttons">
          {dashboardPeriodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={period === option.value ? "is-active" : ""}
              onClick={() => setPeriod(option.value)}
              disabled={loading}
            >
              {option.label}
              <small>{option.detail}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="admin-dashboard-pager" aria-label="Super Admin dashboard pages">
        <button className="admin-page-arrow" type="button" onClick={previousPage} disabled={isFirstPage}>
          <ChevronLeft size={16} /> Previous
        </button>
        <div className="admin-dashboard-tabs">
          {adminDashboardPages.map((page, index) => (
            <button
              key={page}
              type="button"
              className={activePage === index ? "is-active" : ""}
              onClick={() => goToPage(index)}
            >
              <span>{index + 1}</span>
              {page}
            </button>
          ))}
        </div>
        <button className="admin-page-arrow" type="button" onClick={nextPage} disabled={isLastPage}>
          Next <ChevronRight size={16} />
        </button>
      </div>

      {activePage === 0 && (
        <section className="admin-dashboard-slide">
          <div className="admin-stat-grid admin-stat-grid-8 admin-stat-grid-dense">
            <StatCard label="Registered Clients" value={number(periodData.customers.length)} sub={dashboardPeriodLabel(period)} icon={Building2} to="/admin/crm" tone="blue" />
            <StatCard label="Management Approval Queue" value={number(metrics.managementApprovals.length)} sub="Quotations awaiting decision" icon={ShieldCheck} to="/crm/quotations?status=MANAGEMENT_PENDING" tone="teal" />
            <StatCard label="Pending Orders" value={number(metrics.pendingOrders)} sub={`${dashboardPeriodLabel(period)} pipeline`} icon={ClipboardIcon} to="/admin/orders" tone="amber" />
            <StatCard label="Low Stock Alerts" value={number(metrics.lowStockItems.length || data.inventorySummary?.low_stock_count || 0)} sub="Need reorder review" icon={AlertTriangle} to="/admin/inventory" tone="red" />
            <StatCard label="Active Field Service" value={number(metrics.activeDispatches.length)} sub={`${dashboardPeriodLabel(period)} field work`} icon={Truck} to="/inventory/field-service" tone="green" />
            <StatCard label="Pending Reconciliation" value={number(metrics.pendingReturns.length)} sub={`${dashboardPeriodLabel(period)} inventory review`} icon={RefreshCw} to="/inventory/reconciliation" tone="purple" />
            <StatCard label="Pending Bills" value={number(metrics.pendingBills.length)} sub={`${dashboardPeriodLabel(period)} finance queue`} icon={ReceiptText} to="/finance/billing-approvals" tone="steel" />
            <StatCard label="Invoices" value={number(metrics.invoicesInPeriod.length)} sub={`${dashboardPeriodLabel(period)} generated`} icon={DollarSign} to="/finance/invoices" tone="green" />
          </div>
        </section>
      )}

      {activePage === 1 && (
        <section className="admin-dashboard-slide">
          <div className="admin-area-grid">
            <DashboardAreaCard
              title="Client & Commercial"
              subtitle="Client requirement, quotation, approval and order conversion."
              icon={Building2}
              to="/admin/crm"
              rows={[
                { label: "Clients", value: number(periodData.customers.length), to: "/crm/clients" },
                { label: "Quotations", value: number(periodData.quotations.length), to: "/crm/quotations" },
                { label: "Management Approval", value: number(metrics.managementApprovals.length), to: "/crm/quotations?status=MANAGEMENT_PENDING" },
                { label: "Orders", value: number(periodData.orders.length), to: "/crm/orders" },
              ]}
            />
            <DashboardAreaCard
              title="Inventory & Fulfilment"
              subtitle="Stock gaps, procurement, field fulfilment and reconciliation."
              icon={Package}
              to="/admin/inventory"
              rows={[
                { label: "Incoming", value: number(periodData.workQueue.length), to: "/inventory/queue" },
                { label: "Awaiting Stock", value: number(awaitingStock), to: "/inventory/purchase-orders" },
                { label: "Field Service", value: number(metrics.activeDispatches.length), to: "/inventory/field-service" },
                { label: "Reconciliation", value: number(metrics.pendingReturns.length), to: "/inventory/reconciliation" },
              ]}
            />
            <DashboardAreaCard
              title="Finance & Receivables"
              subtitle="Billing approvals, issued invoices and value visibility."
              icon={DollarSign}
              to="/admin/finance"
              rows={[
                { label: "Pending Bills", value: number(metrics.pendingBills.length), to: "/finance/billing-approvals" },
                { label: "Invoices", value: number(periodData.financeInvoices.length), to: "/finance/invoices" },
                { label: "Issued Value", value: money(issuedValue), to: "/finance/invoices" },
                { label: "Outstanding", value: money(outstandingValue), to: "/finance/invoices" },
              ]}
            />
          </div>
        </section>
      )}

      {activePage === 2 && (
        <section className="admin-dashboard-slide">
          <section className="admin-panel admin-action-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Needs Attention</h2>
                <p className="admin-muted">Only urgent cross-portal work stays on the Admin Dashboard. Detailed records are opened from their own pages.</p>
              </div>
              <Link to="/admin/orders">Open tracker</Link>
            </div>
            <div className="admin-alert-list admin-alert-list-compact">
              <Link to="/crm/quotations?status=MANAGEMENT_PENDING"><ShieldCheck size={16} /> {metrics.managementApprovals.length} quotations awaiting senior management approval</Link>
              <Link to="/inventory/queue"><AlertTriangle size={16} /> {awaitingStock} orders awaiting stock or PO action</Link>
              <Link to="/inventory/reconciliation"><RefreshCw size={16} /> {metrics.pendingReturns.length} material reconciliations awaiting review</Link>
              <Link to="/finance/billing-approvals"><ReceiptText size={16} /> {metrics.pendingBills.length} finance bills pending approval</Link>
              <Link to="/inventory/products"><Package size={16} /> {metrics.lowStockItems.length} products at or below minimum stock</Link>
            </div>
          </section>

          <div className="admin-command-grid">
            <MiniTable
              title="Recent Orders Pipeline"
              action={<Link to="/admin/orders">View all <ArrowUpRight size={13} /></Link>}
              columns={["Order", "Client", "Status"]}
              empty="No orders found."
              rows={recentOrders.map((order) => [
                <Link to="/admin/orders">{order.order_number || "-"}</Link>,
                order.customer_name || "-",
                <StatusBadge status={order.status} />,
              ])}
            />
            <MiniTable
              title="Recent Quotations"
              action={<Link to="/crm/quotations">Open CRM <ArrowUpRight size={13} /></Link>}
              columns={["QT No", "Client", "Status"]}
              empty="No quotations found."
              rows={recentQuotations.map((quotation) => [
                <Link to={`/crm/quotations/${quotation.id}`}>{quotation.quotation_number || "-"}</Link>,
                quotation.customer_name || "-",
                <StatusBadge status={quotation.status} />,
              ])}
            />
            <MiniTable
              title="Low Stock Snapshot"
              action={<Link to="/inventory/products">Products <ArrowUpRight size={13} /></Link>}
              columns={["Product", "Stock", "Min"]}
              empty="No low-stock products found."
              rows={lowStockRows.map((product) => [
                product.product_name || "-",
                number(product.quantity),
                number(product.min_stock_level),
              ])}
            />
          </div>
        </section>
      )}

      {activePage === 3 && (
        <section className="admin-dashboard-slide">
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Separate Admin Areas</h2>
                <p className="admin-muted">Open one area at a time. Super Admin has full access, but the dashboard stays clean.</p>
              </div>
            </div>
            <div className="admin-portal-cards">
              {adminPortalCards.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.to} to={link.to}>
                    <span className="admin-portal-card-icon"><Icon size={19} /></span>
                    <strong>{link.label}</strong>
                    <small>{link.description}</small>
                    <span className="admin-portal-card-link">Open <ArrowUpRight size={13} /></span>
                  </Link>
                );
              })}
            </div>
          </section>
        </section>
      )}

      <div className="admin-dashboard-footer-nav">
        <button className="admin-page-arrow" type="button" onClick={previousPage} disabled={isFirstPage}>
          <ChevronLeft size={16} /> Previous
        </button>
        <span>
          Page {activePage + 1} of {adminDashboardPages.length}: <strong>{adminDashboardPages[activePage]}</strong>
        </span>
        <button className="admin-page-arrow" type="button" onClick={nextPage} disabled={isLastPage}>
          Next <ChevronRight size={16} />
        </button>
      </div>
    </AdminShell>
  );
}

function ClipboardIcon(props: any) {
  return <ClipboardList {...props} />;
}

export function AdminUsers() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const { data: accounts = [], isLoading } = useFilteredAccounts({ search, status });
  const updateAccountStatus = useUpdateAccountStatus();
  const { showToast } = useToastContext();

  const rows = useMemo(() => {
    return accounts.map((account: any) => {
      const roleName = account.role_name || account.role || account.role_key || "";
      const meta = getRolePortalMeta(roleName);
      return { account, roleName, meta };
    });
  }, [accounts]);

  const portalGroups = useMemo(() => {
    return rows.reduce((map: Record<string, typeof rows>, row) => {
      const key = row.meta.portalGroup || "EMS";
      map[key] = map[key] || [];
      map[key].push(row);
      return map;
    }, {});
  }, [rows]);

  const toggle = async (account: any) => {
    try {
      await updateAccountStatus.mutateAsync({ accountId: account.id, isActive: account.is_active === false });
      showToast("Account status updated");
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Unable to update account", "error");
    }
  };

  return (
    <AdminShell
      kicker="ADMIN USERS"
      title="User Management"
      description="Manage users and portal access."
      actions={<Link className="admin-btn admin-btn-primary" to="/accounts">Open Full Accounts</Link>}
    >
      <section className="admin-panel">
        <div className="admin-filter-row">
          <label>
            <span>Search user</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Email, employee, role or portal" />
          </label>
          <label>
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as any)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
      </section>
      {isLoading ? <div className="admin-panel admin-empty">Loading users...</div> : Object.entries(portalGroups).map(([portal, groupRows]) => (
        <MiniTable
          key={portal}
          title={`${portal} Portal Users`}
          columns={["User", "Role", "Access", "Status", "Action"]}
          empty="No users in this portal group."
          rows={groupRows.map(({ account, meta }) => [
            <div><strong>{account.email || account.username || "-"}</strong><small>{account.employee_name || account.display_name || ""}</small></div>,
            meta.label,
            meta.accessLevel,
            <StatusBadge status={account.is_active === false ? "INACTIVE" : "ACTIVE"} />,
            account.role_name === "super_admin"
              ? <span className="admin-muted">Protected</span>
              : <button className="admin-small-btn" onClick={() => toggle(account)}>{account.is_active === false ? "Activate" : "Deactivate"}</button>,
          ])}
        />
      ))}
    </AdminShell>
  );
}

export function AdminCrmOverview() {
  const { data, loading, updatedAt, refresh } = useAdminData();
  return (
    <AdminShell
      kicker="CRM OVERVIEW"
      title="Clients, Quotations and Orders"
      description="CRM pipeline overview."
      actions={<RefreshButton loading={loading} updatedAt={updatedAt} onClick={refresh} />}
    >
      <div className="admin-stat-grid">
        <StatCard label="Clients" value={data.customers.length} sub="Registered customers" icon={Building2} to="/crm/clients" />
        <StatCard label="Quotations" value={data.quotations.length} sub="All statuses" icon={FileSpreadsheet} to="/crm/quotations" tone="teal" />
        <StatCard label="Orders" value={data.orders.length} sub="Converted jobs" icon={ClipboardIcon} to="/crm/orders" tone="amber" />
        <StatCard label="Complaints" value={data.complaints.length} sub="Customer support" icon={AlertTriangle} to="/crm/complaints" tone="red" />
      </div>
      <div className="admin-two-grid">
        <MiniTable
          title="Recent Quotations"
          columns={["QT No", "Client", "Status", "Total"]}
          empty="No quotations."
          rows={recent(data.quotations, 8).map((q) => [
            <Link to={`/crm/quotations/${q.id}`}>{q.quotation_number || "-"}</Link>,
            q.customer_name || "-",
            <StatusBadge status={q.status} />,
            money(q.total_amount),
          ])}
        />
        <MiniTable
          title="Recent Complaints"
          columns={["No", "Client", "Priority", "Status"]}
          empty="No complaints."
          rows={recent(data.complaints, 8, "reported_at" as any).map((c) => [
            c.complaint_no || "-",
            c.customer_name || "-",
            c.priority || "-",
            <StatusBadge status={c.status} />,
          ])}
        />
      </div>
    </AdminShell>
  );
}

export function AdminInventoryOverview() {
  const { data, loading, updatedAt, refresh } = useAdminData();
  const metrics = buildMetrics(data);
  return (
    <AdminShell
      kicker="INVENTORY OVERVIEW"
      title="Stock, Field Fulfilment and Reconciliation"
      description="Inventory health and active work."
      actions={<RefreshButton loading={loading} updatedAt={updatedAt} onClick={refresh} />}
    >
      <div className="admin-stat-grid">
        <StatCard label="Products" value={data.inventorySummary?.total_products || data.products.length} sub="Catalog items" icon={Package} to="/inventory/products" />
        <StatCard label="Incoming Orders" value={data.workQueue.length} sub="CRM handoff queue" icon={ClipboardIcon} to="/inventory/queue" tone="amber" />
        <StatCard label="Active Field Service" value={metrics.activeDispatches.length} sub="Assignments in progress" icon={Truck} to="/inventory/field-service" tone="green" />
        <StatCard label="Pending Reconciliation" value={metrics.pendingReturns.length} sub="Needs verification" icon={RefreshCw} to="/inventory/reconciliation" tone="purple" />
      </div>
      <div className="admin-two-grid">
        <MiniTable
          title="Incoming Orders"
          columns={["Order", "Client", "Stock", "Action"]}
          empty="No incoming orders."
          rows={recent(data.workQueue, 8).map((job) => [
            job.order_number || job.quotation_number,
            job.customer_name || "-",
            <StatusBadge status={job.stock_status || job.status} />,
            <Link to="/inventory/queue">Open</Link>,
          ])}
        />
        <MiniTable
          title="Active Dispatches"
          columns={["Assignment", "Client", "Field Technician", "Status"]}
          empty="No active field service assignments."
          rows={recent(metrics.activeDispatches, 8, "created_at" as any).map((dispatch) => [
            dispatch.dispatch_number || "-",
            dispatch.customer_name || "-",
            dispatch.installer_name || "Field technician not assigned",
            <StatusBadge status={dispatch.status} />,
          ])}
        />
      </div>
    </AdminShell>
  );
}

export function AdminFinanceOverview() {
  const { data, loading, updatedAt, refresh } = useAdminData();
  const issuedTotal = data.financeInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);
  return (
    <AdminShell
      kicker="FINANCE OVERVIEW"
      title="Bills, Invoices and Accounts"
      description="Finance approvals and invoice health."
      actions={<RefreshButton loading={loading} updatedAt={updatedAt} onClick={refresh} />}
    >
      <div className="admin-stat-grid">
        <StatCard label="Billing Approvals" value={data.financeApprovals.length} sub="Waiting review" icon={ReceiptText} to="/finance/billing-approvals" tone="amber" />
        <StatCard label="Invoices" value={data.financeInvoices.length} sub="Finance invoice ledger" icon={FileSpreadsheet} to="/finance/invoices" />
        <StatCard label="Invoice Value" value={money(issuedTotal)} sub="Total ledger amount" icon={DollarSign} to="/finance/invoices" tone="green" />
        <StatCard label="Accounts" value="Open" sub="Chart and ledger" icon={ShieldCheck} to="/finance/accounts" tone="purple" />
      </div>
      <div className="admin-two-grid">
        <RevenueSummary invoices={data.financeInvoices} />
        <MiniTable
          title="Recent Finance Invoices"
          columns={["Invoice", "Client", "Status", "Amount"]}
          empty="No invoices."
          rows={recent(data.financeInvoices, 8).map((invoice) => [
            <Link to="/finance/invoices">{invoice.invoice_number || "-"}</Link>,
            invoice.customer_name || "-",
            <StatusBadge status={invoice.status} />,
            money(invoice.total_amount),
          ])}
        />
      </div>
    </AdminShell>
  );
}

export function AdminOrdersTracker() {
  const { data, loading, updatedAt, refresh } = useAdminData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const dispatchMap = useMemo(() => {
    return data.dispatches.reduce((map: Record<string, FieldDispatch>, dispatch) => {
      if (dispatch.order_number) map[dispatch.order_number] = dispatch;
      return map;
    }, {});
  }, [data.dispatches]);
  const filtered = data.orders.filter((order) => {
    const haystack = [order.order_number, order.quotation_number, order.customer_name, order.status].join(" ").toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesStatus = !status || normalizeStatus(order.status) === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminShell
      kicker="ALL ORDERS"
      title="End-to-End Orders Tracker"
      description="Track orders across every portal."
      actions={<RefreshButton loading={loading} updatedAt={updatedAt} onClick={refresh} />}
    >
      <section className="admin-panel">
        <div className="admin-filter-row">
          <label>
            <span>Search</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order, token, quotation or client" />
          </label>
          <label>
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {Array.from(new Set(data.orders.map((order) => normalizeStatus(order.status)))).map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
            </select>
          </label>
        </div>
      </section>
      <MiniTable
        title="Orders"
        columns={["Order", "Token", "Client", "CRM", "Dispatch", "Finance", "Action"]}
        empty="No orders found."
        rows={filtered.map((order) => {
          const dispatch = dispatchMap[order.order_number];
          const finance = data.financeInvoices.find((invoice) => invoice.order_number === order.order_number);
          return [
            <strong>{order.order_number || "-"}</strong>,
            order.token_number || "-",
            order.customer_name || "-",
            <StatusBadge status={order.status} />,
            dispatch ? <StatusBadge status={dispatch.status} /> : <span className="admin-muted">Field service not prepared</span>,
            finance ? <StatusBadge status={finance.status} /> : <span className="admin-muted">No invoice</span>,
            <Link to="/crm/orders">Open</Link>,
          ];
        })}
      />
    </AdminShell>
  );
}

export function AdminSystemLogs() {
  const [search, setSearch] = useState("");
  const { logs, isLoading, total } = useAuditLogs({ search, limit: 80 });
  return (
    <AdminShell
      kicker="SYSTEM LOGS"
      title="Audit Trail"
      description="System activity and audit records."
      actions={<Link className="admin-btn admin-btn-light" to="/audit-log">Open Full Audit Log</Link>}
    >
      <section className="admin-panel">
        <div className="admin-filter-row">
          <label>
            <span>Search logs</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Actor, path, action or module" />
          </label>
        </div>
      </section>
      <MiniTable
        title={`Recent Logs (${number(total)})`}
        columns={["Time", "Actor", "Module", "Action", "Path"]}
        empty={isLoading ? "Loading logs..." : "No logs found."}
        rows={logs.slice(0, 20).map((log) => [
          formatDate(log.timestamp),
          log.actor_email || log.user || "-",
          log.module || "-",
          log.action || "-",
          <span className="admin-muted">{log.path || "-"}</span>,
        ])}
      />
    </AdminShell>
  );
}

export function AdminSettings() {
  const { showToast } = useToastContext();
  const [company, setCompany] = useState({
    company_name: "",
    ntn_number: "",
    gst_number: "",
    address: "",
    phone: "",
    bank_account_number: "",
  });
  const [inventory, setInventory] = useState({ default_min_stock_threshold: 0, low_stock_alert_email: "" });

  useEffect(() => {
    inventoryApi.getMasterSettings()
      .then((settings) => {
        setCompany(settings.company);
        setInventory(settings.inventory);
      })
      .catch(() => undefined);
  }, []);

  const saveCompany = async () => {
    try {
      await inventoryApi.updateCompanySettings(company);
      showToast("Company settings saved");
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Unable to save company settings", "error");
    }
  };

  const saveInventory = async () => {
    try {
      await inventoryApi.updateInventorySettings(inventory);
      showToast("Inventory settings saved");
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Unable to save inventory settings", "error");
    }
  };

  return (
    <AdminShell
      kicker="ADMIN SETTINGS"
      title="System Settings"
      description="Company and inventory defaults."
    >
      <div className="admin-two-grid">
        <section className="admin-panel">
          <div className="admin-panel-head"><h2>Company Settings</h2></div>
          <div className="admin-form-grid">
            <label><span>Company Name</span><input value={company.company_name} onChange={(event) => setCompany({ ...company, company_name: event.target.value })} /></label>
            <label><span>NTN Number</span><input value={company.ntn_number} onChange={(event) => setCompany({ ...company, ntn_number: event.target.value })} /></label>
            <label><span>GST Number</span><input value={company.gst_number} onChange={(event) => setCompany({ ...company, gst_number: event.target.value })} /></label>
            <label><span>Phone</span><input value={company.phone} onChange={(event) => setCompany({ ...company, phone: event.target.value })} /></label>
            <label className="admin-full"><span>Address</span><input value={company.address} onChange={(event) => setCompany({ ...company, address: event.target.value })} /></label>
            <label className="admin-full"><span>Bank Account Number</span><input value={company.bank_account_number} onChange={(event) => setCompany({ ...company, bank_account_number: event.target.value })} /></label>
          </div>
          <button className="admin-btn admin-btn-primary" onClick={saveCompany}>Save Company Settings</button>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-head"><h2>Inventory Settings</h2></div>
          <div className="admin-form-grid">
            <label><span>Default Minimum Stock Threshold</span><input type="number" value={inventory.default_min_stock_threshold || ""} onChange={(event) => setInventory({ ...inventory, default_min_stock_threshold: Number(event.target.value || 0) })} /></label>
            <label><span>Low Stock Alert Email</span><input value={inventory.low_stock_alert_email} onChange={(event) => setInventory({ ...inventory, low_stock_alert_email: event.target.value })} /></label>
          </div>
          <button className="admin-btn admin-btn-primary" onClick={saveInventory}>Save Inventory Settings</button>
        </section>
      </div>
      <div className="admin-quick-grid">
        <Link className="admin-setting-link" to="/inventory/master-setup"><Settings size={18} /> Inventory master setup</Link>
        <Link className="admin-setting-link" to="/settings/roles"><ShieldCheck size={18} /> Role configuration</Link>
        <Link className="admin-setting-link" to="/accounts"><Users size={18} /> Account management</Link>
        <Link className="admin-setting-link" to="/audit-log"><UserX size={18} /> Audit log</Link>
      </div>
    </AdminShell>
  );
}
