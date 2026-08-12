"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { ACCENT } from "@/lib/brand";
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
    <div className="mx-auto w-full max-w-lg border border-black/10 bg-white p-8 md:p-10">
      <span className="text-sm font-semibold tracking-widest" style={{ color: ACCENT }}>
        {step}
      </span>
      <h2 className="mt-4 text-xl font-semibold uppercase tracking-widest text-black md:text-2xl">
        {title}
      </h2>
      <p className="mt-3 text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-xs">
        {body}
      </p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

/**
 * Enforces the onboarding order from the auth spec: wallet first, then a signed
 * verification message, then a social binding. `children` only render once a
 * JWT is held.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, address, signIn, linkTelegram, pending, error } = useSession();
  const { chain } = useAccount();

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  if (status === "authenticated") return <>{children}</>;

  /* --------------------------------------------------- Step 1: connect */
  if (status === "disconnected") {
    return (
      <StepFrame
        step="01"
        title="Connect Your Wallet"
        body={`Lattice binds one EVM wallet to one X account and one Telegram account. Connect on ${robinhoodChain.name} to begin.`}
      >
        <ConnectWalletButton className="w-full" />
        {!WALLETCONNECT_ENABLED && (
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-black/40">
            WalletConnect is disabled — set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to
            offer Robinhood Wallet and other mobile wallets.
          </p>
        )}
      </StepFrame>
    );
  }

  /* ------------------------------------------- Step 2 + 3: sign & link */
  const wrongNetwork = chain && chain.id !== robinhoodChain.id;

  return (
    <StepFrame
      step="02"
      title="Verify Wallet Ownership"
      body="Sign a plain-text message to prove you control this address. Free, off-chain, no transaction and no token approval."
    >
      <p className="break-all font-mono text-xs text-black/70">{address}</p>

      {wrongNetwork && (
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-black/40">
          Connected to {chain?.name}. Signing works on any network, but audits
          target {robinhoodChain.name}.
        </p>
      )}

      <button
        type="button"
        onClick={signIn}
        disabled={pending === "signin"}
        className={cn(
          "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[11px] font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-50 sm:text-xs"
        )}
        style={{ backgroundColor: ACCENT }}
      >
        {pending === "signin" && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending === "signin" ? "Check Your Wallet" : "Sign Verification Message"}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-4 border-l-2 pl-3 text-[10px] font-semibold uppercase tracking-widest"
          style={{ borderColor: ACCENT, color: ACCENT }}
        >
          {error}
        </p>
      )}

      <div className="mt-8 border-t border-black/10 pt-6">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
          Step 03 — Or Link Telegram First
        </span>
        <p className="mt-3 text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60">
          Signing above sends you to X. To bind Telegram to this wallet instead,
          use the widget — you will be asked to sign the same message.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <TelegramLoginButton onAuth={linkTelegram} disabled={pending === "link-telegram"} />
          {pending === "link-telegram" && (
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: ACCENT }} />
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <ConnectWalletButton size="sm" />
      </div>
    </StepFrame>
  );
}
