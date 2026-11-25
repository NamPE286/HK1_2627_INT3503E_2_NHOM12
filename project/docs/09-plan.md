# 09 — Kế hoạch thực hiện (tuần 12–15)

## 1. Mốc & sản phẩm
| Tuần | Mốc | Sản phẩm chính | Demo |
|---|---|---|---|
| 12 | Design Review + **1.0.0** | Brief, ERD, resource model, kiến trúc, OpenAPI + Swagger, backlog, slide 6–8; **chạy được**: đăng ký/đăng nhập, list/CRUD văn bản, upload | Swagger + web: đăng ký → tạo văn bản → upload → list → user khác 404 |
| 13 | Implementation Review | Content editor API (PUT content, provisions, revisions), violations + sanction-rules, seed, mở rộng Postman | ≥ 3 request thật + 1 request 401/404 chéo workspace |
| 14 | Technical Evaluation | MVP đầy đủ (editor + diagram FE), pattern singleton/revisions/ETag, unit+integration+contract tests, Docker, README | Use case hoàn chỉnh + chạy test suite |
| 15 | Final Defense | Load test k6, security review, kịch bản v1→v2, quickstart, báo cáo cuối kỳ, release tag | Bằng chứng chất lượng |

## 2. Phân công (đề xuất — nhóm chốt lại)
| Thành viên | Vai trò chính | Phụ trách |
|---|---|---|
| Bùi Hùng Nam (NamPE286) | Lead / Backend | Kiến trúc, legal-documents + content parser, review PR |
| Bùi Hải Phương | Backend | Auth, users, security tests, rate limit |
| Ngô Anh Tú | Backend | Violations, sanction-rules, `as_of`, performance test |
| Nguyễn Sơn | Frontend | Editor TipTap (`legalHeading`, numbering) |
| _(thành viên 5)_ | Frontend / QA | Diagram React Flow, Postman/Newman, docs |

## 3. Backlog khởi tạo (tạo thành GitHub Issues)
- [x] #setup Boilerplate api/frontend, docs, ai-rules *(nhánh `nambh/setup`)*
- [x] API-01 Drizzle schema + migration đầu tiên (seed: còn thiếu)
- [x] API-02 Auth Better Auth: sign-up/sign-in/sign-out, Argon2id, rate limit, workspace riêng
- [x] API-03 Legal documents CRUD + list + state machine + ETag
- [x] API-09 Upload file gốc (source-files)
- [ ] API-04 Content PUT: validate TipTap, parser → provisions, revisions
- [ ] API-05 Provisions read + full-text search (unaccent)
- [ ] API-06 Violations + sanction rules + `as_of` + overlap constraint
- [ ] API-07 Document relations
- [ ] API-08 Diagrams + ownership + If-Match
- [x] FE-01 Layout, router, auth (login/register), API client sinh type từ spec, trang văn bản + upload
- [ ] FE-02 Editor `legalHeading` + numbering + outline
- [ ] FE-03 Tra cứu hành vi + chi tiết chế tài
- [ ] FE-04 Diagram canvas
- [x] QA-01 Postman collection + Newman (chạy local; CI: còn thiếu)
- [ ] QA-02 k6 + báo cáo hiệu năng
- [x] OPS-01 Dockerfile + docker compose (GitHub Actions: còn thiếu)

## 4. Rủi ro
| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Parser content ↔ provision phức tạp | Trễ UC1 | Giới hạn MVP: danh sách phẳng block + heading; unit test sớm |
| Editor numbering lệch server | Lỗi 422 khó hiểu | Server chuẩn hoá & trả content; dùng chung bộ test case JSON cho FE/BE |
| Full-text tiếng Việt kém | Tra cứu sai | `unaccent` + trigram (`pg_trgm`) dự phòng |
| Thành viên mới với Bun/Elysia/TipTap | Chậm | AGENTS.md + ai-rules, pair programming |
| Môi trường demo hỏng | Mất điểm demo | Docker local 2 máy + video dự phòng |

## 5. Mẫu báo cáo tiến độ tuần (1–2 trang)
```
Tuần: __   Nhóm 12 — LexImpact
1. Đã làm (kèm link commit/PR/test/ảnh): ...
2. Chưa xong & lý do: ...
3. Vấn đề cần hỗ trợ: ...
4. Kế hoạch tuần tới (việc — người phụ trách — hạn): ...
5. Tiếp thu góp ý tuần trước: ...
```
