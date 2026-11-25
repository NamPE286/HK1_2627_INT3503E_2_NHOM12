# Build context: project/ (cần docs/api/openapi.yaml để sinh type)
FROM oven/bun:1.4 AS build
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile
COPY frontend/ ./
COPY docs/api/openapi.yaml /app/docs/api/openapi.yaml
RUN bun run build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
