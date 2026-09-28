import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Pencil, RefreshCw, Upload, XCircle } from "lucide-react";
import { useToastContext } from "../context/ToastContext";
import {
  downloadEmployeeBulkTemplate,
  useEmployeeBulkUpload,
  type BulkPreview,
  type BulkPreviewRow,
} from "../hooks/useEmployeeBulkUpload";

const columns = [
  "employee_id", "full_name", "father_name", "cnic", "date_of_birth",
  "department", "designation", "employment_type", "job_status", "work_mode",
  "work_location", "shift", "date_of_joining", "primary_phone",
  "permanent_country", "permanent_province", "permanent_district", "permanent_city",
  "permanent_town", "permanent_street", "permanent_postal_code",
  "emergency_contact_1_relation", "emergency_contact_1_full_name", "emergency_contact_1_phone",
  "bank_name", "iban", "account_title", "account_number", "account_type",
  "blood_group", "gender", "height_cm", "weight_kg",
];

const fieldLabels: Record<string, string> = {
  employee_id: "Employee ID",
  full_name: "Full name",
  father_name: "Father name",
  cnic: "CNIC",
  date_of_birth: "Date of birth",
  department: "Department",
  designation: "Designation",
  employment_type: "Employment type",
  job_status: "Job status",
  work_mode: "Work mode",
  work_location: "Work location",
  shift: "Shift",
  date_of_joining: "Date of joining",
  primary_phone: "Primary phone",
  permanent_country: "Country",
  permanent_province: "Province",
  permanent_district: "District",
  permanent_city: "City",
  permanent_town: "Town / Area",
  emergency_contact_1_relation: "Emergency relation",
  account_type: "Bank account type",
  blood_group: "Blood group",
  gender: "Gender",
  accountInfo: "Account creation",
  salaryInfo: "Salary history",
  attachments: "Attachments",
  bankInfo: "Bank information",
  medicalInfo: "Medical information",
};

const taskStorageKey = "ems.bulkUpload.postImportTasks";

type PostImportTaskStatus = "pending" | "done" | "skipped";

type PostImportTask = {
  key: string;
  label: string;
  message: string;
  status: PostImportTaskStatus;
};

type EmployeePostImportTask = {
  employee_id: string;
  employee_name: string;
  rowNumber: number;
  importedAt: string;
  tasks: PostImportTask[];
};

const postImportFieldLabels: Record<string, string> = {
  accountInfo: "Create login account",
  salaryInfo: "Add salary history",
  attachments: "Upload profile photo/documents",
  bankInfo: "Complete bank information",
  medicalInfo: "Complete medical information",
};

const sectionByField: Record<string, string> = {
  employee_id: "Personal",
  full_name: "Personal",
  father_name: "Personal",
  cnic: "Personal",
  date_of_birth: "Personal",
  department: "Job",
  designation: "Job",
  employment_type: "Job",
  job_status: "Job",
  work_mode: "Job",
  work_location: "Job",
  shift: "Job",
  date_of_joining: "Job",
  primary_phone: "Contact",
  permanent_country: "Contact",
  permanent_province: "Contact",
  permanent_city: "Contact",
  emergency_contact_1_relation: "Emergency",
  account_type: "Bank",
  blood_group: "Medical",
  gender: "Medical",
  accountInfo: "After import",
  salaryInfo: "After import",
  attachments: "After import",
  bankInfo: "After import",
  medicalInfo: "After import",
};

function loadStoredTasks(): EmployeePostImportTask[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(taskStorageKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredTasks(tasks: EmployeePostImportTask[]) {
  localStorage.setItem(taskStorageKey, JSON.stringify(tasks));
}

function labelFor(field: string) {
  return fieldLabels[field] || field.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanMessage(message: string) {
  return message
    .replace(/_/g, " ")
    .replace(/\bfull name\b/i, "Full name")
    .replace(/\bemployee id\b/i, "Employee ID")
    .replace(/\bcnic\b/i, "CNIC")
    .replace(/\bis mandatory\b/i, "is mandatory");
}

function readableIssue(issue: { field: string; message: string }) {
  const label = labelFor(issue.field);
  let message = humanMessage(issue.message);
  if (issue.field === "accountInfo") message = "Create the login account from the employee profile after import.";
  if (issue.field === "salaryInfo") message = "Add salary history from the employee profile after import.";
  if (issue.field === "attachments") message = "Upload profile photo and documents from the employee Documents tab after import.";
  if (issue.field === "bankInfo") message = "Bank information is incomplete. Complete it now if available, or update it after import.";
  if (issue.field === "medicalInfo") message = "Medical information is incomplete. Complete it now if available, or update it after import.";
  const normalizedLabel = label.toLowerCase();
  if (message.toLowerCase().startsWith(`${normalizedLabel} `)) {
    message = message.slice(label.length).trim();
    message = message.charAt(0).toLowerCase() + message.slice(1);
  }
  return { label, message };
}

function PostImportActions({ row }: { row: BulkPreviewRow }) {
  const actions = row.warnings.filter((issue) => ["accountInfo", "salaryInfo", "attachments"].includes(issue.field));
  if (!actions.length) return null;
  return (
    <div style={{ padding: 12, borderRadius: 8, background: "#eef2ff", border: "1px solid #c7d2fe" }}>
      <div style={{ fontSize: 11, fontWeight: 950, color: "#3730a3", textTransform: "uppercase", marginBottom: 8 }}>
        Post-import actions
      </div>
      <IssueList row={{ ...row, warnings: actions, errors: [] }} type="warnings" />
    </div>
  );
}

function IssueList({ row, type }: { row: BulkPreviewRow; type: "errors" | "warnings" }) {
  const issues = row[type] || [];
  if (!issues.length) return <span style={{ color: "#94a3b8" }}>No {type}</span>;
  const grouped = issues.reduce<Record<string, typeof issues>>((acc, issue) => {
    const section = sectionByField[issue.field] || "Other";
    acc[section] = acc[section] || [];
    acc[section].push(issue);
    return acc;
  }, {});
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {Object.entries(grouped).map(([section, items]) => (
        <div key={section}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>{section}</div>
          <div style={{ display: "grid", gap: 4 }}>
            {items.map((issue, index) => (
              <div key={`${issue.field}-${index}`} style={{ fontSize: 12, color: type === "errors" ? "#991b1b" : "#92400e" }}>
                {(() => {
                  const readable = readableIssue(issue);
                  return <><strong>{readable.label}:</strong> {readable.message}</>;
                })()}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function summarize(preview: BulkPreview | null) {
  if (!preview) return { total_rows: 0, valid_rows: 0, error_rows: 0, warning_rows: 0 };
  return preview;
}

function buildPostImportTasks(importResult: any, importedRows: BulkPreviewRow[]): EmployeePostImportTask[] {
  const importedIds = new Set((importResult?.imported || []).map((item: any) => item.employee_id).filter(Boolean));
  const now = new Date().toISOString();
  return importedRows
    .filter((row) => importedIds.has(row.mapped?.employee_id || row.data.employee_id))
    .map((row) => {
      const employeeId = row.mapped?.employee_id || row.data.employee_id;
      const tasks = row.warnings
        .filter((issue) => postImportFieldLabels[issue.field])
        .map((issue) => {
          const readable = readableIssue(issue);
          return {
            key: issue.field,
            label: postImportFieldLabels[issue.field],
            message: readable.message,
            status: "pending" as const,
          };
        });
      return {
        employee_id: employeeId,
        employee_name: row.data.full_name || employeeId,
        rowNumber: row.rowNumber,
        importedAt: now,
        tasks,
      };
    })
    .filter((item) => item.employee_id && item.tasks.length);
}

function mergePostImportTasks(current: EmployeePostImportTask[], incoming: EmployeePostImportTask[]) {
  const byEmployee = new Map(current.map((item) => [item.employee_id, item]));
  for (const item of incoming) {
    const existing = byEmployee.get(item.employee_id);
    if (!existing) {
      byEmployee.set(item.employee_id, item);
      continue;
    }
    const statusByKey = new Map(existing.tasks.map((task) => [task.key, task.status]));
    byEmployee.set(item.employee_id, {
      ...item,
      tasks: item.tasks.map((task) => ({ ...task, status: statusByKey.get(task.key) || task.status })),
    });
  }
  return [...byEmployee.values()].sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

function taskCounts(items: EmployeePostImportTask[]) {
  const all = items.flatMap((item) => item.tasks);
  return {
    pending: all.filter((task) => task.status === "pending").length,
    done: all.filter((task) => task.status === "done").length,
    skipped: all.filter((task) => task.status === "skipped").length,
  };
}

function PostImportTracker({
  items,
  onTaskStatus,
  onClearResolved,
}: {
  items: EmployeePostImportTask[];
  onTaskStatus: (employeeId: string, taskKey: string, status: PostImportTaskStatus) => void;
  onClearResolved: () => void;
}) {
  if (!items.length) return null;
  const counts = taskCounts(items);
  return (
    <div className="card" style={{ padding: 14, borderRadius: 8, borderColor: counts.pending ? "#fca5a5" : "#bbf7d0", background: counts.pending ? "#fff7ed" : "#f0fdf4" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 950, color: counts.pending ? "#9a3412" : "#166534" }}>Post-import completion tracker</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            {counts.pending} pending, {counts.done} done, {counts.skipped} skipped. These warnings are skippable when HR does not have the data yet.
          </div>
        </div>
        <button className="btn btn-secondary" onClick={onClearResolved} disabled={!counts.done && !counts.skipped}>
          Clear resolved
        </button>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((employee) => {
          const pendingCount = employee.tasks.filter((task) => task.status === "pending").length;
          return (
            <div key={employee.employee_id} style={{ padding: 12, borderRadius: 8, background: "#fff", border: `1px solid ${pendingCount ? "#fed7aa" : "#bbf7d0"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                <div>
                  <strong>{employee.employee_id}</strong>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{employee.employee_name}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span className={`pill ${pendingCount ? "pill-yellow" : "pill-green"}`}>{pendingCount ? `${pendingCount} pending` : "Resolved"}</span>
                  <button className="btn btn-sm btn-secondary" onClick={() => window.open(`/employees/${employee.employee_id}`, "_self")}>
                    Open profile
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {employee.tasks.map((task) => (
                  <div key={task.key} style={{ display: "grid", gridTemplateColumns: "minmax(180px, 240px) 1fr auto", gap: 10, alignItems: "center" }}>
                    <div style={{ fontWeight: 850 }}>{task.label}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{task.message}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className={`pill ${task.status === "pending" ? "pill-yellow" : task.status === "done" ? "pill-green" : "pill-steel"}`}>
                        {task.status === "pending" ? "Pending" : task.status === "done" ? "Done" : "Skipped"}
                      </span>
                      {task.status !== "done" && (
                        <button className="btn btn-sm btn-secondary" onClick={() => onTaskStatus(employee.employee_id, task.key, "done")}>Mark done</button>
                      )}
                      {task.status !== "skipped" && (
                        <button className="btn btn-sm btn-ghost" onClick={() => onTaskStatus(employee.employee_id, task.key, "skipped")}>Skip</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EmployeeBulkUpload() {
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { validateFile, revalidateRows, importRows, isValidating, isImporting } = useEmployeeBulkUpload();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [filter, setFilter] = useState<"all" | "errors" | "warnings" | "valid">("all");
  const [editing, setEditing] = useState<BulkPreviewRow | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);
  const [postImportTasks, setPostImportTasks] = useState<EmployeePostImportTask[]>(() => loadStoredTasks());

  const stats = summarize(preview);
  const rows = useMemo(() => {
    const all = preview?.rows || [];
    if (filter === "errors") return all.filter((row) => row.errors.length);
    if (filter === "warnings") return all.filter((row) => !row.errors.length && row.warnings.length);
    if (filter === "valid") return all.filter((row) => !row.errors.length);
    return all;
  }, [preview, filter]);

  const validate = async () => {
    if (!file) {
      showToast("Select an .xlsx file first.", "error");
      return;
    }
    try {
      const next = await validateFile(file);
      setPreview(next);
      setResult(null);
      setFilter(next.error_rows ? "errors" : "all");
      showToast(`Validated ${next.total_rows} row(s).`);
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Failed to validate bulk upload.", "error");
    }
  };

  const revalidate = async (rowsToValidate = preview?.rows || []) => {
    try {
      const next = await revalidateRows(rowsToValidate);
      setPreview(next);
      setFilter(next.error_rows ? "errors" : "all");
      showToast("Rows revalidated.");
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Failed to revalidate rows.", "error");
    }
  };

  const saveEdit = async () => {
    if (!preview || !editing) return;
    const nextRows = preview.rows.map((row) =>
      row.rowNumber === editing.rowNumber ? { ...row, data: { ...row.data, ...draft }, mapped: null } : row,
    );
    setEditing(null);
    setDraft({});
    await revalidate(nextRows);
  };

  const importValid = async () => {
    if (!preview?.valid_rows) {
      showToast("No valid rows to import.", "error");
      return;
    }
    try {
      const validRows = preview.rows.filter((row) => row.errors.length === 0);
      const imported = await importRows(validRows);
      setResult(imported);
      const nextTasks = mergePostImportTasks(postImportTasks, buildPostImportTasks(imported, validRows));
      setPostImportTasks(nextTasks);
      saveStoredTasks(nextTasks);
      showToast(`Imported ${imported.imported_count || 0} employee(s).`);
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || "Failed to import employees.", "error");
    }
  };

  const updateTaskStatus = (employeeId: string, taskKey: string, status: PostImportTaskStatus) => {
    const next = postImportTasks.map((employee) =>
      employee.employee_id === employeeId
        ? { ...employee, tasks: employee.tasks.map((task) => task.key === taskKey ? { ...task, status } : task) }
        : employee,
    );
    setPostImportTasks(next);
    saveStoredTasks(next);
  };

  const clearResolvedTasks = () => {
    const next = postImportTasks
      .map((employee) => ({ ...employee, tasks: employee.tasks.filter((task) => task.status === "pending") }))
      .filter((employee) => employee.tasks.length);
    setPostImportTasks(next);
    saveStoredTasks(next);
  };

  return (
    <div style={{ padding: 24, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <button className="btn btn-secondary" onClick={() => navigate("/employees")}>
            <ArrowLeft size={14} /> Employees
          </button>
          <h1 style={{ margin: "12px 0 4px", fontSize: 26, color: "#111827" }}>Employee Bulk Upload</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Upload, fix, revalidate, then import only clean rows.</p>
        </div>
        <button className="btn btn-secondary" onClick={downloadEmployeeBulkTemplate}>
          <Download size={14} /> Template
        </button>
      </div>

      <div className="card" style={{ padding: 16, borderRadius: 8 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
            <FileSpreadsheet size={14} /> {file ? file.name : "Choose .xlsx"}
            <input type="file" accept=".xlsx" hidden onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setPreview(null);
              setResult(null);
            }} />
          </label>
          <button className="btn btn-primary" onClick={validate} disabled={!file || isValidating}>
            <Upload size={14} /> {isValidating ? "Validating..." : "Validate"}
          </button>
          {preview && (
            <button className="btn btn-secondary" onClick={() => revalidate()} disabled={isValidating}>
              <RefreshCw size={14} /> Revalidate
            </button>
          )}
        </div>
      </div>

      {preview && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
            {[
              ["Total", stats.total_rows, "#e0f2fe", "#0369a1"],
              ["Valid", stats.valid_rows, "#dcfce7", "#166534"],
              ["Errors", stats.error_rows, "#fee2e2", "#991b1b"],
              ["Warnings", stats.warning_rows, "#fef3c7", "#92400e"],
            ].map(([label, value, bg, color]) => (
              <div key={label} className="card" style={{ padding: 14, borderRadius: 8, background: String(bg), color: String(color) }}>
                <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 950 }}>{String(value)}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 14, borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["all", "errors", "warnings", "valid"] as const).map((key) => (
                  <button key={key} className={`btn ${filter === key ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(key)}>
                    {key[0].toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
              <button className="btn btn-primary" disabled={!preview.valid_rows || isImporting} onClick={importValid}>
                <CheckCircle2 size={14} /> {isImporting ? "Importing..." : `Import ${preview.valid_rows} Valid Row(s)`}
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Employee</th>
                    <th>Job</th>
                    <th>Status</th>
                    <th>Issues</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const hasErrors = row.errors.length > 0;
                    const hasWarnings = row.warnings.length > 0;
                    return (
                      <tr key={row.rowNumber}>
                        <td>{row.rowNumber}</td>
                        <td>
                          <strong>{row.data.employee_id || "Missing ID"}</strong>
                          <div style={{ color: "#64748b", fontSize: 12 }}>{row.data.full_name || "Missing name"}</div>
                        </td>
                        <td>
                          <div>{row.data.department || "Missing department"}</div>
                          <div style={{ color: "#64748b", fontSize: 12 }}>{row.data.designation || "Missing designation"}</div>
                        </td>
                        <td>
                          <span className={`pill ${hasErrors ? "pill-red" : hasWarnings ? "pill-yellow" : "pill-green"}`}>
                            {hasErrors ? "Needs fix" : hasWarnings ? "Valid with warnings" : "Ready"}
                          </span>
                        </td>
                        <td style={{ minWidth: 320 }}>
                          {hasErrors ? (
                            <IssueList row={row} type="errors" />
                          ) : hasWarnings ? (
                            <PostImportActions row={row} />
                          ) : (
                            <span style={{ color: "#16a34a", fontWeight: 800 }}>Ready to import</span>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-secondary" onClick={() => {
                            setEditing(row);
                            setDraft({ ...row.data });
                          }}>
                            <Pencil size={13} /> Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {result && (
        <div className="card" style={{ padding: 14, borderRadius: 8, borderColor: "#bbf7d0", background: "#f0fdf4" }}>
          <strong style={{ color: "#166534" }}>Imported {result.imported_count || 0} employee(s).</strong>
          <div style={{ marginTop: 6, color: "#166534", fontSize: 13 }}>Review the post-import completion tracker below before leaving this page.</div>
        </div>
      )}

      <PostImportTracker
        items={postImportTasks}
        onTaskStatus={updateTaskStatus}
        onClearResolved={clearResolvedTasks}
      />

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.38)", zIndex: 2000, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "min(760px, 96vw)", height: "100%", background: "#fff", padding: 18, overflow: "auto", boxShadow: "-16px 0 50px rgba(15,23,42,.24)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: 0 }}>Edit Row {editing.rowNumber}</h2>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Save will revalidate this preview before import.</p>
              </div>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}><XCircle size={14} /> Close</button>
            </div>

            {(editing.errors.length > 0 || editing.warnings.length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div className="card" style={{ padding: 12, borderRadius: 8, background: "#fff7f7" }}>
                  <IssueList row={editing} type="errors" />
                </div>
                <PostImportActions row={editing} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
              {columns.map((field) => (
                <label key={field} style={{ display: "grid", gap: 5, fontSize: 12, fontWeight: 800, color: "#334155" }}>
                  {labelFor(field)}
                  <input
                    className="input"
                    value={draft[field] || ""}
                    onChange={(event) => setDraft((prev) => ({ ...prev, [field]: event.target.value }))}
                  />
                </label>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={isValidating}>
                {isValidating ? "Revalidating..." : "Save And Revalidate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
