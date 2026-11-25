import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { makeTestApp, type TestApp } from "./helpers";

let t: TestApp;
let alice: string;
let bob: string;
let ws: string;
let bobWs: string;
const sample = {
  kind: "IN_FORCE",
  doc_type: "NGHI_DINH",
  number: "168/2024/NĐ-CP",
  title: "Quy định xử phạt vi phạm hành chính về trật tự, an toàn giao thông trong lĩnh vực giao thông đường bộ",
  issuer: "Chính phủ",
  issued_date: "2024-12-26",
  effective_date: "2025-01-01",
};

beforeAll(async () => {
  t = await makeTestApp();
  alice = (await t.signUp("alice@example.com")).token;
  bob = (await t.signUp("bob@example.com")).token;
  ws = await t.myWorkspace(alice);
  bobWs = await t.myWorkspace(bob);
});
afterAll(async () => { await t.close(); });

const create = (token: string, json: unknown = sample, workspace?: string) =>
  t.request(`/api/v1/workspaces/${workspace ?? (token === bob ? bobWs : ws)}/legal-documents`, { method: "POST", token, json });
const listUrl = () => `/api/v1/workspaces/${ws}/legal-documents`;

describe("legal-documents CRUD", () => {
  let id: string;

  test("POST → 201 + Location + ETag, status EDITING", async () => {
    const res = await create(alice);
    expect(res.status).toBe(201);
    const doc = await res.json();
    id = doc.id;
    expect(res.headers.get("location")).toBe(`/api/v1/legal-documents/${id}`);
    expect(res.headers.get("etag")).toBe('W/"1"');
    expect(doc).toMatchObject({ kind: "IN_FORCE", status: "EDITING", version: 1, number: sample.number, current_revision: 0, workspace_id: ws });
  });

  test("trùng số hiệu trong cùng workspace → 409 DUPLICATE_RESOURCE", async () => {
    const res = await create(alice);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("DUPLICATE_RESOURCE");
  });

  test("body sai schema / field lạ (mass-assignment) → 422; JSON hỏng → 400; sai Content-Type → 415", async () => {
    expect((await create(alice, { ...sample, number: "" })).status).toBe(422);
    const extra = await create(alice, { ...sample, number: "1/2025/TT", owner_id: "x" });
    expect(extra.status).toBe(422);
    expect((await extra.json()).code).toBe("VALIDATION_ERROR");
    const broken = await t.request(listUrl(), {
      method: "POST", token: alice, headers: { "content-type": "application/json" }, body: "{bad",
    });
    expect(broken.status).toBe(400);
    const text = await t.request(listUrl(), {
      method: "POST", token: alice, headers: { "content-type": "text/plain" }, body: "hello",
    });
    expect(text.status).toBe(415);
  });

  test("GET list: phân trang, filter, sort, fields; query sai → 400", async () => {
    await create(alice, { ...sample, number: "100/2019/NĐ-CP", issued_date: "2019-12-30" });
    const res = await t.request(`${listUrl()}?page=1&page_size=1&sort=-issued_date&fields=number`, { token: alice });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination).toEqual({ page: 1, page_size: 1, total_items: 2, total_pages: 2 });
    expect(body.data[0]).toEqual({ id: expect.any(String), number: "168/2024/NĐ-CP" });
    expect(res.headers.get("link")).toContain('rel="next"');
    const filtered = await (await t.request(`${listUrl()}?issued_before=2020-01-01`, { token: alice })).json();
    expect(filtered.data.map((d: any) => d.number)).toEqual(["100/2019/NĐ-CP"]);
    for (const q of ["page_size=1000", "sort=title", "fields=password", "status=BOGUS", "kind=OTHER"]) {
      const bad = await t.request(`${listUrl()}?${q}`, { token: alice });
      expect(bad.status).toBe(400);
      expect((await bad.json()).code).toBe("INVALID_QUERY_PARAMETER");
    }
  });

  test("GET item + If-None-Match → 304", async () => {
    const res = await t.request(`/api/v1/legal-documents/${id}`, { token: alice });
    expect(res.status).toBe(200);
    const again = await t.request(`/api/v1/legal-documents/${id}`, { token: alice, headers: { "if-none-match": 'W/"1"' } });
    expect(again.status).toBe(304);
  });

  test("PATCH với If-Match lệch → 412; đúng → 200 + version tăng", async () => {
    const stale = await t.request(`/api/v1/legal-documents/${id}`, {
      method: "PATCH", token: alice, headers: { "if-match": 'W/"99"' }, json: { title: "x" },
    });
    expect(stale.status).toBe(412);
    const ok = await t.request(`/api/v1/legal-documents/${id}`, {
      method: "PATCH", token: alice, headers: { "if-match": 'W/"1"' }, json: { issuer: "Chính phủ nước CHXHCN Việt Nam" },
    });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("etag")).toBe('W/"2"');
  });

  test("state machine: EDITING → FINALIZED → ARCHIVED; không quay lại; đã chốt không xoá được", async () => {
    const pub = await t.request(`/api/v1/legal-documents/${id}`, { method: "PATCH", token: alice, json: { status: "FINALIZED" } });
    expect(pub.status).toBe(200);
    expect((await pub.json()).finalized_at).toBeString();
    const back = await t.request(`/api/v1/legal-documents/${id}`, { method: "PATCH", token: alice, json: { status: "EDITING" } });
    expect(back.status).toBe(409);
    expect((await back.json()).code).toBe("INVALID_STATE_TRANSITION");
    const edit = await t.request(`/api/v1/legal-documents/${id}`, { method: "PATCH", token: alice, json: { title: "Đổi" } });
    expect(edit.status).toBe(409);
    expect((await t.request(`/api/v1/legal-documents/${id}`, { method: "DELETE", token: alice })).status).toBe(409);
  });

  test("DELETE văn bản EDITING → 204, gọi lại → 404 (idempotent về trạng thái)", async () => {
    const draft = await (await create(alice, { ...sample, number: "2/2025/TT-BCA" })).json();
    expect((await t.request(`/api/v1/legal-documents/${draft.id}`, { method: "DELETE", token: alice })).status).toBe(204);
    expect((await t.request(`/api/v1/legal-documents/${draft.id}`, { method: "DELETE", token: alice })).status).toBe(404);
  });
});

describe("cách ly giữa workspace (BOLA)", () => {
  test("Bob (không phải thành viên) không thấy, không sửa, không xoá văn bản của Alice → 404", async () => {
    const doc = await (await create(alice, { ...sample, number: "36/2024/QH15", doc_type: "LUAT" })).json();
    expect((await t.request(`/api/v1/legal-documents/${doc.id}`, { token: bob })).status).toBe(404);
    expect((await t.request(`/api/v1/legal-documents/${doc.id}`, { method: "PATCH", token: bob, json: { title: "hack" } })).status).toBe(404);
    expect((await t.request(`/api/v1/legal-documents/${doc.id}`, { method: "DELETE", token: bob })).status).toBe(404);
    const list = await (await t.request(`/api/v1/workspaces/${bobWs}/legal-documents`, { token: bob })).json();
    expect((await t.request(listUrl(), { token: bob })).status).toBe(404);
    expect(list.pagination.total_items).toBe(0);
  });

  test("hai workspace có thể cùng nhập một số hiệu văn bản", async () => {
    expect((await create(bob)).status).toBe(201);
  });

  test("id không phải UUID → 400", async () => {
    expect((await t.request("/api/v1/legal-documents/not-a-uuid", { token: alice })).status).toBe(400);
  });
});

describe("PATCH không tự chèn field ngoài ý muốn", () => {
  test("không đổi được kind (422) và dự thảo chốt được không cần ngày ban hành", async () => {
    const draft = await (await create(alice, { kind: "DRAFT", doc_type: "NGHI_DINH", number: "DT-99", title: "Dự thảo", issuer: "[x]" })).json();
    expect((await t.request(`/api/v1/legal-documents/${draft.id}`, { method: "PATCH", token: alice, json: { kind: "IN_FORCE" } })).status).toBe(422);
    const fin = await t.request(`/api/v1/legal-documents/${draft.id}`, { method: "PATCH", token: alice, json: { status: "FINALIZED" } });
    expect(fin.status).toBe(200);
  });

  test("văn bản hiện hành thiếu ngày → không chốt được (422)", async () => {
    const d = await (await create(alice, { kind: "IN_FORCE", doc_type: "LUAT", number: "L-1", title: "Luật", issuer: "Quốc hội" })).json();
    expect((await t.request(`/api/v1/legal-documents/${d.id}`, { method: "PATCH", token: alice, json: { status: "FINALIZED" } })).status).toBe(422);
  });

  test("PATCH chỉ issuer giữ nguyên doc_type/status", async () => {
    const doc = await (await create(alice, { ...sample, number: "5/2025/TT-BCA", doc_type: "THONG_TU" })).json();
    const res = await t.request(`/api/v1/legal-documents/${doc.id}`, { method: "PATCH", token: alice, json: { issuer: "Bộ Công an" } });
    expect(await res.json()).toMatchObject({ doc_type: "THONG_TU", status: "EDITING", kind: "IN_FORCE", issuer: "Bộ Công an" });
  });
});
