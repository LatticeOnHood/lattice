"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { ACCENT, FONT_STACK } from "@/lib/brand";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { useSession } from "@/components/auth/session-provider";
import { LinkedAccountsCard } from "@/components/auth/linked-accounts-card";

type State =
  | { phase: "working" }
  | { phase: "done" }
  | { phase: "error"; message: string };

const ERROR_COPY: Record<string, string> = {
  expired_or_invalid_state:
    "That link expired. Start again from the app and re-sign the verification message.",
  access_denied: "Authorization was cancelled on X.",
};

/**
 * Landing point for `GET /auth/x/callback`, which redirects here as
 * `/auth/callback#token=<jwt>` on success or `?error=<code>` on failure.
 */
export default function AuthCallbackPage() {
  const { adoptToken } = useSession();
  const [state, setState] = useState<State>({ phase: "working" });
  // React strict mode mounts effects twice in dev; the token is consumed once.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const errorCode = new URLSearchParams(window.location.search).get("error");
    if (errorCode) {
      setState({
        phase: "error",
        message: ERROR_COPY[errorCode] ?? `X authorization failed (${errorCode}).`,
      });
      return;
    }

    const token = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token");
    if (!token) {
      setState({ phase: "error", message: "No token was returned by the authorization flow." });
      return;
    }

    // Strip the JWT from the address bar before anything can copy or share it.
    window.history.replaceState(null, "", window.location.pathname);

    adoptToken(token)
      .then(() => setState({ phase: "done" }))
      .catch((err: unknown) =>
        setState({
          phase: "error",
          message: err instanceof Error ? err.message : "Could not verify that token.",
        })
      );
  }, [adoptToken]);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: FONT_STACK }}>
      <SiteNav />

      <main className="px-5 py-20 sm:px-8 md:px-12 md:py-28">
        <div className="mx-auto w-full max-w-lg border border-black/10 bg-white p-8 md:p-10">
          {state.phase === "working" && (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: ACCENT }} />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-black/60">
                Binding your account…
              </span>
            </div>
          )}

          {state.phase === "error" && (
            <>
              <span className="text-sm font-semibold tracking-widest" style={{ color: ACCENT }}>
                !
              </span>
              <h1 className="mt-4 text-xl font-semibold uppercase tracking-widest text-black md:text-2xl">
                Linking Failed
              </h1>
              <p className="mt-3 text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60">
                {state.message}
              </p>
              <Link
                href="/app"
                className="mt-8 inline-flex items-center gap-1 text-base uppercase tracking-wide"
                style={{ color: ACCENT, fontWeight: 600 }}
              >
                Back To The App
                <ArrowUpRight className="h-5 w-5" />
              </Link>
            </>
          )}

          {state.phase === "done" && (
            <>
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: ACCENT }}
              >
                <Check className="h-5 w-5 text-white" />
              </span>
              <h1 className="mt-5 text-xl font-semibold uppercase tracking-widest text-black md:text-2xl">
                Account Linked
              </h1>
              <p className="mt-3 text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60">
                Your wallet and social account are now bound.
              </p>

              <div className="mt-8">
                <LinkedAccountsCard />
              </div>

              <Link
                href="/app"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-80 sm:text-xs"
                style={{ backgroundColor: ACCENT }}
              >
                Enter Lattice
              </Link>
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
