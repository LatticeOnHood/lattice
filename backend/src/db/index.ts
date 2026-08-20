import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const isRemoteDb = connectionString?.includes("supabase") || connectionString?.includes(".com") || process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: connectionString || "postgres://postgres:postgres@localhost:5432/lattice",
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.warn("[db-pool] Idle client disconnected:", err.message);
});
