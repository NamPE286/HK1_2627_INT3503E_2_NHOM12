# API Changelog

Theo [Keep a Changelog](https://keepachangelog.com) và semver của contract (`info.version`).

## [1.0.0] — 2026-11-25
### Added
- Xác thực bằng **Better Auth** (`/api/auth/*`: sign-up/email, sign-in/email, sign-out, get-session); phiên cookie hoặc Bearer.
- **Workspace riêng cho mỗi tài khoản**: mọi tài nguyên `/api/v1` thuộc về người tạo; truy cập chéo ⇒ 404.
- `GET /users/me`.
- `LegalDocuments`: list (phân trang, `q`, `doc_type`, `status`, `number`, `issued_after/before`, `sort`, `fields`, header `Link`),
  tạo, xem (ETag/`If-None-Match`), sửa (`If-Match`, state machine DRAFT → PUBLISHED → ARCHIVED), xoá mềm.
- `SourceFiles`: upload PDF/DOCX/TXT (≤ 20 MB, kiểm tra magic bytes, chống trùng SHA-256), list, metadata, tải về, xoá.

### Designed (trong contract, chưa triển khai)
- Content soạn thảo + revisions + provisions, document-relations, violations, sanction-rules, diagrams.

### Removed (so với bản phác thảo 1.0.0-draft)
- `/auth/register|login|refresh|logout` (thay bằng Better Auth), `GET /users`, `PATCH /users/{id}` (bỏ role),
  `visibility` của diagram (không có chia sẻ công khai).
