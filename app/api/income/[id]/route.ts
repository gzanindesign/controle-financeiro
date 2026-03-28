import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  description: z.string().min(1).optional(),
  expectedAmount: z.number().nonnegative().optional(),
  actualAmount: z.number().nonnegative().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const entry = await prisma.incomeEntry.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(entry);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.incomeEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
