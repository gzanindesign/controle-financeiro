import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateMonth } from "@/lib/month";
import { z } from "zod";

const schema = z.object({
  description: z.string().min(1),
  expectedAmount: z.number().nonnegative(),
  actualAmount: z.number().nonnegative().optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get("mes") ?? new Date().getMonth() + 1);
  const year = Number(searchParams.get("ano") ?? new Date().getFullYear());

  const monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
  });

  if (!monthRecord) return NextResponse.json([]);

  const entries = await prisma.incomeEntry.findMany({
    where: { monthId: monthRecord.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { description, expectedAmount, actualAmount, month, year } = parsed.data;
  const monthRecord = await getOrCreateMonth(year, month);

  const entry = await prisma.incomeEntry.create({
    data: {
      monthId: monthRecord.id,
      description,
      expectedAmount,
      actualAmount: actualAmount ?? 0,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
