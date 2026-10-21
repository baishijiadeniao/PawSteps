import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { wishPatchSchema } from "@/lib/validation";
import { getWishSummary, updateWish } from "@/lib/wishService";

/**
 * 小愿望数据。
 * GET /api/wishes → { wishes, streak, daysToNext, milestone }
 * 每次访问顺带按打卡历史补建应赢得的愿望（幂等）。
 */
export async function GET() {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const summary = await getWishSummary();
  return NextResponse.json(summary);
}

/**
 * 更新小愿望（仅病人可操作）。
 * POST /api/wishes  body: { id, content? , action?: "done" }
 * - content：填写愿望内容，EARNED → WAITING（陪伴者页面可见）
 * - action=done：标记已实现，→ DONE
 */
export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const body = await req.json().catch(() => null);
  const parsed = wishPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  const { id, content, action } = parsed.data;
  const wish = await updateWish(id, { content, done: action === "done" });
  if (!wish) {
    return NextResponse.json({ error: "愿望不存在" }, { status: 404 });
  }
  return NextResponse.json({ wish });
}
