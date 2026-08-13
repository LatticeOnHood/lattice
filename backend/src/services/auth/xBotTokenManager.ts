import { pool } from "../../db/index";
import { refreshXAccessToken } from "./oauth";

const REFRESH_MARGIN_MS = 5 * 60 * 1000; // Refresh 5 minutes before actual expiry

// X OAuth 2.0 access tokens last 2 hours. We estimate expiry from the DB
// updated_at timestamp since X doesn't return expires_in on seed tokens.
const TOKEN_LIFETIME_MS = 2 * 60 * 60 * 1000; // 2 hours

// X's refresh tokens rotate (single-use). pollMentions (every 60s) calls this on every
// cycle. Without this lock, concurrent callers landing on the same near-expiry token
// would both fire refreshXAccessToken with the SAME refresh token concurrently.
// Only one can actually consume it; the other fails with:
//   "invalid_request: Value passed for the token was invalid"
// X can treat that reuse as a replay signal and revoke the whole token chain.
// Concurrent callers now share one in-flight refresh instead of racing separate ones.
let inFlightRefresh: Promise<string> | null = null;

interface StoredBotToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

async function getStoredToken(): Promise<StoredBotToken | null> {
  try {
    const { rows } = await pool.query(
      "SELECT access_token, refresh_token, updated_at FROM x_bot_tokens WHERE id = 'primary'"
    );
    if (rows.length === 0) return null;
    // Estimate expiry from updated_at (when token was last saved)
    const updatedAt = new Date(rows[0].updated_at);
    return {
      accessToken: rows[0].access_token,
      refreshToken: rows[0].refresh_token,
      expiresAt: new Date(updatedAt.getTime() + TOKEN_LIFETIME_MS),
    };
  } catch (err: any) {
    console.warn("[x-token-manager] Failed to read x_bot_tokens from DB:", err.message);
    return null;
  }
}

async function saveToken(accessToken: string, refreshToken: string): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO x_bot_tokens (id, access_token, refresh_token, updated_at)
       VALUES ('primary', $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE
       SET access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           updated_at = NOW()`,
      [accessToken, refreshToken]
    );
  } catch (err: any) {
    console.warn("[x-token-manager] Failed to save x_bot_tokens to DB:", err.message);
  }
}

async function refreshAndSave(stored: StoredBotToken): Promise<string> {
  const refreshed = await refreshXAccessToken({
    refreshToken: stored.refreshToken,
    clientId: process.env.X_CLIENT_ID || "",
    clientSecret: process.env.X_CLIENT_SECRET || "",
  });
  const newRefreshToken = refreshed.refresh_token ?? stored.refreshToken;
  await saveToken(refreshed.access_token, newRefreshToken);
  console.log("[x-token-manager] Proactively refreshed and saved new X OAuth tokens.");
  return refreshed.access_token;
}

/**
 * Returns a live access token for the bot's X account.
 *
 * - If the stored token is still valid (> 5 min remaining), returns it immediately.
 * - If near expiry or first-ever call with no DB expiry info, proactively refreshes.
 * - Uses an in-flight mutex so concurrent callers share one refresh request instead
 *   of racing with the single-use refresh token (TagioPay botTokenManager pattern).
 */
export async function getValidBotAccessToken(): Promise<string> {
  const stored = await getStoredToken();

  // Fallback to env vars if nothing in DB yet (first boot / seed)
  const envAccessToken = process.env.X_ACCESS_TOKEN || "";
  const envRefreshToken = process.env.X_REFRESH_TOKEN || "";

  if (!stored) {
    // No DB token yet — seed from env and do an immediate refresh to establish expiry
    if (!envRefreshToken) return envAccessToken;
    const seed: StoredBotToken = {
      accessToken: envAccessToken,
      refreshToken: envRefreshToken,
      expiresAt: new Date(0), // Force refresh
    };
    if (!inFlightRefresh) {
      inFlightRefresh = refreshAndSave(seed).finally(() => { inFlightRefresh = null; });
    }
    return inFlightRefresh;
  }

  // Token still has >5 minutes — return it directly
  if (Date.now() <= stored.expiresAt.getTime() - REFRESH_MARGIN_MS) {
    return stored.accessToken;
  }

  // Near expiry — refresh proactively, sharing any in-flight refresh
  if (!inFlightRefresh) {
    inFlightRefresh = refreshAndSave(stored)
      .catch((err: any) => {
        console.warn("[x-token-manager] Refresh failed, using existing token:", err.message);
        return stored.accessToken;
      })
      .finally(() => { inFlightRefresh = null; });
  }
  return inFlightRefresh;
}
