/**
 * 陪伴者服务层：
 * - 邀请码管理（创建/查询/移除陪伴者，移除时连带清掉它的登录会话）；
 * - 鼓励留言的发送、收件箱（病人侧未读/全部已读）、陪伴者侧自己的留言历史；
 * - 陪伴者视图的病人总览（今日任务+点赞、近 7 天概览、连胜与收集进度）；
 * - 打卡点赞的切换（RehabLike 关系表防同一陪伴者重复点）。
 */

import { format, parseISO, subDays } from "date-fns";
import { prismaClient } from "./prisma";
import {
  generateInviteCode,
  normalizeInviteCode,
  isValidInviteCodeFormat,
} from "./companion";
import { getToday } from "./date";
import { getTodayTasks } from "./rehab";
import { getCheckinStats, getUnlockedNames } from "./stickerService";
import { STICKER_CATALOG_ORDER } from "./stickerCatalog";
import { ALL_STICKERS, type StickerName } from "./stickerPop";

/** 创建陪伴者时邀请码冲突的最大重试次数 */
const INVITE_RETRY = 5;

/**
 * 新增一位陪伴者（病人生成邀请码）。
 * 邀请码随机撞车概率极低（32^8），冲突时重试几次兜底。
 */
export async function createCompanion(nickname: string) {
  const name = nickname.trim().slice(0, 20);
  if (!name) throw new Error("请填写陪伴者的称呼");
  for (let i = 0; i < INVITE_RETRY; i++) {
    const inviteCode = generateInviteCode();
    try {
      return await prismaClient.companion.create({
        data: { nickname: name, inviteCode },
      });
    } catch (e) {
      // 只有邀请码唯一键冲突才重试，其它错误照抛
      const isUnique =
        typeof e === "object" &&
        e !== null &&
        "code" in e &&
        (e as { code?: string }).code === "P2002";
      if (!isUnique || i === INVITE_RETRY - 1) throw e;
    }
  }
  throw new Error("邀请码生成失败，请重试");
}

/** 陪伴者列表（病人管理页用），附带各自收到的点赞数与留言数 */
export async function listCompanions() {
  const companions = await prismaClient.companion.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });
  return companions.map((c) => ({
    id: c.id,
    nickname: c.nickname,
    inviteCode: c.inviteCode,
    createdAt: c.createdAt,
    lastSeenAt: c.lastSeenAt,
    messageCount: c._count.messages,
  }));
}

/** 移除陪伴者：删邀请码、删留言（级联）、清掉它的登录会话 */
export async function removeCompanion(id: string): Promise<boolean> {
  const exists = await prismaClient.companion.findUnique({ where: { id } });
  if (!exists) return false;
  await prismaClient.session.deleteMany({
    where: { companionId: id, role: "companion" },
  });
  await prismaClient.companion.delete({ where: { id } });
  return true;
}

/** 按邀请码查陪伴者（登录用）；格式不对直接返回 null，不发查询 */
export async function findByInviteCode(raw: string) {
  const code = normalizeInviteCode(raw);
  if (!isValidInviteCodeFormat(code)) return null;
  return prismaClient.companion.findUnique({ where: { inviteCode: code } });
}

/** 记录陪伴者最近一次访问时间（总览页渲染时调用） */
export async function touchLastSeen(id: string): Promise<void> {
  await prismaClient.companion.update({
    where: { id },
    data: { lastSeenAt: new Date() },
  });
}

/** 陪伴者发一条鼓励留言；emoji 只接受合法贴纸名，否则忽略 */
export async function createEncouragement(input: {
  companionId: string;
  content: string;
  emoji?: string | null;
}) {
  const content = input.content.trim().slice(0, 200);
  if (!content) throw new Error("写点什么再送出吧");
  const emoji =
    input.emoji && (ALL_STICKERS as readonly string[]).includes(input.emoji)
      ? input.emoji
      : null;
  return prismaClient.companionMessage.create({
    data: { companionId: input.companionId, content, emoji },
  });
}

/** 病人收件箱：全部留言（含陪伴者称呼），新→旧 */
export async function listEncouragements(limit = 100) {
  const rows = await prismaClient.companionMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { companion: { select: { nickname: true } } },
  });
  return rows.map((m) => ({
    id: m.id,
    content: m.content,
    emoji: m.emoji as StickerName | null,
    createdAt: m.createdAt,
    readAt: m.readAt,
    nickname: m.companion.nickname,
  }));
}

/** 陪伴者查看自己送出过的留言（新→旧） */
export async function listMyEncouragements(companionId: string, limit = 20) {
  const rows = await prismaClient.companionMessage.findMany({
    where: { companionId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, content: true, emoji: true, createdAt: true, readAt: true },
  });
  return rows.map((m) => ({
    ...m,
    emoji: m.emoji as StickerName | null,
  }));
}

/** 未读留言数（病人侧红点轮询用） */
export async function countUnreadEncouragements(): Promise<number> {
  return prismaClient.companionMessage.count({ where: { readAt: null } });
}

/** 全部标记已读（病人打开收件箱时调用） */
export async function markAllEncouragementsRead(): Promise<number> {
  const res = await prismaClient.companionMessage.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });
  return res.count;
}

/** 切换某条打卡的点赞；返回切换后的状态与总数 */
export async function toggleRehabLike(logId: string, companionId: string) {
  const log = await prismaClient.rehabLog.findUnique({ where: { id: logId } });
  if (!log) throw new Error("打卡记录不存在");
  const existing = await prismaClient.rehabLike.findUnique({
    where: { logId_companionId: { logId, companionId } },
  });
  if (existing) {
    await prismaClient.rehabLike.delete({ where: { id: existing.id } });
  } else {
    await prismaClient.rehabLike.create({ data: { logId, companionId } });
  }
  const count = await prismaClient.rehabLike.count({ where: { logId } });
  return { liked: !existing, count };
}

/** 今日任务卡片（陪伴者视图）：完成状态 + 点赞数 + 我点过赞 */
export interface CareTaskCard {
  logId: string | null;
  name: string;
  description: string;
  category: string;
  done: boolean;
  completedSets: number;
  targetSets: number | null;
  likeCount: number;
  likedByMe: boolean;
}

export interface CareRecentDay {
  date: string;
  doneCount: number;
  mood: string | null;
}

/** 陪伴者总览页需要的全部聚合数据（服务端直渲，无独立 API） */
export async function getPatientSummary(companionId: string): Promise<{
  postOpDay: number;
  streak: number;
  checkedInToday: boolean;
  allDoneToday: boolean;
  collection: { unlocked: number; total: number };
  todayMood: string | null;
  todayStatusNote: string | null;
  todayTasks: CareTaskCard[];
  recentDays: CareRecentDay[];
}> {
  const today = getToday();
  // 近 7 天（含今天）的日期列表，旧→新
  const recentDates = Array.from({ length: 7 }, (_, i) =>
    format(subDays(parseISO(today), 6 - i), "yyyy-MM-dd")
  );

  const [tasks, stats, unlocked, moods, statuses, doneLogs] =
    await Promise.all([
      getTodayTasks(),
      getCheckinStats(),
      getUnlockedNames(),
      prismaClient.moodLog.findMany({
        where: { date: { in: recentDates } },
        select: { date: true, mood: true },
      }),
      prismaClient.dailyStatus.findMany({
        where: { date: { in: recentDates } },
        select: { date: true, note: true },
      }),
      prismaClient.rehabLog.findMany({
        where: { date: { in: recentDates }, done: true },
        select: { date: true },
      }),
    ]);

  // 今日各条打卡的点赞聚合（总数 + 我是否点过）
  const logIds = tasks.map((t) => t.log?.id).filter(Boolean) as string[];
  const likes =
    logIds.length > 0
      ? await prismaClient.rehabLike.findMany({
          where: { logId: { in: logIds } },
          select: { logId: true, companionId: true },
        })
      : [];
  const likeCountByLog = new Map<string, number>();
  const likedByMeSet = new Set<string>();
  for (const l of likes) {
    likeCountByLog.set(l.logId, (likeCountByLog.get(l.logId) ?? 0) + 1);
    if (l.companionId === companionId) likedByMeSet.add(l.logId);
  }

  const moodByDate = new Map(moods.map((m) => [m.date, m.mood]));
  const statusNoteByDate = new Map(
    statuses.filter((s) => s.note).map((s) => [s.date, s.note as string])
  );
  const doneCountByDate = new Map<string, number>();
  for (const l of doneLogs) {
    doneCountByDate.set(l.date, (doneCountByDate.get(l.date) ?? 0) + 1);
  }

  return {
    postOpDay: stats.postOpDay,
    streak: stats.streak,
    checkedInToday: stats.checkedInToday,
    allDoneToday: stats.allDoneToday,
    collection: { unlocked: unlocked.length, total: STICKER_CATALOG_ORDER.length },
    todayMood: moodByDate.get(today) ?? null,
    todayStatusNote: statusNoteByDate.get(today) ?? null,
    todayTasks: tasks.map((t) => ({
      logId: t.log?.id ?? null,
      name: t.name,
      description: t.description,
      category: t.category,
      done: t.done,
      completedSets: t.completedSets,
      targetSets: t.targetSets,
      likeCount: t.log ? likeCountByLog.get(t.log.id) ?? 0 : 0,
      likedByMe: t.log ? likedByMeSet.has(t.log.id) : false,
    })),
    recentDays: recentDates.map((date) => ({
      date,
      doneCount: doneCountByDate.get(date) ?? 0,
      mood: moodByDate.get(date) ?? null,
    })),
  };
}

/** 病人侧今日任务的点赞数（打卡卡片上的 ❤️ 角标用） */
export async function getTodayLikeCounts(): Promise<Record<string, number>> {
  const today = getToday();
  const logs = await prismaClient.rehabLog.findMany({
    where: { date: today },
    select: { id: true },
  });
  if (logs.length === 0) return {};
  const likes = await prismaClient.rehabLike.findMany({
    where: { logId: { in: logs.map((l) => l.id) } },
    select: { logId: true },
  });
  const counts: Record<string, number> = {};
  for (const l of likes) {
    counts[l.logId] = (counts[l.logId] ?? 0) + 1;
  }
  return counts;
}
