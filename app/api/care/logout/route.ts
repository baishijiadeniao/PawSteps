import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COMPANION_COOKIE, logoutSession } from "@/lib/auth";

/** 陪伴者退出登录：删除会话记录并清 cookie */
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COMPANION_COOKIE)?.value;
  if (token) {
    await logoutSession(token);
  }
  const res = NextResponse.json({ success: true });
  res.cookies.delete(COMPANION_COOKIE);
  return res;
}
