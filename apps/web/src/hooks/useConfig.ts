import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";

function normalizeConfigList<T>(payload: any, entityName: string): T[] {
  const dataNode = payload?.data ?? payload;
  const candidates = [
    dataNode,
    dataNode?.[entityName],
    dataNode?.items,
    dataNode?.rows,
    dataNode?.results,
    dataNode?.data,
  ];

  const list = candidates.find(Array.isArray);
  return (list || []) as T[];
}

// Generic hook factory for basic config entities
export function createConfigHook<T>(
  entityName: string,
  options: { includeInactive?: boolean } = {},
) {
  const queryParams = options.includeInactive ? { include_inactive: true } : undefined;
  const queryKey = ["config", entityName, queryParams || {}];

  return function useEntityConfig(queryOptions: { enabled?: boolean } = {}) {
    const queryClient = useQueryClient();

    const query = useQuery({
      queryKey,
      enabled: queryOptions.enabled ?? true,
      queryFn: async () => {
        const { data } = queryParams
          ? await apiClient.get(`/config/${entityName}`, { params: queryParams })
          : await apiClient.get(`/config/${entityName}`);
        return normalizeConfigList<T>(data, entityName);
      },
    });

    const createMutation = useMutation({
      mutationFn: async (newItem: Partial<T>) => {
        const { data } = await apiClient.post(`/config/${entityName}`, newItem);
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["config", entityName] });
      },
    });

    const updateMutation = useMutation({
      mutationFn: async ({
        id,
        updates,
      }: {
        id: string;
        updates: Partial<T>;
      }) => {
        const { data } = await apiClient.patch(
          `/config/${entityName}/${id}`,
          updates,
        );
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["config", entityName] });
      },
    });

    return {
      data: query.data || [],
      isLoading: query.isLoading,
      isError: query.isError,
      create: createMutation.mutateAsync,
      update: updateMutation.mutateAsync,
    };
  };
}

// Specific hooks
export const useDepartments = createConfigHook<any>("departments");
export function useDesignations(departmentId?: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["config", "designations", departmentId ?? "all"];

  const query = useQuery({
    queryKey,
    enabled: departmentId !== null,
    queryFn: async () => {
      const { data } = await apiClient.get("/config/designations", {
        params: departmentId ? { department_id: departmentId } : undefined,
      });
      return normalizeConfigList<any>(data, "designations");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newItem: Partial<any>) => {
      const { data } = await apiClient.post("/config/designations", newItem);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "designations"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<any>;
    }) => {
      const { data } = await apiClient.patch(
        `/config/designations/${id}`,
        updates,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "designations"] });
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
  };
}
export const useEmploymentTypes = createConfigHook<any>("employment-types");
export const useJobStatuses = createConfigHook<any>("job-statuses");
export const useWorkModes = createConfigHook<any>("work-modes");
export const useWorkLocations = createConfigHook<any>("work-locations");
export function useLocations(filters: { kind?: string; province?: string; country?: string } = {}) {
  const queryClient = useQueryClient();
  const requestParams = Object.fromEntries(
    Object.entries({ country: "Pakistan", ...filters }).filter(([, value]) => value),
  );
  const queryKey = ["config", "locations", requestParams];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await apiClient.get("/config/locations", {
        params: requestParams,
      });
      return normalizeConfigList<any>(data, "locations");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newItem: Partial<any>) => {
      const { data } = await apiClient.post("/config/locations", {
        country: "Pakistan",
        ...newItem,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "locations"] });
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    create: createMutation.mutateAsync,
  };
}
export const useShifts = createConfigHook<any>("shifts");
export const useLeaveTypes = createConfigHook<any>("leave-types");
export const useLeavePolicies = createConfigHook<any>("leave-policies");
export const useLeaveCapacity = createConfigHook<any>("leave-capacity");
export function usePenaltyRules(options: { includeInactive?: boolean } = {}) {
  const queryClient = useQueryClient();
  const queryParams = options.includeInactive ? { include_inactive: true } : undefined;
  const queryKey = ["penalty-rules", queryParams || {}];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = queryParams
        ? await apiClient.get("/penalty-rules", { params: queryParams })
        : await apiClient.get("/penalty-rules");
      return normalizeConfigList<any>(data, "penalty-rules");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newItem: Partial<any>) => {
      const { data } = await apiClient.post("/penalty-rules", newItem);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["penalty-rules"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<any>;
    }) => {
      const { data } = await apiClient.patch(`/penalty-rules/${id}`, updates);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["penalty-rules"] });
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
  };
}
export const useAllowanceTypes = createConfigHook<any>("allowance-types");
export const useRoles = createConfigHook<any>("roles");
