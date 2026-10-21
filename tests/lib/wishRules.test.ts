import { describe, it, expect } from "vitest";
import {
  computeWishMilestones,
  daysToNextWish,
  DEFAULT_MILESTONE_EVERY,
} from "@/lib/wishRules";

/** 生成 from 起连续 count 天的日期列表（UTC 构造，避免时区偏移） */
function consecutiveDays(from: string, count: number): string[] {
  const days: string[] = [];
  const base = new Date(`${from}T00:00:00Z`);
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

describe("computeWishMilestones", () => {
  it("没有任何打卡时返回空列表", () => {
    expect(computeWishMilestones([])).toEqual([]);
  });

  it("连续 6 天还不够一个愿望", () => {
    expect(computeWishMilestones(consecutiveDays("2026-09-01", 6))).toEqual([]);
  });

  it("连续 7 天赢得 1 个愿望", () => {
    expect(computeWishMilestones(consecutiveDays("2026-09-01", 7))).toEqual([7]);
  });

  it("连续 14 天赢得两个愿望（第 7、14 天各一次）", () => {
    expect(computeWishMilestones(consecutiveDays("2026-09-01", 14))).toEqual([7, 14]);
  });

  it("连续 15 天仍是两个愿望，第 15 天重新起段", () => {
    expect(computeWishMilestones(consecutiveDays("2026-09-01", 15))).toEqual([7, 14]);
  });

  it("断连后重新攒满 7 天还能再得", () => {
    const dates = [...consecutiveDays("2026-09-01", 7), ...consecutiveDays("2026-09-15", 7)];
    expect(computeWishMilestones(dates)).toEqual([7, 7]);
  });

  it("多段累加：一段 8 天 + 一段 7 天共 2 个", () => {
    const dates = [...consecutiveDays("2026-09-01", 8), ...consecutiveDays("2026-09-20", 7)];
    expect(computeWishMilestones(dates)).toEqual([7, 7]);
  });

  it("重复日期只算一天", () => {
    const dates = [...consecutiveDays("2026-09-01", 7), "2026-09-03", "2026-09-07"];
    expect(computeWishMilestones(dates)).toEqual([7]);
  });

  it("支持自定义里程碑间隔", () => {
    expect(computeWishMilestones(consecutiveDays("2026-09-01", 10), 5)).toEqual([5, 10]);
  });

  it("跨月的连续段不误断（9-30 与 10-01 相邻）", () => {
    expect(computeWishMilestones(["2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"])).toEqual([7]);
  });
});

describe("daysToNextWish", () => {
  it("默认间隔是 7 天", () => {
    expect(DEFAULT_MILESTONE_EVERY).toBe(7);
  });

  it("完全没打卡还差 7 天", () => {
    expect(daysToNextWish(0)).toBe(7);
  });

  it("已连打 3 天还差 4 天", () => {
    expect(daysToNextWish(3)).toBe(4);
  });

  it("刚好满 7 天时按新一段计，还差 7 天", () => {
    expect(daysToNextWish(7)).toBe(7);
  });

  it("连打 10 天还差 4 天到 14 天", () => {
    expect(daysToNextWish(10)).toBe(4);
  });
});
