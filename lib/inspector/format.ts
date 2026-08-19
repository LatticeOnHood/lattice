/**
 * Display formatters for the token inspector.
 *
 * Mirrors the backend's `formatUsd` / `formatPrice`
 * (`backend/src/templates/cardRenderer.ts`) on purpose: the dashboard and the
 * Telegram card describe the same numbers, and they should never disagree about
 * how many digits a number has.
 */

/** Compact USD — $1.23M, $45.6K, $0.0042. */
export function usd(value: number | null | undefined): string {
  const v = Number(value);
  if (!Number.isFinite(v)) return "—";
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

/**
 * Per-token price. Sub-cent tokens are the common case here, so significant
 * digits matter more than a fixed decimal count.
 */
export function price(value: number | null | undefined): string {
  const v = Number(value);
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "$0.00";
  if (v < 0.00000001) return `$${v.toExponential(2)}`;
  if (v < 1) return `$${v.toFixed(8)}`;
  return `$${v.toFixed(4)}`;
}

export function pct(value: number | null | undefined, digits = 2): string {
  const v = Number(value);
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(digits)}%`;
}

export function signedPct(value: number | null | undefined, digits = 2): string {
  const v = Number(value);
  if (!Number.isFinite(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

export function count(value: number | null | undefined): string {
  const v = Number(value);
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("en-US");
}

/** 0x1234…abcd — the form used everywhere an address is shown inline. */
export function shortAddress(address: string | null | undefined): string {
  if (!address || address.length < 10) return address || "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Age of a pair as a coarse human string. Deliberately coarse — "3 days" is the
 * decision-relevant fact, not "3 days 4 hours".
 */
export function age(since: number | null | undefined): string {
  const ms = Number(since);
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const seconds = Math.max(0, (Date.now() - ms) / 1000);
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 60) return `${Math.round(days)}d`;
  return `${Math.round(days / 30)}mo`;
}

/** "12s ago" — used on the provenance footer so staleness is visible. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "—";
  const seconds = Math.max(0, (Date.now() - then) / 1000);
  if (seconds < 60) return `${Math.round(seconds)}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

/** UTC clock stamp — the exact figure the whitepaper's disclosure rule asks for. */
export function timestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "—";
  return `${then.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}
