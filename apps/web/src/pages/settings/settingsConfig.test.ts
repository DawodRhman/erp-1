import { describe, expect, it } from "vitest";
import {
  settingsDefinitions,
  settingsNavigationGroups,
  unsupportedSettingsSlugs,
} from "./settingsConfig";

describe("settings configuration registry", () => {
  it("only exposes backend-supported system configuration pages", () => {
    const exposedSlugs = settingsDefinitions.map((definition) => definition.slug);

    expect(exposedSlugs).toEqual([
      "departments",
      "designations",
      "employment-types",
      "job-statuses",
      "work-modes",
      "work-locations",
      "shifts",
      "leave-types",
      "leave-policies",
      "leave-capacity",
      "allowance-types",
      "penalty-rules",
      "roles",
    ]);

    for (const unsupportedSlug of unsupportedSettingsSlugs) {
      expect(exposedSlugs).not.toContain(unsupportedSlug);
    }
  });

  it("keeps sidebar navigation grouped in product-friendly sections", () => {
    expect(settingsNavigationGroups.map((group) => group.label)).toEqual([
      "Organization Structure",
      "Employment Parameters",
      "Leave Management",
      "Finance & Compliance",
      "Access Control",
      "Workspace Management",
    ]);

    expect(settingsNavigationGroups.flatMap((group) => group.links)).toContainEqual({
      to: "/settings/allowance-types",
      label: "Allowance Types",
    });
    expect(settingsNavigationGroups.flatMap((group) => group.links)).toContainEqual({
      to: "/settings/penalty-rules",
      label: "Penalty Rules",
    });
    expect(settingsNavigationGroups.flatMap((group) => group.links)).toContainEqual({
      to: "/settings/directory",
      label: "Directory Management",
    });
    expect(settingsNavigationGroups.flatMap((group) => group.links)).toContainEqual({
      to: "/settings/calendar-events",
      label: "Calendar Events",
    });
    expect(settingsNavigationGroups.flatMap((group) => group.links)).toContainEqual({
      to: "/announcements/manage",
      label: "Announcements",
    });
    expect(settingsNavigationGroups.flatMap((group) => group.links)).not.toContainEqual({
      to: "/settings/announcements",
      label: "Announcements",
    });
  });

  it("supports company-wide leave policies without a department selection", () => {
    const policy = settingsDefinitions.find((definition) => definition.slug === "leave-policies");
    const departmentField = policy?.fields.find((field) => field.key === "department_id");

    expect(departmentField).toMatchObject({
      required: false,
      includeBlank: true,
    });
  });
});
