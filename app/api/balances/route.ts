import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateMonth } from "@/lib/month";
import { z } from "zod";

const schema = z.object({
  accountId: z.string(),
  balance: z.number(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { accountId, balance, month, year } = parsed.data;
  const monthRecord = await getOrCreateMonth(year, month);

  const result = await prisma.accountBalance.upsert({
    where: { accountId_monthId: { accountId, monthId: monthRecord.id } },
    update: { balance },
    create: { accountId, monthId: monthRecord.id, balance },
  });

  return NextResponse.json(result);
}
