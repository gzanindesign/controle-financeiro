import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const categories = await prisma.category.findMany({
    include: { subcategories: { include: { card: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const schema = z.object({ name: z.string().min(1) });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const category = await prisma.category.create({ data: { name: parsed.data.name } });
  return NextResponse.json(category, { status: 201 });
}
