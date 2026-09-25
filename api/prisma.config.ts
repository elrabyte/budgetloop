import { defineConfig, env } from "prisma/config";

// Prisma ORM v7 moved the database connection URL (used by the CLI for `migrate`/`studio`/`db
// seed`) out of schema.prisma and into this config file. The application's runtime PrismaClient
// still gets its URL independently via the @prisma/adapter-better-sqlite3 driver adapter (see
// src/prisma.ts) - this file only affects `prisma` CLI commands.
try {
  process.loadEnvFile();
} catch {
  // No .env file - rely on already-set process.env (e.g. in CI/Docker).
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
