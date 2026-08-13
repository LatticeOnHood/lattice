import { pool } from "../db/index";
import { getWalletByTelegramUserId } from "../services/auth/accountBindingService";
import { fetchTokenAuditData } from "../services/codex";
import { parseIntentWithGroq } from "../services/groq";
import {
  renderTelegramAuditCard,
  renderSpecificMetricsCard,
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

const FRONTEND_URL = process.env.FRONTEND_URL || "https://latticehood.app";
const BACKEND_URL = process.env.BACKEND_URL || "https://api.latticehood.app";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

/**
 * Registers Telegram Bot Webhook with Telegram servers
 */
export async function registerTelegramWebhook(targetWebhookUrl?: string): Promise<{ success: boolean; description: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log("[telegram-bot] TELEGRAM_BOT_TOKEN not set, skipping webhook registration.");
    return { success: false, description: "TELEGRAM_BOT_TOKEN not configured" };
  }

  const webhookUrl = targetWebhookUrl || `${BACKEND_URL}/api/webhook/telegram`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "edited_message"],
      }),
    });

    const json = await response.json();
    if (json.ok) {
      console.log(`[telegram-bot] Webhook set successfully to ${webhookUrl}`);
    } else {
      console.warn(`[telegram-bot] Failed to set webhook: ${json.description}`);
    }

    return { success: json.ok, description: json.description || "OK" };
  } catch (err: any) {
    console.error("[telegram-bot] Webhook registration error:", err);
    return { success: false, description: err.message || "Failed to register webhook" };
  }
}

/**
 * Retrieves current Telegram Webhook Info from Telegram API
 */
export async function getTelegramWebhookInfo(): Promise<any> {
  if (!TELEGRAM_BOT_TOKEN) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" };

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
    return response.json();
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

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

  if ((intent.action === "AUDIT" || intent.action === "SPECIFIC_METRICS") && intent.tokenAddress) {
    try {
      const metrics = await fetchTokenAuditData(intent.tokenAddress);
      if (!metrics) {
        return `⚠️ No trading pairs or liquidity found on DexScreener/Codex for address <code>${intent.tokenAddress}</code>.`;
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
        return renderSpecificMetricsCard(metrics, intent.requestedMetrics, "TELEGRAM");
      }

      return renderTelegramAuditCard(metrics);
    } catch (err: any) {
      return `❌ Audit Error: ${err.message || "Failed to retrieve token data."}`;
    }
  }

  return renderHelpNotice("TELEGRAM");
}
