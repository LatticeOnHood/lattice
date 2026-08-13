"use client";

import React, { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
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

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
      <div>
        <AuditConsole />
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

function ConnectContent() {
  const searchParams = useSearchParams();
  const platform = searchParams.get("platform");
  const tgUserId = searchParams.get("tg_user_id");
  const username = searchParams.get("username");

  const { isConnected, address } = useAccount();
  const { linkTelegramDirect, pending } = useSession();

  const isTelegramFlow = platform === "telegram" || Boolean(tgUserId);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: FONT_STACK }}>
      <SiteNav />

      <header className="px-5 pb-6 pt-8 sm:px-8 md:px-12 md:pb-8 md:pt-12">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/55">
          Account Linking
        </span>
        <h1
          className="mt-2 uppercase text-black"
          style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", lineHeight: 1, fontWeight: 600 }}
        >
          Connect & Bind Wallet
        </h1>
        <p className="mt-3 max-w-xl text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-[11px]">
          Bind your EVM wallet to your social account. Your wallet binding allows{" "}
          <span style={{ color: ACCENT }}>@latticehoodbot on X or @latticeonhood_bot on Telegram</span> to perform instant on-chain token audits.
        </p>

        {isTelegramFlow && tgUserId && (
          <div className="mt-6 max-w-lg border border-sky-200 bg-sky-50 p-5 rounded-md">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons8-telegram-144.png" alt="Telegram" className="h-5 w-5 object-contain" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-900">
                  Telegram Account Detected: {username ? `@${username}` : tgUserId}
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-700 mt-0.5">
                  {isConnected
                    ? "Wallet connected! Click below to sign & complete 1:1 Telegram account binding."
                    : "Connect your wallet below to complete 1:1 Telegram account binding."}
                </p>
              </div>
            </div>

            {isConnected && (
              <button
                type="button"
                onClick={() => linkTelegramDirect(tgUserId, username || undefined)}
                disabled={pending === "link-telegram"}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: "#229ED9" }}
              >
                {pending === "link-telegram" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/icons8-telegram-144.png" alt="Telegram" className="h-4 w-4 object-contain invert" />
                )}
                Confirm & Bind Telegram {username ? `@${username}` : ""} to Wallet
              </button>
            )}
          </div>
        )}
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

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: ACCENT }} />
        </div>
      }
    >
      <ConnectContent />
    </Suspense>
  );
}
