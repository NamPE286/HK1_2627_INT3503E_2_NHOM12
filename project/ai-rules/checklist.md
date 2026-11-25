# Checklist trước khi commit / mở PR

## A. 9 tiêu chí peer-review API (Bài 3)
- [ ] 01 Tài nguyên là danh từ, method diễn đạt hành động
- [ ] 02 Naming nhất quán: lowercase, kebab-case path, snake_case query/JSON, số nhiều cho collection
- [ ] 03 Status code đúng nghĩa; không 200 + lỗi
- [ ] 04 Idempotency rõ: PUT/DELETE idempotent; POST quan trọng hỗ trợ `Idempotency-Key`
- [ ] 05 Lỗi theo problem+json có `type/title/status/detail/instance/code`
- [ ] 06 Collection có phân trang với giới hạn trên
- [ ] 07 Filter/sort/fields cho field chính, whitelist
- [ ] 08 Auth qua Better Auth (cookie/Bearer header), rate limit, mọi truy vấn lọc `owner_id` (workspace khác ⇒ 404)
- [ ] 09 Có version prefix; thay đổi breaking có kế hoạch deprecation

## B. Definition of Done
- [ ] `docs/api/openapi.yaml` cập nhật trước/cùng code; Spectral lint pass
- [ ] Test: happy + 400/422 + 401 + cross-workspace 404 (+409/412/413/415/428 nếu có); `bun test` pass
- [ ] Không có route ngoài contract (contract test pass)
- [ ] Không secret trong diff; `.env.example` cập nhật nếu thêm biến
- [ ] Migration drizzle-kit (nếu đổi schema) đã review SQL
- [ ] Docs/CHANGELOG/ADR cập nhật nếu đổi quy ước hoặc contract
- [ ] Frontend: `bun run typecheck && bun run test && bun run build` pass; `bun run gen:api` sau khi đổi spec
- [ ] Bằng chứng (output test, ảnh Swagger/Postman) đính kèm PR
