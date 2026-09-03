export type RolePortalMeta = {
  label: string;
  portalGroup: string;
  accessLevel: string;
  summary: string;
};

const ROLE_PORTAL_META: Record<string, RolePortalMeta> = {
  super_admin: {
    label: "Super Admin",
    portalGroup: "Admin",
    accessLevel: "Full ERP access",
    summary: "Controls CRM, Inventory, Finance, EMS and user management.",
  },
  csr_officer: {
    label: "CSR Officer",
    portalGroup: "CRM",
    accessLevel: "CRM service access",
    summary: "Clients, leads, quotations, approvals, orders and complaints.",
  },
  crm_officer: {
    label: "CRM Officer",
    portalGroup: "CRM",
    accessLevel: "CRM service access",
    summary: "Clients, leads, quotations, approvals, orders and complaints.",
  },
  inventory_officer: {
    label: "Inventory Officer",
    portalGroup: "Inventory",
    accessLevel: "Full inventory access",
    summary: "Stock, tokens, purchase orders, dispatches, returns and setup.",
  },
  finance_officer: {
    label: "Finance Officer",
    portalGroup: "Finance",
    accessLevel: "Finance service access",
    summary: "Billing approvals, invoices, summaries, accounts and settlements.",
  },
  inv_fin_admin: {
    label: "Inventory + Finance Admin",
    portalGroup: "Inventory + Finance",
    accessLevel: "Dual service access",
    summary: "Inventory and finance operations without full super admin scope.",
  },
  employee: {
    label: "Employee",
    portalGroup: "EMS",
    accessLevel: "Self-service access",
    summary: "Personal dashboard, attendance, leave, penalties and profile.",
  },
};

function titleCaseRole(roleName: string) {
  return String(roleName || "Not provided")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getRolePortalMeta(roleName?: string | null): RolePortalMeta {
  const normalized = String(roleName || "").trim();
  if (normalized && ROLE_PORTAL_META[normalized]) {
    return ROLE_PORTAL_META[normalized];
  }

  return {
    label: titleCaseRole(normalized),
    portalGroup: "EMS",
    accessLevel: "Role-based access",
    summary: "Access is controlled by assigned permissions.",
  };
}
