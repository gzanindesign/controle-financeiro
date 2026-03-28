import { prisma } from "@/lib/db";
import { parseMonthParams } from "@/lib/month";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const params = await searchParams;
  const { month, year } = parseMonthParams(params);

  const monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
  });

  const [incomeEntries, budgets, paidTxs, countedTxs] = await Promise.all([
    monthRecord ? prisma.incomeEntry.findMany({ where: { monthId: monthRecord.id } }) : [],
    monthRecord
      ? prisma.subcategoryBudget.findMany({
          where: { monthId: monthRecord.id },
          include: { subcategory: { include: { category: true } } },
        })
      : [],
    monthRecord ? prisma.transaction.findMany({ where: { monthId: monthRecord.id, isPaid: true } }) : [],
    monthRecord ? prisma.transaction.findMany({ where: { monthId: monthRecord.id, isCounted: true } }) : [],
  ]);

  const income = {
    budget: incomeEntries.reduce((s, e) => s + e.expectedAmount, 0),
    actual: incomeEntries.reduce((s, e) => s + e.actualAmount, 0),
    paid: incomeEntries.reduce((s, e) => s + e.actualAmount, 0),
  };

  const expenses = {
    budget: budgets.reduce((s, b) => s + b.budgetAmount, 0),
    actual: countedTxs.reduce((s, t) => s + t.amount, 0),
    paid: paidTxs.reduce((s, t) => s + t.amount, 0),
  };

  return (
    <div className="max-w-5xl mx-auto">
      <DashboardClient
        income={income}
        expenses={expenses}
        lastUpdatedAt={monthRecord?.lastUpdatedAt?.toISOString() ?? null}
        monthId={monthRecord?.id ?? null}
        month={month}
        year={year}
      />
    </div>
  );
}
