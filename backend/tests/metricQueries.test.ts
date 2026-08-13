import { describe, expect, it } from "bun:test";
import { parseRequestedMetricsFromText, parseIntentWithGroq } from "../src/services/groq";
import { renderSpecificMetricsCard } from "../src/templates/cardRenderer";
import { DexScreenerTokenMetrics } from "../src/services/dexscreener";

describe("Natural Language Specific Metric Queries & Question Binding", () => {
  const gatoAddress = "0x3b7157B6409380E09A131b631dFb8dFD2781D9cc";

  const mockMetrics: DexScreenerTokenMetrics = {
    address: gatoAddress.toLowerCase(),
    name: "EL GATO",
    symbol: "GATO",
    priceUsd: 0.000353,
    priceNative: "$0.000353",
    marketCap: 352550,
    fdv: 352550,
    liquidityUsd: 27964,
    volume24h: 682130,
    priceChange24h: 65.12,
    buys24h: 2164,
    sells24h: 2007,
    dexId: "uniswap",
    pairAddress: "0x8366a39cc670b4001a1121b8f6a443a643e40951",
    top10HoldersPct: 19.71,
    holdersCount: 735,
    athPrice: 0.000893,
    athFdv: 893360,
    creatorAddress: "0xd892e11287ae78d2d124677cd8e364162eabf939",
  };

  it("parseRequestedMetricsFromText should extract TOP_HOLDERS and MARKET_CAP from combined question", () => {
    const text = `how many holders does ${gatoAddress} have and whats the market cap`;
    const metrics = parseRequestedMetricsFromText(text);
    expect(metrics).toContain("TOP_HOLDERS");
    expect(metrics).toContain("MARKET_CAP");
  });

  it("parseIntentWithGroq should return SPECIFIC_METRICS action for targeted question", async () => {
    const text = `what is the price and 24h volume for ${gatoAddress}`;
    const intent = await parseIntentWithGroq(text);
    expect(intent.action).toBe("SPECIFIC_METRICS");
    expect(intent.tokenAddress?.toLowerCase()).toBe(gatoAddress.toLowerCase());
    expect(intent.requestedMetrics).toContain("PRICE");
    expect(intent.requestedMetrics).toContain("VOLUME_24H");
  });

  it("renderSpecificMetricsCard should render Telegram HTML with specific holders count and bound metrics", () => {
    const card = renderSpecificMetricsCard(mockMetrics, ["TOP_HOLDERS", "MARKET_CAP"], "TELEGRAM");
    expect(card).toContain("<b>🔮 Lattice Quick Answer — $GATO</b>");
    expect(card).toContain("Holders:");
    expect(card).toContain("735");
    expect(card).toContain("Top 10: 19.71%");
    expect(card).toContain("Market Cap:");
    expect(card).toContain("$352.55K");
    expect(card).not.toContain("24h Volume:");
  });

  it("renderSpecificMetricsCard should render X Tweet reply text with bound metrics under 280 chars", () => {
    const card = renderSpecificMetricsCard(mockMetrics, ["PRICE", "VOLUME_24H"], "X");
    expect(card).toContain("🔮 $GATO Quick Answer");
    expect(card).toContain("Price: $0.000353");
    expect(card).toContain("24h Vol: $682.13K");
    expect(card.length).toBeLessThan(280);
  });
});
