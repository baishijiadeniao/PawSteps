import { createHash } from "crypto";
import { prismaClient } from "./prisma";

const MAX_FAILURES_PER_MINUTE = 5;

/** 登录入口的哈希标识；scope 区分主人/陪伴者，互不影响限流状态 */
function hashIdentifier(ip: string, scope = "owner"): string {
  const secret = process.env.RATE_LIMIT_SECRET || "fallback-dev-secret";
  return createHash("sha256").update(`${scope}:${ip}:${secret}`).digest("hex");
}

export async function recordFailedLogin(
  ip: string,
  scope?: string
): Promise<void> {
  const identifier = hashIdentifier(ip, scope);
  await prismaClient.loginAttempt.create({ data: { identifier } });
}

export async function checkLoginRate(
  ip: string,
  scope?: string
): Promise<boolean> {
  const identifier = hashIdentifier(ip, scope);
  const oneMinAgo = new Date(Date.now() - 60 * 1000);
  const count = await prismaClient.loginAttempt.count({
    where: { identifier, failedAt: { gte: oneMinAgo } },
  });
  return count < MAX_FAILURES_PER_MINUTE;
}

export async function clearFailedLogins(
  ip: string,
  scope?: string
): Promise<void> {
  const identifier = hashIdentifier(ip, scope);
  await prismaClient.loginAttempt.deleteMany({ where: { identifier } });
}
