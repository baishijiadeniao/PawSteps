import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { listEncouragements } from "@/lib/companionService";

/** 病人查看鼓励留言墙 */
export async function GET() {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;
  const items = await listEncouragements();
  return NextResponse.json({ items });
}
