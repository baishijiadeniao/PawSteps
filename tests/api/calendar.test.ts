import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { GET } from "@/app/api/calendar/route";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

beforeEach(async () => {
  await prismaClient.moodLog.deleteMany();
  await prismaClient.dailyStatus.deleteMany();
  await prismaClient.rehabLog.deleteMany();
  await prismaClient.timelineEvent.deleteMany();
  vi.stubEnv("OWNER_CODE", "eleven-2026");
  vi.stubEnv("SESSION_SECRET", "test-secret");
  vi.stubEnv("RATE_LIMIT_SECRET", "test-rate-secret");
  vi.stubEnv("SURGERY_DATE", "2026-09-09");
  vi.stubEnv("APP_TIMEZONE", "Asia/Shanghai");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function withOwner() {
  const token = await createSession();
  const { cookies } = await import("next/headers");
  (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: () => ({ value: token }),
  });
}

function makeReq(month?: string) {
  const url = month
    ? `http://localhost/api/calendar?month=${month}`
    : "http://localhost/api/calendar";
  return new Request(url) as any;
}

describe("GET /api/calendar", () => {
  it("rejects invalid month format", async () => {
    await withOwner();
    const res = await GET(makeReq("2026-9"));
    expect(res.status).toBe(400);
    const res2 = await GET(makeReq("abc"));
    expect(res2.status).toBe(400);
  });

  it("returns empty data for a month with no records", async () => {
    await withOwner();
    const res = await GET(makeReq("2026-01"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.month).toBe("2026-01");
    expect(data.moods).toEqual([]);
    expect(data.statuses).toEqual([]);
    expect(data.rehabByDate).toEqual([]);
    expect(data.events).toEqual([]);
  });

  it("returns all record types within the month", async () => {
    await withOwner();
    await prismaClient.moodLog.createMany({
      data: [
        { date: "2026-09-05", mood: "GREAT" },
        { date: "2026-09-20", mood: "OK" },
        { date: "2026-08-31", mood: "DOWN" }, // 上月，不应返回
        { date: "2026-10-01", mood: "GOOD" }, // 下月，不应返回
      ],
    });
    await prismaClient.dailyStatus.createMany({
      data: [
        { date: "2026-09-05", energy: "NORMAL", painLevel: 2, swelling: 1 },
        { date: "2026-10-02", energy: "TIRED" }, // 下月，不应返回
      ],
    });
    await prismaClient.rehabLog.createMany({
      data: [
        { date: "2026-09-05", exerciseName: "踝泵", done: true },
        { date: "2026-09-05", exerciseName: "直腿抬高", done: true },
        { date: "2026-09-05", exerciseName: "冰敷", done: false },
        { date: "2026-09-20", exerciseName: "踝泵", done: true },
        { date: "2026-09-30", exerciseName: "未完成项", done: false }, // 无 done 记录的日期不应出现在聚合里
      ],
    });
    await prismaClient.timelineEvent.createMany({
      data: [
        { date: "2026-09-09", type: "SURGERY", title: "手术日" },
        { date: "2026-10-01", type: "NOTE", title: "下月事件" }, // 下月，不应返回
      ],
    });

    const res = await GET(makeReq("2026-09"));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.month).toBe("2026-09");
    expect(data.moods).toHaveLength(2);
    expect(data.moods.map((m: any) => m.date)).toEqual([
      "2026-09-05",
      "2026-09-20",
    ]);
    expect(data.statuses).toHaveLength(1);
    expect(data.statuses[0].date).toBe("2026-09-05");
    expect(data.statuses[0].painLevel).toBe(2);

    const byDate = Object.fromEntries(
      data.rehabByDate.map((r: any) => [r.date, r.doneCount])
    );
    expect(byDate["2026-09-05"]).toBe(2);
    expect(byDate["2026-09-20"]).toBe(1);
    expect(byDate["2026-09-30"]).toBeUndefined();

    expect(data.events).toHaveLength(1);
    expect(data.events[0].title).toBe("手术日");
  });

  it("defaults to current month when month param is missing", async () => {
    await withOwner();
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.month).toMatch(/^\d{4}-\d{2}$/);
  });
});
