"use client";

/**
 * The gated product surface: a token contract in, a structured report out.
 *
 * Replaces `components/app/audit-console.tsx`. What changed beyond layout:
 *
 *  - The report is driven by the backend's verification report when present, so a
 *    check Lattice cannot perform renders as "not yet measured" rather than as a
 *    blank or a zero. It degrades to metrics-only rendering when the API has not
 *    shipped the `report` key yet.
 *  - A heuristic verdict, shown only alongside how many of the schema's checks
 *    actually ran.
 *  - Distribution, extrema, provenance and pair age — all already fetched by the
 *    backend, none of it previously reaching this screen.
 *  - The inspected address lives in the URL, so a report is shareable.
 */

import React from "react";
import { AlertCircle } from "lucide-react";
import { Reveal } from "@/components/motion";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { assessRisk } from "@/lib/inspector/risk";
import { EVM_ADDRESS, useAudit, useInspectedTarget, useRecents } from "@/lib/inspector/use-audit";
import { FlagsPanel } from "./flags-panel";
import { InspectorSkeleton } from "./skeleton";
import { MetricsGrid } from "./metrics-grid";
import { ProvenanceLine } from "./provenance-line";
import { SearchBar } from "./search-bar";
import { UnmeasuredRow } from "./unmeasured-row";
import { VerdictHeader } from "./verdict-header";

function ErrorNotice({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "The audit could not be completed.";

  return (
    <div className="flex items-start gap-3 border border-black/10 bg-black/[0.02] p-6">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#B91C1C" }} aria-hidden />
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black">
          Audit Failed
        </span>
        <p className="mt-2 text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/60">
          {message}
        </p>
      </div>
    </div>
  );
}

export function Inspector() {
  const toast = useToast();
  const { target, setTarget } = useInspectedTarget();
  const { recents, remember, clear } = useRecents();

  // Free text lives in local state; only a well-formed address is promoted to the
  // URL, which is what `target` drives the query from.
  const [query, setQuery] = React.useState(target);
  const [submitted, setSubmitted] = React.useState(target);

  // A `?token=` on first load, or a back-button navigation, should run itself.
  React.useEffect(() => {
    if (!target) return;
    setQuery((current) => (current === target ? current : target));
    setSubmitted((current) => (current === target ? current : target));
  }, [target]);

  const { data, isPending, error, isRefreshing, refetch } = useAudit(submitted);

  const handleSubmit = React.useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSubmitted(trimmed);
    if (EVM_ADDRESS.test(trimmed)) setTarget(trimmed);
  }, [query, setTarget]);

  const handlePickRecent = React.useCallback(
    (address: string) => {
      setQuery(address);
      setSubmitted(address);
      setTarget(address);
    },
    [setTarget]
  );

  const metrics = data?.metrics;
  const report = data?.report;

  // Record the address the backend resolved, not the raw input — a plain-English
  // query has no address until the report comes back.
  React.useEffect(() => {
    if (metrics?.address) remember(metrics.address);
  }, [metrics?.address, remember]);

  // Errors surface inline; the toast is for the case where a stale report is still
  // on screen and the inline notice would otherwise be missed.
  React.useEffect(() => {
    if (error && data) toast.fromError(error);
  }, [error, data, toast]);

  // Move focus to the result once a fresh report lands, so keyboard and screen
  // reader users are not left at the top of the form.
  const heading = metrics?.address;
  React.useEffect(() => {
    if (!heading) return;
    document.getElementById("inspector-result-heading")?.focus();
  }, [heading]);

  const assessment = React.useMemo(
    () => (metrics ? assessRisk(metrics, report) : null),
    [metrics, report]
  );

  return (
    <div className="space-y-8">
      <SearchBar
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        loading={isPending || isRefreshing}
        recents={recents}
        onPickRecent={handlePickRecent}
        onClearRecents={clear}
      />

      <div
        aria-live="polite"
        aria-busy={isPending || isRefreshing}
        className="space-y-px"
      >
        {isPending && !metrics && <InspectorSkeleton />}

        {error && !metrics ? <ErrorNotice error={error} /> : null}

        {metrics && assessment && (
          <>
            {/* Keeps the stale report readable rather than blanking it. */}
            {error ? <ErrorNotice error={error} /> : null}

            <VerdictHeader
              metrics={metrics}
              assessment={assessment}
              isRefreshing={isRefreshing}
              onRefresh={refetch}
            />

            <Reveal index={0}>
              <FlagsPanel signals={assessment.signals} />
            </Reveal>

            <Reveal index={1}>
              <MetricsGrid metrics={metrics} report={report} />
            </Reveal>

            <Reveal index={2}>
              <UnmeasuredRow report={report} />
            </Reveal>

            <ProvenanceLine metrics={metrics} report={report} />
          </>
        )}
      </div>
    </div>
  );
}
