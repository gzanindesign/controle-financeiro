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
  });

  const entries = monthRecord
    ? await prisma.incomeEntry.findMany({
        where: { monthId: monthRecord.id },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--color-text)" }}>
        Renda
      </h1>
      <IncomeClient
        entries={entries.map((e) => ({
          id: e.id,
          description: e.description,
          expectedAmount: e.expectedAmount,
          actualAmount: e.actualAmount,
        }))}
        month={month}
        year={year}
      />
    </div>
  );
}
