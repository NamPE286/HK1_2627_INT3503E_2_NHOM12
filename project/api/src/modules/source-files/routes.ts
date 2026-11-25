import { Elysia, t } from "elysia";
import { requireUser } from "../../auth/require-user.js";
import type { AppDeps } from "../../deps.js";
import { linkHeader, PageQuery } from "../../lib/pagination.js";
import { sourceFileService } from "./service.js";

const Uuid = t.String({ format: "uuid" });

/**
 * - POST/GET /legal-documents/{document_id}/source-files   (upload multipart, list)
 * - GET/DELETE /source-files/{file_id} · GET /source-files/{file_id}/content   (item phẳng — ai-rules/01 §01.3)
 */
export const sourceFilesRoutes = ({ db, auth, storage, config }: AppDeps) => {
  const service = sourceFileService(db, storage, config.UPLOAD_MAX_BYTES);

  return new Elysia({ tags: ["SourceFiles"] })
    .use(requireUser(auth))
    .post(
      "/legal-documents/:document_id/source-files",
      async ({ user, params, body, set, request }) => {
        const file = await service.upload(user.id, params.document_id, body.file);
        set.status = 201;
        set.headers.location = `${new URL(request.url).pathname.split("/legal-documents/")[0]}/source-files/${file.id}`;
        return file;
      },
      // t.File không tự giới hạn size/type ở đây để service trả đúng mã lỗi (413/415/422)
      { params: t.Object({ document_id: Uuid }), body: t.Object({ file: t.File() }), parse: "formdata" },
    )
    .get(
      "/legal-documents/:document_id/source-files",
      async ({ user, params, query, request, set }) => {
        const result = await service.list(user.id, params.document_id, query.page ?? 1, query.page_size ?? 20);
        const link = linkHeader(request.url, result.pagination);
        if (link) set.headers.link = link;
        return result;
      },
      { params: t.Object({ document_id: Uuid }), query: t.Object({ page: PageQuery.page, page_size: PageQuery.page_size }) },
    )
    .get("/source-files/:file_id", ({ user, params }) => service.get(user.id, params.file_id), {
      params: t.Object({ file_id: Uuid }),
    })
    .get(
      "/source-files/:file_id/content",
      async ({ user, params }) => {
        const { row, blob } = await service.content(user.id, params.file_id);
        return new Response(blob, {
          headers: {
            "content-type": row.mimeType,
            "content-length": String(row.sizeBytes),
            "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.originalFilename)}`,
            "cache-control": "private, no-store",
            etag: `"${row.sha256}"`,
          },
        });
      },
      { params: t.Object({ file_id: Uuid }) },
    )
    .delete(
      "/source-files/:file_id",
      async ({ user, params, set }) => {
        await service.remove(user.id, params.file_id);
        set.status = 204;
      },
      { params: t.Object({ file_id: Uuid }) },
    );
};
