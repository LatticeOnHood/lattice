import { encodeAbiParameters, encodeFunctionData, erc20Abi } from "viem";
import { SwapQuote } from "./uniswap";

const CHAIN_ID = Number(process.env.CHAIN_ID || 137);

const UNIVERSAL_ROUTER_ADDRESS = (process.env.UNISWAP_UNIVERSAL_ROUTER_ADDRESS || "0x8876789976decbfcbbbe364623c63652db8c0904") as `0x${string}`;
const PERMIT2_ADDRESS = (process.env.UNISWAP_PERMIT2_ADDRESS || "0x000000000022D473030F116dDEE9F6B43aC78BA3") as `0x${string}`;

export interface UnsignedTx {
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
  chainId: number;
}

export interface SwapPlan {
  approvals: UnsignedTx[];
  swap: UnsignedTx;
  quote: SwapQuote;
  amountInBaseUnits: string;
}

const ADDRESS_THIS_SENTINEL = "0x0000000000000000000000000000000000000002" as const;

const SWAP_ROUTER_ABI = [
  {
    name: "exactInputSingle",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    name: "exactInput",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "path", type: "bytes" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    name: "multicall",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "deadline", type: "uint256" },
      { name: "data", type: "bytes[]" },
    ],
    outputs: [{ name: "results", type: "bytes[]" }],
  },
  {
    name: "unwrapWETH9",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "amountMinimum", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
] as const;

const UNIVERSAL_ROUTER_ABI = [
  {
    name: "execute",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const V4_SWAP_COMMAND = "0x10" as const;

function encodeV4Actions(): `0x${string}` {
  return "0x060c0f";
}

function buildV4SwapTx(
  v4Quote: NonNullable<SwapQuote["v4Quote"]>,
  amountInWei: bigint,
  amountOutMinimum: bigint
): UnsignedTx {
  const swapParams = encodeAbiParameters(
    [
      {
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
          { name: "amountIn", type: "uint128" },
          { name: "amountOutMinimum", type: "uint128" },
          { name: "minHopPriceX36", type: "uint256" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    [
      {
        poolKey: v4Quote.poolKey,
        zeroForOne: v4Quote.zeroForOne,
        amountIn: amountInWei,
        amountOutMinimum,
        minHopPriceX36: 0n,
        hookData: "0x",
      },
    ]
  );

  const currencyIn = v4Quote.zeroForOne ? v4Quote.poolKey.currency0 : v4Quote.poolKey.currency1;
  const currencyOut = v4Quote.zeroForOne ? v4Quote.poolKey.currency1 : v4Quote.poolKey.currency0;

  const settleParams = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [currencyIn, amountInWei]
  );
  const takeParams = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [currencyOut, amountOutMinimum]
  );

  const v4SwapInput = encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    [encodeV4Actions(), [swapParams, settleParams, takeParams]]
  );

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

  return {
    to: UNIVERSAL_ROUTER_ADDRESS,
    data: encodeFunctionData({
      abi: UNIVERSAL_ROUTER_ABI,
      functionName: "execute",
      args: [V4_SWAP_COMMAND, [v4SwapInput], deadline],
    }),
    value: "0",
    chainId: CHAIN_ID,
  };
}

export function buildSwapPlan(quote: SwapQuote, userAddress: `0x${string}`): SwapPlan {
  const amountOutMin = (quote.amountOutWei * 99n) / 100n; // 1% default slippage
  const approvals: UnsignedTx[] = [];

  // Uniswap V4 Universal Router Execution
  if (quote.dexVersion === "V4" && quote.v4Quote) {
    if (!quote.fromToken.native) {
      // 1. Approve Permit2 contract
      approvals.push({
        to: quote.fromToken.address,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [PERMIT2_ADDRESS, quote.amountInWei],
        }),
        value: "0",
        chainId: CHAIN_ID,
      });
    }

    const swapTx = buildV4SwapTx(quote.v4Quote, quote.amountInWei, amountOutMin);

    return {
      approvals,
      swap: swapTx,
      quote,
      amountInBaseUnits: quote.amountIn,
    };
  }

  // Uniswap V3 Router Execution
  if (!quote.fromToken.native) {
    const approvalData = encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [quote.routerAddress, quote.amountInWei],
    });
    approvals.push({
      to: quote.fromToken.address,
      data: approvalData,
      value: "0",
      chainId: CHAIN_ID,
    });
  }

  let swapTx: UnsignedTx;

  if (quote.routing === "v3-direct") {
    const isUnwrap = quote.toToken.native;
    const recipient = isUnwrap ? ADDRESS_THIS_SENTINEL : userAddress;

    const singleCalldata = encodeFunctionData({
      abi: SWAP_ROUTER_ABI,
      functionName: "exactInputSingle",
      args: [
        {
          tokenIn: quote.fromToken.address,
          tokenOut: quote.toToken.address,
          fee: quote.feeTier,
          recipient,
          amountIn: quote.amountInWei,
          amountOutMinimum: amountOutMin,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });

    if (isUnwrap) {
      const unwrapCalldata = encodeFunctionData({
        abi: SWAP_ROUTER_ABI,
        functionName: "unwrapWETH9",
        args: [amountOutMin, userAddress],
      });
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
      const multicallData = encodeFunctionData({
        abi: SWAP_ROUTER_ABI,
        functionName: "multicall",
        args: [deadline, [singleCalldata, unwrapCalldata]],
      });

      swapTx = {
        to: quote.routerAddress,
        data: multicallData,
        value: quote.fromToken.native ? quote.amountInWei.toString() : "0",
        chainId: CHAIN_ID,
      };
    } else {
      swapTx = {
        to: quote.routerAddress,
        data: singleCalldata,
        value: quote.fromToken.native ? quote.amountInWei.toString() : "0",
        chainId: CHAIN_ID,
      };
    }
  } else {
    // 2-hop route via WETH (V3)
    const path = quote.path!;
    const isUnwrap = quote.toToken.native;
    const recipient = isUnwrap ? ADDRESS_THIS_SENTINEL : userAddress;

    const inputCalldata = encodeFunctionData({
      abi: SWAP_ROUTER_ABI,
      functionName: "exactInput",
      args: [
        {
          path,
          recipient,
          amountIn: quote.amountInWei,
          amountOutMinimum: amountOutMin,
        },
      ],
    });

    if (isUnwrap) {
      const unwrapCalldata = encodeFunctionData({
        abi: SWAP_ROUTER_ABI,
        functionName: "unwrapWETH9",
        args: [amountOutMin, userAddress],
      });
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
      const multicallData = encodeFunctionData({
        abi: SWAP_ROUTER_ABI,
        functionName: "multicall",
        args: [deadline, [inputCalldata, unwrapCalldata]],
      });

      swapTx = {
        to: quote.routerAddress,
        data: multicallData,
        value: quote.fromToken.native ? quote.amountInWei.toString() : "0",
        chainId: CHAIN_ID,
      };
    } else {
      swapTx = {
        to: quote.routerAddress,
        data: inputCalldata,
        value: quote.fromToken.native ? quote.amountInWei.toString() : "0",
        chainId: CHAIN_ID,
      };
    }
  }

  return {
    approvals,
    swap: swapTx,
    quote,
    amountInBaseUnits: quote.amountIn,
  };
}
