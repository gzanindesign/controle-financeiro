import { prisma } from "@/lib/db";
import { parseMonthParams } from "@/lib/month";
import { PagamentosClient } from "./PagamentosClient";

export const dynamic = "force-dynamic";

export default async function PagamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>;
}) {
  const params = await searchParams;
  const { month, year } = parseMonthParams(params);

  const payments = await prisma.recurringPayment.findMany({
    orderBy: { dueDay: "asc" },
    include: {
      statuses: { where: { month, year } },
    },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--color-text)" }}>
        Controle de Pagamentos
      </h1>
      <PagamentosClient
        key={`${month}-${year}`}
        payments={payments.map((p) => ({
          id: p.id,
          description: p.description,
          dueDay: p.dueDay,
          isPaid: p.statuses[0]?.isPaid ?? false,
        }))}
        month={month}
        year={year}
      />
    </div>
  );
}
