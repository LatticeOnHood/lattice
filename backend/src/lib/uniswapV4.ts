import { encodeAbiParameters, keccak256, type PublicClient } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const V4_QUOTER_ADDRESS = (process.env.UNISWAP_V4_QUOTER_ADDRESS || "0x8dc178efb8111bb0973dd9d722ebeff267c98f94") as `0x${string}`;
const V4_STATE_VIEW_ADDRESS = (process.env.UNISWAP_V4_STATE_VIEW_ADDRESS || "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b") as `0x${string}`;

const V4_FEE_TIERS = [
  { fee: 100, tickSpacing: 1 },
  { fee: 500, tickSpacing: 10 },
  { fee: 3000, tickSpacing: 60 },
  { fee: 10000, tickSpacing: 200 },
] as const;

export interface PoolKey {
  currency0: `0x${string}`;
  currency1: `0x${string}`;
  fee: number;
  tickSpacing: number;
  hooks: `0x${string}`;
}

const STATE_VIEW_ABI = [
  {
    name: "getLiquidity",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ name: "liquidity", type: "uint128" }],
  },
] as const;

const QUOTER_ABI = [
  {
    name: "quoteExactInputSingle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          {
            name: "poolKey",
            type: "tuple",
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" },
            ],
          },
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

export function poolKeyToId(key: PoolKey): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "address" },
        { type: "address" },
        { type: "uint24" },
        { type: "int24" },
        { type: "address" },
      ],
      [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks],
    ),
  );
}

function buildPoolKey(
  tokenA: `0x${string}`,
  tokenB: `0x${string}`,
  fee: number,
  tickSpacing: number,
): { poolKey: PoolKey; zeroForOne: boolean } {
  const [currency0, currency1] =
    BigInt(tokenA.toLowerCase()) < BigInt(tokenB.toLowerCase()) ? [tokenA, tokenB] : [tokenB, tokenA];
  return {
    poolKey: { currency0, currency1, fee, tickSpacing, hooks: ZERO_ADDRESS },
    zeroForOne: tokenA.toLowerCase() === currency0.toLowerCase(),
  };
}

export interface V4Quote {
  amountOut: bigint;
  poolKey: PoolKey;
  zeroForOne: boolean;
  fee: number;
  tickSpacing: number;
}

export async function quoteV4Direct(
  client: PublicClient,
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint,
): Promise<V4Quote | null> {
  const candidates = await Promise.all(
    V4_FEE_TIERS.map(async ({ fee, tickSpacing }): Promise<V4Quote | null> => {
      const { poolKey, zeroForOne } = buildPoolKey(tokenIn, tokenOut, fee, tickSpacing);
      try {
        const liquidity = await client.readContract({
          address: V4_STATE_VIEW_ADDRESS,
          abi: STATE_VIEW_ABI,
          functionName: "getLiquidity",
          args: [poolKeyToId(poolKey)],
        });
        if (typeof liquidity !== "bigint" || liquidity === 0n) return null;

        const result = await client.simulateContract({
          address: V4_QUOTER_ADDRESS,
          abi: QUOTER_ABI,
          functionName: "quoteExactInputSingle",
          args: [{ poolKey, zeroForOne, exactAmount: amountIn, hookData: "0x" }],
        });
        const amountOut = (result.result as any)[0] as bigint;
        if (typeof amountOut !== "bigint") return null;
        return { amountOut, poolKey, zeroForOne, fee, tickSpacing };
      } catch {
        return null;
      }
    }),
  );

  const usable = candidates.filter((c): c is V4Quote => c !== null);
  if (usable.length === 0) return null;
  return usable.reduce((best, c) => (c.amountOut > best.amountOut ? c : best), usable[0]);
}
