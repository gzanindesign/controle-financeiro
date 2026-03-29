import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateMonth } from "@/lib/month";
import { z } from "zod";

const schema = z.object({
  cardId: z.string().nullable().optional(),
  subcategoryId: z.string().nullable().optional(),
  date: z.string(),
  description: z.string().min(1),
  originalDescription: z.string().optional().nullable(),
  amount: z.number().positive(),
  type: z.enum(["FIXED", "ONE_TIME", "INSTALLMENT"]).default("ONE_TIME"),
  installmentCurrent: z.number().int().optional().nullable(),
  installmentTotal: z.number().int().optional().nullable(),
  isCounted: z.boolean().optional(),
  isPaid: z.boolean().optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get("mes") ?? new Date().getMonth() + 1);
  const year = Number(searchParams.get("ano") ?? new Date().getFullYear());
  const cardId = searchParams.get("cartao");

  const monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
  });
  if (!monthRecord) return NextResponse.json([]);

  const transactions = await prisma.transaction.findMany({
    where: { monthId: monthRecord.id, ...(cardId ? { cardId } : {}) },
    include: { card: true, subcategory: { include: { category: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const {
      month, year, type,
      installmentTotal, installmentCurrent,
      date, originalDescription,
      isCounted: _ic, isPaid: _ip,
      ...rest
    } = parsed.data;

    // Débito (sem cartão) = pago automaticamente; crédito = aguarda pagamento da fatura
    const autoPaid = !rest.cardId;

    const baseData = {
      ...rest,
      originalDescription: originalDescription ?? null,
    };

    // PARCELADO: cria um registro por parcela em cada mês
    if (type === "INSTALLMENT" && installmentTotal && installmentTotal > 1) {
      const [origYear, origMonth, origDay] = date.split("-").map(Number);
      const created = [];

      const startAt = installmentCurrent && installmentCurrent > 1 ? installmentCurrent : 1;
      const remaining = installmentTotal - startAt + 1;

      for (let i = 0; i < remaining; i++) {
        const mRef = ((month - 1 + i) % 12) + 1;
        const yRef = year + Math.floor((month - 1 + i) / 12);
        const monthRecord = await getOrCreateMonth(yRef, mRef);

        const dateMonth = ((origMonth - 1 + i) % 12) + 1;
        const dateYear = origYear + Math.floor((origMonth - 1 + i) / 12);

        const t = await prisma.transaction.create({
          data: {
            ...baseData,
            monthId: monthRecord.id,
            date: new Date(dateYear, dateMonth - 1, origDay),
            type,
            installmentCurrent: startAt + i,
            installmentTotal,
            isCounted: true,
            isPaid: autoPaid,
          },
        });
        created.push(t);
      }
      return NextResponse.json(created, { status: 201 });
    }

    // FIXO: cria um registro para os próximos 24 meses com o mesmo groupId
    if (type === "FIXED") {
      const [, , dayStrF] = date.split("-");
      const d = parseInt(dayStrF, 10);
      const groupId = crypto.randomUUID();
      const created = [];
      const MONTHS_AHEAD = 24;

      for (let i = 0; i < MONTHS_AHEAD; i++) {
        const mRef = ((month - 1 + i) % 12) + 1;
        const yRef = year + Math.floor((month - 1 + i) / 12);
        const monthRecord = await getOrCreateMonth(yRef, mRef);
        const t = await prisma.transaction.create({
          data: {
            ...baseData,
            monthId: monthRecord.id,
            date: new Date(yRef, mRef - 1, d),
            type,
            groupId,
            installmentCurrent: null,
            installmentTotal: null,
            isCounted: true,
            isPaid: i === 0 ? autoPaid : false,
          },
        });
        created.push(t);
      }
      return NextResponse.json(created[0], { status: 201 });
    }

    // ÚNICO
    const monthRecord = await getOrCreateMonth(year, month);
    const [dY, dM, dD] = date.split("-").map(Number);
    const t = await prisma.transaction.create({
      data: {
        ...baseData,
        monthId: monthRecord.id,
        date: new Date(dY, dM - 1, dD),
        type,
        installmentCurrent: installmentCurrent ?? null,
        installmentTotal: installmentTotal ?? null,
        isCounted: true,
        isPaid: autoPaid,
      },
    });

    return NextResponse.json(t, { status: 201 });
  } catch (err) {
    console.error("POST /api/transactions error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
