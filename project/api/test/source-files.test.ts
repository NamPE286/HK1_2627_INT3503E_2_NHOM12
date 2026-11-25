import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { makeTestApp, type TestApp } from "./helpers";

let t: TestApp;
let alice: string;
let bob: string;
let docId: string;

const PDF = new Uint8Array([...new TextEncoder().encode("%PDF-1.7\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF")]);
const form = (file: Blob, name: string) => {
  const f = new FormData();
  f.append("file", file, name);
  return f;
};
const upload = (token: string, file: Blob, name: string, id = docId) =>
  t.request(`/api/v1/legal-documents/${id}/source-files`, { method: "POST", token, form: form(file, name) });

beforeAll(async () => {
  t = await makeTestApp();
  alice = (await t.signUp("alice@example.com")).token;
  bob = (await t.signUp("bob@example.com")).token;
  const ws = await t.myWorkspace(alice);
  const res = await t.request(`/api/v1/workspaces/${ws}/legal-documents`, {
    method: "POST", token: alice,
    json: { kind: "IN_FORCE", doc_type: "NGHI_DINH", number: "168/2024/NĐ-CP", title: "Nghị định 168", issuer: "Chính phủ" },
  });
  docId = (await res.json()).id;
});
afterAll(async () => { await t.close(); });

describe("upload văn bản (source-files)", () => {
  let fileId: string;

  test("upload PDF → 201 + Location, metadata có sha256", async () => {
    const res = await upload(alice, new Blob([PDF], { type: "application/pdf" }), "Nghị định 168.pdf");
    expect(res.status).toBe(201);
    const body = await res.json();
    fileId = body.id;
    expect(res.headers.get("location")).toBe(`/api/v1/source-files/${fileId}`);
    expect(body).toMatchObject({ document_id: docId, original_filename: "Nghị định 168.pdf", mime_type: "application/pdf", format: "pdf", size_bytes: PDF.length });
    expect(body.sha256).toHaveLength(64);
    expect(body).not.toHaveProperty("storage_key");
  });

  test("upload TXT UTF-8 → 201", async () => {
    const res = await upload(alice, new Blob(["Điều 1. Phạm vi điều chỉnh"], { type: "text/plain" }), "dieu-1.txt");
    expect(res.status).toBe(201);
  });

  test("list file của văn bản (phân trang)", async () => {
    const res = await t.request(`/api/v1/legal-documents/${docId}/source-files?page_size=1`, { token: alice });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination).toEqual({ page: 1, page_size: 1, total_items: 2, total_pages: 2 });
  });

  test("tải nội dung file đúng byte + Content-Disposition", async () => {
    const res = await t.request(`/api/v1/source-files/${fileId}/content`, { token: alice });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("attachment; filename*=UTF-8''");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PDF);
  });

  test("trùng nội dung → 409; giả mạo PDF → 415; rỗng → 422; quá lớn → 413; sai Content-Type → 415", async () => {
    expect((await upload(alice, new Blob([PDF]), "copy.pdf")).status).toBe(409);
    const fake = await upload(alice, new Blob(["MZ not a pdf"], { type: "application/pdf" }), "virus.pdf");
    expect(fake.status).toBe(415);
    expect((await fake.json()).code).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect((await upload(alice, new Blob(["x"]), "a.exe")).status).toBe(415);
    expect((await upload(alice, new Blob([]), "empty.txt")).status).toBe(422);
    const big = new Uint8Array(1024 * 1024 + 10); big.set(PDF);
    expect((await upload(alice, new Blob([big]), "big.pdf")).status).toBe(413);
    const json = await t.request(`/api/v1/legal-documents/${docId}/source-files`, { method: "POST", token: alice, json: { file: "x" } });
    expect(json.status).toBe(415);
  });

  test("thiếu field file → 422", async () => {
    const f = new FormData(); f.append("other", "x");
    const res = await t.request(`/api/v1/legal-documents/${docId}/source-files`, { method: "POST", token: alice, form: f });
    expect(res.status).toBe(422);
  });

  test("không phải thành viên: Bob không upload/xem/tải/xoá được → 404; không đăng nhập → 401", async () => {
    expect((await upload(bob, new Blob([PDF]), "x.pdf")).status).toBe(404);
    expect((await t.request(`/api/v1/source-files/${fileId}`, { token: bob })).status).toBe(404);
    expect((await t.request(`/api/v1/source-files/${fileId}/content`, { token: bob })).status).toBe(404);
    expect((await t.request(`/api/v1/source-files/${fileId}`, { method: "DELETE", token: bob })).status).toBe(404);
    expect((await t.request(`/api/v1/legal-documents/${docId}/source-files`)).status).toBe(401);
  });

  test("văn bản đã chốt không nhận upload → 409", async () => {
    await t.request(`/api/v1/legal-documents/${docId}`, {
      method: "PATCH", token: alice, json: { status: "FINALIZED", issued_date: "2024-12-26", effective_date: "2025-01-01" },
    });
    expect((await upload(alice, new Blob(["Điều 2"]), "d2.txt")).status).toBe(409);
  });

  test("DELETE → 204, sau đó 404", async () => {
    expect((await t.request(`/api/v1/source-files/${fileId}`, { method: "DELETE", token: alice })).status).toBe(204);
    expect((await t.request(`/api/v1/source-files/${fileId}/content`, { token: alice })).status).toBe(404);
  });
});
