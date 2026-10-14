#!/bin/sh
set -eu
# Validate at runtime: the standalone build serializes next.config.ts at build time.
./node_modules/.bin/tsx -e 'import "./src/lib/env.ts"'
if [ -n "${DATABASE_URL:-}" ]; then
  ./node_modules/.bin/prisma migrate deploy
elif [ "${ADVISOR_MODE:-live}" != "demo" ]; then
  echo '{"event":"startup_failed","reason":"database_missing"}' >&2
  exit 1
fi
exec "$@"
