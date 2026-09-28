import React, { useEffect, useMemo, useState } from "react";
import {
  AttendanceRow,
  AttendanceStatus,
  useAcknowledgeAttendance,
  useApproveAttendanceUnlock,
  useAttendanceCorrections,
  useAttendanceReport,
  useAttendanceSheet,
  useRequestAttendanceUnlock,
  useReviewAttendanceCorrection,
  useSaveAttendanceSheet,
  useSubmitAttendanceSheet,
} from "../hooks/useAttendance";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  FileCheck2,
  Loader2,
  LockKeyhole,
  MapPin,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  TimerReset,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import {
  useDepartments,
  useShifts,
  useWorkLocations,
} from "../hooks/useConfig";
import { useEmployeeSelfMetrics } from "../hooks/useDashboard";
import { useEmployee } from "../hooks/useEmployees";
import { useToastContext } from "../context/ToastContext";
import { useAuthStore } from "../store/useAuthStore";
import { normalizeRole } from "../utils/rbac";

type EditableAttendanceRow = AttendanceRow & {
  check_in?: string | null;
  check_out?: string | null;
  notes?: string | null;
  ack?: boolean;
};

const STATUSES: AttendanceStatus[] = [
  "present",
  "absent",
  "late",
  "half_day",
  "on_leave",
];

const statusLabel: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half Day",
  on_leave: "On Leave",
};

const S = `
.att-page{padding:22px 28px;background:#f0f2f8;min-height:100vh;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#111827;}
.att-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px;}
.att-head-card{position:relative;overflow:hidden;background:linear-gradient(135deg,#312e81,#6366f1 48%,#06b6d4);border-radius:20px;padding:20px 22px;color:#fff;box-shadow:0 18px 40px rgba(49,46,129,.2);}
.att-head-card:after{content:"";position:absolute;right:-38px;top:-52px;width:170px;height:170px;border-radius:999px;background:rgba(255,255,255,.14);}
.att-head-card .att-kicker,.att-head-card .att-title,.att-head-card .att-sub{color:#fff;position:relative;z-index:1;}
.att-kicker{margin:0 0 4px;color:#8b5cf6;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;}
.att-title{margin:0;color:#1e1b4b;font-size:28px;line-height:1.1;font-weight:850;}
.att-sub{margin:6px 0 0;color:#6b7280;font-size:12px;max-width:620px;}
.att-card{background:#fff;border:1px solid #edf0f7;border-radius:16px;padding:16px;box-shadow:0 10px 24px rgba(15,23,42,.05);}
.att-toolbar{display:grid;grid-template-columns:minmax(260px,1fr) auto;gap:12px;align-items:end;margin-bottom:14px;}
.att-filters{display:grid;grid-template-columns:minmax(240px,1.4fr) minmax(170px,.8fr) minmax(170px,.8fr);gap:10px;margin-bottom:14px;}
.att-filter-field{position:relative;}
.att-filter-field svg{position:absolute;left:11px;bottom:11px;width:15px;height:15px;color:#94a3b8;pointer-events:none;}
.att-filter-field .att-input{padding-left:34px;}
.att-field label{display:block;color:#6b7280;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;}
.att-input,.att-select,.att-textarea{width:100%;border:1px solid #e5e7eb;border-radius:11px;background:#fff;color:#111827;font-size:12px;padding:10px 11px;outline:none;transition:border-color .15s,box-shadow .15s,background .15s;}
.att-input:focus,.att-select:focus,.att-textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.12);}
.att-input:disabled,.att-select:disabled,.att-textarea:disabled{background:#f8fafc;color:#94a3b8;cursor:not-allowed;}
.att-locked-field{min-height:38px;width:100%;border:1px solid #dbeafe;border-radius:11px;background:linear-gradient(135deg,#eff6ff,#ecfeff);color:#1e40af;font-size:12px;font-weight:850;padding:10px 11px;display:flex;align-items:center;gap:8px;}
.att-locked-field svg{width:15px;height:15px;flex:0 0 auto;}
.att-locked-field.warn{border-color:#fed7aa;background:#fff7ed;color:#c2410c;}
.att-textarea{min-height:76px;resize:vertical;}
.att-btn{height:38px;border:none;border-radius:11px;padding:0 14px;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:opacity .15s,transform .15s,box-shadow .15s;white-space:nowrap;}
.att-btn svg{width:15px;height:15px;flex:0 0 auto;}
.att-btn:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(15,23,42,.08);}
.att-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.att-spin{animation:att-spin .8s linear infinite;}
@keyframes att-spin{to{transform:rotate(360deg)}}
.att-btn.primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 8px 18px rgba(99,102,241,.22);}
.att-btn.secondary{background:#ecfeff;color:#0e7490;border:1px solid #bae6fd;}
.att-btn.warning{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;}
.att-btn.danger{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;}
.att-btn.ghost{background:#fff;color:#374151;border:1px solid #e5e7eb;}
.att-actions{display:flex;gap:8px;flex-wrap:wrap;}
.att-status-card{display:flex;align-items:flex-start;gap:12px;border:1px solid #e0e7ff;background:linear-gradient(135deg,#eef2ff,#ecfeff);color:#334155;border-radius:16px;padding:13px 14px;font-size:12px;line-height:1.45;margin-bottom:14px;}
.att-status-icon{width:34px;height:34px;border-radius:12px;background:#fff;color:#4f46e5;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 8px 20px rgba(79,70,229,.12);flex:0 0 auto;}
.att-status-card strong{display:block;color:#1e1b4b;font-size:13px;margin-bottom:2px;}
.att-status-card p{margin:0;color:#64748b;}
.att-banner{border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;border-radius:14px;padding:12px 14px;font-size:12px;line-height:1.45;margin-bottom:14px;}
.att-banner.warn{border-color:#fed7aa;background:#fff7ed;color:#c2410c;}
.att-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px;}
.att-stat{position:relative;overflow:hidden;border:1px solid #edf0f7;border-radius:16px;padding:13px;background:#fff;}
.att-stat:before{content:"";position:absolute;right:-18px;top:-28px;width:74px;height:74px;border-radius:999px;background:var(--stat-bg,#eef2ff);}
.att-stat-icon{position:relative;width:32px;height:32px;border-radius:12px;background:var(--stat-bg,#eef2ff);color:var(--stat-color,#4f46e5);display:flex;align-items:center;justify-content:center;margin-bottom:8px;}
.att-stat-icon svg{width:17px;height:17px;}
.att-stat span{display:block;color:#9ca3af;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;}
.att-stat strong{display:block;margin-top:4px;color:#1e1b4b;font-size:22px;}
.att-stat.present{--stat-bg:#dcfce7;--stat-color:#15803d}
.att-stat.late{--stat-bg:#ffedd5;--stat-color:#c2410c}
.att-stat.absent{--stat-bg:#fee2e2;--stat-color:#dc2626}
.att-stat.leave{--stat-bg:#ede9fe;--stat-color:#7c3aed}
.att-stat.total{--stat-bg:#dbeafe;--stat-color:#2563eb}
.att-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;align-items:start;}
.att-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;}
.att-section-title{display:flex;align-items:center;gap:8px;color:#1e1b4b;font-size:14px;font-weight:850;}
.att-section-title svg{width:17px;height:17px;color:#6366f1;}
.att-live{display:inline-flex;align-items:center;gap:6px;color:#64748b;font-size:11px;font-weight:750;}
.att-live-dot{width:8px;height:8px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.12);}
.att-table-wrap{overflow:auto;border:1px solid #eef2f7;border-radius:14px;}
.att-table{width:100%;border-collapse:collapse;min-width:980px;background:#fff;}
.att-table thead tr{background:#f8fafc;}
.att-table th{padding:11px 12px;text-align:left;color:#64748b;font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #eef2f7;}
.att-table td{padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#374151;font-size:12px;vertical-align:middle;}
.att-person{display:flex;align-items:center;gap:10px;}
.att-avatar{width:34px;height:34px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;flex:0 0 auto;}
.att-name{font-weight:850;color:#1e1b4b;}
.att-muted{color:#94a3b8;font-size:11px;margin-top:2px;}
.att-pill{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:850;border:1px solid #e5e7eb;background:#f8fafc;color:#475569;white-space:nowrap;}
.att-pill.present{background:#ecfdf5;border-color:#bbf7d0;color:#047857;}
.att-pill.late{background:#fff7ed;border-color:#fed7aa;color:#c2410c;}
.att-pill.absent{background:#fef2f2;border-color:#fecaca;color:#b91c1c;}
.att-pill.half_day{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8;}
.att-pill.on_leave{background:#f5f3ff;border-color:#ddd6fe;color:#6d28d9;}
.att-side{display:grid;gap:14px;}
.att-side h3{margin:0 0 6px;color:#1e1b4b;font-size:14px;font-weight:850;display:flex;align-items:center;gap:8px;}
.att-side h3 svg{width:16px;height:16px;color:#6366f1;}
.att-side p{margin:0;color:#6b7280;font-size:11px;line-height:1.45;}
.att-report-row{display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:12px;}
.att-report-row:last-child{border-bottom:none;}
.att-empty{padding:32px;text-align:center;color:#64748b;font-size:13px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:14px;}
@media(max-width:980px){.att-toolbar,.att-grid,.att-stats,.att-filters{grid-template-columns:1fr}.att-actions{width:100%}.att-btn{flex:1}.att-page{padding:16px}}
`;

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initials(name?: string) {
  return String(name || "NA")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function toTimeInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function toApiTime(value?: string | null) {
  if (!value) return null;
  const short = String(value).slice(0, 5);
  return short.length === 5 ? `${short}:00` : value;
}

function errorMessage(error: any) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    "Attendance action failed."
  );
}

function normalizeWorkLocation(raw: any) {
  const id =
    raw?.id ??
    raw?.work_location_id ??
    raw?.location_id ??
    raw?.code ??
    raw?.uuid ??
    "";
  const name =
    raw?.name ??
    raw?.title ??
    raw?.location_name ??
    raw?.work_location_name ??
    raw?.branch_name ??
    id;

  return {
    id: String(id),
    name: String(name || id),
  };
}

function normalizeDepartment(raw: any) {
  const id = raw?.id ?? raw?.department_id ?? raw?.code ?? raw?.department_code ?? "";
  const name =
    raw?.department_name ??
    raw?.name ??
    raw?.title ??
    raw?.departmentCode ??
    raw?.department_code ??
    id;

  return {
    id: String(id),
    name: String(name || id),
  };
}

function normalizeShift(raw: any) {
  const id = raw?.id ?? raw?.shift_id ?? raw?.code ?? raw?.name ?? "";
  const name = raw?.name ?? raw?.shift_name ?? raw?.title ?? id;

  return {
    id: String(id),
    name: String(name || id),
  };
}

function getUserLocationId(user: any) {
  return (
    user?.work_location_id ||
    user?.location_id ||
    user?.branch_id ||
    user?.profile?.work_location_id ||
    user?.profile?.location_id ||
    user?.profile?.branch_id ||
    user?.employee?.work_location_id ||
    user?.employee?.location_id ||
    user?.employee?.branch_id ||
    user?.data?.work_location_id ||
    user?.data?.location_id ||
    user?.data?.branch_id ||
    user?.jobInfo?.work_location_id ||
    user?.job_info?.work_location_id ||
    user?.jobInfo?.work_location?.id ||
    user?.job_info?.work_location?.id ||
    user?.work_location?.id ||
    user?.branch?.id ||
    ""
  );
}

function getEmployeeId(user: any) {
  return (
    user?.employee_id ||
    user?.employeeId ||
    user?.emp_id ||
    user?.id ||
    user?.profile?.employee_id ||
    user?.profile?.employeeId ||
    user?.employee?.employee_id ||
    user?.employee?.employeeId ||
    user?.data?.employee_id ||
    user?.data?.employeeId ||
    ""
  );
}

function getDepartmentName(row: any) {
  return (
    row?.department ||
    row?.department_name ||
    row?.departmentName ||
    row?.department?.name ||
    row?.jobInfo?.department_name ||
    row?.job_info?.department_name ||
    ""
  );
}

function getDepartmentId(row: any) {
  return (
    row?.department_id ||
    row?.department?.id ||
    row?.jobInfo?.department_id ||
    row?.job_info?.department_id ||
    ""
  );
}

function getShiftName(row: AttendanceRow) {
  return row.shift?.name || (row as any).shift_name || (row as any).shiftName || "";
}

function uniqueSorted(values: string[]) {
  return Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
}

export default function Attendance() {
  const { showToast } = useToastContext();
  const authUser = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions);
  const activeRole = useAuthStore((state) => state.activeRole);
  const role = normalizeRole(authUser?.role_name || activeRole || authUser?.role);
  const isSuperAdmin = role === "super_admin";
  const isEmployee = role === "employee";
  const canRead =
    isSuperAdmin || permissions.includes("attendance:read") || permissions.includes("attendance:department_read") || isEmployee;
  const canWrite =
    !isEmployee && (isSuperAdmin || permissions.includes("attendance:write"));
  const canSubmit =
    !isEmployee && (isSuperAdmin || permissions.includes("attendance:submit_ho"));
  const canUnlock =
    !isEmployee && (isSuperAdmin || permissions.includes("attendance:unlock"));
  const canReviewCorrections = canWrite || canSubmit || canUnlock;
  const authLocationId = String(getUserLocationId(authUser) || "");
  const shouldResolveHrLocation =
    !isEmployee && !isSuperAdmin && !authLocationId && canRead;
  const { data: selfMetrics } = useEmployeeSelfMetrics({
    enabled: shouldResolveHrLocation,
  });
  const profileEmployeeId = String(
    getEmployeeId(selfMetrics) || authUser?.employee_id || "",
  );
  const { data: selfEmployeeProfile } = useEmployee(
    shouldResolveHrLocation && profileEmployeeId ? profileEmployeeId : undefined,
  );
  const userLocationId = String(
    authLocationId ||
      getUserLocationId(selfMetrics) ||
      getUserLocationId(selfEmployeeProfile) ||
      "",
  );

  const date = useMemo(() => todayKey(), []);
  const [locationId, setLocationId] = useState("");
  const [unlockReason, setUnlockReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [localRows, setLocalRows] = useState<EditableAttendanceRow[]>([]);
  const { data: departmentData = [] } = useDepartments();
  const { data: shiftData = [] } = useShifts();
  const { data: workLocationData = [], isLoading: locationsLoading } =
    useWorkLocations();
  const departments = useMemo(
    () =>
      departmentData
        .map(normalizeDepartment)
        .filter((department) => department.id && department.name),
    [departmentData],
  );
  const shifts = useMemo(
    () => shiftData.map(normalizeShift).filter((shift) => shift.id && shift.name),
    [shiftData],
  );
  const workLocations = useMemo(
    () =>
      workLocationData
        .map(normalizeWorkLocation)
        .filter((location) => location.id && location.name),
    [workLocationData],
  );
  const reportDate = useMemo(() => new Date(`${date}T00:00:00`), [date]);
  const reportYear = reportDate.getFullYear();
  const reportMonth = reportDate.getMonth() + 1;
  const shouldLockLocation = !isEmployee && !isSuperAdmin && !!userLocationId;
  const isHrMissingLocation = !isEmployee && !isSuperAdmin && !userLocationId;
  const effectiveLocationId =
    isEmployee ? "" : isSuperAdmin ? locationId : locationId || userLocationId;

  useEffect(() => {
    if (shouldLockLocation && !locationId) {
      setLocationId(userLocationId);
    }
  }, [locationId, shouldLockLocation, userLocationId]);

  const sheetParams = useMemo(
    () => ({
      date,
      location_id: isEmployee ? undefined : effectiveLocationId || undefined,
    }),
    [date, effectiveLocationId, isEmployee],
  );

  const canLoadSheet =
    canRead && (isEmployee || isSuperAdmin || Boolean(effectiveLocationId));
  const sheetQuery = useAttendanceSheet(canLoadSheet ? sheetParams : undefined);
  const reportQuery = useAttendanceReport(
    canLoadSheet
      ? {
          year: reportYear,
          month: reportMonth,
          location_id: isEmployee ? undefined : effectiveLocationId || undefined,
          employee_id: isEmployee ? authUser?.employee_id : undefined,
        }
      : undefined,
  );
  const saveSheet = useSaveAttendanceSheet();
  const submitSheet = useSubmitAttendanceSheet();
  const requestUnlock = useRequestAttendanceUnlock();
  const approveUnlock = useApproveAttendanceUnlock();
  const acknowledgeAttendance = useAcknowledgeAttendance();
  const correctionsQuery = useAttendanceCorrections({
    status: "submitted",
    enabled: canReviewCorrections,
  });
  const reviewCorrection = useReviewAttendanceCorrection();
  const isGenerating = sheetQuery.isFetching;
  const actionBusy =
    isGenerating ||
    saveSheet.isPending ||
    submitSheet.isPending ||
    requestUnlock.isPending ||
    approveUnlock.isPending ||
    acknowledgeAttendance.isPending ||
    reviewCorrection.isPending;

  useEffect(() => {
    if (sheetQuery.data) {
      setLocalRows(sheetQuery.data.rows ?? []);
    }
  }, [sheetQuery.data?.rows]);

  const sheetLocationId =
    effectiveLocationId || sheetQuery.data?.location_id || "";
  const selectedLocationName =
    workLocations.find((location) => location.id === sheetLocationId)?.name ||
    (isEmployee ? "your profile" : "selected location");
  const visibleRows = useMemo(() => {
    const employeeScopedRows =
      isEmployee && authUser?.employee_id
        ? localRows.filter((row) => row.employee_id === authUser.employee_id)
        : localRows;
    const query = searchTerm.trim().toLowerCase();

    return employeeScopedRows.filter((row) => {
      const departmentId = String(getDepartmentId(row));
      const departmentName = getDepartmentName(row);
      const departmentConfigName =
        departments.find((department) => department.id === departmentId)?.name ||
        departmentName;
      const shiftName = getShiftName(row);
      const shiftId = row.shift?.id || row.shift_id || "";
      const searchable = [
        row.employee_id,
        row.name,
        row.designation,
        departmentConfigName,
        shiftName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !searchable.includes(query)) return false;
      if (
        departmentFilter &&
        departmentId !== departmentFilter &&
        departmentName !== departmentFilter &&
        departmentConfigName !== departmentFilter
      ) {
        return false;
      }
      if (shiftFilter && shiftId !== shiftFilter && shiftName !== shiftFilter) {
        return false;
      }
      return true;
    });
  }, [
    authUser?.employee_id,
    departmentFilter,
    departments,
    isEmployee,
    localRows,
    searchTerm,
    shiftFilter,
  ]);
  const counts = useMemo(() => {
    const base = {
      present: 0,
      late: 0,
      absent: 0,
      half_day: 0,
      on_leave: 0,
    };
    for (const row of visibleRows) {
      const key = String(row.status || "").toLowerCase() as keyof typeof base;
      if (key in base) base[key] += 1;
    }
    return base;
  }, [visibleRows]);

  const updateRow = (index: number, patch: Partial<EditableAttendanceRow>) => {
    setLocalRows((rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  };

  const handleSave = async () => {
    if (!sheetLocationId) {
      showToast("Location ID is mandatory before saving attendance.", "error");
      return;
    }
    try {
      const result = await saveSheet.mutateAsync({
        date,
        location_id: sheetLocationId,
        rows: localRows.map((row) => ({
          employee_id: row.employee_id,
          shift_id: row.shift?.id || row.shift_id,
          check_in: toApiTime(row.check_in),
          check_out: toApiTime(row.check_out),
          status: row.status,
          notes: row.notes || null,
          ack: !!row.ack,
        })),
      });
      showToast(`Saved ${result.saved_count ?? localRows.length} attendance rows.`);
    } catch (error) {
      showToast(errorMessage(error), "error");
    }
  };

  const handleSubmit = async () => {
    if (!sheetLocationId) {
      showToast("Location ID is mandatory before submitting to HO.", "error");
      return;
    }
    try {
      const result = await submitSheet.mutateAsync({
        date,
        location_id: sheetLocationId,
      });
      showToast(`Submitted ${result.submitted_count ?? 0} rows to HO.`);
    } catch (error) {
      showToast(errorMessage(error), "error");
    }
  };

  const handleRequestUnlock = async () => {
    if (!sheetLocationId || !unlockReason.trim()) {
      showToast("Location ID and unlock reason are mandatory.", "error");
      return;
    }
    try {
      await requestUnlock.mutateAsync({
        date,
        location_id: sheetLocationId,
        reason: unlockReason.trim(),
      });
      showToast("Unlock request sent.");
    } catch (error) {
      showToast(errorMessage(error), "error");
    }
  };

  const handleApproveUnlock = async () => {
    if (!sheetLocationId || !unlockReason.trim()) {
      showToast("Location ID and approval reason are mandatory.", "error");
      return;
    }
    try {
      const result = await approveUnlock.mutateAsync({
        date,
        location_id: sheetLocationId,
        unlock_reason: unlockReason.trim(),
      });
      showToast(`Unlocked ${result.unlocked_count ?? 0} rows for this location.`);
    } catch (error) {
      showToast(errorMessage(error), "error");
    }
  };

  const handleAck = async (row: EditableAttendanceRow) => {
    const id = row.attendance_id || row.id;
    if (!id) {
      showToast("No attendance record is available to acknowledge.", "error");
      return;
    }
    try {
      await acknowledgeAttendance.mutateAsync(id);
      showToast("Attendance acknowledged.");
    } catch (error) {
      showToast(errorMessage(error), "error");
    }
  };

  const handleReviewCorrection = async (
    id: string,
    decision: "approved" | "rejected",
  ) => {
    try {
      await reviewCorrection.mutateAsync({
        id,
        decision,
        review_note: null,
      });
      showToast(
        decision === "approved"
          ? "Attendance correction approved."
          : "Attendance correction rejected.",
      );
    } catch (error) {
      showToast(errorMessage(error), "error");
    }
  };

  return (
    <div className="att-page">
      <style>{S}</style>
      <header className="att-head">
        <div>
          <div className="att-head-card">
            <p className="att-kicker">Attendance workspace</p>
            <h1 className="att-title">
              {isEmployee ? "My Attendance" : "Daily Attendance"}
            </h1>
            <p className="att-sub">
              Review today’s roster, mark exceptions, and keep HO submission
              moving with clear status and guarded actions.
            </p>
          </div>
        </div>
        <div className="att-actions">
          {canWrite && (
            <button
              className="att-btn primary"
              onClick={handleSave}
              disabled={actionBusy || !sheetLocationId}
            >
              {saveSheet.isPending ? <Loader2 className="att-spin" /> : <FileCheck2 />}
              Save Sheet
            </button>
          )}
          {canSubmit && (
            <button
              className="att-btn secondary"
              onClick={handleSubmit}
              disabled={actionBusy || !sheetLocationId}
            >
              {submitSheet.isPending ? <Loader2 className="att-spin" /> : <Send />}
              Submit To HO
            </button>
          )}
        </div>
      </header>

      {!canRead && (
        <div className="att-banner warn">
          You do not have attendance:read permission for this module.
        </div>
      )}

      <section className="att-card">
        <div className="att-toolbar">
          {!isEmployee && isSuperAdmin && (
            <div className="att-field">
              <label htmlFor="attendance-location">Work Location</label>
              <select
                id="attendance-location"
                className="att-select"
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
                disabled={locationsLoading || shouldLockLocation || actionBusy}
              >
                <option value="">
                  {locationsLoading
                    ? "Loading work locations..."
                    : "Select work location"}
                </option>
                {workLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!isEmployee && !isSuperAdmin && (
            <div className="att-field">
              <label>Work Location</label>
              <div
                className={`att-locked-field${isHrMissingLocation ? " warn" : ""}`}
              >
                {isHrMissingLocation ? <AlertTriangle /> : <MapPin />}
                {isHrMissingLocation
                  ? "No work location assigned"
                  : selectedLocationName}
              </div>
            </div>
          )}
          <div className="att-actions">
            <button
              className="att-btn ghost"
              type="button"
              aria-label="Generate Daily Sheet"
              onClick={() => sheetQuery.refetch()}
              disabled={!canLoadSheet || isGenerating}
            >
              {isGenerating ? <Loader2 className="att-spin" /> : <RefreshCw />}
              {isGenerating ? "Generating..." : "Generate Daily Sheet"}
            </button>
          </div>
        </div>

        <div className="att-status-card">
          <span className="att-status-icon">
            {isEmployee ? (
              <UserRoundCheck />
            ) : isHrMissingLocation ? (
              <AlertTriangle />
            ) : shouldLockLocation ? (
              <MapPin />
            ) : (
              <ShieldCheck />
            )}
          </span>
          <div>
            <strong>
              {isEmployee
                ? "Showing your attendance only"
                : isHrMissingLocation
                  ? "No work location assigned"
                : shouldLockLocation
                  ? `Locked to ${selectedLocationName}`
                  : sheetLocationId
                    ? `Viewing ${selectedLocationName}`
                    : "Choose a work location to load the sheet"}
            </strong>
            <p>
              {isEmployee
                ? "Your row is protected for self-service review and acknowledgement."
                : isHrMissingLocation
                  ? "Attendance is restricted to your assigned HR location. Ask an administrator to update your profile."
                : shouldLockLocation
                  ? "This view follows your assigned HR location and refreshes automatically."
                : sheetLocationId
                    ? "The sheet refreshes automatically when the location changes."
                    : "Selecting a location loads attendance automatically; use Generate only when you want to refresh."}
            </p>
          </div>
        </div>

        <div className="att-stats">
          <div className="att-stat total">
            <div className="att-stat-icon"><CalendarDays /></div>
            <span>Total rows</span>
            <strong>{visibleRows.length}</strong>
          </div>
          <div className="att-stat present">
            <div className="att-stat-icon"><CheckCircle2 /></div>
            <span>Present</span>
            <strong>{counts.present}</strong>
          </div>
          <div className="att-stat late">
            <div className="att-stat-icon"><Clock3 /></div>
            <span>Late</span>
            <strong>{counts.late}</strong>
          </div>
          <div className="att-stat absent">
            <div className="att-stat-icon"><XCircle /></div>
            <span>Absent</span>
            <strong>{counts.absent}</strong>
          </div>
          <div className="att-stat leave">
            <div className="att-stat-icon"><TimerReset /></div>
            <span>On leave</span>
            <strong>{counts.on_leave}</strong>
          </div>
        </div>

        <div className="att-filters">
          <div className="att-field att-filter-field">
            <label htmlFor="attendance-search">Search Attendance</label>
            <Search />
            <input
              id="attendance-search"
              className="att-input"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, ID, designation"
            />
          </div>
          <div className="att-field">
            <label htmlFor="attendance-department">Department</label>
            <select
              id="attendance-department"
              className="att-select"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div className="att-field">
            <label htmlFor="attendance-shift">Shift</label>
            <select
              id="attendance-shift"
              className="att-select"
              value={shiftFilter}
              onChange={(event) => setShiftFilter(event.target.value)}
            >
              <option value="">All shifts</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="att-grid">
          <div>
            <div className="att-section-head">
              <div className="att-section-title">
                <UserRoundCheck />
                Attendance sheet
              </div>
              <span className="att-live">
                <span className="att-live-dot" />
                {isGenerating ? "Updating" : "Live view"}
              </span>
            </div>
            <div className="att-table-wrap">
              <table className="att-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Shift</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Ack</th>
                  <th>State</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sheetQuery.isLoading && !localRows.length ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="att-empty">Loading attendance...</div>
                    </td>
                  </tr>
                ) : visibleRows.length ? (
                  visibleRows.map((row) => {
                    const index = localRows.findIndex((item) => item === row);
                    const recordId = row.attendance_id || row.id;
                    const status = String(row.status || "absent").toLowerCase();
                    return (
                      <tr key={recordId || `${row.employee_id}-${index}`}>
                        <td>
                          <div className="att-person">
                            <span className="att-avatar">{initials(row.name)}</span>
                            <div>
                              <div className="att-name">{row.name || row.employee_id}</div>
                              <div>{row.designation || "No designation"}</div>
                              <div className="att-muted">
                                {row.employee_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>{row.shift?.name || "Unassigned"}</div>
                          <div className="att-muted">
                            {row.shift?.expected_in || "--"} - {row.shift?.expected_out || "--"}
                          </div>
                        </td>
                        <td>
                          {canWrite ? (
                            <input
                              className="att-input"
                              type="time"
                              value={toTimeInput(row.check_in)}
                              onChange={(event) =>
                                updateRow(index, { check_in: event.target.value })
                              }
                            />
                          ) : (
                            toTimeInput(row.check_in) || "--"
                          )}
                        </td>
                        <td>
                          {canWrite ? (
                            <input
                              className="att-input"
                              type="time"
                              value={toTimeInput(row.check_out)}
                              onChange={(event) =>
                                updateRow(index, { check_out: event.target.value })
                              }
                            />
                          ) : (
                            toTimeInput(row.check_out) || "--"
                          )}
                        </td>
                        <td>
                          {canWrite ? (
                            <select
                              aria-label={`Status for ${row.employee_id}`}
                              className="att-select"
                              value={status}
                              onChange={(event) =>
                                updateRow(index, { status: event.target.value })
                              }
                            >
                              {STATUSES.map((option) => (
                                <option key={option} value={option}>
                                  {statusLabel[option]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={`att-pill ${status}`}>
                              {statusLabel[status] || row.status}
                            </span>
                          )}
                        </td>
                        <td>
                          {canWrite && !row.read_only_notes ? (
                            <input
                              className="att-input"
                              value={row.notes || ""}
                              onChange={(event) =>
                                updateRow(index, { notes: event.target.value })
                              }
                              placeholder="Optional"
                            />
                          ) : (
                            row.notes || "--"
                          )}
                        </td>
                        <td>{row.ack ? "Acknowledged" : "Pending"}</td>
                        <td>
                          <span className="att-pill">{row.state || "draft"}</span>
                        </td>
                        <td>
                          {isEmployee && recordId && !row.ack ? (
                            <button
                              className="att-btn primary"
                              onClick={() => handleAck(row)}
                            >
                              Acknowledge Attendance
                            </button>
                          ) : (
                            <span className="att-muted">No action</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9}>
                      <div className="att-empty">
                        No attendance rows match these filters.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
          </div>

          <aside className="att-side">
            {canReviewCorrections && (
              <div className="att-card">
                <h3><TimerReset />Correction requests</h3>
                <p>
                  Review employee-submitted attendance corrections before the
                  sheet is updated.
                </p>
                {correctionsQuery.isLoading ? (
                  <div className="att-empty" style={{ marginTop: 12 }}>
                    Loading correction requests...
                  </div>
                ) : correctionsQuery.data?.length ? (
                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    {correctionsQuery.data.map((request) => (
                      <div
                        key={request.id}
                        style={{
                          border: "1px solid #eef2f7",
                          borderRadius: 14,
                          padding: 12,
                          background: "#f8fafc",
                        }}
                      >
                        <div className="att-person">
                          <span className="att-avatar">
                            {initials(request.employee_name || request.employee_id)}
                          </span>
                          <div>
                            <div className="att-name">
                              {request.employee_name || request.employee_id}
                            </div>
                            <div className="att-muted">
                              {request.employee_id} · {request.date}
                            </div>
                          </div>
                        </div>
                        <div
                          className="att-muted"
                          style={{ marginTop: 8, lineHeight: 1.5 }}
                        >
                          Requested in: {toTimeInput(request.requested_check_in) || "--"} ·
                          Requested out: {toTimeInput(request.requested_check_out) || "--"}
                        </div>
                        <p style={{ marginTop: 8 }}>{request.reason}</p>
                        <div className="att-actions" style={{ marginTop: 10 }}>
                          <button
                            className="att-btn primary"
                            onClick={() => handleReviewCorrection(request.id, "approved")}
                            disabled={actionBusy}
                          >
                            {reviewCorrection.isPending ? (
                              <Loader2 className="att-spin" />
                            ) : (
                              <CheckCircle2 />
                            )}
                            Approve Correction
                          </button>
                          <button
                            className="att-btn danger"
                            onClick={() => handleReviewCorrection(request.id, "rejected")}
                            disabled={actionBusy}
                          >
                            <XCircle />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="att-empty" style={{ marginTop: 12 }}>
                    No pending correction requests.
                  </div>
                )}
              </div>
            )}

            {!isEmployee && canWrite && (
              <div className="att-card">
                <h3><LockKeyhole />Unlock workflow</h3>
                <p>
                  Use unlock requests for correction windows after a sheet has
                  moved forward. Approvals apply to the selected date and
                  location.
                </p>
                <div className="att-field" style={{ marginTop: 12 }}>
                  <label htmlFor="unlock-reason">Unlock Reason</label>
                  <textarea
                    id="unlock-reason"
                    className="att-textarea"
                    value={unlockReason}
                    onChange={(event) => setUnlockReason(event.target.value)}
                    placeholder="Correction needed for check-in time"
                  />
                </div>
                <div className="att-actions" style={{ marginTop: 10 }}>
                  <button
                    className="att-btn warning"
                    onClick={handleRequestUnlock}
                    disabled={actionBusy || !sheetLocationId || !unlockReason.trim()}
                  >
                    {requestUnlock.isPending ? <Loader2 className="att-spin" /> : <AlertTriangle />}
                    Request Unlock
                  </button>
                  {canUnlock && (
                    <button
                      className="att-btn danger"
                      onClick={handleApproveUnlock}
                      disabled={actionBusy || !sheetLocationId || !unlockReason.trim()}
                    >
                      {approveUnlock.isPending ? <Loader2 className="att-spin" /> : <LockKeyhole />}
                      Approve Unlock
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="att-card">
              <h3><FileCheck2 />Monthly report</h3>
              <p>
                A quick performance snapshot for the selected month, focused on
                names, roles, and attendance health.
              </p>
              {reportQuery.isLoading ? (
                <div className="att-empty" style={{ marginTop: 12 }}>
                  Loading report...
                </div>
              ) : reportQuery.data?.length ? (
                reportQuery.data.slice(0, 5).map((row: any) => (
                  <div className="att-report-row" key={row.employee_id}>
                    <div>
                      <strong>{row.name || row.employee_id}</strong>
                      <div className="att-muted">{row.designation || "Employee"}</div>
                    </div>
                    <strong>{row.attendance_percent ?? 0}%</strong>
                  </div>
                ))
              ) : (
                <div className="att-empty" style={{ marginTop: 12 }}>
                  No report records for this month.
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
