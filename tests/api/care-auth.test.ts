import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { COMPANION_LOGIN_ERROR } from "@/lib/auth";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

beforeEach(async () => {
  await prismaClient.companionMessage.deleteMany();
  await prismaClient.companion.deleteMany();
  await prismaClient.session.deleteMany();
  await prismaClient.loginAttempt.deleteMany();
  vi.stubEnv("OWNER_CODE", "eleven-2026");
  vi.stubEnv("SESSION_SECRET", "test-secret");
  vi.stubEnv("RATE_LIMIT_SECRET", "test-rate-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

/** 按 cookie 名返回对应 token 的 mock（owner/companion 互不串台） */
async function mockCookies(map: Record<string, string>) {
  const { cookies, headers } = await import("next/headers");
  (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: (name: string) =>
      map[name] ? { value: map[name] } : undefined,
    set: vi.fn(),
    delete: vi.fn(),
  });
  (headers as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: () => null,
  });
}

function makeReq(url: string, body: unknown, ip = "9.9.9.9") {
  return new Request(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  }) as any;
}

async function newCompanion(nickname = "妈妈") {
  // 固定一个格式合法的邀请码即可（每个用例都会清空 companion 表）
  return prismaClient.companion.create({
    data: { nickname, inviteCode: "KX7PQM24" },
  });
}

describe("POST /api/care/login（邀请码登录）", () => {
  it("邀请码正确时返回 200 并种 companion_session cookie", async () => {
    const { POST } = await import("@/app/api/care/login/route");
    const companion = await newCompanion();
    const res = await POST(
      makeReq("http://localhost/api/care/login", {
        code: companion.inviteCode,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.nickname).toBe("妈妈");
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("companion_session=");
    expect(setCookie).toContain("HttpOnly");
  });

  it("小写/带空格的邀请码规范化后也能登录", async () => {
    const { POST } = await import("@/app/api/care/login/route");
    const companion = await newCompanion();
    const res = await POST(
      makeReq("http://localhost/api/care/login", {
        code: ` ${companion.inviteCode.toLowerCase()} `,
      }),
    );
    expect(res.status).toBe(200);
  });

  it("邀请码错误时返回统一口径的 401（不透露码是否存在）", async () => {
    const { POST } = await import("@/app/api/care/login/route");
    const res = await POST(
      makeReq("http://localhost/api/care/login", { code: "ZZZZZZZZ" })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe(COMPANION_LOGIN_ERROR);
  });

  it("空邀请码返回 400", async () => {
    const { POST } = await import("@/app/api/care/login/route");
    const res = await POST(
      makeReq("http://localhost/api/care/login", { code: "" })
    );
    expect(res.status).toBe(400);
  });

  it("同 IP 失败 5 次后触发限流 429", async () => {
    const { POST } = await import("@/app/api/care/login/route");
    const ip = "9.9.8.1";
    for (let i = 0; i < 5; i++) {
      await POST(makeReq("http://localhost/api/care/login", { code: "BADCODE1" }, ip));
    }
    const companion = await newCompanion();
    const res = await POST(
      makeReq("http://localhost/api/care/login", { code: companion.inviteCode }, ip)
    );
    expect(res.status).toBe(429);
  });

  it("陪伴者限流不影响主人登录（不同 scope 独立计数）", async () => {
    const ip = "9.9.7.7";
    const careLogin = await import("@/app/api/care/login/route");
    for (let i = 0; i < 5; i++) {
      await careLogin.POST(
        makeReq("http://localhost/api/care/login", { code: "BADCODE1" }, ip)
      );
    }
    // 陪伴者域已限流
    const careRes = await careLogin.POST(
      makeReq("http://localhost/api/care/login", { code: "BADCODE1" }, ip)
    );
    expect(careRes.status).toBe(429);
    // 主人域同 IP 仍可正常登录
    const ownerLogin = await import("@/app/api/auth/login/route");
    const ownerRes = await ownerLogin.POST(
      makeReq("http://localhost/api/auth/login", { code: "eleven-2026" }, ip)
    );
    expect(ownerRes.status).toBe(200);
  });
});

describe("双域鉴权矩阵", () => {
  it("陪伴者会话不能访问主人侧接口（307）", async () => {
    const { GET } = await import("@/app/api/encouragements/route");
    const companion = await newCompanion();
    const token = await createSession("companion", companion.id);
    // 即便有人把陪伴者 token 塞进 owner_session 槽位，role 不符也要拒绝
    await mockCookies({ owner_session: token });
    const res = await GET();
    expect(res.status).toBe(307);
  });

  it("主人会话不能冒充陪伴者写鼓励（307）", async () => {
    const { POST } = await import("@/app/api/care/encouragements/route");
    const ownerToken = await createSession();
    await mockCookies({ companion_session: ownerToken });
    const res = await POST(
      makeReq("http://localhost/api/care/encouragements", { content: "加油" })
    );
    expect(res.status).toBe(307);
  });

  it("无任何 cookie 时陪伴者接口 307 到 /care/login", async () => {
    const { POST } = await import("@/app/api/care/encouragements/route");
    await mockCookies({});
    const res = await POST(
      makeReq("http://localhost/api/care/encouragements", { content: "加油" })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/care/login");
  });

  it("被移除的陪伴者立即失去访问权限（307）", async () => {
    const { POST } = await import("@/app/api/care/encouragements/route");
    const companion = await newCompanion();
    const token = await createSession("companion", companion.id);
    await mockCookies({ companion_session: token });
    await prismaClient.companion.delete({ where: { id: companion.id } });
    const res = await POST(
      makeReq("http://localhost/api/care/encouragements", { content: "加油" })
    );
    expect(res.status).toBe(307);
  });

  it("POST /api/care/logout 会删除会话记录", async () => {
    const { POST } = await import("@/app/api/care/logout/route");
    const companion = await newCompanion();
    const token = await createSession("companion", companion.id);
    await mockCookies({ companion_session: token });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await prismaClient.session.count()).toBe(0);
  });
});
