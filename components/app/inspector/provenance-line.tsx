"use client";

/**
 * Source, timestamp and disclaimer, on one line.
 *
 * The whitepaper's commitment is that a scorecard discloses where its data came
 * from and when — not that it devotes a four-column panel to doing so. This keeps
 * the disclosure and drops the furniture.
 */

import React from "react";
import type { TokenMetrics, VerificationReport } from "@/lib/api";
import { relativeTime, timestamp } from "@/lib/inspector/format";

const SOURCE_LABEL: Record<string, string> = {
  "codex.io": "Codex.io",
  dexscreener: "DexScreener",
};

export function ProvenanceLine({
  metrics,
  report,
}: {
  metrics: TokenMetrics;
  report?: VerificationReport;
}) {
  const source = report?.sources?.[0]?.name ?? metrics.dataSource;
  const at = report?.generatedAt ?? report?.sources?.[0]?.queriedAt;

  return (
    <section className="border border-black/10 bg-white px-6 py-3.5 md:px-8">
      <p className="text-[9px] font-semibold uppercase leading-relaxed tracking-widest text-black/45">
        {source ? (SOURCE_LABEL[source] ?? source) : "Source not disclosed"}
        {at && (
          <>
            {" · "}
            <time dateTime={at} title={timestamp(at)}>
              {relativeTime(at)}
            </time>
          </>
        )}
        {report?.schemaVersion ? ` · schema ${report.schemaVersion}` : ""}
        {" — read-only heuristics, not financial advice. Absence of a flag is not a guarantee of safety."}
      </p>
    </section>
  );
}
