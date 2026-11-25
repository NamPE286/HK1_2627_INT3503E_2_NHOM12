import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { makeTestApp, type TestApp } from "./helpers";

let t: TestApp;
let alice: string;
let bob: string;
let carol: string;
let bobId: string;
let ws: string;
let docId: string;

beforeAll(async () => {
  t = await makeTestApp();
  alice = (await t.signUp("alice@example.com", "S3cure!pass", "Alice")).token;
  const b = await t.signUp("bob@example.com", "S3cure!pass", "Bob");
  bob = b.token;
  bobId = b.user.id;
  carol = (await t.signUp("carol@example.com", "S3cure!pass", "Carol")).token;
  ws = await t.myWorkspace(alice);
  const res = await t.request(`/api/v1/workspaces/${ws}/legal-documents`, {
    method: "POST", token: alice,
    json: { kind: "DRAFT", doc_type: "NGHI_DINH", number: "DT-01", title: "Dự thảo sửa đổi", issuer: "[Cơ quan soạn thảo]" },
  });
  docId = (await res.json()).id;
});
afterAll(async () => { await t.close(); });

describe("workspace", () => {
  test("đăng ký xong có sẵn một workspace OWNER", async () => {
    const res = await t.request("/api/v1/workspaces", { token: alice });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ my_role: "OWNER", member_count: 1, owner: { display_name: "Alice" } });
  });

  test("tạo, đổi tên, xoá workspace", async () => {
    const created = await t.request("/api/v1/workspaces", { method: "POST", token: alice, json: { name: "Dự án 2" } });
    expect(created.status).toBe(201);
    const w = await created.json();
    expect(created.headers.get("location")).toBe(`/api/v1/workspaces/${w.id}`);
    const renamed = await t.request(`/api/v1/workspaces/${w.id}`, { method: "PATCH", token: alice, json: { name: "Dự án B" } });
    expect((await renamed.json()).name).toBe("Dự án B");
    expect((await t.request(`/api/v1/workspaces/${w.id}`, { method: "DELETE", token: alice })).status).toBe(204);
    expect((await t.request(`/api/v1/workspaces/${w.id}`, { token: alice })).status).toBe(404);
  });

  test("người ngoài: 404 cho workspace và văn bản (không lộ sự tồn tại)", async () => {
    expect((await t.request(`/api/v1/workspaces/${ws}`, { token: bob })).status).toBe(404);
    expect((await t.request(`/api/v1/workspaces/${ws}/legal-documents`, { token: bob })).status).toBe(404);
    expect((await t.request(`/api/v1/legal-documents/${docId}`, { token: bob })).status).toBe(404);
  });
});

describe("chia sẻ chỉ đọc (VIEWER)", () => {
  test("chia sẻ cho email chưa đăng ký → 422; role khác VIEWER → 422", async () => {
    const res = await t.request(`/api/v1/workspaces/${ws}/members`, { method: "POST", token: alice, json: { email: "nobody@example.com", role: "VIEWER" } });
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("MEMBER_NOT_REGISTERED");
    const owner = await t.request(`/api/v1/workspaces/${ws}/members`, { method: "POST", token: alice, json: { email: "bob@example.com", role: "OWNER" } });
    expect(owner.status).toBe(422);
  });

  test("chủ chia sẻ → 201; trùng → 409", async () => {
    const res = await t.request(`/api/v1/workspaces/${ws}/members`, { method: "POST", token: alice, json: { email: "Bob@Example.com", role: "VIEWER" } });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ role: "VIEWER", user: { id: bobId, display_name: "Bob" } });
    expect(res.headers.get("location")).toBe(`/api/v1/workspaces/${ws}/members/${bobId}`);
    const dup = await t.request(`/api/v1/workspaces/${ws}/members`, { method: "POST", token: alice, json: { email: "bob@example.com", role: "VIEWER" } });
    expect(dup.status).toBe(409);
  });

  test("người được chia sẻ thấy workspace với my_role VIEWER và đọc được văn bản", async () => {
    const list = await (await t.request("/api/v1/workspaces?role=VIEWER", { token: bob })).json();
    expect(list.data[0]).toMatchObject({ id: ws, my_role: "VIEWER", member_count: 2 });
    expect((await t.request(`/api/v1/workspaces/${ws}/legal-documents`, { token: bob })).status).toBe(200);
    expect((await t.request(`/api/v1/legal-documents/${docId}`, { token: bob })).status).toBe(200);
    expect((await t.request(`/api/v1/workspaces/${ws}/members`, { token: bob })).status).toBe(200);
  });

  test("người được chia sẻ cố ghi → 403 problem+json", async () => {
    const cases = [
      t.request(`/api/v1/workspaces/${ws}/legal-documents`, { method: "POST", token: bob, json: { kind: "DRAFT", doc_type: "OTHER", number: "X", title: "x", issuer: "x" } }),
      t.request(`/api/v1/legal-documents/${docId}`, { method: "PATCH", token: bob, json: { title: "sửa" } }),
      t.request(`/api/v1/legal-documents/${docId}`, { method: "DELETE", token: bob }),
      t.request(`/api/v1/workspaces/${ws}`, { method: "PATCH", token: bob, json: { name: "x" } }),
      t.request(`/api/v1/workspaces/${ws}/members`, { method: "POST", token: bob, json: { email: "carol@example.com", role: "VIEWER" } }),
    ];
    for (const res of await Promise.all(cases)) {
      expect(res.status).toBe(403);
      expect(res.headers.get("content-type")).toBe("application/problem+json");
      expect((await res.json()).code).toBe("FORBIDDEN");
    }
  });

  test("không xoá được chủ (409); viewer không thu hồi người khác (403) nhưng tự rời được", async () => {
    const aliceId = (await (await t.request("/api/v1/users/me", { token: alice })).json()).id;
    expect((await t.request(`/api/v1/workspaces/${ws}/members/${aliceId}`, { method: "DELETE", token: alice })).status).toBe(409);
    expect((await t.request(`/api/v1/workspaces/${ws}/members/${aliceId}`, { method: "DELETE", token: bob })).status).toBe(409);
    await t.request(`/api/v1/workspaces/${ws}/members`, { method: "POST", token: alice, json: { email: "carol@example.com", role: "VIEWER" } });
    expect((await t.request(`/api/v1/workspaces/${ws}/members/${bobId}`, { method: "DELETE", token: carol })).status).toBe(403);
    expect((await t.request(`/api/v1/workspaces/${ws}/members/${bobId}`, { method: "DELETE", token: bob })).status).toBe(204);
    expect((await t.request(`/api/v1/legal-documents/${docId}`, { token: bob })).status).toBe(404);
  });
});
