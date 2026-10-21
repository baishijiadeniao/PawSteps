import { randomBytes, createHash } from "crypto";
import { prismaClient } from "./prisma";

const SESSION_TTL_DAYS = 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 会话角色：主人（病人本人）/ 陪伴者 */
export type SessionRole = "owner" | "companion";

/** 创建会话；默认主人角色，陪伴者登录时传 role="companion" 并带上 companionId */
export async function createSession(
  role: SessionRole = "owner",
  companionId?: string
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  await prismaClient.session.create({
    data: { tokenHash, expiresAt, role, companionId: companionId ?? null },
  });
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await prismaClient.session.deleteMany({ where: { tokenHash } });
}

export async function findValidSession(token: string) {
  const tokenHash = hashToken(token);
  const session = await prismaClient.session.findUnique({
    where: { tokenHash },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) return null;
  return session;
}
