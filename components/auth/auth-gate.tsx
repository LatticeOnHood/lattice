"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { ACCENT, SURFACE } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/auth/session-provider";
import { TelegramLoginButton } from "@/components/auth/telegram-login-button";
import { ConnectWalletButton } from "@/components/web3/connect-wallet-button";
import { WALLETCONNECT_ENABLED } from "@/lib/wagmi";
import { robinhoodChain } from "@/lib/chains";

function StepFrame({
  step,
  title,
  body,
  children,
}: {
  step: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-lg border border-black/10 bg-white p-6 md:p-8">
      <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: ACCENT }}>
        Step {step}
      </span>
      <h2 className="mt-3 text-lg font-semibold uppercase tracking-widest text-black md:text-xl">
        {title}
      </h2>
      <p className="mt-2.5 text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-[11px]">
        {body}
      </p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

/**
 * Enforces onboarding flow:
 * Step 1: Connect EVM Wallet
 * Step 2: Separate Platform Selection Screen (Telegram @latticeonhood_bot OR X @latticehoodbot)
 * Step 3: OAuth / Widget Auth & Wallet Verification Signature
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, signIn, linkTelegram, pending } = useSession();
  const { address, chain } = useAccount();

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  if (status === "authenticated") return <>{children}</>;

  /* --------------------------------------------------- Step 1: Connect Wallet */
  if (status === "disconnected" || !address) {
    return (
      <StepFrame
        step="01"
        title="Connect Your Wallet"
        body={`Lattice binds one EVM wallet to one X account (@latticehoodbot) and one Telegram account (@latticeonhood_bot). Connect on ${robinhoodChain.name} to begin.`}
      >
        <ConnectWalletButton className="w-full" />
        {!WALLETCONNECT_ENABLED && (
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-black/55 text-center">
            WalletConnect is disabled — set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to offer mobile wallets.
          </p>
        )}
      </StepFrame>
    );
  }

  /* ------------------------------------------- Step 2: Platform Selection Screen */
  const wrongNetwork = chain && chain.id !== robinhoodChain.id;
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <StepFrame
      step="02"
      title="Select Account Platform to Link"
      body={`Wallet ${shortAddress} connected. Choose which account platform you want to bind to this wallet:`}
    >
      {wrongNetwork && (
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-black/55">
          Connected to {chain?.name}. Audits target {robinhoodChain.name}.
        </p>
      )}

      <div className="space-y-4">
        {/* Option 1: X (Twitter) */}
        <div className="border border-black/10 p-5" style={{ backgroundColor: SURFACE }}>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons8-x-100.png" alt="X" className="h-4 w-4 object-contain" />
            <span className="text-xs font-semibold uppercase tracking-widest text-black">
              Link X (Twitter) Account
            </span>
          </div>
          <p className="mt-2 text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/60">
            Bind @latticehoodbot to run automated audits directly from mentions and tweet replies.
          </p>
          <button
            type="button"
            onClick={signIn}
            disabled={pending === "signin"}
            className={cn(
              "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-50 sm:text-xs"
            )}
            style={{ backgroundColor: ACCENT }}
          >
            {pending === "signin" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src="/icons8-x-100.png" alt="X" className="h-4 w-4 object-contain invert" />
            )}
            {pending === "signin" ? "Check Your Wallet" : "Link X Account"}
          </button>
        </div>

        {/* Option 2: Telegram */}
        <div className="border border-black/10 p-5" style={{ backgroundColor: SURFACE }}>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons8-telegram-144.png" alt="Telegram" className="h-4 w-4 object-contain" />
            <span className="text-xs font-semibold uppercase tracking-widest text-black">
              Link Telegram Account
            </span>
          </div>
          <p className="mt-2 text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/60">
            Bind @latticeonhood_bot to run instant audits in Telegram group chats and DMs.
          </p>
          <div className="mt-4 flex items-center gap-3">
            {(pending as string) === "link-telegram" ? (
              <div className="flex items-center gap-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-black/70">
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: ACCENT }} />
                <span>Check Your Wallet...</span>
              </div>
            ) : (
              <TelegramLoginButton onAuth={linkTelegram} disabled={Boolean(pending)} />
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-black/10 pt-5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/55">
          Connected: <code className="text-black font-mono">{shortAddress}</code>
        </span>
        <ConnectWalletButton size="sm" />
      </div>
    </StepFrame>
  );
}
