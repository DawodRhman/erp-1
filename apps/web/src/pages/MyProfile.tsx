import React from "react";
import { useAuth } from "../context/AuthContext";
import { useEmployee, useEmployeeFinance } from "../hooks/useEmployees";
import { useEmployeeSelfMetrics } from "../hooks/useDashboard";
import { useEmployeeAttachments } from "../hooks/useEmployeeAttachments";
import { apiClient } from "../services/apiClient";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  HeartPulse,
  Landmark,
  Loader2,
  FileText,
  Phone,
  UserRound,
  WalletCards,
} from "lucide-react";

const API_ORIGIN = String(apiClient.defaults.baseURL || "http://localhost:3001/api").replace(/\/api\/?$/, "");

function imageUrl(value?: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

function ImageModal({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.82)",
        backdropFilter: "blur(8px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn .25s ease-out",
        cursor: "pointer",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "90%",
          maxHeight: "85vh",
          animation: "slideIn .25s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: "100%",
            maxHeight: "85vh",
            borderRadius: 16,
            border: "4px solid #ffffff",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            objectFit: "contain",
          }}
        />
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: -16,
            right: -16,
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            border: "1px solid var(--br2)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            color: "var(--t1)",
            fontWeight: "bold",
            fontSize: 20,
            transition: "transform .15s ease",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          &times;
        </button>
      </div>
    </div>
  );
}

function getSelfProfile(payload: any) {
  if (!payload || typeof payload !== "object") return payload;
  return payload.employee || payload.profile || payload.user || payload.data || payload;
}

function getEmployeeIdFromPayload(payload: any) {
  const node = getSelfProfile(payload);
  return (
    node?.employee_id ||
    node?.employeeId ||
    node?.emp_id ||
    node?.id ||
    payload?.employee_id ||
    payload?.employeeId ||
    payload?.emp_id ||
    payload?.id
  );
}

function isEmployeeProfile(payload: any) {
  if (!payload || typeof payload !== "object") return false;
  return !!(
    payload.name ||
    payload.father_name ||
    payload.salaryInfo ||
    payload.employeeContact ||
    payload.emergencyContacts ||
    payload.bankInfo ||
    payload.medicalInfo ||
    payload.department_name ||
    payload.designation_title
  );
}

const rootFields = [
  "employee_id",
  "name",
  "father_name",
  "cnic",
  "date_of_birth",
];

const jobFields = [
  "department_id",
  "designation_id",
  "employment_type_id",
  "job_status_id",
  "work_mode_id",
  "work_location_id",
  "shift_id",
  "date_of_joining",
  "date_of_exit",
  "probation_end_date",
  "contract_end_date",
  "department_code",
  "shift_start_time",
  "shift_end_time",
  "late_after_minutes",
];

const salaryFields = [
  "base_salary",
  "currency",
  "effective_from",
  "revision_type",
  "revision_percent",
  "revision_reason",
];

const allowanceFields = [
  "allowance_type_id",
  "amount",
];

const employeeContactFields = [
  "primary_phone",
  "alternate_phone",
  "perment_address",
  "postal_address",
];

const emergencyFields = [
  "e_contact_1_relation",
  "e_contact_1_full_name",
  "e_contact_1_phone",
  "e_contact_1_phone_country_code",
  "e_contact_1_email",
  "e_contact_2_relation",
  "e_contact_2_full_name",
  "e_contact_2_phone",
  "e_contact_2_phone_country_code",
  "e_contact_2_email",
  "primary_contact",
];

const bankFields = [
  "bank_name",
  "branch_name",
  "branch_code",
  "iban",
  "account_title",
  "account_number",
  "account_type",
];

const medicalFields = [
  "blood_group",
  "date_of_birth",
  "gender",
  "height_cm",
  "weight_kg",
  "has_disability",
  "disability_type",
  "disability_description",
  "has_chronic_condition",
  "chronic_condition_notes",
  "has_known_allergies",
  "allergy_notes",
  "emergency_medication",
  "fitness_status",
  "last_medical_exam_date",
  "next_medical_exam_date",
];

const readableFieldMap: Record<string, { label: string; sourceKey: string }> = {
  department_id: { label: "Department", sourceKey: "department_name" },
  designation_id: { label: "Designation", sourceKey: "designation_title" },
  employment_type_id: { label: "Employment Type", sourceKey: "employment_type_name" },
  job_status_id: { label: "Job Status", sourceKey: "job_status_name" },
  work_mode_id: { label: "Work Mode", sourceKey: "work_mode_name" },
  work_location_id: { label: "Work Location", sourceKey: "work_location_name" },
  shift_id: { label: "Shift", sourceKey: "shift_name" },
  allowance_type_id: { label: "Allowance Type", sourceKey: "field_name" },
};

function isDateField(field: string) {
  return (
    field.endsWith("_at") ||
    field.endsWith("_date") ||
    field === "date_of_birth" ||
    field === "date_of_joining" ||
    field === "date_of_exit" ||
    field === "effective_from"
  );
}

function formatDateOnly(value: any) {
  if (!value) return "null";
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).split("T")[0] || String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatValue(value: any, field?: string) {
  if (value === null || value === undefined) return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (field && isDateField(field)) return formatDateOnly(value);
  return String(value);
}

function formatAllowanceAmount(allowance: any) {
  const amount = Number(allowance?.amount ?? 0);
  if (allowance?.is_percentage) {
    return `${Number.isFinite(amount) ? amount.toLocaleString("en-PK") : allowance?.amount}%`;
  }
  return `${Number.isFinite(amount) ? amount.toLocaleString("en-PK") : allowance?.amount} PKR`;
}

function formatSalaryAmount(value: any, currency: string) {
  const amount = Number(value ?? 0);
  const resolved = Number.isFinite(amount) ? amount.toLocaleString("en-PK") : String(value ?? "0");
  return currency === "PKR" ? `${resolved} PKR` : `${resolved} ${currency || "PKR"}`;
}

function labelFromKey(key: string) {
  if (readableFieldMap[key]) return readableFieldMap[key].label;
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function valueTone(value: any) {
  if (value === null || value === undefined) return "empty";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return "value";
}

function isQuietField(field: string) {
  return (
    field === "id" ||
    field.endsWith("_id") ||
    field === "created_by" ||
    field.endsWith("_at") ||
    field.endsWith("_date") ||
    field === "date_of_joining" ||
    field === "date_of_exit" ||
    field === "effective_from"
  );
}

function FieldGrid({
  source,
  fields,
  accent = "var(--p)",
}: {
  source: any;
  fields: string[];
  accent?: string;
}) {
  const visibleFields = fields.filter((field) => {
    const readable = readableFieldMap[field];
    const raw = readable ? source?.[readable.sourceKey] : source?.[field];
    return raw !== null && raw !== undefined && raw !== "";
  });

  if (visibleFields.length === 0) {
    return (
      <div style={{ color: "var(--t3)", fontSize: 12, padding: "8px 0" }}>
        No details provided.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        columnGap: 32,
        rowGap: 20,
      }}
    >
      {visibleFields.map((field) => {
        const readable = readableFieldMap[field];
        const raw = readable ? source?.[readable.sourceKey] : source?.[field];
        const tone = valueTone(raw);
        const value = formatValue(raw, field);
        const quiet = isQuietField(field) && !readable;
        return (
          <div
            key={field}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              borderBottom: "1px solid rgba(226,232,240,.5)",
              paddingBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--t3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {labelFromKey(field)}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 13,
                fontWeight: tone === "empty" ? 500 : 700,
                color:
                  tone === "empty"
                    ? "var(--t4)"
                    : tone === "yes"
                      ? "var(--green)"
                      : tone === "no"
                        ? "var(--red)"
                        : "var(--t1)",
                fontFamily: quiet ? "'IBM Plex Mono', monospace" : "inherit",
                overflowWrap: "anywhere",
                lineHeight: 1.4,
              }}
            >
              {value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const sectionMeta: Record<
  string,
  {
    label: string;
    accent: string;
    tint: string;
    Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  }
> = {
  employee: {
    label: "Employee",
    accent: "var(--p)",
    tint: "rgba(37,99,235,.1)",
    Icon: UserRound,
  },
  job: {
    label: "Job",
    accent: "var(--teal)",
    tint: "rgba(13,148,136,.1)",
    Icon: BriefcaseBusiness,
  },
  salaryInfo: {
    label: "Salary & Allowance",
    accent: "var(--green)",
    tint: "rgba(15,118,110,.1)",
    Icon: BadgeDollarSign,
  },
  salaryHistory: {
    label: "Salary History",
    accent: "var(--green)",
    tint: "rgba(15,118,110,.1)",
    Icon: BadgeDollarSign,
  },
  allowances: {
    label: "Allowances",
    accent: "#b45309",
    tint: "rgba(245,158,11,.14)",
    Icon: WalletCards,
  },
  employeeContact: {
    label: "Employee Contact",
    accent: "#2563eb",
    tint: "rgba(37,99,235,.1)",
    Icon: Phone,
  },
  emergencyContacts: {
    label: "Emergency Contacts",
    accent: "#db2777",
    tint: "rgba(236,72,153,.12)",
    Icon: Phone,
  },
  bankInfo: {
    label: "Bank Info",
    accent: "#7c3aed",
    tint: "rgba(124,58,237,.11)",
    Icon: Landmark,
  },
  medicalInfo: {
    label: "Medical Info",
    accent: "#0891b2",
    tint: "rgba(8,145,178,.11)",
    Icon: HeartPulse,
  },
  attachments: {
    label: "Employee Documents",
    accent: "#4338ca",
    tint: "rgba(67,56,202,.1)",
    Icon: FileText,
  },
};

function DataSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const meta = sectionMeta[title] || sectionMeta.employee;
  const Icon = meta.Icon;

  return (
    <div
      className="card"
      style={{
        marginBottom: 12,
        padding: 0,
        overflow: "hidden",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 16px",
          borderBottom: "1px solid var(--br2)",
          background:
            `linear-gradient(90deg, ${meta.tint}, rgba(255,255,255,.64))`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            fontSize: 12,
            fontWeight: 850,
            color: meta.accent,
            textTransform: "uppercase",
            letterSpacing: 0,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: "inline-grid",
              placeItems: "center",
              background: meta.tint,
              color: meta.accent,
            }}
          >
            <Icon size={15} strokeWidth={2.4} />
          </span>
          {meta.label}
        </div>
      </div>
      <div
        style={{
          padding: 14,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ProfileHero({
  employee,
  onImageClick,
}: {
  employee: any;
  onImageClick: (url: string) => void;
}) {
  const [profilePhotoFailed, setProfilePhotoFailed] = React.useState(false);
  const initials = String(employee.name || employee.employee_id || "?")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const profilePhotoUrl = imageUrl(employee.profilePhotoUrl || employee.profile_photo_url);

  React.useEffect(() => {
    setProfilePhotoFailed(false);
  }, [profilePhotoUrl]);

  const meta = [
    ["Employee ID", employee.employee_id],
    ["Department", employee.department_name],
    ["Designation", employee.designation_title],
    ["Status", employee.job_status_name],
  ];

  return (
    <div
      className="card"
      style={{
        marginBottom: 20,
        padding: 24,
        borderRadius: 12,
        background:
          "linear-gradient(135deg, rgba(37,99,235,.06), rgba(13,148,136,.05) 48%, rgba(236,72,153,.06))",
        border: "1px solid rgba(147,197,253,.35)",
        boxShadow: "0 10px 30px rgba(59,130,246,.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        {profilePhotoUrl && !profilePhotoFailed ? (
          <img
            src={profilePhotoUrl}
            alt={`${formatValue(employee.name)} profile`}
            onError={() => setProfilePhotoFailed(true)}
            onClick={() => onImageClick(profilePhotoUrl)}
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              objectFit: "cover",
              background: "linear-gradient(135deg, var(--p), var(--teal))",
              border: "4px solid #ffffff",
              boxShadow: "0 8px 24px rgba(37,99,235,.15), 0 0 0 1px rgba(37,99,235,.1)",
              flex: "0 0 auto",
              cursor: "pointer",
              transition: "transform .22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow .22s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 12px 30px rgba(37,99,235,.24), 0 0 0 2px var(--p)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,99,235,.15), 0 0 0 1px rgba(37,99,235,.1)";
            }}
          />
        ) : (
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, var(--p), var(--teal))",
              color: "white",
              fontWeight: 800,
              fontSize: 36,
              border: "4px solid #ffffff",
              boxShadow: "0 8px 24px rgba(37,99,235,.15), 0 0 0 1px rgba(37,99,235,.1)",
              flex: "0 0 auto",
            }}
          >
            {initials || "?"}
          </div>
        )}
        <div style={{ minWidth: 240, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div
            style={{
              fontSize: 24,
              lineHeight: 1.2,
              fontWeight: 800,
              color: "var(--t1)",
              marginBottom: 8,
            }}
          >
            {formatValue(employee.name)}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {meta.map(([label, value]) => (
              <span
                key={label}
                className="mono"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "#ffffff",
                  border: "1px solid var(--br2)",
                  color: "var(--t2)",
                  fontSize: 11,
                  fontFamily: "inherit",
                  fontWeight: 600,
                  boxShadow: "0 2px 4px rgba(15,23,42,.02)",
                }}
              >
                <span style={{ color: "var(--t3)", fontWeight: 700 }}>
                  {label}
                </span>
                {formatValue(value)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactCards({ source }: { source: any }) {
  const contacts = [
    {
      label: "Primary",
      name: source?.e_contact_1_full_name || source?.primary_contact || "Primary contact",
      relation: source?.e_contact_1_relation,
      phone: source?.e_contact_1_phone || source?.contact_1,
      code: source?.e_contact_1_phone_country_code,
      email: source?.e_contact_1_email,
      accent: "var(--p)",
      tint: "rgba(37,99,235,.09)",
    },
    {
      label: "Secondary",
      name: source?.e_contact_2_full_name || "Secondary contact",
      relation: source?.e_contact_2_relation,
      phone: source?.e_contact_2_phone || source?.contact_2,
      code: source?.e_contact_2_phone_country_code,
      email: source?.e_contact_2_email,
      accent: "var(--teal)",
      tint: "rgba(13,148,136,.09)",
    },
  ].filter((contact) => contact.phone || contact.name !== "Secondary contact" || contact.email);

  if (!contacts.length) {
    return (
      <div className="mono" style={{ color: "var(--t3)", fontSize: 12 }}>
        Not provided
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 12 }}>
      {contacts.map((contact) => (
        <div
          key={contact.label}
          style={{
            padding: "14px 16px",
            borderRadius: 8,
            background: "#ffffff",
            border: "1px solid var(--br2)",
            borderLeft: `4px solid ${contact.accent}`,
            boxShadow: "0 2px 8px rgba(15,23,42,.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="pill pill-blue" style={{ color: contact.accent, background: contact.tint }}>{contact.label}</span>
            {contact.relation && <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 500 }}>{contact.relation}</span>}
          </div>
          <div style={{ fontWeight: 700, color: "var(--t1)", marginBottom: 4, fontSize: 14 }}>{formatValue(contact.name)}</div>
          <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: contact.accent }}>
            {[contact.code, contact.phone].filter(Boolean).join(" ")}
          </div>
          {contact.email && <div className="mono" style={{ marginTop: 5, fontSize: 11, color: "var(--t3)" }}>{contact.email}</div>}
        </div>
      ))}
    </div>
  );
}

export default function MyProfile() {
  const { user } = useAuth();
  const employeeId = user?.employeeId;
  const {
    data: selfMetrics,
    isLoading: isSelfLoading,
    isError: isSelfError,
  } = useEmployeeSelfMetrics();
  const selfProfile = getSelfProfile(selfMetrics);
  const resolvedEmployeeId = employeeId || getEmployeeIdFromPayload(selfMetrics);
  const {
    data: employeeById,
    isLoading: isEmployeeLoading,
    isError: isEmployeeError,
  } = useEmployee(resolvedEmployeeId);
  const {
    data: attachments = [],
    isLoading: attachmentsLoading,
  } = useEmployeeAttachments(resolvedEmployeeId);
  const { data: finance = null } = useEmployeeFinance(resolvedEmployeeId);
  const emp = employeeById || (isEmployeeProfile(selfProfile) ? selfProfile : null);

  const [activeTab, setActiveTab] = React.useState<
    "personal" | "job" | "compensation" | "bank-medical" | "documents"
  >("personal");
  const [previewPhotoUrl, setPreviewPhotoUrl] = React.useState<string | null>(null);

  const isLoading =
    !emp && (isSelfLoading || (!!resolvedEmployeeId && isEmployeeLoading));
  const isError =
    !emp && ((!resolvedEmployeeId && isSelfError) || (!!resolvedEmployeeId && isEmployeeError));

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Loader2 className="spinner" size={28} />
        <div style={{ marginTop: 10, fontSize: 13, color: "var(--t3)" }}>Loading your profile...</div>
      </div>
    );
  }

  if (isError || !emp) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "red" }}>
        Error loading profile.
      </div>
    );
  }

  const allowances = Array.isArray(emp.allowances) ? emp.allowances : [];
  const activeAllowances = allowances.filter((allowance: any) => allowance?.is_active !== false);
  const deactiveAllowances = allowances.filter((allowance: any) => allowance?.is_active === false);
  const salaryHistory = Array.isArray(finance?.salaryHistory) ? finance.salaryHistory : [];
  const allowanceHistory = Array.isArray(finance?.allowancesHistory) ? finance.allowancesHistory : [];

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">My Profile</div>
          <div className="pg-sub">Employee record from the backend profile payload</div>
        </div>
      </div>

      <ProfileHero employee={emp} onImageClick={setPreviewPhotoUrl} />

      {/* Tabs Navigation */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--br2)",
          marginBottom: 20,
          gap: 4,
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        <button
          className={`tab-link ${activeTab === "personal" ? "active" : ""}`}
          onClick={() => setActiveTab("personal")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            outline: "none",
          }}
        >
          <UserRound size={15} />
          Personal & Contact
        </button>
        <button
          className={`tab-link ${activeTab === "job" ? "active" : ""}`}
          onClick={() => setActiveTab("job")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            outline: "none",
          }}
        >
          <BriefcaseBusiness size={15} />
          Job & Employment
        </button>
        <button
          className={`tab-link ${activeTab === "compensation" ? "active" : ""}`}
          onClick={() => setActiveTab("compensation")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            outline: "none",
          }}
        >
          <BadgeDollarSign size={15} />
          Compensation
        </button>
        <button
          className={`tab-link ${activeTab === "bank-medical" ? "active" : ""}`}
          onClick={() => setActiveTab("bank-medical")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            outline: "none",
          }}
        >
          <HeartPulse size={15} />
          Bank & Medical
        </button>
        <button
          className={`tab-link ${activeTab === "documents" ? "active" : ""}`}
          onClick={() => setActiveTab("documents")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            outline: "none",
          }}
        >
          <FileText size={15} />
          Documents
        </button>
      </div>

      {/* Tab Panes (Rendered but toggled via display for test visibility) */}
      <div style={{ display: activeTab === "personal" ? "block" : "none" }}>
        <DataSection title="employee">
          <FieldGrid source={emp} fields={rootFields} accent={sectionMeta.employee.accent} />
        </DataSection>

        <DataSection title="employeeContact">
          <FieldGrid
            source={emp.employeeContact}
            fields={employeeContactFields}
            accent={sectionMeta.employeeContact.accent}
          />
        </DataSection>

        <DataSection title="emergencyContacts">
          <ContactCards source={emp.emergencyContacts} />
        </DataSection>
      </div>

      <div style={{ display: activeTab === "job" ? "block" : "none" }}>
        <DataSection title="job">
          <FieldGrid source={emp} fields={jobFields} accent={sectionMeta.job.accent} />
        </DataSection>
      </div>

      <div style={{ display: activeTab === "compensation" ? "block" : "none" }}>
        <DataSection title="salaryInfo">
          <FieldGrid source={emp.salaryInfo} fields={salaryFields} accent={sectionMeta.salaryInfo.accent} />
        </DataSection>

        <DataSection title="allowances">
          {allowances.length ? (
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: "var(--t1)", marginBottom: 10 }}>Current Allowances</div>
                {activeAllowances.length ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                    {activeAllowances.map((allowance: any, index: number) => (
                      <div
                        key={allowance?.id || index}
                        style={{
                          padding: "14px 16px",
                          borderRadius: 8,
                          background: "#ffffff",
                          border: "1px solid var(--br2)",
                          borderLeft: "4px solid var(--amber)",
                          boxShadow: "0 2px 8px rgba(15,23,42,.02)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          minHeight: 100,
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            alignSelf: "flex-start",
                            gap: 8,
                            padding: "4px 8px",
                            borderRadius: 999,
                            background: "rgba(245,158,11,.13)",
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#b45309",
                            marginBottom: 10,
                            textTransform: "uppercase",
                          }}
                        >
                          {formatValue(allowance?.field_name)}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <span className="mono" style={{ fontSize: 18, fontWeight: 900, color: "var(--t1)" }}>
                            {formatAllowanceAmount(allowance)}
                          </span>
                          <span className="pill pill-green">Current</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "18px 14px", textAlign: "center", background: "rgba(148,163,184,.05)", border: "1px dashed var(--br2)", borderRadius: 8, color: "var(--t3)" }}>
                    No current active allowances.
                  </div>
                )}
              </div>
              {deactiveAllowances.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "var(--t1)", marginBottom: 10 }}>Deactive Allowances</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                    {deactiveAllowances.map((allowance: any, index: number) => (
                      <div
                        key={allowance?.id || index}
                        style={{
                          padding: "14px 16px",
                          borderRadius: 8,
                          background: "#ffffff",
                          border: "1px solid var(--br2)",
                          borderLeft: "4px solid var(--red)",
                          boxShadow: "0 2px 8px rgba(15,23,42,.02)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          minHeight: 100,
                          opacity: 0.82,
                        }}
                      >
                        <div style={{ display: "inline-flex", alignItems: "center", alignSelf: "flex-start", gap: 8, padding: "4px 8px", borderRadius: 999, background: "rgba(220,38,38,.1)", fontSize: 11, fontWeight: 800, color: "var(--red)", marginBottom: 10, textTransform: "uppercase" }}>
                          {formatValue(allowance?.field_name)}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <span className="mono" style={{ fontSize: 18, fontWeight: 900, color: "var(--t1)" }}>
                            {formatAllowanceAmount(allowance)}
                          </span>
                          <span className="pill pill-red">Deactive</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                background: "rgba(148,163,184,.05)",
                border: "1px dashed var(--br2)",
                borderRadius: 8,
                color: "var(--t3)",
              }}
            >
              No allowances configured for this employee.
            </div>
          )}
        </DataSection>

        <DataSection title="salaryHistory">
          <div style={{ overflowX: "auto" }}>
            {salaryHistory.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Effective From</th>
                    <th>Base Salary</th>
                    <th>Revision Type</th>
                    <th>Percent</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryHistory.map((row: any, index: number) => (
                    <tr key={row.id || index}>
                      <td className="mono">{formatDateOnly(row.effective_from)}</td>
                      <td className="mono">{formatSalaryAmount(row.base_salary, row.currency || emp.salaryInfo?.currency || "PKR")}</td>
                      <td>{formatValue(row.revision_type)}</td>
                      <td className="mono">{row.revision_percent ?? "Not provided"}</td>
                      <td>{formatValue(row.revision_reason)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  background: "rgba(148,163,184,.05)",
                  border: "1px dashed var(--br2)",
                  borderRadius: 8,
                  color: "var(--t3)",
                }}
              >
                No salary history available yet.
              </div>
            )}
          </div>
        </DataSection>

        <DataSection title="allowances">
          <div style={{ overflowX: "auto" }}>
            {allowanceHistory.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Current</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {allowanceHistory.map((row: any, index: number) => (
                    <tr key={row.id || index}>
                      <td>{formatValue(row.field_name || row.allowance_type_name || row.allowance_type_id)}</td>
                      <td className="mono">{formatAllowanceAmount(row)}</td>
                      <td>{row.is_current ? "Yes" : "No"}</td>
                      <td className="mono">{formatDateOnly(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  background: "rgba(148,163,184,.05)",
                  border: "1px dashed var(--br2)",
                  borderRadius: 8,
                  color: "var(--t3)",
                }}
              >
                No allowance history available yet.
              </div>
            )}
          </div>
        </DataSection>
      </div>

      <div style={{ display: activeTab === "bank-medical" ? "block" : "none" }}>
        <DataSection title="bankInfo">
          {emp.bankInfo?.is_verified && (
            <div style={{ marginBottom: 12 }}>
              <span className="pill pill-green" style={{ fontSize: 11, padding: "4px 10px" }}>Verified</span>
            </div>
          )}
          <FieldGrid source={emp.bankInfo} fields={bankFields} accent={sectionMeta.bankInfo.accent} />
        </DataSection>

        <DataSection title="medicalInfo">
          <FieldGrid
            source={emp.medicalInfo}
            fields={medicalFields}
            accent={sectionMeta.medicalInfo.accent}
          />
        </DataSection>
      </div>

      <div style={{ display: activeTab === "documents" ? "block" : "none" }}>
        <DataSection title="attachments">
          {attachmentsLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--t3)", padding: 20 }}>
              <Loader2 className="spinner" size={16} />
              <span>Loading documents...</span>
            </div>
          ) : attachments.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              {attachments.map((item: any) => (
                <a
                  key={item.id}
                  href={imageUrl(item.url || item.file_path)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: 14,
                    borderRadius: 8,
                    border: "1px solid var(--br2)",
                    background: "rgba(255, 255, 255, 0.9)",
                    color: "var(--t1)",
                    textDecoration: "none",
                    boxShadow: "0 4px 12px rgba(15,23,42,.03)",
                    transition: "border-color .15s, box-shadow .15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--p)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(15,23,42,.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--br2)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(15,23,42,.03)";
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(67,56,202,.08)",
                        color: "rgba(67,56,202,1)",
                      }}
                    >
                      <FileText size={18} />
                    </span>
                    <span>
                      <strong style={{ display: "block", fontSize: 13, color: "var(--t1)" }}>
                        {formatValue(item.original_filename)}
                      </strong>
                      <span style={{ display: "block", marginTop: 2, color: "var(--t3)", fontSize: 11 }}>
                        {formatValue(item.document_type || item.kind)} · {Math.ceil(Number(item.size_bytes || 0) / 1024)} KB
                      </span>
                    </span>
                  </span>
                  <span className="pill pill-blue">View</span>
                </a>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                background: "rgba(148,163,184,.05)",
                border: "1px dashed var(--br2)",
                borderRadius: 8,
                color: "var(--t3)",
              }}
            >
              No documents uploaded yet.
            </div>
          )}
        </DataSection>
      </div>

      {previewPhotoUrl && (
        <ImageModal
          src={previewPhotoUrl}
          alt={`${formatValue(emp.name)} profile`}
          onClose={() => setPreviewPhotoUrl(null)}
        />
      )}
    </div>
  );
}
