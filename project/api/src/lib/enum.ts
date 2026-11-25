import { t } from "elysia";

/**
 * Enum dạng string + pattern. KHÔNG dùng t.UnionEnum trong t.Optional: Elysia tự điền giá trị enum đầu tiên
 * làm default cho field optional (đã gặp: PATCH bị chèn doc_type/status ngoài ý muốn).
 */
export const enumString = <const T extends readonly string[]>(values: T) =>
  t.Unsafe<T[number]>(t.String({ pattern: `^(${values.join("|")})$`, description: values.join(" | ") }));
