import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyProfile from "./MyProfile";
import { apiClient } from "../services/apiClient";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      username: "employee@example.com",
      role: "employee",
    },
  }),
}));

vi.mock("../context/ToastContext", () => ({
  useToastContext: () => ({ showToast: vi.fn() }),
}));

vi.mock("../services/apiClient", () => ({
  apiClient: {
    defaults: { baseURL: "http://localhost:3001/api" },
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

function renderMyProfile() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MyProfile />
    </QueryClientProvider>,
  );
}

describe("MyProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses /dashboard/me to resolve the employee id, then loads the full employee profile", async () => {
    const employeeProfile = {
      id: "090ab08c-3735-4545-9138-551b15362833",
      employee_id: "EMP521",
      name: "Muhammad ZAid Khan",
      profile_photo_url: "/uploads/employees/EMP521/profile/photo.png",
      father_name: "Asif Khan Khaol",
      cnic: "55555-5555555-5",
      date_of_birth: "2011-10-14",
      created_at: "2026-05-21T20:04:00.793Z",
      updated_at: "2026-05-21T20:04:00.793Z",
      department_id: "c8050611-d6fe-4ff6-86fe-3ee56e7f9421",
      designation_id: "4a6977c6-2285-4884-81f0-aea23c7bb647",
      employment_type_id: "d08b1f78-5446-4ea6-8010-65528d7887a2",
      job_status_id: "15b6725d-d0c7-4e06-98c1-b642d9e759f7",
      work_mode_id: "3fad4aba-4669-46a7-a7cc-613494ba3778",
      work_location_id: "82550372-44b4-4eb9-a79d-fadb0415d227",
      shift_id: "5f2f434b-9033-4d4a-b10f-e776e69ceec6",
      date_of_joining: "1990-10-31T19:00:00.000Z",
      date_of_exit: "1980-03-07T19:00:00.000Z",
      probation_end_date: null,
      contract_end_date: null,
      department_name: "IT-Support",
      department_code: "DEPT-IT-SUP",
      designation_title: "QA Engineer",
      employment_type_name: "Full-Time",
      job_status_name: "Probation",
      work_mode_name: "Field",
      work_location_name: "Branch Office - Islamabad",
      shift_name: "Flexible Shift",
      shift_start_time: "10:00:00",
      shift_end_time: "19:00:00",
      late_after_minutes: 30,
      salaryInfo: {
        base_salary: "24.00",
        currency: "PKR",
        effective_from: "1999-01-20T19:00:00.000Z",
        revision_type: "Correction",
        revision_percent: "76.00",
        revision_reason: "Omnis facilis amet ",
      },
      allowances: [
        {
          id: "a672fb31-6419-407e-8c7c-021887213f27",
          employee_id: "EMP521",
          allowance_type_id: "14f9753e-eb51-400a-b56f-11e46665a7c2",
          amount: "12220.00",
          is_percentage: false,
          is_current: true,
          is_active: true,
          created_by: "017d766b-e8a4-430c-963f-d9f64921573f",
          created_at: "2026-05-21T20:04:00.793Z",
          updated_at: "2026-05-21T20:04:00.793Z",
          field_name: "Medical Allowance",
        },
        {
          id: "a672fb31-6419-407e-8c7c-021887213f28",
          employee_id: "EMP521",
          allowance_type_id: "14f9753e-eb51-400a-b56f-11e46665a7c3",
          amount: "3795.00",
          is_percentage: false,
          is_current: true,
          is_active: false,
          created_by: "017d766b-e8a4-430c-963f-d9f64921573f",
          created_at: "2026-05-21T20:04:00.793Z",
          updated_at: "2026-05-21T20:04:00.793Z",
          field_name: "Fuel Allowance",
        },
      ],
      emergencyContacts: {
        contact_1: "47444444444",
        contact_2: "44444444444",
        perment_address: "Sunt neque deleniti ",
        postal_address: "Sunt neque deleniti ",
        e_contact_1_relation: "son",
        e_contact_1_full_name: "Iure pariatur Susci",
        e_contact_1_phone: "03213909914",
        e_contact_1_phone_country_code: "+92",
        e_contact_1_email: "vijanyz@mailinator.com",
        e_contact_2_relation: "brother",
        e_contact_2_full_name: "Dolore vero ipsa mi",
        e_contact_2_phone: "03214655454",
        e_contact_2_phone_country_code: "+92",
        e_contact_2_email: "qutyzol@mailinator.com",
        primary_contact: 2,
      },
      bankInfo: {
        bank_name: "Voluptas laboriosam",
        branch_name: "Tenetur non aut susc",
        branch_code: "Et vitae et non labo",
        iban: "Reprehenderit autem",
        account_title: "Eveniet porro sint ",
        account_number: "44444444444",
        account_type: "salary",
        is_verified: true,
      },
      medicalInfo: {
        blood_group: "O-",
        date_of_birth: null,
        gender: "male",
        height_cm: null,
        weight_kg: null,
        has_disability: false,
        disability_type: null,
        disability_description: null,
        has_chronic_condition: false,
        chronic_condition_notes: "Debitis quia incidid",
        has_known_allergies: false,
        allergy_notes: "Nisi dolore tempora ",
        emergency_medication: "Repellendus Delenit",
        fitness_status: null,
        last_medical_exam_date: null,
        next_medical_exam_date: null,
      },
    };

    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        data: {
          data: {
            employee_id: "EMP123",
            attendance_percentage: 95,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: employeeProfile,
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: "att-1",
              kind: "document",
              document_type: "CNIC",
              original_filename: "cnic.pdf",
              url: "/uploads/employees/EMP123/documents/cnic.pdf",
              size_bytes: 2048,
              created_at: "2026-05-01",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            salaryHistory: [
              {
                id: "sal-1",
                employee_id: "EMP521",
                base_salary: "24.00",
                currency: "PKR",
                effective_from: "1999-01-20T19:00:00.000Z",
                revision_type: "Correction",
                revision_percent: "76.00",
                revision_reason: "Omnis facilis amet",
              },
            ],
            allowancesHistory: [],
          },
        },
      });

    renderMyProfile();

    await waitFor(() => {
      expect(screen.getAllByText("Muhammad ZAid Khan").length).toBeGreaterThan(0);
    });
    expect((screen.getByAltText("Muhammad ZAid Khan profile") as HTMLImageElement).src).toBe(
      "http://localhost:3001/uploads/employees/EMP521/profile/photo.png",
    );
    expect(screen.getAllByText("IT-Support").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Medical Allowance").length).toBeGreaterThan(0);
    expect(screen.getByText("Current Allowances")).toBeTruthy();
    expect(screen.getByText("Deactive Allowances")).toBeTruthy();
    expect(screen.getByText("Fuel Allowance")).toBeTruthy();
    expect(screen.getByText("Deactive")).toBeTruthy();
    expect(screen.getByText("12,220 PKR")).toBeTruthy();
    expect(screen.getByText("Current")).toBeTruthy();
    expect(screen.getByText("Verified")).toBeTruthy();
    expect(screen.getByText("Salary History")).toBeTruthy();
    expect(screen.getAllByText("Correction").length).toBeGreaterThan(0);
    expect(screen.getByText("31 Oct 1990")).toBeTruthy();
    expect(screen.getByText("Voluptas laboriosam")).toBeTruthy();
    expect(screen.getByText("Repellendus Delenit")).toBeTruthy();
    expect(screen.getByText("Employee Documents")).toBeTruthy();
    expect(screen.getByText("cnic.pdf")).toBeTruthy();
    expect(screen.queryByText("false")).toBeNull();
    expect(screen.queryByText("Is Percentage")).toBeNull();
    expect(screen.queryByText("Is Current")).toBeNull();
    expect(screen.queryByText("Is Active")).toBeNull();
    expect(screen.queryByText("Is Verified")).toBeNull();
    expect(screen.queryByText("null")).toBeNull();
    expect(screen.queryByText("Probation End Date")).toBeNull();
    expect(screen.queryByText("Contract End Date")).toBeNull();
    expect(screen.queryByText("c8050611-d6fe-4ff6-86fe-3ee56e7f9421")).toBeNull();
    expect(screen.queryByText("4a6977c6-2285-4884-81f0-aea23c7bb647")).toBeNull();
    expect(screen.queryByText("090ab08c-3735-4545-9138-551b15362833")).toBeNull();
    expect(screen.queryByText("Created At")).toBeNull();
    expect(screen.queryByText("Updated At")).toBeNull();
    expect(screen.queryByText("Edit Profile")).toBeNull();
    expect(screen.queryByText("Payment Mode")).toBeNull();
    expect(apiClient.get).toHaveBeenCalledWith("/dashboard/me");
    expect(apiClient.get).toHaveBeenCalledWith("/employees/EMP123");
    expect(apiClient.get).toHaveBeenCalledWith("/employees/EMP123/attachments");
    expect(apiClient.get).toHaveBeenCalledWith("/employees/EMP123/finance");
  });
});
