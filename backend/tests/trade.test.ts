import { describe, expect, test } from "bun:test";
import request from "supertest";
import { parseTradeCommand } from "../src/services/groq";
import { findToken } from "../src/lib/rwaTokens";
import { app } from "../src/app";

describe("Buy & Sell Token Trading Engine & Commands", () => {
  test("parseTradeCommand should parse buy command with 'of'", () => {
    const res = parseTradeCommand("buy 0.5 ETH of TSLA");
    expect(res).not.toBeNull();
    expect(res?.side).toBe("BUY");
    expect(res?.amountIn).toBe("0.5");
    expect(res?.fromToken).toBe("ETH");
    expect(res?.toToken).toBe("TSLA");
  });

  test("parseTradeCommand should parse sell command with 'for'", () => {
    const res = parseTradeCommand("sell 100 NVDA for USDG");
    expect(res).not.toBeNull();
    expect(res?.side).toBe("SELL");
    expect(res?.amountIn).toBe("100");
    expect(res?.fromToken).toBe("NVDA");
    expect(res?.toToken).toBe("USDG");
  });

  test("parseTradeCommand should preserve lower-case 0x prefix for token contract addresses", () => {
    const res = parseTradeCommand("Buy 0.00004 ETH of 0x655C8B48ea31DeeaDDA63998B534c965E6D019cc");
    expect(res).not.toBeNull();
    expect(res?.toToken).toBe("0x655c8b48ea31deeadda63998b534c965e6d019cc");
  });

  test("findToken should resolve curated Stock tokens, USDG, and ETH", () => {
    const aapl = findToken("AAPL");
    expect(aapl).toBeDefined();
    expect(aapl?.symbol).toBe("AAPL");

    const eth = findToken("ETH");
    expect(eth?.native).toBeTrue();

    const spy = findToken("SPY");
    expect(spy?.symbol).toBe("SPCX");
  });

  test("POST /api/swap/quote should return 400 when missing parameters", async () => {
    const res = await request(app).post("/api/swap/quote").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /api/swap/plan should return 400 when missing userAddress", async () => {
    const res = await request(app).post("/api/swap/plan").send({
      fromToken: "USDG",
      toToken: "AAPL",
      amountIn: "10",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
