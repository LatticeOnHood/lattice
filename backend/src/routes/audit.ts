import { Router, Request, Response, NextFunction } from "express";
import { fetchTokenAuditData } from "../services/codex";
import { isValidEvmAddress } from "../services/dexscreener";
import { parseIntentWithGroq, RequestedMetric } from "../services/groq";
import { renderTelegramAuditCard, renderTwitterAuditReply, renderSpecificMetricsCard } from "../templates/cardRenderer";
import { buildVerificationReport } from "../integrations/virtuals/buildReport";
import { readOnchain } from "../services/onchain";
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
    let requestedMetrics: RequestedMetric[] = ["FULL_AUDIT"];
    let action = "AUDIT";

    // If natural language message provided, parse address via Groq AI
    if (message) {
      const intent = await parseIntentWithGroq(message);
      if (intent.action === "INVALID_CHAIN") {
        res.status(400).json({
          error: "Invalid chain: Lattice currently only supports Robinhood EVM tokens (0x...).",
        });
        return;
      }
      if (!targetAddress) {
        targetAddress = intent.tokenAddress || undefined;
      }
      requestedMetrics = intent.requestedMetrics || ["FULL_AUDIT"];
      action = intent.action;
    }

    if (!targetAddress || !isValidEvmAddress(targetAddress)) {
      res.status(400).json({
        error: "Valid Robinhood EVM contract address (0x...) is required.",
      });
      return;
    }

    const metrics = await fetchTokenAuditData(targetAddress);
    if (!metrics) {
      res.status(444).json({
        error: `No liquidity pool or trading pairs found on DexScreener/Codex for address ${targetAddress}`,
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

    const isSpecific = action === "SPECIFIC_METRICS" && requestedMetrics.length > 0 && !requestedMetrics.includes("FULL_AUDIT");

    /**
     * Direct chain reads, run alongside the indexer data.
     *
     * These answer what an indexer structurally cannot: how much of supply is
     * actually free to trade rather than sitting in the pool, whether the token
     * is an upgradeable proxy, and whether a transfer even succeeds. Failures
     * degrade to an absent block rather than failing the audit — a report built
     * on market data alone is still worth returning.
     */
    const onchain = await readOnchain(metrics.address, {
      pair: metrics.pairAddress,
      creator: metrics.creatorAddress,
      liquidityUsd: metrics.liquidityUsd,
    }).catch((err) => {
      console.warn("[onchain] read failed:", err?.message);
      return undefined;
    });

    res.status(200).json({
      success: true,
      chain: "robinhood",
      metrics,
      onchain,
      // Additive: the same versioned report `/api/v1/verify/:address` serves.
      // Existing consumers read `metrics` and `renderedCards` and are unaffected;
      // the dashboard uses this to distinguish "no data" from "check not shipped".
      report: buildVerificationReport(metrics, { onchain }),
      renderedCards: {
        telegramHtml: isSpecific
          ? renderSpecificMetricsCard(metrics, requestedMetrics, "TELEGRAM")
          : renderTelegramAuditCard(metrics),
        twitterText: isSpecific
          ? renderSpecificMetricsCard(metrics, requestedMetrics, "X")
          : renderTwitterAuditReply(metrics),
      },
    });
  } catch (err: any) {
    const errMsg = err.message || "Failed to process audit request";
    if (errMsg.toLowerCase().includes("rate limit")) {
      res.status(429).json({ error: "You've been rate limited. Try again in a few moments." });
      return;
    }
    res.status(500).json({ error: errMsg });
  }
});

export default router;
