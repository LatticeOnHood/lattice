/**
 * The agent-readable verification report.
 *
 * `/api/audit` returns metrics plus pre-rendered social cards, which is right
 * for a human reading a reply in a thread. An autonomous agent needs something
 * else: a versioned contract where every field carries its own source and
 * timestamp, and where a check Lattice cannot yet perform says so explicitly
 * instead of returning a value that looks like a pass.
 *
 * That last rule is the whole point. An agent gating on `honeypot === false`
 * must never get `false` because we defaulted it — it must get
 * `{ available: false, reason: "not_implemented" }` and decide for itself.
 */

export const REPORT_SCHEMA_VERSION = "1.0.0";

export const ROBINHOOD_CHAIN = { name: "Robinhood Chain", chainId: 4663 } as const;

export const REPORT_DISCLAIMER =
  "Read-only on-chain and market heuristics. Not financial advice. " +
  "Absence of a flag is not a guarantee of safety.";

/** Every check the report can carry, implemented or not. */
export type CheckId =
  // Market — served today by Codex.io / DexScreener
  | "priceUsd"
  | "marketCap"
  | "fdv"
  | "liquidityUsd"
  | "volume24h"
  | "priceChange24h"
  | "txns24h"
  // Distribution — served when the upstream indexer returns it
  | "holderCount"
  | "top10HoldersPct"
  | "devHoldingsPct"
  | "devTxns"
  // Contract security — roadmap phase 01, not implemented
  | "lpLocked"
  | "honeypot"
  | "ownershipRenounced"
  | "mintDisabled"
  | "sourceVerified"
  // Accountability — roadmap phase 04, not implemented
  | "promisesKept";

export const ALL_CHECK_IDS: readonly CheckId[] = [
  "priceUsd",
  "marketCap",
  "fdv",
  "liquidityUsd",
  "volume24h",
  "priceChange24h",
  "txns24h",
  "holderCount",
  "top10HoldersPct",
  "devHoldingsPct",
  "devTxns",
  "lpLocked",
  "honeypot",
  "ownershipRenounced",
  "mintDisabled",
  "sourceVerified",
  "promisesKept",
] as const;

export type UnavailableReason =
  /** Lattice has not shipped this check yet. See `plannedPhase`. */
  | "not_implemented"
  /** The check exists, but the upstream indexer returned nothing for this token. */
  | "no_data_from_source"
  /** Nothing to measure against — the project never declared a baseline. */
  | "no_declared_baseline";

export type DataSource = "codex.io" | "dexscreener";

export interface AvailableCheck<T> {
  available: true;
  value: T;
  source: DataSource;
  fetchedAt: string;
}

export interface UnavailableCheck {
  available: false;
  reason: UnavailableReason;
  /** Roadmap phase that will implement this, when the reason is `not_implemented`. */
  plannedPhase?: string;
  note?: string;
}

export type Check<T = unknown> = AvailableCheck<T> | UnavailableCheck;

export interface Txns24h {
  buys: number;
  sells: number;
}

export interface DevTxns {
  buys: number;
  sells: number;
}

export interface VerificationReport {
  schemaVersion: string;
  address: string;
  chain: { name: string; chainId: number };
  /** ISO-8601. The moment this report was assembled. */
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
    devTxns: Check<DevTxns>;
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

export function isAvailable<T>(check: Check<T>): check is AvailableCheck<T> {
  return check.available === true;
}
