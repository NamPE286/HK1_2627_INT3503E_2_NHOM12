# TrafficLex API (ElysiaJS · Bun · Better Auth · Drizzle · PostgreSQL)

Contract: [`../docs/api/openapi.yaml`](../docs/api/openapi.yaml) · Rule: [`../ai-rules/`](../ai-rules/README.md)

## Chạy local

```bash
cd project/api
bun install
cp .env.example .env          # sửa BETTER_AUTH_SECRET (>= 32 ký tự)
docker compose -f ../docker-compose.yml up -d db   # hoặc PostgreSQL 16 có sẵn
bun run db:migrate
bun run dev                   # http://localhost:8000
```

| URL | Nội dung |
|---|---|
| `http://localhost:8000/docs` | Swagger UI của contract `/api/v1` |
| `http://localhost:8000/api/auth/reference` | Tài liệu endpoint auth do Better Auth sinh |
| `http://localhost:8000/healthz` · `/readyz` | Liveness / readiness |

## Xác thực (Better Auth)
```bash
# Đăng ký (tự đăng nhập)
curl -i -X POST localhost:8000/api/auth/sign-up/email -H 'content-type: application/json' \
  -d '{"email":"nam@example.com","password":"S3cure!pass","name":"Nam"}'
# Đăng nhập → header set-auth-token (+ cookie better-auth.session_token cho SPA)
curl -i -X POST localhost:8000/api/auth/sign-in/email -H 'content-type: application/json' \
  -d '{"email":"nam@example.com","password":"S3cure!pass"}'
# Gọi API
curl localhost:8000/api/v1/users/me -H "authorization: Bearer <set-auth-token>"
```
Mỗi tài khoản là một **workspace riêng**: chỉ thấy văn bản/file/lược đồ của mình; tài nguyên của tài khoản khác ⇒ 404.

## Chức năng 1.0.0
| Method | Path | |
|---|---|---|
| GET | `/api/v1/users/me` | Người dùng hiện tại |
| GET / POST | `/api/v1/legal-documents` | List (page, page_size, q, doc_type, status, number, issued_after/before, sort, fields) / tạo |
| GET / PATCH / DELETE | `/api/v1/legal-documents/{document_id}` | ETag, If-Match, If-None-Match, state machine |
| POST / GET | `/api/v1/legal-documents/{document_id}/source-files` | Upload (multipart `file`: PDF/DOCX/TXT ≤ 20 MB) / list |
| GET / DELETE | `/api/v1/source-files/{file_id}` | Metadata / xoá |
| GET | `/api/v1/source-files/{file_id}/content` | Tải file gốc |

## Kiểm thử
```bash
bun test                 # unit + integration + contract (PGlite in-memory, không cần Postgres)
bun test --coverage
bun run typecheck
bun run lint:spec        # Spectral
bun run test:newman      # Postman collection, cần server đang chạy
k6 run -e TOKEN=... perf/k6-list-documents.js
```

## Cấu trúc
```
src/
├── app.ts                 # createApp(deps): CORS, request-id, lỗi problem+json, Better Auth mount, /api/v1
├── index.ts               # khởi động server
├── config.ts              # env (zod)
├── auth/                  # Better Auth config + requireUser (tenant = user)
├── db/                    # Drizzle schema, client, migrate
├── lib/                   # problem.ts (RFC 9457), pagination, http (ETag), logger
├── storage/               # FileStorage (đĩa cục bộ; có thể thay S3/R2)
└── modules/<resource>/    # routes.ts (transport) · service.ts (nghiệp vụ + truy cập DB) · schemas.ts (DTO)
drizzle/                   # migration SQL (bun run db:generate sau khi sửa schema)
test/                      # bun:test
postman/  perf/
```
