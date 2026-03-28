import { prisma } from "./db";

export async function getOrCreateMonth(year: number, month: number) {
  return prisma.month.upsert({
    where: { year_month: { year, month } },
    update: {},
    create: { year, month },
  });
}

export function parseMonthParams(searchParams: { mes?: string; ano?: string }) {
  const now = new Date();
  return {
    month: Number(searchParams.mes ?? now.getMonth() + 1),
    year: Number(searchParams.ano ?? now.getFullYear()),
  };
}
