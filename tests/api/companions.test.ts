import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import { createSession } from "@/lib/session";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

beforeEach(async () => {
  await prismaClient.rehabLike.deleteMany();
  await prismaClient.companionMessage.deleteMany();
  await prismaClient.companion.deleteMany();
  await prismaClient.session.deleteMany();
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
    get: (name: string) => (map[name] ? { value: map[name] } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  });
  (headers as ReturnType<typeof vi.fn>).mockResolvedValue({ get: () => null });
}

function makeReq(method: string, url: string, body?: unknown) {
  return new Request(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as any;
}

async function asOwner() {
  const token = await createSession();
  await mockCookies({ owner_session: token });
}

describe("/api/companions（病人管理陪伴者）", () => {
  it("未登录访问列表返回 307", async () => {
    const { GET } = await import("@/app/api/companions/route");
    await mockCookies({});
    const res = await GET();
    expect(res.status).toBe(307);
  });

  it("新建陪伴者返回 201 与格式合法的邀请码", async () => {
    await asOwner();
    const { POST } = await import("@/app/api/companions/route");
    const res = await POST(makeReq("POST", "http://localhost/api/companions", { nickname: "妈妈" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.nickname).toBe("妈妈");
    // 8 位、排除易混淆字符 0/O/1/I
    expect(body.inviteCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  it("空昵称返回 400", async () => {
    await asOwner();
    const { POST } = await import("@/app/api/companions/route");
    const res = await POST(makeReq("POST", "http://localhost/api/companions", { nickname: "   " }));
    expect(res.status).toBe(400);
  });

  it("列表按新→旧返回并附带留言数", async () => {
    await asOwner();
    const first = await prismaClient.companion.create({
      data: { nickname: "爸爸", inviteCode: "AAAA2345" },
    });
    const second = await prismaClient.companion.create({
      data: { nickname: "姐姐", inviteCode: "BBBB2346" },
    });
    await prismaClient.companionMessage.create({
      data: { companionId: second.id, content: "加油" },
    });
    const { GET } = await import("@/app/api/companions/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.companions.length).toBe(2);
    // createdAt 倒序：后建的姐姐在前
    expect(body.companions[0].nickname).toBe("姐姐");
    expect(body.companions[0].messageCount).toBe(1);
    expect(body.companions[1].id).toBe(first.id);
    expect(body.companions[1].messageCount).toBe(0);
  });

  it("移除陪伴者会连带清掉其会话与留言", async () => {
    await asOwner();
    const companion = await prismaClient.companion.create({
      data: { nickname: "妈妈", inviteCode: "KX7PQM24" },
    });
    await createSession("companion", companion.id);
    await prismaClient.companionMessage.create({
      data: { companionId: companion.id, content: "好好养病" },
    });
    const { DELETE } = await import("@/app/api/companions/[id]/route");
    const res = await DELETE(
      makeReq("DELETE", `http://localhost/api/companions/${companion.id}`),
      { params: Promise.resolve({ id: companion.id }) }
    );
    expect(res.status).toBe(200);
    expect(await prismaClient.companion.count()).toBe(0);
    expect(
      await prismaClient.session.count({ where: { companionId: companion.id } })
    ).toBe(0);
    expect(await prismaClient.companionMessage.count()).toBe(0);
  });

  it("移除不存在的陪伴者返回 404", async () => {
    await asOwner();
    const { DELETE } = await import("@/app/api/companions/[id]/route");
    const res = await DELETE(
      makeReq("DELETE", "http://localhost/api/companions/nope"),
      { params: Promise.resolve({ id: "nope" }) }
    );
    expect(res.status).toBe(404);
  });
});
