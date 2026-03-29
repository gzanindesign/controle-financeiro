import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateMonth } from "@/lib/month";
import { z } from "zod";

const schema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { month, year } = parsed.data;

  // Fecha o mês atual
  const monthRecord = await getOrCreateMonth(year, month);
  await prisma.month.update({
    where: { id: monthRecord.id },
    data: { closedAt: new Date() },
  });

  // Calcula o próximo mês
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  // Verifica se o próximo mês já tem renda cadastrada
  const nextMonthRecord = await prisma.month.findUnique({
    where: { year_month: { year: nextYear, month: nextMonth } },
  });
  const hasIncome = nextMonthRecord
    ? (await prisma.incomeEntry.count({ where: { monthId: nextMonthRecord.id } })) > 0
    : false;

  return NextResponse.json({ nextMonth, nextYear, hasIncome });
}
