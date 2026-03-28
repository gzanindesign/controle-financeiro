import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  isCounted: z.boolean().optional(),
  isPaid: z.boolean().optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  cardId: z.string().nullable().optional(),
  subcategoryId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const t = await prisma.transaction.update({ where: { id }, data: parsed.data });
  return NextResponse.json(t);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
