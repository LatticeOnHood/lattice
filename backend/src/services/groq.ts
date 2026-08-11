import { isValidEvmAddress } from "./dexscreener";

export interface ParsedIntent {
  action: "AUDIT" | "HELP" | "INVALID_CHAIN" | "UNKNOWN";
  tokenAddress: string | null;
  rawQuery?: string;
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
 * Parses user natural language query using Groq AI
 */
export async function parseIntentWithGroq(userMessage: string): Promise<ParsedIntent> {
  // Quick fallback: check direct commands or regex match first
  const directAddress = extractEvmAddress(userMessage);

  if (userMessage.trim().startsWith("/start") || userMessage.trim().startsWith("/help")) {
    return { action: "HELP", tokenAddress: null, rawQuery: userMessage };
  }

  // If a Solana Base58 or non-EVM address pattern is detected without 0x
  const nonEvmMatch = userMessage.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  if (nonEvmMatch && !directAddress) {
    return { action: "INVALID_CHAIN", tokenAddress: null, rawQuery: userMessage };
  }

  if (directAddress && isValidEvmAddress(directAddress)) {
    return { action: "AUDIT", tokenAddress: directAddress, rawQuery: userMessage };
  }

  if (!GROQ_API_KEY) {
    // If no Groq API Key set, fallback to regex extraction
    return {
      action: directAddress ? "AUDIT" : "UNKNOWN",
      tokenAddress: directAddress,
      rawQuery: userMessage,
    };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
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
Your job is to analyze incoming chat messages from X and Telegram and output JSON strictly conforming to this schema:
{
  "action": "AUDIT" | "HELP" | "INVALID_CHAIN" | "UNKNOWN",
  "tokenAddress": "string or null"
}
Rules:
- If the user asks for a token audit or provides an EVM address (starts with 0x and is 42 chars long), set action to "AUDIT" and tokenAddress to the 0x address.
- If the user asks how to use the bot, says hello, or types /help, set action to "HELP".
- If the user provides a Solana or non-EVM address, set action to "INVALID_CHAIN".
- Otherwise set action to "UNKNOWN".`,
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
        action: directAddress ? "AUDIT" : "UNKNOWN",
        tokenAddress: directAddress,
        rawQuery: userMessage,
      };
    }

    const json = await response.json();
    const parsed = JSON.parse(json.choices[0].message.content);

    return {
      action: parsed.action || (directAddress ? "AUDIT" : "UNKNOWN"),
      tokenAddress: parsed.tokenAddress || directAddress,
      rawQuery: userMessage,
    };
  } catch (err) {
    console.warn("[groq] Intent parsing warning, falling back to regex:", err);
    return {
      action: directAddress ? "AUDIT" : "UNKNOWN",
      tokenAddress: directAddress,
      rawQuery: userMessage,
    };
  }
}
