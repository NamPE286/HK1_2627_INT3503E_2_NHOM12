import { ProblemError } from "./problem.js";

export const etagOf = (version: number) => `W/"${version}"`;

/**
 * Đọc `If-Match: W/"7"` → 7. Không có header ⇒ undefined (hoặc 428 khi `required`).
 * `*` ⇒ undefined (khớp mọi phiên bản). Header sai định dạng ⇒ 412.
 */
export function parseIfMatch(header: string | undefined, required = false): number | undefined {
  if (!header) {
    if (required) throw new ProblemError(428, "PRECONDITION_REQUIRED", "Thiếu header If-Match.");
    return undefined;
  }
  if (header.trim() === "*") return undefined;
  const m = /^(?:W\/)?"(\d+)"$/.exec(header.trim());
  if (!m) throw new ProblemError(412, "PRECONDITION_FAILED", "If-Match không khớp phiên bản hiện tại.");
  return Number(m[1]);
}

export function notModified(ifNoneMatch: string | undefined, version: number): boolean {
  return !!ifNoneMatch && ifNoneMatch.split(",").map((s) => s.trim()).includes(etagOf(version));
}
