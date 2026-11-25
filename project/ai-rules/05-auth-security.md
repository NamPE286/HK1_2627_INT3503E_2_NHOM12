# 05 — Xác thực, phân quyền (workspace) & bảo mật

## 05.1 Authentication bằng Better Auth (MUST) — ADR 0005
- Đăng ký / đăng nhập / đăng xuất / phiên do **Better Auth** xử lý tại `/api/auth/*`
  (`POST /api/auth/sign-up/email`, `POST /api/auth/sign-in/email`, `POST /api/auth/sign-out`, `GET /api/auth/get-session`).
  **Không tự viết lại** logic đăng nhập, hash mật khẩu, quản lý phiên.
- Phiên là **session token lưu DB** (bảng `session`), hết hạn 7 ngày, gia hạn mỗi ngày khi còn dùng; đăng xuất thu hồi ngay.
- Hai cách gửi phiên:
  - SPA: cookie httpOnly `better-auth.session_token` (SameSite=Lax, Secure ở production), cùng origin qua proxy.
  - Client khác (Postman, script, app ngoài): header `Authorization: Bearer <token>` — token lấy từ header
    `set-auth-token` khi đăng nhập (plugin `bearer`). **Không bao giờ** đặt token trong query string.
- Mật khẩu hash bằng **Argon2id** (`Bun.password`, m = 64 MiB, t = 3), 8–128 ký tự.
- Lỗi đăng nhập chung chung (401), không phân biệt "email không tồn tại" và "sai mật khẩu".
- Request tới `/api/auth/*` từ trình duyệt phải có `Origin` thuộc `CORS_ORIGINS` (Better Auth chống CSRF).

## 05.2 Workspace riêng cho mỗi tài khoản (MUST) — mặc định DENY
- **Mỗi tài khoản là một instance độc lập** của ứng dụng: văn bản, file gốc, điều khoản, hành vi, chế tài, quan hệ, lược đồ
  đều có `owner_id = user.id`. Không có dữ liệu dùng chung giữa các tài khoản, không có role trong 1.0.0.
- Mọi module `/api/v1` gọi `.use(requireUser(auth))` ngay đầu ⇒ route **không thể** quên kiểm tra đăng nhập.
- **Object level (BOLA)**: mọi truy vấn trong service lọc `owner_id = :current_user` (và `deleted_at IS NULL`).
  Tài nguyên của workspace khác ⇒ **404** (không phải 403) để không lộ sự tồn tại. Sub-resource (file, provision)
  kiểm tra qua tài nguyên cha của chính workspace.
- **Property level (mass-assignment)**: schema input `additionalProperties: false` (field lạ ⇒ 422); client không bao giờ
  gửi được `owner_id`, `version`, `published_at`, `storage_key`. Output qua hàm `toXxx()` (DTO), không trả nguyên row.
- Khoá nghiệp vụ unique **trong workspace** (vd `UNIQUE(owner_id, number)`), không unique toàn hệ thống.
- Đăng xuất phía client phải xoá cache dữ liệu (TanStack Query `clear()`).

## 05.3 Bảo vệ khác (MUST)
- **Rate limit** (Better Auth): `sign-in/email` 5 req/phút, `sign-up/email` 3 req/phút, auth chung 100 req/phút
  ⇒ 429. API `/api/v1` thêm rate limit theo user khi làm load test (tuần 15).
- Validation ở biên (TypeBox schema của Elysia): độ dài, pattern, format ngày/uuid; body JSON ≤ 1 MB, upload ≤ 20 MB.
- **Upload file**: whitelist PDF/DOCX/TXT, **xác minh magic bytes** (không tin `Content-Type`/đuôi file), tên file được
  làm sạch, lưu theo key `owner/document/file-id` (không dùng tên gốc làm đường dẫn ⇒ chặn path traversal),
  tải về luôn `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff`.
- Sanitize nội dung editor: chỉ node/mark whitelist của TipTap schema; không lưu HTML thô.
- CORS whitelist (`CORS_ORIGINS`), `credentials: true`; không dùng `*`.
- SQL chỉ qua Drizzle (parameterized).

## 05.4 Secrets & logging (MUST)
- `BETTER_AUTH_SECRET` (≥ 32 ký tự), `DATABASE_URL` chỉ qua env; commit `.env.example`, **không commit `.env`**.
- Không log password, token, cookie, header `Authorization`. Log JSON có `request_id`, `user_id`, status, duration.

## 05.5 Kiểm thử bảo mật (MUST — tuần 13 & 15)
- 401: không token, token rác, token đã đăng xuất. Mật khẩu lưu dạng `$argon2id$`.
- **Cross-workspace**: user B GET/PATCH/DELETE văn bản, file của user A ⇒ 404; list của B không chứa dữ liệu A.
- Mass-assignment: gửi `owner_id` ⇒ 422. Upload file giả mạo (đuôi `.pdf`, nội dung không phải PDF) ⇒ 415.
- Rate limit đăng nhập ⇒ 429. Đối chiếu OWASP API Security Top 10 2023 trong `docs/07-security.md`.
