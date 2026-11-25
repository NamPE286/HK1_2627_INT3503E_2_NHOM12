import { describe, expect, test } from "bun:test";
import {
  citation, formatNumber, isValidParent, pointLetter, provisionPath, toRoman,
} from "../src/modules/legal-documents/numbering";

describe("numbering (unit)", () => {
  test("Điểm dùng bảng chữ cái tiếng Việt: a b c d đ e g …", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(pointLetter)).toEqual(["a", "b", "c", "d", "đ", "e", "g"]);
    expect(() => pointLetter(24)).toThrow();
  });
  test("Chương dùng số La Mã", () => {
    expect(toRoman(4)).toBe("IV");
    expect(formatNumber("CHAPTER", 9)).toBe("IX");
    expect(formatNumber("ARTICLE", 12)).toBe("12");
  });
  test("Quan hệ cha–con hợp lệ", () => {
    expect(isValidParent("CLAUSE", "ARTICLE")).toBe(true);
    expect(isValidParent("CLAUSE", null)).toBe(false);
    expect(isValidParent("POINT", "ARTICLE")).toBe(false);
    expect(isValidParent("ARTICLE", "CHAPTER")).toBe(true);
  });
  test("Trích dẫn & path chuẩn", () => {
    const p: [any, string][] = [["CHAPTER", "II"], ["ARTICLE", "6"], ["CLAUSE", "4"], ["POINT", "đ"]];
    expect(citation(p, "Nghị định", "168/2024/NĐ-CP")).toBe("điểm đ khoản 4 Điều 6 Nghị định 168/2024/NĐ-CP");
    expect(provisionPath(p)).toBe("dieu-6/khoan-4/diem-dd");
  });
});
