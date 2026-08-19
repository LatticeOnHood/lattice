"use client";

/**
 * The checks that did not run, as a single row of chips.
 *
 * Previously six full-height dashed tiles, each repeating "Lattice has not
 * shipped this check" — a third of the report's height spent saying nothing was
 * measured. The information still has to be here, and prominently: a reader who
 * cannot see that LP lock and honeypot were never tested may take the verdict for
 * a safety clearance. But it needs to read as a footnote with teeth, not as the
 * body of the report.
 *
 * When roadmap phase 01 lands these move out of this row and into the grid, as
 * their report checks flip to `available`.
 */

import React from "react";
import { ACCENT } from "@/lib/brand";
import { isAvailable, type Check, type VerificationReport } from "@/lib/api";

const LABELS: { key: keyof VerificationReport["checks"]; label: string; phase: string }[] = [
  { key: "lpLocked", label: "LP Lock", phase: "01" },
  { key: "honeypot", label: "Honeypot Test", phase: "01" },
  { key: "ownershipRenounced", label: "Ownership", phase: "01" },
  { key: "mintDisabled", label: "Mint Authority", phase: "01" },
  { key: "sourceVerified", label: "Source Verified", phase: "01" },
  { key: "promisesKept", label: "Promises Kept", phase: "04" },
];

export function UnmeasuredRow({ report }: { report?: VerificationReport }) {
  const pending = LABELS.filter(({ key }) => {
    const check = report?.checks?.[key] as Check | undefined;
    // With no report at all, none of these are implemented yet either.
    return !check || !isAvailable(check);
  });

  if (pending.length === 0) return null;

  return (
    <section className="border border-black/10 bg-black/[0.02] px-6 py-4 md:px-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          className="text-[9px] font-semibold uppercase tracking-widest"
          style={{ color: ACCENT }}
        >
          Not measured
        </span>
        {pending.map(({ key, label, phase }) => (
          <span
            key={String(key)}
            className="border border-black/15 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-black/50"
          >
            {label}
            <span className="ml-1.5 text-black/30">Ph {phase}</span>
          </span>
        ))}
      </div>
      <p className="mt-2.5 text-[9px] font-semibold uppercase leading-relaxed tracking-widest text-black/40">
        Contract-security checks are not implemented yet. A verdict above reflects market
        and distribution data only.
      </p>
    </section>
  );
}
