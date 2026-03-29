import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getOrCreateMonth } from "@/lib/month";

const schema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  essential: z.number().min(0).max(100),
  free: z.number().min(0).max(100),
  investment: z.number().min(0).max(100),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("mes") ?? "");
  const year = parseInt(searchParams.get("ano") ?? "");

  if (!month || !year) return NextResponse.json({ essential: 0, free: 0, investment: 0 });

  const monthRecord = await prisma.month.findUnique({
    where: { year_month: { year, month } },
    include: { incomeAllocation: true },
  });

  return NextResponse.json(monthRecord?.incomeAllocation ?? { essential: 0, free: 0, investment: 0 });
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { month, year, essential, free, investment } = parsed.data;
  const monthRecord = await getOrCreateMonth(year, month);

  const allocation = await prisma.incomeAllocation.upsert({
    where: { monthId: monthRecord.id },
    create: { monthId: monthRecord.id, essential, free, investment },
    update: { essential, free, investment },
  });

  return NextResponse.json(allocation);
}
