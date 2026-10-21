import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { countUnreadEncouragements } from "@/lib/companionService";

/** 未读鼓励数（病人侧红点与桌宠送信轮询用） */
export async function GET() {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;
  const count = await countUnreadEncouragements();
  return NextResponse.json({ count });
}
