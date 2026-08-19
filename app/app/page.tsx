"use client";

import React, { Suspense, useEffect } from "react";
import { ACCENT, FONT_STACK } from "@/lib/brand";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AuthGate } from "@/components/auth/auth-gate";
import { LinkedAccountsCard } from "@/components/auth/linked-accounts-card";
import { useSession } from "@/components/auth/session-provider";
import { ConnectWalletButton } from "@/components/web3/connect-wallet-button";
import { Inspector } from "@/components/app/inspector/inspector";

function Console() {
  const { refresh, signOut } = useSession();

  // Bindings can change out of band (bot flows, the other platform's OAuth), so
  // reconcile with the backend once the console mounts.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
      <div>
        {/* The inspector mirrors the inspected address into `?token=` via
            useSearchParams, which Next requires to sit under a Suspense
            boundary during prerender. */}
        <Suspense fallback={null}>
          <Inspector />
        </Suspense>
      </div>

      <aside className="space-y-6 lg:border-l lg:border-black/10 lg:pl-10">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/55">
          Your Bindings
        </span>
        <LinkedAccountsCard />
        <div className="flex flex-col gap-3 border-t border-black/10 pt-6">
          <ConnectWalletButton size="sm" />
          <button
            type="button"
            onClick={signOut}
            className="self-start text-[10px] font-semibold uppercase tracking-widest text-black/55 hover:text-black"
          >
            Sign Out
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function AppPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: FONT_STACK }}>
      <SiteNav />

      {/* Kept deliberately compact: this header sits above the onboarding card,
          which should be reachable without scrolling on a laptop viewport. */}
      <header className="px-5 pb-6 pt-8 sm:px-8 md:px-12 md:pb-8 md:pt-12">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/55">
          The App
        </span>
        <h1
          className="mt-2 uppercase text-black"
          style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", lineHeight: 1, fontWeight: 600 }}
        >
          Verify Before You Buy
        </h1>
        <p className="mt-3 max-w-xl text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-[11px]">
          Paste a Robinhood Chain contract address for a structured on-chain
          report. Your wallet binding is what lets{" "}
          <span style={{ color: ACCENT }}>@latticehoodbot on X or @latticeonhood_bot on Telegram</span> answer for you in X
          and Telegram.
        </p>
      </header>

      <main className="px-5 pb-16 sm:px-8 md:px-12">
        <AuthGate>
          <Console />
        </AuthGate>
      </main>

      <SiteFooter />
    </div>
  );
}
