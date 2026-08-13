/**
 * Typed client for the Lattice backend (`backend/src/routes`).
 *
 * The API is a separate origin (api.latticehood.app) with permissive CORS, so
 * every call goes out from the browser with a Bearer JWT rather than a cookie.
 */

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.latticehood.app"
).replace(/\/+$/, "");

/** The exact string the backend expects to verify against — do not reword. */
export const SIGN_MESSAGE =
  "Welcome to Lattice! Please sign this message to verify your wallet ownership.";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = init;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError("Could not reach the Lattice API. Check your connection.", 0);
  }

  const raw = await response.text();
  const body = raw ? safeJsonParse(raw) : null;

  if (!response.ok) {
    const message =
      (body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : null) ?? `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return body as T;
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------- auth */

/** Wallet proof-of-ownership, reused across every binding endpoint. */
export interface WalletProof {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface LinkState {
  walletAddress: string;
  xLinked: boolean;
  xHandle?: string | null;
  telegramLinked: boolean;
  telegramUsername?: string | null;
}

export interface AuthenticatedSession extends LinkState {
  token: string;
}

export type SignInResult =
  | { kind: "session"; session: AuthenticatedSession }
  | { kind: "needs-x-link"; authorizeUrl: string };

interface SignInResponse extends Partial<AuthenticatedSession> {
  needsXLink?: boolean;
  authorizeUrl?: string;
}

/**
 * POST /auth/signin — verifies the signature, then either returns a session
 * (wallet already has a social account bound) or an X OAuth URL to redirect to.
 */
export async function signIn(proof: WalletProof): Promise<SignInResult> {
  const data = await request<SignInResponse>("/auth/signin", {
    method: "POST",
    body: JSON.stringify(proof),
  });

  if (data.needsXLink && data.authorizeUrl) {
    return { kind: "needs-x-link", authorizeUrl: data.authorizeUrl };
  }

  if (!data.token || !data.walletAddress) {
    throw new ApiError("Unexpected sign-in response from the API.", 502);
  }

  return { kind: "session", session: toSession(data.token, data) };
}

/**
 * POST /auth/x/authorize — an X authorize URL for an already-verified wallet.
 * Used for the cross-link case (Telegram bound first, X added afterwards).
 */
export async function requestXAuthorizeUrl(proof: WalletProof): Promise<string> {
  const data = await request<{ authorizeUrl: string }>("/auth/x/authorize", {
    method: "POST",
    body: JSON.stringify(proof),
  });
  return data.authorizeUrl;
}

/** GET /auth/me — rehydrates a stored JWT into current binding state. */
export async function fetchLinkState(token: string): Promise<LinkState> {
  return request<LinkState>("/auth/me", { method: "GET", token });
}

export interface TelegramWidgetUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/** POST /auth/telegram/widget — HMAC-verified Telegram Login Widget payload. */
export async function bindTelegramWidget(
  proof: WalletProof,
  telegramData: TelegramWidgetUser
): Promise<AuthenticatedSession> {
  const data = await request<{
    token: string;
    walletAddress: string;
    telegramUsername?: string;
  }>("/auth/telegram/widget", {
    method: "POST",
    body: JSON.stringify({ ...proof, telegramData }),
  });

  return {
    token: data.token,
    walletAddress: data.walletAddress,
    xLinked: false,
    telegramLinked: true,
    telegramUsername: data.telegramUsername ?? telegramData.username ?? null,
  };
}

/** POST /auth/telegram/bind — direct binding, no widget payload. */
export async function bindTelegram(
  proof: WalletProof,
  telegram: { telegramUserId: string; telegramUsername?: string }
): Promise<AuthenticatedSession> {
  const data = await request<{
    token: string;
    walletAddress: string;
    telegramUsername?: string;
  }>("/auth/telegram/bind", {
    method: "POST",
    body: JSON.stringify({ ...proof, ...telegram }),
  });

  return {
    token: data.token,
    walletAddress: data.walletAddress,
    xLinked: false,
    telegramLinked: true,
    telegramUsername: data.telegramUsername ?? telegram.telegramUsername ?? null,
  };
}

function toSession(token: string, state: Partial<LinkState>): AuthenticatedSession {
  return {
    token,
    walletAddress: String(state.walletAddress ?? "").toLowerCase(),
    xLinked: !!state.xLinked,
    xHandle: state.xHandle ?? null,
    telegramLinked: !!state.telegramLinked,
    telegramUsername: state.telegramUsername ?? null,
  };
}

/* ------------------------------------------------------------------- audit */

export interface TokenMetrics {
  address: string;
  name: string;
  symbol: string;
  priceUsd: number;
  priceNative: string;
  marketCap: number;
  fdv: number;
  liquidityUsd: number;
  volume24h: number;
  priceChange24h: number;
  buys24h: number;
  sells24h: number;
  dexId: string;
  pairAddress: string;
  pairCreatedAt?: number;
  websites?: string[];
  twitter?: string;
  telegram?: string;
  creatorAddress?: string;
  devHoldingsPct?: number;
  devBuys?: number;
  devSells?: number;
}

export interface AuditResult {
  success: boolean;
  chain: string;
  metrics: TokenMetrics;
  renderedCards: {
    telegramHtml: string;
    twitterText: string;
  };
}

/** POST /api/audit — a contract address, or natural language for Groq to parse. */
export async function runAudit(
  input: { address?: string; message?: string },
  token?: string
): Promise<AuditResult> {
  return request<AuditResult>("/api/audit", {
    method: "POST",
    body: JSON.stringify(input),
    token,
  });
}
