import "./env.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerLookupRoutes } from "./routes/lookups.js";
import { registerRecurringExpenseRoutes } from "./routes/recurring-expenses.js";
import { registerIncomeSourceRoutes } from "./routes/income-sources.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { prisma } from "./prisma.js";

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get("/api/health", async () => ({ status: "ok" }));

registerLookupRoutes(app, { path: "categories", label: "Category", delegate: prisma.category });
registerLookupRoutes(app, { path: "accounts", label: "Account", delegate: prisma.account });
registerLookupRoutes(app, { path: "payment-methods", label: "Payment method", delegate: prisma.paymentMethod });
registerRecurringExpenseRoutes(app);
registerIncomeSourceRoutes(app);
registerDashboardRoutes(app);

async function shutdown(): Promise<void> {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
