"use client";

/**
 * Loading state, shaped like the report it precedes.
 *
 * The point of this component is that nothing moves when data lands, so its
 * structure has to track the real report's: the same five stacked sections, the
 * same hairline separators, the same eight-cell grid at the same breakpoints. An
 * earlier revision was left behind when the report was redesigned — it rendered a
 * tall header and six cells in three columns against a report that had a compact
 * header and eight in four, so the page jumped on every load.
 *
 * If the report's structure changes again, this changes with it.
 */

import React from "react";

function Bar({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`block rounded-sm bg-black/[0.08] ${className}`} style={style} />;
}

/** Mirrors `Stat` — label, value, and the optional note line. */
function CellSkeleton({ withNote = false }: { withNote?: boolean }) {
  return (
    <div className="bg-white px-4 py-3.5">
      <Bar className="h-2 w-16" />
      <Bar className="mt-2 h-3.5 w-20" />
      {withNote && <Bar className="mt-1.5 h-2 w-14" />}
    </div>
  );
}

export function InspectorSkeleton() {
  return (
    <div
      className="animate-pulse space-y-px"
      role="status"
      aria-label="Loading token report"
    >
      {/* VerdictHeader: identity, then the links row, then the verdict row. */}
      <section className="border border-black/10 bg-white">
        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-5 md:px-8">
          <div className="w-full">
            <Bar className="h-2 w-40" />
            <Bar className="mt-2.5 h-6 w-56" />
            <Bar className="mt-2.5 h-2 w-44" />
          </div>
          <Bar className="h-8 w-24 shrink-0" />
        </div>

        <div className="flex items-center gap-4 border-t border-black/10 px-6 py-3 md:px-8">
          <Bar className="h-2.5 w-24" />
          <Bar className="h-2.5 w-16" />
          <Bar className="h-2.5 w-12" />
        </div>

        <div className="border-t border-black/10 px-6 py-4 md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <Bar className="h-3 w-48" />
            <Bar className="h-2 w-36" />
          </div>
          <Bar className="mt-3 h-1 w-full" />
        </div>
      </section>

      {/* FlagsPanel: header row, then a couple of flag rows. */}
      <section className="border border-black/10 bg-white">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-3.5 md:px-8">
          <Bar className="h-2 w-20" />
          <Bar className="h-2 w-52" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3 border-t border-black/10 px-6 py-3.5 first:border-t-0 md:px-8">
            <Bar className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full" />
            <div className="w-full">
              <Bar className="h-2 w-32" />
              <Bar className="mt-2 h-2 w-full max-w-md" />
            </div>
          </div>
        ))}
      </section>

      {/* MetricsGrid: eight cells, same breakpoints as the real grid. */}
      <section className="border border-black/10 bg-white">
        <div className="grid grid-cols-2 gap-px bg-black/10 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CellSkeleton key={i} withNote={i % 3 === 0} />
          ))}
        </div>
      </section>

      {/* UnmeasuredRow: the chip strip. */}
      <section className="border border-black/10 bg-black/[0.02] px-6 py-4 md:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Bar className="h-2.5 w-24" />
          {[20, 26, 22, 28, 24, 23].map((w, i) => (
            <Bar key={i} className="h-5" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
        <Bar className="mt-3 h-2 w-full max-w-lg" />
      </section>

      {/* ProvenanceLine. */}
      <section className="border border-black/10 bg-white px-6 py-3.5 md:px-8">
        <Bar className="h-2 w-full max-w-2xl" />
      </section>

      <span className="sr-only">Reading chain data…</span>
    </div>
  );
}
