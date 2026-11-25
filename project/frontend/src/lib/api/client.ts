/**
 * Mọi lời gọi /api/v1 đi qua đây (ai-rules/10). Type sinh từ contract: `bun run gen:api`.
 * Lỗi application/problem+json → ApiProblem (hiển thị theo `code`).
 */
import type { components } from "./schema";

type S = components["schemas"];
export type Workspace = S["Workspace"];
export type WorkspaceList = S["WorkspaceList"];
export type Member = S["Member"];
export type MemberList = S["MemberList"];
export type MemberRole = S["MemberRole"];
export type LegalDocument = S["LegalDocument"];
export type LegalDocumentCreate = S["LegalDocumentCreate"];
export type LegalDocumentList = S["LegalDocumentList"];
export type SourceFile = S["SourceFile"];
export type SourceFileList = S["SourceFileList"];
export type Problem = S["Problem"];
export type DocType = S["DocType"];
export type DocumentKind = S["DocumentKind"];
export type DocumentStatus = S["DocumentStatus"];

const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class ApiProblem extends Error {
  constructor(public readonly problem: Problem) {
    super(problem.detail || problem.title);
  }
  get status() {
    return this.problem.status;
  }
  get code() {
    return this.problem.code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, { credentials: "include", ...init });
  if (res.status === 204 || res.status === 304) return undefined as T;
  const isProblem = res.headers.get("content-type")?.includes("application/problem+json");
  if (!res.ok || isProblem) {
    const body = isProblem ? await res.json() : null;
    throw new ApiProblem(
      body ?? { type: "about:blank", title: res.statusText, status: res.status, detail: res.statusText,
                instance: path, code: "HTTP_ERROR", request_id: res.headers.get("x-request-id") ?? "" },
    );
  }
  return (await res.json()) as T;
}

const json = (method: string, body: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method,
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(body),
});

const qs = (params: Record<string, unknown>) =>
  new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]),
  ).toString();

export interface ListDocumentsParams {
  page?: number;
  page_size?: number;
  q?: string;
  kind?: DocumentKind;
  status?: DocumentStatus;
  doc_type?: DocType;
  sort?: string;
}

export const api = {
  // Workspaces & chia sẻ
  listWorkspaces: () => request<WorkspaceList>("/workspaces?page_size=100"),
  getWorkspace: (id: string) => request<Workspace>(`/workspaces/${id}`),
  createWorkspace: (name: string) => request<Workspace>("/workspaces", json("POST", { name })),
  listMembers: (id: string) => request<MemberList>(`/workspaces/${id}/members?page_size=100`),
  shareWorkspace: (id: string, email: string) =>
    request<Member>(`/workspaces/${id}/members`, json("POST", { email, role: "VIEWER" })),
  revokeMember: (id: string, userId: string) =>
    request<void>(`/workspaces/${id}/members/${userId}`, { method: "DELETE" }),

  // Văn bản
  listDocuments: (workspaceId: string, params: ListDocumentsParams = {}) =>
    request<LegalDocumentList>(`/workspaces/${workspaceId}/legal-documents?${qs({ ...params })}`),
  createDocument: (workspaceId: string, body: LegalDocumentCreate) =>
    request<LegalDocument>(`/workspaces/${workspaceId}/legal-documents`, json("POST", body)),
  getDocument: (id: string) => request<LegalDocument>(`/legal-documents/${id}`),
  updateDocument: (id: string, body: Partial<LegalDocument>, version?: number) =>
    request<LegalDocument>(`/legal-documents/${id}`, json("PATCH", body, version ? { "If-Match": `W/"${version}"` } : {})),
  deleteDocument: (id: string) => request<void>(`/legal-documents/${id}`, { method: "DELETE" }),

  // File gốc
  listSourceFiles: (documentId: string) => request<SourceFileList>(`/legal-documents/${documentId}/source-files`),
  uploadSourceFile(documentId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return request<SourceFile>(`/legal-documents/${documentId}/source-files`, { method: "POST", body: form });
  },
  deleteSourceFile: (fileId: string) => request<void>(`/source-files/${fileId}`, { method: "DELETE" }),
  sourceFileUrl: (fileId: string) => `${BASE}/source-files/${fileId}/content`,
};
