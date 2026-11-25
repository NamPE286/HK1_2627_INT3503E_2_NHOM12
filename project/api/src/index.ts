import { createApp } from "./app.js";
import { createAuth } from "./auth/auth.js";
import { loadConfig } from "./config.js";
import { createPgDb } from "./db/client.js";
import { configureLogger, log } from "./lib/logger.js";
import { localFileStorage } from "./storage/file-storage.js";

const config = loadConfig();
configureLogger(config.LOG_LEVEL);

const { db, close } = createPgDb(config.DATABASE_URL);
const auth = createAuth(db, config);
const app = createApp({ db, auth, config, storage: localFileStorage(config.UPLOAD_DIR) }).listen(config.PORT);

log("info", "server_started", { url: `http://localhost:${config.PORT}`, docs: "/docs", auth_docs: "/api/auth/reference" });

const shutdown = async () => {
  await app.stop();
  await close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
