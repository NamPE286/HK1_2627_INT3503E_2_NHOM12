/** Transport layer: parse request, gọi service, set status/header. Không có business logic / SQL. */
import { Elysia, t } from "elysia";
import { requireUser } from "../../auth/require-user.js";
import type { AppDeps } from "../../deps.js";
import { etagOf, notModified, parseIfMatch } from "../../lib/http.js";
import { linkHeader, parseFields, pick } from "../../lib/pagination.js";
import { FIELDS, LegalDocumentCreate, LegalDocumentUpdate, ListQuery } from "./schemas.js";
import { legalDocumentService } from "./service.js";

const IdParams = t.Object({ document_id: t.String({ format: "uuid" }) });

export const legalDocumentsRoutes = ({ db, auth }: AppDeps) => {
  const service = legalDocumentService(db);

  return new Elysia({ prefix: "/legal-documents", tags: ["LegalDocuments"] })
    .use(requireUser(auth))
    .get(
      "/",
      async ({ user, query, request, set }) => {
        const fields = parseFields(query.fields, FIELDS);
        const result = await service.list(user.id, query);
        const link = linkHeader(request.url, result.pagination);
        if (link) set.headers.link = link;
        return { data: result.data.map((d) => pick(d, fields)), pagination: result.pagination };
      },
      { query: ListQuery },
    )
    .post(
      "/",
      async ({ user, body, set, request }) => {
        const doc = await service.create(user.id, body);
        set.status = 201;
        set.headers.location = `${new URL(request.url).pathname.replace(/\/$/, "")}/${doc.id}`;
        set.headers.etag = etagOf(doc.version);
        return doc;
      },
      { body: LegalDocumentCreate },
    )
    .get(
      "/:document_id",
      async ({ user, params, query, headers, set }) => {
        const doc = await service.get(user.id, params.document_id);
        set.headers.etag = etagOf(doc.version);
        if (notModified(headers["if-none-match"], doc.version)) {
          set.status = 304;
          return;
        }
        return pick(doc, parseFields(query.fields, FIELDS));
      },
      { params: IdParams, query: t.Object({ fields: t.Optional(t.String()) }) },
    )
    .patch(
      "/:document_id",
      async ({ user, params, body, headers, set }) => {
        const doc = await service.update(user.id, params.document_id, body, parseIfMatch(headers["if-match"]));
        set.headers.etag = etagOf(doc.version);
        return doc;
      },
      { params: IdParams, body: LegalDocumentUpdate },
    )
    .delete(
      "/:document_id",
      async ({ user, params, set }) => {
        await service.remove(user.id, params.document_id);
        set.status = 204;
      },
      { params: IdParams },
    );
};
