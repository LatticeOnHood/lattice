import { pool } from "../../db/index";

/**
 * Reads the last-processed tweet ID for a given stream from the DB.
 * Returns null if no cursor has been saved yet (first boot).
 */
export async function getCursor(stream: "mentions"): Promise<string | null> {
  try {
    const { rows } = await pool.query(
      "SELECT last_seen_id FROM x_bot_cursor WHERE stream = $1",
      [stream]
    );
    return rows.length === 0 ? null : rows[0].last_seen_id;
  } catch (err: any) {
    console.warn(`[x-bot-cursor] Failed to read cursor for ${stream}:`, err.message);
    return null;
  }
}

/**
 * Persists the last-processed tweet ID for a given stream to the DB.
 * Uses upsert so it works whether or not a row already exists.
 */
export async function setCursor(stream: "mentions", lastSeenId: string): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO x_bot_cursor (stream, last_seen_id, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (stream) DO UPDATE
       SET last_seen_id = EXCLUDED.last_seen_id, updated_at = now()`,
      [stream, lastSeenId]
    );
  } catch (err: any) {
    console.warn(`[x-bot-cursor] Failed to save cursor for ${stream}:`, err.message);
  }
}
