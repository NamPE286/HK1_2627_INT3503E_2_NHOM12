/**
 * Better Auth — đăng ký / đăng nhập email + mật khẩu (ADR 0005).
 * Route: /api/auth/* (sign-up/email, sign-in/email, sign-out, get-session …), tài liệu: /api/auth/reference.
 * Phiên: cookie httpOnly cho SPA; plugin `bearer` cho client khác (Authorization: Bearer <session token>).
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, openAPI } from "better-auth/plugins";
import type { Config } from "../config.js";
import type { Db } from "../db/client.js";
import * as schema from "../db/schema/auth.js";
import { workspaceMembers, workspaces } from "../db/schema/workspaces.js";

// Argon2id (Bun.password) theo khuyến nghị OWASP / bài giảng B6: m = 64 MiB, t = 3
const ARGON2 = { algorithm: "argon2id", memoryCost: 65536, timeCost: 3 } as const;

export function createAuth(db: Db, config: Config) {
  return betterAuth({
    appName: "LexImpact",
    baseURL: config.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: config.CORS_ORIGINS,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      password: {
        hash: (password) => Bun.password.hash(password, ARGON2),
        verify: ({ hash: stored, password }) => Bun.password.verify(password, stored),
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 ngày
      updateAge: 60 * 60 * 24, // gia hạn mỗi ngày khi còn dùng
    },
    rateLimit: {
      enabled: config.NODE_ENV !== "test",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
      },
    },
    advanced: {
      database: { generateId: "uuid" },
      useSecureCookies: config.NODE_ENV === "production",
    },
    databaseHooks: {
      user: {
        create: {
          // Mỗi tài khoản mới có sẵn một workspace của riêng mình (OWNER)
          after: async (created) => {
            const [ws] = await db
              .insert(workspaces)
              .values({ name: `Workspace của ${created.name}`, ownerId: created.id })
              .returning({ id: workspaces.id });
            await db.insert(workspaceMembers).values({ workspaceId: ws!.id, userId: created.id, role: "OWNER" });
          },
        },
      },
    },
    plugins: [bearer(), openAPI()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type SessionUser = Auth["$Infer"]["Session"]["user"];
