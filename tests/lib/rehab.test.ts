import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import {
  getRehabItemsByPhase,
  calculateDailyProgress,
} from "@/lib/rehab";

beforeEach(async () => {
  await prismaClient.rehabLog.deleteMany();
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
