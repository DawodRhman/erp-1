import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getVisibleEmployees } from "../utils/utils";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  UserX,
  Upload,
} from "lucide-react";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { useToastContext } from "../context/ToastContext";
import { useRbac } from "../hooks/useRbac";
import { apiClient } from "../services/apiClient";

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .emp-page { font-family:'Segoe UI',system-ui,-apple-system,sans-serif; padding:22px 28px; background:#f0f2f8; min-height:100vh; }
  .emp-card { background:#fff; border-radius:16px; padding:18px 20px; box-shadow:0 1px 10px rgba(0,0,0,.07); animation:fadeUp .35s ease both; }
  .emp-input {
    height:36px; border:1.5px solid #e5e7eb; border-radius:10px; padding:0 12px;
    font-size:12px; color:#374151; background:#fff; outline:none; transition:border .15s,box-shadow .15s;
    font-family:inherit;
  }
  .emp-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
  .emp-select { cursor:pointer; padding-right:28px; }
  .emp-table { width:100%; border-collapse:collapse; }
  .emp-table thead tr { border-bottom:2px solid #f1f5f9; }
  .emp-table th {
    text-align:left; padding:10px 12px; font-size:10px; font-weight:700;
    color:#9ca3af; letter-spacing:.06em; text-transform:uppercase; white-space:nowrap;
    user-select:none;
  }
  .emp-table th.sortable { cursor:pointer; }
  .emp-table th.sortable:hover { color:#6366f1; }
  .emp-table td { padding:10px 12px; font-size:12px; color:#374151; border-bottom:1px solid #f8fafc; vertical-align:middle; }
  .emp-table tbody tr { transition:background .1s; }
  .emp-table tbody tr:hover td { background:#f8faff; }
  .emp-table tbody tr:last-child td { border-bottom:none; }
  .emp-avatar {
    width:32px; height:32px; border-radius:10px; background:linear-gradient(135deg,#6366f1,#8b5cf6);
    color:#fff; display:flex; align-items:center; justify-content:center;
    font-size:11px; font-weight:700; flex-shrink:0;
  }
  .emp-avatar-img { object-fit:cover; border:1px solid #eef2ff; }
  .emp-pill {
    display:inline-flex; align-items:center; padding:3px 9px; border-radius:20px;
    font-size:9px; font-weight:700; white-space:nowrap;
  }
  .emp-pill-active    { background:#dcfce7; color:#166534; }
  .emp-pill-probation { background:#fef3c7; color:#d97706; }
  .emp-pill-notice    { background:#fee2e2; color:#dc2626; }
  .emp-pill-terminated{ background:#f3f4f6; color:#6b7280; }
  .emp-pill-default   { background:#eff6ff; color:#2563eb; }
  .emp-ico-btn {
    width:28px; height:28px; border:1.5px solid #e5e7eb; border-radius:8px;
    background:#fff; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;
    color:#6b7280; transition:all .15s;
  }
  .emp-ico-btn:hover { background:#6366f1; border-color:#6366f1; color:#fff; }
  .emp-btn {
    height:36px; border:none; border-radius:10px; padding:0 16px; font-size:12px;
    font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px;
    transition:opacity .15s,transform .15s; font-family:inherit;
  }
  .emp-btn:hover { opacity:.88; transform:translateY(-1px); }
  .emp-btn-primary { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 4px 14px rgba(99,102,241,.35); }
  .emp-btn-danger  { background:#fee2e2; color:#dc2626; }
  .emp-btn-ghost   { background:#f3f4f6; color:#374151; border:1.5px solid #e5e7eb; }
  .emp-btn-ghost:disabled { opacity:.4; cursor:not-allowed; transform:none; }
  .emp-btn-secondary { background:#eef2ff; color:#4338ca; border:1.5px solid #c7d2fe; }
  .emp-btn-pg      { height:30px; min-width:30px; padding:0 10px; border-radius:8px; font-size:11px; }
  .emp-btn-pg-active { background:#6366f1; color:#fff; box-shadow:0 2px 8px rgba(99,102,241,.3); }
  .emp-skel { background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%); background-size:200% 100%; animation:pulse 1.2s ease-in-out infinite; }
  .emp-skel-row td { padding:12px; }
  .emp-bulk { background:#eff6ff; border:1.5px solid #c7d2fe; border-radius:14px; padding:10px 16px; margin-bottom:12px; display:flex; align-items:center; gap:12px; animation:fadeUp .2s ease both; }
  .emp-check { accent-color:#6366f1; width:14px; height:14px; cursor:pointer; }
  ::-webkit-scrollbar { height:4px; width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
`;

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const API_ORIGIN = String(apiClient.defaults.baseURL || "http://localhost:3001/api").replace(/\/api\/?$/, "");

function imageUrl(value?: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

const formatJoinDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ── Avatar color from name hash ──
const avatarGradients = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#ec4899,#f9a8d4)",
  "linear-gradient(135deg,#f97316,#fbbf24)",
  "linear-gradient(135deg,#14b8a6,#06b6d4)",
  "linear-gradient(135deg,#10b981,#34d399)",
  "linear-gradient(135deg,#3b82f6,#60a5fa)",
];
const nameGrad = (name: string) =>
  avatarGradients[name.charCodeAt(0) % avatarGradients.length];

function EmployeeAvatar({ employee }: { employee: any }) {
  const [failed, setFailed] = useState(false);
  const photoUrl = imageUrl(employee.profilePhotoUrl || employee.profile_photo_url);

  useEffect(() => {
    setFailed(false);
  }, [photoUrl]);

  if (photoUrl && !failed) {
    return (
      <img
        className="emp-avatar emp-avatar-img"
        src={photoUrl}
        alt={`${employee.name} profile`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="emp-avatar" style={{ background: nameGrad(employee.name || "?") }}>
      {employee.avatar || getInitials(employee.name || employee.id || "?")}
    </div>
  );
}

// ── Status pill mapping ──
const pillClass = (status: string) => {
  const s = status?.toLowerCase();
  if (s === "active") return "emp-pill emp-pill-active";
  if (s === "probation") return "emp-pill emp-pill-probation";
  if (s?.includes("notice")) return "emp-pill emp-pill-notice";
  if (s === "terminated") return "emp-pill emp-pill-terminated";
  return "emp-pill emp-pill-default";
};

type SortKey = "id" | "name" | "department" | "designation" | "dateOfJoining";
type SortDir = "asc" | "desc";

import { useEmployees } from "../hooks/useEmployees";
import {
  useDepartments,
  useDesignations,
  useWorkLocations,
} from "../hooks/useConfig";

// ══════════════════════════════════════════════════════════════════════════════
export default function Employees() {
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { user, activeRole } = useAuth();
  const { can } = useRbac();
  const isDepartmentHead = activeRole === "department_head";
  const canCreate = can("create_employee");
  const canEdit = can("edit_employee");
  const canDelete = can("delete_employee");
  const canWrite = canCreate || canEdit || canDelete;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("active");
  const [terminateConfirm, setTerminateConfirm] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(25);

  const { data: deptData = [] } = useDepartments();
  const { data: desigData = [] } = useDesignations();
  const { data: locData = [] } = useWorkLocations();

  const departments = deptData.map((d: any) => ({
    id: d.id ?? d.department_id ?? d.code ?? d.name,
    name: d.name ?? d.title ?? d.department_name,
  }));
  const designations = desigData.map((d: any) => ({
    id: d.id ?? d.designation_id ?? d.code ?? d.name,
    name: d.name ?? d.title ?? d.designation_name,
  }));
  const locations = locData.map((d: any) => ({
    id: d.id ?? d.work_location_id ?? d.code ?? d.name,
    name: d.name ?? d.title ?? d.location_name ?? d.work_location_name,
  }));
  const selectedDeptName = departments.find(
    (d) => String(d.id) === String(deptFilter),
  )?.name;
  const selectedDesignationName = designations.find(
    (d) => String(d.id) === String(designationFilter),
  )?.name;
  const selectedLocationName = locations.find(
    (d) => String(d.id) === String(locationFilter),
  )?.name;

  // You can either pass these filters to the backend or filter on the frontend.
  // The instructions specify "Implement pagination and search/filter parameters",
  // so let's pass them to the backend:
  const {
    data: employees = [],
    pagination,
    isLoading,
    isError,
    bulkUpdate,
  } = useEmployees({
    page: page + 1, // Backend uses 1-based page
    limit: perPage,
    search: debouncedSearch,
    department_id: deptFilter || undefined,
    // Avoid sending filters the backend may not support yet.
    // Local filtering + sorting still apply for UX.
    sort_by: undefined,
    sort_order: undefined,
  });

  const visibleEmployees = useMemo(
    () => getVisibleEmployees(user, activeRole, employees),
    [user, activeRole, employees],
  );

  const [errorShown, setErrorShown] = useState(false);
  useEffect(() => {
    if (isError && !errorShown) {
      showToast("Failed to load employees", "error");
      setErrorShown(true);
    }
    if (!isError && errorShown) {
      setErrorShown(false);
    }
  }, [isError, errorShown, showToast]);

  // Frontend filtering logic is reduced because we are passing it to the backend.
  // However, `getVisibleEmployees` (RBAC) might still filter results.
  const searchTerm = debouncedSearch.toLowerCase();
  const filtered = visibleEmployees.filter((e) => {
    const statusValue = String(e.jobStatus || e.status || "").toLowerCase();
    const isActiveMatch =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? statusValue !== "terminated" && statusValue !== "inactive"
          : statusValue === "terminated" || statusValue === "inactive";
    const deptMatch = deptFilter ? e.department === selectedDeptName : true;
    const designationMatch = designationFilter
      ? e.designation === selectedDesignationName
      : true;
    const locationMatch = locationFilter
      ? e.workLocation === selectedLocationName
      : true;
    const searchMatch = searchTerm
      ? `${e.id || ""} ${e.name || ""}`.toLowerCase().includes(searchTerm)
      : true;
    return (
      isActiveMatch &&
      deptMatch &&
      designationMatch &&
      locationMatch &&
      searchMatch
    );
  });

  // Since backend handles pagination, we use backend total if available, else local
  const totalCount = pagination?.total ?? filtered.length;
  const totalPages =
    pagination?.totalPages || Math.ceil(totalCount / perPage) || 1;
  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    const av = (a as any)[sortKey] ?? "";
    const bv = (b as any)[sortKey] ?? "";
    if (av === bv) return 0;
    return av > bv ? dir : -dir;
  });
  const paged = sorted;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const selectAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map((e) => e.id)));
  };

  const terminateSelected = async () => {
    if (!canWrite) {
      showToast("Insufficient permissions", "error");
      return;
    }
    try {
      await bulkUpdate({
        ids: Array.from(selected),
        updates: { jobStatus: "Terminated" },
      });
      showToast(`${selected.size} employee(s) terminated successfully`);
      setSelected(new Set());
      setTerminateConfirm(false);
    } catch (e) {
      showToast(`Failed to terminate employees`, "error");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDeptFilter("");
    setDesignationFilter("");
    setLocationFilter("");
    setStatusFilter("active");
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col)
      return <ArrowUpDown size={10} style={{ opacity: 0.3, marginLeft: 3 }} />;
    return sortDir === "asc" ? (
      <ChevronUp size={10} style={{ marginLeft: 3, color: "#6366f1" }} />
    ) : (
      <ChevronDown size={10} style={{ marginLeft: 3, color: "#6366f1" }} />
    );
  };

  const activeCount = visibleEmployees.filter((e) => {
    const statusValue = String(e.jobStatus || e.status || "").toLowerCase();
    return statusValue !== "terminated" && statusValue !== "inactive";
  }).length;
  const hasFilters =
    search ||
    deptFilter ||
    designationFilter ||
    locationFilter ||
    statusFilter !== "active";

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="emp-page">
        {/* ── Page Header ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 800,
                color: "#1e1b4b",
              }}
            >
              {isDepartmentHead ? "Department Team" : "Employees"}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>
              {isDepartmentHead ? "View employees assigned under your department" : "Manage all employees in your organization"} &nbsp;·&nbsp;
              <span style={{ color: "#6366f1", fontWeight: 600 }}>
                {activeCount} active
              </span>
            </p>
          </div>
          {canCreate && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="emp-btn emp-btn-secondary"
                onClick={() => navigate("/employees/bulk-upload")}
              >
                <Upload size={13} /> Bulk Upload
              </button>
              <button
                className="emp-btn emp-btn-primary"
                onClick={() => navigate("/employees/add")}
              >
                <Plus size={13} /> Create Employee
              </button>
            </div>
          )}
        </div>

        {(activeRole === "head_hr" ||
          activeRole === "branch_hr" ||
          activeRole === "department_hr" ||
          activeRole === "department_head") &&
          user?.departments &&
          !user.departments.includes("All") && (
            <div
              style={{
                marginBottom: 12,
                fontSize: 12,
                color: "#475569",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              Showing only assigned department(s):{" "}
              <strong>{user.departments.join(", ")}</strong>.
            </div>
          )}

        {/* ── Filters + Search — same card as table ── */}
        <div className="emp-card" style={{ marginBottom: 12 }}>
          {/* Filter bar */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            {/* Search */}
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af",
                }}
              />
              <input
                className="emp-input"
                style={{ paddingLeft: 32, width: "100%" }}
                placeholder="Search by name or ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>

            {/* Department */}
            <select
              className="emp-input emp-select"
              style={{ width: 160 }}
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Designation */}
            <select
              className="emp-input emp-select"
              style={{ width: 160 }}
              value={designationFilter}
              onChange={(e) => {
                setDesignationFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All Designations</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Location */}
            <select
              className="emp-input emp-select"
              style={{ width: 160 }}
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All Locations</option>
              {locations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              className="emp-input emp-select"
              style={{ width: 140 }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(
                  e.target.value as "all" | "active" | "inactive",
                );
                setPage(0);
              }}
            >
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="all">All Statuses</option>
            </select>

            {/* Clear filters */}
            {hasFilters && (
              <button
                className="emp-btn emp-btn-ghost"
                style={{ height: 32, fontSize: 11 }}
                onClick={clearFilters}
              >
                Clear All ✕
              </button>
            )}
          </div>

          {/* Results count */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              {filtered.length === 0
                ? "No results"
                : `Showing ${filtered.length} employee${filtered.length !== 1 ? "s" : ""}${hasFilters ? " (filtered)" : ""}`}
            </span>
            {(designations.length === 0 || locations.length === 0) && (
              <span style={{ fontSize: 10, color: "#f97316" }}>
                Missing config endpoints for:{" "}
                {designations.length === 0 ? "designations" : ""}
                {designations.length === 0 && locations.length === 0
                  ? " and "
                  : ""}
                {locations.length === 0 ? "work locations" : ""}
              </span>
            )}
            {selected.size > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{ fontSize: 11, fontWeight: 600, color: "#6366f1" }}
                >
                  {selected.size} selected
                </span>
                <button
                  className="emp-btn emp-btn-danger"
                  style={{ height: 30, fontSize: 11 }}
                  onClick={() => setTerminateConfirm(true)}
                  disabled={!canWrite}
                >
                  <UserX size={11} /> Terminate Selected
                </button>
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ overflowX: "auto" }}>
            <table className="emp-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      className="emp-check"
                      checked={
                        paged.length > 0 && selected.size === paged.length
                      }
                      onChange={selectAll}
                    />
                  </th>
                  <th className="sortable" onClick={() => toggleSort("id")}>
                    Emp ID <SortIcon col="id" />
                  </th>
                  <th className="sortable" onClick={() => toggleSort("name")}>
                    Name <SortIcon col="name" />
                  </th>
                  <th
                    className="sortable"
                    onClick={() => toggleSort("department")}
                  >
                    Department <SortIcon col="department" />
                  </th>
                  <th
                    className="sortable"
                    onClick={() => toggleSort("designation")}
                  >
                    Designation <SortIcon col="designation" />
                  </th>
                  <th>Status</th>
                  <th
                    className="sortable"
                    onClick={() => toggleSort("dateOfJoining")}
                  >
                    Joined <SortIcon col="dateOfJoining" />
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`skel-${idx}`} className="emp-skel-row">
                      <td colSpan={8}>
                        <div
                          className="emp-skel"
                          style={{ height: 18, borderRadius: 10 }}
                        />
                      </td>
                    </tr>
                  ))
                ) : paged.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ textAlign: "center", padding: "48px 20px" }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}></div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#374151",
                          marginBottom: 4,
                        }}
                      >
                        No employees found
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>
                        Try adjusting your search or filters
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((e, idx) => (
                    <tr
                      key={e.id || e.employee_id || `${e.name || "row"}-${idx}`}
                      style={{
                        ...(selected.has(e.id)
                          ? { background: "#f5f3ff" }
                          : {}),
                        ...(e.jobStatus === "Terminated"
                          ? { opacity: 0.5 }
                          : {}),
                      }}
                    >
                      {/* Checkbox */}
                      <td>
                        <input
                          type="checkbox"
                          className="emp-check"
                          checked={selected.has(e.id)}
                          onChange={() => toggleSelect(e.id)}
                        />
                      </td>

                      {/* Emp ID */}
                      <td>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 11,
                            background: "#f3f4f6",
                            padding: "2px 7px",
                            borderRadius: 6,
                            color: "#374151",
                            fontWeight: 600,
                          }}
                        >
                          {e.id || "-"}
                        </span>
                      </td>

                      {/* Name + Avatar */}
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <EmployeeAvatar employee={e} />
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "#1e1b4b",
                                fontSize: 12,
                              }}
                            >
                              {e.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td>
                        <span style={{ fontSize: 11, color: "#6b7280" }}>
                          {e.department}
                        </span>
                      </td>

                      {/* Designation */}
                      <td>
                        <span style={{ fontSize: 11, color: "#374151" }}>
                          {e.designation || "-"}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={pillClass(e.jobStatus)}>
                          {e.jobStatus}
                        </span>
                      </td>

                      {/* Joined */}
                      <td
                        style={{
                          fontFamily: "monospace",
                          fontSize: 11,
                          color: "#9ca3af",
                        }}
                      >
                        {formatJoinDate(e.dateOfJoining)}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button
                            className="emp-ico-btn"
                            title="View"
                            onClick={() => navigate(`/employees/${e.id}`)}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            className="emp-ico-btn"
                            title="Edit"
                            onClick={() =>
                              canWrite
                                ? navigate("/employees/add")
                                : showToast("Insufficient permissions", "error")
                            }
                            disabled={!canWrite}
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 14,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                color: "#9ca3af",
              }}
            >
              <span>
                Showing&nbsp;
                <strong style={{ color: "#374151" }}>
                  {totalCount === 0 ? 0 : page * perPage + 1}–
                  {Math.min((page + 1) * perPage, totalCount)}
                </strong>
                &nbsp;of&nbsp;
                <strong style={{ color: "#374151" }}>{totalCount}</strong>
              </span>
              <select
                className="emp-input"
                style={{
                  width: 60,
                  height: 28,
                  padding: "0 6px",
                  fontSize: 11,
                }}
                value={perPage}
                onChange={(e) => {
                  setPerPage(+e.target.value);
                  setPage(0);
                }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>per page</span>
            </div>

            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button
                className="emp-btn emp-btn-ghost emp-btn-pg"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <button
                  key={i}
                  className={`emp-btn emp-btn-pg ${page === i ? "emp-btn-pg-active" : "emp-btn-ghost"}`}
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </button>
              ))}

              <button
                className="emp-btn emp-btn-ghost emp-btn-pg"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>

        {/* ── Confirm Dialog — logic unchanged ── */}
        <ConfirmDialog
          open={terminateConfirm}
          title="Terminate Selected Employees"
          message={`Are you sure you want to terminate ${selected.size} selected employee(s)? Their status will be set to Terminated and they will be hidden from the active list.`}
          onConfirm={terminateSelected}
          onCancel={() => setTerminateConfirm(false)}
        />
      </div>
    </>
  );
}
