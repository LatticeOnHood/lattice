import { ApiError } from "@/lib/api";

export interface FriendlyError {
  title: string;
  description?: string;
}

/**
 * Turns anything thrown by wagmi/viem or the Lattice API into copy a user can
 * act on. Wallet libraries throw multi-paragraph diagnostics and the API throws
 * bare status codes; neither belongs in front of a person.
 */
export function friendlyError(err: unknown): FriendlyError {
  if (err instanceof ApiError) return fromApiError(err);

  if (err instanceof Error) {
    const wallet = fromWalletError(err.message);
    if (wallet) return wallet;

    // Never leak a stack trace or a multi-paragraph viem dump into the UI.
    return { title: "Something went wrong", description: firstLine(err.message) };
  }

  return { title: "Something went wrong", description: "Please try again." };
}

function fromApiError(err: ApiError): FriendlyError {
  switch (err.status) {
    case 0:
      return {
        title: "Can't reach Lattice",
        description: "Check your connection and try again.",
      };
    case 400:
      return { title: "That request was incomplete", description: err.message };
    case 401:
      return {
        title: "We couldn't verify that signature",
        description: "Sign the message again with the connected wallet.",
      };
    case 409:
      return {
        title: "Already linked",
        description: err.message,
      };
    case 429:
      // The backend already phrases rate limiting for humans.
      return { title: "Slow down a moment", description: err.message };
    case 444:
      return {
        title: "No trading pair found",
        description: "That token has no liquidity pool on DexScreener yet.",
      };
    case 502:
    case 503:
    case 504:
      return {
        title: "Lattice is unreachable",
        description: "The API is not responding. Try again shortly.",
      };
    default:
      if (err.status >= 500) {
        return {
          title: "Something went wrong on our side",
          description: "Try again in a moment.",
        };
      }
      return { title: "That didn't work", description: err.message };
  }
}

/** Wallet rejections are the most common failure — they are not real errors. */
function fromWalletError(message: string): FriendlyError | null {
  if (/user rejected|user denied|rejected the request|action_rejected/i.test(message)) {
    return {
      title: "Signature declined",
      description: "Approve the message in your wallet to continue.",
    };
  }

  if (/connector not connected|no connector|disconnected/i.test(message)) {
    return {
      title: "Wallet disconnected",
      description: "Reconnect your wallet and try again.",
    };
  }

  if (/chain mismatch|chain not configured|unsupported chain/i.test(message)) {
    return {
      title: "Wrong network",
      description: "Switch to Robinhood Chain in your wallet.",
    };
  }

  if (/timeout|timed out/i.test(message)) {
    return {
      title: "That took too long",
      description: "Your wallet didn't respond. Try again.",
    };
  }

  return null;
}

function firstLine(message: string): string {
  const line = message.split("\n")[0].trim();
  return line.length > 140 ? `${line.slice(0, 137)}…` : line;
}
