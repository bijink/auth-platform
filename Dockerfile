# Base
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# To run postinstall prisma folder needed
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Development stage
FROM deps AS development
COPY . .
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start:dev"]

# Build stage
FROM deps AS build
COPY . .
RUN pnpm build

# Production stage
FROM node:22-alpine AS production
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start:prod"]