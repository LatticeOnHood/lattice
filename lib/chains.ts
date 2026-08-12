import { defineChain } from "viem";
import { robinhood, robinhoodTestnet } from "viem/chains";

/**
 * Robinhood Chain — the Arbitrum Orbit L2 Lattice audits tokens on.
 *
 * viem ships both networks (mainnet 4663 / testnet 46630) with the public
 * Robinhood RPC. Those public endpoints are rate limited, so a deployment can
 * point at its own provider through NEXT_PUBLIC_ROBINHOOD_RPC_URL without the
 * chain metadata drifting from viem's.
 */

const USE_TESTNET = process.env.NEXT_PUBLIC_ROBINHOOD_NETWORK === "testnet";

const base = USE_TESTNET ? robinhoodTestnet : robinhood;

const RPC_OVERRIDE = process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL?.trim();

export const robinhoodChain = RPC_OVERRIDE
  ? defineChain({
      ...base,
      rpcUrls: { default: { http: [RPC_OVERRIDE] } },
    })
  : base;

export const IS_TESTNET = USE_TESTNET;

/** Public RPC URL actually in use — also what wagmi's transport is built on. */
export const ROBINHOOD_RPC_URL =
  RPC_OVERRIDE || base.rpcUrls.default.http[0];

/** Blockscout instance for the active network. */
export const ROBINHOOD_EXPLORER_URL = base.blockExplorers.default.url;

export function explorerAddressUrl(address: string): string {
  return `${ROBINHOOD_EXPLORER_URL}/address/${address}`;
}

export function explorerTokenUrl(address: string): string {
  return `${ROBINHOOD_EXPLORER_URL}/token/${address}`;
}
