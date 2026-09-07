import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { prismaClient } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if ("redirect" in auth) return auth.redirect;

  const { id } = await params;
  await prismaClient.message.update({
    where: { id },
    data: { visible: false },
  });
  return NextResponse.json({ success: true });
}
