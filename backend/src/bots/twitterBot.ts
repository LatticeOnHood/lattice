import { pool } from "../db/index";
import { getWalletByXUserId, getWalletByXHandle, linkXAccount } from "../services/auth/accountBindingService";
import { fetchTokenAuditData } from "../services/codex";
import { parseIntentWithGroq } from "../services/groq";
import { quoteSwap } from "../lib/uniswap";
import {
  renderTwitterAuditReply,
  renderSpecificMetricsCard,
  renderUnlinkedAccountNotice,
  renderHelpNotice,
  renderInvalidChainNotice,
  renderTradeQuoteCard,
} from "../templates/cardRenderer";

export interface TwitterIncomingMention {
  tweetId: string;
  authorXUserId: string;
  authorUsername?: string;
  text: string;
}

/**
 * Processes an incoming X mention with 1:1 wallet binding verification (TagioPay Architecture)
 * Senders who aren't a linked Lattice+X user are silently ignored (no reply) to prevent noise,
 * link spam shadowbans, and X API rate limit budget exhaustion.
 */
export async function processTwitterMention(mention: TwitterIncomingMention): Promise<string | null> {
  const { authorXUserId, authorUsername, text } = mention;

  // 1. Check for Help / Commands intent
  const cleaned = text.replace(/@\w+/g, "").trim().toLowerCase();
  if (
    cleaned === "/help" ||
    cleaned === "help" ||
    cleaned === "/start" ||
    cleaned === "start" ||
    cleaned === "/commands" ||
    cleaned === "commands" ||
    /^(?:help|commands|\/help|\/commands)(?:\s|$)/i.test(cleaned)
  ) {
    return renderHelpNotice("X");
  }

  // 2. Enforce 1:1 Wallet Binding authorization check (TagioPay Pattern: Silently ignore unlinked senders)
  let boundWallet = await getWalletByXUserId(authorXUserId);
  if (!boundWallet && authorUsername) {
    boundWallet = await getWalletByXHandle(authorUsername);
    if (boundWallet) {
      await linkXAccount(boundWallet, authorXUserId, authorUsername).catch((err) =>
        console.warn("[x-bot] Failed to sync updated x_user_id:", err)
      );
    }
  }
  if (!boundWallet) {
    console.log(`[x-bot] Mentions ignored for unlinked sender (authorId: ${authorXUserId}, username: @${authorUsername || "unknown"})`);
    return null;
  }

  // 2. Parse Intent via Groq AI
  const intent = await parseIntentWithGroq(text);

  if (intent.action === "HELP") {
    return renderHelpNotice("X");
  }

  if (intent.action === "INVALID_CHAIN") {
    return renderInvalidChainNotice("X");
  }

  if (intent.action === "TRADE" && intent.tradeDetails) {
    try {
      const { fromToken, toToken, amountIn } = intent.tradeDetails;
      const quote = await quoteSwap(fromToken, toToken, amountIn);
      if (!quote) {
        return `⚠️ No active Uniswap liquidity route found for ${fromToken} -> ${toToken}. #Lattice`;
      }
      return renderTradeQuoteCard(quote, "X", intent.tradeDetails);
    } catch (err: any) {
      return `❌ Trade Error: ${err.message || "Unable to quote trade."} #Lattice`;
    }
  }

  if ((intent.action === "AUDIT" || intent.action === "SPECIFIC_METRICS") && intent.tokenAddress) {
    try {
      const metrics = await fetchTokenAuditData(intent.tokenAddress);
      if (!metrics) {
        return `⚠️ No liquidity pool found for token ${intent.tokenAddress}. #Lattice`;
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

      if (intent.action === "SPECIFIC_METRICS" && intent.requestedMetrics && intent.requestedMetrics.length > 0 && !intent.requestedMetrics.includes("FULL_AUDIT")) {
        return renderSpecificMetricsCard(metrics, intent.requestedMetrics, "X");
      }

      return renderTwitterAuditReply(metrics);
    } catch (err: any) {
      return `❌ Audit Error: ${err.message || "Unable to fetch token data."} #Lattice`;
    }
  }

  // Unrecognized command / noise — silently ignore
  return null;
}
