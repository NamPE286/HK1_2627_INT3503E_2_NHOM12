# 08 — Versioning & API lifecycle

Rule: [`../ai-rules/09-versioning.md`](../ai-rules/09-versioning.md) · ADR: [`adr/0002-versioning.md`](adr/0002-versioning.md).

## 1. Chiến lược
- URI major version `/api/v1`; contract semver trong `info.version`; changelog tại `api/CHANGELOG.md`.
- Trong v1 chỉ thêm (additive). Breaking ⇒ v2 chạy song song v1.

## 2. Kịch bản thay đổi v1 → v2 (demo tuần 15)
**Lý do nghiệp vụ**: hỗ trợ mức phạt theo nhiều đơn vị/khung (cá nhân vs tổ chức — tổ chức bị phạt gấp đôi) và
biểu diễn trừ điểm nhất quán.

v1 (`SanctionRule`):
```json
{ "fine_min_vnd": 400000, "fine_max_vnd": 600000,
  "point_deduction_applicability": "APPLIES", "points_deducted": 2 }
```
v2:
```json
{ "fines": [ { "subject": "INDIVIDUAL", "min": 400000, "max": 600000, "currency": "VND" },
             { "subject": "ORGANIZATION", "min": 800000, "max": 1200000, "currency": "VND" } ],
  "point_deduction": { "applicability": "APPLIES", "points": 2 } }
```
⇒ Đổi tên + đổi kiểu field = **breaking** ⇒ `/api/v2/violations/{id}/sanction-rules`, `/api/v2/sanction-rules/{id}`.

## 3. Kế hoạch migration & deprecation
| Pha | Thời gian (mô phỏng) | Việc làm | Đo |
|---|---|---|---|
| Plan | T0 | Công bố v2 spec + migration guide; v1 thêm `Deprecation` header | – |
| Pilot | T0 → T0+30d | Frontend TrafficLex chuyển sang v2 trước | lỗi v2 < 0.5% |
| Migrate | T0+30d → T0+180d | Thông báo consumer (email, changelog, banner docs); v1 trả `Sunset: <date>`, `Link: rel="deprecation"` | % traffic v1 qua log `X-Api-Version-Served` |
| Sunset | T0+180d | v1 sanction-rules trả `410 Gone` problem+json + link guide; giữ code archive 12 tháng | traffic v1 ≈ 0 |

Triển khai kỹ thuật: cùng DB (thêm bảng `sanction_fines` theo expand → migrate → contract; v1 đọc dòng `INDIVIDUAL`),
router v2 riêng, service dùng chung (Strangler Fig ở tầng routing).

## 4. Release & vận hành
- Release: tag `vX.Y.Z` trên `main` sau khi CI xanh; GitHub Release kèm changelog.
- Monitoring: log JSON + `/healthz`, `/readyz`; theo dõi error rate 5xx, p95 latency, 401/403 bất thường.
- Sự cố: rollback image tag trước; migration có `downgrade`; runbook trong README.
- Bảo trì: rà dependency hàng tháng (`pip-audit`, `npm audit`).
