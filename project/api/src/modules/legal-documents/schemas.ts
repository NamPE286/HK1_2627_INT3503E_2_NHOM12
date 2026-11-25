import { t } from "elysia";
import {
  DOC_TYPES,
  DOCUMENT_KINDS,
  DOCUMENT_STATUSES,
  type LegalDocumentRow,
} from "../../db/schema/legal-documents.js";
import { enumString } from "../../lib/enum.js";
import { PageQuery } from "../../lib/pagination.js";

// DTO khớp components.schemas trong docs/api/openapi.yaml
const DateStr = t.String({ format: "date" });
const NullableDate = t.Union([DateStr, t.Null()]);
const DocTypeT = enumString(DOC_TYPES);
const KindT = enumString(DOCUMENT_KINDS);
const StatusT = enumString(DOCUMENT_STATUSES);

export const LegalDocumentCreate = t.Object(
  {
    kind: KindT,
    doc_type: DocTypeT,
    number: t.String({ minLength: 1, maxLength: 80 }),
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
    number: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
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
    kind: t.Optional(KindT),
    doc_type: t.Optional(DocTypeT),
    status: t.Optional(StatusT),
    number: t.Optional(t.String({ maxLength: 80 })),
    issued_after: t.Optional(DateStr),
    issued_before: t.Optional(DateStr),
    sort: t.Optional(t.String({ maxLength: 100 })),
  },
  { additionalProperties: false },
);

export const SORTABLE = ["issued_date", "effective_date", "number", "created_at", "updated_at"] as const;

export type LegalDocumentCreateInput = typeof LegalDocumentCreate.static;
export type LegalDocumentUpdateInput = typeof LegalDocumentUpdate.static;
export type ListQueryInput = typeof ListQuery.static;

/** ORM row → API representation (snake_case, không lộ deleted_at/content). */
export function toLegalDocument(row: LegalDocumentRow) {
  return {
    id: row.id,
    workspace_id: row.workspaceId,
    kind: row.kind,
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
    finalized_at: row.finalizedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export type LegalDocumentDto = ReturnType<typeof toLegalDocument>;
export const FIELDS = [
  "id", "workspace_id", "kind", "doc_type", "number", "title", "issuer", "issued_date", "effective_date",
  "expiry_date", "status", "current_revision", "version", "finalized_at", "created_at", "updated_at",
] as const satisfies readonly (keyof LegalDocumentDto)[];
