import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  cardId: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  paid: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { cardId, month, year, paid } = parsed.data;

  const monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
  });
  if (!monthRecord) return NextResponse.json({ error: "Mês não encontrado" }, { status: 404 });

  await prisma.transaction.updateMany({
    where: { cardId, monthId: monthRecord.id },
    data: { isPaid: paid },
  });

  return NextResponse.json({ ok: true });
}
