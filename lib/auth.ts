import { cookies, headers } from "next/headers";
import { timingSafeEqual } from "crypto";
import {
  findValidSession,
  createSession,
  deleteSession,
} from "./session";
import {
  recordFailedLogin,
  checkLoginRate,
  clearFailedLogins,
} from "./rate-limit";
import { findByInviteCode } from "./companionService";
import { isOwnerCodeConfigured, verifyOwnerCode } from "./ownerCode";
import { prismaClient } from "./prisma";

export const SESSION_COOKIE = "owner_session";
/** 陪伴者独立 cookie：与主人互不顶替，也便于 middleware 按域检查 */
export const COMPANION_COOKIE = "companion_session";

/** 陪伴者登录失败的统一口径（不透露邀请码是否存在，防枚举） */
export const COMPANION_LOGIN_ERROR = "邀请码不正确或已失效";

/** 限流触发时的统一口径（主人/陪伴者共用判定字符串） */
export const RATE_LIMITED_ERROR = "尝试次数过多，请稍后再试";

/** 陪伴者身份（登录后携带的基础信息） */
export interface CompanionUser {
  id: string;
  nickname: string;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * 请求是否走 HTTPS：优先取反代/隧道给的 x-forwarded-proto，回退到请求自身的协议。
 * 用于决定会话 cookie 的 Secure 标志——纯 HTTP 部署下若强行 Secure，浏览器会拒收
 * cookie，表现为「登录返回成功但仍被弹回登录页」。
 */
export function isHttps(req: Request): boolean {
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
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
  // 陪伴者会话不能访问主人（病人）侧的能力
  return session !== null && session.role === "owner";
}

export async function attemptLogin(
  code: string,
  req: Request
): Promise<{ success: boolean; error?: string; token?: string }> {
  const ip = getClientIp(req);
  if (!(await checkLoginRate(ip))) {
    return { success: false, error: RATE_LIMITED_ERROR };
  }

  if (!(await isOwnerCodeConfigured())) {
    return { success: false, error: "服务未配置访问码" };
  }

  // 用户改过访问码则以库里的自定义码为准（环境变量码被覆盖），否则沿用 OWNER_CODE
  if (!(await verifyOwnerCode(code))) {
    await recordFailedLogin(ip);
    return { success: false, error: "访问码不正确" };
  }

  await clearFailedLogins(ip);
  const token = await createSession();
  return { success: true, token };
}

/**
 * 陪伴者用邀请码登录：限流（companion 维度独立计数）→ 查邀请码 → 建会话。
 * 成功返回会话 token 与陪伴者基础信息。
 */
export async function attemptCompanionLogin(
  code: string,
  req: Request
): Promise<{
  success: boolean;
  error?: string;
  token?: string;
  companion?: CompanionUser;
}> {
  const ip = getClientIp(req);
  if (!(await checkLoginRate(ip, "companion"))) {
    return { success: false, error: RATE_LIMITED_ERROR };
  }

  const companion = await findByInviteCode(code);
  if (!companion) {
    await recordFailedLogin(ip, "companion");
    return { success: false, error: COMPANION_LOGIN_ERROR };
  }

  await clearFailedLogins(ip, "companion");
  const token = await createSession("companion", companion.id);
  return {
    success: true,
    token,
    companion: { id: companion.id, nickname: companion.nickname },
  };
}

/** 校验陪伴者会话，返回其对应的陪伴者；无效返回 null */
export async function verifyCompanionSession(
  token: string
): Promise<CompanionUser | null> {
  const session = await findValidSession(token);
  if (!session || session.role !== "companion" || !session.companionId) {
    return null;
  }
  const companion = await prismaClient.companion.findUnique({
    where: { id: session.companionId },
  });
  if (!companion) return null;
  return { id: companion.id, nickname: companion.nickname };
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

/** 从当前请求 cookie 解析陪伴者身份；无有效陪伴会话返回 null */
export async function getCompanionUser(): Promise<CompanionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COMPANION_COOKIE)?.value;
  if (!token) return null;
  return verifyCompanionSession(token);
}

/**
 * 陪伴者页面/接口的守卫：无有效会话时 307 跳转到 /care/login。
 * 与 requireOwner 分域，陪伴者拿不到病人侧会话，反之亦然。
 */
export async function requireCompanion(): Promise<
  { ok: true; companion: CompanionUser } | { redirect: Response }
> {
  const companion = await getCompanionUser();
  if (!companion) {
    const h = await headers();
    const host =
      h.get("x-forwarded-host") || h.get("host") || "localhost:8080";
    const proto = h.get("x-forwarded-proto") || "http";
    return {
      redirect: Response.redirect(
        new URL("/care/login", `${proto}://${host}`),
        307
      ),
    };
  }
  return { ok: true, companion };
}
