export interface DexScreenerTokenMetrics {
  address: string;
  name: string;
  symbol: string;
  priceUsd: number;
  priceNative: string;
  marketCap: number;
  fdv: number;
  liquidityUsd: number;
  volume24h: number;
  priceChange24h: number;
  buys24h: number;
  sells24h: number;
  dexId: string;
  pairAddress: string;
  pairCreatedAt?: number;
  websites?: string[];
  twitter?: string;
  telegram?: string;
  top10HoldersPct?: number;
  holdersCount?: number;
  athPrice?: number;
  athFdv?: number;
  atlPrice?: number;
  creatorAddress?: string;
  devHoldingsPct?: number;
  devBuys?: number;
  devSells?: number;
  /** Which indexer actually answered — carried into the agent report's provenance. */
  dataSource?: "codex.io" | "dexscreener";
}

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const CACHE_TTL_MS = 15000; // 15 seconds cache

interface CacheEntry {
  timestamp: number;
  data: DexScreenerTokenMetrics | null;
}

const tokenCache = new Map<string, CacheEntry>();

export function isValidEvmAddress(address: string): boolean {
  return EVM_ADDRESS_REGEX.test(address.trim());
}

export async function fetchDexScreenerTokenData(address: string): Promise<DexScreenerTokenMetrics | null> {
  const cleanAddress = address.trim();

  if (!isValidEvmAddress(cleanAddress)) {
    throw new Error("Invalid EVM contract address. Lattice only supports Robinhood EVM tokens.");
  }

  // 1. Check in-memory cache
  const cached = tokenCache.get(cleanAddress.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Fetch from DexScreener API with Browser User-Agent header
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${cleanAddress}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
    },
  });

  if (response.status === 429) {
    throw new Error("You've been rate limited. Try again in a few moments.");
  }

  if (!response.ok) {
    throw new Error(`DexScreener API error (${response.status}): Unable to fetch token data.`);
  }

  const data = await response.json();
  if (!data || !data.pairs || data.pairs.length === 0) {
    tokenCache.set(cleanAddress.toLowerCase(), { timestamp: Date.now(), data: null });
    return null;
  }

  // Pick the pair with highest liquidity
  const bestPair = data.pairs.sort(
    (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
  )[0];

  const socialLinks = bestPair.info?.socials || [];
  const websiteLinks = bestPair.info?.websites || [];

  const twitterObj = socialLinks.find((s: any) => s.type === "twitter" || s.type === "x");
  const telegramObj = socialLinks.find((s: any) => s.type === "telegram");

  const result: DexScreenerTokenMetrics = {
    address: cleanAddress,
    name: bestPair.baseToken?.name || "Unknown Token",
    symbol: bestPair.baseToken?.symbol || "UNKNOWN",
    priceUsd: parseFloat(bestPair.priceUsd || "0") || 0,
    priceNative: bestPair.priceNative || "0",
    marketCap: Number(bestPair.marketCap || bestPair.fdv || 0) || 0,
    fdv: Number(bestPair.fdv || 0) || 0,
    liquidityUsd: Number(bestPair.liquidity?.usd || 0) || 0,
    volume24h: Number(bestPair.volume?.h24 || 0) || 0,
    priceChange24h: Number(bestPair.priceChange?.h24 || 0) || 0,
    buys24h: Number(bestPair.txns?.h24?.buys || 0) || 0,
    sells24h: Number(bestPair.txns?.h24?.sells || 0) || 0,
    dexId: bestPair.dexId || "uniswap",
    pairAddress: bestPair.pairAddress || "",
    pairCreatedAt: bestPair.pairCreatedAt,
    websites: websiteLinks.map((w: any) => w.url),
    twitter: twitterObj?.url,
    telegram: telegramObj?.url,
    dataSource: "dexscreener",
  };

  // Cache result
  tokenCache.set(cleanAddress.toLowerCase(), { timestamp: Date.now(), data: result });
  return result;
}
