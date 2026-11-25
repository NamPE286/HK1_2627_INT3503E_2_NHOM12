import { afterEach, describe, expect, test, vi } from "vitest";
import { api, ApiProblem } from "./client";

afterEach(() => vi.restoreAllMocks());

describe("api client", () => {
  test("lỗi problem+json → ApiProblem giữ nguyên code", async () => {
    const problem = { type: "x", title: "Duplicate resource", status: 409, detail: "Số hiệu đã tồn tại", instance: "/api/v1/legal-documents", code: "DUPLICATE_RESOURCE", request_id: "r1" };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(problem), { status: 409, headers: { "content-type": "application/problem+json" } }),
    );
    const err = await api.createDocument({ doc_type: "LUAT", number: "1", title: "t", issuer: "i" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiProblem);
    expect(err.code).toBe("DUPLICATE_RESOURCE");
    expect(err.message).toBe("Số hiệu đã tồn tại");
  });

  test("list gửi query snake_case và credentials", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [], pagination: { page: 2, page_size: 10, total_items: 0, total_pages: 0 } }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    await api.listDocuments({ page: 2, page_size: 10, q: "", status: "DRAFT" });
    expect(spy.mock.calls[0]![0]).toBe("/api/v1/legal-documents?page=2&page_size=10&status=DRAFT");
    expect(spy.mock.calls[0]![1]).toMatchObject({ credentials: "include" });
  });
});
