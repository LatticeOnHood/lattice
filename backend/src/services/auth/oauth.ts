import { createHash, randomBytes } from "crypto";
import { pool } from "../../db/index";

export function generatePkcePair() {
  const codeVerifier = randomBytes(32)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return { codeVerifier, codeChallenge };
}

export function buildXAuthorizeUrl(params: {
  state: string;
  codeChallenge: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
}): string {
  const scope = params.scope || "users.read tweet.read offline.access";
  const url = new URL("https://x.com/i/oauth2/authorize");

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

export async function exchangeCodeForXToken(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ access_token: string; refresh_token?: string }> {
  const credentials = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    code: params.code,
    grant_type: "authorization_code",
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
  });

  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code for X token: ${errorText}`);
  }

  return response.json();
}

export async function getAuthenticatedXUser(accessToken: string): Promise<{ id: string; username: string; name: string }> {
  const response = await fetch("https://api.twitter.com/2/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch X user profile: ${errorText}`);
  }

  const json = await response.json();
  return {
    id: json.data.id,
    username: json.data.username,
    name: json.data.name,
  };
}

export async function refreshXAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ access_token: string; refresh_token?: string }> {
  const credentials = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
  });

  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh X token: ${errorText}`);
  }

  return response.json();
}

export async function getStoredXBotTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await pool.query("SELECT access_token, refresh_token FROM x_bot_tokens WHERE id = 'primary'");
    if (res.rows.length > 0) {
      return {
        accessToken: res.rows[0].access_token,
        refreshToken: res.rows[0].refresh_token,
      };
    }
  } catch (err) {
    console.warn("[oauth] Failed to read x_bot_tokens from DB:", err);
  }
  return null;
}

export async function saveXBotTokens(accessToken: string, refreshToken: string): Promise<void> {
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
  } catch (err) {
    console.warn("[oauth] Failed to save x_bot_tokens to DB:", err);
  }
}
