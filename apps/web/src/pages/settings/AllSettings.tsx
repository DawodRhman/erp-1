import React, { useMemo, useRef, useState } from "react";
import { CheckCircle2, Pencil, Plus, Power } from "lucide-react";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useToastContext } from "../../context/ToastContext";
import {
  createConfigHook,
  usePenaltyRules,
} from "../../hooks/useConfig";
import {
  getSettingsDefinition,
  settingsDefinitions,
  SettingsDefinition,
  SettingsField,
} from "./settingsConfig";

type ConfigHookResult = {
  data: any[];
  isLoading: boolean;
  isError: boolean;
  create: (payload: any) => Promise<any>;
  update: (payload: { id: string; updates: any }) => Promise<any>;
};

const genericConfigHooks = Object.fromEntries(
  settingsDefinitions.map((definition) => [
    definition.entity,
    createConfigHook<any>(definition.entity, { includeInactive: true }),
  ]),
) as Record<string, () => ConfigHookResult>;

function useSettingsPenaltyRules() {
  return usePenaltyRules({ includeInactive: true });
}

const configHooks = {
  ...genericConfigHooks,
  "penalty-rules": useSettingsPenaltyRules,
} as Record<string, () => ConfigHookResult>;

const useSettingsDepartments = createConfigHook<any>("departments", { includeInactive: true });
const useSettingsLeaveTypes = createConfigHook<any>("leave-types", { includeInactive: true });

function displayName(row: any, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value) return String(value);
  }
  return row?.id ? "Configured item" : "-";
}

function toLookup(rows: any[], nameKeys: string[]) {
  return new Map(
    rows.map((row) => [
      String(row.id),
      displayName(row, nameKeys),
    ]),
  );
}

function normalizeFormValue(field: SettingsField, value: string) {
  if (field.key === "is_active") return value !== "false";
  if (field.includeBlank && value === "") return null;
  if (field.parse === "int") return Number.parseInt(value || "0", 10);
  if (field.parse === "float") return Number.parseFloat(value || "0");
  return value;
}

function formatCell(definition: SettingsDefinition, key: string, value: any, lookups: {
  departments: Map<string, string>;
  leaveTypes: Map<string, string>;
}) {
  const column = definition.columns.find((item) => item.key === key);
  if (column?.type === "status") {
    return (
      <span className={`pill ${value !== false ? "pill-green" : "pill-red"}`}>
        {value !== false ? "Active" : "Inactive"}
      </span>
    );
  }
  if (column?.type === "money") {
    return `PKR ${Number(value || 0).toLocaleString()}`;
  }
  if (key === "department_id" || key === "parent_department_id") {
    if (!value && key === "department_id" && definition.entity === "leave-policies") {
      return "Company-wide";
    }
    return value ? lookups.departments.get(String(value)) || "Unknown department" : "None";
  }
  if (key === "leave_type_id") {
    return value ? lookups.leaveTypes.get(String(value)) || "Unknown leave type" : "None";
  }
  if (key === "late_after_minutes") return `${value ?? 0} min`;
  if (key === "max_percent") return `${value ?? 0}%`;
  return value || "-";
}

function fieldOptions(field: SettingsField, lookups: {
  departments: any[];
  leaveTypes: any[];
}) {
  if (field.options) return field.options;
  const sourceRows =
    field.source === "departments"
      ? lookups.departments
      : field.source === "leaveTypes"
        ? lookups.leaveTypes
        : [];
  return sourceRows.map((row) => ({
    label:
      field.source === "departments"
        ? displayName(row, ["department_name", "department_code"])
        : displayName(row, ["name"]),
    value: row.id,
  }));
}

function ConfigEntityPage({ definition }: { definition: SettingsDefinition }) {
  const { showToast } = useToastContext();
  const useEntity = configHooks[definition.entity];
  const { data = [], isLoading, isError, create, update } = useEntity();
  const { data: departments = [] } = useSettingsDepartments();
  const { data: leaveTypes = [] } = useSettingsLeaveTypes();
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [statusRow, setStatusRow] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const lookupMaps = useMemo(
    () => ({
      departments: toLookup(departments, ["department_name", "department_code"]),
      leaveTypes: toLookup(leaveTypes, ["name"]),
    }),
    [departments, leaveTypes],
  );

  const displayRows = useMemo(
    () => [...data].sort((left, right) => {
      const leftStatus = left?.is_active === false ? 1 : 0;
      const rightStatus = right?.is_active === false ? 1 : 0;
      if (leftStatus !== rightStatus) return leftStatus - rightStatus;
      return displayName(left, definition.nameKeys).localeCompare(displayName(right, definition.nameKeys));
    }),
    [data, definition.nameKeys],
  );

  const openAdd = () => {
    const initial: Record<string, string> = {};
    for (const field of definition.fields) {
      if (field.key === "is_active") initial[field.key] = "true";
      else initial[field.key] = "";
    }
    setForm(initial);
    setFieldErrors({});
    setEditRow(null);
    setModalMode("add");
  };

  const openEdit = (row: any) => {
    const initial: Record<string, string> = {};
    for (const field of definition.fields) {
      const value = row?.[field.key];
      if (field.key === "is_active") initial[field.key] = value === false ? "false" : "true";
      else initial[field.key] = value == null ? "" : String(value);
    }
    setForm(initial);
    setFieldErrors({});
    setEditRow(row);
    setModalMode("edit");
  };

  const buildPayload = () => {
    const payload: Record<string, any> = {};
    const errors: Record<string, string> = {};
    for (const field of definition.fields) {
      if (!Object.prototype.hasOwnProperty.call(form, field.key)) continue;
      const value = form[field.key];
      if (field.required && value === "") {
        errors[field.key] = `${field.label} is mandatory.`;
        continue;
      }
      if (!field.required && value === "" && !field.includeBlank && field.key !== "is_active") {
        continue;
      }
      payload[field.key] = normalizeFormValue(field, value);
    }
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      const firstKey = Object.keys(errors)[0];
      window.setTimeout(() => fieldRefs.current[firstKey]?.focus(), 0);
      throw new Error("Please complete the highlighted mandatory fields.");
    }
    return payload;
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = buildPayload();
      if (modalMode === "edit" && editRow) {
        await update({ id: editRow.id, updates: payload });
        showToast(`${definition.title} updated`);
      } else {
        await create(payload);
        showToast(`${definition.title} added`);
      }
      setModalMode(null);
      setEditRow(null);
    } catch (error: any) {
      showToast(error?.message || "Unable to save setting", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmStatusToggle = async () => {
    if (!statusRow) return;
    const row = statusRow;
    const nextActive = row.is_active === false;
    try {
      await update({ id: row.id, updates: { is_active: nextActive } });
      showToast(`${displayName(row, definition.nameKeys)} ${nextActive ? "activated" : "deactivated"}`);
    } catch {
      showToast("Unable to update status", "error");
    } finally {
      setStatusRow(null);
    }
  };

  const dependencyRows = { departments, leaveTypes };

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">{definition.title}</div>
          <div className="pg-sub">{definition.description}</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={13} /> Add
        </button>
      </div>

      {definition.slug === "roles" && (
        <div className="card" style={{ marginBottom: 12, border: "1px solid #bfdbfe", background: "#eff6ff" }}>
          <div style={{ fontSize: 12, color: "#1d4ed8", lineHeight: 1.5 }}>
            Roles can be created here. Permission mapping is not exposed by the backend yet, so permissions still come from seeds/migrations.
          </div>
        </div>
      )}

      <div className="card">
        {isLoading ? (
          <div style={{ padding: 36, textAlign: "center", color: "var(--t3)" }}>Loading settings...</div>
        ) : isError ? (
          <div style={{ padding: 36, textAlign: "center", color: "#dc2626" }}>Unable to load this configuration.</div>
        ) : displayRows.length === 0 ? (
          <div style={{ padding: 36, textAlign: "center", color: "var(--t3)" }}>No records configured yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                {definition.columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, index) => (
                <tr key={row.id || index}>
                  {definition.columns.map((column) => (
                    <td key={column.key}>
                      {formatCell(definition, column.key, row[column.key], lookupMaps)}
                    </td>
                  ))}
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="ico-btn" style={{ width: 28, height: 28 }} onClick={() => openEdit(row)}>
                        <Pencil size={13} />
                      </button>
                      {"is_active" in row && (
                        <button
                          className="ico-btn"
                          aria-label={`${row.is_active === false ? "Activate" : "Deactivate"} ${displayName(row, definition.nameKeys)}`}
                          title={row.is_active === false ? "Activate" : "Deactivate"}
                          style={{
                            width: 32,
                            height: 28,
                            color: row.is_active === false ? "#16a34a" : "#dc2626",
                            background: row.is_active === false ? "#dcfce7" : "#fee2e2",
                          }}
                          onClick={() => setStatusRow(row)}
                        >
                          {row.is_active === false ? <CheckCircle2 size={14} /> : <Power size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={`${modalMode === "edit" ? "Edit" : "Add"} ${definition.title.replace(/s$/, "")}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalMode(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          </>
        }
      >
        {definition.fields.filter((field) => field.key !== "is_active").map((field) => {
          const options = fieldOptions(field, dependencyRows);
          return (
            <div className="form-group" key={field.key}>
              <label className="form-label">
                {field.label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
              </label>
              {field.type === "select" ? (
                <select
                  className="input select-input"
                  ref={(node) => {
                    fieldRefs.current[field.key] = node;
                  }}
                  aria-invalid={Boolean(fieldErrors[field.key])}
                  value={form[field.key] ?? ""}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, [field.key]: event.target.value }));
                    setFieldErrors((prev) => ({ ...prev, [field.key]: "" }));
                  }}
                >
                  {(field.includeBlank || !field.required || field.required) && (
                    <option value="" style={field.required ? { display: "none" } : undefined}>
                      {definition.entity === "leave-policies" && field.key === "department_id"
                        ? "Company-wide (all departments)"
                        : field.required
                          ? `Select ${field.label.toLowerCase()}`
                          : "None"}
                    </option>
                  )}
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  className="input"
                  ref={(node) => {
                    fieldRefs.current[field.key] = node;
                  }}
                  aria-invalid={Boolean(fieldErrors[field.key])}
                  style={{ minHeight: 76, paddingTop: 10 }}
                  value={form[field.key] ?? ""}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, [field.key]: event.target.value }));
                    setFieldErrors((prev) => ({ ...prev, [field.key]: "" }));
                  }}
                />
              ) : (
                <input
                  className="input"
                  ref={(node) => {
                    fieldRefs.current[field.key] = node;
                  }}
                  aria-invalid={Boolean(fieldErrors[field.key])}
                  type={field.type || "text"}
                  value={form[field.key] ?? ""}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, [field.key]: event.target.value }));
                    setFieldErrors((prev) => ({ ...prev, [field.key]: "" }));
                  }}
                />
              )}
              {fieldErrors[field.key] && (
                <div style={{ marginTop: 5, fontSize: 11, color: "#dc2626", fontWeight: 700 }}>
                  {fieldErrors[field.key]}
                </div>
              )}
            </div>
          );
        })}
      </Modal>

      <ConfirmDialog
        open={statusRow !== null}
        title={statusRow?.is_active === false ? "Activate Record" : "Deactivate Record"}
        message={
          statusRow
            ? `You are ${statusRow.is_active === false ? "activating" : "deactivating"} ${displayName(statusRow, definition.nameKeys)}. Are you sure?`
            : ""
        }
        onConfirm={confirmStatusToggle}
        onCancel={() => setStatusRow(null)}
      />
    </div>
  );
}

function makeSettingsPage(slug: string) {
  return function SettingsEntityRoute() {
    const definition = getSettingsDefinition(slug);
    if (!definition) return null;
    return <ConfigEntityPage definition={definition} />;
  };
}

export const DepartmentsPage = makeSettingsPage("departments");
export const DesignationsPage = makeSettingsPage("designations");
export const EmploymentTypesPage = makeSettingsPage("employment-types");
export const JobStatusesPage = makeSettingsPage("job-statuses");
export const WorkModesPage = makeSettingsPage("work-modes");
export const WorkLocationsPage = makeSettingsPage("work-locations");
export const ShiftsPage = makeSettingsPage("shifts");
export const LeaveTypesPage = makeSettingsPage("leave-types");
export const LeavePoliciesPage = makeSettingsPage("leave-policies");
export const LeaveCapacitySettingsPage = makeSettingsPage("leave-capacity");
export const AllowanceTypesPage = makeSettingsPage("allowance-types");
export const PenaltyRulesPage = makeSettingsPage("penalty-rules");
export const RolesPage = makeSettingsPage("roles");
