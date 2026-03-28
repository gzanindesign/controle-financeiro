import { prisma } from "@/lib/db";
import { ConfiguracoesClient } from "./ConfiguracoesClient";

export default async function ConfiguracoesPage() {
  const cards = await prisma.card.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--color-text)" }}>
        Configurações
      </h1>
      <ConfiguracoesClient
        cards={cards.map((c) => ({ id: c.id, name: c.name, colorHex: c.colorHex, bank: c.bank ?? "", type: c.type }))}
      />
    </div>
  );
}
