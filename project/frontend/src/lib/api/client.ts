/**
 * Mọi lời gọi /api/v1 đi qua đây (ai-rules/10). Type sinh từ contract: `bun run gen:api`.
 * Lỗi application/problem+json → ApiProblem (hiển thị theo `code`).
 */
import type { components } from "./schema";

export type LegalDocument = components["schemas"]["LegalDocument"];
export type LegalDocumentCreate = components["schemas"]["LegalDocumentCreate"];
export type LegalDocumentList = components["schemas"]["LegalDocumentList"];
export type SourceFile = components["schemas"]["SourceFile"];
export type SourceFileList = components["schemas"]["SourceFileList"];
export type Problem = components["schemas"]["Problem"];
export type DocType = components["schemas"]["DocType"];
export type DocumentStatus = components["schemas"]["DocumentStatus"];

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

export interface ListDocumentsParams {
  page?: number;
  page_size?: number;
  q?: string;
  status?: DocumentStatus;
  doc_type?: DocType;
  sort?: string;
}

export const api = {
  listDocuments(params: ListDocumentsParams = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]),
    );
    return request<LegalDocumentList>(`/legal-documents?${qs}`);
  },
  getDocument: (id: string) => request<LegalDocument>(`/legal-documents/${id}`),
  createDocument: (body: LegalDocumentCreate) => request<LegalDocument>("/legal-documents", json("POST", body)),
  updateDocument: (id: string, body: Partial<LegalDocument>, version?: number) =>
    request<LegalDocument>(
      `/legal-documents/${id}`,
      json("PATCH", body, version ? { "If-Match": `W/"${version}"` } : {}),
    ),
  deleteDocument: (id: string) => request<void>(`/legal-documents/${id}`, { method: "DELETE" }),
  listSourceFiles: (documentId: string) => request<SourceFileList>(`/legal-documents/${documentId}/source-files`),
  uploadSourceFile(documentId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return request<SourceFile>(`/legal-documents/${documentId}/source-files`, { method: "POST", body: form });
  },
  deleteSourceFile: (fileId: string) => request<void>(`/source-files/${fileId}`, { method: "DELETE" }),
  sourceFileUrl: (fileId: string) => `${BASE}/source-files/${fileId}/content`,
};
