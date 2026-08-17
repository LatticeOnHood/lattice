/**
 * ACP provider runtime — wires the Virtuals job lifecycle to our fulfilment.
 *
 * Everything here is opt-in. With ACP_ENABLED unset (the default) this module
 * logs one line and returns, so deploying it cannot affect the bots, the swap
 * routes, or anything else already live.
 *
 * Lifecycle we participate in as provider:
 *   job.created  -> quote the offering price   (session.setBudget)
 *   job.funded   -> run the audit, deliver     (session.submit / session.reject)
 */

import {
  AcpAgent,
  AssetToken,
  JobSession,
  PrivyAlchemyEvmProviderAdapter,
  type JobRoomEntry,
} from "@virtuals-protocol/acp-node-v2";
import type { Address } from "viem";
import { handleVerifyTokenJob } from "./handler";
import { OFFERING_NAME, OFFERING_PRICE_USD } from "./offering";

export interface AcpProviderConfig {
  walletId: string;
  walletAddress: Address;
  signerPrivateKey: string;
  builderCode?: string;
  chainId: number;
}

/** Robinhood Chain Testnet. ACP contracts are deployed here — see SUPPORTED_CHAINS. */
export const DEFAULT_ACP_CHAIN_ID = 46630;

export function readAcpConfig(env: NodeJS.ProcessEnv = process.env): AcpProviderConfig | null {
  if (env.ACP_ENABLED !== "true") return null;

  const walletId = env.ACP_EVM_WALLET_ID?.trim();
  const walletAddress = env.ACP_AGENT_WALLET_ADDRESS?.trim();
  const signerPrivateKey = env.ACP_SIGNER_PRIVATE_KEY?.trim();

  const missing = [
    !walletId && "ACP_EVM_WALLET_ID",
    !walletAddress && "ACP_AGENT_WALLET_ADDRESS",
    !signerPrivateKey && "ACP_SIGNER_PRIVATE_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    console.warn(`[acp] ACP_ENABLED=true but missing: ${missing.join(", ")}. Provider not started.`);
    return null;
  }

  return {
    walletId: walletId!,
    walletAddress: walletAddress! as Address,
    signerPrivateKey: signerPrivateKey!,
    builderCode: env.ACP_BUILDER_CODE?.trim() || undefined,
    chainId: Number(env.ACP_CHAIN_ID) || DEFAULT_ACP_CHAIN_ID,
  };
}

/**
 * The requirement arrives as its own message on the job room, not on the
 * job.created event, so it is read back off the session's entries.
 */
export function findRequirement(session: JobSession): unknown | null {
  for (let i = session.entries.length - 1; i >= 0; i--) {
    const entry = session.entries[i];
    if (entry.kind === "message" && entry.contentType === "requirement") {
      try {
        return JSON.parse(entry.content);
      } catch {
        return entry.content;
      }
    }
  }
  return null;
}

export async function handleEntry(session: JobSession, entry: JobRoomEntry): Promise<void> {
  if (!session.roles.includes("provider")) return;
  if (entry.kind !== "system") return;
  if (!session.shouldRespond(entry)) return;

  const { event } = entry;

  try {
    if (event.type === "job.created") {
      const price = AssetToken.usdc(OFFERING_PRICE_USD, session.chainId);
      await session.setBudget(price);
      console.log(`[acp] job ${session.jobId}: quoted $${OFFERING_PRICE_USD} for ${OFFERING_NAME}`);
      return;
    }

    if (event.type === "job.funded") {
      const requirement = findRequirement(session);

      if (requirement === null) {
        await session.reject("No requirement payload found on this job.");
        console.warn(`[acp] job ${session.jobId}: rejected — no requirement message`);
        return;
      }

      const outcome = await handleVerifyTokenJob(requirement);

      if (outcome.status === "rejected") {
        await session.reject(outcome.reason);
        console.warn(`[acp] job ${session.jobId}: rejected — ${outcome.reason}`);
        return;
      }

      await session.submit(JSON.stringify(outcome.deliverable));
      console.log(
        `[acp] job ${session.jobId}: delivered report for ${outcome.deliverable.address}`
      );
    }
  } catch (err: any) {
    // A throw inside the entry handler would otherwise kill the listener and
    // silently stop the agent responding to every future job.
    console.error(`[acp] job ${session.jobId}: handler error on ${event.type}:`, err?.message || err);
  }
}

let agent: AcpAgent | null = null;

export async function startAcpProvider(): Promise<AcpAgent | null> {
  const config = readAcpConfig();

  if (!config) {
    console.log("[acp] Provider disabled (set ACP_ENABLED=true to enable).");
    return null;
  }

  try {
    const evmProvider = await PrivyAlchemyEvmProviderAdapter.create({
      walletId: config.walletId,
      walletAddress: config.walletAddress,
      signerPrivateKey: config.signerPrivateKey,
      builderCode: config.builderCode,
    });

    agent = await AcpAgent.create({ evmProvider });
    agent.on("entry", handleEntry);

    await agent.start(() => {
      console.log(
        `[acp] Provider listening as ${config.walletAddress} on chain ${config.chainId} — offering "${OFFERING_NAME}" at $${OFFERING_PRICE_USD}`
      );
    });

    return agent;
  } catch (err: any) {
    // Never let ACP take the API down with it.
    console.error("[acp] Failed to start provider:", err?.message || err);
    return null;
  }
}

export async function stopAcpProvider(): Promise<void> {
  if (agent) {
    await agent.stop();
    agent = null;
  }
}
