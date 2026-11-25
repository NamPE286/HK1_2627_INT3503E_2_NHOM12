# 06 — Testing strategy & test report

Rule: [`../ai-rules/08-testing.md`](../ai-rules/08-testing.md).

## 1. Kim tự tháp test
| Tầng | Công cụ | Mục tiêu | Ví dụ |
|---|---|---|---|
| Unit | bun test | Logic thuần, nhanh | parser content → provisions; đánh số Điểm `a…đ…`; tính `status` theo `as_of`; chồng lấn khoảng hiệu lực |
| Integration/API | bun test + `app.handle()` + **PGlite** | Route + DB + Better Auth thật | đăng ký → tạo văn bản → upload → list; 400/401/404/409/412/413/415/422 |
| Contract | bun test (route ⊆ spec) + Spectral + type FE sinh từ spec | Spec ⇔ code | không route lạ; FE lỗi typecheck nếu spec đổi |
| E2E collection | Postman + Newman | Luồng nghiệp vụ demo với Postgres thật | 15 request, 18 assertion |
| E2E UI | Playwright | Luồng người dùng | ảnh trong `docs/evidence/` |
| Security | bun test / Postman | OWASP | cross-workspace 404, mass-assignment `owner_id`, file giả mạo 415, token sau sign-out 401 |
| Performance | k6 | NFR-1 | 50 VU, 3 phút (`api/perf/`) |
| Frontend | Vitest | API client, numbering extension | parse problem+json, query snake_case |

## 2. Ma trận test tối thiểu (luồng trọng tâm)
✅ = đã có test trong 1.0.0 · ☐ = kế hoạch.

| Endpoint | Happy | 400/422 | 401 | 404 chéo workspace | 409 | 412/428 | Khác |
|---|---|---|---|---|---|---|---|
| POST /legal-documents | ✅ | ✅ 422 + 400 JSON hỏng | ✅ | – | ✅ số hiệu trùng | – | ✅ 415 |
| GET /legal-documents | ✅ phân trang/sort/fields/filter | ✅ 400 | ✅ | ✅ list rỗng | – | – | ✅ Link |
| GET/PATCH/DELETE /legal-documents/{id} | ✅ | ✅ 400 uuid | ✅ | ✅ | ✅ transition | ✅ 412, 304 | ✅ PATCH không chèn default |
| POST …/source-files | ✅ PDF, TXT | ✅ 422 rỗng/thiếu file | ✅ | ✅ | ✅ trùng SHA / không DRAFT | – | ✅ 413, 415 |
| GET /source-files/{id}/content | ✅ đúng byte | – | ✅ | ✅ | – | – | ✅ attachment |
| PUT …/content | ☐ | ☐ hierarchy | ☐ | ☐ | ☐ in-use | ☐ | – |
| POST …/sanction-rules | ☐ | ☐ fine/interval | ☐ | ☐ | – | – | – |
| GET /violations?as_of | ✓ | ✓ date sai | – | – | – | – | – |
| PATCH /diagrams/{id} | ✓ | ✓ >500 node | ✓ | ✓ không owner | ✓ private | – | ✓ / ✓ |

## 3. Kế hoạch performance (tuần 15)
- Môi trường: docker compose trên máy dev (ghi CPU/RAM), PostgreSQL seed 50 văn bản, 5.000 provisions, 500 hành vi, 1.500 chế tài.
- Workload: 70% `GET /violations?q=`, 20% `GET /provisions/{id}`, 10% `GET /legal-documents/{id}/content`; thêm kịch bản ghi `PUT content` 5 users.
- Tải: 10 → 50 → 100 users, ramp 10 users/s, mỗi mức 5 phút.
- Chỉ số: p50, p95, p99, RPS, error rate. SLO: p95 < 300 ms @ 50 users.
- Giả thuyết bottleneck: full-text không index / N+1 khi trả `current_sanctions` ⇒ thêm GIN + `selectinload`, đo trước/sau.

## 4. Lệnh
```bash
cd project/api && bun test --coverage
bun run test:newman            # cần server + Postgres đang chạy
k6 run -e TOKEN=<set-auth-token> perf/k6-list-documents.js
cd ../frontend && bun run test
```

## 5. Test report (cập nhật mỗi tuần)
| Tuần | Số test | Pass | Fail | Coverage | Lỗi đã sửa |
|---|---|---|---|---|---|
| 12 (1.0.0) | API 35 (bun test) + 18 assertion Newman + FE 2 | tất cả | 0 | – | Elysia tự điền default cho enum optional (PATCH đổi `doc_type`) → regression test; lỗi phân loại 400/422 cho query số |
| 13 | | | | | |
| 14 | | | | | |
| 15 | | | | | |
