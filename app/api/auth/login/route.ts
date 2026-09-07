import { NextRequest, NextResponse } from "next/server";
import { attemptLogin, SESSION_COOKIE } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const result = await attemptLogin(parsed.data.code, req);
  if (!result.success) {
    const status = result.error === "尝试次数过多，请稍后再试" ? 429 : 401;
    return NextResponse.json({ error: result.error }, { status });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, result.token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 天
  });
  return res;
}
