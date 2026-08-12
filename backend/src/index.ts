import "dotenv/config";
import { app } from "./app";
import { migrate } from "./db/migrate";
import { startTwitterWorker } from "./workers/twitterWorker";
import { registerTelegramWebhook } from "./bots/telegramBot";

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await migrate();
  } catch (err) {
    console.warn("[server] Migration warning (DB might be unreachable in dev mode):", err);
  }

  // Start background X worker polling
  startTwitterWorker();

  // Register Telegram Webhook with Telegram API
  registerTelegramWebhook().catch((err) =>
    console.warn("[server] Telegram Webhook registration error:", err)
  );

  app.listen(PORT, () => {
    console.log(`[lattice-backend] Server running on port ${PORT}`);
  });
}

start();
