import { randomBytes, createHash } from "crypto";
import { prismaClient } from "./prisma";

const SESSION_TTL_DAYS = 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  await prismaClient.session.create({ data: { tokenHash, expiresAt } });
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
