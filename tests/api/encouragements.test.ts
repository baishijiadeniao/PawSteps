import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { getToday } from "@/lib/date";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

beforeEach(async () => {
  await prismaClient.rehabLike.deleteMany();
  await prismaClient.rehabLog.deleteMany();
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

/** 按 cookie 名返回对应 token 的 mock */
async function mockCookies(map: Record<string, string>) {
  const { cookies, headers } = await import("next/headers");
  (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
    get: (name: string) => (map[name] ? { value: map[name] } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  });
  (headers as ReturnType<typeof vi.fn>).mockResolvedValue({ get: () => null });
}

function makeReq(url: string, body?: unknown) {
  return new Request(url, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as any;
}

async function newCompanion(nickname: string, inviteCode: string) {
  const companion = await prismaClient.companion.create({
    data: { nickname, inviteCode },
  });
  const token = await createSession("companion", companion.id);
  await mockCookies({ companion_session: token });
  return companion;
}

async function asOwner() {
  const token = await createSession();
  await mockCookies({ owner_session: token });
}

describe("鼓励留言：陪伴者送出 → 病人收取", () => {
  it("陪伴者发送成功返回 201，病人收件箱可见称呼与内容", async () => {
    await newCompanion("妈妈", "KX7PQM24");
    const { POST } = await import("@/app/api/care/encouragements/route");
    const res = await POST(
      makeReq("http://localhost/api/care/encouragements", {
        content: "今天也要加油呀",
        emoji: "big_hug",
      })
    );
    expect(res.status).toBe(201);

    await asOwner();
    const { GET } = await import("@/app/api/encouragements/route");
    const listRes = await GET();
    expect(listRes.status).toBe(200);
    const body = await listRes.json();
    expect(body.items.length).toBe(1);
    expect(body.items[0].nickname).toBe("妈妈");
    expect(body.items[0].content).toBe("今天也要加油呀");
    expect(body.items[0].emoji).toBe("big_hug");
    expect(body.items[0].readAt).toBeNull();
  });

  it("非法贴纸名按无贴纸存储（null）", async () => {
    await newCompanion("姐姐", "KX7PQM24");
    const { POST } = await import("@/app/api/care/encouragements/route");
    const res = await POST(
      makeReq("http://localhost/api/care/encouragements", {
        content: "早点好起来",
        emoji: "not_a_real_sticker",
      })
    );
    expect(res.status).toBe(201);
    const msg = await prismaClient.companionMessage.findFirstOrThrow();
    expect(msg.emoji).toBeNull();
  });

  it("空内容返回 400", async () => {
    await newCompanion("妈妈", "KX7PQM24");
    const { POST } = await import("@/app/api/care/encouragements/route");
    const res = await POST(
      makeReq("http://localhost/api/care/encouragements", { content: "  " })
    );
    expect(res.status).toBe(400);
  });

  it("未读数随发送增长，病人全部已读后归零", async () => {
    await newCompanion("妈妈", "KX7PQM24");
    const { POST } = await import("@/app/api/care/encouragements/route");
    await POST(
      makeReq("http://localhost/api/care/encouragements", { content: "第一封" })
    );
    await POST(
      makeReq("http://localhost/api/care/encouragements", { content: "第二封" })
    );

    await asOwner();
    const { GET } = await import("@/app/api/encouragements/unread/route");
    const unreadRes = await GET();
    expect((await unreadRes.json()).count).toBe(2);

    const { POST: markRead } = await import("@/app/api/encouragements/read/route");
    const readRes = await markRead();
    expect((await readRes.json()).count).toBe(2);
    expect((await (await GET()).json()).count).toBe(0);
  });
});

describe("打卡点赞：同一陪伴者不重复计数", () => {
  async function newLog() {
    return prismaClient.rehabLog.create({
      data: { date: getToday(), exerciseName: "踝泵运动", done: true },
    });
  }

  async function toggleLike(companionToken: string, logId: string) {
    await mockCookies({ companion_session: companionToken });
    const { POST } = await import("@/app/api/care/rehab/[id]/like/route");
    return POST(makeReq(`http://localhost/api/care/rehab/${logId}/like`), {
      params: Promise.resolve({ id: logId }),
    });
  }

  it("点赞 → 取消点赞 状态正确回滚", async () => {
    const companion = await newCompanion("妈妈", "KX7PQM24");
    const token = await createSession("companion", companion.id);
    const log = await newLog();

    const likeRes = await toggleLike(token, log.id);
    expect(likeRes.status).toBe(200);
    expect(await likeRes.json()).toEqual({ liked: true, count: 1 });

    const unlikeRes = await toggleLike(token, log.id);
    expect(await unlikeRes.json()).toEqual({ liked: false, count: 0 });
  });

  it("两个陪伴者点赞同一打卡，计数累加", async () => {
    const c1 = await newCompanion("妈妈", "KX7PQM24");
    const c2 = await newCompanion("姐姐", "QQQQ2345");
    const log = await newLog();

    await toggleLike(await createSession("companion", c1.id), log.id);
    const res2 = await toggleLike(await createSession("companion", c2.id), log.id);
    expect(await res2.json()).toEqual({ liked: true, count: 2 });
    expect(await prismaClient.rehabLike.count({ where: { logId: log.id } })).toBe(2);
  });

  it("点赞不存在的打卡返回 404", async () => {
    const companion = await newCompanion("妈妈", "KX7PQM24");
    const token = await createSession("companion", companion.id);
    const res = await toggleLike(token, "no-such-log");
    expect(res.status).toBe(404);
  });
});
