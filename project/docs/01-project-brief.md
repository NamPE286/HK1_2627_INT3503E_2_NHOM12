# 01 — Project brief: TrafficLex

> *Tra cứu & biên tập chế tài xử phạt vi phạm giao thông đường bộ, truy vết theo Điều/Khoản/Điểm.*

## 1. Vấn đề
Quy định xử phạt vi phạm giao thông tại Việt Nam thay đổi liên tục (vd Nghị định 100/2019/NĐ-CP → 123/2021/NĐ-CP →
168/2024/NĐ-CP). Người dân, giảng viên/sinh viên luật, nhà báo và lập trình viên ứng dụng giao thông gặp khó khi muốn biết:

> *Hành vi X hiện bị phạt bao nhiêu, có trừ điểm GPLX không, căn cứ **điểm – khoản – Điều** nào, và trước đây quy định ra sao?*

Văn bản gốc là PDF/HTML dài, cấu trúc lồng nhau, sửa đổi chồng chéo; không có API có cấu trúc để ứng dụng khác tái sử dụng.

## 2. Giá trị
- **API có cấu trúc** cho văn bản → điều khoản → hành vi → chế tài, mọi chế tài **có trích dẫn nguồn** (provision).
- **Trình soạn thảo văn bản pháp luật**: biên tập viên nhập/soạn văn bản với header **Chương/Mục/Điều/Khoản/Điểm**
  được đánh số tự động và validate cấu trúc → hệ thống tự tách thành các provision có thể trích dẫn.
- **Trình vẽ lược đồ thủ công**: người dùng tự vẽ sơ đồ quan hệ văn bản (sửa đổi, thay thế, bãi bỏ…), điều khoản và
  hành vi để học/giải thích; lưu, chia sẻ công khai.
- Tra cứu **theo thời điểm** (`as_of`) — biết mức phạt tại một ngày bất kỳ.

## 3. API consumers
| Consumer | Nhu cầu |
|---|---|
| **Web app TrafficLex** (React SPA — consumer chính) | Tra cứu, soạn thảo, vẽ lược đồ |
| Script / Postman / app khác của chính người dùng | Gọi API bằng `Authorization: Bearer <session token>` để nhập liệu hàng loạt, tích hợp |

## 4. Người dùng & workspace
Mỗi người dùng **đăng ký tài khoản (Better Auth) và có một workspace (instance) riêng**: tự upload/nhập văn bản, soạn
Điều/Khoản/Điểm, gắn chế tài và vẽ lược đồ của mình. Không ai khác thấy dữ liệu trong workspace (truy cập chéo ⇒ 404).
Đối tượng: sinh viên/giảng viên luật, người học lái xe, nhà báo, lập trình viên ứng dụng giao thông.

## 5. Use cases chính
| ID | Use case | Actor |
|---|---|---|
| UC0 | **Đăng ký / đăng nhập**, có workspace riêng ✅ 1.0.0 | Người dùng |
| UC1 | **Nhập văn bản & upload file gốc** (PDF/DOCX/TXT), xem danh sách, lọc, phân trang ✅ 1.0.0 | Người dùng |
| UC2 | **Soạn văn bản pháp luật**: soạn nội dung với header Điều/Khoản/Điểm, lưu có kiểm soát xung đột (ETag) | Người dùng |
| UC3 | **Gắn chế tài**: tạo hành vi vi phạm và chế tài (mức phạt, trừ điểm, hình phạt bổ sung) trỏ tới Điểm/Khoản cụ thể; xuất bản văn bản | Người dùng |
| UC4 | **Tra cứu hành vi** trong workspace: tìm "đỗ xe", mức phạt theo loại xe, căn cứ trích dẫn, lịch sử (`as_of`) | Người dùng |
| UC5 | **Vẽ lược đồ thủ công**: kéo thả node văn bản/điều khoản/hành vi, nối cạnh quan hệ, lưu | Người dùng |

**Luồng demo 1.0.0 (tuần 12)**: `POST /api/auth/sign-up/email` → `POST /legal-documents` → `POST /legal-documents/{id}/source-files`
→ `GET /legal-documents?sort=-issued_date` → `PATCH /legal-documents/{id}` (`PUBLISHED`) → user khác `GET` ⇒ 404.

**Luồng nghiệp vụ trọng tâm tuần 13–15** (UC2 → UC3 → UC4):
`PUT /legal-documents/{id}/content` (If-Match) → `GET /legal-documents/{id}/provisions` →
`POST /violations` → `POST /violations/{id}/sanction-rules` → `PATCH /legal-documents/{id}` (`PUBLISHED`) →
`GET /violations?q=đỗ xe&vehicle_type=CAR` → `GET /violations/{id}/sanction-rules?as_of=2024-06-01`.

## 6. Phạm vi MVP
| Trong MVP | Ngoài MVP (stretch / tương lai) |
|---|---|
| ✅ Auth Better Auth (email + mật khẩu), workspace riêng mỗi tài khoản | OAuth Google, 2FA, chia sẻ/cộng tác workspace |
| ✅ Upload file gốc PDF/DOCX/TXT, list/tải/xoá | Quét virus, quota dung lượng |
| ✅ CRUD + list văn bản, state machine DRAFT/PUBLISHED/ARCHIVED | Import PDF tự động + trích xuất bằng LLM (như repo gốc) |
| Editor TipTap với header Chương/Mục/Điều/Khoản/Điểm, auto-numbering, validate | So sánh diff ngữ nghĩa giữa revision |
| Tách content → provisions, revisions (chỉ đọc) | Tự phát hiện quan hệ văn bản từ trích dẫn |
| CRUD hành vi + chế tài, tra cứu `q`, `vehicle_type`, `as_of` | AI chat trả lời có trích dẫn |
| CRUD quan hệ văn bản (`document-relations`) | Đồng bộ với vbpl.vn |
| CRUD lược đồ thủ công (React Flow) trong workspace | Cộng tác realtime nhiều người cùng sửa |
| ✅ OpenAPI + Swagger, bun test, Newman, Docker · ☐ k6 | Deploy production đa vùng |

## 7. Khác biệt với repo gốc `NamPE286/INT3011E_6`
Repo gốc tập trung **tự động hoá bằng AI** (PDF → JSON bằng LLM, MCP server, Cloudflare Workers). Ở môn này nhóm
**giữ domain** (văn bản → điều khoản → hành vi → chế tài, lineage, hiệu lực) nhưng **thay tự động hoá bằng thao tác
biên tập thủ công có kiểm soát** (editor + diagram) để trọng tâm là **thiết kế và chất lượng REST API**.
