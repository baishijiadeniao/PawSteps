import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { POST } from "@/app/api/mood/route";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

beforeEach(async () => {
  await prismaClient.moodLog.deleteMany();
  vi.stubEnv("OWNER_CODE", "eleven-2026");
  vi.stubEnv("SESSION_SECRET", "test-secret");
  vi.stubEnv("RATE_LIMIT_SECRET", "test-rate-secret");
  vi.stubEnv("SURGERY_DATE", "2026-09-09");
  vi.stubEnv("APP_TIMEZONE", "Asia/Shanghai");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function withOwner(token: string) {
  const { cookies } = await import("next/headers");
  (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: () => ({ value: token }),
  });
}

function makeReq(body: unknown) {
  return new Request("http://localhost/api/mood", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as any;
}

describe("POST /api/mood", () => {
  it("creates mood log on valid input", async () => {
    const token = await createSession();
    await withOwner(token);

    const res = await POST(
      makeReq({ date: "2026-09-10", mood: "GOOD", note: "今天好多了" })
    );
    expect(res.status).toBe(201);
  });

  it("updates same-day mood log instead of creating new", async () => {
    const token = await createSession();
    await withOwner(token);

    for (const m of ["GOOD", "OK", "DOWN"]) {
      await POST(makeReq({ date: "2026-09-10", mood: m }));
    }
    const count = await prismaClient.moodLog.count({
      where: { date: "2026-09-10" },
    });
    expect(count).toBe(1); // 同日只保留一条
  });

  it("rejects invalid mood", async () => {
    const token = await createSession();
    await withOwner(token);

    const res = await POST(makeReq({ date: "2026-09-10", mood: "INVALID" }));
    expect(res.status).toBe(400);
  });
});
