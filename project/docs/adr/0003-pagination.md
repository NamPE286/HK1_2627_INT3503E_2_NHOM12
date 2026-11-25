# ADR 0003 — Offset pagination mặc định

- Trạng thái: Accepted · Ngày: 2026-11-25

## Quyết định
Collection dùng `page` (≥1) + `page_size` (1–100, mặc định 20), trả `pagination{page, page_size, total_items, total_pages}`
và header `Link`. Collection có thể tăng nhanh không giới hạn (vd log, revisions dài) MAY chuyển sang cursor opaque.

## Lý do
- UI tra cứu cần nhảy trang và hiển thị tổng kết quả; dữ liệu dự kiến < 100k bản ghi/collection ⇒ chi phí OFFSET chấp nhận được.
- Cursor ổn định hơn khi có insert đồng thời nhưng không nhảy trang được (B3).

## Hệ quả
Cần `COUNT(*)` ⇒ đo trong load test; nếu chậm, cache count hoặc chuyển keyset cho endpoint đó (ghi CHANGELOG, additive bằng param mới).
