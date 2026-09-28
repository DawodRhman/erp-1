export const CLIENT_CATEGORY_OPTIONS = [
  { value: "INDIVIDUAL", label: "Individual / Personal Client" },
  { value: "ORGANIZATION", label: "Organization / Company" },
  { value: "GROUP_OF_COMPANIES", label: "Group of Companies" },
  { value: "GOVERNMENT", label: "Government Organization" },
  { value: "NON_PROFIT", label: "Non-profit / NGO" },
] as const;

export const ORGANIZATION_TYPE_OPTIONS = [
  { value: "BANK", label: "Bank / Financial Institution" },
  { value: "CORPORATE", label: "Corporate Enterprise" },
  { value: "SME", label: "Small or Medium Business" },
  { value: "RETAIL_BUSINESS", label: "Retail Business" },
  { value: "EDUCATION", label: "Educational Institution" },
  { value: "HEALTHCARE", label: "Healthcare Organization" },
  { value: "GOVERNMENT_DEPARTMENT", label: "Government Department" },
  { value: "NGO", label: "NGO / Welfare Organization" },
  { value: "OTHER", label: "Other Organization" },
] as const;

export const SERVICE_CATEGORY_OPTIONS = [
  { value: "SECURITY_SYSTEMS", label: "Security & Surveillance Systems" },
  { value: "HR_STAFFING", label: "HR & Staffing Services" },
  { value: "MAINTENANCE_SUPPORT", label: "Maintenance & Technical Support" },
  { value: "IT_CYBERSECURITY", label: "IT & Cybersecurity Services" },
  { value: "RENTAL_LEASING", label: "Equipment Rental / Leasing" },
  { value: "PRODUCT_SUPPLY", label: "Product Supply Only" },
  { value: "CONSULTANCY", label: "Consultancy / Project Services" },
  { value: "OTHER", label: "Other Service" },
] as const;

type CustomerProfile = {
  customer_category?: string;
  customer_type?: string;
  organization_type?: string;
  service_categories?: string[];
};

function optionLabel(options: readonly { value: string; label: string }[], value?: string, fallback = "Not specified") {
  const normalized = String(value || "").trim().toUpperCase().replace(/[\s/-]+/g, "_");
  return options.find((option) => option.value === normalized)?.label || (value ? String(value).replace(/_/g, " ") : fallback);
}

export function normalizeClientCategory(customer?: CustomerProfile) {
  const explicit = String(customer?.customer_category || "").toUpperCase();
  if (CLIENT_CATEGORY_OPTIONS.some((option) => option.value === explicit)) return explicit;
  return String(customer?.customer_type || "").toUpperCase() === "INDIVIDUAL" ? "INDIVIDUAL" : "ORGANIZATION";
}

export function clientCategoryLabel(value?: string) {
  return optionLabel(CLIENT_CATEGORY_OPTIONS, value, "Organization / Company");
}

export function organizationTypeLabel(value?: string) {
  return optionLabel(ORGANIZATION_TYPE_OPTIONS, value, "Other Organization");
}

export function serviceCategoryLabel(value?: string) {
  return optionLabel(SERVICE_CATEGORY_OPTIONS, value, "Other Service");
}

export function serviceSummary(customer?: CustomerProfile, empty = "No service interests recorded") {
  const services = Array.isArray(customer?.service_categories) ? customer.service_categories : [];
  return services.length ? services.map(serviceCategoryLabel).join(", ") : empty;
}

export function organizationTypeValue(customer?: CustomerProfile) {
  if (normalizeClientCategory(customer) === "INDIVIDUAL") return "";
  const raw = String(customer?.organization_type || customer?.customer_type || "OTHER").trim().toUpperCase();
  const normalized = raw.replace(/[\s/-]+/g, "_");
  return ORGANIZATION_TYPE_OPTIONS.some((option) => option.value === normalized) ? normalized : "OTHER";
}
