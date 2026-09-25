import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

try {
  process.loadEnvFile();
} catch {
  // No .env file - rely on already-set process.env.
}

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

// Starter lookup data mirroring the categories/accounts/payment methods used in the original
// spreadsheet. Purely a convenience for a first run - all three are user-editable from Settings.
const categories = [
  "Wohnen",
  "Versicherung",
  "Abo",
  "Familie",
  "Mobilität",
  "Freizeit",
  "Sparen",
];

const accounts = ["Rechnungen", "Investieren"];

const paymentMethods = [
  "Monatskonto",
  "Jahreskonto",
  "KK monatlich",
  "KK jährlich",
  "Ebill monatlich",
  "Ebill jährlich",
  "Lohnkonto",
  "Investieren",
];

async function main() {
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of accounts) {
    await prisma.account.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of paymentMethods) {
    await prisma.paymentMethod.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
