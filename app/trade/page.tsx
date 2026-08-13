"use client";

import React, { useEffect } from "react";
import { ACCENT, FONT_STACK } from "@/lib/brand";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AuthGate } from "@/components/auth/auth-gate";
import { LinkedAccountsCard } from "@/components/auth/linked-accounts-card";
import { useSession } from "@/components/auth/session-provider";
import { ConnectWalletButton } from "@/components/web3/connect-wallet-button";
import { TradeConsole } from "@/components/app/trade-console";

function TradePageContent() {
  const { refresh, signOut } = useSession();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
      <div>
        <TradeConsole />
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

export default function TradePage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: FONT_STACK }}>
      <SiteNav />

      <header className="px-5 pb-6 pt-8 sm:px-8 md:px-12 md:pb-8 md:pt-12">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/55">
          Non-Custodial Trading
        </span>
        <h1
          className="mt-2 uppercase text-black"
          style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", lineHeight: 1, fontWeight: 600 }}
        >
          Buy & Sell Tokens
        </h1>
        <p className="mt-3 max-w-xl text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-[11px]">
          Trade ETH, USDG, Robinhood Stock Tokens (RWAs), or any ERC20 contract address instantly via Uniswap V3.
          Non-custodial execution powered by{" "}
          <span style={{ color: ACCENT }}>Lattice Engine</span>.
        </p>
      </header>

      <main className="px-5 pb-16 sm:px-8 md:px-12">
        <AuthGate>
          <TradePageContent />
        </AuthGate>
      </main>

      <SiteFooter />
    </div>
  );
}
