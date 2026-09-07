import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  "/rehab",
  "/mood",
  "/timeline",
  "/api/rehab",
  "/api/mood",
  "/api/timeline",
  "/api/settings",
  "/api/daily-status",
];

const PUBLIC_EXACT = new Set(["/", "/wall", "/login"]);

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
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
