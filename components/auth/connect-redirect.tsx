"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

/** Routes that already host a step of the onboarding flow. */
const FLOW_ROUTES = ["/app", "/auth/callback"];

/**
 * Carries the user from step 1 into step 2 of the onboarding flow.
 *
 * The connect button sits in the site nav, so a wallet can be connected from
 * the landing page — but signing and social linking only exist at /app. Without
 * this, connecting from anywhere else looks like it did nothing.
 *
 * Only a *deliberate* connect navigates. wagmi reconnects a stored session on
 * every page load, and bouncing a returning visitor off the marketing pages
 * would be worse than the bug this fixes — so the redirect is armed by the
 * connect modal opening, not by the connected state itself.
 */
export function ConnectRedirect() {
  const { isConnected } = useAccount();
  const { connectModalOpen } = useConnectModal();
  const router = useRouter();
  const pathname = usePathname();

  const userInitiated = useRef(false);

  useEffect(() => {
    if (connectModalOpen) userInitiated.current = true;
  }, [connectModalOpen]);

  useEffect(() => {
    if (!isConnected || !userInitiated.current) return;
    userInitiated.current = false;

    if (FLOW_ROUTES.some((route) => pathname.startsWith(route))) return;
    router.push("/app");
  }, [isConnected, pathname, router]);

  return null;
}
