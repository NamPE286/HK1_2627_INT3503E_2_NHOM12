/**
 * Quy tắc đánh số Chương/Mục/Điều/Khoản/Điểm — ai-rules/11-domain-rules.md §11.2.
 * Logic thuần (không phụ thuộc DB/HTTP) để unit test và dùng chung khi parse content (API-04).
 */

/** Bảng chữ cái đánh số Điểm (không có f, j, w, z; có đ). */
export const POINT_LETTERS = [
  "a", "b", "c", "d", "đ", "e", "g", "h", "i", "k", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "x", "y",
] as const;

export const LEVELS = ["CHAPTER", "SECTION", "ARTICLE", "CLAUSE", "POINT"] as const;
export type Level = (typeof LEVELS)[number];

/** Cha hợp lệ của từng cấp (null = gốc văn bản). */
export const ALLOWED_PARENTS: Record<Level, (Level | null)[]> = {
  CHAPTER: [null],
  SECTION: ["CHAPTER"],
  ARTICLE: [null, "CHAPTER", "SECTION"],
  CLAUSE: ["ARTICLE"],
  POINT: ["CLAUSE"],
};

export const LABELS: Record<Level, string> = {
  CHAPTER: "Chương",
  SECTION: "Mục",
  ARTICLE: "Điều",
  CLAUSE: "Khoản",
  POINT: "Điểm",
};

const ROMAN: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new RangeError("n phải là số nguyên >= 1");
  let out = "";
  for (const [value, symbol] of ROMAN) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
}

/** index bắt đầu từ 1: 1→a, 5→đ, 6→e, 7→g. */
export function pointLetter(index: number): string {
  const letter = POINT_LETTERS[index - 1];
  if (!letter) throw new RangeError(`Một Khoản chỉ có tối đa ${POINT_LETTERS.length} Điểm`);
  return letter;
}

export function formatNumber(level: Level, index: number): string {
  if (level === "CHAPTER") return toRoman(index);
  if (level === "POINT") return pointLetter(index);
  return String(index);
}

export const isValidParent = (level: Level, parent: Level | null) => ALLOWED_PARENTS[level].includes(parent);

/** [["ARTICLE","6"],["CLAUSE","4"],["POINT","a"]] → "điểm a khoản 4 Điều 6 Nghị định 168/2024/NĐ-CP". */
export function citation(path: [Level, string][], docTypeLabel: string, documentNumber: string): string {
  const parts = [...path].reverse().flatMap(([level, num]) => {
    if (level === "ARTICLE") return [`Điều ${num}`];
    if (level === "CLAUSE") return [`khoản ${num}`];
    if (level === "POINT") return [`điểm ${num}`];
    return [];
  });
  return [...parts, docTypeLabel, documentNumber].join(" ").trim();
}

/** Path ổn định cho trích dẫn: dieu-6/khoan-4/diem-a (Chương/Mục không vào path). */
export function provisionPath(path: [Level, string][]): string {
  const prefix: Partial<Record<Level, string>> = { ARTICLE: "dieu", CLAUSE: "khoan", POINT: "diem" };
  return path
    .filter(([l]) => prefix[l])
    .map(([l, n]) => `${prefix[l]}-${n.normalize("NFD").replace(/\p{M}/gu, "").replace("đ", "dd")}`)
    .join("/");
}
