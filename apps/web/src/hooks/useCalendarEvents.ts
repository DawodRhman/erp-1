import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";

export type CalendarEventType =
  | "holiday"
  | "event"
  | "meeting"
  | "deadline"
  | "training"
  | "emergency"
  | "other";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  start_date: string;
  end_date: string;
  dateKey: string;
  type: CalendarEventType;
  target_department_ids?: string[];
  target_designation_ids?: string[];
  target_department_names?: string[];
  target_designation_names?: string[];
}

export interface CalendarEventFilters {
  all?: boolean;
  year?: number | string;
  from?: string;
  to?: string;
  type?: string;
  search?: string;
  sort?: string;
  order?: "asc" | "desc" | string;
}

export interface CalendarEventPayload {
  title: string;
  date?: string;
  start_date: string;
  end_date: string;
  type: string;
  target_department_ids?: string[];
  target_designation_ids?: string[];
}

function cleanParams(params?: CalendarEventFilters) {
  return Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (typeof value === "string" && !value.trim()) return false;
      return true;
    }),
  );
}

function extractList(payload: any): any[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.events)) return data.events;
  return [];
}

export function toCalendarDateKey(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

function normalizeType(value?: string): CalendarEventType {
  const type = String(value || "other").toLowerCase();
  if (
    type === "holiday" ||
    type === "event" ||
    type === "meeting" ||
    type === "deadline" ||
    type === "training" ||
    type === "emergency"
  ) {
    return type;
  }
  return "other";
}

export function normalizeCalendarEvents(payload: any): CalendarEvent[] {
  return extractList(payload)
    .map((event: any, index: number) => {
      const rawStartDate = event.start_date || event.date || event.event_date || event.starts_at || event.created_at;
      const rawEndDate = event.end_date || event.date || rawStartDate;
      const dateKey = toCalendarDateKey(rawStartDate);
      return {
        id: String(event.id || event.calendar_event_id || `${dateKey}-${index}`),
        title: String(event.title || event.name || "Calendar event"),
        date: rawStartDate || dateKey,
        start_date: rawStartDate || dateKey,
        end_date: rawEndDate || rawStartDate || dateKey,
        dateKey,
        type: normalizeType(event.type),
        target_department_ids: Array.isArray(event.target_department_ids) ? event.target_department_ids : [],
        target_designation_ids: Array.isArray(event.target_designation_ids) ? event.target_designation_ids : [],
        target_department_names: Array.isArray(event.target_department_names) ? event.target_department_names : [],
        target_designation_names: Array.isArray(event.target_designation_names) ? event.target_designation_names : [],
      };
    })
    .filter((event) => event.dateKey);
}

export function useCalendarEvents(params?: CalendarEventFilters) {
  const requestParams = cleanParams(params);

  return useQuery({
    queryKey: ["calendar-events", requestParams],
    queryFn: async () => {
      const { data } = await apiClient.get("/calendar-events", {
        params: requestParams,
      });
      return normalizeCalendarEvents(data);
    },
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CalendarEventPayload) => {
      const { data } = await apiClient.post("/calendar-events", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: CalendarEventPayload;
    }) => {
      const { data } = await apiClient.patch(`/calendar-events/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
}
