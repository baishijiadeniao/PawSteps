import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getCheckinStats } from "@/lib/stickerService";

/**
 * 桌宠联动状态。
 * GET /api/pet-status → { streak, checkedInToday, allDoneToday, allDoneTotal, postOpDay, mood }
 * mood: droopy（没打卡发蔫）| normal | hyper（连胜变活泼）
 */
export async function GET() {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const stats = await getCheckinStats();
  return NextResponse.json(stats);
}
