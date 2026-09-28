import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";

export function useEmployeeAttachments(employeeId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["employee-attachments", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/employees/${encodeURIComponent(employeeId || "")}/attachments`,
      );
      return data.data ?? data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      kind,
      documentType,
    }: {
      file: File;
      kind: string;
      documentType?: string;
    }) => {
      if (!employeeId) throw new Error("Missing employee id");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      if (documentType) formData.append("document_type", documentType);
      const { data } = await apiClient.post(
        `/employees/${encodeURIComponent(employeeId)}/attachments`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employee-attachments", employeeId],
      });
    },
  });

  return {
    data: Array.isArray(query.data) ? query.data : [],
    isLoading: query.isLoading,
    upload: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
  };
}
