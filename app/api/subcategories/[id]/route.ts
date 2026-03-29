import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
  paymentMethod: z.enum(["CREDIT", "DEBIT"]).optional(),
  cardId: z.string().nullable().optional(),
  kind: z.enum(["ESSENTIAL", "FREE", "INVESTMENT"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const sub = await prisma.subcategory.update({ where: { id }, data: parsed.data });
  return NextResponse.json(sub);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.subcategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
