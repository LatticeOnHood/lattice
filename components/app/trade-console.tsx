"use client";

import React, { useState, useEffect } from "react";
import { ArrowDownUp, Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { ACCENT } from "@/lib/brand";
import { useSession } from "@/components/auth/session-provider";
import { useToast } from "@/components/ui/toast";
import { useAccount, useSendTransaction, useWriteContract } from "wagmi";
import { erc20Abi } from "viem";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.latticehood.app";

export interface TokenOption {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

export const POPULAR_TOKENS: TokenOption[] = [
  { symbol: "USDG", name: "Robinhood USDG", address: "0x2080000000000000000000000000000000000001", decimals: 6 },
  { symbol: "ETH", name: "Robinhood ETH", address: "0x4200000000000000000000000000000000000006", decimals: 18 },
  { symbol: "AAPL", name: "Apple Inc. RWA", address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9", decimals: 18 },
  { symbol: "TSLA", name: "Tesla Inc. RWA", address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", decimals: 18 },
  { symbol: "NVDA", name: "NVIDIA Corp. RWA", address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", decimals: 18 },
  { symbol: "GOOGL", name: "Alphabet Inc. RWA", address: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3", decimals: 18 },
  { symbol: "AMZN", name: "Amazon.com RWA", address: "0x12f190a9F9d7D37a250758b26824B97CE941bF54", decimals: 18 },
  { symbol: "MSFT", name: "Microsoft RWA", address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74", decimals: 18 },
  { symbol: "META", name: "Meta Platforms RWA", address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35", decimals: 18 },
  { symbol: "COIN", name: "Coinbase Global RWA", address: "0x6330D8C3178a418788dF01a47479c0ce7CCF450b", decimals: 18 },
  { symbol: "SPCX", name: "SpaceX Stock RWA", address: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa", decimals: 18 },
];

export function TradeConsole() {
  const { session } = useSession();
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [fromSymbol, setFromSymbol] = useState("USDG");
  const [toSymbol, setToSymbol] = useState("AAPL");
  const [amountIn, setAmountIn] = useState("10");

  const [quoting, setQuoting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [quoteResult, setQuoteResult] = useState<{
    amountOut: string;
    priceImpactPct: number;
    routing: string;
  } | null>(null);

  // Fetch live price quote from backend
  async function fetchQuote() {
    if (!amountIn || Number(amountIn) <= 0) return;
    setQuoting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/swap/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromToken: fromSymbol,
          toToken: toSymbol,
          amountIn,
        }),
      });
      const data = await res.json();
      if (res.ok && data.quote) {
        setQuoteResult({
          amountOut: data.quote.amountOut,
          priceImpactPct: data.quote.priceImpactPct,
          routing: data.quote.routing,
        });
      } else {
        setQuoteResult(null);
      }
    } catch {
      setQuoteResult(null);
    } finally {
      setQuoting(false);
    }
  }

  useEffect(() => {
    fetchQuote();
  }, [fromSymbol, toSymbol, amountIn]);

  function handleSwitchTokens() {
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
    setSide(side === "BUY" ? "SELL" : "BUY");
  }

  async function handleExecuteTrade() {
    if (!isConnected || !address) {
      toast.info("Please connect your EVM wallet to execute trades.");
      return;
    }

    setExecuting(true);
    try {
      const planRes = await fetch(`${BACKEND_URL}/api/swap/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromToken: fromSymbol,
          toToken: toSymbol,
          amountIn,
          userAddress: address,
        }),
      });

      const planData = await planRes.json();
      if (!planRes.ok || !planData.plan) {
        throw new Error(planData.error || "Failed to generate trade execution plan");
      }

      const { approvals, swap } = planData.plan;

      // Execute ERC20 Approvals first if required
      for (const appTx of approvals) {
        toast.info(`Approving ${fromSymbol} for Uniswap Router...`);
        await sendTransactionAsync({
          to: appTx.to,
          data: appTx.data,
          value: BigInt(appTx.value || "0"),
        });
      }

      // Execute Swap transaction
      toast.info(`Executing non-custodial ${side} for ${amountIn} ${fromSymbol}...`);
      const hash = await sendTransactionAsync({
        to: swap.to,
        data: swap.data,
        value: BigInt(swap.value || "0"),
      });

      toast.success(`Trade Submitted! Tx Hash: ${hash.slice(0, 10)}...`);
    } catch (err: any) {
      toast.fromError(err);
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Header & Mode Switcher */}
      <div className="border border-black/15 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-black/10 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSide("BUY")}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                side === "BUY"
                  ? "bg-black text-white"
                  : "bg-black/5 text-black/60 hover:bg-black/10"
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setSide("SELL")}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                side === "SELL"
                  ? "bg-black text-white"
                  : "bg-black/5 text-black/60 hover:bg-black/10"
              }`}
            >
              Sell
            </button>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/45">
            Uniswap V3 Engine
          </span>
        </div>

        {/* Trade Controls Form */}
        <div className="mt-6 space-y-5">
          {/* You Pay / From Token */}
          <div className="border border-black/10 bg-black/[0.02] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/55">
                You Pay
              </span>
              <span className="text-[10px] font-mono text-black/45">Balance: —</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.0"
                className="w-full bg-transparent font-mono text-xl font-bold text-black outline-none placeholder:text-black/30"
              />
              <select
                value={fromSymbol}
                onChange={(e) => setFromSymbol(e.target.value)}
                className="cursor-pointer border border-black/15 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-black outline-none"
              >
                {POPULAR_TOKENS.map((t) => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Switch Button */}
          <div className="flex justify-center -my-2">
            <button
              onClick={handleSwitchTokens}
              className="border border-black/15 bg-white p-2.5 shadow-sm transition hover:bg-black/5"
              title="Switch Pay/Receive Tokens"
            >
              <ArrowDownUp className="h-4 w-4 text-black/70" />
            </button>
          </div>

          {/* You Receive / To Token */}
          <div className="border border-black/10 bg-black/[0.02] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/55">
                You Receive (Estimated)
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-full font-mono text-xl font-bold text-black">
                {quoting ? (
                  <Loader2 className="h-5 w-5 animate-spin text-black/40" />
                ) : (
                  quoteResult?.amountOut || "0.0"
                )}
              </div>
              <select
                value={toSymbol}
                onChange={(e) => setToSymbol(e.target.value)}
                className="cursor-pointer border border-black/15 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-black outline-none"
              >
                {POPULAR_TOKENS.map((t) => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quote Details Bar */}
          {quoteResult && (
            <div className="border border-black/10 bg-white p-4 space-y-2 text-xs">
              <div className="flex justify-between text-black/60">
                <span>Execution Rate</span>
                <span className="font-mono text-black font-semibold">
                  1 {fromSymbol} = {(Number(quoteResult.amountOut) / Number(amountIn || 1)).toFixed(6)} {toSymbol}
                </span>
              </div>
              <div className="flex justify-between text-black/60">
                <span>Est. Price Impact</span>
                <span className="font-mono text-black font-semibold">
                  ~{quoteResult.priceImpactPct}%
                </span>
              </div>
              <div className="flex justify-between text-black/60">
                <span>DEX Router</span>
                <span className="font-mono uppercase text-black/70">Uniswap V3</span>
              </div>
            </div>
          )}

          {/* Submit Execute Button */}
          <button
            onClick={handleExecuteTrade}
            disabled={executing || quoting || !amountIn}
            className="w-full py-4 text-xs font-bold uppercase tracking-widest transition disabled:opacity-50"
            style={{ backgroundColor: ACCENT, color: "#ffffff" }}
          >
            {executing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Executing Non-Custodial {side}...
              </span>
            ) : (
              `${side} ${toSymbol}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
