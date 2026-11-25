import { t } from "elysia";
import { ProblemError } from "./problem.js";

/** Query chung cho collection (ai-rules/03). */
export const PageQuery = {
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  page_size: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  fields: t.Optional(t.String({ maxLength: 500 })),
};

export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export function buildPagination(page: number, pageSize: number, totalItems: number): Pagination {
  return { page, page_size: pageSize, total_items: totalItems, total_pages: Math.ceil(totalItems / pageSize) };
}

/** RFC 8288 Link header cho phân trang. */
export function linkHeader(url: string, p: Pagination): string | undefined {
  if (p.total_pages === 0) return undefined;
  const make = (page: number, rel: string) => {
    const u = new URL(url);
    u.searchParams.set("page", String(page));
    u.searchParams.set("page_size", String(p.page_size));
    return `<${u.pathname}${u.search}>; rel="${rel}"`;
  };
  const links = [make(1, "first"), make(p.total_pages, "last")];
  if (p.page > 1) links.push(make(Math.min(p.page - 1, p.total_pages), "prev"));
  if (p.page < p.total_pages) links.push(make(p.page + 1, "next"));
  return links.join(", ");
}

const invalidQuery = (field: string, message: string) =>
  new ProblemError(400, "INVALID_QUERY_PARAMETER", message, {
    title: "Invalid query parameter",
    errors: [{ field, code: "NOT_ALLOWED", message }],
  });

/** `?sort=-issued_date,number` → [{field, desc}] theo whitelist; field lạ ⇒ 400. */
export function parseSort(raw: string, allowed: readonly string[]): { field: string; desc: boolean }[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const desc = part.startsWith("-");
      const field = desc ? part.slice(1) : part;
      if (!allowed.includes(field)) throw invalidQuery("sort", `Không hỗ trợ sort theo '${field}'.`);
      return { field, desc };
    });
}

/** Sparse fieldset `?fields=id,title`; field lạ ⇒ 400; luôn có `id`. */
export function parseFields(raw: string | undefined, allowed: readonly string[]): string[] | undefined {
  if (!raw) return undefined;
  const fields = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const bad = fields.find((f) => !allowed.includes(f));
  if (bad) throw invalidQuery("fields", `Field '${bad}' không tồn tại.`);
  return Array.from(new Set(["id", ...fields]));
}

export function pick<T extends object>(obj: T, fields: string[] | undefined): Partial<T> {
  if (!fields) return obj;
  return Object.fromEntries(Object.entries(obj).filter(([k]) => fields.includes(k))) as Partial<T>;
}
