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

/**
 * Renders Telegram HTML Audit Card
 */
export function renderTelegramAuditCard(metrics: DexScreenerTokenMetrics): string {
  const priceChange = Number(metrics.priceChange24h) || 0;
  const priceChangeIcon = priceChange >= 0 ? "📈" : "📉";
  const priceChangeFormatted = `${priceChangeIcon} ${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)}%`;

  const top10Section = metrics.top10HoldersPct
    ? `• <b>Top 10 Holders:</b> <code>${metrics.top10HoldersPct.toFixed(2)}%</code>\n`
    : "";

  const athSection = metrics.athPrice
    ? `• <b>ATH Price:</b> <code>${formatPrice(metrics.athPrice)}</code> (${formatUsd(metrics.athFdv)})\n`
    : "";

  const creatorSection = metrics.creatorAddress
    ? `• <b>Deployer:</b> <code>${metrics.creatorAddress.slice(0, 6)}...${metrics.creatorAddress.slice(-4)}</code>\n`
    : "";

  const securityHeader = (top10Section || athSection || creatorSection)
    ? `\n<b>🛡️ Security & Distribution</b>\n${top10Section}${athSection}${creatorSection}`
    : "";

  return `<b>🔮 Lattice Audit Report — $${metrics.symbol}</b>
<i>${metrics.name}</i> (Robinhood EVM)

<b>📊 Market Valuation</b>
• <b>Price:</b> <code>${formatPrice(metrics.priceUsd)}</code> (${metrics.priceNative || "0"})
• <b>Market Cap:</b> <code>${formatUsd(metrics.marketCap)}</code>
• <b>Liquidity Pool:</b> <code>${formatUsd(metrics.liquidityUsd)}</code>

<b>📈 24h Trading Activity</b>
• <b>24h Volume:</b> <code>${formatUsd(metrics.volume24h)}</code>
• <b>24h Change:</b> <code>${priceChangeFormatted}</code>
• <b>24h Transactions:</b> 🟢 <code>${metrics.buys24h || 0} Buys</code> | 🔴 <code>${metrics.sells24h || 0} Sells</code>
• <b>DEX Venue:</b> <code>${(metrics.dexId || "uniswap").toUpperCase()}</code>${securityHeader}

<b>🔗 Quick Links</b>
• <a href="https://dexscreener.com/${metrics.dexId || "uniswap"}/${metrics.pairAddress || ""}">DexScreener Pair</a>
${metrics.twitter ? `• <a href="${metrics.twitter}">Twitter / X</a>\n` : ""}${metrics.telegram ? `• <a href="${metrics.telegram}">Telegram Community</a>\n` : ""}
<i>Powered by Lattice Audit Engine</i>`;
}

/**
 * Renders X (Twitter) Tweet Reply Card (<280 chars)
 */
export function renderTwitterAuditReply(metrics: DexScreenerTokenMetrics): string {
  const priceChange = Number(metrics.priceChange24h) || 0;
  const priceChangeIcon = priceChange >= 0 ? "📈" : "📉";
  const changeStr = `${priceChangeIcon}${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(1)}%`;
  const top10Str = metrics.top10HoldersPct ? ` | Top10: ${metrics.top10HoldersPct.toFixed(1)}%` : "";

  return `🔮 $${metrics.symbol} Token Audit
Price: ${formatPrice(metrics.priceUsd)}
MCap: ${formatUsd(metrics.marketCap)} | LP: ${formatUsd(metrics.liquidityUsd)}
24h Vol: ${formatUsd(metrics.volume24h)} (${changeStr})
24h Tx: 🟢${metrics.buys24h || 0} / 🔴${metrics.sells24h || 0}${top10Str}
DEX: ${(metrics.dexId || "uniswap").toUpperCase()}

#Lattice #RobinhoodEVM #TokenAudit`;
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
        lines.push(
          isTelegram
            ? `• <b>Top 10 Holders:</b> <code>${metrics.top10HoldersPct ? `${metrics.top10HoldersPct.toFixed(2)}%` : "N/A"}</code>`
            : `• Top 10 Holders: ${metrics.top10HoldersPct ? `${metrics.top10HoldersPct.toFixed(1)}%` : "N/A"}`
        );
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
          lines.push(
            isTelegram
              ? `• <b>Deployer:</b> <code>${fmt}</code>`
              : `• Dev: ${fmt}`
          );
        }
        break;
    }
  }

  if (isTelegram) {
    return `<b>🔮 Lattice Quick Answer — $${metrics.symbol}</b>
<i>${metrics.name}</i> (Robinhood EVM)

${lines.join("\n")}

<i>Powered by Lattice Audit Engine</i>`;
  }

  return `🔮 $${metrics.symbol} Quick Answer
${lines.join("\n")}

#Lattice #RobinhoodEVM`;
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

  return `⚠️ Account Not Linked: Please connect your EVM wallet and link your X account at https://latticehood.app/connect to request token audits. #Lattice`;
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
    return `⚠️ <b>Unsupported Blockchain</b>

Lattice currently only supports <b>Robinhood EVM</b> token contract addresses (starting with <code>0x...</code>).
Solana and non-EVM addresses are ignored.`;
  }

  return `⚠️ Lattice currently only supports Robinhood EVM token contract addresses (0x...). Solana & non-EVM addresses are ignored.`;
}
