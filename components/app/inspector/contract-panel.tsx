"use client";

/**
 * What the contract itself says, read directly from chain.
 *
 * This is the section that did not exist before: upgradeability, ownership,
 * bytecode levers, a simulated transfer, and — the one that changes how every
 * other number should be read — how much of supply can actually trade rather
 * than sitting in the pool.
 */

import React from "react";
import { ArrowUpRight, Check, Minus, ShieldAlert, ShieldCheck } from "lucide-react";
import { ACCENT } from "@/lib/brand";
import { explorerAddressUrl } from "@/lib/chains";
import type { OnchainReading } from "@/lib/api";
import { pct, shortAddress } from "@/lib/inspector/format";

const DANGER = "#B91C1C";
const WARN = "#B45309";
const MUTED = "#71717A";

type Tone = "good" | "warn" | "bad" | "unknown";

const TONE_COLOR: Record<Tone, string> = {
  good: ACCENT,
  warn: WARN,
  bad: DANGER,
  unknown: MUTED,
};

function Finding({
  label,
  value,
  tone,
  note,
  href,
}: {
  label: string;
  value: string;
  tone: Tone;
  note?: string;
  href?: string;
}) {
  const Icon = tone === "unknown" ? Minus : tone === "good" ? ShieldCheck : ShieldAlert;

  return (
    <div className="flex gap-3 px-6 py-3.5 md:px-8">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: TONE_COLOR[tone] }} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-black/55">
            {label}
          </span>
          <span
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: TONE_COLOR[tone] }}
          >
            {value}
          </span>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-widest hover:opacity-70"
              style={{ color: ACCENT }}
            >
              View <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
        </div>
        {note && (
          <p className="mt-1 text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/40">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Supply split as a single proportional bar.
 *
 * The point it makes visually: on most tokens the largest "holder" is the pool,
 * so a raw concentration percentage is measuring liquidity, not control.
 */
function SupplyBar({ chain }: { chain: OnchainReading }) {
  const f = chain.float;
  if (!f) return null;

  // A v4 pool id holds no balance, so the split genuinely cannot be measured.
  // Saying so beats drawing a bar that implies nothing is pooled.
  if (f.pooledUnknown || f.floatPct === undefined || f.pooledPct === undefined) {
    return (
      <div className="border-t border-black/10 px-6 py-4 md:px-8">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/55">
          Supply Split
        </span>
        <p className="mt-2 max-w-2xl text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/40">
          Not measurable for this pool. The address the indexer reports holds none of the token,
          which is how a Uniswap v4 pool id reads — its liquidity sits in a shared PoolManager.
          {f.deployerPctOfSupply !== undefined &&
            ` Deployer holds ${pct(f.deployerPctOfSupply, 2)} of total supply.`}
        </p>
      </div>
    );
  }

  const segments = [
    { label: "Pooled", value: f.pooledPct, color: "rgba(9,29,233,0.35)" },
    { label: "Burned", value: f.burnedPct, color: "rgba(0,0,0,0.55)" },
    { label: "Free float", value: f.floatPct, color: ACCENT },
  ].filter((s) => s.value > 0.01);

  return (
    <div className="border-t border-black/10 px-6 py-4 md:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/55">
          Supply Split
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-widest text-black/40">
          Read from chain, not inferred
        </span>
      </div>

      <div className="mt-3 flex h-1.5 w-full overflow-hidden bg-black/10">
        {segments.map((s) => (
          <span key={s.label} style={{ width: `${s.value}%`, backgroundColor: s.color }} />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[9px] font-semibold uppercase tracking-widest text-black/50">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-3" style={{ backgroundColor: s.color }} />
            {s.label} {pct(s.value, 1)}
          </span>
        ))}
      </div>

      {f.deployerPctOfFloat !== undefined && (
        <p className="mt-3 text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/45">
          Deployer holds {pct(f.deployerPctOfFloat, 2)} of the tradeable float — the share that
          matters, rather than of total supply.
        </p>
      )}
    </div>
  );
}

export function ContractPanel({ chain }: { chain?: OnchainReading }) {
  if (!chain) return null;

  const proxy = chain.proxy;
  const owner = chain.owner;
  const code = chain.bytecode;
  const sell = chain.sell;

  return (
    <section className="border border-black/10 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-black/10 px-6 py-3.5 md:px-8">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-black">
          Contract
        </h3>
        <span className="text-[9px] font-semibold uppercase tracking-widest text-black/40">
          {chain.blockNumber ? `Read at block ${Number(chain.blockNumber).toLocaleString("en-US")}` : "Direct chain reads"}
        </span>
      </div>

      <div className="divide-y divide-black/10">
        {proxy ? (
          <Finding
            label="Upgradeable"
            value={proxy.isProxy ? `Yes — ${proxy.standard === "eip1822" ? "UUPS" : "EIP-1967"}` : "No"}
            tone={proxy.isProxy ? "bad" : "good"}
            note={
              proxy.isProxy
                ? "The admin can replace the contract's logic, so every other finding describes code that can be swapped."
                : "Deployed logic is fixed — no proxy implementation slot set."
            }
            href={proxy.implementation ? explorerAddressUrl(proxy.implementation) : undefined}
          />
        ) : (
          <Finding label="Upgradeable" value="Not read" tone="unknown" />
        )}

        {owner ? (
          <Finding
            label="Ownership"
            value={
              owner.kind === "renounced"
                ? "Renounced"
                : owner.kind === "owned"
                  ? shortAddress(owner.owner)
                  : "No owner function"
            }
            tone={owner.kind === "renounced" ? "good" : owner.kind === "owned" ? "warn" : "unknown"}
            note={
              owner.kind === "no_owner_function"
                ? "Not a renouncement — a role-based contract can still have a live admin."
                : owner.kind === "owned"
                  ? "Owner-only functions remain callable."
                  : undefined
            }
            href={owner.kind === "owned" ? explorerAddressUrl(owner.owner) : undefined}
          />
        ) : (
          <Finding label="Ownership" value="Not read" tone="unknown" />
        )}

        {sell && sell.balanceSlot !== undefined ? (
          <Finding
            label="Transfer Test"
            value={
              !sell.transferOk
                ? "Reverted"
                : sell.sellOk === false
                  ? "Sell blocked"
                  : "Passed"
            }
            tone={!sell.transferOk || sell.sellOk === false ? "bad" : "good"}
            note={
              !sell.transferOk || sell.sellOk === false
                ? "A simulated transfer failed — holders may be unable to move or sell this token."
                : "Simulated at the current block. Not a promise about future blocks or hook behaviour."
            }
          />
        ) : (
          <Finding
            label="Transfer Test"
            value="Not run"
            tone="unknown"
            note="The token's balance storage layout could not be resolved, so nothing was simulated."
          />
        )}

        {code ? (
          <Finding
            label="Bytecode Levers"
            value={code.levers.length === 0 ? "None found" : code.levers.join(", ")}
            tone={code.levers.length === 0 ? "good" : "warn"}
            note={
              code.levers.length === 0
                ? `Scanned ${code.sizeBytes.toLocaleString("en-US")} bytes for mint, pause and blacklist selectors.`
                : "Present in bytecode. Whether they are callable, and by whom, was not determined."
            }
          />
        ) : (
          <Finding label="Bytecode Levers" value="Not read" tone="unknown" />
        )}
      </div>

      <SupplyBar chain={chain} />
    </section>
  );
}
