import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { GET, POST } from "@/app/api/wishes/route";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

// 固定"今天"为上海时区 2026-09-12（手术日为 09-09，术后第 3 天，EARLY 阶段）
const TODAY = "2026-09-12";

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T04:00:00Z`));
  await prismaClient.wish.deleteMany();
  await prismaClient.rehabLog.deleteMany();
  await prismaClient.rehabPlanItem.deleteMany();
  await prismaClient.moodLog.deleteMany();
  await prismaClient.dailyStatus.deleteMany();
  vi.stubEnv("OWNER_CODE", "eleven-2026");
  vi.stubEnv("SESSION_SECRET", "test-secret");
  vi.stubEnv("RATE_LIMIT_SECRET", "test-rate-secret");
  vi.stubEnv("SURGERY_DATE", "2026-09-09");
  vi.stubEnv("APP_TIMEZONE", "Asia/Shanghai");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function withOwner() {
  const token = await createSession();
  const { cookies } = await import("next/headers");
  (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: () => ({ value: token }),
  });
}

function makeReq(body: unknown) {
  return new Request("http://localhost/api/wishes", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as any;
}

/** 建一条 EARLY 阶段计划动作，返回其 id */
async function seedEarlyPlanItem() {
  const a = await prismaClient.rehabPlanItem.create({
    data: {
      phase: "EARLY",
      name: "踝泵运动",
      description: "防血栓消肿胀",
      category: "exercise",
      order: 1,
    },
  });
  return a.id;
}

/** 在指定日期打一次卡 */
async function checkin(date: string, planItemId: string) {
  await prismaClient.rehabLog.create({
    data: { date, planItemId, exerciseName: "x", done: true },
  });
}

/** 生成 from 起连续 count 天的日期列表（UTC 构造，避免时区偏移） */
function consecutiveDays(from: string, count: number): string[] {
  const days: string[] = [];
  const base = new Date(`${from}T00:00:00Z`);
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

describe("GET /api/wishes", () => {
  it("未登录时 307 跳转登录页", async () => {
    const { cookies, headers } = await import("next/headers");
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: () => undefined,
    });
    (headers as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: () => null,
    });
    const res = await GET();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("连续打卡满 7 天赢得 1 个 EARNED 愿望", async () => {
    await withOwner();
    const itemId = await seedEarlyPlanItem();
    for (const day of consecutiveDays("2026-09-06", 7)) {
      await checkin(day, itemId);
    }

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.milestone).toBe(7);
    expect(data.streak).toBe(7);
    expect(data.daysToNext).toBe(7); // 刚满 7 天，下一档在 14 天
    expect(data.wishes).toHaveLength(1);
    expect(data.wishes[0].status).toBe("EARNED");
    expect(data.wishes[0].streakDays).toBe(7);
    expect(data.wishes[0].content).toBeNull();
  });

  it("二次访问幂等，不重复补建愿望", async () => {
    await withOwner();
    const itemId = await seedEarlyPlanItem();
    for (const day of consecutiveDays("2026-09-06", 7)) {
      await checkin(day, itemId);
    }
    await GET();
    const data = await (await GET()).json();
    expect(data.wishes).toHaveLength(1);
    expect(await prismaClient.wish.count()).toBe(1);
  });

  it("连打满 14 天会自动追加第二个愿望", async () => {
    await withOwner();
    const itemId = await seedEarlyPlanItem();
    // 第一段：09-06 至 09-12 连打 7 天，先赢得 1 个
    for (const day of consecutiveDays("2026-09-06", 7)) {
      await checkin(day, itemId);
    }
    await GET(); // 落 1 个愿望
    // 补齐 08-30 至 09-05，与前段连成 14 天 → 应追加到 [7, 14]
    for (const day of consecutiveDays("2026-08-30", 7)) {
      await checkin(day, itemId);
    }
    const data = await (await GET()).json();
    expect(data.wishes).toHaveLength(2);
    const milestones = data.wishes
      .map((w: any) => w.streakDays)
      .sort((a: number, b: number) => a - b);
    expect(milestones).toEqual([7, 14]);
  });

  it("不足 7 天时没有愿望，只报进度", async () => {
    await withOwner();
    const itemId = await seedEarlyPlanItem();
    // 09-08 至 09-12 共 5 天（含今天）
    for (const day of consecutiveDays("2026-09-08", 5)) {
      await checkin(day, itemId);
    }
    const data = await (await GET()).json();
    expect(data.wishes).toEqual([]);
    expect(data.streak).toBe(5);
    expect(data.daysToNext).toBe(2);
  });
});

describe("POST /api/wishes", () => {
  /** 造出"赢得 1 个 EARNED 愿望"的局面并返回其 id */
  async function earnOneWish() {
    const itemId = await seedEarlyPlanItem();
    for (const day of consecutiveDays("2026-09-06", 7)) {
      await checkin(day, itemId);
    }
    await syncWishesImport();
    const [wish] = await prismaClient.wish.findMany();
    return wish.id;
  }

  // 直接走 GET 路由触发同步，避免测试依赖服务层细节
  async function syncWishesImport() {
    await GET();
  }

  it("填写愿望内容后状态变为 WAITING", async () => {
    await withOwner();
    const id = await earnOneWish();

    const res = await POST(makeReq({ id, content: "想去吃一次火锅" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.wish.status).toBe("WAITING");
    expect(data.wish.content).toBe("想去吃一次火锅");
  });

  it("标记已实现后状态变为 DONE 并记录时间", async () => {
    await withOwner();
    const id = await earnOneWish();
    await POST(makeReq({ id, content: "想去吃一次火锅" }));

    const res = await POST(makeReq({ id, action: "done" }));
    const data = await res.json();
    expect(data.wish.status).toBe("DONE");
    expect(data.wish.fulfilledAt).toBeTruthy();
  });

  it("愿望不存在返回 404", async () => {
    await withOwner();
    const res = await POST(makeReq({ id: "no-such-wish", content: "随便" }));
    expect(res.status).toBe(404);
  });

  it("content 与 action 都没有时返回 400", async () => {
    await withOwner();
    const id = await earnOneWish();
    const res = await POST(makeReq({ id }));
    expect(res.status).toBe(400);
  });

  it("空白愿望内容返回 400", async () => {
    await withOwner();
    const id = await earnOneWish();
    const res = await POST(makeReq({ id, content: "   " }));
    expect(res.status).toBe(400);
  });
});
