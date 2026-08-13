"use client";

import React, { useState, useEffect } from "react";
import { ArrowDownUp, Loader2, Search, X, Plus, ChevronDown, Check, ExternalLink } from "lucide-react";
import { ACCENT } from "@/lib/brand";
import { useSession } from "@/components/auth/session-provider";
import { useToast } from "@/components/ui/toast";
import { useAccount, useSendTransaction } from "wagmi";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.latticehood.app";

export interface TokenOption {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  isCustom?: boolean;
}

export const POPULAR_TOKENS: TokenOption[] = [
  { symbol: "USDG", name: "Robinhood USDG", address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", decimals: 6 },
  { symbol: "ETH", name: "Robinhood ETH", address: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73", decimals: 18 },
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

  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [tokenList, setTokenList] = useState<TokenOption[]>(POPULAR_TOKENS);

  const [fromToken, setFromToken] = useState<TokenOption>(POPULAR_TOKENS[0]);
  const [toToken, setToToken] = useState<TokenOption>(POPULAR_TOKENS[2]);
  const [amountIn, setAmountIn] = useState("10");

  const [quoting, setQuoting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [quoteResult, setQuoteResult] = useState<{
    amountOut: string;
    priceImpactPct: number;
    routing: string;
    dexVersion: string;
  } | null>(null);

  // Modal State
  const [activeModalTarget, setActiveModalTarget] = useState<"FROM" | "TO" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customResolving, setCustomResolving] = useState(false);
  const [resolvedCustomToken, setResolvedCustomToken] = useState<TokenOption | null>(null);

  // Fetch live quote from backend engine
  async function fetchQuote() {
    if (!amountIn || Number(amountIn) <= 0) {
      setQuoteResult(null);
      return;
    }
    setQuoting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/swap/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromToken: fromToken.address,
          toToken: toToken.address,
          amountIn,
        }),
      });
      const data = await res.json();
      if (res.ok && data.quote) {
        setQuoteResult({
          amountOut: data.quote.amountOut,
          priceImpactPct: data.quote.priceImpactPct,
          routing: data.quote.routing,
          dexVersion: data.quote.dexVersion || "V4",
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



  // Resolve custom contract address typed into modal search
  useEffect(() => {
    const q = searchQuery.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(q)) {
      // Check if already in tokenList
      const existing = tokenList.find((t) => t.address.toLowerCase() === q.toLowerCase());
      if (existing) {
        setResolvedCustomToken(null);
        return;
      }

      setCustomResolving(true);
      fetch(`${BACKEND_URL}/api/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: q }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.metrics) {
            setResolvedCustomToken({
              symbol: data.metrics.symbol || "TOKEN",
              name: data.metrics.name || "Custom Token",
              address: q,
              decimals: 18,
              isCustom: true,
            });
          } else {
            setResolvedCustomToken({
              symbol: "CUSTOM",
              name: `Token ${q.slice(0, 6)}...`,
              address: q,
              decimals: 18,
              isCustom: true,
            });
          }
        })
        .catch(() => {
          setResolvedCustomToken({
            symbol: "CUSTOM",
            name: `Token ${q.slice(0, 6)}...`,
            address: q,
            decimals: 18,
            isCustom: true,
          });
        })
        .finally(() => setCustomResolving(false));
    } else {
      setResolvedCustomToken(null);
    }
  }, [searchQuery, tokenList]);

  function handleSwitchTokens() {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setSide(side === "BUY" ? "SELL" : "BUY");
  }

  function handleSelectToken(token: TokenOption) {
    if (activeModalTarget === "FROM") {
      if (token.address.toLowerCase() === toToken.address.toLowerCase()) {
        setToToken(fromToken);
      }
      setFromToken(token);
    } else if (activeModalTarget === "TO") {
      if (token.address.toLowerCase() === fromToken.address.toLowerCase()) {
        setFromToken(toToken);
      }
      setToToken(token);
    }
    setActiveModalTarget(null);
    setSearchQuery("");
  }

  function handleImportCustomToken(token: TokenOption) {
    setTokenList((prev) => [...prev, token]);
    handleSelectToken(token);
  }

  async function handleExecuteTrade() {
    if (!isConnected || !address) {
      toast.info("Please connect your wallet to execute non-custodial trades.");
      return;
    }

    setExecuting(true);
    try {
      const planRes = await fetch(`${BACKEND_URL}/api/swap/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromToken: fromToken.address,
          toToken: toToken.address,
          amountIn,
          userAddress: address,
        }),
      });

      const planData = await planRes.json();
      if (!planRes.ok || !planData.plan) {
        throw new Error(planData.error || "Failed to generate trade execution plan");
      }

      const { approvals, swap } = planData.plan;

      for (const appTx of approvals) {
        toast.info(`Approving ${fromToken.symbol} for Uniswap Router...`);
        await sendTransactionAsync({
          to: appTx.to,
          data: appTx.data,
          value: BigInt(appTx.value || "0"),
        });
      }

      toast.info(`Executing non-custodial ${side} for ${amountIn} ${fromToken.symbol}...`);
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

  const filteredTokens = tokenList.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Main Trade Console Container */}
      <div className="border border-black/15 bg-white p-6 shadow-sm">
        {/* Header & Dynamic Engine Badge */}
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
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/60">
            Uniswap {quoteResult?.dexVersion || "V4 / V3"} Engine
          </span>
        </div>

        {/* Trade Inputs */}
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
              <button
                onClick={() => setActiveModalTarget("FROM")}
                className="flex items-center gap-2 border border-black/15 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-black/5"
              >
                <span>{fromToken.symbol}</span>
                <ChevronDown className="h-3.5 w-3.5 text-black/50" />
              </button>
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
              <button
                onClick={() => setActiveModalTarget("TO")}
                className="flex items-center gap-2 border border-black/15 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-black/5"
              >
                <span>{toToken.symbol}</span>
                <ChevronDown className="h-3.5 w-3.5 text-black/50" />
              </button>
            </div>
          </div>

          {/* Live Quote Details */}
          {quoteResult && (
            <div className="border border-black/10 bg-white p-4 space-y-2 text-xs">
              <div className="flex justify-between text-black/60">
                <span>Execution Rate</span>
                <span className="font-mono text-black font-semibold">
                  1 {fromToken.symbol} = {(Number(quoteResult.amountOut) / Number(amountIn || 1)).toFixed(6)} {toToken.symbol}
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
                <span className="font-mono uppercase text-black font-semibold">
                  Uniswap {quoteResult.dexVersion} ({quoteResult.routing})
                </span>
              </div>
            </div>
          )}

          {/* Execute Trade Button */}
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
              `${side} ${toToken.symbol}`
            )}
          </button>
        </div>
      </div>

      {/* Modal: Token Selector */}
      {activeModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md border border-black/20 bg-white p-6 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-black/10 pb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-black">
                Select Token ({activeModalTarget === "FROM" ? "You Pay" : "You Receive"})
              </h3>
              <button
                onClick={() => {
                  setActiveModalTarget(null);
                  setSearchQuery("");
                }}
                className="p-1 text-black/50 transition hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-black/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol, name, or paste 0x address..."
                className="w-full border border-black/15 bg-black/[0.02] pl-9 pr-4 py-2.5 text-xs font-mono text-black outline-none placeholder:text-black/40"
                autoFocus
              />
            </div>

            {/* Token List */}
            <div className="mt-4 max-h-64 overflow-y-auto space-y-1 divide-y divide-black/5 pr-1">
              {filteredTokens.length > 0 ? (
                filteredTokens.map((t) => {
                  const isSelected =
                    (activeModalTarget === "FROM" && t.address.toLowerCase() === fromToken.address.toLowerCase()) ||
                    (activeModalTarget === "TO" && t.address.toLowerCase() === toToken.address.toLowerCase());

                  return (
                    <button
                      key={t.address}
                      onClick={() => handleSelectToken(t)}
                      className={`w-full flex items-center justify-between p-3 text-left transition hover:bg-black/5 ${
                        isSelected ? "bg-black/[0.04]" : ""
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-black">{t.symbol}</span>
                          {t.isCustom && (
                            <span className="border border-black/20 bg-black/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black/60">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-black/50 font-mono truncate max-w-[220px]">
                          {t.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-black/40 truncate max-w-[90px]">
                          {t.address.slice(0, 6)}...{t.address.slice(-4)}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-black" />}
                      </div>
                    </button>
                  );
                })
              ) : customResolving ? (
                <div className="flex items-center justify-center p-6 text-xs text-black/50 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Resolving token address on Robinhood Chain...
                </div>
              ) : resolvedCustomToken ? (
                <div className="border border-black/15 bg-black/[0.02] p-4 text-center">
                  <div className="font-mono text-xs font-bold text-black">{resolvedCustomToken.symbol}</div>
                  <div className="mt-1 text-[11px] text-black/60 font-mono">{resolvedCustomToken.name}</div>
                  <div className="mt-1 text-[10px] font-mono text-black/40">{resolvedCustomToken.address}</div>
                  <button
                    onClick={() => handleImportCustomToken(resolvedCustomToken)}
                    className="mt-3 flex items-center justify-center gap-2 w-full bg-black py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-black/80"
                  >
                    <Plus className="h-4 w-4" /> Import & Select Token
                  </button>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-black/40 font-mono">
                  No matching tokens found. Paste a valid 0x contract address to import.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
