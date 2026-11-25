# AI Rules — mục lục

Các rule này được rút ra từ bài giảng INT3505E (B1–B9), hướng dẫn báo cáo tuần 12–15 và giáo trình
(Geewax — *API Design Patterns*; Higginbotham — *Principles of Web API Design*).
Áp dụng cho **cả người và AI agent**.

Mức độ:
- **MUST** — bắt buộc. Vi phạm ⇒ PR bị từ chối.
- **SHOULD** — nên làm; nếu bỏ qua phải ghi lý do trong PR/ADR.
- **MAY** — tuỳ chọn.

| # | File | Nội dung | Nguồn bài giảng |
|---|------|----------|-----------------|
| 00 | [00-workflow.md](00-workflow.md) | Quy trình design-first, git, bằng chứng, cách agent làm việc | B0, B4, tuần 12–15 |
| 01 | [01-api-design.md](01-api-design.md) | Resource, naming, HTTP methods, status codes, idempotency | B2, B3 |
| 02 | [02-errors.md](02-errors.md) | Error response RFC 9457 problem+json, mã lỗi | B3, B7 |
| 03 | [03-collections.md](03-collections.md) | Pagination, filtering, sorting, sparse fieldsets | B3, B5 |
| 04 | [04-openapi.md](04-openapi.md) | Quy tắc viết OpenAPI 3.1, Swagger UI, lint | B4 |
| 05 | [05-auth-security.md](05-auth-security.md) | Better Auth, workspace riêng (tenant), Argon2id, upload an toàn, OWASP API Top 10 | B6, tuần 15 |
| 06 | [06-backend-architecture.md](06-backend-architecture.md) | Elysia/Bun layering, config, logging, health, migration, Docker | B7 |
| 07 | [07-data-modeling.md](07-data-modeling.md) | Resource ≠ DB schema, quan hệ, ID, migration | B5, B7 |
| 08 | [08-testing.md](08-testing.md) | Test 3 lớp, bun test + PGlite, Postman/Newman, contract, k6 | B8, tuần 13–15 |
| 09 | [09-versioning.md](09-versioning.md) | Versioning, backward compatibility, deprecation, Sunset | B9, tuần 15 |
| 10 | [10-frontend.md](10-frontend.md) | Quy tắc frontend: API client, editor, diagram | — |
| 11 | [11-domain-rules.md](11-domain-rules.md) | Business rules pháp lý: Điều/Khoản/Điểm, chế tài, hiệu lực | SRS |
| ✓ | [checklist.md](checklist.md) | Checklist 9 tiêu chí peer-review + DoD | B3, B8 |
