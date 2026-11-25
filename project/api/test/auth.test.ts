import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { makeTestApp, type TestApp } from "./helpers";

let t: TestApp;
beforeAll(async () => { t = await makeTestApp(); });
afterAll(async () => { await t.close(); });

describe("Better Auth: register / login / session", () => {
  test("đăng ký → nhận session token → GET /api/v1/users/me", async () => {
    const { token, user } = await t.signUp("an@example.com", "S3cure!pass", "An Nguyễn");
    const res = await t.request("/api/v1/users/me", { token });
    expect(res.status).toBe(200);
    const me = await res.json();
    expect(me).toMatchObject({ id: user.id, email: "an@example.com", display_name: "An Nguyễn" });
    expect(me).not.toHaveProperty("password");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  test("mật khẩu được hash bằng Argon2id", async () => {
    const rows = await t.db.query.account.findMany();
    expect(rows[0]?.password).toStartWith("$argon2id$");
  });

  test("đăng nhập đúng → 200 + token; sai mật khẩu → 401", async () => {
    const ok = await t.request("/api/auth/sign-in/email", { method: "POST", json: { email: "an@example.com", password: "S3cure!pass" } });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("set-auth-token")).toBeTruthy();
    const bad = await t.request("/api/auth/sign-in/email", { method: "POST", json: { email: "an@example.com", password: "wrong-pass" } });
    expect(bad.status).toBe(401);
  });

  test("email đã tồn tại → lỗi, mật khẩu ngắn → 400", async () => {
    const dup = await t.request("/api/auth/sign-up/email", { method: "POST", json: { email: "an@example.com", password: "S3cure!pass", name: "X" } });
    expect(dup.status).toBeGreaterThanOrEqual(400);
    const short = await t.request("/api/auth/sign-up/email", { method: "POST", json: { email: "b@example.com", password: "123", name: "B" } });
    expect(short.status).toBe(400);
  });

  test("đăng xuất thu hồi phiên → token cũ bị 401", async () => {
    const { token } = await t.signUp("logout@example.com");
    const out = await t.request("/api/auth/sign-out", { method: "POST", token, headers: { origin: "http://localhost:5173" } });
    expect(out.status).toBe(200);
    expect((await t.request("/api/v1/users/me", { token })).status).toBe(401);
  });

  test("không token / token rác → 401 problem+json + WWW-Authenticate", async () => {
    for (const token of [undefined, "garbage-token"]) {
      const res = await t.request("/api/v1/users/me", { token });
      expect(res.status).toBe(401);
      expect(res.headers.get("content-type")).toBe("application/problem+json");
      expect(res.headers.get("www-authenticate")).toContain("Bearer");
      expect(await res.json()).toMatchObject({ status: 401, code: "UNAUTHENTICATED", instance: "/api/v1/users/me" });
    }
  });
});
