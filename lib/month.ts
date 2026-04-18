import { prisma } from "./db";

export async function getOrCreateMonth(year: number, month: number) {
  const existing = await prisma.month.findUnique({
    where: { year_month: { year, month } },
  });
  if (existing) return existing;

  const newMonth = await prisma.month.create({ data: { year, month } });

  // Copia orçamentos do mês anterior para o novo mês
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthRecord = await prisma.month.findUnique({
    where: { year_month: { year: prevYear, month: prevMonth } },
  });

  if (prevMonthRecord) {
    const prevBudgets = await prisma.subcategoryBudget.findMany({
      where: { monthId: prevMonthRecord.id },
    });
    for (const b of prevBudgets) {
      await prisma.subcategoryBudget.create({
        data: {
          subcategoryId: b.subcategoryId,
          monthId: newMonth.id,
          budgetAmount: b.budgetAmount,
          paidAmount: 0,
        },
      });
    }
  }

  return newMonth;
}

export function parseMonthParams(searchParams: { mes?: string; ano?: string }) {
  const now = new Date();
  return {
    month: Number(searchParams.mes ?? now.getMonth() + 1),
    year: Number(searchParams.ano ?? now.getFullYear()),
  };
}
