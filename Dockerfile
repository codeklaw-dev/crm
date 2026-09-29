# syntax=docker/dockerfile:1

FROM oven/bun:1.3.12 AS bun

FROM node:22-bookworm-slim AS base
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN ln -s /usr/local/bin/bun /usr/local/bin/bunx \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates openssl curl \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /repo

FROM base AS build
ARG API_URL=http://localhost:3001
ARG APP_URL=http://localhost:3000
ENV API_URL=${API_URL} \
	APP_URL=${APP_URL} \
	NEXT_TELEMETRY_DISABLED=1 \
	CRM_TELEMETRY_DISABLED=1
COPY . .
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
	bun install --frozen-lockfile
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
	NODE_ENV=production \
	bunx turbo run build --filter=app --filter=api --filter=agent

FROM base AS runtime
ENV NODE_ENV=production \
	NEXT_TELEMETRY_DISABLED=1
COPY --from=build /repo /repo
