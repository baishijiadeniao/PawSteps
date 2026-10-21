/**
 * 贴纸解锁规则（纯函数，不碰数据库，便于单测）。
 *
 * 输入都是"日期集合"级别的聚合数据，输出新解锁的贴纸及原因文案。
 * 日期一律使用 YYYY-MM-DD 字符串。
 */

import { format, parseISO, subDays } from "date-fns";
import { getPostOpDay } from "./date";
import { LINK_SERIES } from "./stickerCatalog";
import type { StickerName } from "./stickerPop";

export interface StickerRuleInput {
  /** 有 done=true 康复打卡的日期集合（可含重复） */
  checkinDates: string[];
  /** 当天"全部康复任务完成"的日期集合 */
  allDoneDates: string[];
  /**
   * 单个训练动作"当天全部组数完成"的集合，每项形如 `YYYY-MM-DD|动作名`。
   * 同一天踝泵和足跟滑动各自做完，就是两条，各攒一张随机奖励额度。
   */
  exerciseDoneKeys: string[];
  /** 主人登录过的日期集合（每天一条，用于随机池奖励） */
  loginDates: string[];
  /** 保存过心情的日期集合 */
  moodDates: string[];
  /** 完成过每日状态打卡的日期集合 */
  statusDates: string[];
  /** 今天（YYYY-MM-DD） */
  today: string;
  /** 手术日期（YYYY-MM-DD） */
  surgeryDate: string;
  /** 已解锁的贴纸名（这些不会重复返回） */
  alreadyUnlocked: StickerName[];
}

export interface UnlockResult {
  sticker: StickerName;
  /** 解锁原因文案（写入 StickerUnlock.reason，收集册也展示） */
  reason: string;
}

/**
 * 计算连续打卡天数。
 * 今天没打卡不算断连：若今天缺记录，则从昨天开始往前数。
 */
export function computeStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let cursor = parseISO(today);
  if (!set.has(format(cursor, "yyyy-MM-dd"))) {
    cursor = subDays(cursor, 1);
  }
  let count = 0;
  while (set.has(format(cursor, "yyyy-MM-dd"))) {
    count += 1;
    cursor = subDays(cursor, 1);
  }
  return count;
}

/** 单条规则定义：满足 predicate 即解锁 */
interface StickerRule {
  sticker: StickerName;
  reason: string;
  satisfied: (ctx: {
    checkinCount: number;
    allDoneCount: number;
    moodCount: number;
    statusCount: number;
    checkinStreak: number;
    moodStreak: number;
    postOpDay: number;
  }) => boolean;
}

/**
 * 联动系列里每个系列的第 1 张是保底贴纸，术前几天也直接解锁，不等任何行为。
 */
const GUARANTEED_STICKERS: StickerName[] = LINK_SERIES.map(
  (series) => series[0]
);

/**
 * 共享随机奖励池：剩下的联动贴纸（每个系列的第 2～9 张）。
 * "登录" / "全部完成" / "单个动作全组完成" 三类行为不再分别对应固定贴纸，
 * 而是攒成同一个抽取额度，每攒够一次就从池子里随机抽一张，抽过的不会重复抽。
 */
const REWARD_POOL: StickerName[] = LINK_SERIES.flat().filter(
  (sticker) => !GUARANTEED_STICKERS.includes(sticker)
);

/** 随机池贴纸的解锁原因文案（同时写入 StickerUnlock.reason 与收集册展示） */
export const REWARD_REASON = "每天登录或完成康复任务，随机掉落的奖励";

/** 保底规则：系列首张一上线就解锁 */
const GUARANTEED_RULES: StickerRule[] = GUARANTEED_STICKERS.map((sticker) => ({
  sticker,
  reason: "联动系列首张贴纸",
  satisfied: () => true,
}));

/**
 * 从池子里随机抽 count 张（不重复）。
 * rand 可注入，便于单测里断言确定性的抽取结果。
 */
export function drawFromPool(
  pool: StickerName[],
  count: number,
  rand: () => number = Math.random
): StickerName[] {
  const rest = [...pool];
  const drawn: StickerName[] = [];
  const total = Math.min(count, rest.length);
  for (let i = 0; i < total; i++) {
    const idx = Math.min(Math.floor(rand() * rest.length), rest.length - 1);
    drawn.push(rest.splice(idx, 1)[0]);
  }
  return drawn;
}

const RULES: StickerRule[] = [
  {
    sticker: "pat_pat",
    reason: "完成第一次康复打卡",
    satisfied: (c) => c.checkinCount >= 1,
  },
  {
    sticker: "take_it_slow",
    reason: "第一次保存今天的心情",
    satisfied: (c) => c.moodCount >= 1,
  },
  {
    sticker: "drink_water",
    reason: "完成第一次每日状态打卡",
    satisfied: (c) => c.statusCount >= 1,
  },
  {
    sticker: "shine_today",
    reason: "第一次完成当天全部康复任务",
    satisfied: (c) => c.allDoneCount >= 1,
  },
  {
    sticker: "rest_well",
    reason: "累计 3 天完成全部任务",
    satisfied: (c) => c.allDoneCount >= 3,
  },
  {
    sticker: "get_better",
    reason: "到达术后第 7 天",
    satisfied: (c) => c.postOpDay >= 7,
  },
  {
    sticker: "take_medicine",
    reason: "连续打卡 7 天",
    satisfied: (c) => c.checkinStreak >= 7,
  },
  {
    sticker: "eat_well",
    reason: "连续打卡 14 天",
    satisfied: (c) => c.checkinStreak >= 14,
  },
  {
    sticker: "sleep_well",
    reason: "连续记录心情 7 天",
    satisfied: (c) => c.moodStreak >= 7,
  },
  {
    sticker: "recover_together",
    reason: "到达术后第 30 天",
    satisfied: (c) => c.postOpDay >= 30,
  },
  {
    sticker: "super_brave",
    reason: "到达术后第 60 天",
    satisfied: (c) => c.postOpDay >= 60,
  },
  {
    sticker: "better_today",
    reason: "到达术后第 90 天",
    satisfied: (c) => c.postOpDay >= 90,
  },
  ...GUARANTEED_RULES,
];

/**
 * 评估所有规则，返回"本次新解锁"的贴纸列表。
 * alreadyUnlocked 里的贴纸（含初始 4 张）会被跳过。
 *
 * 随机池的抽取额度 = 累计登录天数 + 累计全部完成天数 + 累计单动作全完成次数，
 * 再减去池子里已经解锁的张数，所以补记历史行为只会补发差额，不会重复发。
 */
export function evaluateUnlocks(
  input: StickerRuleInput,
  rand: () => number = Math.random
): UnlockResult[] {
  const ctx = {
    checkinCount: new Set(input.checkinDates).size,
    allDoneCount: new Set(input.allDoneDates).size,
    moodCount: new Set(input.moodDates).size,
    statusCount: new Set(input.statusDates).size,
    checkinStreak: computeStreak(input.checkinDates, input.today),
    moodStreak: computeStreak(input.moodDates, input.today),
    postOpDay: getPostOpDay(input.today, input.surgeryDate),
  };
  const loginCount = new Set(input.loginDates).size;
  const exerciseCount = new Set(input.exerciseDoneKeys).size;
  const unlockedSet = new Set(input.alreadyUnlocked);
  const results: UnlockResult[] = [];
  for (const rule of RULES) {
    if (unlockedSet.has(rule.sticker)) continue;
    if (rule.satisfied(ctx)) {
      results.push({ sticker: rule.sticker, reason: rule.reason });
    }
  }

  const earned = REWARD_POOL.filter((s) => unlockedSet.has(s)).length;
  const budget = Math.max(
    0,
    loginCount + ctx.allDoneCount + exerciseCount - earned
  );
  const candidates = REWARD_POOL.filter((s) => !unlockedSet.has(s));
  for (const sticker of drawFromPool(candidates, budget, rand)) {
    results.push({ sticker, reason: REWARD_REASON });
  }
  return results;
}
