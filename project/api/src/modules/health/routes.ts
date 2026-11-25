import { sql } from "drizzle-orm";
import { Elysia } from "elysia";
import type { AppDeps } from "../../deps.js";
import { ProblemError } from "../../lib/problem.js";

export const healthRoutes = ({ db }: AppDeps) =>
  new Elysia({ tags: ["Health"] })
    // Liveness: không chạm DB
    .get("/healthz", () => ({ status: "ok" }))
    // Readiness: kiểm tra DB
    .get("/readyz", async () => {
      try {
        await db.execute(sql`select 1`);
      } catch {
        throw new ProblemError(503, "SERVICE_UNAVAILABLE", "Database chưa sẵn sàng.");
      }
      return { status: "ready", database: "ok" };
    });
