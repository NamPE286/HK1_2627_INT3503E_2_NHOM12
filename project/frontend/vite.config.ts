import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Dev: proxy /api (gồm /api/auth của Better Auth) sang backend ⇒ cùng origin, cookie phiên hoạt động.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: process.env.VITE_PROXY_TARGET ?? "http://localhost:8000", changeOrigin: false } },
  },
  test: { environment: "jsdom", globals: true },
});
