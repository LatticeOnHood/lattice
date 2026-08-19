"use client";

import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ACCENT } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function shortenAddress(address?: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * RainbowKit's connect flow behind the site's own button styling — the default
 * widget's rounded/blue chrome reads as a foreign element next to the
 * uppercase, hard-edged type used everywhere else.
 */
export function ConnectWalletButton({
  className,
  size = "md",
  label = "Connect Wallet",
  showChain = true,
}: {
  className?: string;
  size?: "sm" | "md";
  label?: string;
  /**
   * The chain pill only ever reads "Robinhood Chain" on a single-chain app, so
   * in the top nav it crowds the row without saying anything. Off there, on
   * everywhere the wallet is the subject rather than a corner accessory.
   */
  showChain?: boolean;
}) {
  const base = cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold uppercase tracking-widest transition-opacity hover:opacity-80 disabled:opacity-50",
    size === "sm" ? "px-4 py-2 text-[10px]" : "px-6 py-3 text-[11px] sm:text-xs",
    className
  );

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            aria-hidden={!ready}
            className={cn(!ready && "pointer-events-none select-none opacity-0")}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    type="button"
                    onClick={openConnectModal}
                    className={cn(base, "text-white")}
                    style={{ backgroundColor: ACCENT }}
                  >
                    {label}
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    type="button"
                    onClick={openChainModal}
                    className={cn(base, "bg-black text-white")}
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  {showChain && (
                    <button
                      type="button"
                      onClick={openChainModal}
                      className={cn(
                        base,
                        "border border-black/15 bg-white text-black"
                      )}
                      title={chain.name}
                    >
                      <span
                        className="block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: ACCENT }}
                      />
                      <span className="hidden sm:inline">{chain.name}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={openAccountModal}
                    className={cn(base, "bg-black text-white")}
                  >
                    {account.displayName}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
