# LexImpact — Bài tập lớn INT3505E_2 · Nhóm 12

Tra cứu & biên tập chế tài xử phạt vi phạm giao thông đường bộ theo **Điều/Khoản/Điểm**, có **trình soạn thảo văn bản
pháp luật** và **vẽ lược đồ thủ công**. Mỗi tài khoản là một **workspace riêng** (bộ văn bản, file gốc, lược đồ riêng).

> Đọc [`AGENTS.md`](AGENTS.md) và toàn bộ [`ai-rules/`](ai-rules/README.md) trước khi làm việc.

| Thư mục | Nội dung |
|---|---|
| [`docs/`](docs/README.md) | Brief, requirements, ERD, kiến trúc, API design, OpenAPI, test, security, versioning, plan, ADR, ảnh bằng chứng |
| [`ai-rules/`](ai-rules/README.md) | Rule bắt buộc theo yêu cầu môn học (cho người và AI agent) |
| [`api/`](api/README.md) | Backend: Bun · ElysiaJS · Better Auth · Drizzle · PostgreSQL |
| [`frontend/`](frontend/README.md) | Frontend: React · Vite · TypeScript · better-auth/react |

## Phiên bản 1.0.0
- Đăng ký / đăng nhập / đăng xuất (Better Auth, Argon2id, rate limit).
- Workspace riêng: mọi dữ liệu thuộc tài khoản tạo ra nó; tài khoản khác nhận 404.
- Văn bản: list (phân trang, lọc, sắp xếp, `fields`), tạo, xem, sửa (ETag/If-Match), xuất bản/lưu trữ, xoá nháp.
- Upload file gốc PDF/DOCX/TXT (≤ 20 MB, kiểm tra magic bytes), tải về, xoá.
- Đã thiết kế trong contract, chưa làm: soạn thảo Điều/Khoản/Điểm, hành vi & chế tài, quan hệ văn bản, lược đồ.

## Chạy nhanh
```bash
cd project && docker compose up --build
# Web: http://localhost:8080 · API docs: http://localhost:8000/docs · Auth docs: http://localhost:8000/api/auth/reference
```
Chạy dev từng phần: xem [`api/README.md`](api/README.md) và [`frontend/README.md`](frontend/README.md).
