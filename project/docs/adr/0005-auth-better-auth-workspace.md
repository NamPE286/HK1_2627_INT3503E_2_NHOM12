# ADR 0005 — Better Auth & workspace riêng cho mỗi tài khoản

- Trạng thái: Accepted · Ngày: 2026-11-25

## Bối cảnh
Yêu cầu 1.0.0: đăng ký/đăng nhập đơn giản; **mỗi tài khoản giữ một instance riêng của ứng dụng** (bộ văn bản và lược đồ riêng).

## Quyết định
1. **Better Auth** xử lý toàn bộ `/api/auth/*` (email + mật khẩu). Phiên lưu DB (bảng `session`), cookie httpOnly cho SPA,
   plugin `bearer` cho client ngoài trình duyệt; mật khẩu Argon2id; rate limit đăng nhập 5/phút, đăng ký 3/phút.
2. **Tenant = user**: mọi bảng nghiệp vụ gốc có `owner_id`; mọi module `/api/v1` dùng guard `requireUser`; service luôn lọc
   `owner_id`. Tài nguyên của tài khoản khác trả **404**. URL **không** chứa workspace id (`/legal-documents`, không phải
   `/workspaces/{id}/legal-documents`) vì mỗi user chỉ có đúng một workspace.
3. Bỏ hệ role (VIEWER/EDITOR/ADMIN) của bản thiết kế đầu; "xuất bản" chỉ là chốt bản chính thức trong workspace.

## Lý do
- Không tự viết lại phần auth nhạy cảm (hash, phiên, CSRF, rate limit) — dùng thư viện được duy trì (B6: "chọn thư viện được duy trì").
- Session DB thu hồi được ngay khi đăng xuất (khác JWT stateless phải chờ hết hạn).
- Scope ngầm theo user đơn giản cho consumer và loại bỏ cả lớp lỗi BFLA (không có route admin).

## Hệ quả / trade-off
- `/api/auth/*` có động từ trong path và định dạng lỗi riêng của Better Auth ⇒ ghi nhận là ngoại lệ, tài liệu ở `/api/auth/reference`.
- Mỗi request `/api/v1` tra session trong DB (1 query) ⇒ theo dõi trong load test; có thể bật cookie cache của Better Auth.
- Muốn chia sẻ/cộng tác sau này cần thêm `workspaces` + `memberships` (plugin `organization` của Better Auth) ⇒ thay đổi
  additive: URL hiện tại vẫn trỏ tới workspace mặc định của user.
