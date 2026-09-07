import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import { GET, POST } from "@/app/api/messages/route";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

beforeEach(async () => {
  await prismaClient.message.deleteMany();
  await prismaClient.loginAttempt.deleteMany();
  vi.stubEnv("RATE_LIMIT_SECRET", "test-rate-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeGetReq() {
  return new Request("http://localhost/api/messages") as any;
}

function makePostReq(body: unknown, ip = "1.2.3.9") {
  return new Request("http://localhost/api/messages", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
  }) as any;
}

describe("GET /api/messages", () => {
  it("returns only visible messages", async () => {
    await prismaClient.message.createMany({
      data: [
        { name: "A", content: "msg1", emoji: "❤️", visible: true },
        { name: "B", content: "msg2", emoji: "🐱", visible: false },
      ],
    });
    const res = await GET(makeGetReq());
    const data = await res.json();
    expect(data.messages.length).toBe(1);
    expect(data.messages[0].content).toBe("msg1");
  });

  it("limits to 50 max", async () => {
    for (let i = 0; i < 60; i++) {
      await prismaClient.message.create({
        data: { name: "u", content: `m${i}` },
      });
    }
    const res = await GET(makeGetReq());
    const data = await res.json();
    expect(data.messages.length).toBe(50);
  });
});

describe("POST /api/messages", () => {
  it("creates message on valid input", async () => {
    const res = await POST(
      makePostReq({ name: "小明", content: "加油！", emoji: "❤️" })
    );
    expect(res.status).toBe(201);
  });

  it("rejects empty name", async () => {
    const res = await POST(makePostReq({ name: "", content: "test" }));
    expect(res.status).toBe(400);
  });

  it("rejects content over 300 chars", async () => {
    const res = await POST(
      makePostReq({ name: "x", content: "a".repeat(301) })
    );
    expect(res.status).toBe(400);
  });

  it("blocks 4th post within 1 minute", async () => {
    for (let i = 0; i < 3; i++) {
      const res = await POST(
        makePostReq({ name: "x", content: `m${i}` }, "1.2.3.10")
      );
      expect(res.status).toBe(201);
    }
    const res = await POST(
      makePostReq({ name: "x", content: "m4" }, "1.2.3.10")
    );
    expect(res.status).toBe(429);
  });
});
