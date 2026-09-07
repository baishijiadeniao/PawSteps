import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import { findValidSession, createSession, deleteSession } from "./session";
import {
  recordFailedLogin,
  checkLoginRate,
  clearFailedLogins,
} from "./rate-limit";

export const SESSION_COOKIE = "owner_session";

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function verifyOwnerSession(
  token: string
): Promise<boolean> {
  const session = await findValidSession(token);
  return session !== null;
}

export async function attemptLogin(
  code: string,
  req: Request
): Promise<{ success: boolean; error?: string; token?: string }> {
  const ip = getClientIp(req);
  if (!(await checkLoginRate(ip))) {
    return { success: false, error: "尝试次数过多，请稍后再试" };
  }

  const ownerCode = process.env.OWNER_CODE;
  if (!ownerCode) {
    return { success: false, error: "服务未配置访问码" };
  }

  if (!constantTimeCompare(code, ownerCode)) {
    await recordFailedLogin(ip);
    return { success: false, error: "访问码不正确" };
  }

  await clearFailedLogins(ip);
  const token = await createSession();
  return { success: true, token };
}

export async function logoutSession(token: string): Promise<void> {
  await deleteSession(token);
}

export async function requireOwner(): Promise<
  { ok: true } | { redirect: Response }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  if (!token) {
    return { redirect: Response.redirect(new URL("/login", baseUrl), 307) };
  }
  const ok = await verifyOwnerSession(token);
  if (!ok) {
    return { redirect: Response.redirect(new URL("/login", baseUrl), 307) };
  }
  return { ok: true };
}

export async function getOwnerToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value || null;
}
