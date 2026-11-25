/**
 * Application factory (ElysiaJS). `createApp(deps)` để test inject DB (PGlite) — xem test/helpers.ts.
 *
 *   /api/auth/*          Better Auth (sign-up/email, sign-in/email, sign-out, get-session…) — ADR 0005
 *   /api/v1/*            API nghiệp vụ (workspace & chia sẻ, văn bản, file gốc, …) theo docs/api/openapi.yaml (mặc định yêu cầu đăng nhập)
 *   /docs                Swagger UI của contract · /api/v1/openapi.json
 *   /healthz · /readyz   Ops
 */
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import type { AppDeps } from "./deps.js";
import { log } from "./lib/logger.js";
import { ProblemError, problemResponse } from "./lib/problem.js";
import { healthRoutes } from "./modules/health/routes.js";
import { legalDocumentsRoutes } from "./modules/legal-documents/routes.js";
import { sourceFilesRoutes } from "./modules/source-files/routes.js";
import { usersRoutes } from "./modules/users/routes.js";
import { workspacesRoutes } from "./modules/workspaces/routes.js";
import { openapiRoutes } from "./openapi.js";

const requestIds = new WeakMap<Request, { id: string; start: number }>();
const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);

function fromValidation(error: unknown, method: string): ProblemError {
  const e = error as { type?: string; all?: { path?: string; message?: string; summary?: string }[] };
  const errors = (e.all ?? []).map((i) => ({
    field: (i.path ?? "").replace(/^\//, "").replaceAll("/", "."),
    code: "INVALID",
    message: i.summary ?? i.message ?? "Không hợp lệ",
  }));
  // Query/params sai ⇒ 400; body vi phạm schema ⇒ 422 (ai-rules/01 §01.6)
  // Lỗi ép kiểu (vd t.Numeric) có thể không mang `type` ⇒ suy ra từ method: request không có body ⇒ lỗi tham số
  const isParamError = e.type ? e.type !== "body" : !BODY_METHODS.has(method);
  if (isParamError) {
    return new ProblemError(400, "INVALID_QUERY_PARAMETER", "Tham số không hợp lệ.", {
      title: "Invalid query parameter",
      errors,
    });
  }
  return new ProblemError(422, "VALIDATION_ERROR", "Request body không hợp lệ.", { errors });
}

export function createApp(deps: AppDeps) {
  const { auth, config } = deps;

  return (
    new Elysia({ normalize: false })
      .use(
        cors({
          origin: config.CORS_ORIGINS,
          credentials: true,
          methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
          allowedHeaders: ["Authorization", "Content-Type", "If-Match", "If-None-Match", "Idempotency-Key", "X-Request-Id"],
          exposeHeaders: ["ETag", "Location", "Link", "X-Request-Id", "Retry-After", "set-auth-token"],
        }),
      )
      // ── Request context: X-Request-Id + security headers + 415 cho body không phải JSON ──
      .onRequest(({ request, set }) => {
        const incoming = request.headers.get("x-request-id");
        const id = incoming && incoming.length <= 64 ? incoming : crypto.randomUUID();
        requestIds.set(request, { id, start: performance.now() });
        set.headers["x-request-id"] = id;
        set.headers["x-content-type-options"] = "nosniff";

        const path = new URL(request.url).pathname;
        const ct = request.headers.get("content-type") ?? "";
        const hasBody = request.body !== null;
        if (path.startsWith("/api/v1/") && BODY_METHODS.has(request.method) && hasBody) {
          // Upload file dùng multipart/form-data; mọi body khác phải là JSON
          const isUpload = path.endsWith("/source-files");
          const ok = isUpload ? /^multipart\/form-data\b/i.test(ct) : /^application\/(merge-patch\+)?json\b/i.test(ct);
          if (!ok) {
            const expected = isUpload ? "multipart/form-data" : "application/json";
            return problemResponse(
              new ProblemError(415, "UNSUPPORTED_MEDIA_TYPE", `Content-Type phải là ${expected}.`),
              path,
              id,
            );
          }
        }
      })
      .onAfterResponse(({ request, set }) => {
        const ctx = requestIds.get(request);
        if (!ctx) return;
        const ms = Math.round((performance.now() - ctx.start) * 100) / 100;
        log(ms > 500 ? "warn" : "info", "request", {
          request_id: ctx.id,
          method: request.method,
          path: new URL(request.url).pathname,
          status: set.status,
          duration_ms: ms,
        });
      })
      // ── Lỗi toàn cục → application/problem+json (RFC 9457) ──
      .onError(({ code, error, request }) => {
        const requestId = requestIds.get(request)?.id ?? crypto.randomUUID();
        const path = new URL(request.url).pathname;
        let problem: ProblemError;
        if (error instanceof ProblemError) problem = error;
        else if (code === "VALIDATION") problem = fromValidation(error, request.method);
        else if (code === "PARSE") problem = new ProblemError(400, "MALFORMED_REQUEST", "Body không phải JSON hợp lệ.");
        else if (code === "NOT_FOUND") problem = new ProblemError(404, "RESOURCE_NOT_FOUND", `Không có route ${path}.`);
        else {
          // Log chi tiết phía server, trả message trung tính (không lộ stack trace / SQL)
          log("error", "unhandled_error", { request_id: requestId, path, error: String(error), stack: (error as Error)?.stack });
          problem = new ProblemError(500, "INTERNAL_ERROR", "Đã có lỗi xảy ra, vui lòng thử lại sau.");
        }
        return problemResponse(problem, path, requestId);
      })
      // ── Better Auth: xử lý toàn bộ /api/auth/* (không để Elysia parse body) ──
      .all("/api/auth/*", ({ request }) => auth.handler(request), { parse: "none" })
      .use(healthRoutes(deps))
      .use(openapiRoutes)
      .group("/api/v1", (v1) => v1.use(usersRoutes(deps)).use(workspacesRoutes(deps)).use(legalDocumentsRoutes(deps)).use(sourceFilesRoutes(deps)))
  );
}

export type App = ReturnType<typeof createApp>;
