# Multi-stage production Dockerfile for the Next.js frontend.
# Build from repo root:
#   docker build -f apps/frontend/Dockerfile -t crm-erp-frontend .

# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/frontend/package.json ./apps/frontend/
RUN npm install --omit=dev --workspace=apps/frontend --include-workspace-root

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=apps/frontend

# ---- runtime ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=build /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=build /app/apps/frontend/package.json ./apps/frontend/package.json
COPY --from=build /app/package.json ./package.json

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "--workspace=apps/frontend", "start"]
