import { prisma } from "./db";

export async function getOrCreateMonth(year: number, month: number) {
  const existing = await prisma.month.findUnique({
    where: { year_month: { year, month } },
  });
  if (existing) return existing;
  return prisma.month.create({ data: { year, month } });
}

export function parseMonthParams(searchParams: { mes?: string; ano?: string }) {
  const now = new Date();
  return {
    month: Number(searchParams.mes ?? now.getMonth() + 1),
    year: Number(searchParams.ano ?? now.getFullYear()),
  };
}
