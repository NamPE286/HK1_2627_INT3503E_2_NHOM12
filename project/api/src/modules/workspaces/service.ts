/** Workspace & chia sẻ chỉ đọc (members). */
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { requireWorkspace } from "../../auth/workspace-access.js";
import type { Db } from "../../db/client.js";
import { user } from "../../db/schema/auth.js";
import { sourceFiles } from "../../db/schema/source-files.js";
import { type MemberRole, workspaceMembers, workspaces } from "../../db/schema/workspaces.js";
import { buildPagination } from "../../lib/pagination.js";
import { ProblemError } from "../../lib/problem.js";
import type { FileStorage } from "../../storage/file-storage.js";

const userSummary = (u: { id: string; name: string; email: string }) => ({
  id: u.id,
  display_name: u.name,
  email: u.email,
});

export function workspaceService(db: Db, storage: FileStorage) {
  async function toWorkspace(workspaceId: string, myRole: MemberRole) {
    const [row] = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
        ownerId: user.id,
        ownerName: user.name,
        ownerEmail: user.email,
        memberCount: sql<number>`(select count(*)::int from ${workspaceMembers} m where m.workspace_id = ${workspaces.id})`,
      })
      .from(workspaces)
      .innerJoin(user, eq(user.id, workspaces.ownerId))
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    if (!row) throw new ProblemError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy workspace.");
    return {
      id: row.id,
      name: row.name,
      owner: userSummary({ id: row.ownerId, name: row.ownerName, email: row.ownerEmail }),
      my_role: myRole,
      member_count: Number(row.memberCount),
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    };
  }

  return {
    async list(userId: string, role: MemberRole | undefined, page: number, pageSize: number) {
      const where = and(eq(workspaceMembers.userId, userId), role ? eq(workspaceMembers.role, role) : undefined);
      const [rows, totals] = await Promise.all([
        db
          .select({ id: workspaceMembers.workspaceId, role: workspaceMembers.role })
          .from(workspaceMembers)
          .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
          .where(where)
          // Workspace của tôi trước, rồi tới workspace được chia sẻ
          .orderBy(sql`case when ${workspaceMembers.role} = 'OWNER' then 0 else 1 end`, asc(workspaces.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db.select({ n: count() }).from(workspaceMembers).where(where),
      ]);
      const data = [];
      for (const r of rows) data.push(await toWorkspace(r.id, r.role));
      return { data, pagination: buildPagination(page, pageSize, totals[0]?.n ?? 0) };
    },

    async get(userId: string, workspaceId: string) {
      const role = await requireWorkspace(db, workspaceId, userId, "READ");
      return toWorkspace(workspaceId, role);
    },

    async create(userId: string, name: string) {
      const [ws] = await db.insert(workspaces).values({ name: name.trim(), ownerId: userId }).returning();
      await db.insert(workspaceMembers).values({ workspaceId: ws!.id, userId, role: "OWNER" });
      return toWorkspace(ws!.id, "OWNER");
    },

    async rename(userId: string, workspaceId: string, name: string) {
      await requireWorkspace(db, workspaceId, userId, "WRITE");
      await db.update(workspaces).set({ name: name.trim(), updatedAt: new Date() }).where(eq(workspaces.id, workspaceId));
      return toWorkspace(workspaceId, "OWNER");
    },

    async remove(userId: string, workspaceId: string) {
      await requireWorkspace(db, workspaceId, userId, "WRITE");
      const files = await db
        .select({ key: sourceFiles.storageKey })
        .from(sourceFiles)
        .where(eq(sourceFiles.workspaceId, workspaceId));
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId)); // cascade văn bản, file, thành viên
      for (const f of files) await storage.delete(f.key);
    },

    async listMembers(userId: string, workspaceId: string, page: number, pageSize: number) {
      await requireWorkspace(db, workspaceId, userId, "READ");
      const where = eq(workspaceMembers.workspaceId, workspaceId);
      const [rows, totals] = await Promise.all([
        db
          .select({ id: user.id, name: user.name, email: user.email, role: workspaceMembers.role, addedAt: workspaceMembers.addedAt })
          .from(workspaceMembers)
          .innerJoin(user, eq(user.id, workspaceMembers.userId))
          .where(where)
          .orderBy(sql`case when ${workspaceMembers.role} = 'OWNER' then 0 else 1 end`, asc(workspaceMembers.addedAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db.select({ n: count() }).from(workspaceMembers).where(where),
      ]);
      return {
        data: rows.map((r) => ({ user: userSummary(r), role: r.role, added_at: r.addedAt.toISOString() })),
        pagination: buildPagination(page, pageSize, totals[0]?.n ?? 0),
      };
    },

    async share(userId: string, workspaceId: string, email: string) {
      await requireWorkspace(db, workspaceId, userId, "WRITE");
      const [target] = await db
        .select({ id: user.id, name: user.name, email: user.email })
        .from(user)
        .where(eq(user.email, email.trim().toLowerCase()))
        .limit(1);
      if (!target) {
        throw new ProblemError(422, "MEMBER_NOT_REGISTERED", "Email này chưa có tài khoản LexImpact.", {
          title: "Member not registered",
          errors: [{ field: "email", code: "NOT_REGISTERED", message: "Người được chia sẻ cần đăng ký trước" }],
        });
      }
      const existing = await db
        .select({ role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), inArray(workspaceMembers.userId, [target.id])))
        .limit(1);
      if (existing.length) {
        throw new ProblemError(409, "DUPLICATE_RESOURCE", "Người này đã là thành viên của workspace.", {
          title: "Duplicate resource",
        });
      }
      const [m] = await db
        .insert(workspaceMembers)
        .values({ workspaceId, userId: target.id, role: "VIEWER" })
        .returning();
      return { user: userSummary(target), role: m!.role, added_at: m!.addedAt.toISOString() };
    },

    async revoke(userId: string, workspaceId: string, memberUserId: string) {
      const myRole = await requireWorkspace(db, workspaceId, userId, "READ");
      const [target] = await db
        .select({ role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, memberUserId)))
        .limit(1);
      if (!target) throw new ProblemError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy thành viên.");
      if (target.role === "OWNER") {
        throw new ProblemError(409, "CANNOT_REMOVE_OWNER", "Không thể xoá chủ workspace.", { title: "Cannot remove owner" });
      }
      // OWNER thu hồi người khác; VIEWER chỉ tự rời
      if (myRole !== "OWNER" && memberUserId !== userId) {
        throw new ProblemError(403, "FORBIDDEN", "Chỉ chủ workspace được thu hồi quyền của người khác.");
      }
      await db
        .delete(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, memberUserId)));
    },
  };
}
