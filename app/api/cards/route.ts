import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const cards = await prisma.card.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(cards);
}

export async function POST(req: NextRequest) {
  const schema = z.object({
    name: z.string().min(1),
    colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
    bank: z.string().optional(),
    type: z.enum(["MAIN", "DIGITAL", "ADDITIONAL"]).default("MAIN"),
  });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const card = await prisma.card.create({ data: parsed.data });
  return NextResponse.json(card, { status: 201 });
}
