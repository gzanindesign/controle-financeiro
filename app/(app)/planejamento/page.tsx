import { prisma } from "@/lib/db";
import { PlanejamentoClient } from "./PlanejamentoClient";

export default async function PlanejamentoPage() {
  let configs = await prisma.planningConfig.findMany({ orderBy: { sortOrder: "asc" } });

  if (configs.length === 0) {
    const defaults = [
      { label: "Gastos Essenciais", percentage: 55, sortOrder: 0 },
      { label: "Educação", percentage: 5, sortOrder: 1 },
      { label: "Livre", percentage: 10, sortOrder: 2 },
      { label: "Aposentadoria", percentage: 15, sortOrder: 3 },
      { label: "Viagens / Canadá", percentage: 7.5, sortOrder: 4 },
      { label: "Reserva de Emergência", percentage: 7.5, sortOrder: 5 },
    ];
    await prisma.planningConfig.createMany({ data: defaults });
    configs = await prisma.planningConfig.findMany({ orderBy: { sortOrder: "asc" } });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--color-text)" }}>
        Planejamento Percentual
      </h1>
      <PlanejamentoClient
        configs={configs.map((c) => ({ id: c.id, label: c.label, percentage: c.percentage }))}
      />
    </div>
  );
}
