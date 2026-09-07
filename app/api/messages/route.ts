import { NextRequest, NextResponse } from "next/server";
import { messageSchema } from "@/lib/validation";
import { prismaClient } from "@/lib/prisma";
import { createHash } from "crypto";

function getIdentifier(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const secret = process.env.RATE_LIMIT_SECRET || "fallback";
  return createHash("sha256").update(`${ip}:${secret}`).digest("hex");
}

async function checkMessageRate(identifier: string): Promise<boolean> {
  const oneMinAgo = new Date(Date.now() - 60 * 1000);
  // 用 LoginAttempt 表临时记录留言频率
  const count = await prismaClient.loginAttempt.count({
    where: { identifier, failedAt: { gte: oneMinAgo } },
  });
  return count < 3;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "50"),
    50
  );
  const cursor = url.searchParams.get("cursor");

  const messages = await prismaClient.message.findMany({
    where: { visible: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });
  const nextCursor =
    messages.length === limit ? messages[messages.length - 1]?.id : null;
  return NextResponse.json({ messages, nextCursor });
}

export async function POST(req: NextRequest) {
  const identifier = getIdentifier(req);
  if (!(await checkMessageRate(identifier))) {
    return NextResponse.json(
      { error: "提交太频繁，请稍后再试" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // 记录此次提交用于限流
  await prismaClient.loginAttempt.create({ data: { identifier } });

  const msg = await prismaClient.message.create({
    data: parsed.data,
  });
  return NextResponse.json(msg, { status: 201 });
}
