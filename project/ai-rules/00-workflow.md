# 00 — Quy trình làm việc

## 00.1 Design-first (MUST)
1. Thay đổi API bắt đầu bằng việc sửa `docs/api/openapi.yaml` (path, schema, ví dụ, lỗi).
2. Lint spec (`spectral lint`) phải pass.
3. Implement theo đúng contract; schema TypeBox (`schemas.ts`) đặt tên trùng `components.schemas`.
4. Test contract (`api/test/platform.test.ts`) bảo đảm **không có route nào ngoài contract** và response khớp schema.
5. Cập nhật docs liên quan (`docs/05-api-design.md` nếu đổi quy ước, ADR nếu là quyết định kiến trúc).

## 00.2 Phạm vi (MUST)
- Chỉ làm những gì thuộc MVP trong `docs/01-project-brief.md` trừ khi được giao rõ ràng.
- Không tự ý thêm dependency nặng; nếu cần, ghi lý do trong PR.

## 00.3 Git (MUST)
- Nhánh `<tên>/<chủ-đề>`; PR vào `main`, tối thiểu 1 reviewer trong nhóm.
- Conventional Commits; mỗi commit một ý. Không commit file build, `.venv`, `node_modules`, `.env`.
- Không rewrite history nhánh của người khác.

## 00.4 Bằng chứng (MUST — yêu cầu tuần 12–15)
Mỗi hạng mục "đã xong" phải đi kèm ít nhất một trong: link commit/PR, output test, ảnh Swagger/Postman,
response JSON thật từ backend chạy với DB thật. **Response JSON dựng sẵn không được tính là backend hoàn chỉnh.**

## 00.5 Cách AI agent làm việc (MUST)
- Đọc `AGENTS.md` + toàn bộ `ai-rules/` trước khi làm. Nêu các rule áp dụng cho task.
- Trước khi kết thúc: chạy test/lint liên quan và báo cáo trung thực kết quả (pass/fail, phần bỏ qua).
- Không bịa dữ liệu pháp lý (số văn bản, mức phạt). Dữ liệu seed phải ghi nguồn hoặc đánh dấu `is_sample: true`.
- Khi không chắc về nghiệp vụ → hỏi, không đoán.

## 00.6 Báo cáo tuần
Mỗi tuần nộp: slide, link repo, OpenAPI/Swagger, báo cáo tiến độ 1–2 trang (đã làm / chưa xong / cần hỗ trợ /
kế hoạch tuần tới / người phụ trách). Mẫu xem `docs/09-plan.md`.
