# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps
COPY . .
# NEXT_PUBLIC_* se incrusta en build time
ARG NEXT_PUBLIC_EDITION=community
ENV NEXT_PUBLIC_EDITION=$NEXT_PUBLIC_EDITION
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

# jemalloc prevents musl libc memory fragmentation in long-running Node.js containers
RUN apk add --no-cache jemalloc
ENV LD_PRELOAD=/usr/lib/libjemalloc.so.2

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 1. Copiar los archivos manteniendo al usuario 'node' como dueño
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# 2. Cambiar al usuario sin privilegios antes de arrancar la app
USER node

LABEL org.opencontainers.image.licenses="AGPL-3.0-only"
EXPOSE 3000

CMD ["node", "server.js"]