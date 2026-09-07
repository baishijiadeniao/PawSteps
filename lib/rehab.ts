import { prismaClient } from "./prisma";
import { RehabPhase } from "./phase";
import {
  getToday,
  getPostOpDay,
  getSurgeryDate,
  isFutureDate,
} from "./date";

export async function getRehabItemsByPhase(phase: RehabPhase) {
  return prismaClient.rehabPlanItem.findMany({
    where: { phase },
    orderBy: { order: "asc" },
  });
}

export async function getTodayTasks() {
  const today = getToday();
  const pod = getPostOpDay(today, getSurgeryDate());
  const { getRehabPhase } = await import("./phase");
  const phase = getRehabPhase(pod);
  const items = await getRehabItemsByPhase(phase);
  const logs = await prismaClient.rehabLog.findMany({
    where: { date: today },
  });
  // 关联 planItem 与今日 log
  return items.map((item) => {
    const log = logs.find((l) => l.planItemId === item.id);
    return {
      ...item,
      phase,
      log: log || null,
      completedSets: log?.completedSets || 0,
      completedValue: log?.completedValue || 0,
      done: log?.done || false,
    };
  });
}

export async function calculateDailyProgress(
  date: string,
  items: { id: string }[]
) {
  const logs = await prismaClient.rehabLog.findMany({
    where: { date, done: true },
  });
  const doneItemIds = new Set(
    logs.map((l) => l.planItemId).filter(Boolean) as string[]
  );
  const completed = items.filter((i) => doneItemIds.has(i.id)).length;
  return { completed, total: items.length };
}

export async function createRehabLog(input: {
  planItemId: string;
  date: string;
  completedValue?: number | null;
  completedSets?: number | null;
  done: boolean;
  note?: string | null;
}) {
  if (isFutureDate(input.date)) {
    throw new Error("不能记录未来日期的康复任务");
  }
  const item = await prismaClient.rehabPlanItem.findUnique({
    where: { id: input.planItemId },
  });
  if (!item) throw new Error("康复动作不存在");

  return prismaClient.rehabLog.create({
    data: {
      date: input.date,
      planItemId: input.planItemId,
      exerciseName: item.name,
      targetValue: item.targetValue,
      targetUnit: item.targetUnit,
      targetSets: item.targetSets,
      completedValue: input.completedValue,
      completedSets: input.completedSets,
      done: input.done,
      note: input.note,
    },
  });
}

export async function updateRehabLog(
  id: string,
  input: {
    completedValue?: number | null;
    completedSets?: number | null;
    done?: boolean;
    note?: string | null;
  }
) {
  return prismaClient.rehabLog.update({
    where: { id },
    data: input,
  });
}
