# API Changelog

Theo [Keep a Changelog](https://keepachangelog.com) và semver của contract (`info.version`).

## [1.0.0] — 2026-11-25 (thiết kế lại: LexImpact)
Bài toán đổi từ "tra cứu mức xử phạt" sang **đánh giá tác động của dự thảo văn bản quy phạm pháp luật**.
Sản phẩm đổi tên **TrafficLex → LexImpact**. Contract 1.0.0 chưa phát hành cho consumer nào nên thay thế trực tiếp.

### Added
- `Workspaces`: `GET/POST /workspaces`, `GET/PATCH/DELETE /workspaces/{workspace_id}`; chia sẻ chỉ đọc qua
  `GET/POST /workspaces/{workspace_id}/members` (role `VIEWER`), `DELETE /workspaces/{workspace_id}/members/{user_id}`.
- `LegalDocuments.kind` (`IN_FORCE` | `DRAFT`); collection chuyển vào `/workspaces/{workspace_id}/legal-documents`.
- `ChangeInstructions`: `/legal-documents/{document_id}/change-instructions`, `/change-instructions/{instruction_id}`
  (AMENDS / SUPPLEMENTS / REPLACES / REPEALS, 409 `CONFLICTING_INSTRUCTION`).
- `ImpactReports`: `GET /legal-documents/{document_id}/impact-report` (singleton chỉ đọc, tính khi đọc, ETag).
- Dẫn chiếu giữa điều khoản: `GET/POST /provisions/{provision_id}/references`, `DELETE /provision-references/{reference_id}`.
- Tìm điều khoản trong workspace: `GET /workspaces/{workspace_id}/provisions`.
- Chế tài gắn trực tiếp vào điều khoản: `/provisions/{provision_id}/sanction-rules`, `/sanction-rules/{rule_id}`.
- Lược đồ thuộc workspace: `/workspaces/{workspace_id}/diagrams`; `from_draft_id` để khởi tạo từ báo cáo tác động.
- Response `403 Forbidden` cho VIEWER cố ghi.

### Changed
- `DocumentStatus`: `DRAFT | PUBLISHED | ARCHIVED` → `EDITING | FINALIZED | ARCHIVED` (tránh nhầm với `kind=DRAFT`).
- Problem `type` URI: `https://leximpact.example/problems/…`.

### Removed
- `Violations`, `DocumentRelations`, `/legal-documents/{id}/relations` (thay bằng change-instructions + references + impact-report).
- `visibility` / node `VIOLATION` trong diagram.

### Trạng thái triển khai
- Code hiện tại (`api/`) vẫn theo mô hình cũ: chưa có workspace/chia sẻ, `GET/POST /legal-documents` chưa chuyển vào
  `/workspaces/{workspace_id}/legal-documents` ⇒ test contract (`api/test/platform.test.ts`) báo lệch cho tới khi code theo spec.
