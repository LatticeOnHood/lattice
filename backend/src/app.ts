import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import auditRouter from "./routes/audit";
import telegramWebhookRouter from "./routes/telegramWebhook";
import swapRouter from "./routes/swap";
import verifyRouter from "./routes/verify";
import cronRouter from "./routes/cron";
import { rateLimit } from "./middleware/rateLimit";

export const app = express();

// Trust the platform proxy so `req.ip` is the real caller, not the load balancer —
// without this every request shares one rate-limit bucket.
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

// Structured HTTP Request Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[http] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

/**
 * Abuse ceilings, per caller — deliberately not a usage budget.
 *
 * These started at 20/min for the dashboard, which was far too tight: a person
 * checking a handful of tokens, retrying a stalled request, or clicking through
 * a few reports burns that in under a minute and gets locked out of their own
 * product. The limit exists to stop one trending contract from draining the
 * upstream RPC and indexer budget, not to ration ordinary use, so it is set well
 * above anything a human generates and only bites on genuine runaway traffic.
 *
 * Not applied to /health (must stay probe-able), /auth (its own failure modes) or
 * the Telegram webhook (Telegram controls that call rate, and dropping a webhook
 * loses a user's message).
 */
const auditLimiter = rateLimit({ windowMs: 60_000, max: 240 });
const agentLimiter = rateLimit({ windowMs: 60_000, max: 480 });

// Routes
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "lattice-backend",
    docs: "https://api.latticehood.app/api/v1/schema",
    timestamp: new Date().toISOString(),
  });
});
app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/api/audit", auditLimiter, auditRouter);
app.use("/api/webhook/telegram", telegramWebhookRouter);
app.use("/api/swap", swapRouter);
app.use("/api/v1", agentLimiter, verifyRouter);
app.use("/api/cron", cronRouter);
