FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile
COPY backend backend
COPY packages packages
RUN pnpm --filter backend db:generate && pnpm --filter backend build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/src/generated/prisma ./backend/dist/generated/prisma
COPY --from=build /app/packages ./packages
RUN mkdir -p /app/backend/storage/uploads && chown -R node:node /app/backend/storage
USER node
WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "dist/index.js"]
