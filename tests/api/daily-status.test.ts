import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { GET, POST } from "@/app/api/daily-status/route";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

beforeEach(async () => {
  await prismaClient.dailyStatus.deleteMany();
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

function makePostReq(body: unknown) {
  return new Request("http://localhost/api/daily-status", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as any;
}

describe("POST /api/daily-status", () => {
  it("creates status on valid input", async () => {
    await withOwner();
    const res = await POST(
      makePostReq({
        date: "2026-09-10",
        energy: "TIRED",
        painLevel: 3,
      })
    );
    expect(res.status).toBe(201);
  });

  it("updates same-day status via upsert", async () => {
    await withOwner();
    await POST(
      makePostReq({ date: "2026-09-10", energy: "TIRED", painLevel: 3 })
    );
    await POST(
      makePostReq({ date: "2026-09-10", energy: "REST", painLevel: 5 })
    );
    const count = await prismaClient.dailyStatus.count({
      where: { date: "2026-09-10" },
    });
    expect(count).toBe(1);
  });

  it("rejects invalid energy", async () => {
    await withOwner();
    const res = await POST(
      makePostReq({ date: "2026-09-10", energy: "INVALID" })
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/daily-status", () => {
  it("returns today status when exists", async () => {
    await withOwner();
    await prismaClient.dailyStatus.create({
      data: { date: "2026-09-10", energy: "TIRED", painLevel: 3 },
    });
    // 由于 GET 使用 getToday()，且当前日期非 2026-09-10，改用直接查询验证
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Shanghai",
    });
    await prismaClient.dailyStatus.deleteMany();
    await prismaClient.dailyStatus.create({
      data: { date: today, energy: "NORMAL", painLevel: 1 },
    });
    const res = await GET();
    const data = await res.json();
    expect(data.status).not.toBeNull();
    expect(data.status.energy).toBe("NORMAL");
  });
});
