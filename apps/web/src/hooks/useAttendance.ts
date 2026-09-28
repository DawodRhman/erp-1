import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "half_day"
  | "on_leave";

export interface AttendanceRow {
  attendance_id?: string;
  id?: string;
  employee_id: string;
  name?: string;
  designation?: string;
  shift?: {
    id?: string;
    name?: string;
    expected_in?: string;
    expected_out?: string;
    late_after_minutes?: number;
  };
  shift_id?: string;
  date?: string;
  check_in?: string | null;
  check_out?: string | null;
  status: AttendanceStatus | string;
  notes?: string | null;
  ack?: boolean;
  state?: string;
  late_by_minutes?: number;
  read_only_notes?: boolean;
  synthetic?: boolean;
}

export interface AttendanceSheet {
  date: string;
  location_id?: string;
  rows: AttendanceRow[];
}

export interface AttendanceSheetParams {
  date?: string;
  location_id?: string;
}

export interface SaveAttendancePayload {
  date: string;
  location_id: string;
  rows: Array<{
    employee_id: string;
    shift_id?: string;
    check_in?: string | null;
    check_out?: string | null;
    status: AttendanceStatus | string;
    notes?: string | null;
    ack?: boolean;
  }>;
}

export interface AttendanceReportParams {
  year?: number | string;
  month?: number | string;
  location_id?: string;
  employee_id?: string;
  department_id?: string;
}

export interface AttendanceCorrectionRequest {
  id: string;
  attendance_id: string;
  employee_id: string;
  employee_name?: string;
  date: string;
  requested_check_in?: string | null;
  requested_check_out?: string | null;
  reason: string;
  status: "submitted" | "approved" | "rejected" | string;
  review_note?: string | null;
  created_at?: string;
  reviewed_at?: string | null;
}

function cleanParams<T extends Record<string, any>>(params?: T) {
  return Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (typeof value === "string" && !value.trim()) return false;
      return true;
    }),
  );
}

function unwrapData(payload: any) {
  return payload?.data ?? payload;
}

function extractAttendanceRows(payload: any): AttendanceRow[] {
  const data = unwrapData(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.attendance)) return data.attendance;
  if (Array.isArray(data?.items)) return data.items;
  if (
    data &&
    typeof data === "object" &&
    (data.id || data.attendance_id || data.status || data.attendance_date || data.date)
  ) {
    return [data];
  }
  return [];
}

export function normalizeAttendanceSheet(payload: any): AttendanceSheet {
  const data = unwrapData(payload);
  return {
    date: data?.date || "",
    location_id: data?.location_id,
    rows: extractAttendanceRows(payload),
  };
}

export function useAttendanceSheet(params?: AttendanceSheetParams) {
  const requestParams = cleanParams(params);

  return useQuery({
    queryKey: ["attendance", "sheet", requestParams],
    enabled: !!params,
    queryFn: async () => {
      const { data } = await apiClient.get("/attendance", {
        params: requestParams,
      });
      return normalizeAttendanceSheet(data);
    },
  });
}

export function useSaveAttendanceSheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SaveAttendancePayload) => {
      const { data } = await apiClient.put("/attendance/save", payload);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useSubmitAttendanceSheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { date: string; location_id: string }) => {
      const { data } = await apiClient.post("/attendance/submit", payload);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useRequestAttendanceUnlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      date: string;
      location_id: string;
      reason: string;
    }) => {
      const { data } = await apiClient.post("/attendance/unlock-request", payload);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useApproveAttendanceUnlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      date: string;
      location_id: string;
      unlock_reason: string;
    }) => {
      const { data } = await apiClient.post("/attendance/unlock-approve", payload);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useAcknowledgeAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/attendance/${id}/ack`);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["employee_self_metrics"] });
    },
  });
}

export function useSubmitAttendanceCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      date: string;
      requested_check_in?: string | null;
      requested_check_out?: string | null;
      reason: string;
    }) => {
      const { data } = await apiClient.post("/attendance/corrections", payload);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance_corrections"] });
    },
  });
}

export function useAttendanceCorrections(params?: {
  status?: string;
  employee_id?: string;
  date?: string;
  enabled?: boolean;
}) {
  const { enabled = true, ...filterParams } = params || {};
  const requestParams = cleanParams(filterParams);

  return useQuery({
    queryKey: ["attendance_corrections", requestParams],
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get("/attendance/corrections", {
        params: requestParams,
      });
      const payload = data?.data ?? data;
      return Array.isArray(payload) ? payload as AttendanceCorrectionRequest[] : [];
    },
  });
}

export function useReviewAttendanceCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      decision: "approved" | "rejected";
      review_note?: string | null;
    }) => {
      const { id, ...body } = payload;
      const { data } = await apiClient.patch(`/attendance/corrections/${id}/review`, body);
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance_corrections"] });
    },
  });
}

export function useAttendanceReport(params?: AttendanceReportParams) {
  const requestParams = cleanParams(params);

  return useQuery({
    queryKey: ["attendance", "report", requestParams],
    enabled: !!params,
    queryFn: async () => {
      const { data } = await apiClient.get("/attendance/report", {
        params: requestParams,
      });
      const reportData = data?.data ?? data;
      return Array.isArray(reportData) ? reportData : [];
    },
  });
}

export function useAttendance(params?: AttendanceSheetParams) {
  const sheet = useAttendanceSheet(params);
  const acknowledgeMutation = useAcknowledgeAttendance();

  return {
    data: sheet.data?.rows ?? [],
    pagination: undefined,
    isLoading: sheet.isLoading,
    isError: sheet.isError,
    mark: async () => {
      throw new Error("Attendance mark endpoint is no longer active. Use save sheet.");
    },
    acknowledge: acknowledgeMutation.mutateAsync,
  };
}
