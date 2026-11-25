import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api/client";

const KEY = "leximpact:last-workspace";

/** Nhớ workspace đang làm việc để trang chi tiết văn bản (URL không có workspace) vẫn hiện đúng thanh chọn. */
export function rememberWorkspace(id: string) {
  try {
    sessionStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
}

export function lastWorkspace(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export const useWorkspaces = () => useQuery({ queryKey: ["workspaces"], queryFn: api.listWorkspaces });

export function useWorkspace(id: string | undefined) {
  return useQuery({ queryKey: ["workspaces", id], queryFn: () => api.getWorkspace(id!), enabled: !!id });
}
