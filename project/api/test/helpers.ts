/** App test với PGlite (PostgreSQL in-memory, WASM) — không cần Postgres/Docker. */
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createApp } from "../src/app";
import { createAuth } from "../src/auth/auth";
import { loadConfig } from "../src/config";
import type { Db } from "../src/db/client";
import * as schema from "../src/db/schema";
import { localFileStorage } from "../src/storage/file-storage";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const BASE = "http://localhost:8000";

export async function makeTestApp() {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Db;
  await migrate(drizzle(client), { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
  const config = loadConfig({ ...process.env, NODE_ENV: "test", CORS_ORIGINS: "http://localhost:5173" });
  const auth = createAuth(db, config);
  const uploadDir = mkdtempSync(join(tmpdir(), "trafficlex-test-"));
  const app = createApp({ db, auth, config: { ...config, UPLOAD_MAX_BYTES: 1024 * 1024 }, storage: localFileStorage(uploadDir) });

  const request = (path: string, init: RequestInit & { json?: unknown; token?: string; form?: FormData } = {}) => {
    const headers = new Headers(init.headers);
    let body = init.body;
    if (init.form) body = init.form; // Request tự đặt multipart boundary
    if (init.json !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(init.json);
    }
    if (init.token) headers.set("authorization", `Bearer ${init.token}`);
    return app.handle(new Request(BASE + path, { ...init, headers, body }));
  };

  /** Đăng ký qua Better Auth; trả session token (plugin bearer → header set-auth-token). */
  const signUp = async (email: string, password = "S3cure!pass", name = "Test User") => {
    const res = await request("/api/auth/sign-up/email", { method: "POST", json: { email, password, name } });
    if (res.status !== 200) throw new Error(`sign-up failed ${res.status}: ${await res.text()}`);
    const token = res.headers.get("set-auth-token");
    if (!token) throw new Error("missing set-auth-token");
    return { token, user: ((await res.json()) as { user: { id: string } }).user };
  };

  return { app, db, request, signUp, close: async () => { await client.close(); rmSync(uploadDir, { recursive: true, force: true }); } };
}

export type TestApp = Awaited<ReturnType<typeof makeTestApp>>;
