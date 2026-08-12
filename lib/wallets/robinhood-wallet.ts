import { getWalletConnectConnector } from "@rainbow-me/rainbowkit";
import type { RainbowKitWalletConnectParameters, Wallet } from "@rainbow-me/rainbowkit";

interface RobinhoodWalletOptions {
  projectId: string;
  walletConnectParameters?: RainbowKitWalletConnectParameters;
}

/**
 * Robinhood Wallet as a first-class entry in the RainbowKit modal.
 *
 * RainbowKit has no built-in Robinhood connector, and Robinhood Wallet exposes
 * no published deep-link scheme — its documented path is WalletConnect. So this
 * is a custom wallet over the standard WalletConnect connector: desktop and
 * mobile both hand the user the WalletConnect URI (QR on desktop, OS handoff on
 * mobile) which the Robinhood app consumes.
 *
 * @see https://rainbowkit.com/docs/custom-wallets
 * @see https://robinhood.com/support/articles/connect-to-dapps/
 */
export const robinhoodWallet = ({
  projectId,
  walletConnectParameters,
}: RobinhoodWalletOptions): Wallet => ({
  id: "robinhood",
  name: "Robinhood Wallet",
  shortName: "Robinhood",
  iconUrl: "/wallets/robinhood.svg",
  iconBackground: "#00C805",
  downloadUrls: {
    android: "https://play.google.com/store/apps/details?id=com.robinhood.android",
    ios: "https://apps.apple.com/app/robinhood/id938003185",
    mobile: "https://robinhood.com/crypto/wallet",
    qrCode: "https://robinhood.com/crypto/wallet",
  },
  // No proprietary scheme to deep-link into: hand the raw WalletConnect URI to
  // the OS so Robinhood Wallet can claim it.
  mobile: { getUri: (uri: string) => uri },
  qrCode: {
    getUri: (uri: string) => uri,
    instructions: {
      learnMoreUrl: "https://robinhood.com/support/articles/connect-to-dapps/",
      steps: [
        {
          step: "install",
          title: "Open the Robinhood app",
          description:
            "Robinhood Wallet lives inside the Robinhood mobile app. Install it, then open the Crypto tab.",
        },
        {
          step: "create",
          title: "Set up your wallet",
          description:
            "Create or import a self-custody wallet under Crypto → Wallet before connecting.",
        },
        {
          step: "scan",
          title: "Scan the code",
          description:
            "Tap the WalletConnect scanner in Robinhood Wallet and point it at this QR code.",
        },
      ],
    },
  },
  createConnector: getWalletConnectConnector({
    projectId,
    walletConnectParameters,
  }),
});
