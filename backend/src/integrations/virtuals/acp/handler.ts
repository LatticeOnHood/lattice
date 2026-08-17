/**
 * Fulfilment for the `verifyToken` ACP offering.
 *
 * Deliberately free of any ACP SDK import. The SDK adapter is a thin shell that
 * receives a job event, hands the requirement payload to `handleVerifyTokenJob`,
 * and submits whatever comes back. Keeping the fulfilment pure means the whole
 * job path is testable with no credentials, no wallet and no network — which is
 * what lets this ship before the agent's signer key exists.
 */

import { DexScreenerTokenMetrics, isValidEvmAddress } from "../../../services/dexscreener";
import { fetchTokenAuditData } from "../../../services/codex";
import { buildVerificationReport } from "../buildReport";
import { VerificationReport } from "../reportSchema";

export interface VerifyTokenRequirement {
  contractAddress: string;
}

export type JobOutcome =
  | { status: "delivered"; deliverable: VerificationReport }
  | { status: "rejected"; reason: string };

export type TokenFetcher = (address: string) => Promise<DexScreenerTokenMetrics | null>;

export interface HandlerDeps {
  fetchToken?: TokenFetcher;
  now?: () => string;
}

/**
 * Narrows an untrusted requirement payload off the wire.
 *
 * ACP validates against the offering schema before we see it, but a provider
 * that trusts an upstream validator it does not control is one schema change
 * away from a crash inside the job loop.
 */
export function parseRequirement(raw: unknown): VerifyTokenRequirement | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: "Requirement payload must be an object." };
  }

  const contractAddress = (raw as Record<string, unknown>).contractAddress;

  if (typeof contractAddress !== "string" || contractAddress.trim() === "") {
    return { error: "Requirement field 'contractAddress' is required." };
  }

  if (!isValidEvmAddress(contractAddress)) {
    return {
      error: `'${contractAddress}' is not a valid EVM contract address. Lattice verifies Robinhood Chain (4663) tokens in 0x format.`,
    };
  }

  return { contractAddress: contractAddress.trim() };
}

export async function handleVerifyTokenJob(
  raw: unknown,
  deps: HandlerDeps = {}
): Promise<JobOutcome> {
  const parsed = parseRequirement(raw);
  if ("error" in parsed) {
    return { status: "rejected", reason: parsed.error };
  }

  const fetchToken = deps.fetchToken ?? fetchTokenAuditData;

  let metrics: DexScreenerTokenMetrics | null;
  try {
    metrics = await fetchToken(parsed.contractAddress);
  } catch (err: any) {
    return {
      status: "rejected",
      reason: `Upstream data provider failed: ${err?.message || "unknown error"}`,
    };
  }

  if (!metrics) {
    return {
      status: "rejected",
      reason: `No indexed liquidity pool or trading pair found for ${parsed.contractAddress.toLowerCase()}.`,
    };
  }

  return {
    status: "delivered",
    deliverable: buildVerificationReport(metrics, { generatedAt: deps.now?.() }),
  };
}
