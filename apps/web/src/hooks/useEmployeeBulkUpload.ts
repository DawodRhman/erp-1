import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";

export type BulkPreviewRow = {
  rowNumber: number;
  data: Record<string, any>;
  mapped?: any;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
};

export type BulkPreview = {
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  warning_rows: number;
  rows: BulkPreviewRow[];
};

export async function downloadEmployeeBulkTemplate() {
  const response = await apiClient.get("/employees/bulk/template", {
    responseType: "blob",
  });
  const blob = new Blob([response.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "employee-bulk-upload-template.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useEmployeeBulkUpload() {
  const queryClient = useQueryClient();

  const validateMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post("/employees/bulk/validate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return (data.data ?? data) as BulkPreview;
    },
  });

  const importMutation = useMutation({
    mutationFn: async (rows: BulkPreviewRow[]) => {
      const { data } = await apiClient.post("/employees/bulk/import", { rows });
      return data.data ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const revalidateMutation = useMutation({
    mutationFn: async (rows: BulkPreviewRow[]) => {
      const { data } = await apiClient.post("/employees/bulk/revalidate", { rows });
      return (data.data ?? data) as BulkPreview;
    },
  });

  return {
    validateFile: validateMutation.mutateAsync,
    revalidateRows: revalidateMutation.mutateAsync,
    importRows: importMutation.mutateAsync,
    isValidating: validateMutation.isPending || revalidateMutation.isPending,
    isImporting: importMutation.isPending,
  };
}
