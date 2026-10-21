import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { removeCompanion } from "@/lib/companionService";

/** 病人移除一位陪伴者（连带清掉其会话与留言） */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const { id } = await params;
  const removed = await removeCompanion(id);
  if (!removed) {
    return NextResponse.json({ error: "陪伴者不存在" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
