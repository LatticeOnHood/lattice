import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString: connectionString || "postgres://postgres:postgres@localhost:5432/lattice",
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
