import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { GET } from "@/app/api/stickers/route";
import { STARTER_STICKERS, LINK_SERIES } from "@/lib/stickerCatalog";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

// 固定"今天"为上海时区 2026-09-12（手术日为 09-09，术后第 3 天，EARLY 阶段）
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

/** 建两条 EARLY 阶段计划动作，返回其 id */
async function seedEarlyPlan() {
  const a = await prismaClient.rehabPlanItem.create({
    data: {
      phase: "EARLY",
      name: "踝泵运动",
      description: "防血栓消肿胀",
      category: "exercise",
      order: 1,
    },
  });
  const b = await prismaClient.rehabPlanItem.create({
    data: {
      phase: "EARLY",
      name: "冰敷",
      description: "15-20 分钟消肿",
      category: "care",
      order: 2,
    },
  });
  return [a.id, b.id];
}

async function checkin(date: string, planItemIds: string[]) {
  for (const planItemId of planItemIds) {
    await prismaClient.rehabLog.create({
      data: { date, planItemId, exerciseName: "x", done: true },
    });
  }
}

describe("GET /api/stickers", () => {
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

  it("首次访问自动落库初始贴纸，并按术后天数解锁联动系列", async () => {
    await withOwner();
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.items).toHaveLength(65);
    const unlocked = data.items.filter((i: any) => i.unlocked);
    // 手术日 09-09、今天 09-12 → 术后第 4 天，每个联动系列解锁前 4 张
    const linkUnlocked = LINK_SERIES.flatMap((s) => s.slice(0, 4));
    expect(unlocked.map((i: any) => i.sticker).sort()).toEqual(
      [...STARTER_STICKERS, ...linkUnlocked].sort()
    );
    expect(data.newlyUnlocked).toHaveLength(linkUnlocked.length);

    // 未解锁格子带获取方式文案、无解锁时间
    const locked = data.items.find((i: any) => !i.unlocked);
    expect(locked.how).toBeTruthy();
    expect(locked.unlockedAt).toBeNull();
  });

  it("完成首次康复打卡后返回 pat_pat 新解锁，二次访问不再重复", async () => {
    await withOwner();
    const [itemId] = await seedEarlyPlan();
    await checkin("2026-09-10", [itemId]);

    const res1 = await GET();
    const data1 = await res1.json();
    expect(
      data1.newlyUnlocked.map((u: any) => u.sticker)
    ).toContain("pat_pat");
    // 落库后收集册状态同步
    const pat = data1.items.find((i: any) => i.sticker === "pat_pat");
    expect(pat.unlocked).toBe(true);
    expect(pat.reason).toBe("完成第一次康复打卡");
    expect(pat.unlockedAt).toBeTruthy();

    const res2 = await GET();
    const data2 = await res2.json();
    expect(data2.newlyUnlocked).toEqual([]);
  });

  it("当天全部动作完成后解锁 shine_today", async () => {
    await withOwner();
    const ids = await seedEarlyPlan();
    await checkin(TODAY, ids); // 两条全部打勾 → 全部完成

    const data = await (await GET()).json();
    const link: Set<string> = new Set(LINK_SERIES.flat());
    const names = data.newlyUnlocked
      .map((u: any) => u.sticker as string)
      .filter((n: string) => !link.has(n));
    // 规则顺序：pat_pat 在前，shine_today 在后
    expect(names).toEqual(["pat_pat", "shine_today"]);
  });
});
