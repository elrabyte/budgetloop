#!/bin/sh
set -e

# Applies any pending migrations against the SQLite file on the mounted volume, then starts the
# API. Safe to run on every container start: `prisma migrate deploy` is a no-op if the database
# is already up to date.
npx prisma migrate deploy
exec node dist/index.js
