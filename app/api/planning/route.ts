import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const configs = await prisma.planningConfig.findMany({ orderBy: { sortOrder: "asc" } });
  if (configs.length === 0) {
    // seed defaults
    const defaults = [
      { label: "Gastos Essenciais", percentage: 55, sortOrder: 0 },
      { label: "Educação", percentage: 5, sortOrder: 1 },
      { label: "Livre", percentage: 10, sortOrder: 2 },
      { label: "Aposentadoria", percentage: 15, sortOrder: 3 },
      { label: "Viagens / Canadá", percentage: 7.5, sortOrder: 4 },
      { label: "Reserva de Emergência", percentage: 7.5, sortOrder: 5 },
    ];
    await prisma.planningConfig.createMany({ data: defaults });
    return NextResponse.json(await prisma.planningConfig.findMany({ orderBy: { sortOrder: "asc" } }));
  }
  return NextResponse.json(configs);
}

export async function PUT(req: NextRequest) {
  const schema = z.array(z.object({ id: z.string(), label: z.string(), percentage: z.number() }));
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await Promise.all(
    parsed.data.map((item, i) =>
      prisma.planningConfig.update({ where: { id: item.id }, data: { label: item.label, percentage: item.percentage, sortOrder: i } })
    )
  );
  return NextResponse.json(updated);
}
