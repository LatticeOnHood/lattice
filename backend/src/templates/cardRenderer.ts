import { DexScreenerTokenMetrics } from "../services/dexscreener";
import { RequestedMetric } from "../services/groq";

export function formatUsd(num: number | null | undefined): string {
  const val = Number(num) || 0;
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(2)}K`;
  return `$${val.toFixed(4)}`;
}

export function formatPrice(num: number | null | undefined): string {
  const val = Number(num) || 0;
  if (val === 0) return "$0.00";
  if (val < 0.0001) return `$${val.toExponential(4)}`;
  return `$${val.toFixed(6)}`;
}

/** Deep link to the full report on the dashboard. */
function reportUrl(address: string): string {
  return `https://latticehood.app/app?token=${address.toLowerCase()}`;
}

/**
 * Renders the Telegram audit card.
 *
 * Deliberately short. A reply in a chat is a glance, not a dossier — the full
 * breakdown (every check, its provenance, and which checks did not run) lives on
 * the dashboard, and this card links to it. Anything added here has to earn its
 * line against the reader scrolling past the whole message.
 */
export function renderTelegramAuditCard(metrics: DexScreenerTokenMetrics): string {
  const priceChange = Number(metrics.priceChange24h) || 0;
  const changeStr = `${priceChange >= 0 ? "📈 +" : "📉 "}${priceChange.toFixed(1)}%`;

  const lines: string[] = [
    `• <b>Price</b> <code>${formatPrice(metrics.priceUsd)}</code> (${changeStr})`,
    `• <b>MCap</b> <code>${formatUsd(metrics.marketCap)}</code> · <b>LP</b> <code>${formatUsd(metrics.liquidityUsd)}</code>`,
    `• <b>Vol 24h</b> <code>${formatUsd(metrics.volume24h)}</code> · 🟢${metrics.buys24h || 0} / 🔴${metrics.sells24h || 0}`,
  ];

  // Distribution only when the indexer actually returned it.
  if (metrics.holdersCount || metrics.top10HoldersPct) {
    const holders = metrics.holdersCount ? `<code>${metrics.holdersCount.toLocaleString()}</code>` : "—";
    const top10 = metrics.top10HoldersPct ? ` (top 10: ${metrics.top10HoldersPct.toFixed(1)}%)` : "";
    lines.push(`• <b>Holders</b> ${holders}${top10}`);
  }

  if (metrics.creatorAddress) {
    const hold = metrics.devHoldingsPct !== undefined ? `${metrics.devHoldingsPct.toFixed(1)}%` : "—";
    lines.push(`• <b>Dev</b> ${hold} held · 🟢${metrics.devBuys || 0} / 🔴${metrics.devSells || 0}`);
  }

  return `<b>🔮 $${metrics.symbol}</b> — ${metrics.name}

${lines.join("\n")}

<a href="${reportUrl(metrics.address)}">Full report →</a>
<i>Market data only. Not financial advice.</i>`;
}

export function extractTwitterHandle(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)/i);
  return match && match[1] !== "intent" ? `@${match[1]}` : null;
}

/**
 * Renders X (Twitter) Tweet Reply Card (<280 chars)
 */
/**
 * Renders the X reply.
 *
 * Built to land in a single tweet, never a thread: the previous version emitted
 * the full 42-character contract address plus seven labelled lines and three
 * hashtags, which routinely overflowed 280 and split into a thread nobody asked
 * for. Detail belongs on the dashboard, and the link carries the reader there.
 *
 * Optional lines are appended only while they still fit, so the reply degrades by
 * dropping the least important figure rather than by spilling into a second post.
 */
export function renderTwitterAuditReply(metrics: DexScreenerTokenMetrics): string {
  const priceChange = Number(metrics.priceChange24h) || 0;
  const changeStr = `${priceChange >= 0 ? "📈+" : "📉"}${priceChange.toFixed(1)}%`;

  const head = `🔮 $${metrics.symbol} — Lattice`;
  const core = [
    `MCap ${formatUsd(metrics.marketCap)} · LP ${formatUsd(metrics.liquidityUsd)}`,
    `24h ${formatUsd(metrics.volume24h)} (${changeStr}) · 🟢${metrics.buys24h || 0}/🔴${metrics.sells24h || 0}`,
  ];

  const optional: string[] = [];
  if (metrics.top10HoldersPct) optional.push(`Top10 ${metrics.top10HoldersPct.toFixed(1)}%`);
  if (metrics.creatorAddress && metrics.devHoldingsPct !== undefined) {
    optional.push(`Dev ${metrics.devHoldingsPct.toFixed(1)}%`);
  }

  const tail = `\n${reportUrl(metrics.address)}`;

  let body = `${head}\n${core.join("\n")}`;
  if (optional.length && `${body}\n${optional.join(" · ")}${tail}`.length <= 280) {
    body += `\n${optional.join(" · ")}`;
  }

  return `${body}${tail}`;
}

/**
 * Splits tweet content into <=280 character chunks for X thread replies.
 * If text > 280 chars, appends "(continued audit in thread 🧵)" to chunk 1 and replies with remaining content in thread.
 */
export function splitTweetContent(text: string, maxLen = 280): string[] {
  if (text.length <= maxLen) return [text];

  const threadSuffix = "\n\n(continued audit in thread 🧵)";
  const maxChunk1Len = maxLen - threadSuffix.length;

  let splitIndex = text.lastIndexOf("\n", maxChunk1Len);
  if (splitIndex <= 0) {
    splitIndex = text.lastIndexOf(" ", maxChunk1Len);
  }
  if (splitIndex <= 0) {
    splitIndex = maxChunk1Len;
  }

  const chunk1 = text.slice(0, splitIndex).trim() + threadSuffix;
  const remaining = text.slice(splitIndex).trim();

  if (remaining.length <= maxLen) {
    return [chunk1, remaining];
  }

  return [chunk1, ...splitTweetContent(remaining, maxLen)];
}

/**
 * Renders Targeted Specific Metrics Card for Question Binding (Telegram HTML / X Text)
 */
export function renderSpecificMetricsCard(
  metrics: DexScreenerTokenMetrics,
  requestedMetrics: RequestedMetric[],
  platform: "X" | "TELEGRAM"
): string {
  const isTelegram = platform === "TELEGRAM";
  const lines: string[] = [];

  const metricsToRender = requestedMetrics.includes("FULL_AUDIT") || requestedMetrics.length === 0
    ? ["PRICE", "MARKET_CAP", "LIQUIDITY", "TOP_HOLDERS"] as RequestedMetric[]
    : requestedMetrics;

  for (const m of metricsToRender) {
    switch (m) {
      case "PRICE":
        lines.push(
          isTelegram
            ? `• <b>Price:</b> <code>${formatPrice(metrics.priceUsd)}</code>`
            : `• Price: ${formatPrice(metrics.priceUsd)}`
        );
        break;
      case "MARKET_CAP":
        lines.push(
          isTelegram
            ? `• <b>Market Cap:</b> <code>${formatUsd(metrics.marketCap)}</code>`
            : `• MCap: ${formatUsd(metrics.marketCap)}`
        );
        break;
      case "FDV":
        lines.push(
          isTelegram
            ? `• <b>FDV:</b> <code>${formatUsd(metrics.fdv || metrics.marketCap)}</code>`
            : `• FDV: ${formatUsd(metrics.fdv || metrics.marketCap)}`
        );
        break;
      case "LIQUIDITY":
        lines.push(
          isTelegram
            ? `• <b>Liquidity Pool:</b> <code>${formatUsd(metrics.liquidityUsd)}</code>`
            : `• LP: ${formatUsd(metrics.liquidityUsd)}`
        );
        break;
      case "VOLUME_24H":
        lines.push(
          isTelegram
            ? `• <b>24h Volume:</b> <code>${formatUsd(metrics.volume24h)}</code>`
            : `• 24h Vol: ${formatUsd(metrics.volume24h)}`
        );
        break;
      case "PRICE_CHANGE_24H":
        {
          const change = Number(metrics.priceChange24h) || 0;
          const icon = change >= 0 ? "📈" : "📉";
          lines.push(
            isTelegram
              ? `• <b>24h Change:</b> <code>${icon} ${change >= 0 ? "+" : ""}${change.toFixed(2)}%</code>`
              : `• 24h Change: ${icon}${change >= 0 ? "+" : ""}${change.toFixed(1)}%`
          );
        }
        break;
      case "TRANSACTIONS_24H":
        lines.push(
          isTelegram
            ? `• <b>24h Txns:</b> 🟢 <code>${metrics.buys24h || 0} Buys</code> | 🔴 <code>${metrics.sells24h || 0} Sells</code>`
            : `• 24h Tx: 🟢${metrics.buys24h || 0} / 🔴${metrics.sells24h || 0}`
        );
        break;
      case "TOP_HOLDERS":
        if (metrics.holdersCount) {
          lines.push(
            isTelegram
              ? `• <b>Holders:</b> <code>${metrics.holdersCount.toLocaleString()}</code>${metrics.top10HoldersPct ? ` (Top 10: ${metrics.top10HoldersPct.toFixed(2)}%)` : ""}`
              : `• Holders: ${metrics.holdersCount.toLocaleString()}${metrics.top10HoldersPct ? ` (Top 10: ${metrics.top10HoldersPct.toFixed(1)}%)` : ""}`
          );
        } else {
          lines.push(
            isTelegram
              ? `• <b>Top 10 Holders:</b> <code>${metrics.top10HoldersPct ? `${metrics.top10HoldersPct.toFixed(2)}%` : "N/A"}`
              : `• Top 10 Holders: ${metrics.top10HoldersPct ? `${metrics.top10HoldersPct.toFixed(1)}%` : "N/A"}`
          );
        }
        break;
      case "ATH":
        lines.push(
          isTelegram
            ? `• <b>ATH Price:</b> <code>${formatPrice(metrics.athPrice || metrics.priceUsd)}</code> (${formatUsd(metrics.athFdv || metrics.marketCap)})`
            : `• ATH: ${formatPrice(metrics.athPrice || metrics.priceUsd)} (${formatUsd(metrics.athFdv || metrics.marketCap)})`
        );
        break;
      case "ATL":
        lines.push(
          isTelegram
            ? `• <b>ATL Price:</b> <code>${formatPrice(metrics.atlPrice)}</code>`
            : `• ATL: ${formatPrice(metrics.atlPrice)}`
        );
        break;
      case "CREATOR":
        {
          const addr = metrics.creatorAddress;
          const fmt = addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Unknown";
          const hold = metrics.devHoldingsPct !== undefined ? `${metrics.devHoldingsPct.toFixed(1)}%` : "0%";
          const buys = metrics.devBuys || 0;
          const sells = metrics.devSells || 0;
          lines.push(
            isTelegram
              ? `• <b>Dev Wallet:</b> <code>${fmt}</code> (Holdings: <code>${hold}</code> | 🟢 <code>${buys} Buys</code> / 🔴 <code>${sells} Sells</code>)`
              : `• Dev Wallet: ${fmt} (${hold} hold | 🟢${buys}/🔴${sells})`
          );
        }
        break;
    }
  }

  // A targeted question gets a targeted answer — the asked-for figures and a link,
  // not a card header and a sign-off.
  if (isTelegram) {
    return `<b>🔮 $${metrics.symbol}</b> — ${metrics.name}

${lines.join("\n")}

<a href="${reportUrl(metrics.address)}">Full report →</a>`;
  }

  return `🔮 $${metrics.symbol} — Lattice
${lines.join("\n")}

${reportUrl(metrics.address)}`;
}

/**
 * Response for Unlinked Accounts
 */
export function renderUnlinkedAccountNotice(platform: "X" | "TELEGRAM"): string {
  if (platform === "TELEGRAM") {
    return `⚠️ <b>Account Not Linked</b>

Your Telegram account is not bound to a verified EVM wallet address.
Please connect your wallet and link your account at:
<a href="https://latticehood.app/connect">https://latticehood.app/connect</a> to run token audits.`;
  }

  return `⚠️ Account Not Linked: Please connect your EVM wallet and link your account by clicking the link on my bio to request token audits. #Lattice`;
}

/**
 * Response for Help / Welcome Command
 */
export function renderHelpNotice(platform: "X" | "TELEGRAM"): string {
  if (platform === "TELEGRAM") {
    return `🔮 <b>Welcome to Lattice Audit Bot</b>

Tag or paste a Robinhood EVM token contract address (0x...) to get an instant token audit report.

<b>Commands:</b>
• <code>/audit 0x...</code> — Run instant token audit
• <code>/help</code> — Show this help message

<i>Note: Only verified accounts bound to an EVM wallet can run audits.</i>`;
  }

  return `🔮 Welcome to Lattice! Mention @latticehoodbot with a Robinhood EVM token address (0x...) for instant token audits. Learn more at https://latticehood.app`;
}

/**
 * Response for Invalid Chain (Non-EVM Address)
 */
export function renderInvalidChainNotice(platform: "X" | "TELEGRAM"): string {
  if (platform === "TELEGRAM") {
    return `⚠️ <b>Invalid Network / Address</b>

Lattice Audit Engine currently operates on <b>Robinhood EVM Chain</b>.
Please supply a valid 40-character 0x EVM contract address.`;
  }

  return `⚠️ Invalid Network: Lattice operates on Robinhood EVM Chain. Please provide a valid 0x EVM address. #Lattice`;
}

/**
 * Renders Non-Custodial Buy/Sell Trade Quote Card for Telegram HTML and X
 */
export function renderTradeQuoteCard(
  quote: any,
  platform: "X" | "TELEGRAM",
  tradeDetails?: any
): string {
  const side = tradeDetails?.side || (quote.fromToken.symbol === "USDG" || quote.fromToken.symbol === "ETH" ? "BUY" : "SELL");
  const actionText = side === "BUY" ? "Buy Quote" : "Sell Quote";

  const executeUrl = `https://latticehood.app/trade?from=${quote.fromToken.address}&to=${quote.toToken.address}&amount=${quote.amountIn}`;
  const dexVer = quote.dexVersion || "V3";

  if (platform === "TELEGRAM") {
    return `⚡ <b>Lattice ${actionText} — $${quote.toToken.symbol}</b>

• <b>Pay:</b> <code>${quote.amountIn} ${quote.fromToken.symbol}</code>
• <b>Receive (Est.):</b> <code>${quote.amountOut} ${quote.toToken.symbol}</code>
• <b>Price Impact:</b> <code>~${quote.priceImpactPct}%</code>
• <b>Routing:</b> Uniswap ${dexVer} (${quote.routing})

🔗 <b>Non-Custodial Execution</b>
<a href="${executeUrl}">Review & Execute Trade on Dashboard</a>
<i>Powered by Lattice Engine</i>`;
  }

  return `⚡ Lattice ${actionText}: $${quote.toToken.symbol}
Pay: ${quote.amountIn} ${quote.fromToken.symbol}
Est. Receive: ${quote.amountOut} ${quote.toToken.symbol}
Impact: ~${quote.priceImpactPct}% | DEX: Uniswap ${dexVer}

Review & sign in bio link dashboard! #Lattice #Trade`;
}
