import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: paymentId } = await params;
  const schema = z.object({ month: z.number(), year: z.number() });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { month, year } = parsed.data;

  const existing = await prisma.recurringPaymentStatus.findUnique({
    where: { paymentId_month_year: { paymentId, month, year } },
  });

  if (existing) {
    const updated = await prisma.recurringPaymentStatus.update({
      where: { id: existing.id },
      data: { isPaid: !existing.isPaid },
    });
    return NextResponse.json(updated);
  } else {
    const created = await prisma.recurringPaymentStatus.create({
      data: { paymentId, month, year, isPaid: true },
    });
    return NextResponse.json(created);
  }
}
