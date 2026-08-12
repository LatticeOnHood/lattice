"use client";

import React from "react";
import { Check, Loader2, Send, X as XIcon } from "lucide-react";
import { ACCENT } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/auth/session-provider";
import { TelegramLoginButton } from "@/components/auth/telegram-login-button";
import { explorerAddressUrl } from "@/lib/chains";

function Row({
  icon,
  label,
  value,
  linked,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  linked: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border border-black/10 bg-white px-4 py-3">
      <span className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-widest text-black sm:text-xs">
        {icon}
        {label}
      </span>
      <span
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest sm:text-xs"
        style={{ color: linked ? ACCENT : "rgba(0,0,0,0.35)" }}
      >
        {linked && <Check className="h-3.5 w-3.5" />}
        {value}
      </span>
    </div>
  );
}

/**
 * Step 4 of the onboarding state machine: the bound wallet + handles, plus the
 * cross-recommendation for whichever platform is still unlinked.
 */
export function LinkedAccountsCard({ className }: { className?: string }) {
  const { session, linkX, linkTelegram, pending, error } = useSession();

  if (!session) return null;

  const { walletAddress, xLinked, xHandle, telegramLinked, telegramUsername } = session;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
          Bound Wallet
        </span>
        <a
          href={explorerAddressUrl(walletAddress)}
          target="_blank"
          rel="noreferrer"
          className="block break-all font-mono text-xs text-black/70 underline-offset-4 hover:underline sm:text-sm"
        >
          {walletAddress}
        </a>
      </div>

      <div className="space-y-px">
        <Row
          icon={<XIcon className="h-3.5 w-3.5" />}
          label="X (Twitter)"
          value={xLinked ? `@${xHandle}` : "Not Linked"}
          linked={xLinked}
        />
        <Row
          icon={<Send className="h-3.5 w-3.5" />}
          label="Telegram"
          value={
            telegramLinked ? (telegramUsername ? `@${telegramUsername}` : "Linked") : "Not Linked"
          }
          linked={telegramLinked}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="border-l-2 pl-3 text-[10px] font-semibold uppercase tracking-widest"
          style={{ borderColor: ACCENT, color: ACCENT }}
        >
          {error}
        </p>
      )}

      {/* Cross-recommendation: X linked → suggest Telegram next. */}
      {xLinked && !telegramLinked && (
        <div className="border border-black/10 p-5" style={{ backgroundColor: "#F4F4F5" }}>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
            Recommended Next Step
          </span>
          <p className="mt-3 text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60">
            Link Telegram to trigger audits from group chats and DMs with the same wallet.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <TelegramLoginButton
              onAuth={linkTelegram}
              disabled={pending === "link-telegram"}
            />
            {pending === "link-telegram" && (
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: ACCENT }} />
            )}
          </div>
        </div>
      )}

      {/* Cross-recommendation: Telegram linked → suggest X next. */}
      {!xLinked && telegramLinked && (
        <div className="border border-black/10 p-5" style={{ backgroundColor: "#F4F4F5" }}>
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
            Recommended Next Step
          </span>
          <p className="mt-3 text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60">
            Link X to trigger automated audits by mentioning @LatticeBot in any thread.
          </p>
          <button
            type="button"
            onClick={linkX}
            disabled={pending === "link-x"}
            className="mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: ACCENT }}
          >
            {pending === "link-x" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Link X Account
          </button>
        </div>
      )}
    </div>
  );
}
