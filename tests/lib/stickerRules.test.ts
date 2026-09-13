import { describe, it, expect } from "vitest";
import { computeStreak, evaluateUnlocks } from "@/lib/stickerRules";
import { LINK_SERIES, STARTER_STICKERS } from "@/lib/stickerCatalog";
import type { StickerName } from "@/lib/stickerPop";

/** 联动系列全部贴纸名（术后天数驱动，会干扰其它规则的断言，单独测） */
const ALL_LINK: StickerName[] = LINK_SERIES.flat();

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

/** 只看非联动贴纸的解锁结果 */
function growth(res: { sticker: StickerName }[]) {
  return res.filter((r) => !ALL_LINK.includes(r.sticker)).map((r) => r.sticker);
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
  it("没有任何行为数据时不解锁康复贴纸", () => {
    expect(growth(evaluateUnlocks(makeInput({})))).toEqual([]);
  });

  it("首次康复打卡解锁 pat_pat", () => {
    const res = evaluateUnlocks(makeInput({ checkinDates: ["2026-09-10"] }));
    expect(res.filter((r) => r.sticker === "pat_pat")).toEqual([
      { sticker: "pat_pat", reason: "完成第一次康复打卡" },
    ]);
  });

  it("首次保存心情解锁 take_it_slow", () => {
    const res = evaluateUnlocks(makeInput({ moodDates: ["2026-09-10"] }));
    expect(growth(res)).toEqual(["take_it_slow"]);
  });

  it("首次状态打卡解锁 drink_water", () => {
    const res = evaluateUnlocks(makeInput({ statusDates: ["2026-09-10"] }));
    expect(growth(res)).toEqual(["drink_water"]);
  });

  it("首次全部完成解锁 shine_today，累计 3 天追加 rest_well", () => {
    const one = evaluateUnlocks(makeInput({ allDoneDates: ["2026-09-10"] }));
    expect(growth(one)).toEqual(["shine_today"]);

    const three = evaluateUnlocks(
      makeInput({ allDoneDates: ["2026-09-08", "2026-09-09", "2026-09-10"] })
    );
    expect(growth(three)).toEqual(["shine_today", "rest_well"]);
  });

  it("术后第 7 天解锁 get_better", () => {
    const res = evaluateUnlocks(
      makeInput({ today: "2026-09-16", surgeryDate: "2026-09-09" })
    );
    expect(growth(res)).toEqual(["get_better"]);
  });

  it("连续打卡 7 天解锁 take_medicine，14 天追加 eat_well", () => {
    // 连续 7 天（含今天）：09-04 至 09-10
    const seven = Array.from({ length: 7 }, (_, i) => `2026-09-${String(i + 4).padStart(2, "0")}`);
    const res7 = evaluateUnlocks(makeInput({ checkinDates: seven }));
    expect(growth(res7)).toEqual(["pat_pat", "take_medicine"]);

    // 连续 14 天（含今天）：08-28 至 09-10
    const fourteen = Array.from({ length: 14 }, (_, i) => {
      const d = 28 + i;
      return d <= 31 ? `2026-08-${String(d).padStart(2, "0")}` : `2026-09-${String(d - 31).padStart(2, "0")}`;
    });
    const res14 = evaluateUnlocks(makeInput({ checkinDates: fourteen }));
    expect(growth(res14)).toEqual(["pat_pat", "take_medicine", "eat_well"]);
  });

  it("连续记录心情 7 天解锁 sleep_well", () => {
    const seven = Array.from({ length: 7 }, (_, i) => `2026-09-${String(i + 4).padStart(2, "0")}`);
    const res = evaluateUnlocks(makeInput({ moodDates: seven }));
    expect(growth(res)).toEqual(["take_it_slow", "sleep_well"]);
  });

  it("术后 30/60/90 天分别解锁对应里程碑", () => {
    expect(growth(evaluateUnlocks(makeInput({ today: "2026-10-09" })))).toEqual([
      "get_better",
      "recover_together",
    ]);
    expect(growth(evaluateUnlocks(makeInput({ today: "2026-11-08" })))).toEqual([
      "get_better",
      "recover_together",
      "super_brave",
    ]);
    expect(growth(evaluateUnlocks(makeInput({ today: "2026-12-08" })))).toEqual([
      "get_better",
      "recover_together",
      "super_brave",
      "better_today",
    ]);
  });

  /** 每个联动系列的首张 */
  const FIRST_OF_SERIES = LINK_SERIES.map((s) => s[0]);

  it("术前几天也保底解锁每个联动系列的第 1 张", () => {
    // 手术日 09-16、今天 09-13 → postOpDay = -3
    const res = evaluateUnlocks(
      makeInput({ today: "2026-09-13", surgeryDate: "2026-09-16" })
    );
    expect(res).toEqual(
      FIRST_OF_SERIES.map((sticker) => ({
        sticker,
        reason: "联动系列首张贴纸",
      }))
    );
  });

  it("手术日当天仍然只有各系列第 1 张，第 2 张从术后第 2 天开始", () => {
    const res = evaluateUnlocks(
      makeInput({ today: "2026-09-09", surgeryDate: "2026-09-09" })
    );
    expect(res.map((r) => r.sticker)).toEqual(FIRST_OF_SERIES);
    expect(res.map((r) => r.reason)).toEqual([
      "联动系列首张贴纸",
      "联动系列首张贴纸",
      "联动系列首张贴纸",
    ]);
  });

  it("术后第 N 天每个系列累计解锁 N 张，且各系列进度互不影响", () => {
    // postOpDay = 2 → 术后第 3 天 → 每个系列前 3 张
    const res = evaluateUnlocks(
      makeInput({ today: "2026-09-11", surgeryDate: "2026-09-09" })
    );
    const link = res.filter((r) => ALL_LINK.includes(r.sticker));
    expect(link.map((r) => r.sticker)).toEqual([
      "kitty_heart",
      "kitty_hug",
      "kitty_laptop",
      "linabell_wave",
      "linabell_cuddle",
      "linabell_detective",
      "starry_stargazing",
      "starry_hug",
      "starry_sleep",
    ]);
    expect(link.map((r) => r.reason)).toEqual([
      "联动系列首张贴纸",
      "到达术后第 2 天",
      "到达术后第 3 天",
      "联动系列首张贴纸",
      "到达术后第 2 天",
      "到达术后第 3 天",
      "联动系列首张贴纸",
      "到达术后第 2 天",
      "到达术后第 3 天",
    ]);
  });

  it("联动系列解锁到各系列最后一张后不再新增", () => {
    const res = evaluateUnlocks(
      makeInput({ today: "2026-12-08", surgeryDate: "2026-09-09" })
    );
    expect(res.filter((r) => ALL_LINK.includes(r.sticker))).toHaveLength(ALL_LINK.length);
  });

  it("已解锁的贴纸不会重复返回", () => {
    const res = evaluateUnlocks(
      makeInput({
        checkinDates: ["2026-09-10"],
        alreadyUnlocked: [
          ...STARTER_STICKERS,
          "pat_pat",
          ...ALL_LINK,
        ] as StickerName[],
      })
    );
    expect(res).toEqual([]);
  });

  it("初始贴纸从不出现在解锁结果里", () => {
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
