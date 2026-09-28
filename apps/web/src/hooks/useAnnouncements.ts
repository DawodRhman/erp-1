import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  expiry_date?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by_name?: string;
  updated_by_name?: string;
  target_department_id?: string | null;
  target_designation_id?: string | null;
  target_department_ids?: string[];
  target_designation_ids?: string[];
  target_department_name?: string | null;
  target_designation_name?: string | null;
  target_department_names?: string[];
  target_designation_names?: string[];
  is_read?: boolean;
  read_at?: string | null;
};

export type AnnouncementPayload = {
  title: string;
  body: string;
  expiry_date?: string | null;
  is_active?: boolean;
  target_department_id?: string | null;
  target_designation_id?: string | null;
  target_department_ids?: string[];
  target_designation_ids?: string[];
};

function normalizeAnnouncementList(payload: any): Announcement[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.announcements)) return data.announcements;
  return [];
}

export function useAnnouncements(params: Record<string, any> = {}) {
  const queryClient = useQueryClient();
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );

  const query = useQuery({
    queryKey: ["announcements", cleanParams],
    queryFn: async () => {
      const { data } = await apiClient.get("/announcements", { params: cleanParams });
      return normalizeAnnouncementList(data);
    },
  });

  const create = useMutation({
    mutationFn: async (payload: AnnouncementPayload) => {
      const { data } = await apiClient.post("/announcements", payload);
      return data?.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<AnnouncementPayload> }) => {
      const { data } = await apiClient.patch(`/announcements/${id}`, payload);
      return data?.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/announcements/${id}/read`);
      return data?.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  return {
    ...query,
    announcements: query.data || [],
    create,
    update,
    markRead,
  };
}
