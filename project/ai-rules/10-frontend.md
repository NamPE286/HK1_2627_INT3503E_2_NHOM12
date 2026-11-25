# 10 — Frontend

## 10.1 Stack (MUST)
Bun · React 19 · Vite · TypeScript (strict) · React Router 7 · TanStack Query · **better-auth/react** · **TipTap** (editor) ·
**@xyflow/react** (diagram) · `openapi-typescript` (sinh type từ contract) · Vitest.

## 10.2 Cấu trúc
```
src/
├── app/            # router, providers (QueryClient, Auth)
├── lib/api/        # client.ts (fetch wrapper), schema.d.ts (generated), problem.ts
├── features/
│   ├── auth/
│   ├── documents/  # danh sách, chi tiết, tra cứu
│   ├── editor/     # TipTap + extension LegalHeading (Điều/Khoản/Điểm)
│   ├── violations/
│   └── diagrams/   # React Flow canvas
├── components/     # UI dùng chung
└── pages/          # route-level component
```

## 10.3 Gọi API (MUST)
- Chỉ gọi API qua `lib/api/client.ts`; base URL từ `VITE_API_BASE_URL` (mặc định `/api/v1`, Vite proxy sang :8000).
- Type request/response **sinh từ `docs/api/openapi.yaml`** (`bun run gen:api`), không tự viết lại type tay.
- Parse lỗi `application/problem+json` thành `ApiProblem`; hiển thị theo `code`, không hiển thị stack/raw.
- Auth chỉ qua `lib/auth-client.ts` (`signUp.email`, `signIn.email`, `signOut`, `useSession`). Phiên là cookie httpOnly
  ⇒ **không** lưu token trong `localStorage`; fetch dùng `credentials: "include"`.
- Route cần đăng nhập bọc trong `<RequireAuth>`; sau đăng nhập gọi `refetch()` session trước khi điều hướng.
- Đăng xuất ⇒ `queryClient.clear()` để không lộ dữ liệu workspace trước.
- Gửi `If-Match` khi lưu content/diagram; xử lý 412 bằng dialog "Có người khác vừa sửa — tải lại / ghi đè".

## 10.4 Editor (MUST — chức năng soạn thảo)
- Extension `legalHeading` với attrs `{ level: "CHAPTER" | "SECTION" | "ARTICLE" | "CLAUSE" | "POINT", number, title }`.
- Toolbar/slash command: **Chèn Chương / Mục / Điều / Khoản / Điểm**; phím tắt `Ctrl+Alt+1..5`.
- Đánh số tự động theo `11-domain-rules.md` (Điều liên tục toàn văn bản, Khoản 1..n trong Điều, Điểm a, b, c, d, đ…
  trong Khoản); renumber khi chèn/xoá/kéo thả.
- Validate phía client giống server (cấu trúc cha-con), nhưng **server là nguồn quyết định** (422).
- Lưu: `PUT /legal-documents/{id}/content` với JSON TipTap (`type: "doc"`), không gửi HTML. Autosave debounce ≥ 3 s.

## 10.5 Diagram (MUST — chức năng vẽ lược đồ thủ công)
- Node types: `DOCUMENT`, `PROVISION`, `VIOLATION`, `NOTE` (ref tới resource qua `ref_id`); edge có `relation_type`
  (`AMENDS`, `SUPPLEMENTS`, `REPLACES`, `REPEALS`, `REFERENCES`, `GUIDES`, `CUSTOM`) + `label`.
- Kéo thả tạo node, nối cạnh, đổi nhãn, xoá; lưu bằng `PATCH /diagrams/{id}` (If-Match). Giới hạn 500 node.
- Tuỳ chọn "Tạo node từ văn bản" (search `/legal-documents?q=`).

## 10.6 Chất lượng
- `bun run typecheck`, `bun run test`, `bun run build` pass trước PR. Không `any` không có lý do.
- UI tiếng Việt; hỗ trợ màn hình ≥ 360px.
