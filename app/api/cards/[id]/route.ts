import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  bank: z.string().optional(),
  type: z.enum(["MAIN", "DIGITAL", "ADDITIONAL"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const card = await prisma.card.update({ where: { id }, data: parsed.data });
  return NextResponse.json(card);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.transaction.updateMany({ where: { cardId: id }, data: { cardId: null } });
  await prisma.subcategory.updateMany({ where: { cardId: id }, data: { cardId: null } });
  await prisma.card.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
