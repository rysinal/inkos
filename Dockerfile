FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS dependencies
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json .npmrc ./
COPY packages/core/package.json ./packages/core/package.json
COPY packages/studio/package.json ./packages/studio/package.json
COPY packages/cli/package.json ./packages/cli/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
WORKDIR /app

COPY packages/core ./packages/core
COPY packages/studio ./packages/studio
COPY packages/cli ./packages/cli
RUN pnpm --filter @actalk/inkos-core build \
    && pnpm --filter @actalk/inkos-studio build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV INKOS_PROJECT_ROOT=/data

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/core ./packages/core
COPY --from=build --chown=node:node /app/packages/studio ./packages/studio
COPY --chown=node:node railway-entrypoint.sh ./railway-entrypoint.sh

RUN mkdir -p /data && chown node:node /data

USER root
EXPOSE 4567

CMD ["sh", "/app/railway-entrypoint.sh"]
