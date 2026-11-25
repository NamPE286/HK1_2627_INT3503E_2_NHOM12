/**
 * Văn bản hiện hành / dự thảo trong workspace. Quyền: thành viên đọc, OWNER ghi (auth/workspace-access.ts).
 * State machine: EDITING → FINALIZED → ARCHIVED (ai-rules/11-domain-rules.md).
 */
import { and, asc, count, desc, eq, gte, ilike, isNull, lte, or, type SQL } from "drizzle-orm";
import { type Access, assertAccess, requireWorkspace, roleIn } from "../../auth/workspace-access.js";
import type { Db } from "../../db/client.js";
import { type DocumentStatus, legalDocuments } from "../../db/schema/legal-documents.js";
import { buildPagination, parseSort } from "../../lib/pagination.js";
import { notFound, ProblemError } from "../../lib/problem.js";
import {
  type LegalDocumentCreateInput,
  type LegalDocumentUpdateInput,
  type ListQueryInput,
  SORTABLE,
  toLegalDocument,
} from "./schemas.js";

const TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  EDITING: ["FINALIZED"],
  FINALIZED: ["ARCHIVED"],
  ARCHIVED: [],
};

const SORT_COLUMNS = {
  issued_date: legalDocuments.issuedDate,
  effective_date: legalDocuments.effectiveDate,
  number: legalDocuments.number,
  created_at: legalDocuments.createdAt,
  updated_at: legalDocuments.updatedAt,
} as const;

function isUniqueViolation(err: unknown): boolean {
  // node-postgres & PGlite đều trả SQLSTATE 23505; drizzle có thể bọc lỗi gốc trong `cause`
  for (let e: unknown = err; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: string }).code === "23505") return true;
  }
  return false;
}

const duplicate = (number: string) =>
  new ProblemError(409, "DUPLICATE_RESOURCE", `Số hiệu ${number} đã tồn tại trong workspace.`, {
    title: "Duplicate resource",
  });

/** Lấy văn bản theo ID toàn cục và kiểm tra quyền trên workspace chứa nó. Dùng chung cho module source-files. */
export async function loadDocumentWithAccess(db: Db, userId: string, documentId: string, access: Access) {
  const [row] = await db
    .select()
    .from(legalDocuments)
    .where(and(eq(legalDocuments.id, documentId), isNull(legalDocuments.deletedAt)))
    .limit(1);
  if (!row) throw notFound("văn bản");
  assertAccess(await roleIn(db, row.workspaceId, userId), access, "văn bản");
  return row;
}

export function legalDocumentService(db: Db) {
  return {
    async list(userId: string, workspaceId: string, q: ListQueryInput) {
      await requireWorkspace(db, workspaceId, userId, "READ");
      const page = q.page ?? 1;
      const pageSize = q.page_size ?? 20;
      const sort = parseSort(q.sort ?? "-updated_at", SORTABLE);
      const filters: (SQL | undefined)[] = [eq(legalDocuments.workspaceId, workspaceId), isNull(legalDocuments.deletedAt)];
      if (q.kind) filters.push(eq(legalDocuments.kind, q.kind));
      if (q.status) filters.push(eq(legalDocuments.status, q.status));
      if (q.doc_type) filters.push(eq(legalDocuments.docType, q.doc_type));
      if (q.number) filters.push(eq(legalDocuments.number, q.number));
      if (q.issued_after) filters.push(gte(legalDocuments.issuedDate, q.issued_after));
      if (q.issued_before) filters.push(lte(legalDocuments.issuedDate, q.issued_before));
      if (q.q) {
        // TODO: thay bằng tsvector + unaccent
        const like = `%${q.q.replace(/[%_\\]/g, "\\$&")}%`;
        filters.push(or(ilike(legalDocuments.title, like), ilike(legalDocuments.number, like)));
      }
      const where = and(...filters);
      const orderBy = [
        ...sort.map((s) => {
          const col = SORT_COLUMNS[s.field as keyof typeof SORT_COLUMNS];
          return s.desc ? desc(col) : asc(col);
        }),
        asc(legalDocuments.id),
      ];
      const [rows, totals] = await Promise.all([
        db.select().from(legalDocuments).where(where).orderBy(...orderBy).limit(pageSize).offset((page - 1) * pageSize),
        db.select({ n: count() }).from(legalDocuments).where(where),
      ]);
      return { data: rows.map(toLegalDocument), pagination: buildPagination(page, pageSize, totals[0]?.n ?? 0) };
    },

    async get(userId: string, id: string) {
      return toLegalDocument(await loadDocumentWithAccess(db, userId, id, "READ"));
    },

    async create(userId: string, workspaceId: string, input: LegalDocumentCreateInput) {
      await requireWorkspace(db, workspaceId, userId, "WRITE");
      try {
        const [row] = await db
          .insert(legalDocuments)
          .values({
            workspaceId,
            kind: input.kind,
            docType: input.doc_type,
            number: input.number.trim(),
            title: input.title.trim(),
            issuer: input.issuer.trim(),
            issuedDate: input.issued_date ?? null,
            effectiveDate: input.effective_date ?? null,
            expiryDate: input.expiry_date ?? null,
          })
          .returning();
        return toLegalDocument(row!);
      } catch (err) {
        if (isUniqueViolation(err)) throw duplicate(input.number);
        throw err;
      }
    },

    async update(userId: string, id: string, input: LegalDocumentUpdateInput, expectVersion?: number) {
      const current = await loadDocumentWithAccess(db, userId, id, "WRITE");
      if (expectVersion !== undefined && expectVersion !== current.version) {
        throw new ProblemError(412, "PRECONDITION_FAILED", "Tài nguyên đã bị thay đổi, hãy tải lại (ETag lệch).");
      }
      const { status, ...meta } = input;
      const changes: Partial<typeof legalDocuments.$inferInsert> = {};

      if (current.status !== "EDITING") {
        const locked = Object.keys(meta).filter((k) => k !== "expiry_date");
        if (locked.length) {
          throw new ProblemError(409, "INVALID_STATE_TRANSITION", "Văn bản đã chốt chỉ được sửa expiry_date.", {
            errors: locked.map((f) => ({ field: f, code: "READ_ONLY", message: "Không sửa được khi đã chốt" })),
          });
        }
      }
      if (meta.doc_type !== undefined) changes.docType = meta.doc_type;
      if (meta.number !== undefined) changes.number = meta.number.trim();
      if (meta.title !== undefined) changes.title = meta.title.trim();
      if (meta.issuer !== undefined) changes.issuer = meta.issuer.trim();
      if (meta.issued_date !== undefined) changes.issuedDate = meta.issued_date;
      if (meta.effective_date !== undefined) changes.effectiveDate = meta.effective_date;
      if (meta.expiry_date !== undefined) changes.expiryDate = meta.expiry_date;

      if (status !== undefined && status !== current.status) {
        if (!TRANSITIONS[current.status].includes(status)) {
          throw new ProblemError(409, "INVALID_STATE_TRANSITION", `Không thể chuyển từ ${current.status} sang ${status}.`);
        }
        if (status === "FINALIZED" && current.kind === "IN_FORCE") {
          const merged = { ...current, ...changes };
          const missing = (["issuedDate", "effectiveDate"] as const).filter((k) => !merged[k]);
          if (missing.length) {
            throw new ProblemError(422, "VALIDATION_ERROR", "Văn bản hiện hành cần issued_date và effective_date trước khi chốt.", {
              errors: missing.map((k) => ({
                field: k === "issuedDate" ? "issued_date" : "effective_date",
                code: "REQUIRED_FOR_FINALIZE",
                message: "Bắt buộc khi chốt",
              })),
            });
          }
        }
        if (status === "FINALIZED") changes.finalizedAt = new Date();
        changes.status = status;
      }

      try {
        const [row] = await db
          .update(legalDocuments)
          .set({ ...changes, version: current.version + 1, updatedAt: new Date() })
          .where(and(eq(legalDocuments.id, id), eq(legalDocuments.version, current.version)))
          .returning();
        if (!row) throw new ProblemError(412, "PRECONDITION_FAILED", "Tài nguyên vừa bị thay đổi bởi request khác.");
        return toLegalDocument(row);
      } catch (err) {
        if (isUniqueViolation(err)) throw duplicate(changes.number ?? current.number);
        throw err;
      }
    },

    async remove(userId: string, id: string) {
      const current = await loadDocumentWithAccess(db, userId, id, "WRITE");
      if (current.status !== "EDITING") {
        throw new ProblemError(409, "INVALID_STATE_TRANSITION", "Chỉ xoá được văn bản đang soạn; hãy lưu trữ (ARCHIVED).");
      }
      await db.update(legalDocuments).set({ deletedAt: new Date() }).where(eq(legalDocuments.id, id));
    },
  };
}
