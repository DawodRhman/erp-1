import React, { useMemo } from "react";

type TargetAudienceChipsProps = {
  departments: any[];
  designations: any[];
  selectedDepartmentIds: string[];
  selectedDesignationIds: string[];
  onDepartmentsChange: (ids: string[]) => void;
  onDesignationsChange: (ids: string[]) => void;
};

export function getDepartmentName(row: any) {
  return row.department_name || row.name || row.title || row.label || "Unnamed department";
}

export function getDesignationName(row: any) {
  return row.title || row.designation_name || row.name || row.label || "Unnamed designation";
}

function getDesignationDepartmentId(row: any) {
  return row.department_id || row.departmentId || row.department?.id || row.department?.department_id || "";
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    border: active ? "1px solid #2563eb" : "1px solid var(--br2)",
    background: active ? "#eff6ff" : "var(--card)",
    color: active ? "#1d4ed8" : "var(--t2)",
    borderRadius: 999,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  };
}

export default function TargetAudienceChips({
  departments,
  designations,
  selectedDepartmentIds,
  selectedDesignationIds,
  onDepartmentsChange,
  onDesignationsChange,
}: TargetAudienceChipsProps) {
  const selectedDepartmentSet = useMemo(() => new Set(selectedDepartmentIds), [selectedDepartmentIds]);
  const visibleDesignations = useMemo(
    () => designations.filter((designation) => selectedDepartmentSet.has(getDesignationDepartmentId(designation))),
    [designations, selectedDepartmentSet],
  );

  const changeDepartments = (nextDepartmentIds: string[]) => {
    const nextDepartmentSet = new Set(nextDepartmentIds);
    const nextDesignationIds = selectedDesignationIds.filter((designationId) => {
      const designation = designations.find((item) => item.id === designationId);
      return designation && nextDepartmentSet.has(getDesignationDepartmentId(designation));
    });
    onDepartmentsChange(nextDepartmentIds);
    if (nextDesignationIds.length !== selectedDesignationIds.length) {
      onDesignationsChange(nextDesignationIds);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="form-group" style={{ margin: 0 }}>
        <div className="form-label">Visible Departments</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {departments.map((department: any) => {
            const id = String(department.id);
            const active = selectedDepartmentIds.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                style={chipStyle(active)}
                onClick={() => changeDepartments(toggleValue(selectedDepartmentIds, id))}
              >
                {getDepartmentName(department)}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--t3)" }}>
          No department chips selected means all departments.
        </div>
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <div className="form-label">Visible Designations</div>
        {selectedDepartmentIds.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--t3)" }}>Select departments first to choose designations.</div>
        ) : visibleDesignations.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--t3)" }}>No designations are configured under the selected departments.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {visibleDesignations.map((designation: any) => {
              const id = String(designation.id);
              const active = selectedDesignationIds.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  style={chipStyle(active)}
                  onClick={() => onDesignationsChange(toggleValue(selectedDesignationIds, id))}
                >
                  {getDesignationName(designation)}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--t3)" }}>
          No designation chips selected means everyone in the selected departments.
        </div>
      </div>
    </div>
  );
}
