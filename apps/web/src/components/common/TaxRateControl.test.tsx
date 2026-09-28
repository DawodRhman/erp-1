import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TaxRateControl from "./TaxRateControl";

describe("TaxRateControl", () => {
  it("offers standard presets and accepts a custom decimal GST rate", () => {
    const onChange = vi.fn();
    render(<TaxRateControl value={18} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "10%" }));
    expect(onChange).toHaveBeenCalledWith(10);

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "15.25" } });
    expect(onChange).toHaveBeenCalledWith(15.25);
  });

  it("allows zero GST in compact invoice rows", () => {
    const onChange = vi.fn();
    render(<TaxRateControl compact value={18} onChange={onChange} label="Row GST" />);

    fireEvent.change(screen.getByLabelText("Row GST"), { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith(0);
  });
});
