# ADR 0001 — Tech stack

- Trạng thái: Accepted (sửa đổi 2026-11-25: chuyển từ FastAPI sang ElysiaJS) · Ngày: 2026-11-25

## Bối cảnh
- Môn học chấm chất lượng REST API (OpenAPI, auth, test, hiệu năng, versioning).
- Nhóm quyết định dùng **Better Auth** cho đăng ký/đăng nhập (ADR 0005) — thư viện TypeScript, chạy trong process Node/Bun.
- Repo gốc `INT3011E_6` dùng TypeScript + **Elysia** + Bun ⇒ nhóm đã quen, tái sử dụng được kinh nghiệm/domain.
- Cần tái hiện local đầy đủ (PostgreSQL, Docker, k6) theo yêu cầu tuần 13–15 ⇒ **không** chạy trên Cloudflare Workers như repo gốc.

## Quyết định
| Lớp | Chọn |
|---|---|
| Runtime / package manager / test runner | **Bun** |
| HTTP framework | **ElysiaJS** (validation TypeBox tích hợp, hiệu năng cao, `app.handle(Request)` để test không cần mở cổng) |
| Auth | **Better Auth** (email + mật khẩu, plugin `bearer`, `openAPI`) |
| ORM / migration | **Drizzle ORM** + drizzle-kit (SQL migration đọc được, review được) |
| Database | **PostgreSQL 16**; test dùng **PGlite** (Postgres WASM in-memory) chạy đúng migration thật |
| Frontend | React 19 + Vite + TypeScript, TanStack Query, React Router, better-auth/react, TipTap, @xyflow/react |
| Contract | Design-first `docs/api/openapi.yaml`, Swagger UI phục vụ chính file này, type FE sinh từ file này |

## Hệ quả
- (+) Một ngôn ngữ (TypeScript) cho FE/BE/test; Better Auth tích hợp trực tiếp.
- (+) Test integration chạy < 10 s không cần Docker (PGlite) ⇒ chạy được trong CI/máy yếu.
- (−) Spec viết tay có thể lệch code ⇒ bù bằng contract test (route ⊆ spec) và type FE sinh từ spec.
- (−) Bun/Elysia ít phổ biến hơn Express; rủi ro tương thích thư viện ⇒ chỉ dùng thư viện có hỗ trợ Bun đã kiểm chứng.

## Phương án đã loại
- **FastAPI** (bản phác thảo đầu): không dùng được Better Auth; phải tự làm JWT/refresh rotation.
- Express + Mongoose (gợi ý của môn): dữ liệu quan hệ mạnh (văn bản ↔ điều khoản ↔ chế tài) hợp SQL hơn.
- Giữ Cloudflare Workers + D1 của repo gốc: khó tái hiện local và load test có kiểm soát.
