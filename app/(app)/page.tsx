import { Suspense } from "react";
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

  const now = new Date();
  const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);

  const monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
    include: { incomeAllocation: true },
  });

  const futureTxTypes = { type: { in: ["FIXED", "INSTALLMENT"] as ("FIXED" | "INSTALLMENT")[] } };

  const [incomeEntries, budgets, paidTxs, allTxs, accountBalances] = await Promise.all([
    monthRecord ? prisma.incomeEntry.findMany({ where: { monthId: monthRecord.id } }) : [],
    monthRecord
      ? prisma.subcategoryBudget.findMany({
          where: { monthId: monthRecord.id },
          include: { subcategory: { include: { category: true } } },
        })
      : [],
    isFuture ? [] : (monthRecord ? prisma.transaction.findMany({ where: { monthId: monthRecord.id, isPaid: true }, select: { amount: true } }) : []),
    monthRecord ? prisma.transaction.findMany({ where: { monthId: monthRecord.id, ...(isFuture ? futureTxTypes : {}) }, select: { amount: true, subcategoryId: true, subcategory: { select: { kind: true, category: { select: { name: true, icon: true, color: true } } } } } }) : [],
    monthRecord ? prisma.accountBalance.findMany({ where: { monthId: monthRecord.id }, select: { balance: true } }) : [],
  ]);

  // Fetch recurring payments due within 3 days this month (not paid)
  const today2 = new Date();
  const currentMonth = today2.getMonth() + 1;
  const currentYear = today2.getFullYear();
  const todayDay = today2.getDate();
  const threeDaysLater = todayDay + 3;

  const allRecurring = await prisma.recurringPayment.findMany({
    orderBy: { dueDay: "asc" },
    include: {
      statuses: { where: { month: currentMonth, year: currentYear } },
    },
  });

  const upcomingPayments = allRecurring
    .filter((p) => {
      const isPaid = p.statuses[0]?.isPaid ?? false;
      if (isPaid) return false;
      return p.dueDay >= todayDay && p.dueDay <= threeDaysLater;
    })
    .map((p) => ({
      id: p.id,
      description: p.description,
      dueDay: p.dueDay,
      daysUntilDue: p.dueDay - todayDay,
    }));

  const income = {
    budget: incomeEntries.reduce((s, e) => s + e.expectedAmount, 0),
    actual: incomeEntries.reduce((s, e) => s + e.actualAmount, 0),
    paid: incomeEntries.reduce((s, e) => s + e.actualAmount, 0),
  };

  const expenses = {
    budget: budgets.reduce((s, b) => s + b.budgetAmount, 0),
    actual: allTxs.reduce((s, t) => s + t.amount, 0),
    paid: paidTxs.reduce((s, t) => s + t.amount, 0),
  };

  const totalAccountBalance = accountBalances.reduce((s, b) => s + b.balance, 0);

  // Gasto real agrupado por tipo de subcategoria
  const spendingByKind = { ESSENTIAL: 0, FREE: 0, INVESTMENT: 0 };
  for (const tx of allTxs) {
    const kind = (tx.subcategory?.kind ?? "ESSENTIAL") as keyof typeof spendingByKind;
    spendingByKind[kind] += tx.amount;
  }

  // Gasto real por subcategoria
  const actualBySubcategory: Record<string, number> = {};
  for (const tx of allTxs) {
    if (tx.subcategoryId) {
      actualBySubcategory[tx.subcategoryId] = (actualBySubcategory[tx.subcategoryId] ?? 0) + tx.amount;
    }
  }

  // Agrupa por categoria com subcategorias
  const categoryMap = new Map<string, { name: string; icon: string | null; color: string; budget: number; actual: number; subcategories: { name: string; budget: number; actual: number }[] }>();
  for (const b of budgets) {
    const catName = b.subcategory.category.name;
    if (!categoryMap.has(catName)) categoryMap.set(catName, { name: catName, icon: b.subcategory.category.icon ?? null, color: b.subcategory.category.color ?? "#6366f1", budget: 0, actual: 0, subcategories: [] });
    const cat = categoryMap.get(catName)!;
    const subActual = actualBySubcategory[b.subcategoryId] ?? 0;
    cat.budget += b.budgetAmount;
    cat.actual += subActual;
    cat.subcategories.push({ name: b.subcategory.name, budget: b.budgetAmount, actual: subActual });
  }
  const categoryCards = Array.from(categoryMap.values()).filter(c => c.budget > 0);

  const allocation = {
    essential: monthRecord?.incomeAllocation?.essential ?? 0,
    free: monthRecord?.incomeAllocation?.free ?? 0,
    investment: monthRecord?.incomeAllocation?.investment ?? 0,
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Suspense fallback={null}>
        <DashboardClient
          income={income}
          expenses={expenses}
          lastUpdatedAt={monthRecord?.lastUpdatedAt?.toISOString() ?? null}
          closedAt={monthRecord?.closedAt?.toISOString() ?? null}
          hasIncome={incomeEntries.length > 0}
          monthId={monthRecord?.id ?? null}
          month={month}
          year={year}
          totalAccountBalance={totalAccountBalance}
          allocation={allocation}
          spendingByKind={spendingByKind}
          categoryCards={categoryCards}
          upcomingPayments={upcomingPayments}
        />
      </Suspense>
    </div>
  );
}
