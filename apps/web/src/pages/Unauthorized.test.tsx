import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Unauthorized from "./Unauthorized";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(() => authState),
}));

let authState = {
  loading: false,
  user: {
    username: "new.employee@example.com",
    role: "employee",
    mustChangePassword: true,
  },
};

describe("Unauthorized", () => {
  beforeEach(() => {
    authState = {
      loading: false,
      user: {
        username: "new.employee@example.com",
        role: "employee",
        mustChangePassword: true,
      },
    };
  });

  it("redirects first-login users to change password instead of showing 403", () => {
    render(
      <MemoryRouter initialEntries={["/unauthorized"]}>
        <Routes>
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/change-password" element={<div>Change password form</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Change password form")).toBeTruthy();
  });

  it("does not render 403 while auth state is still loading", () => {
    authState = { loading: true, user: null as any };

    render(
      <MemoryRouter initialEntries={["/unauthorized"]}>
        <Routes>
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText("403")).toBeNull();
    expect(screen.getByText("Loading...")).toBeTruthy();
  });
});
