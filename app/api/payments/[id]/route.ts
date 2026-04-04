import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  description: z.string().min(1).optional(),
  dueDay: z.coerce.number().int().min(1).max(31).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const payment = await prisma.recurringPayment.update({ where: { id }, data: parsed.data });
  return NextResponse.json(payment);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // statuses cascade via onDelete: Cascade
  await prisma.$executeRaw`DELETE FROM recurring_payments WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
