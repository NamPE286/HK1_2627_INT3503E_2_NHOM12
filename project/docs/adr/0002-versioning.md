# ADR 0002 — URI path versioning

- Trạng thái: Accepted · Ngày: 2026-11-25

## Quyết định
Dùng major version trên URL `/api/v1`. Minor/patch chỉ trong `info.version` + CHANGELOG. Deprecation dùng header
`Deprecation`, `Sunset` (RFC 8594) và `Link rel="deprecation"`.

## Lý do
- Dễ thấy, dễ test bằng browser/curl, cache/CDN phân biệt được theo URL (B9: "lựa chọn an toàn nhất cho public REST").
- Header versioning (`Accept: application/vnd.leximpact.v2+json`) linh hoạt hơn nhưng khó debug và khó cho consumer mới.

## Hệ quả
Version mới là router mới dùng chung service; phải duy trì song song trong thời gian deprecation.
