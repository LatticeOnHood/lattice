import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const isRemoteDb = connectionString?.includes("supabase.com") || process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString: connectionString || "postgres://postgres:postgres@localhost:5432/lattice",
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
});
