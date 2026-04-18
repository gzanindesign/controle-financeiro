import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { parseMonthParams, getOrCreateMonth } from "@/lib/month";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const params = await searchParams;
  const { month, year } = parseMonthParams(params);

  const now = new Date();
  const todayDay = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const threeDaysLater = todayDay + 3;

  // Tenta buscar o mês com include em uma única query (caso comum: mês já existe)
  let monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
    include: { incomeAllocation: true },
  });

  // Primeiro acesso ao mês: cria + copia orçamentos do anterior, depois rebusca
  if (!monthRecord) {
    await getOrCreateMonth(year, month);
    monthRecord = await prisma.month.findUnique({
      where: { year_month: { year, month } },
      include: { incomeAllocation: true },
    });
  }

  // Todas as queries de dados rodam em paralelo num único round-trip
  const [incomeEntries, budgets, paidTxs, allTxs, accountBalances, allCategories, allRecurring] = await Promise.all([
    monthRecord ? prisma.incomeEntry.findMany({ where: { monthId: monthRecord.id } }) : Promise.resolve([]),
    monthRecord
      ? prisma.subcategoryBudget.findMany({
          where: { monthId: monthRecord.id },
          include: { subcategory: { include: { category: true } } },
        })
      : Promise.resolve([]),
    // "Pago" = lançamentos com isPaid = true (fatura quitada)
    monthRecord
      ? prisma.transaction.findMany({ where: { monthId: monthRecord.id, isPaid: true }, select: { amount: true } })
      : Promise.resolve([]),
    // "Atual" = todos os lançamentos do mês, sem filtro por tipo
    monthRecord
      ? prisma.transaction.findMany({
          where: { monthId: monthRecord.id },
          select: {
            amount: true,
            subcategoryId: true,
            isPaid: true,
            subcategory: { select: { kind: true, category: { select: { name: true, icon: true, color: true } } } },
          },
        })
      : Promise.resolve([]),
    monthRecord
      ? prisma.accountBalance.findMany({ where: { monthId: monthRecord.id }, select: { balance: true } })
      : Promise.resolve([]),
    // Todas as categorias e subcategorias para os cards do dashboard
    prisma.category.findMany({
      include: { subcategories: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    // Pagamentos recorrentes (apenas do mês atual real, não o mês selecionado)
    prisma.recurringPayment.findMany({
      orderBy: { dueDay: "asc" },
      include: { statuses: { where: { month: currentMonth, year: currentYear } } },
    }),
  ]);

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

  const spendingByKind = { ESSENTIAL: 0, FREE: 0, INVESTMENT: 0 };
  const actualBySubcategory: Record<string, number> = {};
  for (const tx of allTxs) {
    const kind = (tx.subcategory?.kind ?? "ESSENTIAL") as keyof typeof spendingByKind;
    spendingByKind[kind] += tx.amount;
    if (tx.subcategoryId) {
      actualBySubcategory[tx.subcategoryId] = (actualBySubcategory[tx.subcategoryId] ?? 0) + tx.amount;
    }
  }

  const budgetBySubcategory: Record<string, number> = {};
  for (const b of budgets) {
    budgetBySubcategory[b.subcategoryId] = b.budgetAmount;
  }

  const categoryCards = allCategories
    .filter((c) => c.subcategories.length > 0)
    .map((cat) => {
      const subcategories = cat.subcategories.map((sub) => ({
        name: sub.name,
        budget: budgetBySubcategory[sub.id] ?? 0,
        actual: actualBySubcategory[sub.id] ?? 0,
      }));
      return {
        name: cat.name,
        icon: cat.icon ?? null,
        color: cat.color ?? "#6366f1",
        budget: subcategories.reduce((s, s2) => s + s2.budget, 0),
        actual: subcategories.reduce((s, s2) => s + s2.actual, 0),
        subcategories,
      };
    });

  const allocation = {
    essential: monthRecord?.incomeAllocation?.essential ?? 0,
    free: monthRecord?.incomeAllocation?.free ?? 0,
    investment: monthRecord?.incomeAllocation?.investment ?? 0,
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Suspense fallback={null}>
        <DashboardClient
          key={`${month}-${year}`}
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
