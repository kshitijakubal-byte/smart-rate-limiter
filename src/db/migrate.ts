import { readdir, readFile } from "fs/promises";
import path from "path";
import { pool } from "../config/db";
import { logger } from "../utils/logger";

async function migrate(): Promise<void> {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    logger.info("No migration files found");
    return;
  }

  const client = await pool.connect();

  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = await readFile(filePath, "utf-8");
      logger.info(`Running migration: ${file}`);
      await client.query(sql);
      logger.info(`Completed migration: ${file}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  logger.error("Migration failed", err);
  process.exit(1);
});
