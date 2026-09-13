import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getToday,
  getPostOpDay,
  getDaysUntilSurgery,
  isFutureDate,
  getWeekdayLabel,
} from "@/lib/date";

describe("date lib", () => {
  beforeEach(() => {
    vi.stubEnv("APP_TIMEZONE", "Asia/Shanghai");
    vi.stubEnv("SURGERY_DATE", "2026-09-09");
  });

  it("getToday returns YYYY-MM-DD in Shanghai tz", () => {
    const today = getToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("getPostOpDay: before surgery returns negative days until", () => {
    // 2026-09-08 是术前 1 天
    expect(getPostOpDay("2026-09-08", "2026-09-09")).toBe(-1);
  });

  it("getPostOpDay: surgery day is POD 0", () => {
    expect(getPostOpDay("2026-09-09", "2026-09-09")).toBe(0);
  });

  it("getPostOpDay: day after surgery is POD 1", () => {
    expect(getPostOpDay("2026-09-10", "2026-09-09")).toBe(1);
  });

  it("getPostOpDay: two weeks after is POD 14", () => {
    expect(getPostOpDay("2026-09-23", "2026-09-09")).toBe(14);
  });

  it("getDaysUntilSurgery: 2 days before returns 2", () => {
    expect(getDaysUntilSurgery("2026-09-07", "2026-09-09")).toBe(2);
  });

  it("isFutureDate: a date far in the future is future", () => {
    expect(isFutureDate("2099-12-31")).toBe(true);
  });

  it("isFutureDate: a date in the past is not future", () => {
    expect(isFutureDate("2020-01-01")).toBe(false);
  });

  it("getWeekdayLabel: 2026-09-14 是星期一", () => {
    expect(getWeekdayLabel("2026-09-14")).toBe("星期一");
  });

  it("getWeekdayLabel: 周日边界映射到星期日", () => {
    expect(getWeekdayLabel("2026-09-13")).toBe("星期日");
  });
});
