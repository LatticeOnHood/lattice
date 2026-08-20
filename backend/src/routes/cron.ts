import { Router } from "express";
import { pollTwitterMentionsOnce } from "../workers/twitterWorker";

const router = Router();

router.get("/twitter", async (req, res) => {
  try {
    const processed = await pollTwitterMentionsOnce();
    return res.json({ ok: true, processed, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error("[cron-twitter] Error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
});

export default router;
