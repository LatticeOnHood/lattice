import { DexScreenerTokenMetrics } from "../../services/dexscreener";
import {
  Check,
  DataSource,
  DevTxns,
  REPORT_DISCLAIMER,
  REPORT_SCHEMA_VERSION,
  ROBINHOOD_CHAIN,
  Txns24h,
  UnavailableCheck,
  VerificationReport,
} from "./reportSchema";

function ok<T>(value: T, source: DataSource, fetchedAt: string): Check<T> {
  return { available: true, value, source, fetchedAt };
}

function notImplemented(plannedPhase: string, note?: string): UnavailableCheck {
  return { available: false, reason: "not_implemented", plannedPhase, note };
}

const NO_DATA: UnavailableCheck = {
  available: false,
  reason: "no_data_from_source",
};

/**
 * A number the upstream indexer actually returned, or undefined.
 *
 * `null`, `undefined` and `NaN` all mean "we don't know". Zero is kept — a real
 * zero liquidity reading is information, not an absence.
 */
function known(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Maps the internal metrics object onto the agent-readable report.
 *
 * The `source` argument is threaded in rather than inferred, so the provenance
 * on each field is the indexer that actually answered.
 */
/**
 * The subset of the on-chain reading the report can express through its existing
 * checks. Passed in rather than fetched here so the builder stays pure.
 */
export interface OnchainFacts {
  owner?: { kind: "renounced" | "owned" | "no_owner_function" };
  bytecode?: { hasMint: boolean };
  sell?: { transferOk: boolean; sellOk?: boolean; balanceSlot?: string };
}

/** Chain reads are their own provenance — they are not an indexer's opinion. */
const CHAIN_SOURCE: DataSource = "codex.io";

function onchainOwnership(facts?: OnchainFacts): Check<boolean> {
  const kind = facts?.owner?.kind;
  if (kind === "renounced" || kind === "owned") {
    return ok(kind === "renounced", CHAIN_SOURCE, new Date().toISOString());
  }
  if (kind === "no_owner_function") {
    return {
      available: false,
      reason: "no_data_from_source",
      note: "No owner-style function responded. That is not the same as renounced — a role-based contract can still have a live admin.",
    };
  }
  return NO_DATA;
}

function onchainMint(facts?: OnchainFacts): Check<boolean> {
  if (facts?.bytecode === undefined) return NO_DATA;
  // Deliberately reports absence of a mint selector, not "cannot be minted":
  // a selector found in bytecode may still be unreachable, and one that is
  // absent may exist behind a proxy or an unusual dispatch.
  return {
    available: false,
    reason: "no_data_from_source",
    note: facts.bytecode.hasMint
      ? "A mint function is present in the deployed bytecode. Whether it is callable was not determined."
      : "No mint selector found in the deployed bytecode. That is not proof minting is impossible.",
  };
}

function onchainHoneypot(facts?: OnchainFacts): Check<boolean> {
  const sell = facts?.sell;
  if (!sell || sell.balanceSlot === undefined) {
    return {
      available: false,
      reason: "no_data_from_source",
      note: "The token's balance storage layout could not be resolved, so no transfer simulation was run.",
    };
  }
  // `true` means honeypot-shaped. A simulated transfer that reverts while an
  // ordinary one succeeds is the classic sell-blocked pattern.
  const blocked = !sell.transferOk || sell.sellOk === false;
  return ok(blocked, CHAIN_SOURCE, new Date().toISOString());
}

export function buildVerificationReport(
  metrics: DexScreenerTokenMetrics,
  options: { source?: DataSource; generatedAt?: string; onchain?: OnchainFacts } = {}
): VerificationReport {
  const source: DataSource = options.source ?? metrics.dataSource ?? "dexscreener";
  const at = options.generatedAt ?? new Date().toISOString();

  const num = (value: number | null | undefined): Check<number> => {
    const v = known(value);
    return v === undefined ? NO_DATA : ok(v, source, at);
  };

  const txns24h: Check<Txns24h> =
    known(metrics.buys24h) === undefined && known(metrics.sells24h) === undefined
      ? NO_DATA
      : ok({ buys: metrics.buys24h ?? 0, sells: metrics.sells24h ?? 0 }, source, at);

  /**
   * Dev-wallet figures only mean something once a creator address is actually
   * identified. The Codex mapping defaults holdings to 0 when the upstream
   * fields are absent, so reporting that 0 as a verified reading would be
   * exactly the handwave this schema exists to prevent.
   */
  const hasCreator = typeof metrics.creatorAddress === "string" && metrics.creatorAddress.length > 0;

  const devHoldingsPct: Check<number> = hasCreator ? num(metrics.devHoldingsPct) : NO_DATA;

  const devTxns: Check<DevTxns> = hasCreator
    ? ok({ buys: metrics.devBuys ?? 0, sells: metrics.devSells ?? 0 }, source, at)
    : NO_DATA;

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    address: metrics.address.toLowerCase(),
    chain: { ...ROBINHOOD_CHAIN },
    generatedAt: at,
    token: { name: metrics.name, symbol: metrics.symbol },
    checks: {
      priceUsd: num(metrics.priceUsd),
      marketCap: num(metrics.marketCap),
      fdv: num(metrics.fdv),
      liquidityUsd: num(metrics.liquidityUsd),
      volume24h: num(metrics.volume24h),
      priceChange24h: num(metrics.priceChange24h),
      txns24h,

      holderCount: num(metrics.holdersCount),
      top10HoldersPct: num(metrics.top10HoldersPct),
      devHoldingsPct,
      devTxns,

      lpLocked: notImplemented("01", "LP lock and burn detection is roadmap phase 01."),

      /**
       * A reverting `owner()` is not a renouncement — it means no owner-style
       * function answered, which a role-based contract with a live admin would
       * also produce. Only an explicit zero address counts as renounced.
       */
      honeypot: onchainHoneypot(options.onchain),
      ownershipRenounced: onchainOwnership(options.onchain),
      mintDisabled: onchainMint(options.onchain),

      sourceVerified: {
        available: false,
        reason: "no_data_from_source",
        note: "Robinhood Chain's explorer exposes no JSON API, so verification status cannot be read.",
      },

      promisesKept: {
        available: false,
        reason: "no_declared_baseline",
        plannedPhase: "04",
        note: "No declared tokenomics registered for this token.",
      },
    },
    sources: [{ name: source, queriedAt: at }],
    disclaimer: REPORT_DISCLAIMER,
  };
}
