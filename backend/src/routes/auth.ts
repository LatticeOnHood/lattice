import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifyMessage } from "viem";
import { randomBytes } from "crypto";
import { pool } from "../db/index";
import {
  getLinkedXAccountByWallet,
  getLinkedTelegramAccountByWallet,
  linkXAccount,
  linkTelegramAccount,
} from "../services/auth/accountBindingService";
import {
  generatePkcePair,
  buildXAuthorizeUrl,
  exchangeCodeForXToken,
  getAuthenticatedXUser,
} from "../services/auth/oauth";
import {
  storePendingAuthState,
  consumePendingAuthState,
} from "../services/auth/pendingAuthState";
import { verifyTelegramWidgetAuth } from "../services/auth/telegramAuth";
import { requireAuth, AuthenticatedRequest } from "../middleware/authMiddleware";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "lattice_jwt_secret_key_2026";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://latticehood.app";
const X_CLIENT_ID = process.env.X_CLIENT_ID || "";
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET || "";
const X_OAUTH_REDIRECT_URI =
  process.env.X_OAUTH_REDIRECT_URI || "https://api.latticehood.app/auth/x/callback";

export function issueJwt(walletAddress: string): string {
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

/**
 * Mints a fresh PKCE pair + state for `walletAddress` and returns the X
 * authorize URL the frontend should redirect to.
 */
async function createXAuthorizeUrl(normalizedWallet: string): Promise<string> {
  const state = randomBytes(16).toString("hex");
  const { codeVerifier, codeChallenge } = generatePkcePair();

  await storePendingAuthState(state, {
    walletAddress: normalizedWallet,
    platform: "X",
    codeVerifier,
  });

  return buildXAuthorizeUrl({
    state,
    codeChallenge,
    clientId: X_CLIENT_ID,
    redirectUri: X_OAUTH_REDIRECT_URI,
  });
}

/**
 * POST /auth/signin
 * Accepts: { walletAddress, signature, message }
 * Verifies EVM signature. Creates user record if not exists.
 * Returns JWT if linked, or PKCE OAuth URL if X account linking is required.
 */
router.post("/signin", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress, signature, message } = req.body as {
      walletAddress?: `0x${string}`;
      signature?: `0x${string}`;
      message?: string;
    };

    if (!walletAddress || !signature || !message) {
      res.status(400).json({ error: "walletAddress, signature, and message are required" });
      return;
    }

    const isValid = await verifyMessage({
      address: walletAddress,
      message,
      signature,
    }).catch(() => false);

    if (!isValid) {
      res.status(401).json({ error: "Signature verification failed" });
      return;
    }

    const normalizedWallet = walletAddress.toLowerCase();

    // Create user if not exists
    await pool.query(
      `INSERT INTO users (wallet_address) VALUES ($1)
       ON CONFLICT (wallet_address) DO NOTHING`,
      [normalizedWallet]
    );

    const linkedX = await getLinkedXAccountByWallet(normalizedWallet);
    const linkedTelegram = await getLinkedTelegramAccountByWallet(normalizedWallet);

    if (linkedX || linkedTelegram) {
      const token = issueJwt(normalizedWallet);
      res.json({
        token,
        walletAddress: normalizedWallet,
        xLinked: !!linkedX,
        xHandle: linkedX?.xHandle,
        telegramLinked: !!linkedTelegram,
        telegramUsername: linkedTelegram?.telegramUsername,
      });
      return;
    }

    // Require X account linking: Generate state & PKCE pair
    const authorizeUrl = await createXAuthorizeUrl(normalizedWallet);

    res.json({
      needsXLink: true,
      authorizeUrl,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me
 * Rehydrates a stored JWT into the current binding state, so the frontend can
 * restore a session without asking the user to re-sign.
 */
router.get("/me", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const walletAddress = req.user!.walletAddress;

    const linkedX = await getLinkedXAccountByWallet(walletAddress);
    const linkedTelegram = await getLinkedTelegramAccountByWallet(walletAddress);

    res.json({
      walletAddress,
      xLinked: !!linkedX,
      xHandle: linkedX?.xHandle,
      telegramLinked: !!linkedTelegram,
      telegramUsername: linkedTelegram?.telegramUsername,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/x/authorize
 * Issues an X OAuth 2.0 PKCE authorize URL for an already-verified wallet.
 *
 * /auth/signin only returns an authorize URL when the wallet has nothing
 * linked yet; this endpoint covers the cross-link case (Telegram bound first,
 * X added afterwards to the same wallet).
 */
router.post("/x/authorize", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress, signature, message } = req.body as {
      walletAddress?: `0x${string}`;
      signature?: `0x${string}`;
      message?: string;
    };

    if (!walletAddress || !signature || !message) {
      res.status(400).json({ error: "walletAddress, signature, and message are required" });
      return;
    }

    const isValid = await verifyMessage({
      address: walletAddress,
      message,
      signature,
    }).catch(() => false);

    if (!isValid) {
      res.status(401).json({ error: "Signature verification failed" });
      return;
    }

    const normalizedWallet = walletAddress.toLowerCase();

    const linkedX = await getLinkedXAccountByWallet(normalizedWallet);
    if (linkedX) {
      res.status(409).json({
        error: "This wallet already has an X account linked",
        xHandle: linkedX.xHandle,
      });
      return;
    }

    const authorizeUrl = await createXAuthorizeUrl(normalizedWallet);
    res.json({ authorizeUrl });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/x/callback
 * Handles OAuth callback from Twitter
 */
router.get("/x/callback", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state, error: xError } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    if (xError) {
      res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent(xError)}`);
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const pending = await consumePendingAuthState(state);
    if (!pending) {
      res.redirect(`${FRONTEND_URL}/auth/callback?error=expired_or_invalid_state`);
      return;
    }

    const tokenResp = await exchangeCodeForXToken({
      code,
      codeVerifier: pending.codeVerifier,
      clientId: X_CLIENT_ID,
      clientSecret: X_CLIENT_SECRET,
      redirectUri: X_OAUTH_REDIRECT_URI,
    });

    const xUser = await getAuthenticatedXUser(tokenResp.access_token);

    // Bind X account to wallet (1:1 constraint)
    await linkXAccount(pending.walletAddress, xUser.id, xUser.username);

    const token = issueJwt(pending.walletAddress);
    res.redirect(`${FRONTEND_URL}/auth/callback#token=${token}`);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/telegram/bind
 * Binds a Telegram account to a verified EVM wallet
 */
router.post("/telegram/bind", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress, signature, message, telegramUserId, telegramUsername } = req.body as {
      walletAddress?: `0x${string}`;
      signature?: `0x${string}`;
      message?: string;
      telegramUserId?: string;
      telegramUsername?: string;
    };

    if (!walletAddress || !signature || !message || !telegramUserId) {
      res.status(400).json({
        error: "walletAddress, signature, message, and telegramUserId are required",
      });
      return;
    }

    const isValid = await verifyMessage({
      address: walletAddress,
      message,
      signature,
    }).catch(() => false);

    if (!isValid) {
      res.status(401).json({ error: "Signature verification failed" });
      return;
    }

    const normalizedWallet = walletAddress.toLowerCase();

    // Ensure user exists
    await pool.query(
      `INSERT INTO users (wallet_address) VALUES ($1)
       ON CONFLICT (wallet_address) DO NOTHING`,
      [normalizedWallet]
    );

    // Link Telegram account
    await linkTelegramAccount(normalizedWallet, telegramUserId, telegramUsername);

    const token = issueJwt(normalizedWallet);
    res.json({
      success: true,
      token,
      walletAddress: normalizedWallet,
      telegramUserId,
      telegramUsername,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/telegram/widget
 * Verifies Telegram Login Widget HMAC-SHA256 signature and binds Telegram ID to verified EVM wallet
 */
router.post("/telegram/widget", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress, signature, message, telegramData } = req.body as {
      walletAddress?: `0x${string}`;
      signature?: `0x${string}`;
      message?: string;
      telegramData?: Record<string, any>;
    };

    if (!walletAddress || !signature || !message || !telegramData || !telegramData.id) {
      res.status(400).json({
        error: "walletAddress, signature, message, and telegramData with id are required",
      });
      return;
    }

    // 1. Verify EVM Wallet Signature
    const isValidWallet = await verifyMessage({
      address: walletAddress,
      message,
      signature,
    }).catch(() => false);

    if (!isValidWallet) {
      res.status(401).json({ error: "Wallet signature verification failed" });
      return;
    }

    // 2. Verify Telegram Widget HMAC Signature if bot token set
    if (TELEGRAM_BOT_TOKEN) {
      const isValidTg = verifyTelegramWidgetAuth(telegramData, TELEGRAM_BOT_TOKEN);
      if (!isValidTg) {
        res.status(401).json({ error: "Telegram widget signature verification failed" });
        return;
      }
    }

    const normalizedWallet = walletAddress.toLowerCase();
    const telegramUserId = String(telegramData.id);
    const telegramUsername = telegramData.username || "";

    await pool.query(
      `INSERT INTO users (wallet_address) VALUES ($1)
       ON CONFLICT (wallet_address) DO NOTHING`,
      [normalizedWallet]
    );

    await linkTelegramAccount(normalizedWallet, telegramUserId, telegramUsername);

    const token = issueJwt(normalizedWallet);
    res.json({
      success: true,
      token,
      walletAddress: normalizedWallet,
      telegramUserId,
      telegramUsername,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
