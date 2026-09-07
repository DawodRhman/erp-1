import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Topbar from "./Topbar";

const navigateMock = vi.hoisted(() => vi.fn());
const useEmployeesMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      username: "rabia.aslam.emp017@esspl.com.pk",
      email: "rabia.aslam.emp017@esspl.com.pk",
      role: "hr_executive",
    },
    logout: vi.fn(),
  }),
}));

vi.mock("../../hooks/useEmployees", () => ({
  useEmployees: (params: any) => useEmployeesMock(params),
}));

vi.mock("../../hooks/useLeaves", () => ({
  useLeaves: () => ({ data: [] }),
}));

function renderTopbar(path = "/dashboard") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Topbar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Topbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEmployeesMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });

  it("shows the hr_executive role as HR Executive, not Employee", () => {
    renderTopbar();

    expect(screen.getByText("HR Executive")).toBeTruthy();
    expect(screen.queryByText(/^Employee$/)).toBeNull();
  });

  it("searches employees through the backend query and opens a selected employee profile", async () => {
    useEmployeesMock.mockImplementation((params: any) => ({
      data:
        params?.search === "Adeel"
          ? [
              {
                id: "EMP001",
                name: "Adeel Rahman",
                department: "Administration",
                designation: "Admin Officer",
              },
            ]
          : [],
      isLoading: false,
      isError: false,
    }));

    renderTopbar();
    fireEvent.change(screen.getByPlaceholderText(/Search employees/i), {
      target: { value: "Adeel" },
    });

    await waitFor(() => {
      expect(useEmployeesMock).toHaveBeenCalledWith({ search: "Adeel", page: 1, limit: 8 });
    });
    fireEvent.click(screen.getByText("Adeel Rahman"));

    expect(navigateMock).toHaveBeenCalledWith("/employees/EMP001");
  });

  it("hides the employee search inside service portals", () => {
    renderTopbar("/crm/quotations");

    expect(screen.queryByPlaceholderText(/Search employees/i)).toBeNull();
  });
});
