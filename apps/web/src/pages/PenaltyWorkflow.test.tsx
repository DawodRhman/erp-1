import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PenaltyWorkflow from "./PenaltyWorkflow";

const approveMock = vi.fn();
const rejectMock = vi.fn();
const acknowledgeMock = vi.fn();
const showToastMock = vi.fn();

const usePenaltiesMock = vi.fn();

vi.mock("../hooks/usePenalties", () => ({
  usePenalties: (params: any) => {
    usePenaltiesMock(params);
    return {
    data: [
      {
        id: "penalty-1",
        employee_id: "EMP001",
        employee_name: "Ayesha Khan",
        amount_pkr: "2500.00",
        rule_name: "Late Arrival",
        reason: "Checked in after grace period",
        date: "2026-05-24",
        status: "pending",
      },
      {
        id: "penalty-2",
        employee_id: "EMP002",
        employee_name: "Bilal Khan",
        amount_pkr: 1500,
        rule_name: "Missing attendance acknowledgement",
        reason: "Did not acknowledge locked attendance",
        date: "2026-05-23",
        status: "approved",
        employee_ack: false,
      },
    ],
    isLoading: false,
    isError: false,
    approve: approveMock,
    reject: rejectMock,
    acknowledge: acknowledgeMock,
    };
  },
}));

vi.mock("../context/ToastContext", () => ({
  useToastContext: () => ({ showToast: showToastMock }),
}));

describe("PenaltyWorkflow", () => {
  beforeEach(() => {
    approveMock.mockResolvedValue({});
    rejectMock.mockResolvedValue({});
    acknowledgeMock.mockResolvedValue({});
    showToastMock.mockClear();
    usePenaltiesMock.mockClear();
  });

  it("approves a pending penalty once with the current penalty amount", async () => {
    render(<PenaltyWorkflow />);

    expect(usePenaltiesMock).toHaveBeenCalledWith({ status: "pending" });

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith("Penalty approved");
    });
    expect(approveMock).toHaveBeenCalledTimes(1);
    expect(approveMock).toHaveBeenCalledWith({
      id: "penalty-1",
    });
  });

  it("renders backend penalty fields and sends reject reviewNote", async () => {
    render(<PenaltyWorkflow />);

    expect(screen.getByText("Ayesha Khan")).toBeTruthy();
    expect(screen.getByText("Late Arrival")).toBeTruthy();
    expect(screen.getByText("Checked in after grace period")).toBeTruthy();
    expect(screen.getByText("PKR 2,500")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /mark acknowledged/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    fireEvent.change(screen.getByPlaceholderText(/explain why/i), {
      target: { value: "Evidence does not support this deduction." },
    });
    fireEvent.click(screen.getByRole("button", { name: /reject penalty/i }));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith("Penalty rejected");
    });
    expect(rejectMock).toHaveBeenCalledWith({
      id: "penalty-1",
      reviewNote: "Evidence does not support this deduction.",
    });
  });
});
