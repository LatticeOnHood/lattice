/**
 * Heuristic risk assessment for the token inspector.
 *
 * Pure and React-free on purpose, so it can be reasoned about and tested without
 * a renderer.
 *
 * The hard rule this module exists to enforce: **no output of this function ever
 * asserts that a token is safe.** It now reads contract state directly —
 * upgradeability, ownership, bytecode levers, free float, and a simulated
 * transfer — alongside market and distribution data. LP lock detection and
 * source verification remain unavailable, the latter because Robinhood Chain's
 * explorer exposes no JSON API.
 *
 * More coverage does not relax the rule. A simulated transfer that succeeded at
 * one block is not a promise about the next, a selector absent from bytecode is
 * not proof a function cannot be reached, and a contract that is not a proxy
 * today can still be drained by an owner. The best case remains "no elevated
 * signals", always shown next to how many checks actually ran.
 */

import {
  isAvailable,
  type OnchainReading,
  type TokenMetrics,
  type VerificationReport,
} from "@/lib/api";

export type SignalLevel = "critical" | "caution" | "clear" | "unknown";

export interface RiskSignal {
  id: string;
  label: string;
  level: SignalLevel;
  /** Why this level, in the reader's terms. Always states the measured figure. */
  detail: string;
}

export type RiskBand = "elevated" | "mixed" | "no-elevated" | "insufficient";

export interface Coverage {
  /** Checks the report answered with a real value. */
  measured: number;
  /** Checks defined by the schema. */
  total: number;
  /** Checks Lattice has not shipped yet. */
  unimplemented: number;
  /** Checks that exist, but the indexer had no data for this token. */
  noData: number;
}

export interface RiskAssessment {
  band: RiskBand;
  /** Short verdict line. Never the word "safe". */
  headline: string;
  /** One sentence qualifying the verdict against what was not measured. */
  qualifier: string;
  signals: RiskSignal[];
  counts: Record<SignalLevel, number>;
  coverage: Coverage;
}

/** Checks in the schema, and how many are not yet implemented. */
const SCHEMA_TOTAL = 17;
const SCHEMA_UNIMPLEMENTED = 6;

function finite(value: number | null | undefined): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function money(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/* --------------------------------------------------------------- signals */

function liquidityFloor(m: TokenMetrics): RiskSignal {
  const label = "Liquidity Depth";
  const liq = finite(m.liquidityUsd);
  if (liq === undefined) {
    return {
      id: "liquidity-floor",
      label,
      level: "unknown",
      detail: "No liquidity reading from the indexer.",
    };
  }
  if (liq < 10_000) {
    return {
      id: "liquidity-floor",
      label,
      level: "critical",
      detail: `Only ${money(liq)} pooled — any meaningful position moves the price, and exiting may not be possible.`,
    };
  }
  if (liq < 50_000) {
    return {
      id: "liquidity-floor",
      label,
      level: "caution",
      detail: `${money(liq)} pooled — thin. Expect slippage on all but small orders.`,
    };
  }
  return {
    id: "liquidity-floor",
    label,
    level: "clear",
    detail: `${money(liq)} pooled — deep enough for ordinary orders.`,
  };
}

function liquidityRatio(m: TokenMetrics): RiskSignal {
  const label = "Liquidity vs Market Cap";
  const liq = finite(m.liquidityUsd);
  const mc = finite(m.marketCap);
  if (liq === undefined || mc === undefined || mc <= 0) {
    return {
      id: "liquidity-ratio",
      label,
      level: "unknown",
      detail: "Needs both a liquidity and a market-cap reading.",
    };
  }
  const ratio = (liq / mc) * 100;
  const shown = `${ratio.toFixed(2)}% of market cap sits in the pool`;
  if (ratio < 2) {
    return {
      id: "liquidity-ratio",
      label,
      level: "critical",
      detail: `${shown} — the valuation far exceeds the money backing it. A modest sell can collapse the price.`,
    };
  }
  if (ratio < 5) {
    return {
      id: "liquidity-ratio",
      label,
      level: "caution",
      detail: `${shown} — below the range where a market cap is well supported.`,
    };
  }
  return {
    id: "liquidity-ratio",
    label,
    level: "clear",
    detail: `${shown} — proportionate.`,
  };
}

function concentration(m: TokenMetrics, chain?: OnchainReading): RiskSignal {
  const label = "Top-10 Concentration";
  const top10 = finite(m.top10HoldersPct);
  if (top10 === undefined) {
    return {
      id: "concentration",
      label,
      level: "unknown",
      detail: "The indexer returned no holder-distribution data for this token.",
    };
  }

  /**
   * The indexer's top-N counts the pool as a holder. Once the pooled share is
   * measured on chain, a top-10 figure that is mostly liquidity is downgraded
   * rather than fired as concentration — otherwise a perfectly ordinary token
   * gets a critical flag for having deep liquidity.
   */
  const pooled = chain?.float?.pooledPct;
  if (pooled !== undefined && top10 - pooled < 25) {
    return {
      id: "concentration",
      label,
      level: pooled >= top10 - 5 ? "clear" : "caution",
      detail: `Top 10 hold ${top10.toFixed(1)}%, but ${pooled.toFixed(1)}% of that is the liquidity pool. Roughly ${Math.max(0, top10 - pooled).toFixed(1)}% sits with ordinary wallets.`,
    };
  }

  // The caveat that these may include LP, CEX or burn addresses is stated once on
  // the panel header rather than repeated inside every concentration message.
  if (top10 > 50) {
    return {
      id: "concentration",
      label,
      level: "critical",
      detail: `Top 10 wallets hold ${top10.toFixed(1)}% — a handful of addresses could clear the pool.`,
    };
  }
  if (top10 > 30) {
    return {
      id: "concentration",
      label,
      level: "caution",
      detail: `Top 10 wallets hold ${top10.toFixed(1)}% — concentrated.`,
    };
  }
  return {
    id: "concentration",
    label,
    level: "clear",
    detail: `Top 10 wallets hold ${top10.toFixed(1)}% — distributed.`,
  };
}

/**
 * Deployer holdings only mean something once a creator address is identified.
 * The Codex mapping defaults holdings to 0 when the upstream field is absent, so
 * treating that 0 as a reading would be the same handwave `buildReport.ts` guards
 * against.
 */
function devHoldings(m: TokenMetrics): RiskSignal {
  const label = "Deployer Holdings";
  const hasCreator = typeof m.creatorAddress === "string" && m.creatorAddress.length > 0;
  const dev = finite(m.devHoldingsPct);
  if (!hasCreator || dev === undefined) {
    return {
      id: "dev-holdings",
      label,
      level: "unknown",
      detail: "No deployer address identified, so deployer holdings cannot be attributed.",
    };
  }
  if (dev > 10) {
    return {
      id: "dev-holdings",
      label,
      level: "critical",
      detail: `Deployer holds ${dev.toFixed(1)}% of supply — enough to move the market alone.`,
    };
  }
  if (dev > 5) {
    return {
      id: "dev-holdings",
      label,
      level: "caution",
      detail: `The deployer wallet holds ${dev.toFixed(2)}% of supply.`,
    };
  }
  return {
    id: "dev-holdings",
    label,
    level: "clear",
    detail: `The deployer wallet holds ${dev.toFixed(2)}% of supply.`,
  };
}

function devSelling(m: TokenMetrics): RiskSignal {
  const label = "Deployer Activity";
  const hasCreator = typeof m.creatorAddress === "string" && m.creatorAddress.length > 0;
  if (!hasCreator) {
    return {
      id: "dev-selling",
      label,
      level: "unknown",
      detail: "No deployer address identified.",
    };
  }
  const buys = finite(m.devBuys) ?? 0;
  const sells = finite(m.devSells) ?? 0;
  if (sells > 0 && sells >= buys) {
    return {
      id: "dev-selling",
      label,
      level: "critical",
      detail: `Deployer: ${sells} sells against ${buys} buys — net distribution into the market.`,
    };
  }
  if (sells > 0) {
    return {
      id: "dev-selling",
      label,
      level: "caution",
      detail: `Deployer has sold ${sells}x against ${buys} buys.`,
    };
  }
  return {
    id: "dev-selling",
    label,
    level: "clear",
    detail: `No deployer sells recorded, against ${plural(buys, "buy")}.`,
  };
}

function tradeSkew(m: TokenMetrics): RiskSignal {
  const label = "24H Order Flow";
  const buys = finite(m.buys24h);
  const sells = finite(m.sells24h);
  if (buys === undefined || sells === undefined || buys + sells === 0) {
    return {
      id: "trade-skew",
      label,
      level: "unknown",
      detail: "No transactions recorded in the last 24 hours.",
    };
  }
  if (sells > buys * 3) {
    return {
      id: "trade-skew",
      label,
      level: "critical",
      detail: `${sells} sells against ${buys} buys — heavily one-sided.`,
    };
  }
  if (sells > buys * 1.5) {
    return {
      id: "trade-skew",
      label,
      level: "caution",
      detail: `${sells} sells against ${buys} buys — sell-weighted.`,
    };
  }
  return {
    id: "trade-skew",
    label,
    level: "clear",
    detail: `${buys} buys against ${sells} sells — balanced or buy-weighted.`,
  };
}

function pairAge(m: TokenMetrics): RiskSignal {
  const label = "Pair Age";
  const created = finite(m.pairCreatedAt);
  if (created === undefined || created <= 0) {
    return {
      id: "pair-age",
      label,
      level: "unknown",
      detail: "The indexer did not report when this pair was created.",
    };
  }
  const hours = (Date.now() - created) / 3_600_000;
  if (hours < 24) {
    return {
      id: "pair-age",
      label,
      level: "caution",
      detail: `Pair is ${Math.max(0, Math.round(hours))}h old — too little history to judge behaviour.`,
    };
  }
  if (hours < 168) {
    return {
      id: "pair-age",
      label,
      level: "caution",
      detail: `Pair is ${Math.round(hours / 24)}d old — inside the window where most rug events happen.`,
    };
  }
  return {
    id: "pair-age",
    label,
    level: "clear",
    detail: `Pair has existed ${Math.round(hours / 24)} days.`,
  };
}

function turnover(m: TokenMetrics): RiskSignal {
  const label = "Turnover";
  const vol = finite(m.volume24h);
  const liq = finite(m.liquidityUsd);
  if (vol === undefined || liq === undefined || liq <= 0) {
    return {
      id: "turnover",
      label,
      level: "unknown",
      detail: "Needs both a volume and a liquidity reading.",
    };
  }
  const turns = vol / liq;
  if (turns > 10) {
    return {
      id: "turnover",
      label,
      level: "caution",
      detail: `24h volume is ${turns.toFixed(1)}x the pool — could be real demand or wash trading, not yet distinguishable.`,
    };
  }
  if (turns < 0.01) {
    return {
      id: "turnover",
      label,
      level: "caution",
      detail: `24h volume is ${(turns * 100).toFixed(2)}% of the pool — effectively untraded.`,
    };
  }
  return {
    id: "turnover",
    label,
    level: "clear",
    detail: `24h volume is ${turns.toFixed(2)}x the pool — an ordinary range.`,
  };
}

function drawdown(m: TokenMetrics): RiskSignal {
  const label = "Drawdown From ATH";
  const ath = finite(m.athPrice);
  const now = finite(m.priceUsd);
  if (ath === undefined || now === undefined || ath <= 0) {
    return {
      id: "drawdown",
      label,
      level: "unknown",
      detail: "No all-time-high reading available from the indexer.",
    };
  }
  const down = Math.max(0, (1 - now / ath) * 100);
  if (down > 90) {
    return {
      id: "drawdown",
      label,
      level: "caution",
      detail: `Down ${down.toFixed(1)}% from its all-time high.`,
    };
  }
  return {
    id: "drawdown",
    label,
    level: "clear",
    detail: `Down ${down.toFixed(1)}% from its all-time high.`,
  };
}

/* ------------------------------------------------------- on-chain signals */

/**
 * Upgradeability, which conditions everything else in the report.
 *
 * If the admin can swap the implementation, every other finding describes code
 * that may not be the code running tomorrow.
 */
function upgradeable(chain?: OnchainReading): RiskSignal {
  const label = "Upgradeability";
  const proxy = chain?.proxy;
  if (!proxy) {
    return {
      id: "upgradeable",
      label,
      level: "unknown",
      detail: "Proxy storage slots were not read.",
    };
  }
  if (proxy.isProxy) {
    return {
      id: "upgradeable",
      label,
      level: "critical",
      detail: `Upgradeable ${proxy.standard === "eip1822" ? "UUPS" : "EIP-1967"} proxy. The admin can replace the contract's logic, so every other finding here describes code that can be swapped.`,
    };
  }
  return {
    id: "upgradeable",
    label,
    level: "clear",
    detail: "Not an upgradeable proxy — the deployed logic is fixed.",
  };
}

/** Free float, measured on chain rather than inferred from an indexer's top-N. */
function floatShare(chain?: OnchainReading): RiskSignal {
  const label = "Free Float";
  const f = chain?.float;
  if (!f) {
    return { id: "float", label, level: "unknown", detail: "Supply split was not read from chain." };
  }
  if (f.pooledUnknown || f.floatPct === undefined || f.pooledPct === undefined) {
    return {
      id: "float",
      label,
      level: "unknown",
      detail:
        "The pool holds no balance at the address the indexer gave, which is what a Uniswap v4 pool id looks like — its liquidity lives in a shared PoolManager. The tradeable share cannot be measured this way.",
    };
  }
  const detail = `${f.floatPct.toFixed(1)}% of supply can actually trade — ${f.pooledPct.toFixed(1)}% sits in the pool${f.burnedPct > 0.01 ? `, ${f.burnedPct.toFixed(1)}% burned` : ""}.`;
  if (f.floatPct < 5) {
    return {
      id: "float",
      label,
      level: "critical",
      detail: `${detail} Almost nothing is tradeable, so quoted market cap is not backed by a real market.`,
    };
  }
  if (f.floatPct < 15) {
    return { id: "float", label, level: "caution", detail };
  }
  return { id: "float", label, level: "clear", detail };
}

/**
 * Deployer holdings against float, not against total supply.
 *
 * Measured against total supply, a deployer holding looks small purely because
 * most of supply is locked in the pool. Against what can actually trade, the
 * same position may dominate the market.
 */
function deployerVsFloat(chain?: OnchainReading): RiskSignal {
  const label = "Deployer vs Float";
  const f = chain?.float;
  // Falls back to share-of-supply when the pooled balance is unknown, rather
  // than dropping the signal entirely — the chain-read holding is still worth
  // reporting, just against a different denominator.
  const pct = f?.deployerPctOfFloat ?? f?.deployerPctOfSupply;
  const basis = f?.deployerPctOfFloat !== undefined ? "tradeable float" : "total supply";
  if (pct === undefined) {
    return {
      id: "deployer-float",
      label,
      level: "unknown",
      detail: "No deployer address identified, so its holdings cannot be attributed.",
    };
  }
  const detail = `The deployer holds ${pct.toFixed(2)}% of ${basis}, read from chain.`;
  if (pct > 20) {
    return { id: "deployer-float", label, level: "critical", detail: `${detail} Enough to dictate the market.` };
  }
  if (pct > 8) {
    return { id: "deployer-float", label, level: "caution", detail };
  }
  return { id: "deployer-float", label, level: "clear", detail };
}

/** Result of the transfer simulation. */
function sellTest(chain?: OnchainReading): RiskSignal {
  const label = "Transfer Test";
  const sell = chain?.sell;
  if (!sell || sell.balanceSlot === undefined) {
    return {
      id: "sell-test",
      label,
      level: "unknown",
      detail:
        "The token's balance storage layout could not be resolved, so no transfer was simulated.",
    };
  }
  if (!sell.transferOk) {
    return {
      id: "sell-test",
      label,
      level: "critical",
      detail: "A simulated transfer reverted. Holders may be unable to move this token at all.",
    };
  }
  if (sell.sellOk === false) {
    return {
      id: "sell-test",
      label,
      level: "critical",
      detail:
        "An ordinary transfer succeeded but a transfer into the pool reverted — the classic sell-blocked shape.",
    };
  }
  return {
    id: "sell-test",
    label,
    level: "clear",
    detail: "A transfer simulated successfully at the current block. Not a guarantee of future behaviour.",
  };
}

/** Rug levers found in the deployed bytecode. */
function contractLevers(chain?: OnchainReading): RiskSignal {
  const label = "Contract Levers";
  const code = chain?.bytecode;
  if (!code) {
    return { id: "levers", label, level: "unknown", detail: "Bytecode was not read." };
  }
  if (code.levers.length === 0) {
    return {
      id: "levers",
      label,
      level: "clear",
      detail: `No mint, pause or blacklist selectors found in ${code.sizeBytes.toLocaleString("en-US")} bytes of bytecode.`,
    };
  }
  const serious = code.hasMint || code.hasPause || code.hasBlacklist;
  return {
    id: "levers",
    label,
    level: serious ? "caution" : "clear",
    // Present, not callable — the distinction matters and is stated.
    detail: `Present in bytecode: ${code.levers.join(", ")}. Whether these are callable, and by whom, was not determined.`,
  };
}

/** Ownership, keeping "no owner function" distinct from "renounced". */
function ownership(chain?: OnchainReading): RiskSignal {
  const label = "Ownership";
  const owner = chain?.owner;
  if (!owner) {
    return { id: "ownership", label, level: "unknown", detail: "Ownership was not read." };
  }
  if (owner.kind === "renounced") {
    return { id: "ownership", label, level: "clear", detail: "Ownership renounced to the zero address." };
  }
  if (owner.kind === "owned") {
    return {
      id: "ownership",
      label,
      level: "caution",
      detail: `Owned by ${owner.owner.slice(0, 6)}…${owner.owner.slice(-4)}. Owner-only functions remain callable.`,
    };
  }
  return {
    id: "ownership",
    label,
    level: "unknown",
    detail:
      "No owner-style function responded. That is not a renouncement — a role-based contract can still have a live admin.",
  };
}

/* -------------------------------------------------------------- coverage */

/**
 * How much of the schema this report actually answered.
 *
 * Read off the report when the backend supplies one; otherwise inferred from
 * which metric fields carry real values, which is the honest fallback while the
 * frontend runs ahead of the API.
 */
export function coverageOf(
  metrics: TokenMetrics,
  report?: VerificationReport,
  chain?: OnchainReading
): Coverage {
  /**
   * On-chain reads sit outside the report schema, so they are counted alongside
   * it. Without this the coverage line would understate what actually ran and
   * keep implying the contract was never inspected.
   */
  const chainChecks = [
    chain?.proxy !== undefined,
    chain?.owner !== undefined && chain.owner.kind !== "no_owner_function",
    chain?.bytecode !== undefined,
    chain?.float !== undefined,
    chain?.sell?.balanceSlot !== undefined,
  ];
  const chainMeasured = chainChecks.filter(Boolean).length;
  const chainTotal = chainChecks.length;

  if (report) {
    const checks = Object.values(report.checks);
    const measured = checks.filter((c) => isAvailable(c)).length;
    const unimplemented = checks.filter(
      (c) => !isAvailable(c) && c.reason === "not_implemented"
    ).length;
    const total = checks.length + chainTotal;
    return {
      measured: measured + chainMeasured,
      total,
      unimplemented,
      noData: total - measured - chainMeasured - unimplemented,
    };
  }

  const measured = [
    metrics.priceUsd,
    metrics.marketCap,
    metrics.fdv,
    metrics.liquidityUsd,
    metrics.volume24h,
    metrics.priceChange24h,
    metrics.buys24h ?? metrics.sells24h,
    metrics.holdersCount,
    metrics.top10HoldersPct,
    metrics.creatorAddress ? metrics.devHoldingsPct : undefined,
    metrics.creatorAddress ? metrics.devBuys ?? metrics.devSells : undefined,
  ].filter((v) => v !== undefined && v !== null && Number.isFinite(Number(v))).length;

  return {
    measured,
    total: SCHEMA_TOTAL,
    unimplemented: SCHEMA_UNIMPLEMENTED,
    noData: Math.max(0, SCHEMA_TOTAL - SCHEMA_UNIMPLEMENTED - measured),
  };
}

/* ------------------------------------------------------------ assessment */

export function assessRisk(
  metrics: TokenMetrics,
  report?: VerificationReport,
  chain?: OnchainReading
): RiskAssessment {
  const signals = [
    // Contract-level first: these condition how much the market signals are worth.
    upgradeable(chain),
    sellTest(chain),
    ownership(chain),
    contractLevers(chain),
    floatShare(chain),
    deployerVsFloat(chain),
    // Market and distribution.
    liquidityFloor(metrics),
    liquidityRatio(metrics),
    concentration(metrics, chain),
    devHoldings(metrics),
    devSelling(metrics),
    tradeSkew(metrics),
    pairAge(metrics),
    turnover(metrics),
    drawdown(metrics),
  ];

  const counts: Record<SignalLevel, number> = {
    critical: 0,
    caution: 0,
    clear: 0,
    unknown: 0,
  };
  for (const signal of signals) counts[signal.level] += 1;

  const coverage = coverageOf(metrics, report, chain);
  const evaluated = counts.critical + counts.caution + counts.clear;

  let band: RiskBand;
  if (evaluated < 3) band = "insufficient";
  else if (counts.critical > 0) band = "elevated";
  else if (counts.caution >= 2) band = "mixed";
  else band = "no-elevated";

  const headline: Record<RiskBand, string> = {
    elevated: `Elevated Risk — ${plural(counts.critical, "Critical Signal")}`,
    mixed: `Mixed Signals — ${plural(counts.caution, "Caution")}`,
    "no-elevated": "No Elevated Signals In What Was Measured",
    insufficient: "Insufficient Data To Assess",
  };

  // Not optional, by design. The verdict is never allowed to stand on its own.
  const qualifier =
    coverage.unimplemented > 0
      ? `${coverage.measured} of ${coverage.total} checks measured. ${coverage.unimplemented} contract-security checks are not implemented yet — this is not a safety clearance.`
      : `${coverage.measured} of ${coverage.total} checks measured.`;

  return { band, headline: headline[band], qualifier, signals, counts, coverage };
}
