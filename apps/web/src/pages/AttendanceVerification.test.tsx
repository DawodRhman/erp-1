import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AttendanceVerification from "./AttendanceVerification";

vi.mock("./Attendance", () => ({
  default: () => <div>Real attendance verification workflow</div>,
}));

describe("AttendanceVerification", () => {
  it("uses the real attendance workflow instead of local acknowledgement state", () => {
    render(<AttendanceVerification />);

    expect(screen.getByText("Real attendance verification workflow")).toBeTruthy();
    expect(screen.queryByText("Employee Verification & Attendance Acknowledge")).toBeNull();
  });
});
