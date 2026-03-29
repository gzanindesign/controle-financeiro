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

  const [transactions, cards, categories, merchantMappings] = await Promise.all([
    monthRecord
      ? prisma.transaction.findMany({
          where: { monthId: monthRecord.id },
          include: { card: true, subcategory: { include: { category: true } } },
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
    prisma.card.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      include: { subcategories: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.merchantMapping.findMany({
      include: { subcategory: { include: { category: true } } },
      orderBy: { merchantCode: "asc" },
    }),
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
          groupId: t.groupId ?? null,
          isCounted: t.isCounted, isPaid: t.isPaid,
          card: t.card ? { id: t.card.id, name: t.card.name, colorHex: t.card.colorHex } : null,
          subcategory: t.subcategory ? { id: t.subcategory.id, name: t.subcategory.name, category: { name: t.subcategory.category.name } } : null,
        }))}
        cards={cards.map((c) => ({ id: c.id, name: c.name, colorHex: c.colorHex }))}
        categories={categories.map((c) => ({
          id: c.id, name: c.name, icon: c.icon, color: c.color ?? "#6366f1",
          subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name })),
        }))}
        month={month}
        year={year}
        merchantMappings={merchantMappings.map((m) => ({
          id: m.id,
          merchantCode: m.merchantCode,
          friendlyName: m.friendlyName,
          subcategoryId: m.subcategoryId,
          subcategory: m.subcategory ? {
            id: m.subcategory.id,
            name: m.subcategory.name,
            category: { name: m.subcategory.category.name },
          } : null,
        }))}
      />
    </div>
  );
}
