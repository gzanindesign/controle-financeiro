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
  applyToFuture: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { subcategoryId, month, year, budgetAmount, paidAmount, applyToFuture } = parsed.data;
  const monthRecord = await getOrCreateMonth(year, month);

  // Substituído upsert por find+create/update para compatibilidade com Neon HTTP adapter
  const existing = await prisma.subcategoryBudget.findUnique({
    where: { subcategoryId_monthId: { subcategoryId, monthId: monthRecord.id } },
  });

  let budget;
  if (existing) {
    budget = await prisma.subcategoryBudget.update({
      where: { id: existing.id },
      data: { budgetAmount, ...(paidAmount !== undefined && { paidAmount }) },
    });
  } else {
    budget = await prisma.subcategoryBudget.create({
      data: { subcategoryId, monthId: monthRecord.id, budgetAmount, paidAmount: paidAmount ?? 0 },
    });
  }

  // Propaga para meses futuros existentes: busca tudo em 2 queries, depois paralela
  if (applyToFuture) {
    // 1 query: todos os meses futuros com seus orçamentos para esta subcategoria
    const futureMonthsWithBudgets = await prisma.month.findMany({
      where: {
        OR: [
          { year: { gt: year } },
          { year, month: { gt: month } },
        ],
      },
      include: {
        subcategoryBudgets: { where: { subcategoryId } },
      },
    });

    // Atualiza/cria todos em paralelo
    await Promise.all(
      futureMonthsWithBudgets.map((fm) => {
        const existing = fm.subcategoryBudgets[0];
        if (existing) {
          return prisma.subcategoryBudget.update({
            where: { id: existing.id },
            data: { budgetAmount },
          });
        }
        return prisma.subcategoryBudget.create({
          data: { subcategoryId, monthId: fm.id, budgetAmount, paidAmount: 0 },
        });
      })
    );
  }

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
