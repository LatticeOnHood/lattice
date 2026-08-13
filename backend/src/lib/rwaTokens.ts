import { erc20Abi, getAddress, isAddress } from "viem";
import { createPublicClient, http } from "viem";

const RPC_URL = process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const WETH_ADDRESS = (process.env.UNISWAP_WETH_ADDRESS || process.env.WETH_ADDRESS || "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73") as `0x${string}`;
const USDG_ADDRESS = (process.env.ROBINHOOD_USDG_ADDRESS || process.env.USDG_ADDRESS || "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168") as `0x${string}`;

export interface TokenInfo {
  symbol: string;
  address: `0x${string}`;
  native?: boolean;
  decimals: number;
}

export const USDG: TokenInfo = {
  symbol: "USDG",
  address: USDG_ADDRESS,
  decimals: 6,
};

export const ETH: TokenInfo = {
  symbol: "ETH",
  address: WETH_ADDRESS,
  native: true,
  decimals: 18,
};

export const STOCK_TOKENS: TokenInfo[] = [
  { symbol: "AAPL", address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9", decimals: 18 },
  { symbol: "TSLA", address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", decimals: 18 },
  { symbol: "NVDA", address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", decimals: 18 },
  { symbol: "GOOGL", address: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3", decimals: 18 },
  { symbol: "AMZN", address: "0x12f190a9F9d7D37a250758b26824B97CE941bF54", decimals: 18 },
  { symbol: "MSFT", address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74", decimals: 18 },
  { symbol: "META", address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35", decimals: 18 },
  { symbol: "COIN", address: "0x6330D8C3178a418788dF01a47479c0ce7CCF450b", decimals: 18 },
  { symbol: "SPCX", address: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa", decimals: 18 },
];

const TICKER_ALIASES: Record<string, string> = {
  SPY: "SPCX",
  SPACEX: "SPCX",
};

export function findToken(symbol: string): TokenInfo | undefined {
  const upper = TICKER_ALIASES[symbol.toUpperCase()] ?? symbol.toUpperCase();
  if (upper === USDG.symbol) return USDG;
  if (upper === ETH.symbol) return ETH;
  return STOCK_TOKENS.find((t) => t.symbol === upper);
}

export async function resolveToken(input: string): Promise<TokenInfo | undefined> {
  const known = findToken(input);
  if (known) return known;

  const trimmed = input.trim();
  if (!isAddress(trimmed)) return undefined;

  const address = getAddress(trimmed);
  const client = createPublicClient({
    transport: http(RPC_URL),
  });

  try {
    const [decimals, symbol] = await Promise.all([
      client.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
      client
        .readContract({ address, abi: erc20Abi, functionName: "symbol" })
        .catch(() => address.slice(0, 8)),
    ]);
    if (typeof decimals !== "number") return undefined;
    return { symbol: String(symbol), address, decimals };
  } catch {
    return undefined;
  }
}
