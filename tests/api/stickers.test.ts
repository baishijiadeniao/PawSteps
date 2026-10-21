import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { GET } from "@/app/api/stickers/route";
import { STARTER_STICKERS, LINK_SERIES } from "@/lib/stickerCatalog";
import { REWARD_REASON } from "@/lib/stickerRules";
import type { StickerName } from "@/lib/stickerPop";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

// 固定"今天"为上海时区 2026-09-12（手术日为 09-09，术后第 3 天，WEEK_1 阶段）
const TODAY = "2026-09-12";
/** 各系列的第 1 张：保底开箱即用 */
const FIRSTS = LINK_SERIES.map((s) => s[0]);
/** 联动系列全部贴纸 */
const LINK: string[] = LINK_SERIES.flat();
/** 随机奖励池：各系列的第 2～9 张 */
const POOL = LINK_SERIES.flatMap((s) => s.slice(1));

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T04:00:00Z`));
  await prismaClient.stickerUnlock.deleteMany();
  await prismaClient.rehabLog.deleteMany();
  await prismaClient.rehabPlanItem.deleteMany();
  await prismaClient.moodLog.deleteMany();
  await prismaClient.dailyStatus.deleteMany();
  await prismaClient.dailyLogin.deleteMany();
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

/**
 * 建一组 WEEK_1 阶段计划动作（术后第 3 天属于第 1 周）：
 * 训练动作按早/下午/晚拆成三条，另有一条护理项，返回各组的 id。
 */
async function seedEarlyPlan() {
  const ids: { pump: string[]; slide: string[]; care: string[] } = {
    pump: [],
    slide: [],
    care: [],
  };
  let order = 0;
  for (const slot of ["早晨", "下午", "晚上"]) {
    for (const [base, bucket] of [
      ["踝泵", ids.pump],
      ["足跟滑动", ids.slide],
    ] as const) {
      const item = await prismaClient.rehabPlanItem.create({
        data: {
          phase: "WEEK_1",
          name: `${base} · ${slot}`,
          description: "引导浮层按基名匹配节拍",
          category: "exercise",
          timeOfDay: slot,
          targetValue: 30,
          targetUnit: "次",
          targetSets: 2,
          order: ++order,
        },
      });
      bucket.push(item.id);
    }
  }
  const ice = await prismaClient.rehabPlanItem.create({
    data: {
      phase: "WEEK_1",
      name: "冰敷",
      description: "15-20 分钟消肿",
      category: "care",
      order: ++order,
    },
  });
  ids.care.push(ice.id);
  return {
    ...ids,
    all: [...ids.pump, ...ids.slide, ...ids.care],
  };
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

  it("首次访问自动落库初始贴纸：各系列第 1 张保底，登录再随机奖励 1 张", async () => {
    await withOwner();
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    // 16 张成长 + 41 张日常表情包 + 71 张联动 = 128
    expect(data.items).toHaveLength(128);
    const unlocked: StickerName[] = data.items
      .filter((i: any) => i.unlocked)
      .map((i: any) => i.sticker as StickerName);
    // 手术日 09-09、今天 09-12 → 已到术后第 4 天，但一次都没全部完成任务；
    // 额度只有"今天登录"这一次，所以池子里只掉出 1 张。
    expect(unlocked.filter((s) => FIRSTS.includes(s))).toEqual(FIRSTS);
    expect(unlocked.filter((s) => POOL.includes(s))).toHaveLength(1);
    expect(unlocked.filter((s) => STARTER_STICKERS.includes(s))).toHaveLength(
      STARTER_STICKERS.length
    );
    expect(data.newlyUnlocked).toHaveLength(FIRSTS.length + 1);

    // 未解锁格子带获取方式文案、无解锁时间
    const locked = data.items.find((i: any) => !i.unlocked);
    expect(locked.how).toBeTruthy();
    expect(locked.unlockedAt).toBeNull();
  });

  it("同一天重复访问不会重复发放登录奖励", async () => {
    await withOwner();
    await GET();
    const data = await (await GET()).json();
    expect(data.newlyUnlocked).toEqual([]);
  });

  it("登录与完成额度同池累加：两天全完成 6 张 + 今天登录 1 张 = 掉出 7 张", async () => {
    await withOwner();
    const plan = await seedEarlyPlan();
    await checkin("2026-09-11", plan.all);
    await checkin(TODAY, plan.all);

    const data = await (await GET()).json();
    const drawn = data.items.filter(
      (i: any) => POOL.includes(i.sticker) && i.unlocked
    );
    // 每天：全部完成 1 + 踝泵全组 1 + 足跟滑动全组 1 = 3 张，登录只有今天记 1 次
    expect(drawn).toHaveLength(7);
    for (const item of drawn) {
      expect(item.reason).toBe(REWARD_REASON);
      expect(item.how).toContain("随机掉落");
    }
    // 剩下的池内贴纸仍然锁着
    expect(
      data.items.filter((i: any) => POOL.includes(i.sticker) && !i.unlocked)
    ).toHaveLength(POOL.length - 7);
  });

  it("单个动作当天全组完成也攒额度：踝泵做完 2 张，当天未全部完成", async () => {
    await withOwner();
    const plan = await seedEarlyPlan();
    // 只做完踝泵三组 + 冰敷，足跟滑动一组都没做
    await checkin(TODAY, [...plan.pump, ...plan.care]);

    const data = await (await GET()).json();
    expect(
      data.items.filter((i: any) => POOL.includes(i.sticker) && i.unlocked)
    ).toHaveLength(2);
    const names = data.newlyUnlocked
      .map((u: any) => u.sticker as string)
      .filter((n: string) => !LINK.includes(n));
    // 当天没全部完成 → 只解锁首次打卡，不解锁 shine_today
    expect(names).toEqual(["pat_pat"]);
  });

  it("完成首次康复打卡后返回 pat_pat 新解锁，二次访问不再重复", async () => {
    await withOwner();
    const plan = await seedEarlyPlan();
    await checkin("2026-09-10", [plan.pump[0]]);

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
    const plan = await seedEarlyPlan();
    await checkin(TODAY, plan.all); // 全部计划项打勾 → 当天全部完成

    const data = await (await GET()).json();
    const names = data.newlyUnlocked
      .map((u: any) => u.sticker as string)
      .filter((n: string) => !LINK.includes(n));
    // 规则顺序：pat_pat 在前，shine_today 在后
    expect(names).toEqual(["pat_pat", "shine_today"]);
  });
});
