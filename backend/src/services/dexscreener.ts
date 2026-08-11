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
}

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function isValidEvmAddress(address: string): boolean {
  return EVM_ADDRESS_REGEX.test(address.trim());
}

export async function fetchDexScreenerTokenData(address: string): Promise<DexScreenerTokenMetrics | null> {
  const cleanAddress = address.trim();

  if (!isValidEvmAddress(cleanAddress)) {
    throw new Error("Invalid EVM contract address. Lattice only supports Robinhood EVM tokens.");
  }

  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${cleanAddress}`);
  if (!response.ok) {
    throw new Error(`DexScreener API error (${response.status}): Unable to fetch token data.`);
  }

  const data = await response.json();
  if (!data || !data.pairs || data.pairs.length === 0) {
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

  return {
    address: cleanAddress,
    name: bestPair.baseToken?.name || "Unknown Token",
    symbol: bestPair.baseToken?.symbol || "UNKNOWN",
    priceUsd: parseFloat(bestPair.priceUsd || "0"),
    priceNative: bestPair.priceNative || "0",
    marketCap: bestPair.marketCap || bestPair.fdv || 0,
    fdv: bestPair.fdv || 0,
    liquidityUsd: bestPair.liquidity?.usd || 0,
    volume24h: bestPair.volume?.h24 || 0,
    priceChange24h: bestPair.priceChange?.h24 || 0,
    buys24h: bestPair.txns?.h24?.buys || 0,
    sells24h: bestPair.txns?.h24?.sells || 0,
    dexId: bestPair.dexId || "uniswap",
    pairAddress: bestPair.pairAddress || "",
    pairCreatedAt: bestPair.pairCreatedAt,
    websites: websiteLinks.map((w: any) => w.url),
    twitter: twitterObj?.url,
    telegram: telegramObj?.url,
  };
}
