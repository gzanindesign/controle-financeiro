import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const mappings = await prisma.merchantMapping.findMany({
    include: { subcategory: { include: { category: true } } },
    orderBy: { merchantCode: "asc" },
  });
  return NextResponse.json(mappings);
}

export async function POST(req: NextRequest) {
  const { merchantCode, friendlyName, subcategoryId } = await req.json();

  // Neon HTTP adapter não suporta transações internas do upsert
  // Usar findUnique + create/update manualmente
  const existing = await prisma.merchantMapping.findUnique({ where: { merchantCode } });

  let mapping;
  if (existing) {
    mapping = await prisma.merchantMapping.update({
      where: { merchantCode },
      data: { friendlyName: friendlyName ?? existing.friendlyName, subcategoryId: subcategoryId || null },
      include: { subcategory: { include: { category: true } } },
    });
  } else {
    mapping = await prisma.merchantMapping.create({
      data: { merchantCode, friendlyName: friendlyName ?? null, subcategoryId: subcategoryId || null },
      include: { subcategory: { include: { category: true } } },
    });
  }

  return NextResponse.json(mapping);
}
