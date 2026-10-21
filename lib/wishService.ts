/**
 * "连续打卡赢小愿望"的服务层：
 * 从康复打卡历史推导应赢得的愿望数（幂等补建落库），
 * 并提供愿望的填写 / 标记实现 / 陪伴者待实现列表。
 */

import { prismaClient } from "./prisma";
import { getToday } from "./date";
import { computeStreak } from "./stickerRules";
import {
  computeWishMilestones,
  daysToNextWish,
  DEFAULT_MILESTONE_EVERY,
} from "./wishRules";

/** 愿望状态机：已赢得未填写 → 等待实现 → 已实现 */
export type WishStatus = "EARNED" | "WAITING" | "DONE";

/** 传给前端 / API 的愿望数据结构（日期已转 ISO 字符串） */
export interface WishDTO {
  id: string;
  /** 获得时达成的连续打卡天数里程碑（7/14/21…） */
  streakDays: number;
  content: string | null;
  status: WishStatus;
  createdAt: string;
  fulfilledAt: string | null;
}

/** 赢得 1 个愿望所需的连续打卡天数 */
export const WISH_MILESTONE = DEFAULT_MILESTONE_EVERY;

/** 有 done=true 康复打卡的日期集合（去重） */
async function loadCheckinDates(): Promise<string[]> {
  const rows = await prismaClient.rehabLog.findMany({
    where: { done: true },
    select: { date: true },
  });
  return Array.from(new Set(rows.map((r) => r.date)));
}

interface WishRow {
  id: string;
  streakDays: number;
  content: string | null;
  status: string;
  createdAt: Date;
  fulfilledAt: Date | null;
}

function toDTO(row: WishRow): WishDTO {
  return {
    id: row.id,
    streakDays: row.streakDays,
    content: row.content,
    status: row.status as WishStatus,
    createdAt: row.createdAt.toISOString(),
    fulfilledAt: row.fulfilledAt ? row.fulfilledAt.toISOString() : null,
  };
}

/**
 * 同步"打卡里程碑 → 愿望行数"：
 * 用全部打卡历史重算应赢得的愿望数，库里行数不足时按缺失顺序补建（天然幂等）；
 * 已赢得的愿望即使打卡记录回退也不回收。
 * 返回全部愿望，按获得时间倒序（最新的在前）。
 */
export async function syncWishes(): Promise<WishDTO[]> {
  const [dates, rows] = await Promise.all([
    loadCheckinDates(),
    prismaClient.wish.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const milestones = computeWishMilestones(dates, WISH_MILESTONE);
  const missing = milestones.length - rows.length;
  for (let i = 0; i < missing; i += 1) {
    await prismaClient.wish.create({
      data: { streakDays: milestones[rows.length + i] },
    });
  }
  if (missing > 0) {
    const all = await prismaClient.wish.findMany({
      orderBy: { createdAt: "desc" },
    });
    return all.map(toDTO);
  }
  return rows.map(toDTO).reverse();
}

/** rehab 页用的汇总：愿望列表 + 当前连胜 + 距下个愿望还差几天 */
export async function getWishSummary(): Promise<{
  wishes: WishDTO[];
  streak: number;
  daysToNext: number;
  milestone: number;
}> {
  const [wishes, dates] = await Promise.all([
    syncWishes(),
    loadCheckinDates(),
  ]);
  const streak = computeStreak(dates, getToday());
  return {
    wishes,
    streak,
    daysToNext: daysToNextWish(streak, WISH_MILESTONE),
    milestone: WISH_MILESTONE,
  };
}

/**
 * 更新愿望：填写内容置为 WAITING（等待实现）；标记完成置为 DONE。
 * 愿望不存在时返回 null，由调用方决定如何响应。
 */
export async function updateWish(
  id: string,
  patch: { content?: string; done?: boolean }
): Promise<WishDTO | null> {
  const row = await prismaClient.wish.findUnique({ where: { id } });
  if (!row) return null;
  const data: { content?: string; status?: WishStatus; fulfilledAt?: Date } = {};
  if (typeof patch.content === "string" && patch.content.trim() !== "") {
    data.content = patch.content.trim();
    // 已实现的愿望允许改文案，但状态不回退
    if (row.status === "EARNED") data.status = "WAITING";
  }
  if (patch.done) {
    data.status = "DONE";
    data.fulfilledAt = row.fulfilledAt ?? new Date();
  }
  const updated = await prismaClient.wish.update({
    where: { id },
    data,
  });
  return toDTO(updated);
}

/** 陪伴者可见的"等待实现"愿望列表（从早到晚） */
export async function listWaitingWishes(): Promise<WishDTO[]> {
  const rows = await prismaClient.wish.findMany({
    where: { status: "WAITING" },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toDTO);
}
