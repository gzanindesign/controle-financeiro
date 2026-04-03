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
  // Neon HTTP adapter does not support transactions (updateMany triggers one internally).
  // Execute three separate raw SQL statements instead.
  await prisma.$executeRaw`UPDATE transactions SET "cardId" = NULL WHERE "cardId" = ${id}`;
  await prisma.$executeRaw`UPDATE subcategories SET "cardId" = NULL WHERE "cardId" = ${id}`;
  await prisma.$executeRaw`DELETE FROM cards WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
