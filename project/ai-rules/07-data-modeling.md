# 07 — Data modeling & resource design

## 07.1 Resource ≠ bảng DB (MUST)
- API resource thiết kế theo **nghiệp vụ** và nhu cầu consumer, không phản chiếu bảng.
  - `GET /legal-documents/{id}/content` trả JSON editor; trong DB đồng thời có bảng `provisions` được **dẫn xuất** từ content.
  - `GET /violations/{id}` gộp `current_sanctions` (computed) từ `sanction_rules`.
- Không expose cột nội bộ (`owner_id`, `deleted_at`, `storage_key`, `search_vector`, bảng `session`/`account`).
- Bảng DB dùng tên số nhiều snake_case (`legal_documents`); resource dùng kebab-case (`legal-documents`).

## 07.2 Định danh (MUST)
- Primary key: **UUID** (sinh phía server, `uuid4` hoặc `uuid7`). Không lộ ID tự tăng.
- **Mọi bảng nghiệp vụ gốc có `owner_id uuid NOT NULL REFERENCES user(id) ON DELETE CASCADE`** (workspace).
- Khóa nghiệp vụ unique **theo workspace**: `UNIQUE(owner_id, number) WHERE deleted_at IS NULL`,
  `UNIQUE(owner_id, slug)` cho violations; `user.email` unique toàn hệ thống (Better Auth).
- `provisions.path` ổn định trong một revision: `chuong-2/dieu-6/khoan-4/diem-a` — dùng cho trích dẫn.

## 07.3 Quan hệ
| Quan hệ | Ví dụ | Mô hình API |
|---|---|---|
| 1–n | Document → SourceFiles | sub-resource `/legal-documents/{id}/source-files`, item phẳng `/source-files/{id}` |
| 1–n sở hữu | Document → Provisions | sub-resource đọc `/legal-documents/{id}/provisions`, item phẳng `/provisions/{id}` |
| 1–n | Violation → SanctionRules | sub-resource `/violations/{id}/sanction-rules`, item phẳng `/sanction-rules/{id}` |
| n–n có thuộc tính | Document ↔ Document (AMENDS…) | **association resource** `/document-relations` |
| Tự tham chiếu | Provision.parent_id | cây, trả `children` khi `?view=tree` |
| JSON tài liệu | Diagram nodes/edges | lưu JSONB, validate bằng schema |

## 07.4 Migration (MUST)
- Mọi thay đổi schema qua **drizzle-kit** (`bun run db:generate` rồi **review SQL tay** trong `api/drizzle/`).
- Không sửa migration đã merge; tạo migration mới. Thay đổi phá vỡ dùng expand → migrate → contract.
- Seed tách khỏi migration (`bun run demo:seed`), idempotent, chạy cho một workspace demo.

## 07.5 Soft delete & audit (SHOULD)
- `legal_documents`, `violations` soft delete (`deleted_at`); repository mặc định lọc bản ghi đã xoá.
- Cột `created_by`, `updated_by` cho tài nguyên do editor tạo. Revision giữ lịch sử content (không ghi đè).

## 07.6 Concurrency
- Cột `version` (int) tăng mỗi lần ghi; ETag = `W/"<version>"`; update dùng `WHERE id=:id AND version=:v`.
