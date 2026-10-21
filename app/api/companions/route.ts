import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { companionCreateSchema } from "@/lib/validation";
import { createCompanion, listCompanions } from "@/lib/companionService";

/** 病人查看陪伴者列表 */
export async function GET() {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;
  const companions = await listCompanions();
  return NextResponse.json({ companions });
}

/** 病人新建陪伴者，返回邀请码 */
export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const body = await req.json().catch(() => null);
  const parsed = companionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  try {
    const companion = await createCompanion(parsed.data.nickname);
    return NextResponse.json(
      {
        id: companion.id,
        nickname: companion.nickname,
        inviteCode: companion.inviteCode,
      },
      { status: 201 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "创建失败，请重试";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
