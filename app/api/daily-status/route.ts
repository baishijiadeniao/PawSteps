import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { dailyStatusSchema } from "@/lib/validation";
import { prismaClient } from "@/lib/prisma";
import { getToday } from "@/lib/date";

export async function GET() {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;
  const today = getToday();
  const status = await prismaClient.dailyStatus.findUnique({
    where: { date: today },
  });
  return NextResponse.json({ date: today, status });
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;
  const body = await req.json().catch(() => null);
  const parsed = dailyStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  const { date, energy, painLevel, swelling, note } = parsed.data;
  const status = await prismaClient.dailyStatus.upsert({
    where: { date },
    create: { date, energy, painLevel, swelling, note: note || null },
    update: { energy, painLevel, swelling, note: note || null },
  });
  return NextResponse.json(status, { status: 201 });
}
