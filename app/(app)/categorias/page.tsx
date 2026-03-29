import { prisma } from "@/lib/db";
import { parseMonthParams } from "@/lib/month";
import { CategoriasClient } from "./CategoriasClient";

export default async function CategoriasPage({
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
  });

  const txWhere = monthRecord
    ? { monthId: monthRecord.id, ...(isFuture ? { type: { in: ["FIXED", "INSTALLMENT"] as ("FIXED" | "INSTALLMENT")[] } } : {}) }
    : undefined;

  const [categories, cards] = await Promise.all([
    prisma.category.findMany({
      include: {
        subcategories: {
          include: {
            card: true,
            budgets: monthRecord ? { where: { monthId: monthRecord.id } } : false,
            transactions: txWhere ? { where: txWhere } : false,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.card.findMany({ orderBy: { name: "asc" } }),
  ]);

  const mapped = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color ?? "#6366f1",
    subcategories: cat.subcategories.map((sub) => {
      const budget = (sub.budgets ?? [])[0]?.budgetAmount ?? 0;
      const txs = sub.transactions ?? [];
      const actual = txs.reduce((s, t) => s + t.amount, 0);
      const paid = isFuture ? 0 : txs.filter((t) => t.isPaid).reduce((s, t) => s + t.amount, 0);
      return {
        id: sub.id,
        name: sub.name,
        dueDay: sub.dueDay,
        paymentMethod: sub.paymentMethod,
        cardId: sub.cardId,
        card: sub.card ? { id: sub.card.id, name: sub.card.name, colorHex: sub.card.colorHex } : null,
        kind: sub.kind,
        budget,
        actual,
        paid,
      };
    }),
  }));

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--color-text)" }}>
        Categorias e Subcategorias
      </h1>
      <CategoriasClient
        categories={mapped}
        cards={cards.map((c) => ({ id: c.id, name: c.name, colorHex: c.colorHex }))}
        month={month}
        year={year}
      />
    </div>
  );
}
