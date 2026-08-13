"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, X } from "lucide-react";
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

function TelegramBindModal({
  tgUserId,
  username,
  onClose,
}: {
  tgUserId: string;
  username?: string | null;
  onClose: () => void;
}) {
  const { isConnected, address } = useAccount();
  const { linkTelegramDirect, pending, session } = useSession();

  // Auto-dismiss modal when Telegram is bound
  useEffect(() => {
    if (session?.telegramLinked) {
      onClose();
    }
  }, [session?.telegramLinked, onClose]);

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md border border-black/10 bg-white p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-black/40 hover:text-black transition-colors"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>

        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons8-telegram-144.png" alt="Telegram" className="h-7 w-7 object-contain" />
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
              Telegram Detected
            </span>
            <h3 className="text-base font-bold uppercase tracking-widest text-black">
              Bind Telegram Account
            </h3>
          </div>
        </div>

        <p className="mt-3 text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60">
          Link Telegram account <span className="text-black font-bold">{username ? `@${username}` : tgUserId}</span> to your EVM wallet to enable instant token audits in Telegram.
        </p>

        <div className="mt-5 rounded-none border border-black/10 bg-zinc-50 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-black/60">
              Telegram Account:
            </span>
            <span className="font-mono font-bold text-black">{username ? `@${username}` : tgUserId}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-black/60">
              Target Wallet:
            </span>
            <span className="font-mono font-bold text-black">
              {isConnected ? shortAddress : "Not Connected"}
            </span>
          </div>
        </div>

        <div className="mt-6">
          {!isConnected ? (
            <ConnectWalletButton className="w-full" />
          ) : (
            <button
              type="button"
              onClick={() => linkTelegramDirect(tgUserId, username || undefined)}
              disabled={pending === "link-telegram"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: "#229ED9" }}
            >
              {pending === "link-telegram" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src="/icons8-telegram-144.png" alt="Telegram" className="h-4 w-4 object-contain invert" />
              )}
              {pending === "link-telegram"
                ? "Check Your Wallet..."
                : `Confirm & Bind Telegram ${username ? `@${username}` : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConnectContent() {
  const searchParams = useSearchParams();
  const tgUserId = searchParams.get("tg_user_id");
  const username = searchParams.get("username");
  const [modalDismissed, setModalDismissed] = useState(false);

  const showModal = Boolean(tgUserId) && !modalDismissed;

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
      </header>

      <main className="px-5 pb-16 sm:px-8 md:px-12">
        <AuthGate>
          <Console />
        </AuthGate>
      </main>

      {showModal && tgUserId && (
        <TelegramBindModal
          tgUserId={tgUserId}
          username={username}
          onClose={() => setModalDismissed(true)}
        />
      )}

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
