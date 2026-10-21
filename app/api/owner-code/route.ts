import { NextRequest, NextResponse } from "next/server";
import { getClientIp, requireOwner } from "@/lib/auth";
import {
  checkLoginRate,
  clearFailedLogins,
  recordFailedLogin,
} from "@/lib/rate-limit";
import { ownerCodeChangeSchema, ownerCodeResetSchema } from "@/lib/validation";
import {
  clearCustomOwnerCode,
  hasCustomOwnerCode,
  setCustomOwnerCode,
  verifyOwnerCode,
} from "@/lib/ownerCode";

/**
 * 主人访问码管理（需主人会话）：
 * - GET    返回当前是否已自定义（只给布尔，不泄露码值）
 * - POST   校验当前码后设置自定义新码（库里只存 sha256 哈希）
 * - DELETE 校验当前码后清除自定义码，恢复环境变量 OWNER_CODE
 * 改码接口的失败计数用独立 scope，不干扰登录限流。
 */

const RATE_SCOPE = "owner-code";
const RATE_LIMITED_ERROR = "尝试次数过多，请稍后再试";

export async function GET() {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;
  return NextResponse.json({ custom: await hasCustomOwnerCode() });
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const ip = getClientIp(req);
  if (!(await checkLoginRate(ip, RATE_SCOPE))) {
    return NextResponse.json({ error: RATE_LIMITED_ERROR }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ownerCodeChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  const { currentCode, newCode } = parsed.data;

  if (!(await verifyOwnerCode(currentCode))) {
    await recordFailedLogin(ip, RATE_SCOPE);
    return NextResponse.json(
      { error: "当前访问码不正确" },
      { status: 403 }
    );
  }
  if (await verifyOwnerCode(newCode)) {
    return NextResponse.json(
      { error: "新访问码不能与当前访问码相同" },
      { status: 400 }
    );
  }

  await setCustomOwnerCode(newCode);
  await clearFailedLogins(ip, RATE_SCOPE);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const ip = getClientIp(req);
  if (!(await checkLoginRate(ip, RATE_SCOPE))) {
    return NextResponse.json({ error: RATE_LIMITED_ERROR }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ownerCodeResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  if (!(await verifyOwnerCode(parsed.data.currentCode))) {
    await recordFailedLogin(ip, RATE_SCOPE);
    return NextResponse.json(
      { error: "当前访问码不正确" },
      { status: 403 }
    );
  }

  await clearCustomOwnerCode();
  await clearFailedLogins(ip, RATE_SCOPE);
  return NextResponse.json({ ok: true });
}
