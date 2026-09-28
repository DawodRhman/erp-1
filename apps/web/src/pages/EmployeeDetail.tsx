import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  BadgeDollarSign,
  Banknote,
  CalendarDays,
  BriefcaseBusiness,
  Clock3,
  FileText,
  HeartPulse,
  Landmark,
  Mail,
  Loader2,
  Phone,
  Upload,
  UserRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Modal from "../components/common/Modal";
import { useToastContext } from "../context/ToastContext";
import { useAttendanceReport } from "../hooks/useAttendance";
import {
  useAllowanceTypes,
  useDepartments,
  useDesignations,
  usePenaltyRules,
  useRoles,
  useWorkLocations,
} from "../hooks/useConfig";
import { useEmployee, useEmployeeActions, useEmployeeFinance } from "../hooks/useEmployees";
import { renderCredentialTemplate, useCredentialTemplate } from "../hooks/useAccounts";
import { useLeaveBalances, useLeaves } from "../hooks/useLeaves";
import { usePenalties } from "../hooks/usePenalties";
import { useRbac } from "../hooks/useRbac";
import { useEmployeeAttachments } from "../hooks/useEmployeeAttachments";
import { apiClient } from "../services/apiClient";
import { formatPKR, getStatusColor } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const API_ORIGIN = String(apiClient.defaults.baseURL || "http://localhost:3001/api").replace(/\/api\/?$/, "");
const salaryRevisionTypes = ["Initial", "Promotion", "Demotion", "Increment", "Decrement", "Correction", "Market Adjustment"];
const careerMovementTypes = ["Promotion", "Demotion", "Transfer", "Department Change", "Designation Change", "Correction"];

function firstValue(...values: any[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function text(value: any) {
  const resolved = firstValue(value);
  return resolved === undefined ? "Not provided" : String(resolved);
}

function numberValue(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value: any) {
  if (!value) return "Not provided";
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10) || "Not provided";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatStatus(value: any) {
  return text(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function daysInclusive(start: any, end: any) {
  if (!start || !end) return null;
  const startDate = new Date(String(start).slice(0, 10));
  const endDate = new Date(String(end).slice(0, 10));
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
}

function getWindowMonths(offset: 0 | 6) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - offset - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTHS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
    };
  });
}

function getInitials(name: string, fallback: string) {
  return (name || fallback || "?")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function attachmentUrl(item: any) {
  const rawUrl = firstValue(item?.url, item?.file_path);
  if (!rawUrl) return "";
  const url = String(rawUrl);
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
}

function formatMoney(value: any, currency: string) {
  const amount = Number(value ?? 0);
  const resolved = Number.isFinite(amount) ? amount.toLocaleString("en-PK") : String(value ?? "0");
  return currency === "PKR" ? `${resolved} PKR` : `${resolved} ${currency || "PKR"}`;
}

function formatValue(value: any) {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatAllowanceAmount(allowance: any) {
  const amount = Number(allowance?.amount ?? 0);
  if (allowance?.is_percentage) {
    return `${Number.isFinite(amount) ? amount.toLocaleString("en-PK") : allowance?.amount}%`;
  }
  return `${Number.isFinite(amount) ? amount.toLocaleString("en-PK") : allowance?.amount} PKR`;
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
        cursor: "pointer",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "90%",
          maxHeight: "85vh",
        }}
        onClick={(event) => event.stopPropagation()}
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
          }}
        >
          &times;
        </button>
      </div>
    </div>
  );
}

function ProfileHero({
  employee,
  profilePhotoUrl,
  profilePhotoFailed,
  setProfilePhotoFailed,
  onImageClick,
}: {
  employee: any;
  profilePhotoUrl: string;
  profilePhotoFailed: boolean;
  setProfilePhotoFailed: (value: boolean) => void;
  onImageClick: (url: string) => void;
}) {
  const initials = getInitials(employee.name, employee.id);

  React.useEffect(() => {
    setProfilePhotoFailed(false);
  }, [profilePhotoUrl, setProfilePhotoFailed]);

  return (
    <div
      className="card"
      style={{
        marginBottom: 20,
        padding: 24,
        borderRadius: 12,
        background: "linear-gradient(135deg, rgba(37,99,235,.06), rgba(13,148,136,.05) 48%, rgba(236,72,153,.06))",
        border: "1px solid rgba(147,197,253,.35)",
        boxShadow: "0 10px 30px rgba(59,130,246,.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        {profilePhotoUrl && !profilePhotoFailed ? (
          <img
            src={profilePhotoUrl}
            alt={`${employee.name} profile`}
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
          <div style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 800, color: "var(--t1)", marginBottom: 8 }}>
            {text(employee.name)}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              ["Employee ID", employee.id],
              ["Department", employee.department],
              ["Designation", employee.designation],
              ["Status", employee.jobStatus],
            ].map(([label, value]) => (
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
                <span style={{ color: "var(--t3)", fontWeight: 700 }}>{label}</span>
                {text(value)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeWhatsappPhone(value: any) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits || digits === "0") return "";
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `92${digits.slice(1)}`;
  if (digits.length === 10) return `92${digits}`;
  return digits;
}

function buildCredentialsWhatsappUrl({
  employeeId,
  employeeName,
  email,
  password,
  phone,
  template,
}: {
  employeeId: string;
  employeeName: string;
  email: string;
  password: string;
  phone: string;
  template?: string;
}) {
  const whatsappPhone = normalizeWhatsappPhone(phone);
  if (!whatsappPhone || !email || !password) return "";
  const message = renderCredentialTemplate(template, {
    employeeId,
    employeeName,
    email,
    password,
    loginUrl: `${window.location.origin}/login`,
  });
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
}

function normalizeEmployee(raw: any) {
  return {
    id: text(firstValue(raw?.employee_id, raw?.id)),
    name: text(firstValue(raw?.personalInfo?.name, raw?.name, raw?.employee_name)),
    fatherName: text(firstValue(raw?.personalInfo?.father_name, raw?.father_name)),
    cnic: text(firstValue(raw?.personalInfo?.cnic, raw?.cnic)),
    dob: firstValue(raw?.personalInfo?.date_of_birth, raw?.date_of_birth),
    gender: text(firstValue(raw?.personalInfo?.gender, raw?.medicalInfo?.gender, raw?.gender)),
    department: text(firstValue(raw?.jobInfo?.department_name, raw?.department_name, raw?.department)),
    departmentId: firstValue(raw?.jobInfo?.department_id, raw?.department_id),
    designation: text(firstValue(raw?.jobInfo?.designation_name, raw?.designation_title, raw?.designation_name, raw?.designation)),
    designationId: firstValue(raw?.jobInfo?.designation_id, raw?.designation_id),
    employmentType: text(firstValue(raw?.jobInfo?.employment_type_name, raw?.employment_type_name)),
    jobStatus: text(firstValue(raw?.jobInfo?.job_status_name, raw?.job_status_name, raw?.status)),
    workMode: text(firstValue(raw?.jobInfo?.work_mode_name, raw?.work_mode_name)),
    workLocation: text(firstValue(raw?.jobInfo?.work_location_name, raw?.work_location_name)),
    workLocationId: firstValue(raw?.jobInfo?.work_location_id, raw?.work_location_id),
    shift: text(firstValue(raw?.jobInfo?.shift_name, raw?.shift_name)),
    dateOfJoining: firstValue(raw?.jobInfo?.date_of_joining, raw?.date_of_joining),
    dateOfExit: firstValue(raw?.jobInfo?.date_of_exit, raw?.date_of_exit),
    email: text(firstValue(raw?.accountInfo?.email, raw?.email, raw?.user?.email)),
    phone: text(firstValue(raw?.employeeContact?.primary_phone, raw?.accountInfo?.phone, raw?.phone, raw?.emergencyContacts?.contact_1)),
    emergency1: text(raw?.emergencyContacts?.e_contact_1_full_name),
    emergency2: text(raw?.emergencyContacts?.e_contact_2_full_name),
    permanentAddress: text(firstValue(raw?.employeeContact?.perment_address, raw?.emergencyContacts?.perment_address)),
    postalAddress: text(firstValue(raw?.employeeContact?.postal_address, raw?.emergencyContacts?.postal_address)),
    bankName: text(raw?.bankInfo?.bank_name),
    bankAccount: text(raw?.bankInfo?.account_number),
    bankVerified: Boolean(raw?.bankInfo?.is_verified),
    bloodGroup: text(raw?.medicalInfo?.blood_group),
    allergies: text(raw?.medicalInfo?.allergy_notes),
    chronicConditions: text(raw?.medicalInfo?.chronic_condition_notes),
    medications: text(raw?.medicalInfo?.emergency_medication),
    genderMedical: text(raw?.medicalInfo?.gender),
    heightCm: text(raw?.medicalInfo?.height_cm),
    weightKg: text(raw?.medicalInfo?.weight_kg),
    hasDisability: raw?.medicalInfo?.has_disability,
    disabilityType: text(raw?.medicalInfo?.disability_type),
    disabilityDescription: text(raw?.medicalInfo?.disability_description),
    hasChronicCondition: raw?.medicalInfo?.has_chronic_condition,
    hasKnownAllergies: raw?.medicalInfo?.has_known_allergies,
    fitnessStatus: text(raw?.medicalInfo?.fitness_status),
    lastMedicalExamDate: raw?.medicalInfo?.last_medical_exam_date,
    nextMedicalExamDate: raw?.medicalInfo?.next_medical_exam_date,
    salary: numberValue(raw?.salaryInfo?.base_salary),
    currency: text(raw?.salaryInfo?.currency || "PKR"),
    allowances: Array.isArray(raw?.allowances) ? raw.allowances : [],
    profilePhotoUrl: firstValue(raw?.profilePhotoUrl, raw?.profile_photo_url, raw?.profile_photo, raw?.photo_url),
  };
}

function InfoCard({
  title,
  icon,
  accent = "var(--p)",
  tint = "rgba(37,99,235,.08)",
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent?: string;
  tint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "13px 15px",
          borderBottom: "1px solid var(--br2)",
          background: `linear-gradient(90deg, ${tint}, rgba(255,255,255,.8))`,
          fontSize: 12,
          fontWeight: 900,
          color: accent,
          textTransform: "uppercase",
        }}
      >
        <span style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 9, background: tint, color: accent }}>
          {icon}
        </span>
        {title}
      </div>
      <div style={{ padding: 15 }}>{children}</div>
    </div>
  );
}

function FieldGrid({ items }: { items: Array<[string, any]> }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        columnGap: 32,
        rowGap: 20,
      }}
    >
      {items.map(([label, value]) => {
        const displayVal = text(value);
        const isEmpty = displayVal === "Not provided" || displayVal === "";
        const isYes = displayVal === "Yes" || displayVal === "Verified";
        const isNo = displayVal === "No";
        return (
          <div
            key={label}
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
              {label}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: isEmpty
                  ? "var(--t4)"
                  : isYes
                    ? "var(--green)"
                    : isNo
                      ? "var(--red)"
                      : "var(--t1)",
                overflowWrap: "anywhere",
                lineHeight: 1.4,
              }}
            >
              {displayVal}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContactCards({ source }: { source: any }) {
  const contacts = [
    {
      label: "Primary",
      name: source?.e_contact_1_full_name || "Primary contact",
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

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 26, textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
      {children}
    </div>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { can } = useRbac();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [tab, setTab] = useState("personal");
  const [windowOffset, setWindowOffset] = useState<0 | 6>(0);
  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [penaltyModalOpen, setPenaltyModalOpen] = useState(false);
  const [penaltyRuleId, setPenaltyRuleId] = useState("");
  const [penaltyDate, setPenaltyDate] = useState(new Date().toISOString().slice(0, 10));
  const [penaltyReason, setPenaltyReason] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [attachmentKind, setAttachmentKind] = useState("document");
  const [documentType, setDocumentType] = useState("General");
  const [profilePhotoFailed, setProfilePhotoFailed] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountRoleId, setAccountRoleId] = useState("");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("PKR");
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [salaryRevisionType, setSalaryRevisionType] = useState("");
  const [salaryRevisionPercent, setSalaryRevisionPercent] = useState("");
  const [salaryRevisionReason, setSalaryRevisionReason] = useState("");
  const [movementType, setMovementType] = useState("");
  const [movementEffectiveDate, setMovementEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [movementDepartmentId, setMovementDepartmentId] = useState("");
  const [movementDesignationId, setMovementDesignationId] = useState("");
  const [movementWorkLocationId, setMovementWorkLocationId] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [movementSalaryAmount, setMovementSalaryAmount] = useState("");
  const [movementSalaryPercent, setMovementSalaryPercent] = useState("");
  const [credentialEmail, setCredentialEmail] = useState("");
  const [credentialPhone, setCredentialPhone] = useState("");
  const [allowanceDrafts, setAllowanceDrafts] = useState<Array<{ allowance_type_id: string; amount: string; is_percentage: boolean; is_active: boolean }>>([]);
  const [pendingAction, setPendingAction] = useState<null | "create_account" | "resend_credentials" | "add_salary_revision" | "add_career_movement" | "save_allowances" | "add_penalty">(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const {
    data: rawEmployee,
    isLoading,
    resendCredentials,
    isResendingCredentials,
    createAccount,
    isCreatingAccount,
    addSalaryRevision,
    isAddingSalaryRevision,
    addCareerMovement,
    isAddingCareerMovement,
  } = useEmployee(id);

  const employee = useMemo(() => (rawEmployee ? normalizeEmployee(rawEmployee) : null), [rawEmployee]);
  const employeeId = employee?.id || id || "";
  const { data: finance = null } = useEmployeeFinance(employeeId);
  const { data: allowanceTypes = [] } = useAllowanceTypes({
    enabled: hasPermission("allowances:read"),
  });
  const { data: departments = [] } = useDepartments({ enabled: can("edit_employee") || can("create_employee") });
  const { data: designations = [] } = useDesignations(movementDepartmentId || undefined);
  const { data: workLocations = [] } = useWorkLocations({ enabled: can("edit_employee") || can("create_employee") });
  const { updateAllowances, isUpdatingSection: isUpdatingAllowances } = useEmployeeActions(employeeId);
  const canManageEmployees = can("resend_credentials") || can("edit_employee") || can("create_employee");
  const canViewAttachments = can("view_employee_attachments") || canManageEmployees;
  const canUploadAttachments = can("upload_employee_attachments") || canManageEmployees;
  const { data: attachments = [], isLoading: attachmentsLoading, upload: uploadAttachment, isUploading: isUploadingAttachment } = useEmployeeAttachments(canViewAttachments ? employeeId : undefined);
  const { data: reportRows = [], isLoading: attendanceLoading } = useAttendanceReport(
    employeeId
      ? { employee_id: employeeId, year: new Date().getFullYear(), month: new Date().getMonth() + 1 }
      : undefined,
  );
  const { data: leaveRows = [], isLoading: leavesLoading } = useLeaves(employeeId ? { employee_id: employeeId } : undefined);
  const { data: leaveBalances = [], isLoading: balancesLoading } = useLeaveBalances(employeeId ? { employee_id: employeeId, year: new Date().getFullYear() } : undefined);
  const { data: penaltyRows = [], isLoading: penaltiesLoading, isError: penaltiesError, propose: proposePenalty } = usePenalties(employeeId ? { employee_id: employeeId } : undefined);
  const { data: penaltyRules = [] } = usePenaltyRules();
  const { data: roles = [] } = useRoles();
  const { data: credentialTemplateData } = useCredentialTemplate();
  const canWriteSalary = can("salary:write");
  const canWriteAllowances = can("allowances:write");
  const canManageCompensation = canWriteSalary || canWriteAllowances;
  const canWriteCareerMovement = can("edit_employee") || can("create_employee");

  const profilePhotoUrl = useMemo(() => {
    const photo = attachments.find((item: any) => item?.kind === "profile_photo" && String(item?.mime_type || "").startsWith("image/"));
    return attachmentUrl(photo) || attachmentUrl({ url: employee?.profilePhotoUrl });
  }, [attachments, employee?.profilePhotoUrl]);

  useEffect(() => {
    setProfilePhotoFailed(false);
  }, [profilePhotoUrl]);

  useEffect(() => {
    if (employee?.email && employee.email !== "Not provided" && !accountEmail) {
      setAccountEmail(employee.email);
    }
  }, [accountEmail, employee?.email]);

  useEffect(() => {
    setAllowanceDrafts(
      (employee?.allowances || []).map((allowance: any) => ({
        allowance_type_id: String(allowance?.allowance_type_id || ""),
        amount: String(allowance?.amount ?? ""),
        is_percentage: Boolean(allowance?.is_percentage),
        is_active: allowance?.is_active !== false,
      })),
    );
  }, [employee?.allowances]);

  const months = useMemo(() => getWindowMonths(windowOffset), [windowOffset]);
  const attendanceChart = months.map((month) => {
    const row = reportRows.find((item: any) => {
      const rowDate = item.month || item.date || item.attendance_month;
      return rowDate ? String(rowDate).startsWith(month.key) : true;
    }) || reportRows[0] || {};
    return {
      month: month.label,
      present: numberValue(row.presents ?? row.present),
      absent: numberValue(row.absents ?? row.absent),
      late: numberValue(row.lates ?? row.late),
    };
  });
  const attendanceTotals = attendanceChart.reduce(
    (acc, row) => ({
      present: acc.present + row.present,
      absent: acc.absent + row.absent,
      late: acc.late + row.late,
    }),
    { present: 0, absent: 0, late: 0 },
  );

  const salaryHistory = Array.isArray(finance?.salaryHistory) ? finance.salaryHistory : [];
  const allowanceHistory = Array.isArray(finance?.allowancesHistory) ? finance.allowancesHistory : [];
  const currentAllowances = Array.isArray(employee?.allowances) ? employee.allowances : [];
  const activeAllowances = currentAllowances.filter((allowance: any) => allowance?.is_active !== false);
  const deactiveAllowances = currentAllowances.filter((allowance: any) => allowance?.is_active === false);
  const showSalaryRevisionDetails = salaryRevisionType !== "" && salaryRevisionType !== "Initial";
  const credentialsWhatsappUrl = buildCredentialsWhatsappUrl({
    employeeId: employee?.id || "",
    employeeName: employee?.name || "",
    email: credentialEmail || accountEmail || employee?.email || "",
    password: tempPassword || "",
    phone: credentialPhone || employee?.phone || "",
    template: credentialTemplateData?.template,
  });

  const openActionConfirm = (action: typeof pendingAction) => {
    setPendingAction(action);
  };

  const closeActionConfirm = () => {
    if (actionSubmitting) return;
    setPendingAction(null);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setActionSubmitting(true);
    try {
      if (pendingAction === "create_account") {
        await handleCreateAccount();
      } else if (pendingAction === "resend_credentials") {
        await handleResendCredentials();
      } else if (pendingAction === "add_salary_revision") {
        await handleAddSalaryRevision();
      } else if (pendingAction === "add_career_movement") {
        await handleAddCareerMovement();
      } else if (pendingAction === "save_allowances") {
        await handleSaveAllowances();
      } else if (pendingAction === "add_penalty") {
        await handleAddPenalty();
      }
      setPendingAction(null);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleResendCredentials = async () => {
    if (!employeeId) return;
    try {
      const result = await resendCredentials(employeeId);
      setTempPassword(result?.tempPassword ?? result?.temp_password ?? result?.password ?? null);
      setCredentialEmail(result?.email ?? result?.user?.email ?? employee?.email ?? "");
      setCredentialPhone(result?.whatsappPhone ?? result?.whatsapp_phone ?? employee?.phone ?? "");
      setResendModalOpen(true);
      showToast("Credentials resent successfully");
    } catch {
      showToast("Failed to resend credentials", "error");
    }
  };

  const handleAddPenalty = async () => {
    if (!employeeId || !penaltyRuleId || !penaltyDate || !penaltyReason.trim()) {
      showToast("Employee, penalty rule, date, and reason are mandatory.", "error");
      return;
    }
    try {
      await proposePenalty({
        employee_id: employeeId,
        rule_id: penaltyRuleId,
        date: penaltyDate,
        reason: penaltyReason.trim(),
      });
      setPenaltyModalOpen(false);
      setPenaltyRuleId("");
      setPenaltyReason("");
      showToast("Penalty submitted for review.");
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Unable to submit penalty.", "error");
    }
  };

  const handleCreateAccount = async () => {
    if (!employeeId || !accountEmail.trim() || !accountRoleId) {
      showToast("Account email and role are mandatory.", "error");
      return;
    }
    const submittedEmail = accountEmail.trim();
    try {
      const result = await createAccount({
        employeeId,
        email: submittedEmail,
        role_id: accountRoleId,
      });
      setTempPassword(result?.tempPassword ?? result?.temp_password ?? result?.password ?? null);
      setCredentialEmail(result?.email ?? result?.user?.email ?? submittedEmail);
      setCredentialPhone(result?.whatsappPhone ?? result?.whatsapp_phone ?? result?.phone ?? employee?.phone ?? "");
      setResendModalOpen(true);
      showToast("Login account created successfully.");
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Failed to create login account.", "error");
    }
  };

  const handleAddSalaryRevision = async () => {
    const parsedSalary = Number(salaryAmount);
    const parsedPercent = salaryRevisionPercent === "" ? null : Number(salaryRevisionPercent);
    if (!employeeId || !salaryAmount || !Number.isFinite(parsedSalary) || parsedSalary < 0 || !salaryEffectiveFrom || !salaryRevisionType) {
      showToast("Base salary, effective from date, and revision type are mandatory.", "error");
      return;
    }
    if (parsedPercent !== null && !Number.isFinite(parsedPercent)) {
      showToast("Revision percent must be a valid number.", "error");
      return;
    }
    try {
      await addSalaryRevision({
        employeeId,
        payload: {
          base_salary: parsedSalary,
          currency: salaryCurrency,
          effective_from: salaryEffectiveFrom,
          revision_type: salaryRevisionType,
          revision_percent: salaryRevisionType === "Initial" ? null : parsedPercent,
          revision_reason: salaryRevisionType === "Initial" ? null : salaryRevisionReason.trim() || null,
        },
      });
      setSalaryAmount("");
      setSalaryRevisionType("");
      setSalaryRevisionPercent("");
      setSalaryRevisionReason("");
      showToast("Salary history added successfully.");
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Failed to add salary history.", "error");
    }
  };

  const handleAddCareerMovement = async () => {
    const parsedSalary = movementSalaryAmount === "" ? null : Number(movementSalaryAmount);
    const parsedPercent = movementSalaryPercent === "" ? null : Number(movementSalaryPercent);
    if (!employeeId || !movementType || !movementEffectiveDate || !movementReason.trim()) {
      showToast("Movement type, effective date, and reason are mandatory.", "error");
      return;
    }
    if (!movementDepartmentId && !movementDesignationId && !movementWorkLocationId && parsedSalary === null) {
      showToast("At least one job or salary change is mandatory.", "error");
      return;
    }
    if (parsedSalary !== null && (!Number.isFinite(parsedSalary) || parsedSalary < 0)) {
      showToast("Movement salary must be a valid number.", "error");
      return;
    }
    if (parsedPercent !== null && !Number.isFinite(parsedPercent)) {
      showToast("Movement salary percent must be a valid number.", "error");
      return;
    }
    try {
      await addCareerMovement({
        employeeId,
        payload: {
          movement_type: movementType,
          effective_date: movementEffectiveDate,
          department_id: movementDepartmentId || null,
          designation_id: movementDesignationId || null,
          work_location_id: movementWorkLocationId || null,
          reason: movementReason.trim(),
          salaryInfo:
            parsedSalary === null
              ? null
              : {
                  base_salary: parsedSalary,
                  currency: employee?.currency === "Not provided" ? "PKR" : employee?.currency || "PKR",
                  effective_from: movementEffectiveDate,
                  revision_type:
                    movementType === "Promotion" || movementType === "Demotion"
                      ? movementType
                      : "Correction",
                  revision_percent: parsedPercent,
                  revision_reason: movementReason.trim(),
                },
        },
      });
      setMovementType("");
      setMovementDepartmentId("");
      setMovementDesignationId("");
      setMovementWorkLocationId("");
      setMovementReason("");
      setMovementSalaryAmount("");
      setMovementSalaryPercent("");
      showToast("Career movement saved successfully.");
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Failed to save career movement.", "error");
    }
  };

  const handleAttachmentFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      await uploadAttachment({
        file,
        kind: attachmentKind,
        documentType: attachmentKind === "profile_photo" ? "Profile Photo" : documentType,
      });
      showToast("Attachment uploaded successfully.");
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Failed to upload attachment.", "error");
    }
  };

  const handleAddAllowanceRow = () => {
    setAllowanceDrafts((rows) => [...rows, { allowance_type_id: "", amount: "", is_percentage: false, is_active: true }]);
  };

  const handleSaveAllowances = async () => {
    try {
      const payload = allowanceDrafts
        .filter((row) => row.allowance_type_id)
        .map((row) => ({
          allowance_type_id: row.allowance_type_id,
          amount: Number(row.amount || 0),
          is_percentage: Boolean(row.is_percentage),
          is_active: Boolean(row.is_active),
        }));
      await updateAllowances({ allowances: payload });
      showToast("Allowances updated successfully.");
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Failed to update allowances.", "error");
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Loader2 className="spinner" size={28} />
        <div style={{ marginTop: 10, fontSize: 13, color: "var(--t3)" }}>Loading employee profile...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={{ padding: 50, textAlign: "center", color: "var(--t3)" }}>
        <h2>Employee not found or access denied</h2>
        <button className="btn btn-primary" onClick={() => navigate("/employees")}>Back to Employees</button>
      </div>
    );
  }

  const hasLoginAccount = Boolean(employee.accountInfo?.id || employee.accountInfo?.email || employee.email !== "Not provided");
  const tabs = [
    { key: "personal", label: "Personal & Contact", icon: UserRound },
    { key: "job", label: "Job & Employment", icon: BriefcaseBusiness },
    { key: "compensation", label: "Compensation", icon: BadgeDollarSign },
    { key: "bank-medical", label: "Bank & Medical", icon: HeartPulse },
    { key: "documents", label: "Documents", icon: FileText },
    { key: "management", label: "Management", icon: Mail },
    { key: "penalties", label: "Penalties", icon: AlertTriangle },
    { key: "leaves", label: "Leave Requests", icon: CalendarDays },
    { key: "attendance", label: "Attendance (Last 6 Months)", icon: Clock3 },
  ] as const;

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">Employee Detail</div>
          <div className="pg-sub">Employee record from the backend profile payload</div>
        </div>
      </div>

      <ProfileHero
        employee={employee}
        profilePhotoUrl={profilePhotoUrl}
        profilePhotoFailed={profilePhotoFailed}
        setProfilePhotoFailed={setProfilePhotoFailed}
        onImageClick={setPreviewPhotoUrl}
      />

      <div style={{ display: "flex", borderBottom: "1px solid var(--br2)", marginBottom: 20, gap: 4, overflowX: "auto", scrollbarWidth: "none" }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`tab-link ${tab === key ? "active" : ""}`}
            onClick={() => setTab(key)}
            style={{ display: "flex", alignItems: "center", gap: 6, outline: "none" }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: tab === "personal" ? "block" : "none" }}>
        <InfoCard title="Employee" icon={<UserRound size={15} />} accent="var(--p)" tint="rgba(37,99,235,.1)">
          <FieldGrid
            items={[
              ["Full Name", employee.name],
              ["Email", employee.email],
              ["Father Name", employee.fatherName],
              ["Date of Birth", formatDate(employee.dob)],
              ["CNIC", employee.cnic],
              ["Gender", employee.gender],
            ]}
          />
        </InfoCard>

        <div style={{ marginTop: 16 }}>
          <InfoCard title="Employee Contact" icon={<Phone size={15} />} accent="#2563eb" tint="rgba(37,99,235,.1)">
            <FieldGrid
              items={[
                ["Phone", employee.phone],
                ["Permanent Address", employee.permanentAddress],
                ["Postal Address", employee.postalAddress],
              ]}
            />
          </InfoCard>
        </div>

        <div style={{ marginTop: 16 }}>
          <InfoCard title="Emergency Contacts" icon={<Phone size={15} />} accent="#db2777" tint="rgba(236,72,153,.12)">
            <ContactCards source={rawEmployee?.emergencyContacts} />
          </InfoCard>
        </div>
      </div>

      <div style={{ display: tab === "job" ? "block" : "none" }}>
        <InfoCard title="Job & Employment" icon={<BriefcaseBusiness size={15} />} accent="var(--teal)" tint="rgba(13,148,136,.1)">
          <FieldGrid
            items={[
              ["Department", employee.department],
              ["Designation", employee.designation],
              ["Employment Type", employee.employmentType],
              ["Job Status", employee.jobStatus],
              ["Work Mode", employee.workMode],
              ["Work Location", employee.workLocation],
              ["Shift", employee.shift],
              ["Date of Joining", formatDate(employee.dateOfJoining)],
              ["Date of Exit", formatDate(employee.dateOfExit)],
            ]}
          />
        </InfoCard>
      </div>

      <div style={{ display: tab === "compensation" ? "block" : "none" }}>
        <InfoCard title="Salary & Allowance" icon={<BadgeDollarSign size={15} />} accent="var(--green)" tint="rgba(15,118,110,.1)">
          <FieldGrid
            items={[
              ["Base Salary", formatMoney(employee.salary, employee.currency)],
              ["Currency", employee.currency],
            ]}
          />
        </InfoCard>

        <div style={{ marginTop: 16 }}>
          <InfoCard title="Allowances" icon={<Banknote size={15} />} accent="#b45309" tint="rgba(245,158,11,.14)">
            {currentAllowances.length ? (
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
                          <div style={{ display: "inline-flex", alignItems: "center", alignSelf: "flex-start", gap: 8, padding: "4px 8px", borderRadius: 999, background: "rgba(245,158,11,.13)", fontSize: 11, fontWeight: 800, color: "#b45309", marginBottom: 10, textTransform: "uppercase" }}>
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
              <div style={{ padding: "24px 16px", textAlign: "center", background: "rgba(148,163,184,.05)", border: "1px dashed var(--br2)", borderRadius: 8, color: "var(--t3)" }}>
                No allowances configured for this employee.
              </div>
            )}
          </InfoCard>
        </div>

        <div style={{ marginTop: 16 }}>
          <InfoCard title="Salary History" icon={<CalendarDays size={15} />} accent="var(--green)" tint="rgba(15,118,110,.1)">
            {salaryHistory.length ? (
              <div style={{ overflowX: "auto" }}>
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
                        <td className="mono">{formatDate(row.effective_from)}</td>
                        <td className="mono">{formatMoney(row.base_salary, row.currency || employee.salaryInfo?.currency || "PKR")}</td>
                        <td>{formatValue(row.revision_type)}</td>
                        <td className="mono">{formatValue(row.revision_percent)}</td>
                        <td>{formatValue(row.revision_reason)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState>No salary history available yet.</EmptyState>
            )}
          </InfoCard>
        </div>

        <div style={{ marginTop: 16 }}>
          <InfoCard title="Allowance History" icon={<Banknote size={15} />} accent="#b45309" tint="rgba(245,158,11,.14)">
            {allowanceHistory.length ? (
              <div style={{ overflowX: "auto" }}>
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
                        <td className="mono">{formatDate(row.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState>No allowance history available yet.</EmptyState>
            )}
          </InfoCard>
        </div>
      </div>

      <div style={{ display: tab === "bank-medical" ? "block" : "none" }}>
        <InfoCard title="Bank Info" icon={<Landmark size={15} />} accent="#7c3aed" tint="rgba(124,58,237,.11)">
          {employee.bankVerified && (
            <div style={{ marginBottom: 12 }}>
              <span className="pill pill-green" style={{ fontSize: 11, padding: "4px 10px" }}>Verified</span>
            </div>
          )}
          <FieldGrid
            items={[
              ["Bank Name", employee.bankName],
              ["Bank Account", employee.bankAccount],
              ["Verification", employee.bankVerified ? "Verified" : "Not provided"],
            ]}
          />
        </InfoCard>

        <div style={{ marginTop: 16 }}>
          <InfoCard title="Medical Info" icon={<HeartPulse size={15} />} accent="#0891b2" tint="rgba(8,145,178,.11)">
            <FieldGrid
              items={[
                ["Blood Group", employee.bloodGroup],
                ["Gender", employee.genderMedical],
                ["Height", employee.heightCm],
                ["Weight", employee.weightKg],
                ["Disability", employee.hasDisability ? "Yes" : "No"],
                ["Disability Type", employee.disabilityType],
                ["Disability Description", employee.disabilityDescription],
                ["Chronic Condition", employee.hasChronicCondition ? "Yes" : "No"],
                ["Allergies", employee.allergies],
                ["Known Allergies", employee.hasKnownAllergies ? "Yes" : "No"],
                ["Chronic Conditions", employee.chronicConditions],
                ["Medication", employee.medications],
                ["Fitness Status", employee.fitnessStatus],
                ["Last Medical Exam", formatDate(employee.lastMedicalExamDate)],
                ["Next Medical Exam", formatDate(employee.nextMedicalExamDate)],
              ]}
            />
          </InfoCard>
        </div>
      </div>

      <div style={{ display: tab === "documents" ? "block" : "none" }}>
        <InfoCard title="Documents" icon={<FileText size={15} />} accent="#4338ca" tint="rgba(67,56,202,.1)">
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
                  href={`${API_ORIGIN}${item.url || item.file_path}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14, borderRadius: 8, border: "1px solid var(--br2)", background: "rgba(255, 255, 255, 0.9)", color: "var(--t1)", textDecoration: "none", boxShadow: "0 4px 12px rgba(15,23,42,.03)" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 36, height: 36, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(67,56,202,.08)", color: "rgba(67,56,202,1)" }}>
                      <FileText size={18} />
                    </span>
                    <span>
                      <strong style={{ display: "block", fontSize: 13, color: "var(--t1)" }}>{formatValue(item.original_filename)}</strong>
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
            <EmptyState>No documents uploaded yet.</EmptyState>
          )}
        </InfoCard>
      </div>

      <div style={{ display: tab === "attendance" ? "block" : "none" }}>
        <InfoCard title={windowOffset === 0 ? "Attendance (Last 6 Months)" : "Attendance (Previous 6 Months)"} icon={<Clock3 size={15} />} accent="#2563eb" tint="rgba(37,99,235,.1)">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="pill pill-green">Present: {attendanceTotals.present}</span>
              <span className="pill pill-red">Absent: {attendanceTotals.absent}</span>
              <span className="pill pill-amber">Late: {attendanceTotals.late}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className={`btn btn-sm ${windowOffset === 0 ? "btn-primary" : "btn-ghost"}`} onClick={() => setWindowOffset(0)}>Last 6 months</button>
              <button className={`btn btn-sm ${windowOffset === 6 ? "btn-primary" : "btn-ghost"}`} onClick={() => setWindowOffset(6)}>Previous 6 months</button>
            </div>
          </div>
          {attendanceLoading ? (
            <EmptyState>Loading attendance...</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attendanceChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf8" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#7590a8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#7590a8" }} />
                <Tooltip />
                <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </InfoCard>
      </div>

      <div style={{ display: tab === "leaves" ? "block" : "none" }}>
        <InfoCard title="Leave Requests" icon={<CalendarDays size={15} />} accent="#0d9488" tint="rgba(13,148,136,.1)">
          {balancesLoading ? (
            <EmptyState>Loading leave balances...</EmptyState>
          ) : leaveBalances.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10, marginBottom: 14 }}>
              {leaveBalances.map((balance: any, index: number) => {
                const total = numberValue(balance.balance);
                const used = numberValue(balance.used);
                const remaining = numberValue(balance.remaining ?? total - used);
                const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
                return (
                  <div key={balance.leave_type_id || balance.id || index} style={{ padding: 13, border: "1px solid var(--br2)", borderRadius: 12, background: "linear-gradient(135deg, rgba(236,253,245,.82), rgba(255,255,255,.9))" }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: "var(--t1)", marginBottom: 6 }}>{text(balance.leave_type_name || balance.leave_type?.name || balance.leave_type || balance.type || balance.name)}</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 950, color: "var(--green)" }}>{remaining} remaining</div>
                    <div style={{ marginTop: 10, height: 7, borderRadius: 999, background: "rgba(15,23,42,.08)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "var(--green)" }} />
                    </div>
                    <div style={{ marginTop: 7, fontSize: 11, color: "var(--t3)" }}>{used} used of {total}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState>No leave balances are assigned for this employee.</EmptyState>
          )}
          {leavesLoading ? (
            <EmptyState>Loading leave requests...</EmptyState>
          ) : leaveRows.length ? (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRows.map((leave: any, index: number) => {
                    const from = leave.from || leave.start_date || leave.date_from;
                    const to = leave.to || leave.end_date || leave.date_to;
                    const calculatedDays = daysInclusive(from, to);
                    return (
                      <tr key={leave.id || index}>
                        <td>{text(leave.leave_type?.name || leave.leave_type_name || leave.leave_type || leave.type)}</td>
                        <td className="mono">{formatDate(from)}</td>
                        <td className="mono">{formatDate(to)}</td>
                        <td className="mono">{text(leave.days || leave.total_days || leave.duration || calculatedDays)}</td>
                        <td>{text(leave.reason || leave.notes)}</td>
                        <td><span className={`pill ${getStatusColor(leave.status)}`}>{formatStatus(leave.status)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState>No leave requests found.</EmptyState>
          )}
        </InfoCard>
      </div>

      <div style={{ display: tab === "penalties" ? "block" : "none" }}>
        <InfoCard title="Penalties" icon={<BadgeDollarSign size={15} />} accent="#dc2626" tint="rgba(220,38,38,.1)">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            {penaltiesError && (
              <div style={{ display: "flex", gap: 10, alignItems: "center", padding: 14, border: "1px dashed rgba(245,158,11,.45)", borderRadius: 12, background: "rgba(255,251,235,.7)", color: "#92400e" }}>
                <AlertTriangle size={16} /> Penalty data is not available for your current permissions.
              </div>
            )}
            <button className="btn btn-secondary" onClick={() => setPenaltyModalOpen(true)}>Add penalty</button>
          </div>
          {penaltiesLoading ? (
            <EmptyState>Loading penalties...</EmptyState>
          ) : penaltyRows.length ? (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Rule</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Ack</th>
                  </tr>
                </thead>
                <tbody>
                  {penaltyRows.map((penalty: any, index: number) => (
                    <tr key={penalty.id || index}>
                      <td className="mono">{formatDate(penalty.date)}</td>
                      <td>{text(penalty.rule_name || penalty.name || penalty.type)}</td>
                      <td className="mono">{formatPKR(numberValue(penalty.amount_pkr || penalty.applied_amount_pkr || penalty.amount))}</td>
                      <td>{text(penalty.reason || penalty.review_note)}</td>
                      <td><span className={`pill ${getStatusColor(penalty.status)}`}>{formatStatus(penalty.status)}</span></td>
                      <td>{penalty.employee_ack ? "Acknowledged" : "Pending"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState>No penalties recorded.</EmptyState>
          )}
        </InfoCard>
      </div>

      <div style={{ display: tab === "management" ? "block" : "none" }}>
        <InfoCard title="Management" icon={<Mail size={15} />} accent="#4f46e5" tint="rgba(79,70,229,.1)">
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gap: 10, padding: 13, border: "1px solid var(--br2)", borderRadius: 12, background: "rgba(248,250,252,.72)" }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "var(--t1)" }}>{hasLoginAccount ? "Login Account" : "Create Login Account"}</div>
              {hasLoginAccount ? (
                <FieldGrid items={[["Account Email", employee.email]]} />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  <label className="form-group" style={{ margin: 0 }}>
                    <span className="form-label">Account Email</span>
                    <input className="input" type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="employee@company.com" />
                  </label>
                  <label className="form-group" style={{ margin: 0 }}>
                    <span className="form-label">Account Role</span>
                    <select className="input select-input" value={accountRoleId} onChange={(event) => setAccountRoleId(event.target.value)}>
                      <option value="">Select role...</option>
                      {roles.map((role: any) => (
                        <option key={role.id} value={role.id}>
                          {formatStatus(role.role_name || role.name || role.display_name)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!hasLoginAccount && (
                  <button className="btn btn-primary" onClick={() => openActionConfirm("create_account")} disabled={isCreatingAccount}>
                    {isCreatingAccount ? "Creating..." : "Create login account"}
                  </button>
                )}
                {can("resend_credentials") && (
                  <button className="btn btn-secondary" onClick={() => openActionConfirm("resend_credentials")} disabled={isResendingCredentials}>
                    {isResendingCredentials ? "Sending..." : "Resend Credentials"}
                  </button>
                )}
              </div>
            </div>

            {canWriteCareerMovement && (
              <div style={{ display: "grid", gap: 10, padding: 13, border: "1px solid var(--br2)", borderRadius: 12, background: "rgba(248,250,252,.72)" }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "var(--t1)" }}>Career Movement</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  <label className="form-group" style={{ margin: 0 }}>
                    <span className="form-label">Movement Type</span>
                    <select className="input select-input" value={movementType} onChange={(event) => setMovementType(event.target.value)}>
                      <option value="">Select option</option>
                      {careerMovementTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label className="form-group" style={{ margin: 0 }}>
                    <span className="form-label">Effective Date</span>
                    <input className="input" type="date" value={movementEffectiveDate} onChange={(event) => setMovementEffectiveDate(event.target.value)} />
                  </label>
                  <label className="form-group" style={{ margin: 0 }}>
                    <span className="form-label">New Department</span>
                    <select
                      className="input select-input"
                      value={movementDepartmentId}
                      onChange={(event) => {
                        setMovementDepartmentId(event.target.value);
                        setMovementDesignationId("");
                      }}
                    >
                      <option value="">No change ({employee.department})</option>
                      {departments.map((department: any) => (
                        <option key={department.id} value={department.id}>
                          {department.department_name || department.name || department.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-group" style={{ margin: 0 }}>
                    <span className="form-label">New Designation</span>
                    <select className="input select-input" value={movementDesignationId} onChange={(event) => setMovementDesignationId(event.target.value)}>
                      <option value="">No change ({employee.designation})</option>
                      {designations.map((designation: any) => (
                        <option key={designation.id} value={designation.id}>
                          {designation.title || designation.name || designation.designation_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-group" style={{ margin: 0 }}>
                    <span className="form-label">New Work Location</span>
                    <select className="input select-input" value={movementWorkLocationId} onChange={(event) => setMovementWorkLocationId(event.target.value)}>
                      <option value="">No change ({employee.workLocation})</option>
                      {workLocations.map((location: any) => (
                        <option key={location.id} value={location.id}>
                          {location.name || location.location_name || location.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-group" style={{ margin: 0 }}>
                    <span className="form-label">New Salary</span>
                    <input className="input" type="number" min="0" value={movementSalaryAmount} onChange={(event) => setMovementSalaryAmount(event.target.value)} placeholder="Optional" />
                  </label>
                  <label className="form-group" style={{ margin: 0 }}>
                    <span className="form-label">Salary Percent</span>
                    <input className="input" type="number" step="0.01" value={movementSalaryPercent} onChange={(event) => setMovementSalaryPercent(event.target.value)} placeholder="Optional" />
                  </label>
                </div>
                <label className="form-group" style={{ margin: 0 }}>
                  <span className="form-label">Reason</span>
                  <textarea className="input" rows={3} value={movementReason} onChange={(event) => setMovementReason(event.target.value)} placeholder="Explain the movement decision" />
                </label>
                <div>
                  <button className="btn btn-primary" onClick={() => openActionConfirm("add_career_movement")} disabled={isAddingCareerMovement}>
                    {isAddingCareerMovement ? "Saving..." : "Save career movement"}
                  </button>
                </div>
              </div>
            )}

            {canWriteSalary && (
              <div style={{ display: "grid", gap: 10, padding: 13, border: "1px solid var(--br2)", borderRadius: 12, background: "rgba(248,250,252,.72)" }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: "var(--t1)" }}>Add Salary History</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  <label className="form-group" style={{ margin: 0 }}>
                    <span className="form-label">Base Salary</span>
                    <input className="input" type="number" min="0" value={salaryAmount} onChange={(event) => setSalaryAmount(event.target.value)} placeholder="125000" />
                  </label>
                  <label className="form-group" style={{ margin: 0 }}>
                    <span className="form-label">Currency</span>
                    <select className="input select-input" value={salaryCurrency} onChange={(event) => setSalaryCurrency(event.target.value)}>
                      <option value="PKR">PKR</option>
                      <option value="USD">USD</option>
                    </select>
                  </label>
                  <label className="form-group" style={{ margin: 0 }}>
                    <span className="form-label">Effective From</span>
                    <input className="input" type="date" value={salaryEffectiveFrom} onChange={(event) => setSalaryEffectiveFrom(event.target.value)} />
                  </label>
                  <label className="form-group" style={{ margin: 0 }}>
                    <span className="form-label">Revision Type</span>
                    <select
                      className="input select-input"
                      value={salaryRevisionType}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setSalaryRevisionType(nextValue);
                        if (nextValue === "Initial" || nextValue === "") {
                          setSalaryRevisionPercent("");
                          setSalaryRevisionReason("");
                        }
                      }}
                    >
                      <option value="">Select option</option>
                      {salaryRevisionTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  {showSalaryRevisionDetails && (
                    <>
                      <label className="form-group" style={{ margin: 0 }}>
                        <span className="form-label">Revision Percent</span>
                        <input className="input" type="number" step="0.01" value={salaryRevisionPercent} onChange={(event) => setSalaryRevisionPercent(event.target.value)} placeholder="Optional" />
                      </label>
                      <label className="form-group" style={{ margin: 0 }}>
                        <span className="form-label">Revision Reason</span>
                        <input className="input" value={salaryRevisionReason} onChange={(event) => setSalaryRevisionReason(event.target.value)} placeholder="Optional note" />
                      </label>
                    </>
                  )}
                </div>
                <div>
                  <button className="btn btn-primary" onClick={() => openActionConfirm("add_salary_revision")} disabled={isAddingSalaryRevision}>
                    {isAddingSalaryRevision ? "Saving..." : "Add salary history"}
                  </button>
                </div>
              </div>
            )}

            {canWriteAllowances && (
              <div style={{ display: "grid", gap: 10, padding: 13, border: "1px solid var(--br2)", borderRadius: 12, background: "rgba(248,250,252,.72)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "var(--t1)" }}>Allowance Management</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleAddAllowanceRow}>
                      Add allowance row
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => openActionConfirm("save_allowances")} disabled={isUpdatingAllowances}>
                      {isUpdatingAllowances ? "Saving..." : "Save allowances"}
                    </button>
                  </div>
                </div>
                {allowanceDrafts.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {allowanceDrafts.map((row, index) => (
                      <div
                        key={`${row.allowance_type_id || "row"}-${index}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(220px, 1.4fr) minmax(140px, 0.8fr) minmax(100px, 0.6fr) minmax(90px, 0.5fr) auto",
                          gap: 10,
                          alignItems: "end",
                        }}
                      >
                        <label className="form-group" style={{ margin: 0 }}>
                          <span className="form-label">Allowance Type</span>
                          <select
                            className="input select-input"
                            value={row.allowance_type_id}
                            onChange={(event) => {
                              const next = event.target.value;
                              setAllowanceDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, allowance_type_id: next } : item,
                                ),
                              );
                            }}
                          >
                            <option value="">Select allowance type</option>
                            {allowanceTypes.map((type: any) => (
                              <option key={type.id} value={type.id}>
                                {type.field_name || type.name || type.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="form-group" style={{ margin: 0 }}>
                          <span className="form-label">Amount</span>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            value={row.amount}
                            onChange={(event) => {
                              const next = event.target.value;
                              setAllowanceDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, amount: next } : item,
                                ),
                              );
                            }}
                          />
                        </label>
                        <label className="form-group" style={{ margin: 0, paddingBottom: 2 }}>
                          <span className="form-label">Percentage</span>
                          <input
                            type="checkbox"
                            checked={row.is_percentage}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setAllowanceDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, is_percentage: checked } : item,
                                ),
                              );
                            }}
                          />
                        </label>
                        <label className="form-group" style={{ margin: 0, paddingBottom: 2 }}>
                          <span className="form-label">Active</span>
                          <input
                            type="checkbox"
                            checked={row.is_active}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setAllowanceDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, is_active: checked } : item,
                                ),
                              );
                            }}
                          />
                        </label>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() =>
                            setAllowanceDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "var(--t3)", margin: 0 }}>
                    Add allowance rows here to update the employee's allowance package.
                  </p>
                )}
              </div>
            )}

            {!canManageCompensation && (
              <div style={{ padding: 13, border: "1px dashed var(--br2)", borderRadius: 12, background: "rgba(248,250,252,.72)", color: "var(--t2)", fontSize: 12 }}>
                Compensation editing is not available for your role.
              </div>
            )}

            <div style={{ display: "grid", gap: 10, padding: 13, border: "1px solid var(--br2)", borderRadius: 12, background: "rgba(248,250,252,.72)" }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "var(--t1)" }}>Upload profile photo/documents</div>
              {canUploadAttachments ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <select className="input select-input" style={{ maxWidth: 190 }} value={attachmentKind} onChange={(event) => setAttachmentKind(event.target.value)}>
                    <option value="document">Document</option>
                    <option value="profile_photo">Profile Photo</option>
                  </select>
                  {attachmentKind === "document" && (
                    <input className="input" style={{ maxWidth: 220 }} value={documentType} onChange={(event) => setDocumentType(event.target.value)} placeholder="Document type" />
                  )}
                  <label className="btn btn-primary" style={{ cursor: "pointer" }}>
                    <Upload size={13} /> {isUploadingAttachment ? "Uploading..." : "Upload File"}
                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.docx" style={{ display: "none" }} onChange={handleAttachmentFile} disabled={isUploadingAttachment} />
                  </label>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "var(--t3)", margin: 0 }}>You do not have permission to upload employee attachments.</p>
              )}
            </div>
          </div>
        </InfoCard>
      </div>

      {previewPhotoUrl && (
        <ImageModal src={previewPhotoUrl} alt={`${employee.name} profile`} onClose={() => setPreviewPhotoUrl(null)} />
      )}

      <Modal
        open={resendModalOpen}
        onClose={() => {
          setResendModalOpen(false);
          setTempPassword(null);
          setCredentialEmail("");
          setCredentialPhone("");
        }}
        title="Temporary Password"
      >
        <p style={{ fontSize: 13, marginBottom: 12 }}>Share this password with the employee securely. It will not be sent automatically.</p>
        <FieldGrid items={[["Employee ID", employee.id], ["Email", credentialEmail || accountEmail || employee.email]]} />
        <div className="mono" style={{ padding: 12, background: "var(--hover)", borderRadius: 8, fontWeight: 800 }}>
          {tempPassword || "Not provided"}
        </div>
        {credentialsWhatsappUrl ? (
          <a className="btn btn-primary" href={credentialsWhatsappUrl} target="_blank" rel="noreferrer" style={{ marginTop: 12, display: "inline-flex" }}>
            <Phone size={13} /> Send credentials via WhatsApp
          </a>
        ) : (
          <p style={{ fontSize: 12, color: "var(--t3)", margin: "12px 0 0" }}>
            Add the employee phone number to send credentials through WhatsApp.
          </p>
        )}
      </Modal>

      <Modal open={penaltyModalOpen} onClose={() => setPenaltyModalOpen(false)} title={`Add Penalty - ${employee.name}`}>
        <div className="form-group">
          <label className="form-label">Employee</label>
          <input className="input" value={`${employee.name} (${employee.id})`} disabled />
        </div>
        <div className="form-group">
          <label className="form-label">Penalty Rule *</label>
          <select className="input select-input" value={penaltyRuleId} onChange={(event) => setPenaltyRuleId(event.target.value)}>
            <option value="">Select penalty rule...</option>
            {penaltyRules.filter((rule: any) => rule.is_active !== false).map((rule: any) => (
              <option key={rule.id} value={rule.id}>
                {rule.name} - {formatPKR(numberValue(rule.amount_pkr))}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Penalty Date *</label>
          <input className="input" type="date" value={penaltyDate} onChange={(event) => setPenaltyDate(event.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Reason *</label>
          <textarea className="input" rows={3} value={penaltyReason} onChange={(event) => setPenaltyReason(event.target.value)} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button className="btn btn-secondary" onClick={() => setPenaltyModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => openActionConfirm("add_penalty")}>Submit for Review</button>
        </div>
      </Modal>

      <Modal open={pendingAction !== null} onClose={closeActionConfirm} title="Confirm action">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(220,38,38,.08)", display: "grid", placeItems: "center", color: "#dc2626", flexShrink: 0 }}>
            <AlertTriangle size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: "var(--t1)", marginBottom: 4 }}>
              {pendingAction === "create_account" && "Create login account"}
              {pendingAction === "resend_credentials" && "Resend credentials"}
              {pendingAction === "add_salary_revision" && "Add salary history"}
              {pendingAction === "add_career_movement" && "Save career movement"}
              {pendingAction === "save_allowances" && "Save allowances"}
              {pendingAction === "add_penalty" && "Submit penalty for review"}
            </div>
            <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.5 }}>
              {pendingAction === "create_account" && "This will create a login account for the employee and generate a temporary password."}
              {pendingAction === "resend_credentials" && "This will generate fresh credentials and open the share dialog."}
              {pendingAction === "add_salary_revision" && "This will write a salary history record for the employee."}
              {pendingAction === "add_career_movement" && "This will update the employee career record and optionally write salary history."}
              {pendingAction === "save_allowances" && "This will update the employee's allowance package."}
              {pendingAction === "add_penalty" && "This will send the penalty proposal for review."}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-secondary" onClick={closeActionConfirm} disabled={actionSubmitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={confirmAction} disabled={actionSubmitting}>
            {actionSubmitting ? "Working..." : "Confirm"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
