import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SearchableSelect from "./SearchableSelect";

describe("SearchableSelect", () => {
  it("shows all options on focus, filters while typing, and returns the selected id", () => {
    const onChange = vi.fn();
    render(
      <SearchableSelect
        value=""
        onChange={onChange}
        placeholder="Search clients"
        options={[
          { value: "1", label: "Alpha Bank", searchText: "alpha@example.com" },
          { value: "2", label: "Beta Foods", searchText: "beta@example.com" },
          { value: "3", label: "Crescent Labs", searchText: "crescent@example.com" },
        ]}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    expect(screen.getAllByRole("option")).toHaveLength(3);

    fireEvent.change(input, { target: { value: "Cres" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: "Crescent Labs" })).toBeTruthy();

    fireEvent.click(screen.getByRole("option", { name: "Crescent Labs" }));
    expect(onChange).toHaveBeenCalledWith("3");
  });
});
