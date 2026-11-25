/** Chạy migration Drizzle: `bun run db:migrate` (dùng DATABASE_URL). */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { loadConfig } from "../config.js";
import { createPgDb } from "./client.js";

const config = loadConfig();
const { db, close } = createPgDb(config.DATABASE_URL);
await migrate(db as never, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
await close();
console.log("migrations applied");
