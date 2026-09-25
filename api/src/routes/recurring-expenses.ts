import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import {
  computeNextDueDate,
  isIntervalUnit,
  toMonthlyAmount,
  toYearlyAmount,
  type IntervalUnit,
} from "../domain/recurrence.js";

const includeRelations = {
  category: true,
  account: true,
  paymentMethod: true,
} satisfies Prisma.RecurringExpenseInclude;

type RecurringExpenseWithRelations = Prisma.RecurringExpenseGetPayload<{ include: typeof includeRelations }>;

function serialize(expense: RecurringExpenseWithRelations) {
  const recurrence = {
    amount: expense.amount,
    intervalUnit: expense.intervalUnit as "Day" | "Week" | "Month" | "Year",
    intervalValue: expense.intervalValue,
  };
  return {
    id: expense.id,
    name: expense.name,
    amount: expense.amount,
    intervalUnit: expense.intervalUnit,
    intervalValue: expense.intervalValue,
    startDate: expense.startDate,
    nextDueDate: expense.nextDueDate,
    comment: expense.comment,
    active: expense.active,
    categoryId: expense.categoryId,
    accountId: expense.accountId,
    paymentMethodId: expense.paymentMethodId,
    category: expense.category,
    account: expense.account,
    paymentMethod: expense.paymentMethod,
    monthlyAmount: toMonthlyAmount(recurrence),
    yearlyAmount: toYearlyAmount(recurrence),
    computedNextDueDate: computeNextDueDate({
      startDate: expense.startDate,
      nextDueDate: expense.nextDueDate,
      intervalUnit: expense.intervalUnit as IntervalUnit,
      intervalValue: expense.intervalValue,
    }),
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

interface RecurringExpenseBody {
  name?: unknown;
  amount?: unknown;
  intervalUnit?: unknown;
  intervalValue?: unknown;
  startDate?: unknown;
  nextDueDate?: unknown;
  comment?: unknown;
  active?: unknown;
  categoryId?: unknown;
  accountId?: unknown;
  paymentMethodId?: unknown;
}

function validate(body: RecurringExpenseBody): { error: string } | { data: Prisma.RecurringExpenseUncheckedCreateInput } {
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

  if (typeof body.categoryId !== "string" || !body.categoryId) return { error: "categoryId is required." };
  if (typeof body.accountId !== "string" || !body.accountId) return { error: "accountId is required." };
  if (typeof body.paymentMethodId !== "string" || !body.paymentMethodId) {
    return { error: "paymentMethodId is required." };
  }

  const startDate = parseOptionalDate(body.startDate);
  if (startDate === "invalid") return { error: "startDate must be a valid date or null." };
  const nextDueDate = parseOptionalDate(body.nextDueDate);
  if (nextDueDate === "invalid") return { error: "nextDueDate must be a valid date or null." };

  return {
    data: {
      name,
      amount,
      intervalUnit: body.intervalUnit,
      intervalValue,
      startDate: startDate ?? null,
      nextDueDate: nextDueDate ?? null,
      comment: typeof body.comment === "string" && body.comment.trim() ? body.comment.trim() : null,
      active: body.active === undefined ? true : Boolean(body.active),
      categoryId: body.categoryId,
      accountId: body.accountId,
      paymentMethodId: body.paymentMethodId,
    },
  };
}

function parseOptionalDate(value: unknown): Date | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? "invalid" : date;
}

export function registerRecurringExpenseRoutes(app: FastifyInstance): void {
  const base = "/api/recurring-expenses";

  app.get(base, async (request) => {
    const { active } = request.query as { active?: string };
    const where: Prisma.RecurringExpenseWhereInput =
      active === undefined ? {} : { active: active === "true" };
    const expenses = await prisma.recurringExpense.findMany({
      where,
      include: includeRelations,
      orderBy: { name: "asc" },
    });
    return expenses.map(serialize);
  });

  app.get(`${base}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const expense = await prisma.recurringExpense.findUnique({ where: { id }, include: includeRelations });
    if (!expense) return reply.code(404).send({ error: "Recurring expense not found." });
    return serialize(expense);
  });

  app.post(base, async (request, reply) => {
    const result = validate(request.body as RecurringExpenseBody);
    if ("error" in result) return reply.code(400).send({ error: result.error });
    try {
      const created = await prisma.recurringExpense.create({ data: result.data, include: includeRelations });
      return reply.code(201).send(serialize(created));
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        return reply.code(400).send({ error: "categoryId, accountId or paymentMethodId does not exist." });
      }
      throw error;
    }
  });

  app.put(`${base}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = validate(request.body as RecurringExpenseBody);
    if ("error" in result) return reply.code(400).send({ error: result.error });
    try {
      const updated = await prisma.recurringExpense.update({
        where: { id },
        data: result.data,
        include: includeRelations,
      });
      return serialize(updated);
    } catch (error) {
      if (isNotFoundError(error)) return reply.code(404).send({ error: "Recurring expense not found." });
      if (isForeignKeyConstraintError(error)) {
        return reply.code(400).send({ error: "categoryId, accountId or paymentMethodId does not exist." });
      }
      throw error;
    }
  });

  app.delete(`${base}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await prisma.recurringExpense.delete({ where: { id } });
      return reply.code(204).send();
    } catch (error) {
      if (isNotFoundError(error)) return reply.code(404).send({ error: "Recurring expense not found." });
      throw error;
    }
  });
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

function isForeignKeyConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}
