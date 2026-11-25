# Build context: project/ (cần docs/api/openapi.yaml cho Swagger UI)
FROM oven/bun:1.4 AS deps
WORKDIR /app/api
COPY api/package.json api/bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.4 AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY api/ ./api/
COPY docs/api/openapi.yaml ./docs/api/openapi.yaml
RUN mkdir -p /app/api/storage && chown -R bun:bun /app/api/storage
USER bun
WORKDIR /app/api
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD bun -e "fetch('http://localhost:8000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Chạy migration rồi khởi động service
CMD ["sh", "-c", "bun src/db/migrate.ts && bun src/index.ts"]
