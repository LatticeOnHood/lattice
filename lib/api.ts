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
  } catch (err) {
    // An abort is the caller withdrawing the request, not a network failure —
    // rethrow it so React Query treats it as a cancellation, not an error.
    if (err instanceof DOMException && err.name === "AbortError") throw err;
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

export type DataSource = "codex.io" | "dexscreener";

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
  /* Distribution and extrema — populated on the Codex.io path only. */
  holdersCount?: number;
  top10HoldersPct?: number;
  athPrice?: number;
  athFdv?: number;
  atlPrice?: number;
  /** Which indexer actually answered. Carried onto the report's provenance line. */
  dataSource?: DataSource;
}

/* --------------------------------------------------- verification report */

/**
 * Mirror of `backend/src/integrations/virtuals/reportSchema.ts`.
 *
 * The contract's whole point is that a check Lattice cannot perform says so
 * explicitly rather than returning a value that reads as a pass. The UI honours
 * that: an unavailable check renders as "not yet measured", never as a blank
 * tile and never as a zero.
 */
export type UnavailableReason =
  | "not_implemented"
  | "no_data_from_source"
  | "no_declared_baseline";

export interface AvailableCheck<T> {
  available: true;
  value: T;
  source: DataSource;
  fetchedAt: string;
}

export interface UnavailableCheck {
  available: false;
  reason: UnavailableReason;
  plannedPhase?: string;
  note?: string;
}

export type Check<T = unknown> = AvailableCheck<T> | UnavailableCheck;

export function isAvailable<T>(check: Check<T> | undefined): check is AvailableCheck<T> {
  return !!check && check.available === true;
}

export interface Txns24h {
  buys: number;
  sells: number;
}

export interface VerificationReport {
  schemaVersion: string;
  address: string;
  chain: { name: string; chainId: number };
  generatedAt: string;
  token: { name: string; symbol: string } | null;
  checks: {
    priceUsd: Check<number>;
    marketCap: Check<number>;
    fdv: Check<number>;
    liquidityUsd: Check<number>;
    volume24h: Check<number>;
    priceChange24h: Check<number>;
    txns24h: Check<Txns24h>;
    holderCount: Check<number>;
    top10HoldersPct: Check<number>;
    devHoldingsPct: Check<number>;
    devTxns: Check<Txns24h>;
    lpLocked: Check<boolean>;
    honeypot: Check<boolean>;
    ownershipRenounced: Check<boolean>;
    mintDisabled: Check<boolean>;
    sourceVerified: Check<boolean>;
    promisesKept: Check<unknown>;
  };
  sources: { name: DataSource; queriedAt: string }[];
  disclaimer: string;
}

/* ------------------------------------------------------------- on-chain */

/**
 * Direct chain reads, mirroring `backend/src/services/onchain.ts`.
 *
 * These answer what an indexer structurally cannot: how much supply is actually
 * free to trade rather than parked in the pool, whether the contract is an
 * upgradeable proxy, and whether a transfer even succeeds. Every field is
 * optional — a read that could not be established is absent, never defaulted.
 */
export interface FloatBreakdown {
  totalSupply: string;
  /** Absent when the pool's token balance could not be established. */
  pooled?: string;
  /**
   * Uniswap v4 keeps every pool's balance in a single PoolManager rather than in
   * a per-pair contract, so a v4 pool id reads back as holding nothing. When that
   * happens the split is reported as unknown rather than as a reassuring
   * "0% pooled, 100% free float".
   */
  pooledUnknown: boolean;
  burned: string;
  deployer?: string;
  float?: string;
  pooledPct?: number;
  burnedPct: number;
  floatPct?: number;
  deployerPctOfFloat?: number;
  /** Deployer holdings against total supply — computable even when pooled is not. */
  deployerPctOfSupply?: number;
}

export interface ProxyReading {
  isProxy: boolean;
  standard?: "eip1967" | "eip1822";
  implementation?: string;
  admin?: string;
}

export type OwnerState =
  /** The owner is explicitly the zero address. */
  | { kind: "renounced" }
  | { kind: "owned"; owner: string }
  /** No owner-style function answered - not the same as renounced. */
  | { kind: "no_owner_function" };

export interface BytecodeReading {
  sizeBytes: number;
  levers: string[];
  hasMint: boolean;
  hasPause: boolean;
  hasBlacklist: boolean;
}

export interface SellSimulation {
  transferOk: boolean;
  sellOk?: boolean;
  taxPct?: number;
  balanceSlot?: string;
  note?: string;
}

export interface OnchainReading {
  float?: FloatBreakdown;
  proxy?: ProxyReading;
  owner?: OwnerState;
  bytecode?: BytecodeReading;
  sell?: SellSimulation;
  blockNumber?: string;
}

export interface AuditResult {
  success: boolean;
  chain: string;
  metrics: TokenMetrics;
  /** Direct chain reads. Absent when the RPC could not be reached. */
  onchain?: OnchainReading;
  /**
   * Present once the backend ships the additive `report` key. The inspector
   * degrades to metrics-only rendering when it is absent, so the frontend can
   * deploy ahead of the API.
   */
  report?: VerificationReport;
  renderedCards: {
    telegramHtml: string;
    twitterText: string;
  };
}

/** POST /api/audit — a contract address, or natural language for Groq to parse. */
export async function runAudit(
  input: { address?: string; message?: string },
  token?: string,
  signal?: AbortSignal
): Promise<AuditResult> {
  return request<AuditResult>("/api/audit", {
    method: "POST",
    body: JSON.stringify(input),
    token,
    signal,
  });
}
