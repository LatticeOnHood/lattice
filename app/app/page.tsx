"use client";

import React, { useEffect } from "react";
import { ACCENT, FONT_STACK } from "@/lib/brand";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AuthGate } from "@/components/auth/auth-gate";
import { LinkedAccountsCard } from "@/components/auth/linked-accounts-card";
import { useSession } from "@/components/auth/session-provider";
import { ConnectWalletButton } from "@/components/web3/connect-wallet-button";
import { AuditConsole } from "@/components/app/audit-console";

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
        <AuditConsole />
      </div>

      <aside className="space-y-6 lg:border-l lg:border-black/10 lg:pl-10">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
          Your Bindings
        </span>
        <LinkedAccountsCard />
        <div className="flex flex-col gap-3 border-t border-black/10 pt-6">
          <ConnectWalletButton size="sm" />
          <button
            type="button"
            onClick={signOut}
            className="self-start text-[10px] font-semibold uppercase tracking-widest text-black/40 hover:text-black"
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

      <header className="px-5 pb-12 pt-16 sm:px-8 md:px-12 md:pb-16 md:pt-24">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
          The App
        </span>
        <h1
          className="mt-4 uppercase text-black"
          style={{ fontSize: "clamp(2rem, 8vw, 6rem)", lineHeight: 0.9, fontWeight: 600 }}
        >
          Verify
          <br />
          Before You Buy
        </h1>
        <p className="mt-6 max-w-xl text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-xs">
          Paste a Robinhood Chain contract address for a structured on-chain
          report. Your wallet binding is what lets{" "}
          <span style={{ color: ACCENT }}>@LatticeBot</span> answer for you in X
          and Telegram.
        </p>
      </header>

      <main className="px-5 pb-24 sm:px-8 md:px-12">
        <AuthGate>
          <Console />
        </AuthGate>
      </main>

      <SiteFooter />
    </div>
  );
}
