import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

/** Kiểu DB dùng chung cho node-postgres (dev/prod) và PGlite (test). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export function createPgDb(databaseUrl: string): { db: Db; close: () => Promise<void> } {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  const db = drizzle(pool, { schema, casing: "snake_case" }) as unknown as Db;
  return { db, close: () => pool.end() };
}

export { schema };
