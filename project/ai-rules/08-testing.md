# 08 — Kiểm thử

## 08.1 Ba lớp cho mỗi endpoint (MUST)
1. **Protocol**: status code, headers (`Location`, `ETag`, `Content-Type`, `WWW-Authenticate`, `Retry-After`).
2. **Schema**: response khớp OpenAPI schema (đủ field, đúng type, không thừa field nhạy cảm).
3. **Business rule**: quy tắc nghiệp vụ (cây Điều/Khoản/Điểm, khoảng hiệu lực, state machine, ownership).

## 08.2 Checklist case tối thiểu mỗi endpoint (MUST)
- Happy path · thiếu field / field sai kiểu (422/400) · 401 (không token) · **404 khi truy cập từ workspace khác** · 404 ·
  409 nếu có ràng buộc unique/state · idempotency PUT/DELETE (gọi 2 lần) · 412/428 nếu có `If-Match`.

## 08.3 Loại test & công cụ
| Loại | Công cụ | Vị trí | Khi chạy |
|---|---|---|---|
| Unit (numbering, parser content → provisions, as_of) | `bun test` | `api/test/*.test.ts` | mỗi commit |
| Integration/API (`app.handle(Request)` + **PGlite** in-memory) | `bun test` | `api/test/` | mỗi PR |
| Contract (route runtime ⊆ spec) | `bun test` | `api/test/platform.test.ts` | mỗi PR |
| Lint spec | Spectral | `bun run lint:spec` | mỗi PR |
| Collection end-to-end (server thật + Postgres) | Postman + **Newman** | `api/postman/` | trước demo |
| Security (401/cross-workspace/upload/rate limit) | `bun test` + Postman | `api/test/` | tuần 15 |
| Performance/load | **k6** | `api/perf/` | tuần 15 |
| E2E UI | Playwright | `docs/evidence/` (ảnh) | trước demo |
| Frontend | Vitest + Testing Library | `frontend/src/**/*.test.tsx` | mỗi PR |

## 08.4 Quy tắc (MUST)
- Mỗi file test tạo app + PGlite riêng (`makeTestApp()` trong `test/helpers.ts`), chạy migration thật ⇒ không cần Postgres.
- Không gọi mạng ngoài trong test. Tạo user bằng `signUp()` (qua Better Auth thật) ⇒ dùng `token` cho request.
- Coverage mục tiêu ≥ 80% cho `service.ts`; báo cáo bằng `bun test --coverage`.
- Bug sửa xong phải có regression test.

## 08.5 Performance (MUST tuần 15)
- Ghi rõ điều kiện: môi trường (máy, Docker), số concurrent users, ramp-up, thời lượng, workload mix
  (vd 70% `GET /violations?q=`, 20% `GET /provisions/{id}`, 10% `PUT content`).
- Báo cáo **p50/p95 latency, throughput (RPS), error rate**; SLO mục tiêu: p95 < 300 ms cho GET tra cứu ở 50 users.
- Nêu ít nhất một bottleneck và cách cải thiện (index, cache, eager loading) kèm số liệu trước/sau.

## 08.6 Báo cáo test
`docs/06-testing-strategy.md` cập nhật: số test case, pass/fail, coverage, danh sách lỗi đã sửa.
