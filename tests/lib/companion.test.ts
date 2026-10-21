import { describe, it, expect } from "vitest";
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  generateInviteCode,
  normalizeInviteCode,
  isValidInviteCodeFormat,
} from "@/lib/companion";

describe("generateInviteCode", () => {
  it("生成 8 位、只含安全字母表的邀请码", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(isValidInviteCodeFormat(code)).toBe(true);
    }
  });

  it("字母表排除易混淆字符 0/O/1/I", () => {
    for (const ch of ["0", "O", "1", "I"]) {
      expect(CODE_ALPHABET).not.toContain(ch);
    }
  });

  it("随机性：多次生成基本不会重复", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) codes.add(generateInviteCode());
    expect(codes.size).toBeGreaterThan(95);
  });
});

describe("normalizeInviteCode", () => {
  it("转大写并剔除空白/连字符等非字母数字字符", () => {
    expect(normalizeInviteCode(" ab-cd efgh ")).toBe("ABCDEFGH");
    expect(normalizeInviteCode("ABCD2345")).toBe("ABCD2345");
  });

  it("中文等字符会被过滤掉", () => {
    expect(normalizeInviteCode("邀请码 ABCD2345")).toBe("ABCD2345");
  });
});

describe("isValidInviteCodeFormat", () => {
  it("长度不对时拒绝", () => {
    expect(isValidInviteCodeFormat("ABC")).toBe(false);
    expect(isValidInviteCodeFormat("ABCD2345X")).toBe(false);
  });

  it("含易混淆字符时拒绝", () => {
    expect(isValidInviteCodeFormat("ABCD0EFG")).toBe(false);
    expect(isValidInviteCodeFormat("ABCD1EFG")).toBe(false);
    expect(isValidInviteCodeFormat("ABCDI EFG")).toBe(false);
  });

  it("规范化后的合法码通过", () => {
    expect(isValidInviteCodeFormat(normalizeInviteCode("abcd-2345"))).toBe(
      true
    );
  });
});
