"use client";

import React, { useState } from "react";
import { ArrowUpRight, Loader2, Search } from "lucide-react";
import { ACCENT } from "@/lib/brand";
import { runAudit, type TokenMetrics } from "@/lib/api";
import { explorerTokenUrl } from "@/lib/chains";
import { useSession } from "@/components/auth/session-provider";
import { useToast } from "@/components/ui/toast";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

const usd = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: digits,
  }).format(value);

const price = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 8 : 4,
  }).format(value);

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border border-black/10 bg-white p-5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-black/55">
        {label}
      </span>
      <p
        className="mt-2 text-lg font-semibold tracking-tight text-black md:text-xl"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

/** The gated product surface: a token contract in, a structured report out. */
export function AuditConsole() {
  const { session } = useSession();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TokenMetrics | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);

    try {
      // A bare contract address skips the Groq intent parse on the backend.
      const input = EVM_ADDRESS.test(trimmed) ? { address: trimmed } : { message: trimmed };
      const audit = await runAudit(input, session?.token);
      setResult(audit.metrics);
    } catch (err) {
      // Keep the previous report on screen — replacing a good result with an
      // empty panel loses information the user may still be reading.
      toast.fromError(err);
    } finally {
      setLoading(false);
    }
  }

  const change = result?.priceChange24h ?? 0;

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-3 border border-black/15 bg-white px-4">
          <Search className="h-4 w-4 shrink-0 text-black/45" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="0x… contract address, or ask in plain English"
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-transparent py-4 font-mono text-xs text-black outline-none placeholder:font-sans placeholder:uppercase placeholder:tracking-widest placeholder:text-black/55 sm:text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-[11px] font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: ACCENT }}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Reading Chain" : "Run Audit"}
        </button>
      </form>

      {result && (
        <div className="space-y-px">
          <div className="flex flex-wrap items-end justify-between gap-4 border border-black/10 bg-white p-6 md:p-8">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-black/55">
                {result.dexId}
              </span>
              <h3
                className="mt-2 uppercase text-black"
                style={{ fontSize: "clamp(1.5rem, 4vw, 2.75rem)", lineHeight: 1, fontWeight: 600 }}
              >
                {result.name}
              </h3>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-black/60">
                {result.symbol} · {price(result.priceUsd)}
              </p>
            </div>

            <a
              href={explorerTokenUrl(result.address)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm uppercase tracking-wide"
              style={{ color: ACCENT, fontWeight: 600 }}
            >
              View On Explorer
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="grid gap-px bg-black/10 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Market Cap" value={usd(result.marketCap, 0)} />
            <Metric label="FDV" value={usd(result.fdv, 0)} />
            <Metric label="Liquidity" value={usd(result.liquidityUsd, 0)} />
            <Metric label="Volume 24H" value={usd(result.volume24h, 0)} />
            <Metric
              label="Price Change 24H"
              value={`${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
              accent={change >= 0 ? ACCENT : "#B91C1C"}
            />
            <Metric label="Buys / Sells 24H" value={`${result.buys24h} / ${result.sells24h}`} />
            {result.creatorAddress && (
              <Metric
                label="Dev Wallet"
                value={`${result.creatorAddress.slice(0, 6)}...${result.creatorAddress.slice(-4)} (${result.devHoldingsPct !== undefined ? result.devHoldingsPct.toFixed(1) : "0"}% · 🟢${result.devBuys || 0}/🔴${result.devSells || 0})`}
              />
            )}
          </div>

          <div className="border border-black/10 bg-white p-6 md:p-8">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-black/55">
              Contract
            </span>
            <p className="mt-2 break-all font-mono text-xs text-black/70">{result.address}</p>

            {(result.twitter || result.telegram || result.websites?.length) && (
              <div className="mt-5 flex flex-wrap gap-4">
                {result.websites?.slice(0, 2).map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-semibold uppercase tracking-widest text-black hover:opacity-60"
                  >
                    Website
                  </a>
                ))}
                {result.twitter && (
                  <a
                    href={result.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-semibold uppercase tracking-widest text-black hover:opacity-60"
                  >
                    X
                  </a>
                )}
                {result.telegram && (
                  <a
                    href={result.telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-semibold uppercase tracking-widest text-black hover:opacity-60"
                  >
                    Telegram
                  </a>
                )}
              </div>
            )}

            <p className="mt-6 text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/55">
              Read-only. Market data via DexScreener. Not financial advice — always DYOR.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
