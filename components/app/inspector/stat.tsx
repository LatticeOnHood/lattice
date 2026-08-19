"use client";

/**
 * A single compact figure in the metrics grid.
 *
 * Replaces the earlier full-height tile. The tile treatment gave every number the
 * same visual weight as the verdict, which made a report of fifteen of them read
 * as a wall — the reader had to work to find the two figures that mattered. These
 * are dense by design; emphasis lives in the verdict and the flags above.
 */

import React from "react";

export function Stat({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note?: string;
  accent?: string;
}) {
  return (
    <div className="px-4 py-3.5">
      <span className="block text-[9px] font-semibold uppercase tracking-widest text-black/45">
        {label}
      </span>
      <span
        className="mt-1 block text-sm font-semibold tracking-tight text-black"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
      {note && (
        <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-widest text-black/35">
          {note}
        </span>
      )}
    </div>
  );
}

/**
 * A figure the indexer did not return.
 *
 * Still says why rather than rendering an empty cell, but at grid weight — the
 * emphatic "not measured" treatment is reserved for the security checks, where a
 * blank could be misread as a pass.
 */
export function StatAbsent({ label, note = "No data" }: { label: string; note?: string }) {
  return (
    <div className="px-4 py-3.5">
      <span className="block text-[9px] font-semibold uppercase tracking-widest text-black/45">
        {label}
      </span>
      <span className="mt-1 block text-sm font-semibold tracking-tight text-black/25">—</span>
      <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-widest text-black/35">
        {note}
      </span>
    </div>
  );
}
