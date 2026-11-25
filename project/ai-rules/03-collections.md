# 03 — Collections: pagination, filtering, sorting, fields

## 03.1 Pagination (MUST cho mọi collection)
- Chiến lược mặc định: **offset theo trang** (`page` từ 1, `page_size` mặc định 20, tối đa 100) — phù hợp UI tra cứu
  cần nhảy trang và hiển thị tổng số. Lý do & trade-off: `docs/adr/0003-pagination.md`.
- Response:
```json
{
  "data": [ ... ],
  "pagination": { "page": 2, "page_size": 20, "total_items": 135, "total_pages": 7 }
}
```
- Header `Link` với `rel="next" | "prev" | "first" | "last"` (SHOULD).
- `page_size > 100`, `page < 1`, không phải số ⇒ `400 INVALID_QUERY_PARAMETER`.
- Trang vượt quá tổng ⇒ `200` với `data: []` (không phải 404).
- Collection có thể rất lớn hoặc realtime (log, revisions) MAY dùng cursor (`cursor`, `limit`, `next_cursor`) —
  cursor phải **opaque** (base64 của keyset), cursor hỏng ⇒ 400.

## 03.2 Filtering (MUST cho field chính)
- Bằng nhau: `?status=PUBLISHED&doc_type=NGHI_DINH`. Nhiều giá trị: `?vehicle_type=CAR,MOTORBIKE`.
- Khoảng: hậu tố `_after` / `_before` (ngày), `_min` / `_max` (số): `?issued_after=2024-01-01&fine_max_vnd_max=5000000`.
- Full-text: `q` (tiếng Việt, không phân biệt dấu/hoa thường — dùng `unaccent` + `tsvector` trên PostgreSQL).
- Tra cứu tại thời điểm: `as_of=YYYY-MM-DD` cho chế tài (rule có hiệu lực tại ngày đó).
- Giá trị enum không hợp lệ ⇒ 400.

## 03.3 Sorting (MUST)
- `?sort=field1,-field2` (dấu `-` = giảm dần). Chỉ cho phép whitelist field được khai báo trong OpenAPI.
- Mặc định ghi rõ trong spec (vd văn bản: `-issued_date`). Field không hỗ trợ ⇒ 400.
- Luôn thêm `id` làm khóa phụ để thứ tự ổn định.

## 03.4 Sparse fieldsets & expand (SHOULD)
- `?fields=id,title,status` — chỉ trả các field này (luôn có `id`). Field không tồn tại ⇒ 400.
- `?expand=provision,document` — nhúng tài nguyên liên quan (whitelist).

## 03.5 Hiệu năng (MUST)
- Mọi filter/sort phổ biến có index tương ứng (ghi trong migration).
- Không N+1: dùng eager loading (`selectinload`) khi expand; test đếm số query cho endpoint list chính.
