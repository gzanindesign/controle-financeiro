import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const accounts = await prisma.account.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const schema = z.object({ name: z.string().min(1), type: z.enum(["CHECKING", "CASH"]).default("CHECKING") });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const account = await prisma.account.create({ data: parsed.data });
  return NextResponse.json(account, { status: 201 });
}
