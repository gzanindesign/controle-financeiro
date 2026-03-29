import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateMonth } from "@/lib/month";

const MONTHS_AHEAD = 24;

export async function POST() {
  // Busca todos os FIXO sem groupId
  const fixedTxs = await prisma.transaction.findMany({
    where: { type: "FIXED", groupId: null },
    include: { month: true },
  });

  if (fixedTxs.length === 0) {
    return NextResponse.json({ ok: true, message: "Nenhuma transação fixa para migrar." });
  }

  let created = 0;

  for (const tx of fixedTxs) {
    const groupId = crypto.randomUUID();
    const { month, year } = tx.month;
    const d = new Date(tx.date).getDate();

    // Atualiza o registro original com o groupId
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { groupId },
    });

    // Cria registros para os próximos meses (começando do mês seguinte)
    for (let i = 1; i < MONTHS_AHEAD; i++) {
      const mRef = ((month - 1 + i) % 12) + 1;
      const yRef = year + Math.floor((month - 1 + i) / 12);
      const monthRecord = await getOrCreateMonth(yRef, mRef);

      // Só cria se ainda não existe um FIXO com mesma descrição+subcategoria nesse mês
      const existing = await prisma.transaction.findFirst({
        where: {
          monthId: monthRecord.id,
          type: "FIXED",
          description: tx.description,
          subcategoryId: tx.subcategoryId,
          groupId: null,
        },
      });

      if (!existing) {
        await prisma.transaction.create({
          data: {
            monthId: monthRecord.id,
            cardId: tx.cardId,
            subcategoryId: tx.subcategoryId,
            date: new Date(yRef, mRef - 1, d),
            description: tx.description,
            amount: tx.amount,
            type: "FIXED",
            groupId,
            isCounted: true,
            isPaid: false,
          },
        });
        created++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    message: `Migração concluída. ${fixedTxs.length} transação(ões) fixa(s) migrada(s), ${created} novos registros criados.`,
  });
}
