# BudgetLoop

BudgetLoop is a self-hosted, single-user recurring-expense budgeting app. It replaces a
spreadsheet-based budget tracker with a small web app backed by a real database: manage your
recurring expenses, income sources, and lookup lists (categories, accounts, payment methods), and
see a dashboard with monthly/yearly totals, breakdowns, and upcoming due dates.

There is **no authentication** - this is meant to run on your own LAN (e.g. a home server or
TrueNAS box) for a single household, not to be exposed to the internet.

## Tech stack

- **API**: Node.js + TypeScript + [Fastify](https://fastify.dev/) + [Prisma ORM](https://www.prisma.io/) + SQLite (a single file, no separate database container)
- **Client**: React + [Vite](https://vite.dev/) + TypeScript, charts via [recharts](https://recharts.org/)
- **Packaging**: Docker (see [Docker Compose](#docker-compose-local) / [TrueNAS deployment](#truenas-scale-deployment) below)

## Data model

| Model              | Purpose                                                                 |
| ------------------ | ------------------------------------------------------------------------ |
| `Category`          | User-managed list, e.g. Wohnen, Versicherung, Abo, Familie...            |
| `Account`           | The "bucket" an expense is paid from/into, e.g. Rechnungen (bills) vs. Investieren (invest) |
| `PaymentMethod`      | e.g. Monatskonto, Jahreskonto, KK monatlich/jährlich, Ebill, Lohnkonto    |
| `RecurringExpense`   | name, amount, category/account/paymentMethod (FKs), interval (`intervalUnit` + `intervalValue`), optional start date / next-due-date override / comment, active flag |
| `IncomeSource`       | name, amount, interval - supports one or more income streams              |

`Category`, `Account`, and `PaymentMethod` are separate lookup tables (not enums) so you can manage
your own lists from **Settings**, and so a future `TransactionMapping` table (see
[Out of scope](#out-of-scope-for-v1) below) can reference them by foreign key without reshaping
the schema.

**No monthly/yearly equivalents are ever stored** - they're always computed on the fly from
`amount` + `intervalUnit` + `intervalValue` (see `api/src/domain/recurrence.ts`). This supports
fully custom recurrence (every N days/weeks/months/years), an upgrade over the original
spreadsheet's Monthly/Yearly-only model plus free-text-comment workaround for irregular intervals.

### Known simplification: cost averaging

The original spreadsheet averaged a cost over several sampled entries to smooth out variable
bills (e.g. electricity). BudgetLoop v1 does **not** do this - each `RecurringExpense` just has one
current `amount` that you edit by hand whenever it changes. This is deliberately simpler; if you
want historical amount tracking later, the schema doesn't need to change to add it (e.g. an
`ExpenseAmountHistory` table referencing `RecurringExpense`).

### Out of scope for v1

Credit-card invoice import (uploading a CSV/statement and auto-mapping transaction descriptions to
a `RecurringExpense`/`Category` via a user-configurable mapping table) is **not** built in v1. The
normalized schema (separate lookup tables, `RecurringExpense` referencing them by FK) is intended
to support adding a `TransactionMapping` table for this later without reshaping anything.

## Local development

Requires Node.js 22.12+ (see `api/package.json` / `client/package.json` engines).

### API

```bash
cd api
npm install
cp .env.example .env        # defaults are fine for local dev
npx prisma migrate dev      # creates api/dev.db and applies migrations
npm run db:seed             # optional: seeds starter categories/accounts/payment methods
npm run dev                 # starts the API with hot reload on http://localhost:4000
```

Other useful scripts (run from `api/`):

- `npm run build` / `npm start` - compile to `dist/` and run the compiled server
- `npm run typecheck` - `tsc --noEmit`
- `npx prisma studio` - browse/edit the SQLite database in a GUI
- `npx prisma migrate dev --name <description>` - create a new migration after editing `prisma/schema.prisma`

### Client

```bash
cd client
npm install
npm run dev                 # starts Vite on http://localhost:5173
```

The client always calls relative `/api/...` URLs. In dev, Vite proxies `/api` to
`http://localhost:4000` (see `client/vite.config.ts`); in production, nginx does the same (see
`client/nginx.conf.template`). So run the API (above) alongside the client dev server for everything to
work end-to-end.

Other useful scripts (run from `client/`): `npm run build`, `npm run lint` (oxlint).

## Docker Compose (local)

Builds both images locally and runs the full stack:

```bash
docker compose up --build
```

- Client: http://localhost:8080
- API: http://localhost:4000 (mostly for direct debugging; the client talks to it via the nginx
  proxy at `/api`, not this port)

The SQLite database file lives on the `budgetloop-data` named volume, mounted at `/app/data`
inside the `api` container (`DATABASE_URL=file:./data/budgetloop.db`). Migrations are applied
automatically on container start (see `api/docker-entrypoint.sh`) - there's nothing to run
manually.

## TrueNAS SCALE deployment

BudgetLoop follows the same deployment pattern as the author's other TrueNAS app (PlaylistChaser):
a separate `docker-compose.truenas.yml` that pulls pre-built images from GHCR instead of building
locally, because TrueNAS SCALE's "Custom App > Install via YAML" screen expects `image:` entries,
not a `build:` context.

1. **Get the images published.** Push this repo / merge to `main` and
   `.github/workflows/docker-publish.yml` builds+pushes both images to GHCR automatically
   (`ghcr.io/elrabyte/budgetloop-api:latest`, `ghcr.io/elrabyte/budgetloop-client:latest`). You can
   also trigger it manually from the Actions tab (`workflow_dispatch`).
2. **In the TrueNAS SCALE UI**: Apps → Discover Apps → Custom App → Install via YAML, and paste
   the `services:` section of `docker-compose.truenas.yml`. Adjust the host ports if 8080/4000 are
   already taken, and point the `api` volume at a real dataset path on your pool (see the comments
   in that file) so the SQLite database is easy to find and back up.
3. **Fallback**: if your SCALE version's YAML editor rejects something here, SSH into TrueNAS and
   run `docker compose -f docker-compose.truenas.yml up -d` directly. This works (SCALE is Docker
   under the hood) but the app won't show up as a managed "App" in the UI.

**Important**: install both services as *one* app/stack (step 2 above), not as two separate
"Custom App" wizard entries. `client`'s nginx proxies `/api/` requests to the hostname `api`
(the `API_HOST` env var, default `api`), which only resolves because Docker Compose puts both
containers on the same per-stack network. Two independent standalone apps don't share a network,
so `client` can't reach `api` and nginx fails to start (`host not found in upstream "api"`). If
you really do need them as separate standalone apps, set the `client` container's `API_HOST`
(and `API_PORT` if you didn't use 4000) environment variable to wherever `api` is actually
reachable, e.g. your TrueNAS host's IP and the port you published `api` on.

Remember: there's no authentication, so keep this on your LAN (e.g. don't forward the port through
your router).

## Repository structure

```
budgetloop/
  api/                        # Fastify + TS + Prisma + SQLite
  client/                     # React + Vite + TS
  docker-compose.yml
  docker-compose.truenas.yml
  .github/workflows/docker-publish.yml
```
