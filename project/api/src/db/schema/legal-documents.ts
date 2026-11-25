import { sql } from "drizzle-orm";
import { date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const DOC_TYPES = ["LUAT", "NGHI_DINH", "THONG_TU", "QUYET_DINH", "OTHER"] as const;
export const DOCUMENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type DocType = (typeof DOC_TYPES)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const EMPTY_DOC = { type: "doc", content: [] } as const;

/**
 * Văn bản pháp luật — thuộc về workspace của một user (owner_id).
 * Số hiệu `number` unique TRONG workspace (2 user có thể cùng nhập NĐ 168/2024/NĐ-CP).
 */
export const legalDocuments = pgTable(
  "legal_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    docType: text("doc_type").$type<DocType>().notNull(),
    number: text("number").notNull(),
    title: text("title").notNull(),
    issuer: text("issuer").notNull(),
    issuedDate: date("issued_date"),
    effectiveDate: date("effective_date"),
    expiryDate: date("expiry_date"),
    status: text("status").$type<DocumentStatus>().notNull().default("DRAFT"),
    content: jsonb("content").notNull().default(EMPTY_DOC),
    currentRevision: integer("current_revision").notNull().default(0),
    version: integer("version").notNull().default(1),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("legal_documents_owner_number_uq").on(t.ownerId, t.number).where(sql`${t.deletedAt} is null`),
    index("legal_documents_owner_status_issued_idx").on(t.ownerId, t.status, t.issuedDate),
  ],
);

export type LegalDocumentRow = typeof legalDocuments.$inferSelect;
