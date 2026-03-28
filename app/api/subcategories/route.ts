import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  categoryId: z.string(),
  name: z.string().min(1),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
  paymentMethod: z.enum(["CREDIT", "DEBIT"]).default("CREDIT"),
  cardId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const sub = await prisma.subcategory.create({ data: parsed.data });
  return NextResponse.json(sub, { status: 201 });
}
