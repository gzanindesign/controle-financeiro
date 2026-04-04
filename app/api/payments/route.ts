import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("mes") ?? "0");
  const year = parseInt(searchParams.get("ano") ?? "0");

  const payments = await prisma.recurringPayment.findMany({
    orderBy: { dueDay: "asc" },
    include: {
      statuses: month && year
        ? { where: { month, year } }
        : false,
    },
  });

  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  const schema = z.object({
    description: z.string().min(1),
    dueDay: z.coerce.number().int().min(1).max(31),
  });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const payment = await prisma.recurringPayment.create({ data: parsed.data });
  return NextResponse.json(payment, { status: 201 });
}
