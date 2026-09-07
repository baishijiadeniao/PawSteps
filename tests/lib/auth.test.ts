import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaClient } from "@/lib/prisma";

beforeEach(async () => {
  await prismaClient.session.deleteMany();
  await prismaClient.loginAttempt.deleteMany();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("session", () => {
  it("createSession persists hashed token", async () => {
    const { createSession } = await import("@/lib/session");
    const token = await createSession();
    expect(token).toMatch(/^[a-f0-9]{64}$/); // 32 字节 hex
    const sessions = await prismaClient.session.findMany();
    expect(sessions.length).toBe(1);
    expect(sessions[0].tokenHash).not.toBe(token); // 存的是 hash
    expect(sessions[0].tokenHash.length).toBe(64);
  });

  it("verifyOwnerSession returns true for valid token", async () => {
    const { createSession } = await import("@/lib/session");
    const { verifyOwnerSession } = await import("@/lib/auth");
    const token = await createSession();
    const ok = await verifyOwnerSession(token);
    expect(ok).toBe(true);
  });

  it("verifyOwnerSession returns false for invalid token", async () => {
    const { verifyOwnerSession } = await import("@/lib/auth");
    const ok = await verifyOwnerSession("invalid-token");
    expect(ok).toBe(false);
  });

  it("verifyOwnerSession returns false for expired session", async () => {
    const { createSession } = await import("@/lib/session");
    const { verifyOwnerSession } = await import("@/lib/auth");
    const token = await createSession();
    // 手动过期
    const crypto = await import("crypto");
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    await prismaClient.session.update({
      where: { tokenHash: hash },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const ok = await verifyOwnerSession(token);
    expect(ok).toBe(false);
  });
});

describe("rate limit", () => {
  beforeEach(() => {
    vi.stubEnv("RATE_LIMIT_SECRET", "test-rate-secret");
  });

  it("allows up to 4 failures, blocks at 5", async () => {
    const { recordFailedLogin, checkLoginRate } = await import("@/lib/rate-limit");
    for (let i = 0; i < 4; i++) {
      await recordFailedLogin("test-identifier");
      expect(await checkLoginRate("test-identifier")).toBe(true);
    }
    await recordFailedLogin("test-identifier");
    expect(await checkLoginRate("test-identifier")).toBe(false);
  });

  it("clears failures on success", async () => {
    const { recordFailedLogin, checkLoginRate, clearFailedLogins } = await import("@/lib/rate-limit");
    await recordFailedLogin("test-identifier");
    await clearFailedLogins("test-identifier");
    expect(await checkLoginRate("test-identifier")).toBe(true);
  });
});
