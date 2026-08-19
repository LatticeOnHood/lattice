"use client";

/**
 * The signals that warrant attention, and — folded away — the ones that do not.
 *
 * The previous version listed all nine signals at equal weight, so two critical
 * findings sat in the same visual register as seven lines saying nothing is
 * wrong. Only critical and caution are shown open. The rest stay reachable in one
 * click, because "this was checked and looked fine" and "this could not be
 * checked" are both things a reader is entitled to see — just not things worth
 * seven inches of page.
 */

import React from "react";
import { AlertTriangle, ChevronDown, Info } from "lucide-react";
import type { RiskSignal, SignalLevel } from "@/lib/inspector/risk";

const COLOR: Record<SignalLevel, string> = {
  critical: "#B91C1C",
  caution: "#B45309",
  clear: "#091DE9",
  unknown: "#71717A",
};

function Flag({ signal }: { signal: RiskSignal }) {
  const Icon = signal.level === "critical" ? AlertTriangle : Info;
  return (
    <li className="flex gap-3 border-t border-black/10 px-6 py-3.5 first:border-t-0 md:px-8">
      <Icon
        className="mt-0.5 h-3.5 w-3.5 shrink-0"
        style={{ color: COLOR[signal.level] }}
        aria-hidden
      />
      <div className="min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black">
          {signal.label}
        </span>
        <p className="mt-1 text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/55">
          {signal.detail}
        </p>
      </div>
    </li>
  );
}

/** One line per signal — enough to see it was considered, not enough to dominate. */
function QuietRow({ signal }: { signal: RiskSignal }) {
  return (
    <li className="flex items-baseline gap-3 border-t border-black/10 px-6 py-2.5 md:px-8">
      <span
        className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: COLOR[signal.level] }}
        aria-hidden
      />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-black/70">
        {signal.label}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-widest text-black/40">
        {signal.level === "caution" ? "Caution" : signal.level === "clear" ? "Clear" : "Not evaluated"}
      </span>
    </li>
  );
}

/**
 * How many flags stay open before cautions get folded away.
 *
 * A token with five critical findings and four cautions was rendering nine
 * paragraphs and running past 1300px. Criticals are always open — they are the
 * reason for the verdict. Cautions join them only while the open block stays
 * short; past that they drop into the collapsed list, where the count still
 * announces them.
 */
const OPEN_LIMIT = 4;

export function FlagsPanel({ signals }: { signals: RiskSignal[] }) {
  const critical = signals.filter((s) => s.level === "critical");
  const caution = signals.filter((s) => s.level === "caution");
  const flaggedCount = critical.length + caution.length;

  const openCautions = flaggedCount <= OPEN_LIMIT ? caution : [];
  const open = [...critical, ...openCautions];

  const folded = [
    ...caution.filter((s) => !openCautions.includes(s)),
    ...signals.filter((s) => s.level === "clear" || s.level === "unknown"),
  ];

  const foldedCaution = folded.filter((s) => s.level === "caution").length;
  const clear = folded.filter((s) => s.level === "clear").length;
  const unknown = folded.filter((s) => s.level === "unknown").length;

  const foldLabel = [
    foldedCaution > 0 ? `${foldedCaution} more caution${foldedCaution === 1 ? "" : "s"}` : null,
    clear > 0 ? `${clear} clear` : null,
    unknown > 0 ? `${unknown} not evaluated` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="border border-black/10 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-black/10 px-6 py-3.5 md:px-8">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-black">
          {flaggedCount > 0 ? `${flaggedCount} Flags` : "No Flags Raised"}
        </h3>
        <span className="text-[9px] font-semibold uppercase tracking-widest text-black/40">
          Holder figures may include LP, CEX or burn addresses — not yet labelled
        </span>
      </div>

      {open.length > 0 && (
        <ul>
          {open.map((signal) => (
            <Flag key={signal.id} signal={signal} />
          ))}
        </ul>
      )}

      {folded.length > 0 && (
        <details className="group border-t border-black/10">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-3 text-[9px] font-semibold uppercase tracking-widest text-black/45 transition-colors hover:text-black md:px-8">
            <ChevronDown
              className="h-3 w-3 transition-transform group-open:rotate-180"
              aria-hidden
            />
            {foldLabel}
          </summary>
          <ul className="pb-1">
            {folded.map((signal) => (
              <QuietRow key={signal.id} signal={signal} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
