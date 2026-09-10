import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getCollection } from "@/lib/stickerService";

/**
 * 贴纸收集册数据。
 * GET /api/stickers → { items, newlyUnlocked }
 * 每次访问都会顺带评估一次新解锁（数据量小，开销可忽略）。
 */
export async function GET() {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const { items, newlyUnlocked } = await getCollection();
  return NextResponse.json({ items, newlyUnlocked });
}
