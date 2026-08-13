import { encodeFunctionData, erc20Abi } from "viem";
import { SwapQuote } from "./uniswap";

const CHAIN_ID = Number(process.env.CHAIN_ID || 137);

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

export function buildSwapPlan(quote: SwapQuote, userAddress: `0x${string}`): SwapPlan {
  const amountOutMin = (quote.amountOutWei * 99n) / 100n; // 1% default slippage
  const approvals: UnsignedTx[] = [];

  // ERC20 Approval needed if input is not native ETH
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

  if (quote.routing === "direct") {
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
    // 2-hop route via WETH
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
