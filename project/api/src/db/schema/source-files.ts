import { bigint, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { legalDocuments } from "./legal-documents.js";

export const SOURCE_FILE_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
} as const;
export type SourceFileMime = keyof typeof SOURCE_FILE_TYPES;

/** File gốc (PDF/DOCX/TXT) được upload cho một văn bản. Nội dung file nằm ở FileStorage, DB chỉ giữ metadata. */
export const sourceFiles = pgTable(
  "source_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => legalDocuments.id, { onDelete: "cascade" }),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").$type<SourceFileMime>().notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    sha256: text("sha256").notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("source_files_document_idx").on(t.documentId),
    uniqueIndex("source_files_document_sha_uq").on(t.documentId, t.sha256),
  ],
);

export type SourceFileRow = typeof sourceFiles.$inferSelect;
