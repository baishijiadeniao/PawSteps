import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { prismaClient } from "@/lib/prisma";

beforeEach(async () => {
  await prismaClient.session.deleteMany();
  await prismaClient.loginAttempt.deleteMany();
  // 登录以库中自定义访问码优先，清掉其它测试可能留下的自定义码
  await prismaClient.appSetting.deleteMany();
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
    const req = new NextRequest("http://localhost/api/auth/login", {
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
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toContain("owner_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  it("纯 HTTP 访问时会话 cookie 不带 Secure（保证 HTTP 部署能登录）", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const req = new NextRequest("http://pawsteps-11.nat100.top/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ code: "eleven-2026" }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.98",
        "x-forwarded-proto": "http",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).not.toMatch(/;\s*Secure/i);
  });

  it("经 HTTPS 访问时会话 cookie 自动带上 Secure", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const req = new NextRequest("https://example.com/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ code: "eleven-2026" }),
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.99",
        "x-forwarded-proto": "https",
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/;\s*Secure/i);
  });

  it("returns 401 on wrong code", async () => {
    const { POST } = await import("@/app/api/auth/login/route");
    const req = new NextRequest("http://localhost/api/auth/login", {
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
    const req = new NextRequest("http://localhost/api/auth/login", {
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
      const req = new NextRequest("http://localhost/api/auth/login", {
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
    const req = new NextRequest("http://localhost/api/auth/login", {
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
