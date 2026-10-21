import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import { recordLoginToday } from "@/lib/dailyLogin";
import { getToday } from "@/lib/date";

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-20T08:00:00+08:00"));
  await prismaClient.dailyLogin.deleteMany();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("recordLoginToday 每日登录记账", () => {
  it("当天首次到访记账成功，写入今天的日期", async () => {
    expect(await recordLoginToday()).toBe(true);
    const rows = await prismaClient.dailyLogin.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe(getToday());
  });

  it("同一天重复到访不会重复记账", async () => {
    await recordLoginToday();
    expect(await recordLoginToday()).toBe(false);
    expect(await prismaClient.dailyLogin.count()).toBe(1);
  });

  it("跨到第二天会再记一条", async () => {
    await recordLoginToday();
    vi.setSystemTime(new Date("2026-09-21T08:00:00+08:00"));
    expect(await recordLoginToday()).toBe(true);
    expect(await prismaClient.dailyLogin.count()).toBe(2);
  });

  it("并发到访只会有一次记账成功", async () => {
    const results = await Promise.all([recordLoginToday(), recordLoginToday()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await prismaClient.dailyLogin.count()).toBe(1);
  });
});
