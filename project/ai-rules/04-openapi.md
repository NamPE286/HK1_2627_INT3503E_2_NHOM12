# 04 — OpenAPI specification

## 04.1 Nguồn sự thật (MUST)
- File contract: `docs/api/openapi.yaml`, **OpenAPI 3.1.0**. Mọi thay đổi API sửa file này trước.
- Backend phục vụ **chính file contract** qua Swagger UI tại `/docs` và `/api/v1/openapi.json`.
- Endpoint auth do Better Auth sinh tài liệu riêng tại `/api/auth/reference` — không chép vào contract.
- `api/test/platform.test.ts` bảo đảm **mọi route `/api/v1` runtime đều có trong contract** (không có endpoint ẩn).
- Frontend sinh type từ contract (`bun run gen:api`) ⇒ đổi contract mà quên FE sẽ lỗi typecheck.

## 04.2 Cấu trúc (MUST)
- `info` có `title`, `version` (semver của contract), `description` (quickstart ngắn + auth).
- `servers`: local (`http://localhost:8000/api/v1`) và staging nếu có.
- `tags` theo resource: `Users`, `LegalDocuments`, `SourceFiles`, `Provisions`, `DocumentRelations`, `Violations`,
  `SanctionRules`, `Diagrams`.
- Mỗi operation có: `operationId` (camelCase, động từ + danh từ: `listLegalDocuments`, `replaceDocumentContent`),
  `summary`, `tags`, `security` (mặc định toàn cục `cookieAuth` | `bearerAuth`), **mọi response code có thể xảy ra**.
- Tái sử dụng qua `components`: `schemas`, `parameters` (Page, PageSize, Sort, Fields, IfMatch, IdempotencyKey),
  `responses` (BadRequest, Unauthorized, Forbidden, NotFound, Conflict, UnprocessableEntity, TooManyRequests…),
  `headers` (ETag, Location, Link, RetryAfter), `securitySchemes.cookieAuth` + `bearerAuth`.
- Tách schema theo vai trò: `XxxCreate` (input POST), `XxxUpdate` (PATCH, mọi field optional), `Xxx` (output).
  Field chỉ-đọc (`id`, `created_at`) chỉ nằm trong output hoặc đánh dấu `readOnly: true`.
- Mỗi schema có `description`, `example`/`examples`; field có `format`, `minLength/maxLength`, `minimum`, `enum`.
- `additionalProperties: false` cho input schema (chống mass-assignment).

## 04.3 Lint (MUST)
- `spectral lint docs/api/openapi.yaml --ruleset .spectral.yaml` pass trước khi merge (ruleset nằm tại `project/.spectral.yaml`).
- Rule riêng: path kebab-case, property snake_case, mọi operation có 4xx, không có động từ phổ biến trong path.

## 04.4 Ví dụ & DX (SHOULD)
- Có ví dụ request/response cho luồng chính (soạn văn bản → lưu content → tạo chế tài → tra cứu).
- Mô tả rõ quy tắc nghiệp vụ trong `description` của operation (vd state machine của `status`).
