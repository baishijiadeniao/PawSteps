import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { GET, POST } from "@/app/api/timeline/route";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

beforeEach(async () => {
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

function makePostReq(body: unknown) {
  return new Request("http://localhost/api/timeline", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as any;
}

describe("POST /api/timeline", () => {
  it("creates event on valid input", async () => {
    await withOwner();
    const res = await POST(
      makePostReq({
        date: "2026-09-23",
        type: "FOLLOW_UP",
        title: "第一次复诊",
        description: "医生调整计划",
      })
    );
    expect(res.status).toBe(201);
  });

  it("rejects invalid type", async () => {
    await withOwner();
    const res = await POST(
      makePostReq({ date: "2026-09-23", type: "INVALID", title: "x" })
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/timeline", () => {
  it("returns events sorted by date ASC", async () => {
    await withOwner();
    await prismaClient.timelineEvent.createMany({
      data: [
        { date: "2026-09-23", type: "FOLLOW_UP", title: "复诊" },
        { date: "2026-09-09", type: "SURGERY", title: "手术" },
      ],
    });
    const res = await GET();
    const data = await res.json();
    expect(data.events[0].date).toBe("2026-09-09");
    expect(data.events[1].date).toBe("2026-09-23");
  });
});
