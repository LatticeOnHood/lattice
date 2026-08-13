import { Router, Request, Response } from "express";
import { quoteSwap } from "../lib/uniswap";
import { buildSwapPlan } from "../lib/swapExecution";
import { isAddress } from "viem";

const router = Router();

/**
 * POST /api/swap/quote
 * Returns Uniswap V3 swap quote & price impact
 */
router.post("/quote", async (req: Request, res: Response) => {
  try {
    const { fromToken, toToken, amountIn } = req.body || {};

    if (!fromToken || !toToken || !amountIn) {
      return res.status(400).json({ error: "Missing required parameters: fromToken, toToken, amountIn" });
    }

    const quote = await quoteSwap(String(fromToken), String(toToken), String(amountIn));
    if (!quote) {
      return res.status(404).json({ error: `No active pool or liquidity route found for ${fromToken} -> ${toToken}` });
    }

    return res.json({
      success: true,
      quote: {
        fromToken: quote.fromToken.symbol,
        fromTokenAddress: quote.fromToken.address,
        toToken: quote.toToken.symbol,
        toTokenAddress: quote.toToken.address,
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        priceImpactPct: quote.priceImpactPct,
        routing: quote.routing,
        feeTier: quote.feeTier,
      },
    });
  } catch (err: any) {
    console.error("[swap-route] Error generating quote:", err);
    return res.status(500).json({ error: err.message || "Failed to generate swap quote" });
  }
});

/**
 * POST /api/swap/plan
 * Generates unsigned transaction calldata (approvals + swap) for Wagmi / Wallet execution
 */
router.post("/plan", async (req: Request, res: Response) => {
  try {
    const { fromToken, toToken, amountIn, userAddress } = req.body || {};

    if (!fromToken || !toToken || !amountIn || !userAddress) {
      return res.status(400).json({ error: "Missing required parameters: fromToken, toToken, amountIn, userAddress" });
    }

    if (!isAddress(String(userAddress))) {
      return res.status(400).json({ error: "Invalid EVM userAddress" });
    }

    const quote = await quoteSwap(String(fromToken), String(toToken), String(amountIn));
    if (!quote) {
      return res.status(404).json({ error: `No active pool or liquidity route found for ${fromToken} -> ${toToken}` });
    }

    const plan = buildSwapPlan(quote, userAddress as `0x${string}`);

    return res.json({
      success: true,
      plan: {
        approvals: plan.approvals,
        swap: plan.swap,
        amountIn: plan.amountInBaseUnits,
        expectedAmountOut: quote.amountOut,
        priceImpactPct: quote.priceImpactPct,
      },
    });
  } catch (err: any) {
    console.error("[swap-route] Error generating swap plan:", err);
    return res.status(500).json({ error: err.message || "Failed to generate swap plan" });
  }
});

export default router;
