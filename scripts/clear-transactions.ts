import { prisma } from "../lib/db";

async function main() {
  const r = await prisma.transaction.deleteMany({});
  console.log("Deletados:", r.count);
  await prisma.$disconnect();
}

main();
