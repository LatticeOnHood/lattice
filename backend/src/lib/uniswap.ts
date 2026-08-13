import { encodePacked, formatUnits, parseUnits, createPublicClient, http } from "viem";
import { resolveToken, ETH, USDG, TokenInfo } from "./rwaTokens";
import { quoteV4Direct, V4Quote, PoolKey } from "./uniswapV4";

const RPC_URL = process.env.ROBINHOOD_RPC_URL || "https://rpc.robinhood.org";

const V3_QUOTER_ADDRESS = (process.env.UNISWAP_V3_QUOTER_ADDRESS || "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7") as `0x${string}`;
const V3_SWAP_ROUTER_ADDRESS = (process.env.UNISWAP_V3_SWAP_ROUTER_ADDRESS || "0xcaf681a66d020601342297493863e78c959e5cb2") as `0x${string}`;
const UNIVERSAL_ROUTER_ADDRESS = (process.env.UNISWAP_UNIVERSAL_ROUTER_ADDRESS || "0x8876789976decbfcbbbe364623c63652db8c0904") as `0x${string}`;

const WETH_ADDRESS = ETH.address;

const QUOTER_V2_ABI = [
  {
    name: "quoteExactInputSingle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
  {
    name: "quoteExactInput",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "path", type: "bytes" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96AfterList", type: "uint160[]" },
      { name: "initializedTicksCrossedList", type: "uint32[]" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

export interface SwapQuote {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  amountIn: string;
  amountInWei: bigint;
  amountOut: string;
  amountOutWei: bigint;
  priceImpactPct: number;
  routing: "v3-direct" | "v3-via-weth" | "v4-direct";
  feeTier: number;
  dexVersion: "V3" | "V4";
  path?: `0x${string}`;
  v4Quote?: V4Quote;
  quoterAddress: `0x${string}`;
  routerAddress: `0x${string}`;
}

export function encodeWethPath(
  tokenIn: `0x${string}`,
  feeIn: number,
  tokenOut: `0x${string}`,
  feeOut: number
): `0x${string}` {
  return encodePacked(
    ["address", "uint24", "address", "uint24", "address"],
    [tokenIn, feeIn, WETH_ADDRESS, feeOut, tokenOut]
  );
}

const FEE_TIERS = [3000, 500, 10000, 100];

export async function quoteSwap(
  fromInput: string,
  toInput: string,
  amountInStr: string
): Promise<SwapQuote | null> {
  const [fromToken, toToken] = await Promise.all([
    resolveToken(fromInput),
    resolveToken(toInput),
  ]);

  if (!fromToken || !toToken) return null;

  const client = createPublicClient({ transport: http(RPC_URL) });
  const amountInWei = parseUnits(amountInStr, fromToken.decimals);
  if (amountInWei <= 0n) return null;

  const candidateQuotes: SwapQuote[] = [];

  // 1. Quote Uniswap V4 Direct
  try {
    const v4 = await quoteV4Direct(client, fromToken.address, toToken.address, amountInWei);
    if (v4 && v4.amountOut > 0n) {
      candidateQuotes.push({
        fromToken,
        toToken,
        amountIn: amountInStr,
        amountInWei,
        amountOut: formatUnits(v4.amountOut, toToken.decimals),
        amountOutWei: v4.amountOut,
        priceImpactPct: 0.15,
        routing: "v4-direct",
        feeTier: v4.fee,
        dexVersion: "V4",
        v4Quote: v4,
        quoterAddress: process.env.UNISWAP_V4_QUOTER_ADDRESS as `0x${string}` || "0x8dc178efb8111bb0973dd9d722ebeff267c98f94",
        routerAddress: UNIVERSAL_ROUTER_ADDRESS,
      });
    }
  } catch (err) {
    console.warn("[uniswap-v4] V4 quoting warning:", err);
  }

  // 2. Quote Uniswap V3 Direct Pool
  for (const fee of FEE_TIERS) {
    try {
      const res = await client.simulateContract({
        address: V3_QUOTER_ADDRESS,
        abi: QUOTER_V2_ABI,
        functionName: "quoteExactInputSingle",
        args: [
          {
            tokenIn: fromToken.address,
            tokenOut: toToken.address,
            amountIn: amountInWei,
            fee: fee,
            sqrtPriceLimitX96: 0n,
          },
        ],
      });

      const amountOutWei = (res.result as any)[0] as bigint;
      if (amountOutWei > 0n) {
        candidateQuotes.push({
          fromToken,
          toToken,
          amountIn: amountInStr,
          amountInWei,
          amountOut: formatUnits(amountOutWei, toToken.decimals),
          amountOutWei,
          priceImpactPct: 0.2,
          routing: "v3-direct",
          feeTier: fee,
          dexVersion: "V3",
          quoterAddress: V3_QUOTER_ADDRESS,
          routerAddress: V3_SWAP_ROUTER_ADDRESS,
        });
      }
    } catch {
      continue;
    }
  }

  // 3. Quote Uniswap V3 2-Hop via WETH
  if (fromToken.address.toLowerCase() !== WETH_ADDRESS.toLowerCase() && toToken.address.toLowerCase() !== WETH_ADDRESS.toLowerCase()) {
    for (const feeIn of FEE_TIERS) {
      for (const feeOut of FEE_TIERS) {
        try {
          const path = encodeWethPath(fromToken.address, feeIn, toToken.address, feeOut);
          const res = await client.simulateContract({
            address: V3_QUOTER_ADDRESS,
            abi: QUOTER_V2_ABI,
            functionName: "quoteExactInput",
            args: [path, amountInWei],
          });

          const amountOutWei = (res.result as any)[0] as bigint;
          if (amountOutWei > 0n) {
            candidateQuotes.push({
              fromToken,
              toToken,
              amountIn: amountInStr,
              amountInWei,
              amountOut: formatUnits(amountOutWei, toToken.decimals),
              amountOutWei,
              priceImpactPct: 0.5,
              routing: "v3-via-weth",
              feeTier: feeIn,
              dexVersion: "V3",
              path,
              quoterAddress: V3_QUOTER_ADDRESS,
              routerAddress: V3_SWAP_ROUTER_ADDRESS,
            });
          }
        } catch {
          continue;
        }
      }
    }
  }

  if (candidateQuotes.length === 0) return null;

  // Pick the candidate with the highest amountOut!
  candidateQuotes.sort((a, b) => (b.amountOutWei > a.amountOutWei ? 1 : b.amountOutWei < a.amountOutWei ? -1 : 0));
  return candidateQuotes[0];
}
