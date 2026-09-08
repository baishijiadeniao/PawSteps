import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prismaClient } from "@/lib/prisma";
import { getToday } from "@/lib/date";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month") || getToday().slice(0, 7);
  if (!MONTH_PATTERN.test(monthParam)) {
    return NextResponse.json({ error: "月份格式应为 YYYY-MM" }, { status: 400 });
  }

  // 月初/月末（date 在 SQLite 中是 YYYY-MM-DD 字符串，可直接范围比较）
  const startDate = `${monthParam}-01`;
  const [year, month] = monthParam.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = `${monthParam}-${String(lastDay).padStart(2, "0")}`;
  const dateRange = { gte: startDate, lte: endDate };

  const [moods, statuses, rehabLogs, events] = await Promise.all([
    prismaClient.moodLog.findMany({
      where: { date: dateRange },
      orderBy: { date: "asc" },
    }),
    prismaClient.dailyStatus.findMany({
      where: { date: dateRange },
      orderBy: { date: "asc" },
    }),
    prismaClient.rehabLog.findMany({
      where: { date: dateRange, done: true },
      select: { date: true },
    }),
    prismaClient.timelineEvent.findMany({
      where: { date: dateRange },
      orderBy: { date: "asc" },
    }),
  ]);

  const doneCountByDate = new Map<string, number>();
  for (const log of rehabLogs) {
    doneCountByDate.set(log.date, (doneCountByDate.get(log.date) || 0) + 1);
  }
  const rehabByDate = Array.from(doneCountByDate.entries())
    .map(([date, doneCount]) => ({ date, doneCount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ month: monthParam, moods, statuses, rehabByDate, events });
}
