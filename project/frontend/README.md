# TrafficLex Web (React · Vite · TypeScript · Bun)

```bash
cd project/frontend
bun install
bun run dev          # http://localhost:5173 — proxy /api → http://localhost:8000 (chạy api trước)
bun run gen:api      # sinh src/lib/api/schema.d.ts từ ../docs/api/openapi.yaml
bun run typecheck && bun run test && bun run build
```

| Route | Trang |
|---|---|
| `/login`, `/register` | Better Auth (`signIn.email`, `signUp.email`) |
| `/documents` | Văn bản của tôi: tìm, lọc trạng thái, phân trang, tạo mới + upload file |
| `/documents/:id` | Chi tiết, xuất bản/lưu trữ/xoá, danh sách file gốc (upload, tải, xoá) |
| `/documents/:id/editor` | Soạn thảo Điều/Khoản/Điểm (FE-02, đang phát triển) |
| `/diagrams` | Vẽ lược đồ (FE-04, đang phát triển) |

Quy tắc: [`../ai-rules/10-frontend.md`](../ai-rules/10-frontend.md). Mọi lời gọi API qua `src/lib/api/client.ts`;
auth qua `src/lib/auth-client.ts` (cookie httpOnly, không lưu token ở localStorage).
