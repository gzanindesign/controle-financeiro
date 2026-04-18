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
  const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);

  // getOrCreateMonth garante que o mês existe no banco e copia orçamentos do mês anterior
  const monthRecordBase = await getOrCreateMonth(year, month);
  const monthRecord = await prisma.month.findUnique({
    where: { id: monthRecordBase.id },
    include: { incomeAllocation: true },
  });

  const futureTxTypes = { type: { in: ["FIXED", "INSTALLMENT"] as ("FIXED" | "INSTALLMENT")[] } };

  const [incomeEntries, budgets, paidTxs, allTxs, accountBalances, allCategories] = await Promise.all([
    monthRecord ? prisma.incomeEntry.findMany({ where: { monthId: monthRecord.id } }) : [],
    monthRecord
      ? prisma.subcategoryBudget.findMany({
          where: { monthId: monthRecord.id },
          include: { subcategory: { include: { category: true } } },
        })
      : [],
    // "Pago" = transações marcadas como pagas (fatura quitada), sem restrição de mês futuro
    monthRecord ? prisma.transaction.findMany({ where: { monthId: monthRecord.id, isPaid: true }, select: { amount: true } }) : [],
    // "Atual" = todas as transações lançadas no mês, sem filtro por tipo
    monthRecord ? prisma.transaction.findMany({
      where: { monthId: monthRecord.id },
      select: { amount: true, subcategoryId: true, isPaid: true, subcategory: { select: { kind: true, category: { select: { name: true, icon: true, color: true } } } } },
    }) : [],
    monthRecord ? prisma.accountBalance.findMany({ where: { monthId: monthRecord.id }, select: { balance: true } }) : [],
    // Busca TODAS as categorias e subcategorias para exibir no dashboard
    prisma.category.findMany({
      include: {
        subcategories: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
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

  // "Atual" = soma de TODOS os lançamentos do mês (pagos ou não)
  // "Pago" = soma apenas dos lançamentos com isPaid = true (fatura quitada)
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

  // Gasto real por subcategoria (todos os lançamentos, pagos ou não)
  const actualBySubcategory: Record<string, number> = {};
  for (const tx of allTxs) {
    if (tx.subcategoryId) {
      actualBySubcategory[tx.subcategoryId] = (actualBySubcategory[tx.subcategoryId] ?? 0) + tx.amount;
    }
  }

  // Orçamento por subcategoria
  const budgetBySubcategory: Record<string, number> = {};
  for (const b of budgets) {
    budgetBySubcategory[b.subcategoryId] = b.budgetAmount;
  }

  // Monta categoryCards usando TODAS as categorias e subcategorias
  // Inclui categorias sem orçamento definido, desde que tenham gastos ou subcategorias cadastradas
  const categoryCards = allCategories
    .map((cat) => {
      const subcategories = cat.subcategories.map((sub) => ({
        name: sub.name,
        budget: budgetBySubcategory[sub.id] ?? 0,
        actual: actualBySubcategory[sub.id] ?? 0,
      }));

      const catBudget = subcategories.reduce((s, s2) => s + s2.budget, 0);
      const catActual = subcategories.reduce((s, s2) => s + s2.actual, 0);

      return {
        name: cat.name,
        icon: cat.icon ?? null,
        color: cat.color ?? "#6366f1",
        budget: catBudget,
        actual: catActual,
        subcategories,
      };
    })
    // Exibe todas as categorias cadastradas, sempre
    .filter((c) => c.subcategories.length > 0);

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
