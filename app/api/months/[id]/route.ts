import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const schema = z.object({ lastUpdatedAt: z.string().optional(), closedAt: z.string().nullable().optional() });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.lastUpdatedAt !== undefined) data.lastUpdatedAt = new Date(parsed.data.lastUpdatedAt);
  if (parsed.data.closedAt !== undefined) data.closedAt = parsed.data.closedAt ? new Date(parsed.data.closedAt) : null;

  const month = await prisma.month.update({ where: { id }, data });
  return NextResponse.json(month);
}
