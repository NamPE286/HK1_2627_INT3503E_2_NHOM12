/**
 * Phân quyền theo workspace (ai-rules/05): mặc định DENY.
 * - Không phải thành viên ⇒ 404 (không lộ sự tồn tại).
 * - Thành viên VIEWER cố ghi ⇒ 403.
 */
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { type MemberRole, workspaceMembers } from "../db/schema/workspaces.js";
import { notFound, ProblemError } from "../lib/problem.js";

export type Access = "READ" | "WRITE";

export async function roleIn(db: Db, workspaceId: string, userId: string): Promise<MemberRole | null> {
  const [m] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  return m?.role ?? null;
}

export function assertAccess(role: MemberRole | null, access: Access, what = "workspace"): MemberRole {
  if (!role) throw notFound(what);
  if (access === "WRITE" && role !== "OWNER") {
    throw new ProblemError(403, "FORBIDDEN", "Bạn chỉ có quyền xem workspace này.");
  }
  return role;
}

export async function requireWorkspace(db: Db, workspaceId: string, userId: string, access: Access) {
  return assertAccess(await roleIn(db, workspaceId, userId), access);
}
