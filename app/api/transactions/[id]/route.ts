import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  isCounted: z.boolean().optional(),
  isPaid: z.boolean().optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  cardId: z.string().nullable().optional(),
  subcategoryId: z.string().nullable().optional(),
  scope: z.enum(["single", "future"]).optional(), // para lançamentos FIXO
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { scope, ...data } = parsed.data;

  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: { month: true },
  });

  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Atualiza este mês + todos os seguintes do mesmo grupo
  // updateMany triggers internal transaction — not supported by Neon HTTP adapter.
  // Find matching IDs then update each individually.
  if (scope === "future" && tx.groupId) {
    const futureMths = await prisma.month.findMany({
      where: {
        OR: [
          { year: { gt: tx.month.year } },
          { year: tx.month.year, month: { gte: tx.month.month } },
        ],
      },
    });
    const monthIds = futureMths.map((m) => m.id);
    const txsToUpdate = await prisma.transaction.findMany({
      where: { groupId: tx.groupId, monthId: { in: monthIds } },
      select: { id: true },
    });
    for (const { id: txId } of txsToUpdate) {
      await prisma.transaction.update({ where: { id: txId }, data });
    }
    return NextResponse.json({ ok: true });
  }

  const updated = await prisma.transaction.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = new URL(req.url).searchParams.get("scope") ?? "single";

  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: { month: true },
  });

  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Exclui este mês + todos os seguintes do mesmo grupo
  // deleteMany triggers internal transaction — use raw SQL instead.
  if (scope === "future" && tx.groupId) {
    const futureMths = await prisma.month.findMany({
      where: {
        OR: [
          { year: { gt: tx.month.year } },
          { year: tx.month.year, month: { gte: tx.month.month } },
        ],
      },
    });
    const monthIds = futureMths.map((m) => m.id);
    if (monthIds.length > 0) {
      for (const monthId of monthIds) {
        await prisma.$executeRaw`DELETE FROM transactions WHERE "groupId" = ${tx.groupId} AND "monthId" = ${monthId}`;
      }
    }
    return NextResponse.json({ ok: true });
  }

  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
