import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export const crmPage: React.CSSProperties = {
  padding: "4px 0 28px",
  display: "grid",
  gap: 18,
};

export const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #dbe4f0",
  borderRadius: 10,
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.055)",
};

export const input: React.CSSProperties = {
  width: "100%",
  height: 42,
  border: "1px solid #cbd8ea",
  borderRadius: 8,
  padding: "0 12px",
  background: "#fff",
  color: "#0f172a",
  outline: "none",
  fontWeight: 650,
};

export const label: React.CSSProperties = {
  display: "grid",
  gap: 7,
  fontSize: 12,
  color: "#475569",
  fontWeight: 850,
};

export const tableWrap: React.CSSProperties = {
  ...card,
  overflow: "hidden",
};

export const th: React.CSSProperties = {
  background: "#eef4fb",
  color: "#334155",
  fontSize: 11,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  textAlign: "left",
  padding: "12px 14px",
  borderBottom: "1px solid #dbe4f0",
};

export const td: React.CSSProperties = {
  padding: "13px 14px",
  borderBottom: "1px solid #e7edf5",
  verticalAlign: "middle",
  color: "#0f172a",
};

export function money(value?: number | string) {
  const amount = Number(value || 0);
  return `Rs ${amount.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
}

export function dateText(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

export function statusBadge(status?: string) {
  const normalized = String(status || "DRAFT").toUpperCase();
  const tones: Record<string, { bg: string; color: string; border: string }> = {
    DRAFT: { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
    SENT: { bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" },
    APPROVED: { bg: "#dcfce7", color: "#047857", border: "#bbf7d0" },
    REJECTED: { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" },
    EXPIRED: { bg: "#fef3c7", color: "#b45309", border: "#fde68a" },
    ISSUED: { bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" },
    PAID: { bg: "#dcfce7", color: "#047857", border: "#bbf7d0" },
    CANCELLED: { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" },
    READY_FOR_INVENTORY: { bg: "#ede9fe", color: "#6d28d9", border: "#ddd6fe" },
    TAKEN: { bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" },
    PENDING: { bg: "#fef3c7", color: "#b45309", border: "#fde68a" },
    RESOLVED: { bg: "#dcfce7", color: "#047857", border: "#bbf7d0" },
    LOW: { bg: "#ecfdf5", color: "#047857", border: "#bbf7d0" },
    MEDIUM: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    HIGH: { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" },
    ACTIVE: { bg: "#dcfce7", color: "#047857", border: "#bbf7d0" },
    INACTIVE: { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" },
  };
  const tone = tones[normalized] || tones.DRAFT;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "5px 10px",
        fontSize: 11,
        fontWeight: 950,
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        color: tone.color,
      }}
    >
      {normalized.replace(/_/g, " ")}
    </span>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  to?: string;
  tone?: "primary" | "success" | "dark" | "danger" | "light";
};

export function CrmButton({ to, tone = "primary", style, children, ...props }: ButtonProps) {
  const tones: Record<string, React.CSSProperties> = {
    primary: { background: "#2563eb", color: "#fff", borderColor: "#2563eb" },
    success: { background: "#10b981", color: "#fff", borderColor: "#10b981" },
    dark: { background: "#0f172a", color: "#fff", borderColor: "#0f172a" },
    danger: { background: "#fee2e2", color: "#b91c1c", borderColor: "#fecaca" },
    light: { background: "#fff", color: "#0f172a", borderColor: "#cbd8ea" },
  };
  const base: React.CSSProperties = {
    border: "1px solid",
    borderRadius: 8,
    minHeight: 42,
    padding: "0 14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 900,
    textDecoration: "none",
    cursor: props.disabled ? "not-allowed" : "pointer",
    opacity: props.disabled ? 0.65 : 1,
    ...tones[tone],
    ...style,
  };
  if (to) {
    return (
      <Link to={to} style={base}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" style={base} {...props}>
      {children}
    </button>
  );
}

export function PageHeader({
  eyebrow,
  title,
  text,
  actions,
}: {
  eyebrow: string;
  title: string;
  text: string;
  actions?: React.ReactNode;
}) {
  return (
    <section
      style={{
        ...card,
        background: "linear-gradient(125deg, #10234d 0%, #1d4ed8 54%, #087f8c 100%)",
        color: "#fff",
        padding: "26px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 22,
        overflow: "hidden",
      }}
      className="crm-hero"
    >
      <div style={{ maxWidth: 860 }}>
        <div style={{ textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 950, color: "#b9dcff", fontSize: 12 }}>
          {eyebrow}
        </div>
        <h1 style={{ margin: "8px 0", fontSize: 32, lineHeight: 1.12 }}>{title}</h1>
        <p style={{ margin: 0, color: "#e0f2fe", lineHeight: 1.55, maxWidth: 920 }}>{text}</p>
      </div>
      {actions && <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>{actions}</div>}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  to,
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  to?: string;
}) {
  const content = (
    <div className="crm-metric-card" style={{ ...card, padding: 18, minHeight: 124, display: "grid", alignContent: "space-between" }}>
      <div style={{ textTransform: "uppercase", letterSpacing: 0.7, color: "#64748b", fontSize: 12, fontWeight: 950 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 950, color: "#0f172a" }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
        {detail} {to ? <ArrowRight size={14} /> : null}
      </div>
    </div>
  );
  if (!to) return content;
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ ...card, padding: 28, textAlign: "center", color: "#64748b" }}>
      <div style={{ color: "#0f172a", fontWeight: 950, marginBottom: 6 }}>{title}</div>
      <div>{detail}</div>
    </div>
  );
}

export function LoadingState({ labelText = "Loading CRM data..." }: { labelText?: string }) {
  return (
    <div style={{ ...card, padding: 28, display: "flex", gap: 10, alignItems: "center", color: "#2563eb", fontWeight: 900 }}>
      <Loader2 size={18} className="spin" /> {labelText}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ ...card, padding: 18, color: "#b91c1c", display: "flex", gap: 10, alignItems: "center", background: "#fff5f5" }}>
      <AlertCircle size={18} /> {message}
    </div>
  );
}

export async function copyText(text: string) {
  if (!text) return false;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}
