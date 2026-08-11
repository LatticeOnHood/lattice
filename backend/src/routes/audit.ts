import { Router, Request, Response, NextFunction } from "express";
import { fetchDexScreenerTokenData, isValidEvmAddress } from "../services/dexscreener";
import { parseIntentWithGroq } from "../services/groq";
import { renderTelegramAuditCard, renderTwitterAuditReply } from "../templates/cardRenderer";
import { pool } from "../db/index";

const router = Router();

/**
 * POST /api/audit
 * Body: { address?: string, message?: string }
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address, message } = req.body as { address?: string; message?: string };

    let targetAddress = address;

    // If natural language message provided, parse address via Groq AI
    if (!targetAddress && message) {
      const intent = await parseIntentWithGroq(message);
      if (intent.action === "INVALID_CHAIN") {
        res.status(400).json({
          error: "Invalid chain: Lattice currently only supports Robinhood EVM tokens (0x...).",
        });
        return;
      }
      targetAddress = intent.tokenAddress || undefined;
    }

    if (!targetAddress || !isValidEvmAddress(targetAddress)) {
      res.status(400).json({
        error: "Valid Robinhood EVM contract address (0x...) is required.",
      });
      return;
    }

    const metrics = await fetchDexScreenerTokenData(targetAddress);
    if (!metrics) {
      res.status(444).json({
        error: `No liquidity pool or trading pairs found on DexScreener for address ${targetAddress}`,
      });
      return;
    }

    // Log query in PostgreSQL database
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
    ).catch((err) => console.warn("[db] Log audit error:", err));

    res.status(200).json({
      success: true,
      chain: "robinhood",
      metrics,
      renderedCards: {
        telegramHtml: renderTelegramAuditCard(metrics),
        twitterText: renderTwitterAuditReply(metrics),
      },
    });
  } catch (err: any) {
    const errMsg = err.message || "Failed to process audit request";
    if (errMsg.includes("rate limit")) {
      res.status(429).json({ error: errMsg });
      return;
    }
    res.status(500).json({ error: errMsg });
  }
});

export default router;
