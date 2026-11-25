import type { DocType, DocumentKind, DocumentStatus, MemberRole } from "./api/client";

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  LUAT: "Luật",
  NGHI_DINH: "Nghị định",
  THONG_TU: "Thông tư",
  QUYET_DINH: "Quyết định",
  OTHER: "Khác",
};

export const KIND_LABELS: Record<DocumentKind, string> = {
  IN_FORCE: "Văn bản hiện hành",
  DRAFT: "Dự thảo",
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  EDITING: "Đang soạn",
  FINALIZED: "Đã chốt",
  ARCHIVED: "Lưu trữ",
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: "Chủ workspace",
  VIEWER: "Chỉ xem",
};

export const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`;
