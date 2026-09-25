# syntax=docker/dockerfile:1

# ---- Build stage -------------------------------------------------------------
# Installs all dependencies (including dev deps: typescript, prisma CLI, tsx), generates the
# Prisma client, and compiles TypeScript to dist/.
#
# Uses the Debian-based "slim" tag (not "alpine") because better-sqlite3 (the native driver
# behind Prisma's SQLite adapter, see prisma/schema.prisma) ships prebuilt glibc binaries; alpine
# uses musl libc and would otherwise force a from-source rebuild requiring python3/build tools.
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
# prisma.config.ts resolves DATABASE_URL at config-load time (via env("DATABASE_URL")) and
# throws if it's unresolvable; the real value is only set later in the runtime stage below,
# and build stages don't share ENV state, so a placeholder is needed here too. `prisma generate`
# only reads the schema to produce the client - it never opens a DB connection - so any
# syntactically valid value works.
ENV DATABASE_URL="file:./data/budgetloop.db"
RUN npx prisma generate
RUN npm run build

# ---- Runtime stage -------------------------------------------------------------
# Reuses the full node_modules from the build stage (including the generated Prisma client and
# the Prisma CLI) so `prisma migrate deploy` can run automatically on container start - see
# docker-entrypoint.sh. This keeps the image simple at the cost of also shipping devDependencies;
# acceptable for a small, self-hosted single-user app.
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Default DATABASE_URL points at a relative ./data/budgetloop.db, so a single volume mounted at
# /app/data (see docker-compose.yml) is all that's needed to persist the database across
# container recreations/upgrades.
ENV DATABASE_URL="file:./data/budgetloop.db"
ENV PORT=4000
ENV HOST=0.0.0.0

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && mkdir -p /app/data

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
