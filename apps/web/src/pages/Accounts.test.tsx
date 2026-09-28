import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Accounts from "./Accounts";

const useFilteredAccountsMock = vi.fn();
const updateStatusMutateMock = vi.fn();
const updateTemplateMutateMock = vi.fn();
const showToastMock = vi.fn();

vi.mock("../context/ToastContext", () => ({
  useToastContext: () => ({ showToast: showToastMock }),
}));

vi.mock("../hooks/useConfig", () => ({
  useDepartments: () => ({
    data: [
      { id: "dept-backend", department_name: "Backend" },
      { id: "dept-sales", department_name: "Sales" },
    ],
  }),
  useRoles: () => ({
    data: [
      { id: "role-hr", role_name: "hr_manager" },
      { id: "role-employee", role_name: "employee" },
    ],
  }),
}));

vi.mock("../hooks/useAccounts", () => ({
  useFilteredAccounts: (params: any) => useFilteredAccountsMock(params),
  useUpdateAccountStatus: () => ({
    mutateAsync: updateStatusMutateMock,
    isPending: false,
  }),
  useCredentialTemplate: () => ({
    data: {
      template: "Email: {email}\nPassword: {password}",
    },
  }),
  useUpdateCredentialTemplate: () => ({
    mutateAsync: updateTemplateMutateMock,
    isPending: false,
  }),
}));

describe("Accounts", () => {
  beforeEach(() => {
    showToastMock.mockReset();
    updateStatusMutateMock.mockReset();
    updateStatusMutateMock.mockResolvedValue({});
    updateTemplateMutateMock.mockReset();
    updateTemplateMutateMock.mockResolvedValue({});
    useFilteredAccountsMock.mockReset();
    useFilteredAccountsMock.mockReturnValue({
      data: [
        {
          id: "user-1",
          email: "ifrah.mehmood.emp0034@esspl.com.pk",
          role_name: "employee",
          department_name: "Backend",
          employee_name: "Ifrah Mehmood",
          linked_employee: "Ifrah Mehmood (EMP0034)",
          is_active: true,
          created_at: "2026-06-01T00:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("sends search, department, role, and status filters to the accounts API hook", () => {
    render(<Accounts />);

    fireEvent.change(screen.getByPlaceholderText("Search email, employee, role, or department"), {
      target: { value: "ifrah" },
    });
    fireEvent.change(screen.getByLabelText("Department"), {
      target: { value: "dept-backend" },
    });
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "role-employee" },
    });
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "active" },
    });

    expect(useFilteredAccountsMock).toHaveBeenLastCalledWith({
      search: "ifrah",
      status: "active",
      role_id: "role-employee",
      department_id: "dept-backend",
    });

    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(useFilteredAccountsMock).toHaveBeenLastCalledWith({
      search: "",
      status: "all",
      role_id: "",
      department_id: "",
    });
  });

  it("uses the custom confirmation modal before deactivating an account", async () => {
    render(<Accounts />);

    fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));

    expect(screen.getByText("Deactivate account")).toBeTruthy();
    expect(screen.getByText("This account will be blocked from sign in until reactivated.")).toBeTruthy();

    const deactivateButtons = screen.getAllByRole("button", { name: "Deactivate" });
    fireEvent.click(deactivateButtons[deactivateButtons.length - 1]);

    await waitFor(() => {
      expect(updateStatusMutateMock).toHaveBeenCalledWith({
        accountId: "user-1",
        isActive: false,
      });
    });
    expect(showToastMock).toHaveBeenCalledWith("Account status updated");
  });
});
