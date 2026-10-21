import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { markAllEncouragementsRead } from "@/lib/companionService";

/** 病人打开收件箱后：把全部未读标记为已读 */
export async function POST() {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;
  const count = await markAllEncouragementsRead();
  return NextResponse.json({ count });
}
