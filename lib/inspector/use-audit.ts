"use client";

/**
 * Data layer for the token inspector.
 *
 * Three jobs the old console did by hand, or not at all:
 *
 *  - React Query owns the request, so a re-submit of the same address inside the
 *    stale window is a cache read rather than a second API call, an in-flight
 *    request is aborted on unmount, and `placeholderData` keeps the previous
 *    report on screen while the next one loads. The old console kept the stale
 *    report on error as a deliberate choice; here it is structural.
 *  - The inspected address lives in the URL, so a report is shareable and the
 *    back button works.
 *  - Recently inspected addresses persist in localStorage.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { runAudit, type AuditResult } from "@/lib/api";
import { useSession } from "@/components/auth/session-provider";

export const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

const RECENTS_KEY = "lattice.inspector.recents";
const RECENTS_LIMIT = 8;

/** A bare contract address skips the Groq intent parse on the backend. */
function toInput(query: string): { address?: string; message?: string } {
  return EVM_ADDRESS.test(query) ? { address: query } : { message: query };
}

/* --------------------------------------------------------------- recents */

function readRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && EVM_ADDRESS.test(v));
  } catch {
    // A corrupt or unavailable store is not worth surfacing — it is a convenience.
    return [];
  }
}

export function useRecents() {
  const [recents, setRecents] = useState<string[]>([]);

  // Read after mount: localStorage does not exist during the server render, and
  // seeding state from it directly would produce a hydration mismatch.
  useEffect(() => {
    setRecents(readRecents());
  }, []);

  const remember = useCallback((address: string) => {
    if (!EVM_ADDRESS.test(address)) return;
    const lower = address.toLowerCase();
    setRecents((prev) => {
      const next = [lower, ...prev.filter((a) => a !== lower)].slice(0, RECENTS_LIMIT);
      try {
        window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        // Private-mode or quota failure. The in-memory list still works.
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecents([]);
    try {
      window.localStorage.removeItem(RECENTS_KEY);
    } catch {
      /* nothing to do */
    }
  }, []);

  return { recents, remember, clear };
}

/* ------------------------------------------------------------- url state */

/**
 * The inspected target, mirrored into `?token=`.
 *
 * Only well-formed addresses go in the URL. A natural-language query is not a
 * stable identifier and would make a meaningless share link.
 */
export function useInspectedTarget() {
  const router = useRouter();
  const params = useSearchParams();
  const target = params.get("token")?.trim() ?? "";

  const setTarget = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      const search = new URLSearchParams(Array.from(params.entries()));

      if (EVM_ADDRESS.test(trimmed)) search.set("token", trimmed.toLowerCase());
      else search.delete("token");

      const query = search.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [params, router]
  );

  return { target, setTarget };
}

/* ----------------------------------------------------------------- query */

export interface UseAuditResult {
  data: AuditResult | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  /** True while a refetch replaces a report already on screen. */
  isRefreshing: boolean;
  refetch: () => void;
}

/**
 * Runs the audit for `query`, or stays idle when it is empty.
 *
 * `staleTime` deliberately matches the backend's per-address cache window, so
 * the two layers agree on how old a report is allowed to be.
 */
export function useAudit(query: string): UseAuditResult {
  const { session } = useSession();
  const trimmed = query.trim();
  const token = session?.token;

  const result = useQuery({
    queryKey: ["audit", trimmed.toLowerCase(), token ? "auth" : "anon"],
    enabled: trimmed.length > 0,
    staleTime: 120_000,
    gcTime: 600_000,
    retry: 1,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => runAudit(toInput(trimmed), token, signal),
  });

  return useMemo(
    () => ({
      data: result.data,
      isPending: result.isPending && result.fetchStatus === "fetching",
      isFetching: result.isFetching,
      error: result.error,
      isRefreshing: result.isFetching && result.data !== undefined,
      refetch: () => void result.refetch(),
    }),
    [result]
  );
}
