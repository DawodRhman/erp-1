import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EmployeeDetail from "./EmployeeDetail";

const useAttendanceReportMock = vi.hoisted(() => vi.fn());
const useLeaveBalancesMock = vi.hoisted(() => vi.fn());
const usePenaltiesMock = vi.hoisted(() => vi.fn());
const useEmployeeAttachmentsMock = vi.hoisted(() => vi.fn());
const useEmployeeFinanceMock = vi.hoisted(() => vi.fn());
const useEmployeeActionsMock = vi.hoisted(() => vi.fn());
const resendCredentialsMock = vi.hoisted(() => vi.fn());
const createAccountMock = vi.hoisted(() => vi.fn());
const addSalaryRevisionMock = vi.hoisted(() => vi.fn());
const addCareerMovementMock = vi.hoisted(() => vi.fn());
const updateAllowancesMock = vi.hoisted(() => vi.fn());
const employeeMock = vi.hoisted(() => vi.fn());
let activeRole = "hr_executive";
let canMock = (permission: string) => permission !== "delete_employee";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <svg>{children}</svg>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { role: activeRole, employeeId: "EMP017" },
    activeRole,
  }),
}));

vi.mock("../context/ToastContext", () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
}));

vi.mock("../hooks/useRbac", () => ({
  useRbac: () => ({ can: canMock }),
}));

vi.mock("../hooks/useEmployees", () => ({
  useEmployee: () => ({
    data: employeeMock(),
    isLoading: false,
    resendCredentials: resendCredentialsMock,
    isResendingCredentials: false,
    createAccount: createAccountMock,
    isCreatingAccount: false,
    addSalaryRevision: addSalaryRevisionMock,
    isAddingSalaryRevision: false,
    addCareerMovement: addCareerMovementMock,
    isAddingCareerMovement: false,
  }),
  useEmployeeFinance: (employeeId: string) => useEmployeeFinanceMock(employeeId),
  useEmployeeActions: (employeeId: string) => useEmployeeActionsMock(employeeId),
  useEmployees: () => ({ update: vi.fn() }),
}));

vi.mock("../hooks/useAttendance", () => ({
  useAttendanceReport: (params: any) => useAttendanceReportMock(params),
}));

vi.mock("../hooks/useLeaves", () => ({
  useLeaves: () => ({
    data: [
      {
        id: "LR1",
        leave_type: "Annual Leave",
        start_date: "2026-05-01",
        end_date: "2026-05-02",
        total_days: 2,
        reason: "Family work",
        status: "approved",
      },
    ],
    isLoading: false,
  }),
  useLeaveBalances: (params: any) => useLeaveBalancesMock(params),
}));

vi.mock("../hooks/usePenalties", () => ({
  usePenalties: (params: any) => usePenaltiesMock(params),
}));

vi.mock("../hooks/useEmployeeAttachments", () => ({
  useEmployeeAttachments: (employeeId: string) => useEmployeeAttachmentsMock(employeeId),
}));

vi.mock("../hooks/useConfig", () => ({
  usePenaltyRules: () => ({ data: [{ id: "rule-1", name: "Late Arrival", amount_pkr: 1000, is_active: true }] }),
  useAllowanceTypes: () => ({
    data: [
      { id: "allowance-meal", field_name: "Meal Allowance" },
      { id: "allowance-fuel", field_name: "Fuel Allowance" },
    ],
  }),
  useRoles: () => ({
    data: [
      { id: "role-employee", role_name: "employee" },
      { id: "role-hr", role_name: "hr_executive" },
    ],
  }),
  useDepartments: () => ({
    data: [
      { id: "department-admin", department_name: "Administration" },
      { id: "department-it", department_name: "IT" },
    ],
  }),
  useDesignations: () => ({
    data: [
      { id: "designation-admin", title: "Admin Officer" },
      { id: "designation-engineer", title: "Engineer" },
    ],
  }),
  useWorkLocations: () => ({
    data: [
      { id: "location-ho", name: "Head Office" },
      { id: "location-lahore", location_name: "Lahore Office" },
    ],
  }),
}));

function renderEmployeeDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/employees/EMP001"]}>
        <Routes>
          <Route path="/employees/:id" element={<EmployeeDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EmployeeDetail", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    activeRole = "hr_executive";
    canMock = (permission: string) => permission !== "delete_employee";
    employeeMock.mockReturnValue({
      employee_id: "EMP001",
      name: "Adeel Rahman",
      father_name: "Khalid Rahman",
      cnic: "35202-1111111-1",
      date_of_birth: "1990-01-10",
      department_name: "Administration",
      designation_title: "Admin Officer",
      job_status_name: "Active",
      employment_type_name: "Full-Time",
      work_mode_name: "On-site",
      work_location_name: "Head Office",
      shift_name: "Morning",
      date_of_joining: "2020-02-01",
      accountInfo: { email: "adeel.rahman@esspl.com.pk", phone: "03001234567" },
      emergencyContacts: {
        e_contact_1_full_name: "Sara Rahman",
        perment_address: "Lahore",
      },
      bankInfo: { bank_name: "HBL", account_number: "12345", is_verified: true },
      medicalInfo: { blood_group: "O+", allergy_notes: "" },
      salaryInfo: { base_salary: "125000", currency: "PKR" },
    });
    useAttendanceReportMock.mockReturnValue({
      data: [{ employee_id: "EMP001", presents: 20, absents: 1, lates: 2 }],
      isLoading: false,
    });
    useLeaveBalancesMock.mockReturnValue({
      data: [{ name: "Annual Leave", balance: 12, used: 2, remaining: 10 }],
      isLoading: false,
    });
    usePenaltiesMock.mockReturnValue({
      data: [{ id: "PN1", rule_name: "Late Arrival", amount_pkr: 1000, date: "2026-05-03", status: "approved" }],
      isLoading: false,
      isError: false,
      propose: vi.fn(),
    });
    useEmployeeAttachmentsMock.mockReturnValue({
      data: [{ id: "att-1", document_type: "CNIC", original_filename: "cnic.pdf", size_bytes: 2048, created_at: "2026-05-01", url: "/uploads/employees/EMP001/documents/cnic.pdf" }],
      isLoading: false,
      upload: vi.fn(),
      isUploading: false,
    });
    useEmployeeFinanceMock.mockReturnValue({
      data: {
        salaryHistory: [
          {
            id: "sal-1",
            employee_id: "EMP001",
            base_salary: "125000",
            currency: "PKR",
            effective_from: "2026-01-01",
            revision_type: "Initial",
            revision_percent: null,
            revision_reason: null,
            created_at: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "sal-2",
            employee_id: "EMP001",
            base_salary: "140000",
            currency: "PKR",
            effective_from: "2026-06-01",
            revision_type: "Increment",
            revision_percent: "12.00",
            revision_reason: "Annual review",
            created_at: "2026-06-01T00:00:00.000Z",
          },
        ],
        allowancesHistory: [
          {
            id: "allow-1",
            employee_id: "EMP001",
            allowance_type_id: "allowance-meal",
            field_name: "Meal Allowance",
            amount: "5000",
            is_percentage: false,
            is_current: true,
            created_at: "2026-06-01T00:00:00.000Z",
          },
        ],
      },
      isLoading: false,
    });
    useEmployeeActionsMock.mockReturnValue({
      updateAllowances: updateAllowancesMock,
      isUpdatingSection: false,
    });
    createAccountMock.mockResolvedValue({ tempPassword: "Temp#1234", whatsappPhone: "03001234567" });
    addSalaryRevisionMock.mockResolvedValue({});
    addCareerMovementMock.mockResolvedValue({});
    updateAllowancesMock.mockResolvedValue({});
  });

  it("shows the MyProfile-style tabs and uses Not provided instead of N/A", () => {
    renderEmployeeDetail();

    expect(screen.getAllByText("Adeel Rahman").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Administration").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not provided").length).toBeGreaterThan(0);
    expect(screen.queryByText("N/A")).toBeNull();
    expect(screen.getByRole("button", { name: "Personal & Contact" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Job & Employment" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Compensation" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bank & Medical" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Documents" })).toBeTruthy();
  });

  it("uses the uploaded profile photo and opens a larger preview when clicked", () => {
    useEmployeeAttachmentsMock.mockReturnValue({
      data: [
        {
          id: "photo-1",
          kind: "profile_photo",
          document_type: "Profile Photo",
          original_filename: "profile.png",
          mime_type: "image/png",
          size_bytes: 4096,
          created_at: "2026-05-03",
          url: "/uploads/employees/EMP001/profile/profile.png",
        },
      ],
      isLoading: false,
      upload: vi.fn(),
      isUploading: false,
    });

    renderEmployeeDetail();

    const image = screen.getByAltText("Adeel Rahman profile") as HTMLImageElement;
    expect(image.src).toBe("http://localhost:3001/uploads/employees/EMP001/profile/profile.png");
    expect(screen.queryByText("AR")).toBeNull();
    fireEvent.click(image);
    expect(screen.getAllByAltText("Adeel Rahman profile").length).toBeGreaterThan(1);
  });

  it("falls back to initials when the uploaded profile photo cannot load", () => {
    useEmployeeAttachmentsMock.mockReturnValue({
      data: [
        {
          id: "photo-1",
          kind: "profile_photo",
          document_type: "Profile Photo",
          original_filename: "profile.png",
          mime_type: "image/png",
          size_bytes: 4096,
          created_at: "2026-05-03",
          url: "/uploads/employees/EMP001/profile/missing.png",
        },
      ],
      isLoading: false,
      upload: vi.fn(),
      isUploading: false,
    });

    renderEmployeeDetail();

    fireEvent.error(screen.getByAltText("Adeel Rahman profile"));
    expect(screen.getByText("AR")).toBeTruthy();
  });

  it("loads employee attendance in six-month windows", () => {
    renderEmployeeDetail();
    fireEvent.click(screen.getByRole("button", { name: "Attendance (Last 6 Months)" }));
    expect(screen.getAllByText("Attendance (Last 6 Months)").length).toBeGreaterThan(0);
    expect(screen.getByText("Previous 6 months")).toBeTruthy();
    expect(useAttendanceReportMock).toHaveBeenCalled();
  });

  it("shows real leave balances, leave requests, and penalties by employee id", () => {
    renderEmployeeDetail();

    expect(useLeaveBalancesMock).toHaveBeenCalledWith(expect.objectContaining({ employee_id: "EMP001" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave Requests" }));
    expect(screen.getAllByText("Annual Leave").length).toBeGreaterThan(0);
    expect(screen.getByText("10 remaining")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Penalties" }));
    expect(usePenaltiesMock).toHaveBeenCalledWith({ employee_id: "EMP001" });
    expect(screen.getByText("Late Arrival")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Documents" }));
    expect(useEmployeeAttachmentsMock).toHaveBeenCalledWith("EMP001");
    expect(screen.getByText("cnic.pdf")).toBeTruthy();
  });

  it("lets HR complete post-import account, salary, and attachment actions from the management area", async () => {
    employeeMock.mockReturnValue({
      employee_id: "EMP001",
      name: "Adeel Rahman",
      father_name: "Khalid Rahman",
      cnic: "35202-1111111-1",
      date_of_birth: "1990-01-10",
      department_name: "Administration",
      designation_title: "Admin Officer",
      job_status_name: "Active",
      employment_type_name: "Full-Time",
      work_mode_name: "On-site",
      work_location_name: "Head Office",
      shift_name: "Morning",
      date_of_joining: "2020-02-01",
      employeeContact: { primary_phone: "03001234567" },
      emergencyContacts: {
        e_contact_1_full_name: "Sara Rahman",
        perment_address: "Lahore",
      },
      bankInfo: { bank_name: "HBL", account_number: "12345", is_verified: true },
      medicalInfo: { blood_group: "O+", allergy_notes: "" },
      salaryInfo: { base_salary: "125000", currency: "PKR" },
    });
    renderEmployeeDetail();
    fireEvent.click(screen.getByRole("button", { name: "Management" }));

    fireEvent.change(screen.getByLabelText("Account Email"), {
      target: { value: "bulk.employee@esspl.com.pk" },
    });
    fireEvent.change(screen.getByLabelText("Account Role"), {
      target: { value: "role-employee" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create login account" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(createAccountMock).toHaveBeenCalledWith({
        employeeId: "EMP001",
        email: "bulk.employee@esspl.com.pk",
        role_id: "role-employee",
      });
    });
    const whatsappLink = await screen.findByRole("link", { name: "Send credentials via WhatsApp" });
    const whatsappHref = whatsappLink.getAttribute("href") || "";
    expect(whatsappHref).toContain("https://wa.me/923001234567");
    expect(decodeURIComponent(whatsappHref)).toContain("Employee ID: EMP001");
    expect(decodeURIComponent(whatsappHref)).toContain("Email: bulk.employee@esspl.com.pk");
    expect(decodeURIComponent(whatsappHref)).toContain("Password: Temp#1234");

    fireEvent.change(screen.getByLabelText("Base Salary"), {
      target: { value: "140000" },
    });
    fireEvent.change(screen.getByLabelText("Effective From"), {
      target: { value: "2026-06-01" },
    });
    fireEvent.change(screen.getByLabelText("Revision Type"), {
      target: { value: "Increment" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add salary history" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(addSalaryRevisionMock).toHaveBeenCalledWith({
        employeeId: "EMP001",
        payload: expect.objectContaining({
          base_salary: 140000,
          currency: "PKR",
          effective_from: "2026-06-01",
          revision_type: "Increment",
        }),
      });
    });

    expect(screen.getByText("Upload profile photo/documents")).toBeTruthy();
    expect(screen.getByText("Upload File")).toBeTruthy();
  });

  it("hides account creation fields when the employee already has a login account", () => {
    renderEmployeeDetail();
    fireEvent.click(screen.getByRole("button", { name: "Management" }));

    expect(screen.queryByLabelText("Account Email")).toBeNull();
    expect(screen.queryByLabelText("Account Role")).toBeNull();
    expect(screen.queryByRole("button", { name: "Create login account" })).toBeNull();
    expect(screen.getAllByText("adeel.rahman@esspl.com.pk").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Resend Credentials" })).toBeTruthy();
  });

  it("uses backend salary revision options and hides percentage fields for Initial", () => {
    employeeMock.mockReturnValue({
      employee_id: "EMP001",
      name: "Adeel Rahman",
      department_name: "Administration",
      designation_title: "Admin Officer",
      job_status_name: "Active",
      employeeContact: { primary_phone: "03001234567" },
      salaryInfo: { base_salary: "125000", currency: "PKR" },
    });

    renderEmployeeDetail();
    fireEvent.click(screen.getByRole("button", { name: "Management" }));

    const revisionType = screen.getByLabelText("Revision Type") as HTMLSelectElement;
    expect(revisionType.value).toBe("");
    const revisionOptions = Array.from(revisionType.options).map((option) => option.textContent);
    expect(revisionOptions).toContain("Select option");
    ["Initial", "Promotion", "Demotion", "Increment", "Decrement", "Correction", "Market Adjustment"].forEach((option) => {
      expect(revisionOptions).toContain(option);
    });
    expect(screen.queryByLabelText("Revision Percent")).toBeNull();
    expect(screen.queryByLabelText("Revision Reason")).toBeNull();

    fireEvent.change(revisionType, { target: { value: "Initial" } });
    expect(screen.queryByLabelText("Revision Percent")).toBeNull();
    expect(screen.queryByLabelText("Revision Reason")).toBeNull();

    fireEvent.change(revisionType, { target: { value: "Promotion" } });
    expect(screen.getByLabelText("Revision Percent")).toBeTruthy();
    expect(screen.getByLabelText("Revision Reason")).toBeTruthy();
  });

  it("creates a career movement with job and salary changes from the management tab", async () => {
    renderEmployeeDetail();
    fireEvent.click(screen.getByRole("button", { name: "Management" }));

    fireEvent.change(screen.getByLabelText("Movement Type"), {
      target: { value: "Promotion" },
    });
    fireEvent.change(screen.getByLabelText("Effective Date"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(screen.getByLabelText("New Department"), {
      target: { value: "department-it" },
    });
    fireEvent.change(screen.getByLabelText("New Designation"), {
      target: { value: "designation-engineer" },
    });
    fireEvent.change(screen.getByLabelText("New Work Location"), {
      target: { value: "location-lahore" },
    });
    fireEvent.change(screen.getByLabelText("New Salary"), {
      target: { value: "155000" },
    });
    fireEvent.change(screen.getByLabelText("Salary Percent"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Promoted to engineering lead" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save career movement" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(addCareerMovementMock).toHaveBeenCalledWith({
        employeeId: "EMP001",
        payload: {
          movement_type: "Promotion",
          effective_date: "2026-07-01",
          department_id: "department-it",
          designation_id: "designation-engineer",
          work_location_id: "location-lahore",
          reason: "Promoted to engineering lead",
          salaryInfo: {
            base_salary: 155000,
            currency: "PKR",
            effective_from: "2026-07-01",
            revision_type: "Promotion",
            revision_percent: 10,
            revision_reason: "Promoted to engineering lead",
          },
        },
      });
    });
  });

  it("shows salary history in the compensation section", () => {
    employeeMock.mockReturnValue({
      employee_id: "EMP001",
      name: "Adeel Rahman",
      department_name: "Administration",
      designation_title: "Admin Officer",
      job_status_name: "Active",
      employeeContact: { primary_phone: "03001234567" },
      salaryInfo: { base_salary: "125000", currency: "PKR" },
      allowances: [
        {
          id: "allow-current",
          field_name: "Medical Allowance",
          amount: "5571",
          is_percentage: false,
          is_current: true,
          is_active: true,
        },
        {
          id: "allow-deactive",
          field_name: "Fuel Allowance",
          amount: "3795",
          is_percentage: false,
          is_current: true,
          is_active: false,
        },
      ],
    });
    renderEmployeeDetail();
    fireEvent.click(screen.getByRole("button", { name: "Compensation" }));

    expect(screen.getByText("Salary & Allowance")).toBeTruthy();
    expect(screen.getByText("Current Allowances")).toBeTruthy();
    expect(screen.getByText("Deactive Allowances")).toBeTruthy();
    expect(screen.getByText("Medical Allowance")).toBeTruthy();
    expect(screen.getAllByText("Fuel Allowance").length).toBeGreaterThan(0);
    expect(screen.getByText("Deactive")).toBeTruthy();
    expect(screen.getByText("Salary History")).toBeTruthy();
    expect(screen.getByText("Allowance History")).toBeTruthy();
    expect(screen.getAllByText("Meal Allowance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("01 Jun 2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Increment").length).toBeGreaterThan(0);
  });

  it("saves allowance edits from the management tab and keeps the history log separate", async () => {
    renderEmployeeDetail();
    fireEvent.click(screen.getByRole("button", { name: "Management" }));
    fireEvent.click(screen.getByRole("button", { name: "Add allowance row" }));

    fireEvent.change(screen.getByLabelText("Allowance Type"), {
      target: { value: "allowance-fuel" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "2500" },
    });
    fireEvent.click(screen.getByLabelText("Percentage"));
    fireEvent.click(screen.getByLabelText("Active"));
    fireEvent.click(screen.getByRole("button", { name: "Save allowances" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(updateAllowancesMock).toHaveBeenCalledWith({
        allowances: [{ allowance_type_id: "allowance-fuel", amount: 2500, is_percentage: true, is_active: false }],
      });
    });
  });

  it("keeps department heads read-only for account, salary, allowance, and attachment writes", () => {
    activeRole = "department_head";
    canMock = (permission: string) =>
      ["view_all_employees", "view_employee_attachments", "access_dashboard", "access_attendance", "access_leave", "access_penalties"].includes(permission);

    renderEmployeeDetail();
    fireEvent.click(screen.getByRole("button", { name: "Management" }));

    expect(screen.queryByLabelText("Account Email")).toBeNull();
    expect(screen.queryByLabelText("Account Role")).toBeNull();
    expect(screen.queryByRole("button", { name: "Create login account" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Resend Credentials" })).toBeNull();
    expect(screen.queryByLabelText("Base Salary")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add salary history" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add allowance row" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save allowances" })).toBeNull();
    expect(screen.queryByText("Upload File")).toBeNull();
  });
});
