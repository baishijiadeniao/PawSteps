import { NextResponse, type NextRequest } from "next/server";

/** 病人（主人）侧受保护路径前缀 */
const OWNER_PROTECTED = [
  "/rehab",
  "/mood",
  "/timeline",
  "/api/rehab",
  "/api/mood",
  "/api/timeline",
  "/api/calendar",
  "/api/settings",
  "/api/daily-status",
  "/collection",
  "/api/stickers",
  "/api/pet-status",
  "/companions",
  "/api/companions",
  "/api/encouragements",
  "/settings",
  "/api/owner-code",
];

const OWNER_PUBLIC_EXACT = new Set(["/", "/login"]);

/** 陪伴者域：/care 页面与 /api/care 接口；登录/登出本身公开 */
const COMPANION_PUBLIC = new Set([
  "/care/login",
  "/api/care/login",
  "/api/care/logout",
]);

function isCompanionDomain(pathname: string): boolean {
  return (
    pathname === "/care" ||
    pathname.startsWith("/care/") ||
    pathname.startsWith("/api/care/")
  );
}

/** 按前缀匹配（pathname === p 或 p 的子路径） */
function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** 307 跳转到对应登录页（优先 x-forwarded-host，避免 Host 被改写后跳错地址） */
function redirectTo(req: NextRequest, loginPath: string, from: string) {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const url = new URL(`${proto}://${host}${loginPath}`);
  url.searchParams.set("from", from);
  return NextResponse.redirect(url);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // middleware 只检查对应域 cookie 的存在性，真正鉴权在 server 层
  if (isCompanionDomain(pathname)) {
    if (COMPANION_PUBLIC.has(pathname)) return NextResponse.next();
    const token = req.cookies.get("companion_session")?.value;
    if (!token) return redirectTo(req, "/care/login", pathname);
    return NextResponse.next();
  }
  if (
    !OWNER_PUBLIC_EXACT.has(pathname) &&
    matchesPrefix(pathname, OWNER_PROTECTED)
  ) {
    const token = req.cookies.get("owner_session")?.value;
    if (!token) return redirectTo(req, "/login", pathname);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
