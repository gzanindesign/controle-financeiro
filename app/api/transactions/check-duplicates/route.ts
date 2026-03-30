import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface CheckItem {
  date: string;       // YYYY-MM-DD
  description: string;
  amount: number;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

export async function POST(req: NextRequest) {
  try {
    const { items }: { items: CheckItem[] } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ duplicates: [] });
    }

    // Determina o intervalo de datas dos itens para restringir a busca
    const dates = items.map((i) => i.date).sort();
    const minDate = new Date(dates[0] + "T00:00:00Z");
    const maxDate = new Date(dates[dates.length - 1] + "T23:59:59Z");
    // Expande 1 mês para cada lado para cobrir lançamentos de bordas de mês
    minDate.setMonth(minDate.getMonth() - 1);
    maxDate.setMonth(maxDate.getMonth() + 1);

    const allTransactions = await prisma.transaction.findMany({
      where: { date: { gte: minDate, lte: maxDate } },
      select: { date: true, description: true, originalDescription: true, amount: true },
    });

    // Indexa pelo nome bruto do CSV (originalDescription) quando disponível,
    // garantindo que a detecção funcione mesmo que o usuário tenha renomeado o estabelecimento
    const savedKeys = new Set<string>();
    for (const t of allTransactions) {
      const date = t.date.toISOString().slice(0, 10);
      const rawDesc = t.originalDescription ?? t.description;
      savedKeys.add(`${date}|${norm(rawDesc)}|${t.amount.toFixed(2)}`);
    }

    const duplicates: string[] = [];
    for (const item of items) {
      const key = `${item.date}|${norm(item.description)}|${item.amount.toFixed(2)}`;
      if (savedKeys.has(key)) {
        duplicates.push(key);
      }
    }

    return NextResponse.json({ duplicates });
  } catch (err) {
    console.error("check-duplicates error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
