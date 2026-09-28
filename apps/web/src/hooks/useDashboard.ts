import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export function useDashboardMetrics(range?: string) {
  return useQuery({
    queryKey: ['dashboard_metrics', range],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard/metrics', { params: { range } });
      return data.data;
    },
  });
}

export function useEmployeeSelfMetrics(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['employee_self_metrics'],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard/me');
      return data.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function usePendingActions() {
  return useQuery({
    queryKey: ['pending_actions'],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard/pending-actions');
      return data.data;
    },
  });
}

export function useUrgentAlerts() {
  return useQuery({
    queryKey: ['urgent_alerts'],
    queryFn: async () => {
      const { data } = await apiClient.get('/dashboard/urgent-alerts');
      return data.data;
    },
  });
}
