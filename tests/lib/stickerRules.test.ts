import { describe, it, expect } from "vitest";
import { computeStreak, evaluateUnlocks } from "@/lib/stickerRules";
import { STARTER_STICKERS } from "@/lib/stickerCatalog";
import type { StickerName } from "@/lib/stickerPop";

/** 构造规则输入的便捷函数：默认"零行为数据"，按需覆盖 */
function makeInput(overrides: Partial<Parameters<typeof evaluateUnlocks>[0]>) {
  return {
    checkinDates: [],
    allDoneDates: [],
    moodDates: [],
    statusDates: [],
    today: "2026-09-10",
    surgeryDate: "2026-09-09",
    alreadyUnlocked: STARTER_STICKERS as StickerName[],
    ...overrides,
  };
}

describe("computeStreak", () => {
  it("今天有打卡时从今天往前数", () => {
    expect(
      computeStreak(["2026-09-08", "2026-09-09", "2026-09-10"], "2026-09-10")
    ).toBe(3);
  });

  it("今天没打卡不算断连，从昨天往前数", () => {
    expect(
      computeStreak(["2026-09-08", "2026-09-09", "2026-09-10"], "2026-09-11")
    ).toBe(3);
  });

  it("今天和昨天都没有则为 0", () => {
    expect(computeStreak(["2026-09-05", "2026-09-06"], "2026-09-10")).toBe(0);
  });

  it("中间断开会停在断点", () => {
    // 09-09 缺失，只能数到 09-10 这一天
    expect(computeStreak(["2026-09-07", "2026-09-08", "2026-09-10"], "2026-09-10")).toBe(1);
  });

  it("重复日期只算一天", () => {
    expect(computeStreak(["2026-09-10", "2026-09-10"], "2026-09-10")).toBe(1);
  });
});

describe("evaluateUnlocks", () => {
  it("没有任何行为数据时不解锁新贴纸", () => {
    expect(evaluateUnlocks(makeInput({}))).toEqual([]);
  });

  it("首次康复打卡解锁 pat_pat", () => {
    const res = evaluateUnlocks(makeInput({ checkinDates: ["2026-09-10"] }));
    expect(res).toEqual([{ sticker: "pat_pat", reason: "完成第一次康复打卡" }]);
  });

  it("首次保存心情解锁 take_it_slow", () => {
    const res = evaluateUnlocks(makeInput({ moodDates: ["2026-09-10"] }));
    expect(res.map((r) => r.sticker)).toEqual(["take_it_slow"]);
  });

  it("首次状态打卡解锁 drink_water", () => {
    const res = evaluateUnlocks(makeInput({ statusDates: ["2026-09-10"] }));
    expect(res.map((r) => r.sticker)).toEqual(["drink_water"]);
  });

  it("首次全部完成解锁 shine_today，累计 3 天追加 rest_well", () => {
    const one = evaluateUnlocks(makeInput({ allDoneDates: ["2026-09-10"] }));
    expect(one.map((r) => r.sticker)).toEqual(["shine_today"]);

    const three = evaluateUnlocks(
      makeInput({ allDoneDates: ["2026-09-08", "2026-09-09", "2026-09-10"] })
    );
    expect(three.map((r) => r.sticker)).toEqual(["shine_today", "rest_well"]);
  });

  it("术后第 7 天解锁 get_better", () => {
    const res = evaluateUnlocks(
      makeInput({ today: "2026-09-16", surgeryDate: "2026-09-09" })
    );
    expect(res.map((r) => r.sticker)).toEqual(["get_better"]);
  });

  it("连续打卡 7 天解锁 take_medicine，14 天追加 eat_well", () => {
    // 连续 7 天（含今天）：09-04 至 09-10
    const seven = Array.from({ length: 7 }, (_, i) => `2026-09-${String(i + 4).padStart(2, "0")}`);
    const res7 = evaluateUnlocks(makeInput({ checkinDates: seven }));
    expect(res7.map((r) => r.sticker)).toEqual(["pat_pat", "take_medicine"]);

    // 连续 14 天（含今天）：08-28 至 09-10
    const fourteen = Array.from({ length: 14 }, (_, i) => {
      const d = 28 + i;
      return d <= 31 ? `2026-08-${String(d).padStart(2, "0")}` : `2026-09-${String(d - 31).padStart(2, "0")}`;
    });
    const res14 = evaluateUnlocks(makeInput({ checkinDates: fourteen }));
    expect(res14.map((r) => r.sticker)).toEqual([
      "pat_pat",
      "take_medicine",
      "eat_well",
    ]);
  });

  it("连续记录心情 7 天解锁 sleep_well", () => {
    const seven = Array.from({ length: 7 }, (_, i) => `2026-09-${String(i + 4).padStart(2, "0")}`);
    const res = evaluateUnlocks(makeInput({ moodDates: seven }));
    expect(res.map((r) => r.sticker)).toEqual(["take_it_slow", "sleep_well"]);
  });

  it("术后 30/60/90 天分别解锁对应里程碑", () => {
    expect(
      evaluateUnlocks(makeInput({ today: "2026-10-09" })).map((r) => r.sticker)
    ).toEqual(["get_better", "recover_together"]);
    expect(
      evaluateUnlocks(makeInput({ today: "2026-11-08" })).map((r) => r.sticker)
    ).toEqual(["get_better", "recover_together", "super_brave"]);
    expect(
      evaluateUnlocks(makeInput({ today: "2026-12-08" })).map((r) => r.sticker)
    ).toEqual([
      "get_better",
      "recover_together",
      "super_brave",
      "better_today",
    ]);
  });

  it("已解锁的贴纸不会重复返回", () => {
    const res = evaluateUnlocks(
      makeInput({
        checkinDates: ["2026-09-10"],
        alreadyUnlocked: [...STARTER_STICKERS, "pat_pat"] as StickerName[],
      })
    );
    expect(res).toEqual([]);
  });

  it("初始 4 张贴纸从不出现在解锁结果里", () => {
    const res = evaluateUnlocks(
      makeInput({
        checkinDates: ["2026-09-10"],
        moodDates: ["2026-09-10"],
        statusDates: ["2026-09-10"],
        allDoneDates: ["2026-09-10"],
        today: "2026-12-08",
      })
    );
    const names = res.map((r) => r.sticker);
    for (const starter of STARTER_STICKERS) {
      expect(names).not.toContain(starter);
    }
  });
});
