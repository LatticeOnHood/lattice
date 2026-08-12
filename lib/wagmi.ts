import { http } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  ledgerWallet,
  metaMaskWallet,
  okxWallet,
  phantomWallet,
  rainbowWallet,
  trustWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { robinhoodWallet } from "@/lib/wallets/robinhood-wallet";
import { ROBINHOOD_RPC_URL, robinhoodChain } from "@/lib/chains";

/**
 * WalletConnect project id — free from https://cloud.reown.com.
 *
 * Without one, every WalletConnect-backed wallet (Robinhood included) would
 * fail at connect time with an opaque relay error, so those entries are dropped
 * from the modal instead and only browser-injected wallets are offered.
 */
const projectId = (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "").trim();

export const WALLETCONNECT_ENABLED = projectId.length > 0;

const APP_NAME = "Lattice";

const wallets = WALLETCONNECT_ENABLED
  ? [
      {
        groupName: "Robinhood Chain",
        wallets: [robinhoodWallet, metaMaskWallet, rainbowWallet, coinbaseWallet],
      },
      {
        groupName: "More wallets",
        wallets: [
          walletConnectWallet,
          trustWallet,
          okxWallet,
          phantomWallet,
          ledgerWallet,
          injectedWallet,
        ],
      },
    ]
  : [
      {
        groupName: "Installed",
        wallets: [metaMaskWallet, coinbaseWallet, injectedWallet],
      },
    ];

export const wagmiConfig = getDefaultConfig({
  appName: APP_NAME,
  appDescription:
    "On-chain verification for Robinhood Chain tokens. Tag the bot, get the receipt.",
  appUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://latticehood.app",
  appIcon: "/logo.png",
  projectId: projectId || "lattice-local-dev",
  wallets,
  chains: [robinhoodChain],
  transports: {
    [robinhoodChain.id]: http(ROBINHOOD_RPC_URL),
  },
  // The marketing pages are statically rendered; without this wagmi would try
  // to hydrate connector state during SSR.
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
