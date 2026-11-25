import { Elysia } from "elysia";
import { ProblemError } from "../lib/problem.js";
import type { Auth } from "./auth.js";

/**
 * Mặc định DENY: plugin này được `.use()` ở đầu mỗi module /api/v1 ⇒ mọi route của module yêu cầu phiên
 * Better Auth hợp lệ (cookie `better-auth.session_token` hoặc `Authorization: Bearer <session token>`).
 *
 * User đã xác thực CHÍNH LÀ workspace (tenant) của request: service luôn lọc `owner_id = user.id`.
 */
export const requireUser = (auth: Auth) =>
  new Elysia({ name: "require-user", seed: auth }).resolve({ as: "scoped" }, async ({ request, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      throw new ProblemError(401, "UNAUTHENTICATED", "Cần đăng nhập để truy cập tài nguyên này.", {
        headers: { "WWW-Authenticate": 'Bearer realm="trafficlex"' },
      });
    }
    set.headers["cache-control"] = "private, no-store";
    return { user: session.user };
  });
