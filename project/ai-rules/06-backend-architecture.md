# 06 — Kiến trúc backend

## 06.1 Stack (MUST — ADR 0001)
**Bun** (runtime, test runner, package manager) · **ElysiaJS** · TypeBox (`t`, validation có sẵn của Elysia) ·
**Better Auth** · **Drizzle ORM** + drizzle-kit · **PostgreSQL 16** (PGlite trong test) · zod (chỉ để đọc env).
Chỉ dùng `bun` (không npm/yarn/pnpm) trong `api/`.

## 06.2 Layering (MUST)
```
api/src/
├── index.ts               # khởi động: loadConfig → createPgDb → createAuth → createApp(...).listen()
├── app.ts                 # createApp(deps): CORS, request-id, 415, onError → problem+json, mount Better Auth, /api/v1
├── config.ts              # env (zod), không đọc process.env ở nơi khác
├── deps.ts                # AppDeps { db, auth, config, storage } — inject để test thay bằng PGlite
├── auth/                  # auth.ts (Better Auth), require-user.ts (guard + tenant)
├── db/schema/*.ts         # Drizzle schema (một file / nhóm bảng), index.ts export tất cả
├── lib/                   # problem.ts, pagination.ts, http.ts (ETag/If-Match), logger.ts
├── storage/               # FileStorage interface + local disk
└── modules/<resource>/
    ├── routes.ts          # Transport: khai báo route + schema (params/query/body), set status/header. KHÔNG SQL/nghiệp vụ
    ├── schemas.ts         # TypeBox DTO input + hàm toXxx() map row → representation
    └── service.ts         # Nghiệp vụ + truy vấn Drizzle, luôn nhận ownerId, throw ProblemError
```
- `routes → service → db`. Module khác chỉ gọi **service** của nhau, không import `routes`.
- Mỗi module là một factory `xxxRoutes(deps) => new Elysia(...)`; không dùng biến global/singleton cho DB.
- Service không phụ thuộc Elysia (`Context`, `set`) ⇒ unit test được.
- Khi service lớn (> ~300 dòng) tách `repository.ts` cho truy vấn.
- Không dùng `t.UnionEnum` trong `t.Optional` (Elysia tự điền default) — dùng helper `enumString()`.

## 06.3 Config & 12-factor (MUST)
- Biến: `NODE_ENV, PORT, DATABASE_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET, CORS_ORIGINS, UPLOAD_DIR, UPLOAD_MAX_BYTES, LOG_LEVEL`.
- Thêm biến ⇒ cập nhật `config.ts` + `.env.example` + `docker-compose.yml`.

## 06.4 Logging & observability (MUST)
- Log JSON một dòng: `ts, level, msg, request_id, method, path, status, duration_ms`.
- `X-Request-Id` nhận từ client (≤ 64 ký tự) hoặc sinh mới; có trong response và problem+json.
- Request > 500 ms ⇒ `warn`. Lỗi không lường trước ⇒ `error` kèm stack (chỉ trong log).

## 06.5 Health (MUST)
`GET /healthz` (liveness, không chạm DB) · `GET /readyz` (`select 1`, lỗi ⇒ 503). Không gộp.

## 06.6 Database & migration (MUST)
- Sửa `src/db/schema/*.ts` → `bun run db:generate` → **review SQL** trong `drizzle/` → commit cùng code.
- Không sửa migration đã merge. Breaking schema: expand → migrate → contract.
- Bảng Better Auth (`user, session, account, verification`) đối chiếu `bunx @better-auth/cli generate` khi nâng cấp.

## 06.7 File storage
- Nội dung file nằm ở `FileStorage` (đĩa: `UPLOAD_DIR`, volume Docker); DB chỉ giữ metadata + `sha256` + `storage_key`.
- Ghi file trước, insert DB sau; insert lỗi ⇒ xoá file (không để file mồ côi).

## 06.8 Docker (MUST tuần 14)
`api/Dockerfile` (oven/bun, user không phải root, chạy migration rồi start) · `docker-compose.yml`: `db` (healthcheck),
`api` (`depends_on: service_healthy`, volume uploads), `web` (nginx, proxy `/api`).
