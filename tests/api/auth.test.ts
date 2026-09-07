import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";

beforeEach(async () => {
  await prismaClient.session.deleteMany();
  await prismaClient.loginAttempt.deleteMany();
  vi.stubEnv("OWNER_CODE", "eleven-2026");
  vi.stubEnv("SESSION_SECRET", "test-secret");
  vi.stubEnv("RATE_LIMIT_SECRET", "test-rate-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/auth/login", () => {
  it("returns success with Set-Cookie on correct code", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ code: "eleven-2026" }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("owner_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  it("returns 401 on wrong code", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ code: "wrong-code" }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.5",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("访问码不正确");
  });

  it("returns 400 on empty code", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ code: "" }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.6",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("blocks after 5 failures with 429", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    for (let i = 0; i < 5; i++) {
      const req = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ code: "wrong" }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "1.2.3.7",
        },
      });
      await POST(req);
    }
    // 第 6 次正确也会被限流
    const req = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ code: "eleven-2026" }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.7",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});
