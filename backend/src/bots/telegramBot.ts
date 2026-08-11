import { pool } from "../db/index";
import { getWalletByTelegramUserId } from "../services/auth/accountBindingService";
import { fetchDexScreenerTokenData } from "../services/dexscreener";
import { parseIntentWithGroq } from "../services/groq";
import {
  renderTelegramAuditCard,
  renderUnlinkedAccountNotice,
  renderHelpNotice,
  renderInvalidChainNotice,
} from "../templates/cardRenderer";

export interface TelegramIncomingMessage {
  messageId: number;
  chatId: number | string;
  userId: string;
  username?: string;
  text: string;
}

const FRONTEND_URL = process.env.FRONTEND_URL || "https://lattice.audit";

/**
 * Handles an incoming Telegram message with 1:1 wallet binding verification
 */
export async function processTelegramMessage(msg: TelegramIncomingMessage): Promise<string> {
  const { userId, username, text } = msg;

  const trimmedText = text.trim();

  // Check for explicit /link or /start link_ command
  if (trimmedText.startsWith("/link") || trimmedText.startsWith("/start link_")) {
    const linkUrl = `${FRONTEND_URL}/connect?platform=telegram&tg_user_id=${encodeURIComponent(userId)}${username ? `&username=${encodeURIComponent(username)}` : ""}`;
    return `🔗 <b>Lattice Wallet Binding</b>

Click the link below to connect your EVM wallet and bind your Telegram account:
<a href="${linkUrl}">${linkUrl}</a>`;
  }

  // 1. Enforce 1:1 Wallet Binding authorization check
  const boundWallet = await getWalletByTelegramUserId(userId);
  if (!boundWallet) {
    return renderUnlinkedAccountNotice("TELEGRAM");
  }

  // 2. Parse Intent via Groq AI
  const intent = await parseIntentWithGroq(text);

  if (intent.action === "HELP") {
    return renderHelpNotice("TELEGRAM");
  }

  if (intent.action === "INVALID_CHAIN") {
    return renderInvalidChainNotice("TELEGRAM");
  }

  if (intent.action === "AUDIT" && intent.tokenAddress) {
    try {
      const metrics = await fetchDexScreenerTokenData(intent.tokenAddress);
      if (!metrics) {
        return `⚠️ No trading pairs or liquidity found on DexScreener for address <code>${intent.tokenAddress}</code>.`;
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

      return renderTelegramAuditCard(metrics);
    } catch (err: any) {
      return `❌ Audit Error: ${err.message || "Failed to retrieve token data."}`;
    }
  }

  return renderHelpNotice("TELEGRAM");
}
