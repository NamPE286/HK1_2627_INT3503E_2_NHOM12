import type { Auth } from "./auth/auth.js";
import type { Config } from "./config.js";
import type { Db } from "./db/client.js";
import type { FileStorage } from "./storage/file-storage.js";

/** Phụ thuộc được inject vào app (DB thật khi chạy, PGlite khi test). */
export interface AppDeps {
  db: Db;
  auth: Auth;
  config: Config;
  storage: FileStorage;
}
