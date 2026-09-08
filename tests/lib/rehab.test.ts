import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import {
  getRehabItemsByPhase,
  calculateDailyProgress,
} from "@/lib/rehab";

beforeEach(async () => {
  await prismaClient.rehabLog.deleteMany();
  await prismaClient.rehabPlanItem.deleteMany();
  // 测试库不再依赖种子数据，自行构造 EARLY 阶段动作
  await prismaClient.rehabPlanItem.createMany({
    data: [
      {
        phase: "EARLY",
        name: "踝泵运动",
        description: "防血栓消肿胀",
        category: "exercise",
        targetValue: 100,
        targetUnit: "次",
        targetSets: 1,
        frequencyPerDay: 1,
        order: 1,
      },
      {
        phase: "EARLY",
        name: "冰敷",
        description: "15-20 分钟消肿",
        category: "care",
        targetValue: 3,
        targetUnit: "次",
        targetSets: 1,
        frequencyPerDay: 1,
        order: 2,
      },
    ],
  });
  vi.stubEnv("SURGERY_DATE", "2026-09-09");
  vi.stubEnv("APP_TIMEZONE", "Asia/Shanghai");
});

describe("rehab lib", () => {
  it("getRehabItemsByPhase returns items for EARLY", async () => {
    const items = await getRehabItemsByPhase("EARLY");
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.phase === "EARLY")).toBe(true);
  });

  it("calculateDailyProgress returns 0/N when no logs", async () => {
    const items = await getRehabItemsByPhase("EARLY");
    const progress = await calculateDailyProgress("2026-09-10", items);
    expect(progress.completed).toBe(0);
    expect(progress.total).toBe(items.length);
  });

  it("calculateDailyProgress counts done logs", async () => {
    const items = await getRehabItemsByPhase("EARLY");
    // 给第一个动作打一条完成记录
    await prismaClient.rehabLog.create({
      data: {
        date: "2026-09-10",
        planItemId: items[0].id,
        exerciseName: items[0].name,
        targetValue: items[0].targetValue,
        targetUnit: items[0].targetUnit,
        targetSets: items[0].targetSets,
        done: true,
      },
    });
    const progress = await calculateDailyProgress("2026-09-10", items);
    expect(progress.completed).toBe(1);
    expect(progress.total).toBe(items.length);
  });
});
