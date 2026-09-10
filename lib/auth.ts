import { cookies, headers } from "next/headers";
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
  // 跳转时优先 x-forwarded-host（隧道/代理场景），避免 Host 被改写后跳转到错误地址
  const redirectToLogin = async (): Promise<Response> => {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "localhost:8080";
    const proto = h.get("x-forwarded-proto") || "http";
    return Response.redirect(new URL("/login", `${proto}://${host}`), 307);
  };
  if (!token) {
    return { redirect: await redirectToLogin() };
  }
  const ok = await verifyOwnerSession(token);
  if (!ok) {
    return { redirect: await redirectToLogin() };
  }
  return { ok: true };
}

export async function getOwnerToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value || null;
}
