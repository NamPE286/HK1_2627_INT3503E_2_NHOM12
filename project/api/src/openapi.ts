/** Phục vụ contract design-first (docs/api/openapi.yaml) qua Swagger UI tại /docs. */
import { readFileSync } from "node:fs";
import { Elysia } from "elysia";
import { parse } from "yaml";

const SPEC_PATH = process.env.OPENAPI_SPEC_PATH ?? new URL("../../docs/api/openapi.yaml", import.meta.url).pathname;

function loadSpec(): unknown {
  try {
    return parse(readFileSync(SPEC_PATH, "utf8"));
  } catch {
    return { openapi: "3.1.0", info: { title: "LexImpact API", version: "unknown" }, paths: {} };
  }
}

const SWAGGER_HTML = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LexImpact API — Swagger UI</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css"></head>
<body><div id="swagger"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({ url: "/api/v1/openapi.json", dom_id: "#swagger", withCredentials: true, persistAuthorization: true });</script>
</body></html>`;

const spec = loadSpec();

export const openapiRoutes = new Elysia({ name: "openapi" })
  .get("/api/v1/openapi.json", () => spec)
  .get("/docs", () => new Response(SWAGGER_HTML, { headers: { "content-type": "text/html; charset=utf-8" } }));
