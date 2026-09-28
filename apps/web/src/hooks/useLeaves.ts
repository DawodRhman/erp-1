import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

function extractList(payload: any): any[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.balances)) return data.balances;
  return [];
}

export function useLeaves(params?: any) {
  const queryClient = useQueryClient();
  const cleanParams = Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );

  const query = useQuery({
    queryKey: ['leave-requests', cleanParams],
    queryFn: async () => {
      const { data } = await apiClient.get('/leave-requests', { params: cleanParams });
      return data;
    },
    enabled: !params || Object.keys(cleanParams).length === Object.keys(params).length,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post('/leave-requests', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/leave-requests/${id}/approve`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string, reason: string }) => {
      const { data } = await apiClient.patch(`/leave-requests/${id}/reject`, { reason });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  const earlyReturnMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string, actual_end_date?: string, is_forced?: boolean }) => {
      const { data } = await apiClient.patch(`/leave-requests/${id}/early-return`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  return {
    data: extractList(query.data),
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    isError: query.isError,
    create: createMutation.mutateAsync,
    approve: approveMutation.mutateAsync,
    reject: rejectMutation.mutateAsync,
    earlyReturn: earlyReturnMutation.mutateAsync,
  };
}

export function useMyLeaveBalances() {
  return useQuery({
    queryKey: ['leave-requests', 'balances', 'mine'],
    queryFn: async () => {
      const { data } = await apiClient.get('/leave-requests/balances/mine');
      return extractList(data);
    },
  });
}

export function useLeaveBalances(params?: any) {
  const cleanParams = Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );

  return useQuery({
    queryKey: ['leave-requests', 'balances', cleanParams],
    queryFn: async () => {
      const { data } = await apiClient.get('/leave-requests/balances', { params: cleanParams });
      const rows = extractList(data);
      const employeeId = cleanParams.employee_id;
      return employeeId
        ? rows.filter((row: any) => !row.employee_id || row.employee_id === employeeId)
        : rows;
    },
  });
}

export function useLeaveBalanceSummary(params?: any) {
  const cleanParams = Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );

  return useQuery({
    queryKey: ['leave-requests', 'balances', 'summary', cleanParams],
    queryFn: async () => {
      const { data } = await apiClient.get('/leave-requests/balances/summary', { params: cleanParams });
      return extractList(data);
    },
  });
}
