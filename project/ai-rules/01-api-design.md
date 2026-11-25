# 01 — Thiết kế API (resource, naming, methods, status codes)

## 01.1 Resource-oriented (MUST)
- URL định danh **tài nguyên (danh từ)**; HTTP method diễn đạt **hành động**. Không có động từ trong path.
  - ✗ `POST /createDocument`, `GET /getViolations`, `POST /documents/1/delete`
  - ✓ `POST /legal-documents`, `GET /violations`, `DELETE /legal-documents/{document_id}`
- Tìm kiếm là **filter trên collection**: `GET /provisions?q=đỗ xe`, không tạo `/search-provisions`.
- Hành vi đặc biệt mô hình hoá thành **sub-resource** hoặc thay đổi trạng thái:
  - Nội dung soạn thảo: `PUT /legal-documents/{id}/content`
  - Lịch sử: `GET /legal-documents/{id}/revisions`
  - Xuất bản: `PATCH /legal-documents/{id}` với `{"status": "PUBLISHED"}` (state machine, xem 11-domain-rules).

## 01.2 Naming (MUST)
| Thành phần | Quy ước | Ví dụ |
|---|---|---|
| Path | lowercase, **kebab-case**, **số nhiều** cho collection | `/legal-documents`, `/sanction-rules` |
| Path param | snake_case, có hậu tố `_id` | `{document_id}`, `{rule_id}` |
| Query param | snake_case | `?vehicle_type=CAR&issued_after=2024-01-01` |
| JSON field | snake_case | `fine_min_vnd`, `effective_from` |
| Enum value | UPPER_SNAKE_CASE | `PUBLISHED`, `NOT_APPLICABLE` |
| Thời gian | ISO 8601 UTC (`date-time`), ngày dùng `date` | `2026-11-25T08:00:00Z`, `2025-01-01` |
| Tiền | số nguyên, hậu tố đơn vị | `fine_max_vnd: 6000000` |
- Không đuôi file (`.json`) trong URL; dùng `Accept`.
- Current actor dùng `/users/me` (chủ workspace).
- Prefix version: `/api/v1`. Health check nằm ngoài version: `/healthz`, `/readyz`.
- **Ngoại lệ có chủ đích**: `/api/auth/*` do Better Auth định nghĩa (`/sign-in/email`, `/sign-out`…, có động từ) — nằm
  ngoài contract `/api/v1`, không tự thêm route vào prefix này (ADR 0005).

## 01.3 Ba dạng endpoint, độ sâu (MUST)
- Collection `/violations`, item `/violations/{violation_id}`, sub-resource `/violations/{violation_id}/sanction-rules`.
- Độ sâu tối đa **2 cấp resource** (`/a/{id}/b`). Sâu hơn ⇒ flatten: `/sanction-rules/{rule_id}`,
  `/provisions?document_id=...`.
- Item của sub-resource có ID toàn cục được truy cập ở cấp phẳng: `GET /provisions/{provision_id}`.

## 01.4 HTTP methods & idempotency (MUST)
| Method | Dùng cho | Safe | Idempotent | Thành công |
|---|---|---|---|---|
| GET | đọc | ✓ | ✓ | 200 (+ `ETag`) |
| POST | tạo mới trong collection | ✗ | ✗ | **201** + header `Location` + body resource |
| PUT | thay thế toàn bộ (vd `content`) | ✗ | ✓ | 200 |
| PATCH | cập nhật một phần (JSON Merge Patch semantics) | ✗ | ✗* | 200 |
| DELETE | xoá (soft delete nếu có lịch sử) | ✗ | ✓ | **204**, gọi lại ⇒ 404 |
- POST tạo tài nguyên quan trọng **SHOULD** hỗ trợ header `Idempotency-Key` (UUID). Cùng key + cùng body ⇒ trả lại
  response đã lưu; cùng key + body khác ⇒ `409 IDEMPOTENCY_KEY_REUSED`. Lưu key 24h.
- GET không có body, không thay đổi state.

## 01.5 Optimistic concurrency (MUST cho tài nguyên soạn thảo)
- `legal-documents` (content) và `diagrams` trả `ETag` (dạng `W/"<version>"`).
- `PUT /legal-documents/{id}/content` và `PATCH /diagrams/{id}` **yêu cầu** `If-Match`:
  thiếu ⇒ `428 Precondition Required`; lệch ⇒ `412 Precondition Failed`.
- GET hỗ trợ `If-None-Match` ⇒ `304 Not Modified`.

## 01.6 Status codes (MUST)
| Code | Khi nào |
|---|---|
| 200 | GET/PUT/PATCH thành công có body |
| 201 | POST tạo mới (kèm `Location`) |
| 204 | DELETE thành công, logout |
| 304 | ETag khớp `If-None-Match` |
| 400 | JSON hỏng, query param sai kiểu/không hỗ trợ (vd field không tồn tại trong `fields`/`sort`) |
| 401 | Thiếu/sai/hết hạn phiên — kèm `WWW-Authenticate: Bearer` |
| 403 | Dự phòng cho quyền chia sẻ sau này (1.0.0 không có role) |
| 404 | Không tồn tại **hoặc** thuộc workspace khác (ẩn sự tồn tại) |
| 409 | Xung đột trạng thái: trùng `number` văn bản, xoá văn bản đã PUBLISHED, idempotency key reuse |
| 412 / 428 | Lệch / thiếu `If-Match` |
| 413 | File upload vượt giới hạn (20 MB) |
| 415 | Content-Type sai (JSON cho body thường, `multipart/form-data` cho upload) hoặc kiểu file không hỗ trợ |
| 422 | JSON hợp lệ nhưng vi phạm business rule (cấu trúc Điều/Khoản/Điểm sai, `fine_min > fine_max`…) |
| 429 | Vượt rate limit — kèm `Retry-After` |
| 500 | Lỗi không lường trước — message trung tính, log chi tiết phía server |
| 503 | DB không sẵn sàng (`/readyz`) |
- **Không bao giờ** trả `200` + `{"success": false}`.

## 01.7 Representation (MUST)
- Item trả **object trực tiếp** (không bọc `data`). Collection trả `{ "data": [...], "pagination": {...} }`.
- Mọi resource có `id` (UUID v4/v7, không dùng auto-increment lộ ra ngoài), `created_at`, `updated_at`.
- Không trả field nội bộ/nhạy cảm (`password_hash`, `deleted_at`, `token_hash`).
- Tham chiếu tài nguyên khác bằng `<resource>_id`; có thể kèm `?expand=provision` (SHOULD) thay vì nhúng mặc định.

## 01.8 Headers & content negotiation
- Request/response body: `application/json; charset=utf-8`; lỗi: `application/problem+json`.
- `Accept` không hỗ trợ ⇒ `406`.
- Mọi response có `X-Request-Id` (nhận từ client hoặc sinh mới) để trace log.
- Dữ liệu workspace là dữ liệu cá nhân ⇒ `Cache-Control: private, no-store` (đặt trong `requireUser`).
