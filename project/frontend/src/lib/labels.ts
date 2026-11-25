import type { DocType, DocumentStatus } from "./api/client";

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  LUAT: "Luật",
  NGHI_DINH: "Nghị định",
  THONG_TU: "Thông tư",
  QUYET_DINH: "Quyết định",
  OTHER: "Khác",
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã xuất bản",
  ARCHIVED: "Lưu trữ",
};

export const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`;
