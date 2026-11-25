# 02 — Yêu cầu (Requirements)

Business rules chi tiết là **chuẩn** tại [`../ai-rules/11-domain-rules.md`](../ai-rules/11-domain-rules.md); tài liệu này
mô tả yêu cầu chức năng (FR) và phi chức năng (NFR). Mức ưu tiên: **M** (MVP) · **S** (Should) · **C** (Could).

## 1. Yêu cầu chức năng

### FR-AUTH — Tài khoản & workspace (✅ 1.0.0)
| ID | Mô tả | Ưu tiên |
|---|---|---|
| FR-AUTH-1 | Đăng ký email + mật khẩu (8–128 ký tự) bằng Better Auth; tự đăng nhập sau đăng ký | M ✅ |
| FR-AUTH-2 | Đăng nhập: phiên cookie httpOnly (SPA) và session token qua header `set-auth-token` (client khác) | M ✅ |
| FR-AUTH-3 | Đăng xuất thu hồi phiên ngay; rate limit đăng nhập 5/phút, đăng ký 3/phút | M ✅ |
| FR-AUTH-4 | `GET /users/me` | M ✅ |
| FR-AUTH-5 | **Mỗi tài khoản một workspace riêng**: mọi dữ liệu gắn `owner_id`; truy cập chéo ⇒ 404 | M ✅ |

### FR-FILE — Upload văn bản (✅ 1.0.0)
| ID | Mô tả | Ưu tiên |
|---|---|---|
| FR-FILE-1 | Upload file gốc PDF/DOCX/TXT ≤ 20 MB cho văn bản DRAFT (multipart), kiểm tra magic bytes | M ✅ |
| FR-FILE-2 | Chống trùng nội dung (SHA-256) trong cùng văn bản ⇒ 409 | M ✅ |
| FR-FILE-3 | Liệt kê, xem metadata, tải về (`attachment`), xoá file | M ✅ |
| FR-FILE-4 | Trích xuất Điều/Khoản/Điểm từ file (LLM, job nền 202) | C |

### FR-DOC — Văn bản pháp luật
| ID | Mô tả | Ưu tiên |
|---|---|---|
| FR-DOC-1 | Tạo văn bản nháp ✅: `doc_type`, `number` (unique trong workspace), `title`, `issuer`, `issued_date`, `effective_date`, `expiry_date?` | M |
| FR-DOC-2 | Liệt kê/tìm văn bản: `q`, `doc_type`, `status`, `issued_after/before`, sort, paginate, `fields` | M ✅ |
| FR-DOC-3 | Sửa metadata (PATCH, If-Match); chuyển trạng thái theo state machine | M ✅ |
| FR-DOC-4 | Xoá mềm văn bản DRAFT; văn bản PUBLISHED ⇒ 409 | M ✅ |
| FR-DOC-5 | Lấy nội dung soạn thảo (JSON TipTap) + ETag | M |
| FR-DOC-6 | Lưu nội dung (PUT, If-Match bắt buộc); validate cây Điều/Khoản/Điểm; tạo revision; tái sinh provisions | M |
| FR-DOC-7 | Xem danh sách revision, xem một revision | S |
| FR-DOC-8 | Xuất bản yêu cầu đủ ngày ban hành/hiệu lực (✅) + ≥ 1 Điều (sau API-04) | M |

### FR-EDITOR — Trình soạn thảo (frontend + contract content)
| ID | Mô tả | Ưu tiên |
|---|---|---|
| FR-ED-1 | Toolbar + slash command `/dieu`, `/khoan`, `/diem`, `/chuong`, `/muc` chèn header đúng cấp | M |
| FR-ED-2 | Đánh số tự động: Điều liên tục; Khoản reset theo Điều; Điểm a, b, c, d, đ, e… reset theo Khoản | M |
| FR-ED-3 | Renumber khi chèn giữa/xoá/kéo thả; cảnh báo khi chế tài đang trỏ tới provision sắp bị xoá | M |
| FR-ED-4 | Báo lỗi cấu trúc inline (Khoản ngoài Điều, Điểm ngoài Khoản) đồng bộ với lỗi 422 từ server | M |
| FR-ED-5 | Outline (mục lục) bên trái, click nhảy tới Điều | S |
| FR-ED-6 | Autosave (debounce 3 s) + xử lý xung đột 412 | S |
| FR-ED-7 | Dán văn bản thô → nhận diện "Điều 5.", "1.", "a)" thành header | C |

### FR-PROV — Điều khoản
| ID | Mô tả | Ưu tiên |
|---|---|---|
| FR-PROV-1 | Xem cây provision của văn bản (`view=tree|flat`, lọc `level`) | M |
| FR-PROV-2 | Xem một provision kèm `citation` chuẩn và `breadcrumbs` | M |
| FR-PROV-3 | Full-text search provisions (`q`, không dấu) trong workspace | M |

### FR-VIO — Hành vi & chế tài
| ID | Mô tả | Ưu tiên |
|---|---|---|
| FR-VIO-1 | CRUD hành vi (`name`, `slug`, `description`, `keywords[]`) | M |
| FR-VIO-2 | Tìm hành vi: `q`, `vehicle_type`, `has_point_deduction`, sort, paginate; kèm `current_sanctions` tóm tắt | M |
| FR-VIO-3 | CRUD chế tài gắn `provision_id`; validate fine range, điểm, khoảng hiệu lực không chồng lấn | M |
| FR-VIO-4 | Tra cứu chế tài theo `as_of` và `vehicle_type`; trả `status` tính toán | M |
| FR-VIO-5 | Lịch sử (timeline) chế tài của một hành vi theo lineage (vehicle_type) | S |

### FR-REL — Quan hệ văn bản
| ID | Mô tả | Ưu tiên |
|---|---|---|
| FR-REL-1 | Tạo/xoá/liệt kê quan hệ `AMENDS/SUPPLEMENTS/REPLACES/REPEALS/REFERENCES/GUIDES` | M |
| FR-REL-2 | Xem quan hệ vào/ra của một văn bản | M |

### FR-DIA — Lược đồ thủ công
| ID | Mô tả | Ưu tiên |
|---|---|---|
| FR-DIA-1 | Tạo lược đồ (title, description) trong workspace | M |
| FR-DIA-2 | Canvas: thêm node (`DOCUMENT/PROVISION/VIOLATION/NOTE`), nối edge có `relation_type` + `label`, di chuyển, xoá | M |
| FR-DIA-3 | Lưu (PATCH, If-Match), tối đa 500 node / 1000 edge | M |
| FR-DIA-4 | Liệt kê / xem lược đồ trong workspace | M |
| FR-DIA-5 | Chèn node từ kết quả tìm kiếm văn bản/hành vi; node trỏ tài nguyên đã xoá hiển thị `broken_ref` | S |
| FR-DIA-6 | Xuất PNG/SVG phía client | C |

## 2. Yêu cầu phi chức năng
| ID | Yêu cầu | Đo bằng |
|---|---|---|
| NFR-1 | p95 < 300 ms cho GET tra cứu ở 50 concurrent users, error rate < 1% | k6 (tuần 15) |
| NFR-2 | Mọi endpoint có tài liệu OpenAPI + ví dụ; Swagger UI tại `/docs` | Spectral + review |
| NFR-3 | Coverage service layer ≥ 80% | bun test --coverage |
| NFR-4 | OWASP API Top 10 (2023): không còn lỗi mức High trong review | `docs/07-security.md` |
| NFR-5 | Chạy lại toàn bộ stack bằng `docker compose up` + seed | README |
| NFR-8 | Cách ly dữ liệu giữa các workspace: 0 trường hợp truy cập chéo | test cross-workspace |
| NFR-6 | Log có cấu trúc, `X-Request-Id` xuyên suốt | Log mẫu |
| NFR-7 | Backward compatibility trong v1; deprecation ≥ 180 ngày (mô phỏng) | `docs/08` |

## 3. Đặc tả content của editor (tóm tắt — xem ADR 0004)
```json
{
  "type": "doc",
  "content": [
    { "type": "legalHeading", "attrs": { "level": "CHAPTER", "number": "II", "title": "Hành vi vi phạm..." } },
    { "type": "legalHeading", "attrs": { "level": "ARTICLE", "number": "6", "title": "Xử phạt người điều khiển xe ô tô..." } },
    { "type": "legalHeading", "attrs": { "level": "CLAUSE", "number": "4" } },
    { "type": "paragraph", "content": [ { "type": "text", "text": "Phạt tiền từ ... đối với người điều khiển xe thực hiện một trong các hành vi vi phạm sau đây:" } ] },
    { "type": "legalHeading", "attrs": { "level": "POINT", "number": "a" } },
    { "type": "paragraph", "content": [ { "type": "text", "text": "Đỗ xe trên phần đường xe chạy ở đoạn đường ngoài đô thị..." } ] }
  ]
}
```
- Văn bản là **danh sách phẳng** các block; cấp bậc suy ra từ `legalHeading.level` theo thứ tự xuất hiện
  (dễ chỉnh sửa trong editor, server dựng cây khi parse).
- `number` do client đề xuất; server **chuẩn hoá lại** theo quy tắc đánh số và trả content đã chuẩn hoá.
- Node cho phép: `doc, paragraph, text, legalHeading, bulletList, orderedList, listItem, table*, hardBreak`; mark: `bold, italic, underline`.
