import { createHash, randomBytes } from "crypto";

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
  const scope = params.scope || "users.read tweet.read";
  const url = new URL("https://twitter.com/i/oauth2/authorize");

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
