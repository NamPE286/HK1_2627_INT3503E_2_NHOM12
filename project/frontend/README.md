# LexImpact Web (React · Vite · TypeScript · Bun)

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
| `/` | Chuyển tới workspace gần nhất / workspace của tôi |
| `/w/:workspaceId` | Văn bản hiện hành & dự thảo (tab), tìm, lọc trạng thái, phân trang, tạo mới + upload (OWNER) |
| `/w/:workspaceId/members` | Chia sẻ chỉ đọc: mời theo email, thu hồi, tự rời |
| `/documents/:id` | Chi tiết, chốt/lưu trữ/xoá, file gốc (người xem chỉ đọc) |
| `/documents/:id/editor` | Soạn Điều/Khoản/Điểm + chỉ dẫn thay đổi (FE-02, đang phát triển) |
| `/w/:workspaceId/diagrams` | Lược đồ tác động (FE-04, đang phát triển) |

Quy tắc: [`../ai-rules/10-frontend.md`](../ai-rules/10-frontend.md). Mọi lời gọi API qua `src/lib/api/client.ts`;
auth qua `src/lib/auth-client.ts` (cookie httpOnly, không lưu token ở localStorage).
