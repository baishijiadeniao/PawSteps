import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
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
];

const PUBLIC_EXACT = new Set(["/", "/login"]);

function isProtected(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return false;
  return PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!isProtected(pathname)) {
    return NextResponse.next();
  }
  // middleware 只检查 cookie 存在性，真正鉴权在 server 层
  const token = req.cookies.get("owner_session")?.value;
  if (!token) {
    // 优先 x-forwarded-host（隧道/代理场景），避免 Host 被改写后跳转到错误地址
    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      req.nextUrl.host;
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const url = new URL(`${proto}://${host}/login`);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
