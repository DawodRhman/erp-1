export type SettingsFieldType = "text" | "number" | "time" | "select" | "textarea";

export type SettingsField = {
  key: string;
  label: string;
  type?: SettingsFieldType;
  required?: boolean;
  source?: "departments" | "leaveTypes";
  optionLabel?: string;
  includeBlank?: boolean;
  options?: Array<{ label: string; value: string }>;
  parse?: "int" | "float";
};

export type SettingsDefinition = {
  slug: string;
  entity: string;
  title: string;
  description: string;
  group: string;
  columns: Array<{ key: string; label: string; type?: "status" | "money" }>;
  fields: SettingsField[];
  nameKeys: string[];
};

export const settingsDefinitions: SettingsDefinition[] = [
  {
    slug: "departments",
    entity: "departments",
    title: "Departments",
    description: "Manage the organization structure used across employees, leave, and reporting.",
    group: "Organization Structure",
    nameKeys: ["department_name", "department_code"],
    columns: [
      { key: "department_code", label: "Code" },
      { key: "department_name", label: "Department" },
      { key: "parent_department_id", label: "Parent" },
      { key: "is_active", label: "Status", type: "status" },
    ],
    fields: [
      { key: "department_code", label: "Department Code", required: true },
      { key: "department_name", label: "Department Name", required: true },
      { key: "parent_department_id", label: "Parent Department", type: "select", source: "departments", includeBlank: true },
      { key: "is_active", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
    ],
  },
  {
    slug: "designations",
    entity: "designations",
    title: "Designations",
    description: "Attach every designation to its parent department for guided employee setup.",
    group: "Organization Structure",
    nameKeys: ["title"],
    columns: [
      { key: "title", label: "Designation" },
      { key: "department_id", label: "Department" },
      { key: "is_active", label: "Status", type: "status" },
    ],
    fields: [
      { key: "title", label: "Designation Title", required: true },
      { key: "department_id", label: "Department", type: "select", source: "departments", required: true },
      { key: "is_active", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
    ],
  },
  {
    slug: "employment-types",
    entity: "employment-types",
    title: "Employment Types",
    description: "Define full-time, contract, internship, and other employee engagement types.",
    group: "Employment Parameters",
    nameKeys: ["type_name"],
    columns: [
      { key: "type_name", label: "Employment Type" },
      { key: "is_active", label: "Status", type: "status" },
    ],
    fields: [
      { key: "type_name", label: "Employment Type", required: true },
      { key: "is_active", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
    ],
  },
  {
    slug: "job-statuses",
    entity: "job-statuses",
    title: "Job Statuses",
    description: "Control employee lifecycle statuses such as active, probation, resigned, and terminated.",
    group: "Employment Parameters",
    nameKeys: ["status_name"],
    columns: [
      { key: "status_name", label: "Job Status" },
      { key: "is_active", label: "Status", type: "status" },
    ],
    fields: [
      { key: "status_name", label: "Job Status", required: true },
      { key: "is_active", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
    ],
  },
  {
    slug: "work-modes",
    entity: "work-modes",
    title: "Work Modes",
    description: "Define onsite, hybrid, remote, and field working modes.",
    group: "Employment Parameters",
    nameKeys: ["mode_name"],
    columns: [
      { key: "mode_name", label: "Work Mode" },
      { key: "is_active", label: "Status", type: "status" },
    ],
    fields: [
      { key: "mode_name", label: "Work Mode", required: true },
      { key: "is_active", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
    ],
  },
  {
    slug: "work-locations",
    entity: "work-locations",
    title: "Work Locations",
    description: "Maintain head office, branch, warehouse, and client site locations.",
    group: "Employment Parameters",
    nameKeys: ["location_name"],
    columns: [
      { key: "location_name", label: "Work Location" },
      { key: "is_active", label: "Status", type: "status" },
    ],
    fields: [
      { key: "location_name", label: "Work Location", required: true },
      { key: "is_active", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
    ],
  },
  {
    slug: "shifts",
    entity: "shifts",
    title: "Shifts",
    description: "Configure shift timing and late arrival thresholds used by attendance.",
    group: "Employment Parameters",
    nameKeys: ["name"],
    columns: [
      { key: "name", label: "Shift" },
      { key: "start_time", label: "Start" },
      { key: "end_time", label: "End" },
      { key: "late_after_minutes", label: "Late After" },
      { key: "is_active", label: "Status", type: "status" },
    ],
    fields: [
      { key: "name", label: "Shift Name", required: true },
      { key: "start_time", label: "Start Time", type: "time", required: true },
      { key: "end_time", label: "End Time", type: "time", required: true },
      { key: "late_after_minutes", label: "Late After Minutes", type: "number", parse: "int", required: true },
      { key: "is_active", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
    ],
  },
  {
    slug: "leave-types",
    entity: "leave-types",
    title: "Leave Types",
    description: "Define annual, sick, casual, and other leave categories.",
    group: "Leave Management",
    nameKeys: ["name"],
    columns: [
      { key: "name", label: "Leave Type" },
      { key: "is_active", label: "Status", type: "status" },
    ],
    fields: [
      { key: "name", label: "Leave Type", required: true },
      { key: "is_active", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
    ],
  },
  {
    slug: "leave-policies",
    entity: "leave-policies",
    title: "Leave Policies",
    description: "Set yearly company-wide allowances and optional department-specific overrides.",
    group: "Leave Management",
    nameKeys: ["department_id", "leave_type_id"],
    columns: [
      { key: "department_id", label: "Department" },
      { key: "leave_type_id", label: "Leave Type" },
      { key: "days_allowed", label: "Days" },
      { key: "year", label: "Year" },
      { key: "is_active", label: "Status", type: "status" },
    ],
    fields: [
      { key: "department_id", label: "Department", type: "select", source: "departments", required: false, includeBlank: true },
      { key: "leave_type_id", label: "Leave Type", type: "select", source: "leaveTypes", required: true },
      { key: "days_allowed", label: "Days Allowed", type: "number", parse: "int", required: true },
      { key: "year", label: "Year", type: "number", parse: "int", required: true },
      { key: "is_active", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
    ],
  },
  {
    slug: "leave-capacity",
    entity: "leave-capacity",
    title: "Leave Capacity",
    description: "Limit simultaneous leaves by department using percentage caps.",
    group: "Leave Management",
    nameKeys: ["department_id"],
    columns: [
      { key: "department_id", label: "Department" },
      { key: "max_percent", label: "Max Percent" },
      { key: "is_active", label: "Status", type: "status" },
    ],
    fields: [
      { key: "department_id", label: "Department", type: "select", source: "departments", required: true },
      { key: "max_percent", label: "Max Percent", type: "number", parse: "int", required: true },
      { key: "is_active", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
    ],
  },
  {
    slug: "allowance-types",
    entity: "allowance-types",
    title: "Allowance Types",
    description: "Manage salary allowance labels used in employee compensation setup.",
    group: "Finance & Compliance",
    nameKeys: ["field_name"],
    columns: [
      { key: "field_name", label: "Allowance Type" },
      { key: "is_active", label: "Status", type: "status" },
    ],
    fields: [
      { key: "field_name", label: "Allowance Type", required: true },
      { key: "is_active", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
    ],
  },
  {
    slug: "penalty-rules",
    entity: "penalty-rules",
    title: "Penalty Rules",
    description: "Configure flat or percentage penalty rules used by the penalty workflow.",
    group: "Finance & Compliance",
    nameKeys: ["name"],
    columns: [
      { key: "name", label: "Rule" },
      { key: "amount_pkr", label: "Amount", type: "money" },
      { key: "type", label: "Type" },
      { key: "is_active", label: "Status", type: "status" },
    ],
    fields: [
      { key: "name", label: "Rule Name", required: true },
      { key: "amount_pkr", label: "Amount PKR", type: "number", parse: "float", required: true },
      { key: "type", label: "Type", type: "select", options: [{ label: "Flat", value: "flat" }, { label: "Percentage", value: "percentage" }], required: true },
      { key: "is_active", label: "Status", type: "select", options: [{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }] },
    ],
  },
  {
    slug: "roles",
    entity: "roles",
    title: "System Roles",
    description: "Create roles and optionally attach them to departments. Permission mapping still belongs to backend seeds for now.",
    group: "Access Control",
    nameKeys: ["role_name"],
    columns: [
      { key: "role_name", label: "Role" },
      { key: "department_id", label: "Department" },
      { key: "description", label: "Description" },
    ],
    fields: [
      { key: "role_name", label: "Role Name", required: true },
      { key: "department_id", label: "Department", type: "select", source: "departments", includeBlank: true },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
];

export const unsupportedSettingsSlugs = [
  "reporting-managers",
  "payroll-components",
  "tax-config",
  "global-days",
  "custom-fields",
];

export const settingsNavigationGroups = Array.from(
  settingsDefinitions.reduce((groups, definition) => {
    const links = groups.get(definition.group) || [];
    links.push({ to: `/settings/${definition.slug}`, label: definition.title });
    groups.set(definition.group, links);
    return groups;
  }, new Map<string, Array<{ to: string; label: string }>>()),
).map(([label, links]) => ({ label, links }));

settingsNavigationGroups.push({
  label: "Workspace Management",
  links: [
    { to: "/settings/directory", label: "Directory Management" },
    { to: "/settings/calendar-events", label: "Calendar Events" },
    { to: "/announcements/manage", label: "Announcements" },
  ],
});

export function getSettingsDefinition(slug: string) {
  return settingsDefinitions.find((definition) => definition.slug === slug);
}
