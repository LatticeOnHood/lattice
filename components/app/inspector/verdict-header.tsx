"use client";

/**
 * Identity, price, verdict and coverage — in one block.
 *
 * The earlier version spent a tall card on identity and then a second block on
 * the verdict, with a legended three-segment coverage chart under it. All of it
 * is still here, at roughly a third of the height: the coverage meter is a single
 * bar with its numbers inline, and the links are one row rather than a column.
 */

import React from "react";
import { ArrowUpRight, Check as CheckIcon, Copy, RefreshCw } from "lucide-react";
import { ACCENT } from "@/lib/brand";
import { explorerTokenUrl } from "@/lib/chains";
import type { TokenMetrics } from "@/lib/api";
import type { RiskAssessment, RiskBand } from "@/lib/inspector/risk";
import { price, shortAddress, signedPct } from "@/lib/inspector/format";

const DANGER = "#B91C1C";

const BAND_COLOR: Record<RiskBand, string> = {
  elevated: DANGER,
  mixed: "#B45309",
  "no-elevated": ACCENT,
  insufficient: "#52525B",
};

function useCopy(value: string) {
  const [copied, setCopied] = React.useState(false);

  const copy = React.useCallback(() => {
    void navigator.clipboard
      .writeText(value)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }, [value]);

  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return { copied, copy };
}

const LINK =
  "inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest hover:opacity-70";

export function VerdictHeader({
  metrics,
  assessment,
  isRefreshing,
  onRefresh,
}: {
  metrics: TokenMetrics;
  assessment: RiskAssessment;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const { copied, copy } = useCopy(metrics.address);
  const change = metrics.priceChange24h ?? 0;
  const band = BAND_COLOR[assessment.band];
  const { measured, total, unimplemented } = assessment.coverage;

  return (
    <section className="border border-black/10 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-4 pt-5 md:px-8">
        <div className="min-w-0">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-black/45">
            {metrics.dexId} · Robinhood Chain
          </span>

          {/* h2: the page already owns the h1. */}
          <h2
            id="inspector-result-heading"
            tabIndex={-1}
            className="mt-1.5 uppercase text-black outline-none"
            style={{ fontSize: "clamp(1.25rem, 3vw, 1.85rem)", lineHeight: 1.05, fontWeight: 600 }}
          >
            {metrics.name}
          </h2>

          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-black/60">
            {metrics.symbol} · {price(metrics.priceUsd)} ·{" "}
            <span style={{ color: change >= 0 ? ACCENT : DANGER }}>{signedPct(change, 1)} 24H</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 border border-black/15 px-3 py-2 text-[9px] font-semibold uppercase tracking-widest text-black/55 transition-colors hover:border-black/40 hover:text-black disabled:opacity-40"
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden />
          {isRefreshing ? "Reading" : "Re-read"}
        </button>
      </div>

      {/* Address and outbound links, one row. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-black/10 px-6 py-2.5 md:px-8">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] text-black/60 transition-colors hover:text-black"
          aria-label={`Copy contract address ${metrics.address}`}
        >
          {shortAddress(metrics.address)}
          {copied ? (
            <CheckIcon className="h-3 w-3" style={{ color: ACCENT }} />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
        <span aria-live="polite" className="sr-only">
          {copied ? "Contract address copied" : ""}
        </span>

        <a
          href={explorerTokenUrl(metrics.address)}
          target="_blank"
          rel="noreferrer"
          className={LINK}
          style={{ color: ACCENT }}
        >
          Explorer <ArrowUpRight className="h-3 w-3" />
        </a>

        {metrics.pairAddress && (
          <a
            href={`https://dexscreener.com/${metrics.dexId || "uniswap"}/${metrics.pairAddress}`}
            target="_blank"
            rel="noreferrer"
            className={LINK}
            style={{ color: ACCENT }}
          >
            Pair <ArrowUpRight className="h-3 w-3" />
          </a>
        )}

        {metrics.twitter && (
          <a href={metrics.twitter} target="_blank" rel="noreferrer" className={`${LINK} text-black/50`}>
            X
          </a>
        )}
        {metrics.telegram && (
          <a href={metrics.telegram} target="_blank" rel="noreferrer" className={`${LINK} text-black/50`}>
            Telegram
          </a>
        )}
      </div>

      {/* Verdict and the coverage it rests on. */}
      <div className="border-t border-black/10 px-6 py-4 md:px-8">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className="text-[11px] font-semibold uppercase tracking-widest md:text-xs"
            style={{ color: band }}
          >
            {assessment.headline}
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-black/45">
            {measured}/{total} checks measured
            {unimplemented > 0 ? ` · ${unimplemented} not implemented` : ""}
          </span>
        </div>

        <div
          className="mt-2.5 flex h-1 w-full overflow-hidden bg-black/10"
          role="img"
          aria-label={`${measured} of ${total} checks measured`}
        >
          <span style={{ width: `${(measured / Math.max(1, total)) * 100}%`, backgroundColor: band }} />
        </div>
      </div>
    </section>
  );
}
