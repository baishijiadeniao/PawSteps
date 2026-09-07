import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { rehabLogSchema } from "@/lib/validation";
import { getTodayTasks, createRehabLog } from "@/lib/rehab";
import { getToday, getPostOpDay, getSurgeryDate } from "@/lib/date";
import { getRehabPhase } from "@/lib/phase";

export async function GET() {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const today = getToday();
  const pod = getPostOpDay(today, getSurgeryDate());
  const phase = getRehabPhase(pod);
  const tasks = await getTodayTasks();
  return NextResponse.json({ date: today, pod, phase, tasks });
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const body = await req.json().catch(() => null);
  const parsed = rehabLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  try {
    const log = await createRehabLog(parsed.data);
    return NextResponse.json(log, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "操作失败，请重试";
    if (msg === "不能记录未来日期的康复任务") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg === "康复动作不存在") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    return NextResponse.json({ error: "操作失败，请重试" }, { status: 500 });
  }
}
