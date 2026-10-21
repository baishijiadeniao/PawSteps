/**
 * 小愿望奖励规则（纯函数，不碰数据库，便于单测）。
 *
 * 规则口径：把全部打卡日期切成"连续段"，每段内每满 7 天赢得 1 个小愿望
 * （第 7、14、21…天各得一次；断连后重新攒，重新满 7 天还会再得）。
 * 日期一律使用 YYYY-MM-DD 字符串。
 */

import { differenceInCalendarDays, parseISO } from "date-fns";

/** 默认里程碑：连续打卡多少天赢得 1 个愿望 */
export const DEFAULT_MILESTONE_EVERY = 7;

/**
 * 根据打卡日期集合，推导截至今天应赢得的"愿望里程碑"列表。
 *
 * 返回值按时间顺序排列，每个元素表示"某一段连续打卡达到该天数时赢得 1 个愿望"。
 * 例：一段连打 15 天 → [7, 14]；两段各连打 7 天 → [7, 7]。
 * 列表长度即应存在的 Wish 行数（用于与服务端已落库行数对比、幂等补建）。
 */
export function computeWishMilestones(
  dates: string[],
  milestoneEvery: number = DEFAULT_MILESTONE_EVERY
): number[] {
  if (milestoneEvery <= 0) return [];
  // 去重 + 按时间升序排序
  const sorted = Array.from(new Set(dates)).sort();
  const milestones: number[] = [];
  let runLength = 0;
  let prev: Date | null = null;
  for (const day of sorted) {
    const current = parseISO(day);
    if (prev !== null && differenceInCalendarDays(current, prev) === 1) {
      // 与前一天连续，当前段长度 +1
      runLength += 1;
    } else {
      // 断开了新的一段（或首条记录），重新从 1 开始攒
      runLength = 1;
    }
    prev = current;
    if (runLength % milestoneEvery === 0) {
      milestones.push(runLength);
    }
  }
  return milestones;
}

/**
 * 距离下一个愿望还差几天。
 * streak 为"当前这段"的连续打卡天数（可为 0），每满 milestoneEvery 天得 1 个。
 */
export function daysToNextWish(
  streak: number,
  milestoneEvery: number = DEFAULT_MILESTONE_EVERY
): number {
  if (milestoneEvery <= 0) return 0;
  const remainder = streak % milestoneEvery;
  return remainder === 0 ? milestoneEvery : milestoneEvery - remainder;
}
