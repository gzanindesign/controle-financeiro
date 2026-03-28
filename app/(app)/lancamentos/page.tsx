import { prisma } from "@/lib/db";
import { parseMonthParams } from "@/lib/month";
import { LancamentosClient } from "./LancamentosClient";

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const params = await searchParams;
  const { month, year } = parseMonthParams(params);

  const monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
  });

  const [transactions, cards, subcategories] = await Promise.all([
    monthRecord
      ? prisma.transaction.findMany({
          where: { monthId: monthRecord.id },
          include: { card: true, subcategory: { include: { category: true } } },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
    prisma.card.findMany({ orderBy: { name: "asc" } }),
    prisma.subcategory.findMany({ include: { category: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--color-text)" }}>
        Lançamentos
      </h1>
      <LancamentosClient
        transactions={transactions.map((t) => ({
          id: t.id, date: t.date.toISOString(), description: t.description,
          amount: t.amount, type: t.type,
          installmentCurrent: t.installmentCurrent, installmentTotal: t.installmentTotal,
          isCounted: t.isCounted, isPaid: t.isPaid,
          card: t.card ? { id: t.card.id, name: t.card.name, colorHex: t.card.colorHex } : null,
          subcategory: t.subcategory ? { id: t.subcategory.id, name: t.subcategory.name, category: { name: t.subcategory.category.name } } : null,
        }))}
        cards={cards.map((c) => ({ id: c.id, name: c.name, colorHex: c.colorHex }))}
        subcategories={subcategories.map((s) => ({ id: s.id, name: s.name, categoryName: s.category.name }))}
        month={month}
        year={year}
      />
    </div>
  );
}
