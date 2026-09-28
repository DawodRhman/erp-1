import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ComingSoonOverlay from "./ComingSoonOverlay";

describe("ComingSoonOverlay", () => {
  it("renders coming soon message", () => {
    render(
      <div style={{ position: "relative", height: 200 }}>
        <ComingSoonOverlay />
      </div>,
    );
    expect(screen.getByTestId("coming-soon-overlay")).toBeTruthy();
    expect(screen.getByText(/Coming Soon/i)).toBeTruthy();
  });
});
