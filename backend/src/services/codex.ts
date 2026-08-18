import { Codex } from "@codex-data/sdk";
import { DexScreenerTokenMetrics, fetchDexScreenerTokenData, isValidEvmAddress } from "./dexscreener";

const CODEX_IO_API_KEY = process.env.CODEX_IO_API_KEY || process.env.CODEX_API_KEY || "";
export const codex = CODEX_IO_API_KEY ? new Codex(CODEX_IO_API_KEY) : null;

/**
 * Fetches Token Audit Data using Codex.io API (primary) with DexScreener fallback
 */
export async function fetchTokenAuditData(address: string): Promise<DexScreenerTokenMetrics | null> {
  const cleanAddress = address.trim();

  if (!isValidEvmAddress(cleanAddress)) {
    throw new Error("Invalid EVM contract address. Lattice currently supports Robinhood EVM tokens.");
  }

  const normalizedAddress = cleanAddress.toLowerCase();

  if (codex) {
    try {
      // Query Codex filterTokens with network ID 4663 (Robinhood EVM)
      const res = await codex.queries.filterTokens({
        tokens: [`${normalizedAddress}:4663`],
      });

      const result = res?.filterTokens?.results?.[0];
      if (result && result.token) {
        const token = result.token;
        const priceUsd = Number(result.priceUSD) || 0;
        const totalSupply = Number(token.info?.totalSupply || token.info?.circulatingSupply) || 1_000_000_000;
        const marketCap = Number(result.marketCap) || (priceUsd * totalSupply) || 0;

        /**
         * FDV is price against *total* supply, which only differs from market cap
         * when the indexer actually reports a total supply distinct from the
         * circulating figure. Previously this returned `marketCap` verbatim, so
         * the dashboard rendered two tiles with identical values under different
         * labels. When total supply is unknown the two genuinely cannot be
         * separated, and FDV stays equal to market cap — the UI says so.
         */
        const declaredTotalSupply = Number(token.info?.totalSupply);
        const fdv =
          Number.isFinite(declaredTotalSupply) && declaredTotalSupply > 0 && priceUsd > 0
            ? priceUsd * declaredTotalSupply
            : marketCap;
        const liquidityUsd = Number(result.liquidity) || 0;
        const volume24h = Number(result.volume24) || 0;
        
        // Codex returns change24 as a decimal multiplier e.g. 0.8724 = 87.24%
        const rawChange = Number(result.change24) || 0;
        const priceChange24h = rawChange * 100;
        
        const buys24h = Number(result.buyCount24) || 0;
        const sells24h = Number(result.sellCount24) || 0;
        const dexId = token.exchanges?.[0]?.name?.toLowerCase() || "uniswap";
        const pairAddress = token.exchanges?.[0]?.address || normalizedAddress;

        const website = token.socialLinks?.website;
        const twitter = token.socialLinks?.twitter;
        const telegram = token.socialLinks?.telegram;

        const websiteList: string[] = [];
        if (website) websiteList.push(website);

        const rawToken = token as any;
        const rawResult = result as any;

        const top10HoldersPct = Number(rawToken.top10HoldersPercent || rawResult.top10HoldersPercent) || undefined;
        const holdersCount = Number(rawResult.holders) || undefined;
        const athPrice = Number(rawToken.extrema?.athPrice) || undefined;
        const athFdv = Number(rawToken.extrema?.athFdv || rawToken.extrema?.athCircMc) || undefined;
        const atlPrice = Number(rawToken.extrema?.atlPrice) || undefined;
        const creatorAddress = rawToken.creatorAddress || rawToken.creator?.address || undefined;
        const devHoldingsPct = Number(rawToken.creatorHoldingsPercent ?? rawToken.creatorHoldingsPct ?? rawToken.creatorBalancePercent ?? 0);
        const devBuys = Number(rawToken.creatorBuys ?? rawToken.creatorTxns?.buys ?? 0);
        const devSells = Number(rawToken.creatorSells ?? rawToken.creatorTxns?.sells ?? 0);

        return {
          address: normalizedAddress,
          name: token.name || token.info?.name || "Unknown Token",
          symbol: token.symbol || token.info?.symbol || "UNKNOWN",
          priceUsd,
          priceNative: priceUsd > 0 ? `$${priceUsd.toFixed(6)}` : "0",
          marketCap,
          fdv,
          liquidityUsd,
          volume24h,
          priceChange24h,
          buys24h,
          sells24h,
          dexId,
          pairAddress,
          websites: websiteList,
          twitter: twitter || undefined,
          telegram: telegram || undefined,
          top10HoldersPct,
          holdersCount,
          athPrice,
          athFdv,
          atlPrice,
          creatorAddress,
          devHoldingsPct,
          devBuys,
          devSells,
          dataSource: "codex.io",
        };
      }
    } catch (err) {
      console.warn("[codex-engine] Codex API query failed, falling back to DexScreener:", err);
    }
  }

  // Fallback to DexScreener if Codex unavailable or unindexed
  return fetchDexScreenerTokenData(cleanAddress);
}
