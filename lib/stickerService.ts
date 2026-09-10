/**
 * 贴纸收集册 / 桌宠状态的服务层：
 * 负责从数据库聚合行为数据（打卡、全部完成、心情、状态），
 * 调用纯函数规则 evaluateUnlocks 判定新解锁，并持久化到 StickerUnlock 表。
 */

import { prismaClient } from "./prisma";
import { getToday, getPostOpDay, getSurgeryDate } from "./date";
import { getRehabPhase } from "./phase";
import { computeStreak, evaluateUnlocks, type UnlockResult } from "./stickerRules";
import {
  STARTER_STICKERS,
  STICKER_CATALOG,
  STICKER_CATALOG_ORDER,
} from "./stickerCatalog";
import type { StickerName } from "./stickerPop";

/** 桌宠情绪三态：发蔫 / 平常 / 活泼（连胜） */
export type PetMood = "droopy" | "normal" | "hyper";

export interface CollectionItem {
  sticker: StickerName;
  label: string;
  how: string;
  unlocked: boolean;
  /** 解锁时间 ISO 字符串；未解锁为 null */
  unlockedAt: string | null;
  /** 解锁原因文案；未解锁为 null */
  reason: string | null;
}

/** 从康复打卡日志聚合出的行为数据（日期均为 YYYY-MM-DD） */
interface HabitData {
  checkinDates: string[];
  allDoneDates: string[];
  moodDates: string[];
  statusDates: string[];
}

/** 把 done=true 的打卡日志按天聚合，判定哪些天"全部完成" */
async function loadHabitData(): Promise<HabitData> {
  const [doneLogs, planItems, moods, statuses] = await Promise.all([
    prismaClient.rehabLog.findMany({
      where: { done: true },
      select: { date: true, planItemId: true },
    }),
    prismaClient.rehabPlanItem.findMany({ select: { id: true, phase: true } }),
    prismaClient.moodLog.findMany({ select: { date: true } }),
    prismaClient.dailyStatus.findMany({ select: { date: true } }),
  ]);

  const surgeryDate = getSurgeryDate();

  // 每个阶段包含哪些动作 id
  const itemIdsByPhase = new Map<string, string[]>();
  for (const item of planItems) {
    const list = itemIdsByPhase.get(item.phase) ?? [];
    list.push(item.id);
    itemIdsByPhase.set(item.phase, list);
  }

  // 每天完成了哪些动作 id
  const doneIdsByDate = new Map<string, Set<string>>();
  for (const log of doneLogs) {
    if (!log.planItemId) continue;
    const set = doneIdsByDate.get(log.date) ?? new Set<string>();
    set.add(log.planItemId);
    doneIdsByDate.set(log.date, set);
  }

  // "全部完成"：该天所属阶段的所有计划动作都被打勾
  const allDoneDates: string[] = [];
  for (const [date, ids] of doneIdsByDate) {
    const phase = getRehabPhase(getPostOpDay(date, surgeryDate));
    const phaseItems = itemIdsByPhase.get(phase) ?? [];
    if (phaseItems.length > 0 && phaseItems.every((id) => ids.has(id))) {
      allDoneDates.push(date);
    }
  }

  return {
    checkinDates: Array.from(new Set(doneLogs.map((l) => l.date))),
    allDoneDates,
    moodDates: moods.map((m) => m.date),
    statusDates: statuses.map((s) => s.date),
  };
}

/** 保证初始 4 张陪伴贴纸始终处于解锁状态 */
export async function ensureStarterStickers(): Promise<void> {
  // SQLite 不支持 createMany 的 skipDuplicates，逐条 upsert
  for (const sticker of STARTER_STICKERS) {
    await prismaClient.stickerUnlock.upsert({
      where: { sticker },
      update: {},
      create: { sticker, reason: "初始贴纸" },
    });
  }
}

/** 当前已解锁的贴纸名列表（含初始 4 张） */
export async function getUnlockedNames(): Promise<StickerName[]> {
  await ensureStarterStickers();
  const rows = await prismaClient.stickerUnlock.findMany({
    select: { sticker: true },
  });
  return rows.map((r) => r.sticker as StickerName);
}

/**
 * 聚合行为数据 → 评估新解锁 → 持久化。
 * 返回本次新解锁的贴纸（已解锁过的不会重复返回）。
 */
export async function refreshUnlocks(): Promise<UnlockResult[]> {
  await ensureStarterStickers();
  const alreadyUnlocked = await getUnlockedNames();
  const data = await loadHabitData();
  const newly = evaluateUnlocks({
    ...data,
    today: getToday(),
    surgeryDate: getSurgeryDate(),
    alreadyUnlocked,
  });
  if (newly.length > 0) {
    for (const u of newly) {
      await prismaClient.stickerUnlock.upsert({
        where: { sticker: u.sticker },
        update: {},
        create: { sticker: u.sticker, reason: u.reason },
      });
    }
  }
  return newly;
}

/** 收集册完整数据：16 格 + 本次新解锁列表 */
export async function getCollection(): Promise<{
  items: CollectionItem[];
  newlyUnlocked: UnlockResult[];
}> {
  const newlyUnlocked = await refreshUnlocks();
  const rows = await prismaClient.stickerUnlock.findMany();
  const byName = new Map(rows.map((r) => [r.sticker, r]));
  const items: CollectionItem[] = STICKER_CATALOG_ORDER.map((name) => {
    const row = byName.get(name);
    return {
      sticker: name,
      label: STICKER_CATALOG[name].label,
      how: STICKER_CATALOG[name].how,
      unlocked: Boolean(row),
      unlockedAt: row ? row.unlockedAt.toISOString() : null,
      reason: row ? row.reason : null,
    };
  });
  return { items, newlyUnlocked };
}

/** 桌宠联动用的打卡统计 */
export async function getCheckinStats(): Promise<{
  streak: number;
  checkedInToday: boolean;
  allDoneToday: boolean;
  allDoneTotal: number;
  postOpDay: number;
  mood: PetMood;
}> {
  const today = getToday();
  const surgeryDate = getSurgeryDate();
  const data = await loadHabitData();
  const streak = computeStreak(data.checkinDates, today);
  const checkedInToday = data.checkinDates.includes(today);
  const allDoneToday = data.allDoneDates.includes(today);
  const postOpDay = getPostOpDay(today, surgeryDate);
  // 连续打卡 >=3 天变活泼；术后且今天/昨天都没打卡则发蔫等待
  const mood: PetMood =
    streak >= 3 ? "hyper" : streak === 0 && postOpDay >= 0 ? "droopy" : "normal";
  return {
    streak,
    checkedInToday,
    allDoneToday,
    allDoneTotal: data.allDoneDates.length,
    postOpDay,
    mood,
  };
}
