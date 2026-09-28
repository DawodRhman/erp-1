import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HeadOfficeHR from "./HeadOfficeHR";

vi.mock("./Attendance", () => ({
  default: () => <div>Real head office attendance workflow</div>,
}));

describe("HeadOfficeHR", () => {
  it("uses the real attendance workflow instead of local prototype locks", () => {
    render(<HeadOfficeHR />);

    expect(screen.getByText("Real head office attendance workflow")).toBeTruthy();
    expect(screen.queryByText("Approve for Final Report")).toBeNull();
  });
});
