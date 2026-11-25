import { sql } from "drizzle-orm";
import { date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces.js";

export const DOC_TYPES = ["LUAT", "NGHI_DINH", "THONG_TU", "QUYET_DINH", "OTHER"] as const;
export const DOCUMENT_KINDS = ["IN_FORCE", "DRAFT"] as const;
export const DOCUMENT_STATUSES = ["EDITING", "FINALIZED", "ARCHIVED"] as const;
export type DocType = (typeof DOC_TYPES)[number];
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const EMPTY_DOC = { type: "doc", content: [] } as const;

/**
 * Văn bản trong workspace: văn bản hiện hành (IN_FORCE) hoặc dự thảo (DRAFT).
 * Số hiệu `number` unique TRONG workspace.
 */
export const legalDocuments = pgTable(
  "legal_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind").$type<DocumentKind>().notNull(),
    docType: text("doc_type").$type<DocType>().notNull(),
    number: text("number").notNull(),
    title: text("title").notNull(),
    issuer: text("issuer").notNull(),
    issuedDate: date("issued_date"),
    effectiveDate: date("effective_date"),
    expiryDate: date("expiry_date"),
    status: text("status").$type<DocumentStatus>().notNull().default("EDITING"),
    content: jsonb("content").notNull().default(EMPTY_DOC),
    currentRevision: integer("current_revision").notNull().default(0),
    version: integer("version").notNull().default(1),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("legal_documents_ws_number_uq").on(t.workspaceId, t.number).where(sql`${t.deletedAt} is null`),
    index("legal_documents_ws_kind_status_idx").on(t.workspaceId, t.kind, t.status),
  ],
);

export type LegalDocumentRow = typeof legalDocuments.$inferSelect;
