import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import auditRouter from "./routes/audit";

export const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/api/audit", auditRouter);
