import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { moodSchema } from "@/lib/validation";
import { prismaClient } from "@/lib/prisma";
import { getToday } from "@/lib/date";

export async function GET(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get("days") || "7"), 30);
  const today = getToday();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);

  const logs = await prismaClient.moodLog.findMany({
    where: {
      date: { gte: startDate.toISOString().slice(0, 10) },
    },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const body = await req.json().catch(() => null);
  const parsed = moodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  const { date, mood, note } = parsed.data;
  const log = await prismaClient.moodLog.upsert({
    where: { date },
    create: { date, mood, note: note || null },
    update: { mood, note: note || null },
  });
  return NextResponse.json(log, { status: 201 });
}
