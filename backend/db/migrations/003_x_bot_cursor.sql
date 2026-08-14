-- Persists the X bot's polling cursor across server restarts.
-- Without this, lastSeenTweetId resets to null on every restart,
-- causing the bot to re-process old mentions it already replied to.
CREATE TABLE IF NOT EXISTS x_bot_cursor (
  stream      TEXT PRIMARY KEY,        -- e.g. 'mentions'
  last_seen_id TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
