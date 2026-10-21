/**
 * 主人每日登录记账：同一天只记一条，用于贴纸奖励规则里的"累计登录天数"。
 * 只负责记账，不直接发贴纸——发什么贴纸由 lib/stickerRules.ts 的随机池决定。
 */

import { prismaClient } from "./prisma";
import { getToday } from "./date";

/**
 * 记录主人今天的登录/到访。
 * 返回 false 表示今天已经记过（或并发写入撞了唯一约束），无需重复记账。
 */
export async function recordLoginToday(): Promise<boolean> {
  const date = getToday();
  const existing = await prismaClient.dailyLogin.findUnique({
    where: { date },
    select: { id: true },
  });
  if (existing) return false;

  try {
    await prismaClient.dailyLogin.create({ data: { date } });
  } catch {
    // 并发请求同时通过上面的存在性检查时，唯一约束会拦下后到的那一个
    return false;
  }
  return true;
}
