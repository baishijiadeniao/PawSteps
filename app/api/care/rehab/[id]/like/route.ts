import { NextRequest, NextResponse } from "next/server";
import { requireCompanion } from "@/lib/auth";
import { toggleRehabLike } from "@/lib/companionService";

/** 陪伴者给某条打卡点赞 / 取消点赞（同一人同一条只算一次） */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCompanion();
  if ("redirect" in auth) return auth.redirect;

  const { id } = await params;
  try {
    const result = await toggleRehabLike(id, auth.companion.id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "操作失败，请重试";
    const status = message === "打卡记录不存在" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
