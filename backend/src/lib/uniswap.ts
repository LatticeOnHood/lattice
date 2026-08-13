import { encodePacked, formatUnits, parseUnits, createPublicClient, http } from "viem";
import { resolveToken, ETH, USDG, TokenInfo } from "./rwaTokens";

const RPC_URL = process.env.ROBINHOOD_RPC_URL || "https://rpc.robinhood.org";
const QUOTER_V2_ADDRESS = (process.env.UNISWAP_QUOTER_V2 || "0x61fFe014bA17989E743c5F6cB21bF9697540B21e") as `0x${string}`;
const SWAP_ROUTER_ADDRESS = (process.env.UNISWAP_SWAP_ROUTER || "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD") as `0x${string}`;
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
  routing: "direct" | "via-weth";
  feeTier: number;
  path?: `0x${string}`;
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

  // 1. Try Direct Pool first across fee tiers
  for (const fee of FEE_TIERS) {
    try {
      const res = await client.simulateContract({
        address: QUOTER_V2_ADDRESS,
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
        const amountOut = formatUnits(amountOutWei, toToken.decimals);
        return {
          fromToken,
          toToken,
          amountIn: amountInStr,
          amountInWei,
          amountOut,
          amountOutWei,
          priceImpactPct: 0.2, // Est. low impact for direct pool
          routing: "direct",
          feeTier: fee,
          quoterAddress: QUOTER_V2_ADDRESS,
          routerAddress: SWAP_ROUTER_ADDRESS,
        };
      }
    } catch {
      continue;
    }
  }

  // 2. If direct pool missed, try 2-hop routing via WETH
  if (fromToken.address.toLowerCase() !== WETH_ADDRESS.toLowerCase() && toToken.address.toLowerCase() !== WETH_ADDRESS.toLowerCase()) {
    for (const feeIn of FEE_TIERS) {
      for (const feeOut of FEE_TIERS) {
        try {
          const path = encodeWethPath(fromToken.address, feeIn, toToken.address, feeOut);
          const res = await client.simulateContract({
            address: QUOTER_V2_ADDRESS,
            abi: QUOTER_V2_ABI,
            functionName: "quoteExactInput",
            args: [path, amountInWei],
          });

          const amountOutWei = (res.result as any)[0] as bigint;
          if (amountOutWei > 0n) {
            const amountOut = formatUnits(amountOutWei, toToken.decimals);
            return {
              fromToken,
              toToken,
              amountIn: amountInStr,
              amountInWei,
              amountOut,
              amountOutWei,
              priceImpactPct: 0.5, // Est. 2-hop impact
              routing: "via-weth",
              feeTier: feeIn,
              path,
              quoterAddress: QUOTER_V2_ADDRESS,
              routerAddress: SWAP_ROUTER_ADDRESS,
            };
          }
        } catch {
          continue;
        }
      }
    }
  }

  return null;
}
