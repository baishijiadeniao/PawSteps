import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { rehabLogPatchSchema } from "@/lib/validation";
import { updateRehabLog } from "@/lib/rehab";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = rehabLogPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  try {
    const log = await updateRehabLog(id, parsed.data);
    return NextResponse.json(log);
  } catch {
    return NextResponse.json({ error: "操作失败，请重试" }, { status: 500 });
  }
}
