import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { makeTestApp, type TestApp } from "./helpers";

let t: TestApp;
beforeAll(async () => { t = await makeTestApp(); });
afterAll(async () => { await t.close(); });

describe("ops & error format", () => {
  test("/healthz và /readyz", async () => {
    expect(await (await t.request("/healthz")).json()).toEqual({ status: "ok" });
    expect(await (await t.request("/readyz")).json()).toEqual({ status: "ready", database: "ok" });
  });

  test("route không tồn tại → 404 problem+json đủ trường RFC 9457", async () => {
    const res = await t.request("/api/v1/nope", { headers: { "x-request-id": "req-123" } });
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toBe("application/problem+json");
    expect(res.headers.get("x-request-id")).toBe("req-123");
    const body = await res.json();
    for (const k of ["type", "title", "status", "detail", "instance", "code", "request_id"]) expect(body).toHaveProperty(k);
    expect(body.request_id).toBe("req-123");
  });

  test("Swagger UI & contract", async () => {
    expect((await t.request("/docs")).headers.get("content-type")).toContain("text/html");
    const spec = await (await t.request("/api/v1/openapi.json")).json();
    expect(spec.openapi).toBe("3.1.0");
  });
});

describe("contract: mọi route /api/v1 phải có trong docs/api/openapi.yaml", () => {
  test("không có endpoint ngoài contract", () => {
    const spec = parse(readFileSync(new URL("../../docs/api/openapi.yaml", import.meta.url), "utf8"));
    const documented = new Set<string>();
    for (const [path, ops] of Object.entries<Record<string, unknown>>(spec.paths)) {
      for (const method of Object.keys(ops)) documented.add(`${method.toUpperCase()} ${path}`);
    }
    const undocumented = t.app.routes
      .filter((r) => r.path.startsWith("/api/v1/") && r.path !== "/api/v1/openapi.json")
      .map((r) => `${r.method} ${r.path.replace("/api/v1", "").replace(/\/$/, "").replace(/:(\w+)/g, "{$1}")}`)
      .filter((key) => !documented.has(key));
    expect(undocumented).toEqual([]);
  });
});
