# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
# Runtime TLS trust and OpenSSL are required by the Prisma migration engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Generate the client after the schema is available; never copy developer secrets.
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 ADVISOR_MODE=demo
# Install the pinned platform-specific migration engine at build time, not at startup.
RUN node -e "const path = require('node:path'); const pkg = require.resolve('@prisma/engines/package.json', { paths: [path.dirname(require.resolve('prisma/package.json'))] }); require(path.join(path.dirname(pkg), 'scripts/postinstall.js'))"
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm exec prisma generate
RUN mkdir -p public && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 ADVISOR_MODE=live
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
# Prisma CLI and tsx are needed for migrations and the retention job.
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=app:app /app/src/lib/env.ts ./src/lib/env.ts
COPY --from=builder --chown=app:app /app/src/lib/log.ts ./src/lib/log.ts
COPY --from=builder --chown=app:app /app/src/lib/security/retention.ts ./src/lib/security/retention.ts
COPY --from=builder --chown=app:app /app/scripts/retention.ts ./scripts/retention.ts
COPY --from=builder --chown=app:app /app/deploy/entrypoint.sh ./deploy/entrypoint.sh
USER app
EXPOSE 3000
ENTRYPOINT ["/bin/sh", "/app/deploy/entrypoint.sh"]
CMD ["node", "server.js"]
