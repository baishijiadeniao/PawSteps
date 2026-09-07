import { createHash } from "crypto";
import { prismaClient } from "./prisma";

const MAX_FAILURES_PER_MINUTE = 5;

function hashIdentifier(ip: string): string {
  const secret = process.env.RATE_LIMIT_SECRET || "fallback-dev-secret";
  return createHash("sha256").update(`${ip}:${secret}`).digest("hex");
}

export async function recordFailedLogin(ip: string): Promise<void> {
  const identifier = hashIdentifier(ip);
  await prismaClient.loginAttempt.create({ data: { identifier } });
}

export async function checkLoginRate(ip: string): Promise<boolean> {
  const identifier = hashIdentifier(ip);
  const oneMinAgo = new Date(Date.now() - 60 * 1000);
  const count = await prismaClient.loginAttempt.count({
    where: { identifier, failedAt: { gte: oneMinAgo } },
  });
  return count < MAX_FAILURES_PER_MINUTE;
}

export async function clearFailedLogins(ip: string): Promise<void> {
  const identifier = hashIdentifier(ip);
  await prismaClient.loginAttempt.deleteMany({ where: { identifier } });
}
