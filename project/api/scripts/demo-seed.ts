/**
 * Dữ liệu demo qua chính API (không ghi thẳng DB) — idempotent, chạy lại không tạo trùng.
 *   bun run demo:seed            (API ở http://localhost:8000)
 *   API_URL=... DEMO_EMAIL=... DEMO_PASSWORD=... bun run demo:seed
 * Chỉ dùng cho môi trường local/demo.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

const API = process.env.API_URL ?? "http://localhost:8000";
const ORIGIN = process.env.DEMO_ORIGIN ?? "http://localhost:5173";
const EMAIL = process.env.DEMO_EMAIL ?? "demo@trafficlex.local";
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo!12345";
const DEMO_DIR = new URL("../demo", import.meta.url).pathname;

type Doc = {
  doc_type: string; number: string; title: string; issuer: string;
  issued_date: string; effective_date: string; files: string[]; publish: boolean;
};

const DOCS: Doc[] = [
  {
    doc_type: "NGHI_DINH", number: "100/2019/NĐ-CP", issuer: "Chính phủ",
    title: "Quy định xử phạt vi phạm hành chính trong lĩnh vực giao thông đường bộ và đường sắt",
    issued_date: "2019-12-30", effective_date: "2020-01-01", files: ["nghi-dinh-100-2019-demo.pdf"], publish: true,
  },
  {
    doc_type: "NGHI_DINH", number: "123/2021/NĐ-CP", issuer: "Chính phủ",
    title: "Sửa đổi, bổ sung một số điều của các nghị định quy định xử phạt vi phạm hành chính trong lĩnh vực hàng hải; giao thông đường bộ, đường sắt; hàng không dân dụng",
    issued_date: "2021-12-28", effective_date: "2022-01-01", files: ["nghi-dinh-123-2021-demo.pdf"], publish: true,
  },
  {
    doc_type: "NGHI_DINH", number: "168/2024/NĐ-CP", issuer: "Chính phủ",
    title: "Quy định xử phạt vi phạm hành chính về trật tự, an toàn giao thông trong lĩnh vực giao thông đường bộ; trừ điểm, phục hồi điểm giấy phép lái xe",
    issued_date: "2024-12-26", effective_date: "2025-01-01",
    files: ["nghi-dinh-168-2024-demo.pdf", "cau-truc-mau-dieu-khoan-diem.txt"], publish: false,
  },
];

async function auth(): Promise<string> {
  const post = (path: string, body: unknown) =>
    fetch(`${API}/api/auth/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify(body),
    });
  let res = await post("sign-in/email", { email: EMAIL, password: PASSWORD });
  if (res.status === 401) res = await post("sign-up/email", { email: EMAIL, password: PASSWORD, name: "Tài khoản demo" });
  const token = res.headers.get("set-auth-token");
  if (!res.ok || !token) throw new Error(`Không đăng nhập được (${res.status}): ${await res.text()}`);
  return token;
}

async function main() {
  const token = await auth();
  const api = (path: string, init: RequestInit = {}) =>
    fetch(`${API}/api/v1${path}`, { ...init, headers: { authorization: `Bearer ${token}`, ...init.headers } });
  const available = new Set(readdirSync(DEMO_DIR));

  for (const d of DOCS) {
    const found = (await (await api(`/legal-documents?number=${encodeURIComponent(d.number)}`)).json()) as {
      data: { id: string }[];
    };
    if (found.data.length) {
      console.log(`= ${d.number} đã có, bỏ qua`);
      continue;
    }
    const { files, publish, ...body } = d;
    const created = await api("/legal-documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (created.status !== 201) throw new Error(`Tạo ${d.number} lỗi ${created.status}: ${await created.text()}`);
    const { id } = (await created.json()) as { id: string };
    for (const name of files.filter((f) => available.has(f))) {
      const form = new FormData();
      form.append("file", Bun.file(join(DEMO_DIR, name)), name);
      const up = await api(`/legal-documents/${id}/source-files`, { method: "POST", body: form });
      console.log(`  ↑ ${name}: ${up.status}`);
    }
    if (publish) {
      const pub = await api(`/legal-documents/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      console.log(`  ✓ xuất bản: ${pub.status}`);
    }
    console.log(`+ ${d.number} (${id})`);
  }
  console.log(`\nĐăng nhập web bằng ${EMAIL} / ${PASSWORD}`);
}

await main();
