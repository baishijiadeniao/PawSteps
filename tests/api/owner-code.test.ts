import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { prismaClient } from "@/lib/prisma";
import { createSession } from "@/lib/session";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

const ENV_CODE = "eleven-2026";

beforeEach(async () => {
  await prismaClient.session.deleteMany();
  await prismaClient.loginAttempt.deleteMany();
  await prismaClient.appSetting.deleteMany();
  vi.stubEnv("OWNER_CODE", ENV_CODE);
  vi.stubEnv("SESSION_SECRET", "test-secret");
  vi.stubEnv("RATE_LIMIT_SECRET", "test-rate-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

async function mockCookies(map: Record<string, string>) {
  const { cookies, headers } = await import("next/headers");
  (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: (name: string) => (map[name] ? { value: map[name] } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  });
  (headers as ReturnType<typeof vi.fn>).mockResolvedValue({ get: () => null });
}

async function asOwner() {
  const token = await createSession();
  await mockCookies({ owner_session: token });
}

function makeReq(
  method: string,
  url: string,
  body?: unknown,
  ip = "9.9.9.9"
) {
  return new NextRequest(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });
}

/** 走真实登录接口验证当前生效的访问码是哪一个 */
async function tryLogin(code: string, ip = "8.8.8.8"): Promise<boolean> {
  const { POST } = await import("@/app/api/auth/login/route");
  const res = await POST(
    makeReq("POST", "http://localhost/api/auth/login", { code }, ip)
  );
  return res.status === 200;
}

describe("POST /api/owner-code（修改访问码）", () => {
  it("未登录返回 307", async () => {
    const { POST } = await import("@/app/api/owner-code/route");
    await mockCookies({});
    const res = await POST(
      makeReq("POST", "http://localhost/api/owner-code", {
        currentCode: ENV_CODE,
        newCode: "new-code-1234",
        confirmCode: "new-code-1234",
      })
    );
    expect(res.status).toBe(307);
  });

  it("当前码正确时改码成功：新码可登录、旧码失效、库里只存哈希", async () => {
    await asOwner();
    const { POST } = await import("@/app/api/owner-code/route");
    const res = await POST(
      makeReq("POST", "http://localhost/api/owner-code", {
        currentCode: ENV_CODE,
        newCode: "mianyao-0915",
        confirmCode: "mianyao-0915",
      })
    );
    expect(res.status).toBe(200);
    const setting = await prismaClient.appSetting.findUnique({
      where: { key: "owner_code" },
    });
    expect(setting).not.toBeNull();
    // 存的是 sha256 十六进制，绝不明文落库
    expect(setting!.value).toMatch(/^[0-9a-f]{64}$/);
    expect(setting!.value).not.toContain("mianyao-0915");
    expect(await tryLogin("mianyao-0915", "8.1.1.1")).toBe(true);
    expect(await tryLogin(ENV_CODE, "8.2.2.2")).toBe(false);
  });

  it("当前码错误返回 403 且不改变现有码", async () => {
    await asOwner();
    const { POST } = await import("@/app/api/owner-code/route");
    const res = await POST(
      makeReq("POST", "http://localhost/api/owner-code", {
        currentCode: "wrong-current",
        newCode: "hacked-code-1",
        confirmCode: "hacked-code-1",
      })
    );
    expect(res.status).toBe(403);
    expect(await prismaClient.appSetting.findUnique({ where: { key: "owner_code" } })).toBeNull();
    expect(await tryLogin(ENV_CODE, "8.3.3.3")).toBe(true);
  });

  it("两次新码不一致返回 400", async () => {
    await asOwner();
    const { POST } = await import("@/app/api/owner-code/route");
    const res = await POST(
      makeReq("POST", "http://localhost/api/owner-code", {
        currentCode: ENV_CODE,
        newCode: "abcd-efgh",
        confirmCode: "abcd-9999",
      })
    );
    expect(res.status).toBe(400);
    expect(await prismaClient.appSetting.findUnique({ where: { key: "owner_code" } })).toBeNull();
  });

  it("新码过短或含空格返回 400", async () => {
    await asOwner();
    const { POST } = await import("@/app/api/owner-code/route");
    const short = await POST(
      makeReq("POST", "http://localhost/api/owner-code", {
        currentCode: ENV_CODE,
        newCode: "abc",
        confirmCode: "abc",
      })
    );
    expect(short.status).toBe(400);
    const space = await POST(
      makeReq("POST", "http://localhost/api/owner-code", {
        currentCode: ENV_CODE,
        newCode: "abc def12",
        confirmCode: "abc def12",
      })
    );
    expect(space.status).toBe(400);
  });

  it("新码与当前生效码相同返回 400", async () => {
    await asOwner();
    const { POST } = await import("@/app/api/owner-code/route");
    const res = await POST(
      makeReq("POST", "http://localhost/api/owner-code", {
        currentCode: ENV_CODE,
        newCode: ENV_CODE,
        confirmCode: ENV_CODE,
      })
    );
    expect(res.status).toBe(400);
  });

  it("连续用错当前码会触发限流 429（独立于登录限流）", async () => {
    await asOwner();
    const { POST } = await import("@/app/api/owner-code/route");
    for (let i = 0; i < 5; i++) {
      const res = await POST(
        makeReq(
          "POST",
          "http://localhost/api/owner-code",
          { currentCode: "bad", newCode: "good-code-1", confirmCode: "good-code-1" },
          "7.7.7.7"
        )
      );
      expect(res.status).toBe(403);
    }
    const limited = await POST(
      makeReq(
        "POST",
        "http://localhost/api/owner-code",
        { currentCode: ENV_CODE, newCode: "good-code-1", confirmCode: "good-code-1" },
        "7.7.7.7"
      )
    );
    expect(limited.status).toBe(429);
    // 登录限流不受影响（不同 scope）
    expect(await tryLogin(ENV_CODE, "7.7.7.7")).toBe(true);
  });

  it("改码成功后当前设备的会话仍然有效", async () => {
    await asOwner();
    const { POST } = await import("@/app/api/owner-code/route");
    await POST(
      makeReq("POST", "http://localhost/api/owner-code", {
        currentCode: ENV_CODE,
        newCode: "keep-session-1",
        confirmCode: "keep-session-1",
      })
    );
    const { GET } = await import("@/app/api/companions/route");
    const res = await GET();
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/owner-code（恢复默认访问码）", () => {
  it("用自定义码恢复后，环境变量码重新生效", async () => {
    await asOwner();
    const { POST, DELETE } = await import("@/app/api/owner-code/route");
    await POST(
      makeReq("POST", "http://localhost/api/owner-code", {
        currentCode: ENV_CODE,
        newCode: "temp-code-123",
        confirmCode: "temp-code-123",
      })
    );
    const res = await DELETE(
      makeReq("DELETE", "http://localhost/api/owner-code", {
        currentCode: "temp-code-123",
      })
    );
    expect(res.status).toBe(200);
    expect(await prismaClient.appSetting.findUnique({ where: { key: "owner_code" } })).toBeNull();
    expect(await tryLogin(ENV_CODE, "8.4.4.4")).toBe(true);
    expect(await tryLogin("temp-code-123", "8.5.5.5")).toBe(false);
  });

  it("当前码错误返回 403 且自定义码保持生效", async () => {
    await asOwner();
    const { POST, DELETE } = await import("@/app/api/owner-code/route");
    await POST(
      makeReq("POST", "http://localhost/api/owner-code", {
        currentCode: ENV_CODE,
        newCode: "stay-custom-123",
        confirmCode: "stay-custom-123",
      })
    );
    const res = await DELETE(
      makeReq("DELETE", "http://localhost/api/owner-code", {
        currentCode: "not-mine",
      })
    );
    expect(res.status).toBe(403);
    expect(await tryLogin("stay-custom-123", "8.6.6.6")).toBe(true);
  });
});

describe("GET /api/owner-code（当前是否已自定义）", () => {
  it("返回 custom 标记且不泄露任何码值", async () => {
    await asOwner();
    const { GET, POST } = await import("@/app/api/owner-code/route");
    let res = await GET();
    let body = await res.json();
    expect(body).toEqual({ custom: false });
    await POST(
      makeReq("POST", "http://localhost/api/owner-code", {
        currentCode: ENV_CODE,
        newCode: "flag-check-1",
        confirmCode: "flag-check-1",
      })
    );
    res = await GET();
    body = await res.json();
    expect(body).toEqual({ custom: true });
  });
});
