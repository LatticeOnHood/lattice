import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import auditRouter from "./routes/audit";
import telegramWebhookRouter from "./routes/telegramWebhook";
import swapRouter from "./routes/swap";
import verifyRouter from "./routes/verify";

export const app = express();

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

// Routes
app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/api/audit", auditRouter);
app.use("/api/webhook/telegram", telegramWebhookRouter);
app.use("/api/swap", swapRouter);
app.use("/api/v1", verifyRouter);
