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
  const mapping = await prisma.merchantMapping.upsert({
    where: { merchantCode },
    update: { friendlyName, subcategoryId: subcategoryId || null },
    create: { merchantCode, friendlyName, subcategoryId: subcategoryId || null },
    include: { subcategory: { include: { category: true } } },
  });
  return NextResponse.json(mapping);
}
