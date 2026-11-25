import { t } from "elysia";
import { DOC_TYPES, DOCUMENT_STATUSES, type LegalDocumentRow } from "../../db/schema/legal-documents.js";
import { PageQuery } from "../../lib/pagination.js";

// DTO khớp components.schemas trong docs/api/openapi.yaml
const DateStr = t.String({ format: "date" });
const NullableDate = t.Union([DateStr, t.Null()]);
/**
 * Enum dạng string + pattern. KHÔNG dùng t.UnionEnum trong t.Optional: Elysia tự điền giá trị enum đầu tiên
 * làm default cho field optional (đã gặp: PATCH bị chèn doc_type/status ngoài ý muốn).
 */
const enumString = <const T extends readonly string[]>(values: T) =>
  t.Unsafe<T[number]>(t.String({ pattern: `^(${values.join("|")})$`, description: values.join(" | ") }));
const DocTypeT = enumString(DOC_TYPES);
const StatusT = enumString(DOCUMENT_STATUSES);

export const LegalDocumentCreate = t.Object(
  {
    doc_type: DocTypeT,
    number: t.String({ minLength: 1, maxLength: 50 }),
    title: t.String({ minLength: 1, maxLength: 500 }),
    issuer: t.String({ maxLength: 200 }),
    issued_date: t.Optional(NullableDate),
    effective_date: t.Optional(NullableDate),
    expiry_date: t.Optional(NullableDate),
  },
  { additionalProperties: false },
);

export const LegalDocumentUpdate = t.Object(
  {
    doc_type: t.Optional(DocTypeT),
    number: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
    title: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
    issuer: t.Optional(t.String({ maxLength: 200 })),
    issued_date: t.Optional(NullableDate),
    effective_date: t.Optional(NullableDate),
    expiry_date: t.Optional(NullableDate),
    status: t.Optional(StatusT),
  },
  { additionalProperties: false, minProperties: 1 },
);

export const ListQuery = t.Object(
  {
    ...PageQuery,
    q: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
    doc_type: t.Optional(DocTypeT),
    status: t.Optional(StatusT),
    number: t.Optional(t.String({ maxLength: 50 })),
    issued_after: t.Optional(DateStr),
    issued_before: t.Optional(DateStr),
    sort: t.Optional(t.String({ maxLength: 100 })),
  },
  { additionalProperties: false },
);

export const SORTABLE = ["issued_date", "effective_date", "number", "created_at"] as const;

export type LegalDocumentCreateInput = typeof LegalDocumentCreate.static;
export type LegalDocumentUpdateInput = typeof LegalDocumentUpdate.static;
export type ListQueryInput = typeof ListQuery.static;

/** ORM row → API representation (snake_case, không lộ owner_id/deleted_at/content). */
export function toLegalDocument(row: LegalDocumentRow) {
  return {
    id: row.id,
    doc_type: row.docType,
    number: row.number,
    title: row.title,
    issuer: row.issuer,
    issued_date: row.issuedDate,
    effective_date: row.effectiveDate,
    expiry_date: row.expiryDate,
    status: row.status,
    current_revision: row.currentRevision,
    version: row.version,
    published_at: row.publishedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export type LegalDocumentDto = ReturnType<typeof toLegalDocument>;
export const FIELDS = [
  "id", "doc_type", "number", "title", "issuer", "issued_date", "effective_date", "expiry_date",
  "status", "current_revision", "version", "published_at", "created_at", "updated_at",
] as const satisfies readonly (keyof LegalDocumentDto)[];
