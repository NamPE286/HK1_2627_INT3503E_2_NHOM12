import { Elysia, t } from "elysia";
import { requireUser } from "../../auth/require-user.js";
import type { AppDeps } from "../../deps.js";
import { enumString } from "../../lib/enum.js";
import { PageQuery } from "../../lib/pagination.js";
import { MEMBER_ROLES } from "../../db/schema/workspaces.js";
import { workspaceService } from "./service.js";

const Uuid = t.String({ format: "uuid" });
const Name = t.String({ minLength: 1, maxLength: 120 });
const Paging = { page: PageQuery.page, page_size: PageQuery.page_size };

export const workspacesRoutes = ({ db, auth, storage }: AppDeps) => {
  const service = workspaceService(db, storage);
  const ws = t.Object({ workspace_id: Uuid });

  return new Elysia({ prefix: "/workspaces", tags: ["Workspaces"] })
    .use(requireUser(auth))
    .get("/", ({ user, query }) => service.list(user.id, query.role, query.page ?? 1, query.page_size ?? 20), {
      query: t.Object({ ...Paging, role: t.Optional(enumString(MEMBER_ROLES)) }, { additionalProperties: false }),
    })
    .post(
      "/",
      async ({ user, body, set }) => {
        const w = await service.create(user.id, body.name);
        set.status = 201;
        set.headers.location = `/api/v1/workspaces/${w.id}`;
        return w;
      },
      { body: t.Object({ name: Name }, { additionalProperties: false }) },
    )
    .get("/:workspace_id", ({ user, params }) => service.get(user.id, params.workspace_id), { params: ws })
    .patch("/:workspace_id", ({ user, params, body }) => service.rename(user.id, params.workspace_id, body.name), {
      params: ws,
      body: t.Object({ name: Name }, { additionalProperties: false }),
    })
    .delete(
      "/:workspace_id",
      async ({ user, params, set }) => {
        await service.remove(user.id, params.workspace_id);
        set.status = 204;
      },
      { params: ws },
    )
    .get(
      "/:workspace_id/members",
      ({ user, params, query }) => service.listMembers(user.id, params.workspace_id, query.page ?? 1, query.page_size ?? 20),
      { params: ws, query: t.Object(Paging, { additionalProperties: false }) },
    )
    .post(
      "/:workspace_id/members",
      async ({ user, params, body, set }) => {
        const m = await service.share(user.id, params.workspace_id, body.email);
        set.status = 201;
        set.headers.location = `/api/v1/workspaces/${params.workspace_id}/members/${m.user.id}`;
        return m;
      },
      {
        params: ws,
        body: t.Object(
          { email: t.String({ format: "email", maxLength: 254 }), role: t.Literal("VIEWER") },
          { additionalProperties: false },
        ),
      },
    )
    .delete(
      "/:workspace_id/members/:user_id",
      async ({ user, params, set }) => {
        await service.revoke(user.id, params.workspace_id, params.user_id);
        set.status = 204;
      },
      { params: t.Object({ workspace_id: Uuid, user_id: Uuid }) },
    );
};
