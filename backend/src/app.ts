import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import auditRouter from "./routes/audit";
import telegramWebhookRouter from "./routes/telegramWebhook";
import swapRouter from "./routes/swap";
import verifyRouter from "./routes/verify";
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
 * Read budgets, per caller. Both surfaces hit the same upstream indexers, so both
 * are limited; the agent surface gets a larger allowance because an autonomous
 * client legitimately polls harder than a person typing addresses.
 *
 * Not applied to /health (must stay probe-able), /auth (its own failure modes) or
 * the Telegram webhook (Telegram controls that call rate, and dropping a webhook
 * loses a user's message).
 */
const auditLimiter = rateLimit({ windowMs: 60_000, max: 20 });
const agentLimiter = rateLimit({ windowMs: 60_000, max: 60 });

// Routes
app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/api/audit", auditLimiter, auditRouter);
app.use("/api/webhook/telegram", telegramWebhookRouter);
app.use("/api/swap", swapRouter);
app.use("/api/v1", agentLimiter, verifyRouter);
