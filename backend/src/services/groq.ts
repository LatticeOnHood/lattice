import { isValidEvmAddress } from "./dexscreener";

export type RequestedMetric =
  | "PRICE"
  | "MARKET_CAP"
  | "FDV"
  | "LIQUIDITY"
  | "VOLUME_24H"
  | "PRICE_CHANGE_24H"
  | "TRANSACTIONS_24H"
  | "TOP_HOLDERS"
  | "ATH"
  | "ATL"
  | "CREATOR"
  | "FULL_AUDIT";

export interface TradeIntentDetails {
  fromToken: string;
  toToken: string;
  amountIn: string;
  side: "BUY" | "SELL";
}

export interface ParsedIntent {
  action: "AUDIT" | "SPECIFIC_METRICS" | "TRADE" | "HELP" | "INVALID_CHAIN" | "UNKNOWN";
  tokenAddress: string | null;
  requestedMetrics: RequestedMetric[];
  tradeDetails?: TradeIntentDetails;
  rawQuery?: string;
}

/**
 * Parses natural language buy/sell trading commands
 */
export function parseTradeCommand(text: string): TradeIntentDetails | null {
  const lower = text.toLowerCase().trim();
  const match = lower.match(/(buy|sell|trade|swap)\s+([\d\.]+)\s+([a-zA-Z0-9xX]+)(?:\s+(?:to|for|of|with)\s+([a-zA-Z0-9xX]+))?/i);
  if (!match) return null;

  const keyword = match[1].toUpperCase();
  const amountIn = match[2];
  const normalizeToken = (t: string) => (t.toLowerCase().startsWith("0x") ? t.toLowerCase() : t.toUpperCase());
  const firstToken = normalizeToken(match[3]);
  const secondToken = match[4] ? normalizeToken(match[4]) : undefined;

  let side: "BUY" | "SELL" = keyword === "SELL" ? "SELL" : "BUY";
  let fromToken = firstToken;
  let toToken = secondToken || "USDG";

  if (keyword === "BUY" && secondToken) {
    fromToken = firstToken;
    toToken = secondToken;
  } else if (keyword === "SELL" && secondToken) {
    fromToken = firstToken;
    toToken = secondToken;
    side = "SELL";
  }

  return {
    fromToken,
    toToken,
    amountIn,
    side,
  };
}

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = "llama-3.3-70b-versatile";

/**
 * Extracts EVM contract address from raw text using regex
 */
export function extractEvmAddress(text: string): string | null {
  const match = text.match(/0x[a-fA-F0-9]{40}/);
  return match ? match[0] : null;
}

/**
 * Quick heuristic keyword scanner for requested metrics if Groq API is bypassed
 */
export function parseRequestedMetricsFromText(text: string): RequestedMetric[] {
  const lower = text.toLowerCase();
  const metrics: RequestedMetric[] = [];

  const isDevQuery = lower.includes("dev") || lower.includes("creator") || lower.includes("deployer");

  if (isDevQuery) {
    metrics.push("CREATOR");
  }

  if (lower.includes("price") || lower.includes("cost") || (lower.includes("how much") && !isDevQuery)) {
    metrics.push("PRICE");
  }
  if (lower.includes("market cap") || lower.includes("mcap") || lower.includes("valuation")) metrics.push("MARKET_CAP");
  if (lower.includes("fdv") || lower.includes("fully diluted")) metrics.push("FDV");
  if (lower.includes("liquidity") || lower.includes("lp") || lower.includes("pool")) metrics.push("LIQUIDITY");
  if (lower.includes("volume") || lower.includes("24h vol")) metrics.push("VOLUME_24H");
  if (lower.includes("change") || lower.includes("trend")) metrics.push("PRICE_CHANGE_24H");
  if (lower.includes("buy") || lower.includes("sell") || lower.includes("tx") || lower.includes("transaction")) metrics.push("TRANSACTIONS_24H");
  if (lower.includes("holder") || lower.includes("distribution") || lower.includes("top 10")) {
    if (!isDevQuery || lower.includes("top 10") || lower.includes("total holder") || lower.includes("how many holder")) {
      metrics.push("TOP_HOLDERS");
    }
  }
  if (lower.includes("ath") || lower.includes("all time high") || lower.includes("peak")) metrics.push("ATH");
  if (lower.includes("atl") || lower.includes("all time low") || lower.includes("bottom")) metrics.push("ATL");

  return metrics.length > 0 ? metrics : ["FULL_AUDIT"];
}

/**
 * Parses user natural language query using Groq AI
 */
export async function parseIntentWithGroq(userMessage: string): Promise<ParsedIntent> {
  const directAddress = extractEvmAddress(userMessage);
  const normalizedText = userMessage.replace(/@\w+/g, "").trim().toLowerCase();

  if (
    normalizedText === "/help" ||
    normalizedText === "help" ||
    normalizedText === "/start" ||
    normalizedText === "start" ||
    normalizedText === "/commands" ||
    normalizedText === "commands" ||
    /^(?:help|commands|\/help|\/commands)(?:\s|$)/i.test(normalizedText)
  ) {
    return { action: "HELP", tokenAddress: null, requestedMetrics: [], rawQuery: userMessage };
  }

  const tradeDetails = parseTradeCommand(userMessage);
  if (tradeDetails) {
    return {
      action: "TRADE",
      tokenAddress: directAddress,
      requestedMetrics: [],
      tradeDetails,
      rawQuery: userMessage,
    };
  }

  // If a Solana Base58 or non-EVM address pattern is detected without 0x
  const nonEvmMatch = userMessage.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  if (nonEvmMatch && !directAddress) {
    return { action: "INVALID_CHAIN", tokenAddress: null, requestedMetrics: [], rawQuery: userMessage };
  }

  const detectedMetrics = parseRequestedMetricsFromText(userMessage);
  const isSpecificQuestion = detectedMetrics.length > 0 && !detectedMetrics.includes("FULL_AUDIT");

  if (!GROQ_API_KEY) {
    return {
      action: directAddress
        ? isSpecificQuestion
          ? "SPECIFIC_METRICS"
          : "AUDIT"
        : "UNKNOWN",
      tokenAddress: directAddress,
      requestedMetrics: detectedMetrics,
      rawQuery: userMessage,
    };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are the intent parser for Lattice, a Robinhood EVM token audit bot.
Analyze incoming chat messages from X and Telegram and output JSON strictly conforming to this schema:
{
  "action": "AUDIT" | "SPECIFIC_METRICS" | "HELP" | "INVALID_CHAIN" | "UNKNOWN",
  "tokenAddress": "string or null",
  "requestedMetrics": Array<"PRICE" | "MARKET_CAP" | "FDV" | "LIQUIDITY" | "VOLUME_24H" | "PRICE_CHANGE_24H" | "TRANSACTIONS_24H" | "TOP_HOLDERS" | "ATH" | "ATL" | "CREATOR" | "FULL_AUDIT">
}
Rules & Examples:
- "how much does dev wallet hold" / "dev holdings" / "dev buys and sells" / "deployer holdings" -> set action to "SPECIFIC_METRICS" and requestedMetrics to ["CREATOR"].
- "how many holders" / "top 10 holders" -> set action to "SPECIFIC_METRICS" and requestedMetrics to ["TOP_HOLDERS"].
- "what is the price and market cap" -> set action to "SPECIFIC_METRICS" and requestedMetrics to ["PRICE", "MARKET_CAP"].
- If the user asks a specific question about token metrics, set action to "SPECIFIC_METRICS", extract the 0x address, and list all requested metric keys in requestedMetrics array.
- If the user just pastes a 0x address or asks for a full audit, set action to "AUDIT" and requestedMetrics to ["FULL_AUDIT"].
- If the user asks how to use the bot or types /help, set action to "HELP".
- If the user provides a Solana or non-EVM address, set action to "INVALID_CHAIN".`,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      return {
        action: directAddress ? (isSpecificQuestion ? "SPECIFIC_METRICS" : "AUDIT") : "UNKNOWN",
        tokenAddress: directAddress,
        requestedMetrics: detectedMetrics,
        rawQuery: userMessage,
      };
    }

    const json = await response.json();
    const parsed = JSON.parse(json.choices[0].message.content);

    const metricsArr: RequestedMetric[] = Array.isArray(parsed.requestedMetrics) && parsed.requestedMetrics.length > 0
      ? parsed.requestedMetrics
      : detectedMetrics;

    const action = parsed.action || (directAddress ? (metricsArr.includes("FULL_AUDIT") ? "AUDIT" : "SPECIFIC_METRICS") : "UNKNOWN");

    return {
      action,
      tokenAddress: parsed.tokenAddress || directAddress,
      requestedMetrics: metricsArr,
      rawQuery: userMessage,
    };
  } catch (err) {
    console.warn("[groq] Intent parsing warning, falling back to heuristics:", err);
    return {
      action: directAddress ? (isSpecificQuestion ? "SPECIFIC_METRICS" : "AUDIT") : "UNKNOWN",
      tokenAddress: directAddress,
      requestedMetrics: detectedMetrics,
      rawQuery: userMessage,
    };
  }
}
