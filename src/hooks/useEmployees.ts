import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";

function normalizeEmployee(raw: any) {
  if (!raw || typeof raw !== "object") return raw;
  return {
    ...raw,
    id: raw.id ?? raw.employee_id ?? raw.emp_id ?? raw.code,
    name: raw.name ?? raw.full_name ?? raw.employee_name,
    department:
      raw.department ?? raw.department_name ?? raw.department?.name ?? raw.dept,
    designation:
      raw.designation ??
      raw.designation_name ??
      raw.designation_title ??
      raw.designation?.name ??
      raw.title,
    employmentType:
      raw.employmentType ??
      raw.employment_type ??
      raw.employment_type_name ??
      raw.employment_type?.name,
    jobStatus:
      raw.jobStatus ?? raw.job_status ?? raw.job_status?.name ?? raw.status,
    workMode:
      raw.workMode ??
      raw.work_mode ??
      raw.work_mode_name ??
      raw.work_mode?.name,
    workLocation:
      raw.workLocation ??
      raw.work_location ??
      raw.work_location_name ??
      raw.work_location?.name,
    reportingManager:
      raw.reportingManager ??
      raw.reporting_manager ??
      raw.manager_emp_id ??
      raw.manager?.name,
    shift: raw.shift ?? raw.shift_name ?? raw.shift_label ?? raw.shift?.name,
    dateOfJoining:
      raw.dateOfJoining ??
      raw.date_of_joining ??
      raw.joined_at ??
      raw.joining_date,
    dateOfExit:
      raw.dateOfExit ?? raw.date_of_exit ?? raw.exit_date ?? raw.term_date,
    email:
      raw.email ??
      raw.accountInfo?.email ??
      raw.empEmail ??
      raw.personalInfo?.email,
    profilePhotoUrl:
      raw.profilePhotoUrl ??
      raw.profile_photo_url ??
      raw.profilePhoto ??
      raw.profile_photo ??
      raw.photo_url,
  };
}

export function useEmployees(params?: any, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["employees", params],
    queryFn: async () => {
      const cleanParams = params
        ? Object.fromEntries(
            Object.entries(params).filter(
              ([, value]) =>
                value !== undefined && value !== null && value !== "",
            ),
          )
        : undefined;
      const { data } = await apiClient.get("/employees", {
        params: cleanParams,
      });
      // Depending on backend, it might return { data: { employees: [], total: x, page: y } }
      // The instructions say "Implement pagination and search/filter parameters" so we can assume it takes query params.
      return data;
    },
    enabled: options?.enabled ?? true,
  });

  const payload = query.data;
  const dataNode = payload?.data ?? payload;
  const list =
    dataNode?.employees ?? dataNode?.items ?? dataNode?.data ?? dataNode ?? [];
  const employees = Array.isArray(list) ? list.map(normalizeEmployee) : [];
  const rawPagination =
    payload?.pagination ??
    dataNode?.pagination ??
    dataNode?.meta ??
    payload?.meta;
  const pagination = rawPagination
    ? {
        ...rawPagination,
        totalPages:
          rawPagination.totalPages ??
          rawPagination.pages ??
          rawPagination.total_pages ??
          rawPagination.last_page,
        total: rawPagination.total ?? rawPagination.count,
        page: rawPagination.page ?? rawPagination.current_page,
        limit: rawPagination.limit ?? rawPagination.per_page,
      }
    : undefined;

  const createMutation = useMutation({
    mutationFn: async (newEmployee: any) => {
      const { data } = await apiClient.post("/employees", newEmployee);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data } = await apiClient.patch(`/employees/${id}`, updates);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: any }) => {
      const { data } = await apiClient.patch("/employees/bulk", {
        ids,
        updates,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  return {
    data: employees,
    pagination,
    isLoading: query.isLoading,
    isError: query.isError,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    bulkUpdate: bulkUpdateMutation.mutateAsync,
  };
}

export function useEmployee(id?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await apiClient.get(
        `/employees/${encodeURIComponent(id)}`,
      );
      return data.data;
    },
    enabled: !!id,
  });

  const resendCredentialsMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { data } = await apiClient.post(
        `/employees/${encodeURIComponent(employeeId)}/resend-credentials`,
      );
      return data.data ?? data;
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async ({
      employeeId,
      email,
      role_id,
    }: {
      employeeId: string;
      email: string;
      role_id: string;
    }) => {
      const { data } = await apiClient.post(
        `/employees/${encodeURIComponent(employeeId)}/account`,
        { email, role_id },
      );
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const salaryRevisionMutation = useMutation({
    mutationFn: async ({
      employeeId,
      payload,
    }: {
      employeeId: string;
      payload: any;
    }) => {
      const { data } = await apiClient.post(
        `/employees/${encodeURIComponent(employeeId)}/salary-revision`,
        payload,
      );
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-finance", id] });
    },
  });

  const careerMovementMutation = useMutation({
    mutationFn: async ({
      employeeId,
      payload,
    }: {
      employeeId: string;
      payload: any;
    }) => {
      const { data } = await apiClient.post(
        `/employees/${encodeURIComponent(employeeId)}/career-movements`,
        payload,
      );
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", id] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-finance", id] });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    resendCredentials: resendCredentialsMutation.mutateAsync,
    isResendingCredentials: resendCredentialsMutation.isPending,
    createAccount: createAccountMutation.mutateAsync,
    isCreatingAccount: createAccountMutation.isPending,
    addSalaryRevision: salaryRevisionMutation.mutateAsync,
    isAddingSalaryRevision: salaryRevisionMutation.isPending,
    addCareerMovement: careerMovementMutation.mutateAsync,
    isAddingCareerMovement: careerMovementMutation.isPending,
  };
}

export function useEmployeeFinance(employeeId?: string) {
  return useQuery({
    queryKey: ["employee-finance", employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const { data } = await apiClient.get(
        `/employees/${encodeURIComponent(employeeId)}/finance`,
      );
      return data.data ?? data;
    },
    enabled: !!employeeId,
  });
}

export function useEmployeeActions(employeeId?: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      section,
      updates,
    }: {
      section: string;
      updates: any;
    }) => {
      if (!employeeId) throw new Error("Missing employee id");
      if (section === "allowances") {
        const { data } = await apiClient.put(
          `/employees/${encodeURIComponent(employeeId)}/${section}`,
          updates,
        );
        return data;
      }
      const { data } = await apiClient.patch(
        `/employees/${encodeURIComponent(employeeId)}/${section}`,
        updates,
      );
      return data;
    },
    onSuccess: () => {
      if (employeeId) {
        queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
        queryClient.invalidateQueries({ queryKey: ["employee-finance", employeeId] });
      }
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  return {
    updateSection: mutation.mutateAsync,
    isUpdatingSection: mutation.isLoading,
    updatePersonal: (updates: any) =>
      mutation.mutateAsync({ section: "personal", updates }),
    updateJob: (updates: any) =>
      mutation.mutateAsync({ section: "job", updates }),
    updateAccount: (updates: any) =>
      mutation.mutateAsync({ section: "account", updates }),
    updateBank: (updates: any) =>
      mutation.mutateAsync({ section: "bank", updates }),
    updateMedical: (updates: any) =>
      mutation.mutateAsync({ section: "medical", updates }),
    updateSalary: (updates: any) =>
      mutation.mutateAsync({ section: "salary", updates }),
    updateAllowances: (updates: any) =>
      mutation.mutateAsync({ section: "allowances", updates }),
  };
}
