import fs from "fs";
import path from "path";
import { pool } from "./index";

export async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.log("[db] DATABASE_URL not set, skipping database migration.");
    return;
  }

  const client = await pool.connect();
  try {
    console.log("[db] Initializing migration runner...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.join(__dirname, "../../db/migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.log("[db] No migrations directory found, skipping.");
      return;
    }

    const files = fs.readdirSync(migrationsDir).sort();
    for (const file of files) {
      if (!file.endsWith(".sql")) continue;

      const { rows } = await client.query(
        "SELECT filename FROM schema_migrations WHERE filename = $1",
        [file]
      );

      if (rows.length === 0) {
        console.log(`[db] Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`[db] Applied migration successfully: ${file}`);
      }
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[db] Migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}
