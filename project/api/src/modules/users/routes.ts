import { Elysia } from "elysia";
import { requireUser } from "../../auth/require-user.js";
import type { AppDeps } from "../../deps.js";

/** DTO: chỉ trả field công khai (không lộ session/account/password). */
export const usersRoutes = ({ auth }: AppDeps) =>
  new Elysia({ prefix: "/users" }).use(requireUser(auth)).get("/me", ({ user }) => ({
    id: user.id,
    email: user.email,
    display_name: user.name,
    email_verified: user.emailVerified,
    created_at: new Date(user.createdAt).toISOString(),
    updated_at: new Date(user.updatedAt).toISOString(),
  }));
