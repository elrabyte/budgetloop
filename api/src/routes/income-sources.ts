import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { isIntervalUnit, toMonthlyAmount, toYearlyAmount } from "../domain/recurrence.js";

function serialize(income: {
  id: string;
  name: string;
  amount: number;
  intervalUnit: string;
  intervalValue: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const recurrence = {
    amount: income.amount,
    intervalUnit: income.intervalUnit as "Day" | "Week" | "Month" | "Year",
    intervalValue: income.intervalValue,
  };
  return {
    ...income,
    monthlyAmount: toMonthlyAmount(recurrence),
    yearlyAmount: toYearlyAmount(recurrence),
  };
}

interface IncomeSourceBody {
  name?: unknown;
  amount?: unknown;
  intervalUnit?: unknown;
  intervalValue?: unknown;
  active?: unknown;
}

function validate(body: IncomeSourceBody): { error: string } | { data: Prisma.IncomeSourceUncheckedCreateInput } {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "Name is required." };

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) return { error: "Amount must be a non-negative number." };

  if (!isIntervalUnit(body.intervalUnit)) {
    return { error: "intervalUnit must be one of Day, Week, Month, Year." };
  }

  const intervalValue = Number(body.intervalValue ?? 1);
  if (!Number.isInteger(intervalValue) || intervalValue < 1) {
    return { error: "intervalValue must be a positive integer." };
  }

  return {
    data: {
      name,
      amount,
      intervalUnit: body.intervalUnit,
      intervalValue,
      active: body.active === undefined ? true : Boolean(body.active),
    },
  };
}

export function registerIncomeSourceRoutes(app: FastifyInstance): void {
  const base = "/api/income-sources";

  app.get(base, async (request) => {
    const { active } = request.query as { active?: string };
    const where: Prisma.IncomeSourceWhereInput = active === undefined ? {} : { active: active === "true" };
    const sources = await prisma.incomeSource.findMany({ where, orderBy: { name: "asc" } });
    return sources.map(serialize);
  });

  app.post(base, async (request, reply) => {
    const result = validate(request.body as IncomeSourceBody);
    if ("error" in result) return reply.code(400).send({ error: result.error });
    const created = await prisma.incomeSource.create({ data: result.data });
    return reply.code(201).send(serialize(created));
  });

  app.put(`${base}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = validate(request.body as IncomeSourceBody);
    if ("error" in result) return reply.code(400).send({ error: result.error });
    try {
      const updated = await prisma.incomeSource.update({ where: { id }, data: result.data });
      return serialize(updated);
    } catch (error) {
      if (isNotFoundError(error)) return reply.code(404).send({ error: "Income source not found." });
      throw error;
    }
  });

  app.delete(`${base}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await prisma.incomeSource.delete({ where: { id } });
      return reply.code(204).send();
    } catch (error) {
      if (isNotFoundError(error)) return reply.code(404).send({ error: "Income source not found." });
      throw error;
    }
  });
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
