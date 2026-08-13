"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import type { TelegramWidgetUser } from "@/lib/api";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.replace(/^@/, "") || "latticehood_bot";

declare global {
  interface Window {
    [key: `onTelegramAuth_${string}`]: ((user: TelegramWidgetUser) => void) | undefined;
  }
}

/**
 * Telegram's official Login Widget.
 *
 * The widget is an iframe injected by Telegram's own script and can only report
 * back through a global function named in `data-onauth`, so the callback is
 * registered on `window` under an instance-unique key and torn down on unmount.
 * The payload it returns is HMAC-signed; `POST /auth/telegram/widget` verifies
 * that hash server-side against the bot token.
 */
export function TelegramLoginButton({
  onAuth,
  disabled = false,
}: {
  onAuth: (user: TelegramWidgetUser) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onAuthRef = useRef(onAuth);
  const rawId = useId();
  const callbackName = `onTelegramAuth_${rawId.replace(/[^a-zA-Z0-9]/g, "")}` as const;
  const [failed, setFailed] = useState(false);

  // Keep the latest handler without re-injecting the script on every render.
  useEffect(() => {
    onAuthRef.current = onAuth;
  }, [onAuth]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !BOT_USERNAME) return;

    window[callbackName as `onTelegramAuth_${string}`] = (user: TelegramWidgetUser) =>
      onAuthRef.current(user);

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "20");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", `${callbackName}(user)`);
    script.onerror = () => setFailed(true);

    container.appendChild(script);

    return () => {
      container.replaceChildren();
      delete window[callbackName as `onTelegramAuth_${string}`];
    };
  }, [callbackName]);

  if (!BOT_USERNAME) {
    return (
      <p className="text-[10px] font-semibold uppercase tracking-widest text-black/55">
        Telegram linking unavailable — NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is not set.
      </p>
    );
  }

  if (failed) {
    return (
      <p className="text-[10px] font-semibold uppercase tracking-widest text-black/55">
        Telegram widget failed to load. Disable your blocker and retry.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className={
        disabled ? "pointer-events-none opacity-50" : undefined
      }
      // Telegram renders a fixed-height iframe; reserve the space so the card
      // does not jump once the script resolves.
      style={{ minHeight: 40 }}
    />
  );
}
