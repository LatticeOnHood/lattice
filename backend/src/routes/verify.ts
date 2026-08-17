import { Router, Request, Response } from "express";
import { fetchTokenAuditData } from "../services/codex";
import { isValidEvmAddress } from "../services/dexscreener";
import { buildVerificationReport } from "../integrations/virtuals/buildReport";
import { VERIFICATION_REPORT_JSON_SCHEMA } from "../integrations/virtuals/jsonSchema";
import { REPORT_SCHEMA_VERSION } from "../integrations/virtuals/reportSchema";

const router = Router();

/**
 * GET /api/v1/schema — the JSON Schema for the verification report.
 * Served so an agent can discover the contract instead of hardcoding it.
 */
router.get("/schema", (_req: Request, res: Response) => {
  res.status(200).json(VERIFICATION_REPORT_JSON_SCHEMA);
});

/**
 * GET /api/v1/verify/:address — the agent-readable verification report.
 *
 * Read-only and unauthenticated by design: this is the surface a G.A.M.E.
 * function or an ACP client calls, and neither holds a Lattice session.
 */
router.get("/verify/:address", async (req: Request, res: Response) => {
  const address = String(req.params.address || "").trim();

  if (!isValidEvmAddress(address)) {
    res.status(400).json({
      error: "Valid Robinhood EVM contract address (0x...) is required.",
      schemaVersion: REPORT_SCHEMA_VERSION,
    });
    return;
  }

  try {
    const metrics = await fetchTokenAuditData(address);

    if (!metrics) {
      res.status(404).json({
        error: `No indexed liquidity pool or trading pair found for ${address.toLowerCase()}.`,
        address: address.toLowerCase(),
        schemaVersion: REPORT_SCHEMA_VERSION,
      });
      return;
    }

    res.status(200).json(buildVerificationReport(metrics));
  } catch (err: any) {
    const message = err?.message || "Failed to build verification report.";
    if (String(message).toLowerCase().includes("rate limit")) {
      res.status(429).json({ error: message, schemaVersion: REPORT_SCHEMA_VERSION });
      return;
    }
    res.status(502).json({ error: message, schemaVersion: REPORT_SCHEMA_VERSION });
  }
});

export default router;
