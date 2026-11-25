/** Log JSON có cấu trúc (ai-rules/06). Không log Authorization / cookie / mật khẩu. */
type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

let minLevel: Level = "info";
let silent = process.env.NODE_ENV === "test";

export function configureLogger(level: Level, isTest = false) {
  minLevel = level;
  silent = isTest;
}

export function log(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  if (silent || ORDER[level] < ORDER[minLevel]) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...fields });
  (level === "error" || level === "warn" ? process.stderr : process.stdout).write(`${line}\n`);
}
