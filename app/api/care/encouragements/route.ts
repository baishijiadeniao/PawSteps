import { NextRequest, NextResponse } from "next/server";
import { requireCompanion } from "@/lib/auth";
import { encouragementSchema } from "@/lib/validation";
import { createEncouragement } from "@/lib/companionService";

/** 陪伴者给病人写一条鼓励留言 */
export async function POST(req: NextRequest) {
  const auth = await requireCompanion();
  if ("redirect" in auth) return auth.redirect;

  const body = await req.json().catch(() => null);
  const parsed = encouragementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const msg = await createEncouragement({
      companionId: auth.companion.id,
      content: parsed.data.content,
      emoji: parsed.data.emoji,
    });
    return NextResponse.json({ id: msg.id }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "发送失败，请重试";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
