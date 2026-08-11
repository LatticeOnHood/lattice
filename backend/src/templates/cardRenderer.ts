import { DexScreenerTokenMetrics } from "../services/dexscreener";

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
• <b>DEX Venue:</b> <code>${(metrics.dexId || "uniswap").toUpperCase()}</code>

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

  return `🔮 $${metrics.symbol} Token Audit
Price: ${formatPrice(metrics.priceUsd)}
MCap: ${formatUsd(metrics.marketCap)} | LP: ${formatUsd(metrics.liquidityUsd)}
24h Vol: ${formatUsd(metrics.volume24h)} (${changeStr})
24h Tx: 🟢${metrics.buys24h || 0} / 🔴${metrics.sells24h || 0}
DEX: ${(metrics.dexId || "uniswap").toUpperCase()}

#Lattice #RobinhoodEVM #TokenAudit`;
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

  return `🔮 Welcome to Lattice! Mention @LatticeBot with a Robinhood EVM token address (0x...) for instant token audits. Learn more at https://latticehood.app`;
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
