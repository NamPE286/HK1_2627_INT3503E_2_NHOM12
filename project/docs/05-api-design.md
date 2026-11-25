# 05 — API design

Contract đầy đủ: [`api/openapi.yaml`](api/openapi.yaml). Quy ước bắt buộc: [`../ai-rules/01`→`04`](../ai-rules/README.md).

- Base URL: `http://localhost:8000/api/v1` · Swagger UI: `/docs` · Auth docs (Better Auth): `/api/auth/reference`
- Auth: cookie `better-auth.session_token` (SPA) hoặc `Authorization: Bearer <set-auth-token>` · Lỗi: `application/problem+json`
- **Workspace**: mọi endpoint `/api/v1` yêu cầu đăng nhập và chỉ thấy dữ liệu của chính tài khoản; của người khác ⇒ 404.
- Collection: `?page=1&page_size=20&sort=-issued_date&fields=id,title` → `{ data, pagination }` + header `Link`

## 1. Catalog endpoint (v1)

Trạng thái: ✅ đã triển khai trong 1.0.0 · 📝 đã thiết kế trong contract, triển khai tuần 13–14.

### Auth (Better Auth — ngoài contract `/api/v1`)
| Method | Path | Mô tả | Success | Lỗi chính |
|---|---|---|---|---|
| POST | `/api/auth/sign-up/email` ✅ | Đăng ký `{email, password, name}` (tự đăng nhập) | 200 + cookie + `set-auth-token` | 400 mật khẩu ngắn, 422 email đã dùng, 429 |
| POST | `/api/auth/sign-in/email` ✅ | Đăng nhập | 200 + cookie + `set-auth-token` | 401, 429 |
| POST | `/api/auth/sign-out` ✅ | Thu hồi phiên | 200 | — |
| GET | `/api/auth/get-session` ✅ | Phiên hiện tại | 200 / `null` | — |

### Users
| Method | Path | Mô tả | Success | Lỗi chính |
|---|---|---|---|---|
| GET | `/users/me` ✅ | Người dùng hiện tại (chủ workspace) | 200 | 401 |

### Legal documents
| Method | Path | Mô tả | Success | Lỗi chính |
|---|---|---|---|---|
| GET | `/legal-documents` ✅ | Liệt kê/tìm (q, doc_type, status, issued_after/before) | 200 | 400 |
| POST | `/legal-documents` ✅ | Tạo văn bản DRAFT (Idempotency-Key: 📝) | 201 + Location | 409 number trùng, 422 |
| GET | `/legal-documents/{document_id}` ✅ | Chi tiết metadata | 200 / 304 | 404 |
| PATCH | `/legal-documents/{document_id}` ✅ | Sửa metadata / chuyển `status` (If-Match) | 200 | 409 INVALID_STATE_TRANSITION, 412, 422 |
| DELETE | `/legal-documents/{document_id}` ✅ | Xoá mềm (chỉ DRAFT) | 204 | 404, 409 |
| GET | `/legal-documents/{document_id}/content` | Nội dung soạn thảo (JSON TipTap) | 200 + ETag / 304 | 404 |
| PUT | `/legal-documents/{document_id}/content` | Thay nội dung, validate cây, tạo revision | 200 + ETag | 409 RESOURCE_IN_USE, 412, 422, 428 |
| GET | `/legal-documents/{document_id}/revisions` | Lịch sử revision | 200 | 404 |
| GET | `/legal-documents/{document_id}/revisions/{revision_number}` | Một revision | 200 | 404 |
| GET | `/legal-documents/{document_id}/provisions` | Cây/danh sách provision (`view`, `level`) | 200 | 404 |
| GET | `/legal-documents/{document_id}/relations` | Quan hệ vào/ra (`direction`) | 200 | 404 |

### Source files (upload văn bản)
| Method | Path | Mô tả | Success | Lỗi chính |
|---|---|---|---|---|
| POST | `/legal-documents/{document_id}/source-files` ✅ | Upload multipart `file` (PDF/DOCX/TXT ≤ 20 MB) | 201 + Location | 404, 409 trùng/không phải DRAFT, 413, 415, 422 |
| GET | `/legal-documents/{document_id}/source-files` ✅ | Danh sách file (phân trang) | 200 | 400, 404 |
| GET | `/source-files/{file_id}` ✅ | Metadata | 200 | 404 |
| GET | `/source-files/{file_id}/content` ✅ | Tải file gốc (`Content-Disposition: attachment`) | 200 | 404 |
| DELETE | `/source-files/{file_id}` ✅ | Xoá | 204 | 404 |

### Provisions & relations
| Method | Path | Mô tả | Success | Lỗi chính |
|---|---|---|---|---|
| GET | `/provisions` | Full-text search (q, document_id, level) | 200 | 400 |
| GET | `/provisions/{provision_id}` | Chi tiết + citation + breadcrumbs | 200 | 404 |
| GET | `/document-relations` | Liệt kê (document_id, relation_type) | 200 | 400 |
| POST | `/document-relations` | Tạo quan hệ | 201 | 409 trùng, 422 self-relation |
| DELETE | `/document-relations/{relation_id}` | Xoá quan hệ | 204 | 404 |

### Violations & sanction rules
| Method | Path | Mô tả | Success | Lỗi chính |
|---|---|---|---|---|
| GET | `/violations` | Tìm hành vi (q, vehicle_type, has_point_deduction, as_of) | 200 | 400 |
| POST | `/violations` | Tạo hành vi | 201 | 409 slug trùng, 422 |
| GET | `/violations/{violation_id}` | Chi tiết + `current_sanctions` | 200 | 404 |
| PATCH | `/violations/{violation_id}` | Sửa | 200 | 404, 422 |
| DELETE | `/violations/{violation_id}` | Xoá mềm | 204 | 409 còn rule |
| GET | `/violations/{violation_id}/sanction-rules` | Chế tài (as_of, vehicle_type, status) | 200 | 400, 404 |
| POST | `/violations/{violation_id}/sanction-rules` | Tạo chế tài trỏ provision | 201 | 422 INVALID_FINE_RANGE / INVALID_EFFECTIVE_INTERVAL |
| GET | `/sanction-rules/{rule_id}` | Chi tiết chế tài | 200 | 404 |
| PATCH | `/sanction-rules/{rule_id}` | Sửa | 200 | 404, 422 |
| DELETE | `/sanction-rules/{rule_id}` | Xoá | 204 | 404 |

### Diagrams
| Method | Path | Mô tả | Success | Lỗi chính |
|---|---|---|---|---|
| GET | `/diagrams` | Lược đồ của tôi | 200 | 400, 401 |
| POST | `/diagrams` | Tạo lược đồ | 201 | 422 |
| GET | `/diagrams/{diagram_id}` | Xem | 200 + ETag | 404 (workspace khác) |
| PATCH | `/diagrams/{diagram_id}` | Lưu canvas/metadata (If-Match) | 200 | 404, 412, 422, 428 |
| DELETE | `/diagrams/{diagram_id}` | Xoá | 204 | 404 |

### Ops (ngoài version)
`GET /healthz` (liveness) · `GET /readyz` (readiness, kiểm DB → 503).

## 2. API design patterns áp dụng (phân tích tuần 14)
| Pattern (Geewax) | Ở đâu | Lý do kỹ thuật |
|---|---|---|
| Standard methods (ch.7) | Mọi resource | Dễ đoán, nhất quán |
| **Singleton sub-resource** (ch.12) | `/legal-documents/{id}/content` | Content lớn, cập nhật toàn phần, cần ETag riêng; tách khỏi PATCH metadata |
| **Resource revisions** (ch.28) | `/revisions` | Lịch sử chỉnh sửa văn bản, không ghi đè |
| **Association resource** (ch.14) | `/document-relations` | Quan hệ n–n có thuộc tính (`relation_type`, provision) |
| Pagination (ch.21) & Filtering (ch.22) ✅ | Mọi collection | Dữ liệu lớn, tra cứu |
| Partial updates & field mask (ch.8) | PATCH | Chỉ gửi field đổi |
| Soft deletion (ch.25) ✅ | documents (1.0.0), violations | Giữ tham chiếu lịch sử/chế tài |
| Request deduplication (ch.26) | `Idempotency-Key` trên POST | Retry an toàn |
| Optimistic concurrency (ETag/If-Match) ✅ | legal-documents (1.0.0), content, diagram | Hai tab/thiết bị cùng sửa |
| **Implicit tenant scoping** ✅ | mọi `/api/v1` | Mỗi tài khoản một workspace; URL gọn, chống BOLA tập trung (ADR 0005) |

**Pattern trọng tâm để demo**: *Singleton sub-resource + revisions + ETag* cho chức năng soạn thảo.

## 3. Trade-offs đã cân nhắc
| Quyết định | Lựa chọn | Phương án khác | Vì sao |
|---|---|---|---|
| Ghi provision | Dẫn xuất từ content (PUT) | CRUD từng provision | Một nguồn sự thật, editor tự nhiên; đổi lại PUT nặng hơn |
| Publish | `PATCH status` + state machine | Custom method `:publish` | Giữ resource-oriented theo B3; ràng buộc ghi trong spec |
| Pagination | Offset (page/page_size) | Cursor | UI cần nhảy trang + tổng; dữ liệu < 100k bản ghi (ADR 0003) |
| JSON case | snake_case | camelCase | Thống nhất với query param & Python; lecture B3 |
| Diagram lưu | JSONB nguyên khối | Bảng nodes/edges | Canvas lưu một lần, không query từng node |
| Versioning | URI `/api/v1` | Header | Dễ thấy, cache, test bằng browser (ADR 0002) |
| Auth | Better Auth (session DB) | Tự làm JWT + refresh | Không tự viết phần nhạy cảm; thu hồi phiên ngay (ADR 0005) |
| Multi-tenant | Ngầm theo user (`owner_id`) | `/workspaces/{id}/…` | Mỗi user đúng 1 workspace ⇒ URL gọn; mở rộng additive sau |
| Upload | 2 bước: JSON metadata rồi multipart file | 1 request multipart gộp | Contract JSON rõ ràng, upload retry độc lập (ADR 0006) |
