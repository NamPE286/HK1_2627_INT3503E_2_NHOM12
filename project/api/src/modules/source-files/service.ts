/**
 * Upload file gốc của văn bản (PDF / DOCX / TXT). Scope theo workspace (ownerId) như mọi resource.
 * Kiểm tra: kích thước (413), kiểu file theo whitelist + magic bytes (415), file rỗng (422), trùng nội dung (409).
 */
import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { legalDocuments } from "../../db/schema/legal-documents.js";
import { SOURCE_FILE_TYPES, type SourceFileMime, type SourceFileRow, sourceFiles } from "../../db/schema/source-files.js";
import { buildPagination } from "../../lib/pagination.js";
import { notFound, ProblemError } from "../../lib/problem.js";
import type { FileStorage } from "../../storage/file-storage.js";

const EXT_TO_MIME: Record<string, SourceFileMime> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

/** Xác định kiểu theo phần mở rộng/khai báo rồi XÁC MINH bằng magic bytes (không tin Content-Type client gửi). */
export function detectMime(filename: string, declared: string, head: Uint8Array): SourceFileMime | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const claimed = EXT_TO_MIME[ext] ?? (declared.split(";")[0]!.trim() as SourceFileMime);
  const startsWith = (sig: number[]) => sig.every((b, i) => head[i] === b);
  switch (claimed) {
    case "application/pdf":
      return startsWith([0x25, 0x50, 0x44, 0x46, 0x2d]) ? claimed : null; // %PDF-
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return startsWith([0x50, 0x4b, 0x03, 0x04]) ? claimed : null; // PK.. (zip)
    case "text/plain":
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(head);
        return head.includes(0) ? null : claimed;
      } catch {
        return null;
      }
    default:
      return null;
  }
}

export function toSourceFile(row: SourceFileRow) {
  return {
    id: row.id,
    document_id: row.documentId,
    original_filename: row.originalFilename,
    mime_type: row.mimeType,
    format: SOURCE_FILE_TYPES[row.mimeType],
    size_bytes: row.sizeBytes,
    sha256: row.sha256,
    created_at: row.createdAt.toISOString(),
  };
}

const sanitizeFilename = (name: string) =>
  name.replace(/[\\/]/g, "_").replace(/[\u0000-\u001f]/g, "").slice(0, 255) || "file";

export function sourceFileService(db: Db, storage: FileStorage, maxBytes: number) {
  async function ownedDocument(ownerId: string, documentId: string) {
    const [doc] = await db
      .select({ id: legalDocuments.id, status: legalDocuments.status })
      .from(legalDocuments)
      .where(and(eq(legalDocuments.id, documentId), eq(legalDocuments.ownerId, ownerId), isNull(legalDocuments.deletedAt)))
      .limit(1);
    if (!doc) throw notFound("văn bản");
    return doc;
  }

  async function ownedFile(ownerId: string, fileId: string) {
    const [row] = await db
      .select()
      .from(sourceFiles)
      .where(and(eq(sourceFiles.id, fileId), eq(sourceFiles.ownerId, ownerId)))
      .limit(1);
    if (!row) throw notFound("file");
    return row;
  }

  return {
    async upload(ownerId: string, documentId: string, file: File) {
      const doc = await ownedDocument(ownerId, documentId);
      if (doc.status !== "DRAFT") {
        throw new ProblemError(409, "INVALID_STATE_TRANSITION", "Chỉ upload file cho văn bản DRAFT.");
      }
      if (file.size === 0) {
        throw new ProblemError(422, "VALIDATION_ERROR", "File rỗng.", {
          errors: [{ field: "file", code: "EMPTY_FILE", message: "File không có nội dung" }],
        });
      }
      if (file.size > maxBytes) {
        throw new ProblemError(413, "PAYLOAD_TOO_LARGE", `File vượt quá ${Math.round(maxBytes / 1024 / 1024)} MB.`);
      }
      const data = await file.arrayBuffer();
      const mime = detectMime(file.name, file.type, new Uint8Array(data.slice(0, 4096)));
      if (!mime) {
        throw new ProblemError(415, "UNSUPPORTED_MEDIA_TYPE", "Chỉ chấp nhận PDF, DOCX hoặc TXT (UTF-8) hợp lệ.");
      }
      const sha256 = new Bun.CryptoHasher("sha256").update(data).digest("hex");
      const [dup] = await db
        .select({ id: sourceFiles.id })
        .from(sourceFiles)
        .where(and(eq(sourceFiles.documentId, documentId), eq(sourceFiles.sha256, sha256)))
        .limit(1);
      if (dup) {
        throw new ProblemError(409, "DUPLICATE_RESOURCE", "File có nội dung giống hệt đã được upload cho văn bản này.", {
          title: "Duplicate resource",
        });
      }

      const id = crypto.randomUUID();
      const storageKey = `${ownerId}/${documentId}/${id}`;
      await storage.put(storageKey, data);
      try {
        const [row] = await db
          .insert(sourceFiles)
          .values({
            id,
            ownerId,
            documentId,
            originalFilename: sanitizeFilename(file.name),
            mimeType: mime,
            sizeBytes: file.size,
            sha256,
            storageKey,
          })
          .returning();
        return toSourceFile(row!);
      } catch (err) {
        await storage.delete(storageKey); // không để file mồ côi
        throw err;
      }
    },

    async list(ownerId: string, documentId: string, page: number, pageSize: number) {
      await ownedDocument(ownerId, documentId);
      const where = and(eq(sourceFiles.documentId, documentId), eq(sourceFiles.ownerId, ownerId));
      const [rows, totals] = await Promise.all([
        db.select().from(sourceFiles).where(where).orderBy(desc(sourceFiles.createdAt), desc(sourceFiles.id))
          .limit(pageSize).offset((page - 1) * pageSize),
        db.select({ n: count() }).from(sourceFiles).where(where),
      ]);
      return { data: rows.map(toSourceFile), pagination: buildPagination(page, pageSize, totals[0]?.n ?? 0) };
    },

    async get(ownerId: string, fileId: string) {
      return toSourceFile(await ownedFile(ownerId, fileId));
    },

    async content(ownerId: string, fileId: string) {
      const row = await ownedFile(ownerId, fileId);
      const blob = await storage.get(row.storageKey);
      if (!blob) throw new ProblemError(404, "RESOURCE_NOT_FOUND", "Nội dung file không còn trong storage.");
      return { row, blob };
    },

    async remove(ownerId: string, fileId: string) {
      const row = await ownedFile(ownerId, fileId);
      await db.delete(sourceFiles).where(eq(sourceFiles.id, row.id));
      await storage.delete(row.storageKey);
    },
  };
}
