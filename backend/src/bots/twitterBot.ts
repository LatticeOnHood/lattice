import { pool } from "../db/index";
import { getWalletByXUserId } from "../services/auth/accountBindingService";
import { fetchDexScreenerTokenData } from "../services/dexscreener";
import { parseIntentWithGroq } from "../services/groq";
import {
  renderTwitterAuditReply,
  renderUnlinkedAccountNotice,
  renderHelpNotice,
  renderInvalidChainNotice,
} from "../templates/cardRenderer";

export interface TwitterIncomingMention {
  tweetId: string;
  authorXUserId: string;
  authorUsername?: string;
  text: string;
}

/**
 * Processes an incoming X mention with 1:1 wallet binding verification
 */
export async function processTwitterMention(mention: TwitterIncomingMention): Promise<string> {
  const { authorXUserId, text } = mention;

  // 1. Enforce 1:1 Wallet Binding authorization check
  const boundWallet = await getWalletByXUserId(authorXUserId);
  if (!boundWallet) {
    return renderUnlinkedAccountNotice("X");
  }

  // 2. Parse Intent via Groq AI
  const intent = await parseIntentWithGroq(text);

  if (intent.action === "HELP") {
    return renderHelpNotice("X");
  }

  if (intent.action === "INVALID_CHAIN") {
    return renderInvalidChainNotice("X");
  }

  if (intent.action === "AUDIT" && intent.tokenAddress) {
    try {
      const metrics = await fetchDexScreenerTokenData(intent.tokenAddress);
      if (!metrics) {
        return `⚠️ No DexScreener liquidity found for token ${intent.tokenAddress}. #Lattice`;
      }

      // Log audit query to Supabase PostgreSQL
      await pool.query(
        `INSERT INTO token_audits (contract_address, chain, token_name, token_symbol, market_cap, raw_gmgn_response)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          metrics.address,
          "robinhood",
          metrics.name,
          metrics.symbol,
          metrics.marketCap,
          JSON.stringify(metrics),
        ]
      ).catch((err) => console.warn("[db] Failed to log audit:", err));

      return renderTwitterAuditReply(metrics);
    } catch (err: any) {
      return `❌ Audit Error: ${err.message || "Unable to fetch token data."} #Lattice`;
    }
  }

  return renderHelpNotice("X");
}
