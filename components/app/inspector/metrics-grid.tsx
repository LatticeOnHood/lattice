"use client";

/**
 * Every measured figure for a token, in one dense grid.
 *
 * This replaces the previous Market and Distribution panels, which between them
 * rendered fifteen full-height tiles across two headed sections. The audit that
 * produced this list:
 *
 *  - Price and 24h change moved into the header, where the identity already is.
 *  - FDV lost its own tile. It equals market cap unless the indexer reports a
 *    distinct total supply, so it is now an annotation on market cap and appears
 *    only when the two genuinely differ.
 *  - ATH and ATL lost their tiles. Drawdown is already stated as a flag, in the
 *    words that matter ("down 95% from its high"), and the raw extrema were
 *    decoration next to it.
 *  - Transactions merged into the volume cell — they are the same question.
 *  - DEX venue moved to the header eyebrow.
 *  - Liquidity as a share of market cap was added, because it is the figure the
 *    critical liquidity flag is actually computed from and it was not shown.
 *
 * Net: fifteen tiles down to eight cells, and the one derived number that drives
 * the verdict is now visible.
 */

import React from "react";
import { isAvailable, type TokenMetrics, type VerificationReport } from "@/lib/api";
import { age, count, pct, shortAddress, usd } from "@/lib/inspector/format";
import { Stat, StatAbsent } from "./stat";

const DANGER = "#B91C1C";
const WARN = "#B45309";

function num(value: number | null | undefined): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Prefers the report's reading, falls back to the raw metric.
 *
 * The report is authoritative when present: if it says a check is unavailable,
 * the raw field is not shown even when it carries a number.
 */
function reading(
  check: { available: boolean; value?: unknown } | undefined,
  fallback: number | undefined
): number | undefined {
  if (check) return isAvailable(check as never) ? num((check as { value: number }).value) : undefined;
  return fallback;
}

export function MetricsGrid({
  metrics,
  report,
}: {
  metrics: TokenMetrics;
  report?: VerificationReport;
}) {
  const checks = report?.checks;

  const marketCap = reading(checks?.marketCap, num(metrics.marketCap));
  const liquidity = reading(checks?.liquidityUsd, num(metrics.liquidityUsd));
  const volume = reading(checks?.volume24h, num(metrics.volume24h));
  const holders = reading(checks?.holderCount, num(metrics.holdersCount));
  const top10 = reading(checks?.top10HoldersPct, num(metrics.top10HoldersPct));

  const hasCreator =
    typeof metrics.creatorAddress === "string" && metrics.creatorAddress.length > 0;
  const devHoldings = reading(
    checks?.devHoldingsPct,
    hasCreator ? num(metrics.devHoldingsPct) : undefined
  );

  const fdv = num(metrics.fdv);
  const fdvDiffers =
    fdv !== undefined &&
    marketCap !== undefined &&
    marketCap > 0 &&
    Math.abs(fdv - marketCap) / marketCap > 0.01;

  const liqShare =
    liquidity !== undefined && marketCap !== undefined && marketCap > 0
      ? (liquidity / marketCap) * 100
      : undefined;

  const txns = `🟢 ${count(metrics.buys24h)} / 🔴 ${count(metrics.sells24h)}`;
  const pairAge = age(metrics.pairCreatedAt);

  return (
    <section className="border border-black/10 bg-white">
      <div className="grid grid-cols-2 gap-px bg-black/10 sm:grid-cols-3 lg:grid-cols-4 [&>*]:bg-white">
        {marketCap !== undefined ? (
          <Stat
            label="Market Cap"
            value={usd(marketCap)}
            note={fdvDiffers ? `FDV ${usd(fdv)}` : undefined}
          />
        ) : (
          <StatAbsent label="Market Cap" />
        )}

        {liquidity !== undefined ? (
          <Stat
            label="Liquidity"
            value={usd(liquidity)}
            note={liqShare !== undefined ? `${liqShare.toFixed(2)}% of mcap` : undefined}
            accent={liqShare !== undefined && liqShare < 2 ? DANGER : undefined}
          />
        ) : (
          <StatAbsent label="Liquidity" />
        )}

        {volume !== undefined ? (
          <Stat label="Volume 24H" value={usd(volume)} note={txns} />
        ) : (
          <StatAbsent label="Volume 24H" />
        )}

        {pairAge !== "—" ? (
          <Stat label="Pair Age" value={pairAge} />
        ) : (
          <StatAbsent label="Pair Age" note="Not reported" />
        )}

        {holders !== undefined ? (
          <Stat label="Holders" value={count(holders)} />
        ) : (
          <StatAbsent label="Holders" />
        )}

        {top10 !== undefined ? (
          <Stat
            label="Top-10 Held"
            value={pct(top10, 1)}
            accent={top10 > 50 ? DANGER : top10 > 30 ? WARN : undefined}
          />
        ) : (
          <StatAbsent label="Top-10 Held" />
        )}

        {devHoldings !== undefined ? (
          <Stat
            label="Deployer Held"
            value={pct(devHoldings, 1)}
            note={`🟢 ${metrics.devBuys ?? 0} / 🔴 ${metrics.devSells ?? 0}`}
            accent={devHoldings > 10 ? DANGER : devHoldings > 5 ? WARN : undefined}
          />
        ) : (
          <StatAbsent label="Deployer Held" note="No deployer found" />
        )}

        {hasCreator ? (
          <Stat label="Deployer" value={shortAddress(metrics.creatorAddress)} />
        ) : (
          <StatAbsent label="Deployer" note="Not identified" />
        )}
      </div>
    </section>
  );
}
