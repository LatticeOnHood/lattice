import "dotenv/config";
import { app } from "./app";
import { migrate } from "./db/migrate";
import { startTwitterWorker } from "./workers/twitterWorker";

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await migrate();
  } catch (err) {
    console.warn("[server] Migration warning (DB might be unreachable in dev mode):", err);
  }

  // Start background X worker polling
  startTwitterWorker();

  app.listen(PORT, () => {
    console.log(`[lattice-backend] Server running on port ${PORT}`);
  });
}

start();
