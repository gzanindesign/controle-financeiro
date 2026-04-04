import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(req: NextRequest) {
  try {
    const { month, year } = await req.json();
    if (!month || !year) return NextResponse.json({ error: "Mês e ano obrigatórios" }, { status: 400 });

    const monthRecord = await prisma.month.findUnique({
      where: { year_month: { year, month } },
    });
    if (!monthRecord) return NextResponse.json({ deleted: 0 });

    // deleteMany triggers internal transaction — use raw SQL instead.
    const count = await prisma.$executeRaw`DELETE FROM transactions WHERE "monthId" = ${monthRecord.id}`;

    return NextResponse.json({ deleted: count });
  } catch (err) {
    console.error("delete-all error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
