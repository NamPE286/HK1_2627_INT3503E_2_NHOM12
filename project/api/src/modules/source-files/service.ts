/**
 * Upload file gốc của văn bản (PDF / DOCX / TXT). Quyền theo workspace chứa văn bản (đọc: thành viên, ghi: OWNER).
 * Kiểm tra: kích thước (413), kiểu file theo whitelist + magic bytes (415), file rỗng (422), trùng nội dung (409).
 */
import { and, count, desc, eq } from "drizzle-orm";
import { type Access, requireWorkspace } from "../../auth/workspace-access.js";
import type { Db } from "../../db/client.js";
import { SOURCE_FILE_TYPES, type SourceFileMime, type SourceFileRow, sourceFiles } from "../../db/schema/source-files.js";
import { buildPagination } from "../../lib/pagination.js";
import { notFound, ProblemError } from "../../lib/problem.js";
import { loadDocumentWithAccess } from "../legal-documents/service.js";
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
  async function fileWithAccess(userId: string, fileId: string, access: Access) {
    const [row] = await db.select().from(sourceFiles).where(eq(sourceFiles.id, fileId)).limit(1);
    if (!row) throw notFound("file");
    await requireWorkspace(db, row.workspaceId, userId, access).catch((e) => {
      throw e instanceof ProblemError && e.status === 404 ? notFound("file") : e;
    });
    return row;
  }

  return {
    async upload(userId: string, documentId: string, file: File) {
      const doc = await loadDocumentWithAccess(db, userId, documentId, "WRITE");
      if (doc.status !== "EDITING") {
        throw new ProblemError(409, "INVALID_STATE_TRANSITION", "Chỉ upload file cho văn bản đang soạn (EDITING).");
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
      const storageKey = `${doc.workspaceId}/${documentId}/${id}`;
      await storage.put(storageKey, data);
      try {
        const [row] = await db
          .insert(sourceFiles)
          .values({
            id,
            workspaceId: doc.workspaceId,
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

    async list(userId: string, documentId: string, page: number, pageSize: number) {
      await loadDocumentWithAccess(db, userId, documentId, "READ");
      const where = eq(sourceFiles.documentId, documentId);
      const [rows, totals] = await Promise.all([
        db.select().from(sourceFiles).where(where).orderBy(desc(sourceFiles.createdAt), desc(sourceFiles.id))
          .limit(pageSize).offset((page - 1) * pageSize),
        db.select({ n: count() }).from(sourceFiles).where(where),
      ]);
      return { data: rows.map(toSourceFile), pagination: buildPagination(page, pageSize, totals[0]?.n ?? 0) };
    },

    async get(userId: string, fileId: string) {
      return toSourceFile(await fileWithAccess(userId, fileId, "READ"));
    },

    async content(userId: string, fileId: string) {
      const row = await fileWithAccess(userId, fileId, "READ");
      const blob = await storage.get(row.storageKey);
      if (!blob) throw new ProblemError(404, "RESOURCE_NOT_FOUND", "Nội dung file không còn trong storage.");
      return { row, blob };
    },

    async remove(userId: string, fileId: string) {
      const row = await fileWithAccess(userId, fileId, "WRITE");
      await db.delete(sourceFiles).where(eq(sourceFiles.id, row.id));
      await storage.delete(row.storageKey);
    },
  };
}
