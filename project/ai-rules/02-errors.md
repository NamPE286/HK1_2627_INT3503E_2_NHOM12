# 02 — Error response (RFC 9457 Problem Details)

## 02.1 Định dạng (MUST)
Mọi lỗi 4xx/5xx trả `Content-Type: application/problem+json`:

```json
{
  "type": "https://leximpact.example/problems/validation-error",
  "title": "Validation failed",
  "status": 422,
  "detail": "Khoản phải nằm trong một Điều.",
  "instance": "/api/v1/legal-documents/3f0c.../content",
  "code": "INVALID_PROVISION_HIERARCHY",
  "request_id": "01JDX3M8...",
  "errors": [
    { "field": "content.content[3]", "code": "ORPHAN_CLAUSE", "message": "Khoản 2 không có Điều cha" }
  ]
}
```

| Field | Bắt buộc | Ý nghĩa |
|---|---|---|
| `type` | ✓ | URI ổn định mô tả loại lỗi (`/problems/<kebab-code>`), `about:blank` nếu không cần |
| `title` | ✓ | Tóm tắt ngắn, không đổi giữa các lần lỗi cùng loại |
| `status` | ✓ | Trùng HTTP status thực tế |
| `detail` | ✓ | Giải thích cụ thể cho lần lỗi này (tiếng Việt OK) |
| `instance` | ✓ | Path của request |
| `code` | ✓ | Mã máy đọc, UPPER_SNAKE_CASE, ổn định (client switch theo `code`) |
| `request_id` | ✓ | Trùng `X-Request-Id` |
| `errors` | khi validation | Danh sách lỗi theo field |

## 02.2 Danh mục mã lỗi chuẩn (MUST dùng lại, SHOULD bổ sung vào bảng khi thêm mới)
| status | code | Khi nào |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | JSON hỏng |
| 400 | `INVALID_QUERY_PARAMETER` | page/page_size/sort/fields sai |
| 401 | `UNAUTHENTICATED` | thiếu / sai / hết hạn phiên |
| 404 | `RESOURCE_NOT_FOUND` | không tồn tại hoặc thuộc workspace khác |
| 409 | `DUPLICATE_RESOURCE` | trùng khóa nghiệp vụ (email, số hiệu văn bản) |
| 409 | `INVALID_STATE_TRANSITION` | chuyển trạng thái không hợp lệ |
| 409 | `RESOURCE_IN_USE` | xoá tài nguyên đang được tham chiếu |
| 409 | `IDEMPOTENCY_KEY_REUSED` | cùng key khác body |
| 412 | `PRECONDITION_FAILED` | `If-Match` lệch |
| 413 | `PAYLOAD_TOO_LARGE` | file vượt giới hạn |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Content-Type sai / kiểu file không hỗ trợ / magic bytes không khớp |
| 428 | `PRECONDITION_REQUIRED` | thiếu `If-Match` |
| 422 | `VALIDATION_ERROR` | vi phạm schema/business rule chung |
| 422 | `INVALID_PROVISION_HIERARCHY` | cấu trúc Điều/Khoản/Điểm sai |
| 422 | `INVALID_FINE_RANGE` | `fine_min_vnd > fine_max_vnd` |
| 422 | `INVALID_EFFECTIVE_INTERVAL` | `effective_to < effective_from` hoặc chồng lấn |
| 429 | `RATE_LIMITED` | vượt giới hạn |
| 500 | `INTERNAL_ERROR` | lỗi không lường trước |
| 503 | `SERVICE_UNAVAILABLE` | DB/phụ thuộc không sẵn sàng |

## 02.3 Quy tắc triển khai (MUST)
- Một class `ProblemError(status, code?, detail?, { title, errors, headers })` (`api/src/lib/problem.ts`); service throw,
  **route không tự build JSON lỗi**.
- `onError` toàn cục trong `app.ts` map: `ProblemError`; `VALIDATION` (body ⇒ 422 `VALIDATION_ERROR`, query/params ⇒ 400
  `INVALID_QUERY_PARAMETER`); `PARSE` ⇒ 400; `NOT_FOUND` ⇒ 404; còn lại ⇒ 500, log stack server-side, **không lộ
  stack trace/SQL**.
- Lỗi của Better Auth (`/api/auth/*`) giữ định dạng của thư viện (`{ code, message }`) — ghi rõ trong docs.
- Mọi error code dùng trong code phải có trong `components.responses`/ví dụ của OpenAPI.
