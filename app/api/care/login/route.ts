import { NextRequest, NextResponse } from "next/server";
import {
  attemptCompanionLogin,
  COMPANION_COOKIE,
  isHttps,
  RATE_LIMITED_ERROR,
} from "@/lib/auth";
import { careLoginSchema } from "@/lib/validation";

/** 陪伴者登录：只填 8 位邀请码（称呼由病人生成邀请码时指定） */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = careLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const result = await attemptCompanionLogin(parsed.data.code, req);
  if (!result.success) {
    const status = result.error === RATE_LIMITED_ERROR ? 429 : 401;
    return NextResponse.json({ error: result.error }, { status });
  }

  const res = NextResponse.json({
    success: true,
    nickname: result.companion?.nickname,
  });
  res.cookies.set(COMPANION_COOKIE, result.token!, {
    httpOnly: true,
    secure: isHttps(req),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 天
  });
  return res;
}
