import { Router, Request, Response } from "express";
import { processTelegramMessage, registerTelegramWebhook, getTelegramWebhookInfo } from "../bots/telegramBot";

const router = Router();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

/**
 * POST /api/webhook/telegram
 * Handles webhook updates sent from Telegram servers
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const update = req.body;

    // Fast ACK to Telegram
    res.status(200).send("OK");

    if (update && update.message && update.message.text) {
      const msg = update.message;
      const text = msg.text.trim();
      const userId = String(msg.from?.id || "");
      const username = msg.from?.username || "";
      const chatId = msg.chat?.id || userId;

      if (!userId) return;

      if (msg.entities) {
        const customEmoji = msg.entities.find((e: any) => e.type === "custom_emoji");
        if (customEmoji && customEmoji.custom_emoji_id) {
          console.log(`[telegram-bot] Detected Custom Emoji ID: ${customEmoji.custom_emoji_id}`);
        }
      }

      const replyText = await processTelegramMessage({
        messageId: msg.message_id,
        chatId,
        userId,
        username,
        text,
      });

      // Send official Lattice logo sticker alongside audit report
      const LATTICE_STICKER_FILE_ID = "CAACAgQAAxkBAAMvan3ZsbaJHw98bVrCzFtx2943OTUAAnQeAAIU3vFTuYuAr204bhg9BA";

      if (TELEGRAM_BOT_TOKEN) {
        // Send sticker first
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendSticker`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            sticker: LATTICE_STICKER_FILE_ID,
            reply_to_message_id: msg.message_id,
          }),
        }).catch((err) => console.error("[telegram-bot] Error sending sticker:", err));

        // Send audit card HTML message
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: "HTML",
            disable_web_page_preview: false,
          }),
        }).catch((err) => console.error("[telegram-bot] Error sending message:", err));
      }
    }
  } catch (err) {
    console.error("[telegram-webhook] Error processing update:", err);
  }
});

/**
 * POST /api/webhook/telegram/setup
 * Triggers automatic Telegram webhook registration with Telegram Bot API
 */
router.post("/setup", async (req: Request, res: Response) => {
  const { url } = req.body || {};
  const result = await registerTelegramWebhook(url);
  res.json(result);
});

/**
 * GET /api/webhook/telegram/info
 * Retrieves current Telegram Webhook registration status from Telegram API
 */
router.get("/info", async (_req: Request, res: Response) => {
  const info = await getTelegramWebhookInfo();
  res.json(info);
});

export default router;
