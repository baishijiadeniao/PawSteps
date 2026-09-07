import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { timelineEventSchema } from "@/lib/validation";
import { prismaClient } from "@/lib/prisma";

export async function GET() {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const events = await prismaClient.timelineEvent.findMany({
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const body = await req.json().catch(() => null);
  const parsed = timelineEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  const event = await prismaClient.timelineEvent.create({
    data: parsed.data,
  });
  return NextResponse.json(event, { status: 201 });
}
