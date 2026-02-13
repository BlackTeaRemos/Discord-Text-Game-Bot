FROM oven/bun:1 AS base
ENV NODE_ENV=production
WORKDIR /app

# Install dependencies separately for better caching
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
COPY config ./config
RUN bun run build

FROM oven/bun:1 AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --production

COPY --from=build /app/cmp ./cmp
COPY config ./config

EXPOSE 3500
CMD ["bun", "run", "cmp/index.js"]
