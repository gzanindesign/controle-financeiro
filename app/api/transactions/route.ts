import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateMonth } from "@/lib/month";
import { z } from "zod";

const schema = z.object({
  cardId: z.string().nullable().optional(),
  subcategoryId: z.string().nullable().optional(),
  date: z.string(),
  description: z.string().min(1),
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
    orderBy: { date: "asc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { month, year, type, installmentTotal, installmentCurrent, date, ...rest } = parsed.data;

  if (type === "INSTALLMENT" && installmentTotal && installmentTotal > 1) {
    const [d, m, y] = [new Date(date).getDate(), month, year];
    const created = [];

    for (let i = 0; i < installmentTotal; i++) {
      const mRef = ((m - 1 + i) % 12) + 1;
      const yRef = y + Math.floor((m - 1 + i) / 12);
      const monthRecord = await getOrCreateMonth(yRef, mRef);
      const t = await prisma.transaction.create({
        data: {
          ...rest,
          monthId: monthRecord.id,
          date: new Date(yRef, mRef - 1, d),
          type,
          installmentCurrent: i + 1,
          installmentTotal,
          isCounted: rest.isCounted ?? false,
          isPaid: rest.isPaid ?? false,
        },
      });
      created.push(t);
    }
    return NextResponse.json(created, { status: 201 });
  }

  const monthRecord = await getOrCreateMonth(year, month);
  const t = await prisma.transaction.create({
    data: {
      ...rest,
      monthId: monthRecord.id,
      date: new Date(date),
      type,
      installmentCurrent: installmentCurrent ?? null,
      installmentTotal: installmentTotal ?? null,
      isCounted: rest.isCounted ?? false,
      isPaid: rest.isPaid ?? false,
    },
  });

  return NextResponse.json(t, { status: 201 });
}
