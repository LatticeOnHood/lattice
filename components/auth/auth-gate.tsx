"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { useAccount } from "wagmi";
import { ACCENT, SURFACE } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/auth/session-provider";
import { ConnectWalletButton } from "@/components/web3/connect-wallet-button";
import { WALLETCONNECT_ENABLED } from "@/lib/wagmi";
import { robinhoodChain } from "@/lib/chains";

function StepFrame({
  step,
  title,
  body,
  children,
}: {
  step?: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-lg border border-black/10 bg-white p-6 md:p-8">
      {step && (
        <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: ACCENT }}>
          Step {step}
        </span>
      )}
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

function SuccessScreen({
  onContinue,
  children,
}: {
  onContinue: () => void;
  children: React.ReactNode;
}) {
  const { session, linkX, pending } = useSession();
  const { address } = useAccount();

  if (!session) return <>{children}</>;

  const { xLinked, xHandle, telegramLinked, telegramUsername, walletAddress } = session;
  const displayAddress = address || walletAddress;
  const shortAddress = displayAddress
    ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`
    : "";

  return (
    <div className="mx-auto w-full max-w-lg border border-black/10 bg-white p-6 md:p-8">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 shrink-0" style={{ color: ACCENT }} />
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
          Account Bound Successfully
        </span>
      </div>

      <h2 className="mt-4 text-xl font-bold uppercase tracking-widest text-black">
        Wallet Connected & Linked
      </h2>

      <p className="mt-2 text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-[11px]">
        EVM Wallet <code className="font-mono text-black">{shortAddress}</code> is now bound to Lattice.
      </p>

      {/* Currently Linked Summary */}
      <div className="mt-5 space-y-2 border-y border-black/10 py-4">
        {xLinked && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-semibold uppercase tracking-widest text-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons8-x-100.png" alt="X" className="h-3.5 w-3.5 object-contain" />
              X (Twitter)
            </span>
            <span className="font-bold text-black font-mono">@{xHandle}</span>
          </div>
        )}

        {telegramLinked && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-semibold uppercase tracking-widest text-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons8-telegram-144.png" alt="Telegram" className="h-3.5 w-3.5 object-contain" />
              Telegram
            </span>
            <span className="font-bold text-black font-mono">
              {telegramUsername ? `@${telegramUsername}` : "Linked"}
            </span>
          </div>
        )}
      </div>

      {/* Recommend Linking the Other Platform */}
      {!xLinked && telegramLinked && (
        <div className="mt-6 border border-black/10 p-5" style={{ backgroundColor: SURFACE }}>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
            Recommended Next Step
          </span>
          <p className="mt-2 text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-[11px]">
            Link your X (Twitter) account to run automated audits directly from tweet mentions and replies with the same wallet.
          </p>
          <button
            type="button"
            onClick={linkX}
            disabled={pending === "link-x"}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: ACCENT }}
          >
            {pending === "link-x" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src="/icons8-x-100.png" alt="X" className="h-4 w-4 object-contain invert" />
            )}
            Link X Account
          </button>
        </div>
      )}

      {xLinked && !telegramLinked && (
        <div className="mt-6 border border-black/10 p-5" style={{ backgroundColor: SURFACE }}>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
            Recommended Next Step
          </span>
          <p className="mt-2 text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-[11px]">
            Link your Telegram account to run instant audits in Telegram group chats and DMs with the same wallet.
          </p>
          <a
            href={`https://t.me/latticeonhood_bot?start=link_${displayAddress}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-80 sm:text-xs"
            style={{ backgroundColor: "#229ED9" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons8-telegram-144.png" alt="Telegram" className="h-4 w-4 object-contain invert" />
            Link Telegram Account
          </a>
        </div>
      )}

      {xLinked && telegramLinked && (
        <div className="mt-6 border border-emerald-200 bg-emerald-50 p-4 rounded-md text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-800">
            🎉 Both X and Telegram accounts are fully bound to this wallet!
          </p>
        </div>
      )}

      {/* Primary Action Button to Console */}
      <button
        type="button"
        onClick={onContinue}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-black bg-black px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-80"
      >
        <span>Continue to Console</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Enforces onboarding flow:
 * Step 1: Connect EVM Wallet
 * Step 2: Separate Platform Selection Screen (Telegram @latticeonhood_bot OR X @latticehoodbot)
 * Step 3: Direct OAuth / App Link Authorization
 * Step 4: Success Screen with cross-platform recommendation
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, signIn, pending } = useSession();
  const { address, chain } = useAccount();
  const [showConsole, setShowConsole] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  if (status === "authenticated") {
    if (showConsole) return <>{children}</>;
    return <SuccessScreen onContinue={() => setShowConsole(true)}>{children}</SuccessScreen>;
  }

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
          <a
            href={`https://t.me/latticeonhood_bot?start=link_${address}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-80 sm:text-xs"
            style={{ backgroundColor: "#229ED9" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons8-telegram-144.png" alt="Telegram" className="h-4 w-4 object-contain invert" />
            Link Telegram Account
          </a>
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
