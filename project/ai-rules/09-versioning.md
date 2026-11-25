# 09 — Versioning & vòng đời API

## 09.1 Chiến lược (MUST)
- **URI path versioning**: `/api/v1/...` (dễ thấy, dễ cache, phù hợp browser client). Lý do: `docs/adr/0002-versioning.md`.
- Contract có `info.version` dạng semver (`1.3.0`); chỉ **major** xuất hiện trên URL.

## 09.2 Thay đổi nào được phép trong cùng major (backward compatible)
✓ Thêm endpoint mới · thêm field **optional** trong request · thêm field trong response · thêm giá trị filter/sort mới ·
thêm error code mới (client xử lý `default`).

✗ **Breaking** (cần v2): xoá/đổi tên field hoặc endpoint · đổi kiểu dữ liệu · field optional → required ·
đổi ý nghĩa status code · đổi format phân trang · thêm enum value vào **request** bắt buộc · siết validation.

- Client phải bỏ qua field không biết (tolerant reader) — ghi trong quickstart.

## 09.3 Deprecation (MUST khi có v2)
- Endpoint/field deprecated: `deprecated: true` trong OpenAPI + header `Deprecation: @<unix-ts>` (RFC 9745) và
  `Sunset: <HTTP-date>` (RFC 8594) + `Link: <url-migration-guide>; rel="deprecation"`.
- Thời gian hỗ trợ song song **tối thiểu 180 ngày** (cho môn học: mô phỏng trong kịch bản).
- 4 pha: **Plan → Pilot → Migrate → Sunset**; đo adoption bằng header `X-Api-Version-Served` + log theo version.
- Sau sunset: trả `410 Gone` problem+json kèm link migration guide; giữ code v1 trong archive.

## 09.4 Kịch bản v1 → v2 dự kiến (tuần 15)
Xem `docs/08-versioning-lifecycle.md`: tách `fine_min_vnd`/`fine_max_vnd` thành object `fine: {min, max, currency}`
và đổi `points_deducted` thành `point_deduction: {applicability, points}` — breaking ⇒ `/api/v2/sanction-rules`.

## 09.5 Changelog (MUST)
- `docs/api/CHANGELOG.md` ghi mọi thay đổi contract (Added / Changed / Deprecated / Removed) theo version.
