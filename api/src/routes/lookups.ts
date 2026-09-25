import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";

/**
 * Minimal shape shared by Category/Account/PaymentMethod Prisma delegates - all three are simple
 * `{ id, name }` lookup tables with the same CRUD shape, so we register their REST routes with one
 * generic helper instead of duplicating the same code three times.
 */
interface LookupDelegate {
  findMany(args?: { orderBy?: { name: "asc" } }): Promise<Array<{ id: string; name: string }>>;
  create(args: { data: { name: string } }): Promise<{ id: string; name: string }>;
  update(args: { where: { id: string }; data: { name: string } }): Promise<{ id: string; name: string }>;
  delete(args: { where: { id: string } }): Promise<{ id: string; name: string }>;
}

interface LookupOptions {
  /** URL path segment, e.g. "categories". */
  path: string;
  /** Human-readable singular label used in error messages, e.g. "Category". */
  label: string;
  delegate: LookupDelegate;
}

export function registerLookupRoutes(app: FastifyInstance, options: LookupOptions): void {
  const { path, label, delegate } = options;
  const base = `/api/${path}`;

  app.get(base, async () => {
    return delegate.findMany({ orderBy: { name: "asc" } });
  });

  app.post(base, async (request, reply) => {
    const body = request.body as { name?: unknown };
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return reply.code(400).send({ error: `${label} name is required.` });
    }
    try {
      const created = await delegate.create({ data: { name } });
      return reply.code(201).send(created);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return reply.code(409).send({ error: `A ${label.toLowerCase()} named "${name}" already exists.` });
      }
      throw error;
    }
  });

  app.put(`${base}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: unknown };
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return reply.code(400).send({ error: `${label} name is required.` });
    }
    try {
      const updated = await delegate.update({ where: { id }, data: { name } });
      return updated;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return reply.code(409).send({ error: `A ${label.toLowerCase()} named "${name}" already exists.` });
      }
      if (isNotFoundError(error)) {
        return reply.code(404).send({ error: `${label} not found.` });
      }
      throw error;
    }
  });

  app.delete(`${base}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await delegate.delete({ where: { id } });
      return reply.code(204).send();
    } catch (error) {
      if (isNotFoundError(error)) {
        return reply.code(404).send({ error: `${label} not found.` });
      }
      if (isForeignKeyConstraintError(error)) {
        return reply
          .code(409)
          .send({ error: `This ${label.toLowerCase()} is still used by one or more recurring expenses.` });
      }
      throw error;
    }
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

function isForeignKeyConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}
