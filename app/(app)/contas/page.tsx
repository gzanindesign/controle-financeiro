import { prisma } from "@/lib/db";
import { parseMonthParams } from "@/lib/month";
import { ContasClient } from "./ContasClient";

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const params = await searchParams;
  const { month, year } = parseMonthParams(params);

  const [monthRecord, accounts] = await Promise.all([
    prisma.month.findUnique({ where: { year_month: { year, month } } }),
    prisma.bankAccount.findMany({ orderBy: { name: "asc" } }),
  ]);

  const [balances, incomeEntries, paidTransactions] = await Promise.all([
    monthRecord
      ? prisma.accountBalance.findMany({ where: { monthId: monthRecord.id } })
      : Promise.resolve([]),
    monthRecord
      ? prisma.incomeEntry.findMany({
          where: { monthId: monthRecord.id },
          select: { actualAmount: true },
        })
      : Promise.resolve([]),
    monthRecord
      ? prisma.transaction.findMany({
          where: { monthId: monthRecord.id, isPaid: true },
          select: { amount: true },
        })
      : Promise.resolve([]),
  ]);

  const totalIncome = incomeEntries.reduce((s, e) => s + e.actualAmount, 0);
  const totalPaid = paidTransactions.reduce((s, t) => s + t.amount, 0);

  const balanceMap = Object.fromEntries(balances.map((b) => [b.accountId, b.balance]));

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--color-text)" }}>
        Contas e Reconciliação
      </h1>
      <ContasClient
        key={`${month}-${year}`}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, balance: balanceMap[a.id] ?? 0 }))}
        totalIncome={totalIncome}
        totalPaid={totalPaid}
        month={month}
        year={year}
      />
    </div>
  );
}
