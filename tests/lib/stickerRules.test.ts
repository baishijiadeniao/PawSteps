import { describe, it, expect } from "vitest";
import {
  computeStreak,
  drawFromPool,
  evaluateUnlocks,
  REWARD_REASON,
} from "@/lib/stickerRules";
import { LINK_SERIES, STARTER_STICKERS } from "@/lib/stickerCatalog";
import type { StickerName } from "@/lib/stickerPop";

/** 联动系列全部贴纸名（随机奖励池会往结果里追加贴纸，单独断言时先排除） */
const ALL_LINK: StickerName[] = LINK_SERIES.flat();

/** 构造规则输入的便捷函数：默认"零行为数据"，按需覆盖 */
function makeInput(overrides: Partial<Parameters<typeof evaluateUnlocks>[0]>) {
  return {
    checkinDates: [],
    allDoneDates: [],
    exerciseDoneKeys: [],
    loginDates: [],
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

  it("只到术后天数、一次都没全部完成时，各系列停在第 1 张", () => {
    // postOpDay = 5（术后第 6 天），但没有任何"全部完成"的日子
    const res = evaluateUnlocks(
      makeInput({ today: "2026-09-14", surgeryDate: "2026-09-09" })
    );
    expect(res.map((r) => r.sticker)).toEqual(FIRST_OF_SERIES);
    expect(res.map((r) => r.reason)).toEqual(
      FIRST_OF_SERIES.map(() => "联动系列首张贴纸")
    );
  });

  /** 随机奖励池：各系列的第 2～9 张，按系列展开即为候选顺序 */
  const REWARD_ORDER: StickerName[] = LINK_SERIES.flatMap((s) => s.slice(1));
  /** 恒取池首的随机数，让抽取结果可断言 */
  const alwaysFirst = () => 0;
  /** 只看奖励池的抽取结果 */
  const drawn = (res: { sticker: StickerName; reason: string }[]) =>
    res.filter((r) => REWARD_ORDER.includes(r.sticker));

  it("累计完成 N 天全部康复任务，从奖励池随机抽 N 张", () => {
    const res = evaluateUnlocks(
      makeInput({
        today: "2026-09-11",
        surgeryDate: "2026-09-09",
        allDoneDates: ["2026-09-09", "2026-09-10", "2026-09-11"],
      }),
      alwaysFirst
    );
    expect(drawn(res).map((r) => r.sticker)).toEqual(REWARD_ORDER.slice(0, 3));
    expect(drawn(res).map((r) => r.reason)).toEqual(
      REWARD_ORDER.slice(0, 3).map(() => REWARD_REASON)
    );
  });

  it("每天登录奖励一张：登录 2 天抽 2 张", () => {
    const res = evaluateUnlocks(
      makeInput({ loginDates: ["2026-09-09", "2026-09-10"] }),
      alwaysFirst
    );
    expect(drawn(res).map((r) => r.sticker)).toEqual(REWARD_ORDER.slice(0, 2));
  });

  it("登录与全部完成共用同一个额度：2 天登录 + 1 天全完成抽 3 张", () => {
    const res = evaluateUnlocks(
      makeInput({
        loginDates: ["2026-09-09", "2026-09-10"],
        allDoneDates: ["2026-09-10"],
      }),
      alwaysFirst
    );
    expect(drawn(res).map((r) => r.sticker)).toEqual(REWARD_ORDER.slice(0, 3));
  });

  it("抽取结果取决于随机数：rand 接近 1 时从池尾开始抽", () => {
    const res = evaluateUnlocks(
      makeInput({ loginDates: ["2026-09-09"] }),
      () => 0.99
    );
    expect(drawn(res).map((r) => r.sticker)).toEqual([
      REWARD_ORDER[REWARD_ORDER.length - 1],
    ]);
  });

  it("奖励池里已解锁的张数计入额度，不会重复发放", () => {
    const res = evaluateUnlocks(
      makeInput({
        loginDates: ["2026-09-09", "2026-09-10"],
        alreadyUnlocked: [
          ...(STARTER_STICKERS as StickerName[]),
          ...REWARD_ORDER.slice(0, 2),
        ],
      }),
      alwaysFirst
    );
    expect(drawn(res)).toEqual([]);
  });

  it("单动作当天全组完成也攒额度：踝泵 + 足跟滑动各一条 = 抽 2 张", () => {
    const res = evaluateUnlocks(
      makeInput({
        exerciseDoneKeys: ["2026-09-10|踝泵", "2026-09-10|足跟滑动"],
      }),
      alwaysFirst
    );
    expect(drawn(res).map((r) => r.sticker)).toEqual(REWARD_ORDER.slice(0, 2));
  });

  it("同一天四个来源全命中：登录 + 全完成 + 两个动作 = 抽 4 张", () => {
    const res = evaluateUnlocks(
      makeInput({
        loginDates: ["2026-09-10"],
        allDoneDates: ["2026-09-10"],
        exerciseDoneKeys: ["2026-09-10|踝泵", "2026-09-10|足跟滑动"],
      }),
      alwaysFirst
    );
    expect(drawn(res).map((r) => r.sticker)).toEqual(REWARD_ORDER.slice(0, 4));
  });

  it("重复的同一条动作记录只算一次额度", () => {
    const res = evaluateUnlocks(
      makeInput({
        exerciseDoneKeys: ["2026-09-10|踝泵", "2026-09-10|踝泵"],
      }),
      alwaysFirst
    );
    expect(drawn(res).map((r) => r.sticker)).toEqual(REWARD_ORDER.slice(0, 1));
  });

  it("漏打卡不会永久卡住：术后第 60 天补齐 2 天登录也能抽 2 张", () => {
    const res = evaluateUnlocks(
      makeInput({
        today: "2026-11-08",
        surgeryDate: "2026-09-09",
        loginDates: ["2026-11-07", "2026-11-08"],
      }),
      alwaysFirst
    );
    expect(drawn(res).map((r) => r.sticker)).toEqual(REWARD_ORDER.slice(0, 2));
  });

  it("奖励池抽干后不再新增联动贴纸", () => {
    const manyLogins = Array.from({ length: 70 }, (_, i) =>
      new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)
    );
    const res = evaluateUnlocks(
      makeInput({ today: "2026-12-08", loginDates: manyLogins }),
      alwaysFirst
    );
    // 8 张系列首张保底 + 63 张池内贴纸，一共只有这些
    expect(res.filter((r) => ALL_LINK.includes(r.sticker))).toHaveLength(
      ALL_LINK.length
    );
  });

  it("drawFromPool 不重复抽取，且抽取张数不超过池子大小", () => {
    const pool = REWARD_ORDER;
    const drawnOnce = drawFromPool(pool, 10, alwaysFirst);
    expect(drawnOnce).toHaveLength(10);
    expect(new Set(drawnOnce).size).toBe(10);
    expect(drawFromPool(pool, pool.length + 5, alwaysFirst)).toHaveLength(
      pool.length
    );
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
