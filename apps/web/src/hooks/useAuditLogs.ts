import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";

export type AuditLogItem = {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  module: string;
  recordId: string;
  summary: string;
  ip_address?: string | null;
  private_ip_address?: string | null;
  user_agent?: string | null;
  method?: string | null;
  path?: string | null;
  request_id?: string | null;
  hostname?: string | null;
  actor_user_id?: string | null;
  actor_employee_id?: string | null;
  actor_role_id?: string | null;
  actor_email?: string | null;
  meta?: Record<string, any>;
};

function normalizeAuditResponse(payload: any): AuditLogItem[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

export function useAuditLogs(params: Record<string, any> = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );

  const query = useQuery({
    queryKey: ["audit-activity-logs", cleanParams],
    queryFn: async () => {
      const { data: response } = await apiClient.get("/audit/activity-logs", { params: cleanParams });
      const body = response?.data || response;
      const items = normalizeAuditResponse(response);
      const page = body?.page ?? 1;
      const limit = body?.limit ?? cleanParams.limit ?? 100;
      const total = body?.total ?? items.length;
      return { items, page, limit, total };
    },
  });

  return {
    ...query,
    logs: query.data?.items || [],
    page: query.data?.page ?? 1,
    limit: query.data?.limit ?? 100,
    total: query.data?.total ?? 0,
  };
}
