# AGENTS.md — LexImpact (Bài tập lớn INT3505E_2 · Nhóm 12)

> File này dành cho **mọi AI agent** (Claude Code, Codex, Cursor, Copilot…) và cả thành viên mới.
> **Bắt buộc đọc toàn bộ rule trong `ai-rules/` trước khi viết code, sửa spec hoặc viết docs.**
> Nếu một yêu cầu mâu thuẫn với rule, dừng lại và hỏi người giao việc — không tự ý bỏ qua rule.

## 1. Bối cảnh

- Môn học: **INT3505E_2 — Kiến trúc hướng dịch vụ (SOA) / API Design**. Điểm bài tập nhóm = 40%.
- Dự án: **LexImpact** — cơ sở tri thức về hành vi vi phạm giao thông đường bộ và chế tài xử phạt hành chính,
  có **trình soạn thảo văn bản pháp luật** (chèn header Điều/Khoản/Điểm) và **trình vẽ lược đồ thủ công**
  (quan hệ giữa văn bản / điều khoản / hành vi). Ý tưởng gốc kế thừa từ repo `NamPE286/INT3011E_6`.
- **Mỗi tài khoản là một workspace (instance) riêng**: có bộ văn bản, file gốc và lược đồ của riêng mình.
- Phiên bản hiện tại **1.0.0**: đăng ký/đăng nhập (Better Auth), CRUD + list văn bản, upload file gốc (PDF/DOCX/TXT).
- Trọng tâm chấm điểm: **chất lượng API** (thiết kế, OpenAPI, auth, kiểm thử, hiệu năng, versioning),
  không phải độ phức tạp của UI.

## 2. Thứ tự đọc bắt buộc

1. `ai-rules/README.md` — mục lục rule và mức độ (MUST / SHOULD).
2. **Toàn bộ** các file `ai-rules/00-*.md` → `ai-rules/11-*.md` theo đúng thứ tự số.
3. `ai-rules/checklist.md` — checklist tự review trước khi commit/PR.
4. `docs/01-project-brief.md`, `docs/02-requirements.md` — phạm vi MVP và business rules.
5. `docs/api/openapi.yaml` — **API contract là nguồn sự thật duy nhất (single source of truth)**.
6. Docs liên quan tới phần việc (`docs/03`→`docs/09`, `docs/adr/`).

Agent phải xác nhận ngắn gọn trong phản hồi đầu tiên rằng đã đọc các rule liên quan (liệt kê tên file).

## 3. Cấu trúc thư mục

```
project/
├── AGENTS.md            ← bạn đang đọc
├── ai-rules/            ← rule bắt buộc (API, lỗi, auth, test, versioning, frontend, nghiệp vụ)
├── docs/                ← brief, requirements, domain model, kiến trúc, API, test, security, lifecycle, plan
│   ├── api/openapi.yaml ← API contract (design-first)
│   └── adr/             ← Architecture Decision Records
├── api/                 ← Backend: Bun + ElysiaJS + Better Auth + Drizzle ORM + PostgreSQL
├── frontend/            ← Frontend: Bun + React + Vite + TypeScript (better-auth/react, TipTap, React Flow)
└── docker-compose.yml   ← db + api + web
```

## 4. Quy tắc vàng (tóm tắt — chi tiết trong `ai-rules/`)

1. **Design-first**: sửa `docs/api/openapi.yaml` *trước*, rồi mới implement. Không có endpoint nào ngoài contract.
2. URL là **danh từ số nhiều, lowercase, kebab-case**; query & JSON field **snake_case**; prefix `/api/v1`.
3. Status code đúng ngữ nghĩa; **không bao giờ trả 200 kèm lỗi trong body**.
4. Mọi lỗi trả **RFC 9457 `application/problem+json`** với `type, title, status, detail, instance, code`.
5. Mọi collection có **phân trang** (`page`, `page_size` ≤ 100), filter, sort, `fields`.
6. Auth: **Better Auth** (`/api/auth/*`, cookie httpOnly hoặc `Authorization: Bearer`), **Argon2id**. Mặc định **deny**:
   mọi module `/api/v1` dùng `requireUser`; mọi truy vấn lọc `owner_id` (workspace khác ⇒ 404, chống BOLA/mass-assignment).
7. Layering: `routes.ts → service.ts → Drizzle`; DTO (`schemas.ts`, `toXxx()`) tách khỏi row DB; không lộ field nội bộ.
8. Mỗi endpoint có test: happy path, validation (400/422), 401, 403, 404, idempotency PUT/DELETE.
9. Breaking change ⇒ version mới + `Deprecation`/`Sunset` header + ghi ADR. Không phá v1.
10. **Không commit secret** (`.env`, key, token). Dùng `.env.example`.
11. Nghiệp vụ pháp lý: không bịa mức phạt/điều khoản; mọi chế tài phải trỏ tới `provision_id` nguồn.
12. Mọi việc "đã xong" phải có **bằng chứng**: commit/PR, test result, response mẫu (giảng viên hỏi ngẫu nhiên).

## 5. Lệnh thường dùng

```bash
# Backend (chỉ dùng bun)
cd project/api && bun install && cp .env.example .env
bun run db:migrate && bun run dev        # http://localhost:8000/docs
bun test                                 # unit + integration + contract (PGlite, không cần Postgres)
bun run typecheck && bun run lint:spec   # tsc + Spectral
bun run test:newman                      # Postman collection (server đang chạy)
# Frontend
cd project/frontend && bun install && bun run dev   # http://localhost:5173 (proxy /api → :8000)
bun run gen:api                          # sinh type từ docs/api/openapi.yaml
# Toàn bộ stack
cd project && docker compose up --build  # web :8080, api :8000
```

## 6. Git

- Nhánh: `<tên-viết-tắt>/<chủ-đề>` (vd `nambh/setup`, `tu/auth-api`). Không push thẳng `main`.
- Commit theo Conventional Commits: `feat(api): ...`, `fix(frontend): ...`, `docs: ...`, `test: ...`, `chore: ...`.
- PR phải điền checklist trong `ai-rules/checklist.md` và link issue/backlog.
