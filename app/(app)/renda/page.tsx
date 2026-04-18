import { prisma } from "@/lib/db";
import { parseMonthParams } from "@/lib/month";
import { IncomeClient } from "./IncomeClient";

export default async function RendaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const params = await searchParams;
  const { month, year } = parseMonthParams(params);

  const monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
    include: { incomeAllocation: true },
  });

  const [entries, transactions] = await Promise.all([
    monthRecord
      ? prisma.incomeEntry.findMany({
          where: { monthId: monthRecord.id },
          orderBy: { createdAt: "asc" },
        })
      : [],
    monthRecord
      ? prisma.transaction.findMany({
          where: { monthId: monthRecord.id },
          select: { amount: true, subcategory: { select: { kind: true } } },
        })
      : [],
  ]);

  // Gasto real agrupado por tipo de subcategoria
  const spendingByKind = { ESSENTIAL: 0, FREE: 0, INVESTMENT: 0 };
  for (const tx of transactions) {
    const kind = (tx.subcategory?.kind ?? "ESSENTIAL") as keyof typeof spendingByKind;
    spendingByKind[kind] += tx.amount;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--color-text)" }}>
        Renda
      </h1>
      <IncomeClient
        key={`${month}-${year}`}
        entries={entries.map((e) => ({
          id: e.id,
          description: e.description,
          expectedAmount: e.expectedAmount,
          actualAmount: e.actualAmount,
        }))}
        month={month}
        year={year}
        allocation={{
          essential: monthRecord?.incomeAllocation?.essential ?? 0,
          free: monthRecord?.incomeAllocation?.free ?? 0,
          investment: monthRecord?.incomeAllocation?.investment ?? 0,
        }}
        spendingByKind={spendingByKind}
      />
    </div>
  );
}
