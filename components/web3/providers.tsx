"use client";

import "@rainbow-me/rainbowkit/styles.css";

import React, { useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/wagmi";
import { robinhoodChain } from "@/lib/chains";
import { ACCENT, FONT_STACK } from "@/lib/brand";
import { SessionProvider } from "@/components/auth/session-provider";
import { ConnectRedirect } from "@/components/auth/connect-redirect";
import { ToastProvider } from "@/components/ui/toast";

/** RainbowKit modal restyled to the site's palette and type. */
const theme = {
  ...lightTheme({
    accentColor: ACCENT,
    accentColorForeground: "#FFFFFF",
    borderRadius: "small",
    fontStack: "system",
    overlayBlur: "small",
  }),
};
theme.fonts.body = FONT_STACK;

export function Web3Providers({ children }: { children: React.ReactNode }) {
  // Per-mount client so a server render never shares cache between requests.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={theme}
          initialChain={robinhoodChain}
          appInfo={{ appName: "Lattice" }}
          modalSize="compact"
        >
          {/* Outside SessionProvider: session actions report failures as toasts. */}
          <ToastProvider>
            <SessionProvider>
              <ConnectRedirect />
              {children}
            </SessionProvider>
          </ToastProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
