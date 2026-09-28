import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Attendance from "./Attendance";
import { apiClient } from "../services/apiClient";
import { useAuthStore } from "../store/useAuthStore";

vi.mock("../context/ToastContext", () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
}));

vi.mock("../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("../hooks/useConfig", () => ({
  useDepartments: () => ({
    data: [
      {
        id: "department-1",
        department_code: "ENG",
        department_name: "Engineering",
      },
      {
        id: "department-2",
        department_code: "HR",
        department_name: "Human Resources",
      },
    ],
    isLoading: false,
    isError: false,
  }),
  useShifts: () => ({
    data: [
      {
        id: "shift-1",
        name: "Morning Shift",
        start_time: "09:00:00",
        end_time: "18:00:00",
      },
      {
        id: "shift-2",
        name: "Evening Shift",
        start_time: "14:00:00",
        end_time: "22:00:00",
      },
    ],
    isLoading: false,
    isError: false,
  }),
  useWorkLocations: () => ({
    data: [
      { id: "location-1", name: "Head Office Karachi" },
      { id: "location-2", location_name: "Lahore Branch" },
    ],
    isLoading: false,
    isError: false,
  }),
}));

function renderAttendance() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Attendance />
    </QueryClientProvider>,
  );
}

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const TODAY = todayKey();

const sheetResponse = {
  success: true,
  data: {
    date: TODAY,
    location_id: "location-1",
    rows: [
      {
        attendance_id: "attendance-1",
        employee_id: "EMP001",
        name: "Ayesha Khan",
        designation: "Software Engineer",
        department: "Engineering",
        department_id: "department-1",
        shift: {
          id: "shift-1",
          name: "Morning Shift",
          expected_in: "09:00:00",
          expected_out: "18:00:00",
          late_after_minutes: 15,
        },
        date: TODAY,
        check_in: "09:10:00",
        check_out: "18:00:00",
        status: "present",
        notes: null,
        ack: false,
        state: "saved",
        late_by_minutes: 10,
      },
      {
        attendance_id: "attendance-2",
        employee_id: "EMP002",
        name: "Bilal Khan",
        designation: "HR Executive",
        department_name: "Human Resources",
        department_id: "department-2",
        shift: {
          id: "shift-2",
          name: "Evening Shift",
          expected_in: "14:00:00",
          expected_out: "22:00:00",
          late_after_minutes: 15,
        },
        date: TODAY,
        check_in: null,
        check_out: null,
        status: "absent",
        notes: null,
        ack: false,
        state: "draft",
        late_by_minutes: 0,
      },
    ],
  },
};

describe("Attendance", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        email: "hr@example.com",
        role: "hr_manager",
        role_name: "hr_manager",
        work_location_id: "location-1",
      },
      permissions: ["attendance:read", "attendance:write", "attendance:submit_ho"],
      isAuthenticated: true,
      activeRole: "hr_manager",
    });
    vi.mocked(apiClient.get).mockImplementation((url: string) => {
      if (url === "/attendance/report") {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url === "/attendance/corrections") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "correction-1",
                attendance_id: "attendance-1",
                employee_id: "EMP001",
                employee_name: "Ayesha Khan",
                date: TODAY,
                requested_check_in: "09:00:00",
                requested_check_out: null,
                reason: "Biometric device was delayed",
                status: "submitted",
              },
            ],
          },
        });
      }
      if (url === "/dashboard/me") {
        return Promise.resolve({
          data: { success: true, data: { employee_id: "EMP-HR" } },
        });
      }
      if (url === "/employees/EMP-HR") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              employee_id: "EMP-HR",
              work_location_id: "location-1",
              work_location_name: "Head Office Karachi",
            },
          },
        });
      }
      return Promise.resolve({ data: sheetResponse });
    });
    vi.mocked(apiClient.put).mockResolvedValue({
      data: { success: true, data: { saved_count: 1, date: TODAY, state: "saved" } },
    });
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { success: true, data: { submitted_count: 1, date: TODAY, state: "submitted" } },
    });
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { success: true, data: { id: "attendance-1", ack: true } },
    });
  });

  it("loads the real attendance sheet endpoint and renders backend rows", async () => {
    renderAttendance();

    expect(screen.getByRole("button", { name: /generate daily sheet/i })).toBeTruthy();
    expect(screen.queryByLabelText(/date/i)).toBeNull();
    expect(screen.queryByRole("combobox", { name: /work location/i })).toBeNull();
    expect(screen.getByText(/locked to head office karachi/i)).toBeTruthy();
    expect(screen.queryByText(/GET \/attendance/i)).toBeNull();
    expect(screen.queryByText(/Report uses \/attendance\/report/i)).toBeNull();

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/attendance", {
        params: { date: TODAY, location_id: "location-1" },
      });
    });

    let attendanceTable = screen.getByRole("table");
    await waitFor(() => {
      expect(within(attendanceTable).getByText("Ayesha Khan")).toBeTruthy();
    });
    expect(within(attendanceTable).getByText("Software Engineer")).toBeTruthy();
    expect(screen.queryByText("Ahmed Raza")).toBeNull();
  });

  it("filters attendance rows by search, department, and shift", async () => {
    renderAttendance();

    let attendanceTable = screen.getByRole("table");
    await waitFor(() => {
      expect(within(attendanceTable).getByText("Ayesha Khan")).toBeTruthy();
    });
    expect(within(attendanceTable).getByText("Bilal Khan")).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/search attendance/i), {
      target: { value: "bilal" },
    });
    attendanceTable = screen.getByRole("table");
    expect(within(attendanceTable).queryByText("Ayesha Khan")).toBeNull();
    expect(within(attendanceTable).getByText("Bilal Khan")).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/search attendance/i), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText(/department/i), {
      target: { value: "department-1" },
    });
    attendanceTable = screen.getByRole("table");
    expect(within(attendanceTable).getByText("Ayesha Khan")).toBeTruthy();
    expect(within(attendanceTable).queryByText("Bilal Khan")).toBeNull();

    fireEvent.change(screen.getByLabelText(/department/i), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText(/shift/i), {
      target: { value: "shift-2" },
    });
    attendanceTable = screen.getByRole("table");
    expect(within(attendanceTable).queryByText("Ayesha Khan")).toBeNull();
    expect(within(attendanceTable).getByText("Bilal Khan")).toBeTruthy();
  });

  it("saves, submits, and requests unlock through the active backend routes", async () => {
    renderAttendance();

    const attendanceTable = screen.getByRole("table");
    await waitFor(() => {
      expect(within(attendanceTable).getByText("Ayesha Khan")).toBeTruthy();
    });

    expect(screen.getByText(/locked to head office karachi/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/status for emp001/i), {
      target: { value: "late" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save sheet/i }));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith("/attendance/save", {
        date: TODAY,
        location_id: "location-1",
        rows: expect.arrayContaining([
          expect.objectContaining({
            employee_id: "EMP001",
            shift_id: "shift-1",
            status: "late",
          }),
        ]),
      });
    });

    fireEvent.click(screen.getByRole("button", { name: /submit to ho/i }));
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/attendance/submit", {
        date: TODAY,
        location_id: "location-1",
      });
    });

    fireEvent.change(screen.getByLabelText(/unlock reason/i), {
      target: { value: "Correction needed" },
    });
    fireEvent.click(screen.getByRole("button", { name: /request unlock/i }));
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/attendance/unlock-request", {
        date: TODAY,
        location_id: "location-1",
        reason: "Correction needed",
      });
    });
  });

  it("lets HR review submitted attendance correction requests", async () => {
    renderAttendance();

    const attendanceTable = screen.getByRole("table");
    await waitFor(() => {
      expect(within(attendanceTable).getByText("Ayesha Khan")).toBeTruthy();
    });
    expect(await screen.findByText(/correction requests/i)).toBeTruthy();
    expect(screen.getByText(/biometric device was delayed/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /approve correction/i }));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith(
        "/attendance/corrections/correction-1/review",
        {
          decision: "approved",
          review_note: null,
        },
      );
    });
  });

  it("lets super admin choose any readable location before generating", async () => {
    useAuthStore.setState({
      user: {
        email: "superadmin@example.com",
        role: "super_admin",
        role_name: "super_admin",
      },
      permissions: [],
      isAuthenticated: true,
      activeRole: "super_admin",
    });

    renderAttendance();

    expect(screen.queryByLabelText(/date/i)).toBeNull();
    const locationSelect = screen.getByLabelText(/work location/i);
    await waitFor(() => {
      expect((locationSelect as HTMLSelectElement).disabled).toBe(false);
    });
    fireEvent.change(locationSelect, { target: { value: "location-2" } });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/attendance", {
        params: { date: TODAY, location_id: "location-2" },
      });
    });
  });

  it("keeps employee attendance self-service scoped and only acknowledges own row", async () => {
    useAuthStore.setState({
      user: {
        email: "employee@example.com",
        role: "employee",
        role_name: "employee",
        employee_id: "EMP001",
      },
      permissions: ["attendance:read"],
      isAuthenticated: true,
      activeRole: "employee",
    });

    renderAttendance();

    expect(screen.queryByLabelText(/date/i)).toBeNull();
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/attendance", {
        params: { date: TODAY },
      });
    });

    const attendanceTable = screen.getByRole("table");
    await waitFor(() => {
      expect(within(attendanceTable).getByText("Ayesha Khan")).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: /save sheet/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /submit to ho/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /acknowledge attendance/i }));
    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith("/attendance/attendance-1/ack");
    });
  });

  it("resolves an HR user's assigned location from their employee profile", async () => {
    useAuthStore.setState({
      user: {
        email: "hr@example.com",
        role: "hr_executive",
        role_name: "hr_executive",
      },
      permissions: ["attendance:read", "attendance:write"],
      isAuthenticated: true,
      activeRole: "hr_executive",
    });

    renderAttendance();

    expect(screen.queryByRole("combobox", { name: /work location/i })).toBeNull();
    expect(await screen.findByText(/locked to head office karachi/i)).toBeTruthy();
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/dashboard/me");
      expect(apiClient.get).toHaveBeenCalledWith("/employees/EMP-HR");
      expect(apiClient.get).toHaveBeenCalledWith("/attendance", {
        params: { date: TODAY, location_id: "location-1" },
      });
    });
  });
});
