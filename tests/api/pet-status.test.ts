import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { GET } from "@/app/api/pet-status/route";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

// 固定"今天"为上海时区 2026-09-12（手术日为 09-09，术后第 3 天，WEEK_1 阶段）
const TODAY = "2026-09-12";

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T04:00:00Z`));
  await prismaClient.stickerUnlock.deleteMany();
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

/** 造一条 done=true 打卡记录 */
async function checkin(date: string) {
  await prismaClient.rehabLog.create({
    data: { date, exerciseName: "踝泵运动", done: true },
  });
}

describe("GET /api/pet-status", () => {
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

  it("术后没打卡 → 桌宠发蔫（droopy）", async () => {
    await withOwner();
    const data = await (await GET()).json();
    expect(data.streak).toBe(0);
    expect(data.checkedInToday).toBe(false);
    expect(data.postOpDay).toBe(3);
    expect(data.mood).toBe("droopy");
  });

  it("手术前（还没开刀）→ 平常态（normal）", async () => {
    vi.stubEnv("SURGERY_DATE", "2026-09-20"); // 今天是术前
    await withOwner();
    const data = await (await GET()).json();
    expect(data.postOpDay).toBeLessThan(0);
    expect(data.mood).toBe("normal");
  });

  it("只有今天打卡 → 连胜 1 天，平常态", async () => {
    await withOwner();
    await checkin(TODAY);
    const data = await (await GET()).json();
    expect(data.streak).toBe(1);
    expect(data.checkedInToday).toBe(true);
    expect(data.mood).toBe("normal");
  });

  it("连续打卡 3 天（含今天）→ 活泼态（hyper）", async () => {
    await withOwner();
    await checkin("2026-09-10");
    await checkin("2026-09-11");
    await checkin(TODAY);
    const data = await (await GET()).json();
    expect(data.streak).toBe(3);
    expect(data.mood).toBe("hyper");
  });

  it("今天全部动作完成 → allDoneToday 为 true", async () => {
    await withOwner();
    const item = await prismaClient.rehabPlanItem.create({
      data: {
        phase: "WEEK_1",
        name: "踝泵运动",
        description: "防血栓消肿胀",
        category: "exercise",
        order: 1,
      },
    });
    await prismaClient.rehabLog.create({
      data: { date: TODAY, planItemId: item.id, exerciseName: item.name, done: true },
    });
    const data = await (await GET()).json();
    expect(data.allDoneToday).toBe(true);
    expect(data.allDoneTotal).toBe(1);
  });
});
