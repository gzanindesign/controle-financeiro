import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateMonth } from "@/lib/month";
import { z } from "zod";

const schema = z.object({
  subcategoryId: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  budgetAmount: z.number().nonnegative(),
  paidAmount: z.number().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { subcategoryId, month, year, budgetAmount, paidAmount } = parsed.data;
  const monthRecord = await getOrCreateMonth(year, month);

  const budget = await prisma.subcategoryBudget.upsert({
    where: { subcategoryId_monthId: { subcategoryId, monthId: monthRecord.id } },
    update: { budgetAmount, ...(paidAmount !== undefined && { paidAmount }) },
    create: { subcategoryId, monthId: monthRecord.id, budgetAmount, paidAmount: paidAmount ?? 0 },
  });

  return NextResponse.json(budget);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get("mes") ?? new Date().getMonth() + 1);
  const year = Number(searchParams.get("ano") ?? new Date().getFullYear());

  const monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
  });

  if (!monthRecord) return NextResponse.json([]);

  const budgets = await prisma.subcategoryBudget.findMany({
    where: { monthId: monthRecord.id },
    include: {
      subcategory: { include: { category: true, card: true } },
    },
  });

  return NextResponse.json(budgets);
}
