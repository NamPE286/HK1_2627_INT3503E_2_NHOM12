import { z } from "zod";

/** Cấu hình 12-factor: chỉ đọc từ biến môi trường (ai-rules/06). */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z.string().min(1).default("postgresql://leximpact:leximpact@localhost:5432/leximpact"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:8000"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET phải >= 32 ký tự"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean)),
  UPLOAD_DIR: z.string().default("./storage"),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(20 * 1024 * 1024),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Cấu hình không hợp lệ: ${issues}`);
  }
  return parsed.data;
}
