import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const schema = z.object({ lastUpdatedAt: z.string() });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const month = await prisma.month.update({
    where: { id },
    data: { lastUpdatedAt: new Date(parsed.data.lastUpdatedAt) },
  });
  return NextResponse.json(month);
}
