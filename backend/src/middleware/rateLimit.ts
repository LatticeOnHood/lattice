import { Request, Response, NextFunction } from "express";

/**
 * Per-caller rate limiting.
 *
 * The whitepaper's security section commits to "strict per-account limits" on the
 * grounds that checking a contract is cheap for the requester and expensive for
 * our RPC and API budget. Nothing enforced that: a single trending token could
 * fan out unbounded upstream calls.
 *
 * Deliberately dependency-free and in-process. A fixed window over a Map is not
 * distributed and resets on deploy, which is the correct trade while the API runs
 * as a single service — adding a shared store can wait until there is more than
 * one instance to share it between.
 */

interface Bucket {
  count: number;
  /** Epoch ms at which this window expires. */
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  /** Identifies the caller. Defaults to authenticated wallet, else source IP. */
  keyOf?: (req: Request) => string;
}

/**
 * Callers are keyed by wallet when the request carries a session, so one account
 * cannot multiply its budget by rotating IPs, and a shared NAT does not put
 * unrelated users into the same bucket.
 */
function defaultKey(req: Request): string {
  const wallet = (req as Request & { user?: { walletAddress?: string } }).user?.walletAddress;
  if (wallet) return `wallet:${wallet.toLowerCase()}`;
  return `ip:${req.ip || req.socket.remoteAddress || "unknown"}`;
}

export function rateLimit({ windowMs, max, keyOf = defaultKey }: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();
  let lastSweep = Date.now();

  /**
   * Drop expired buckets on a timer rather than per request: the Map would
   * otherwise grow with every distinct caller for the process lifetime.
   */
  function sweep(now: number) {
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    sweep(now);

    const key = keyOf(req);
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(max - 1));
      next();
      return;
    }

    existing.count += 1;

    if (existing.count > max) {
      const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", "0");
      // Same wording the upstream 429 path uses, so the client's existing
      // rate-limit handling covers both without a new branch.
      res.status(429).json({
        error: `You've been rate limited. Try again in ${retryAfter}s.`,
      });
      return;
    }

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - existing.count)));
    next();
  };
}
