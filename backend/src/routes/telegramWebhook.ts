import { Router, Request, Response } from "express";
import { processTelegramMessage } from "../bots/telegramBot";

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

      const replyText = await processTelegramMessage({
        messageId: msg.message_id,
        chatId,
        userId,
        username,
        text,
      });

      // Send reply back to Telegram
      if (TELEGRAM_BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: "HTML",
            disable_web_page_preview: false,
            reply_to_message_id: msg.message_id,
          }),
        }).catch((err) => console.error("[telegram-bot] Error sending message:", err));
      }
    }
  } catch (err) {
    console.error("[telegram-webhook] Error processing update:", err);
  }
});

export default router;
