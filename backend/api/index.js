"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/serverless.ts
var serverless_exports = {};
__export(serverless_exports, {
  default: () => serverless_default
});
module.exports = __toCommonJS(serverless_exports);

// src/app.ts
var import_express7 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));

// src/routes/health.ts
var import_express = require("express");
var router = (0, import_express.Router)();
router.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    version: "1.0.0",
    service: "lattice-backend"
  });
});
var health_default = router;

// src/routes/auth.ts
var import_express2 = require("express");
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"));
var import_viem = require("viem");
var import_crypto3 = require("crypto");

// src/db/index.ts
var import_pg = require("pg");
var connectionString = process.env.DATABASE_URL;
var isRemoteDb = connectionString?.includes("supabase") || connectionString?.includes(".com") || process.env.NODE_ENV === "production";
var pool = new import_pg.Pool({
  connectionString: connectionString || "postgres://postgres:postgres@localhost:5432/lattice",
  connectionTimeoutMillis: 1e4,
  idleTimeoutMillis: 3e4,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false
});

// src/services/auth/accountBindingService.ts
async function queryWithTimeout(text, params, ms = 2500) {
  return Promise.race([
    pool.query(text, params),
    new Promise(
      (_, reject) => setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms)
    )
  ]);
}
async function getLinkedXAccountByWallet(walletAddress) {
  try {
    const { rows } = await queryWithTimeout(
      "SELECT wallet_address, x_user_id, x_handle FROM x_accounts WHERE LOWER(wallet_address) = LOWER($1)",
      [walletAddress]
    );
    if (rows.length === 0) return null;
    return {
      walletAddress: rows[0].wallet_address,
      xUserId: rows[0].x_user_id,
      xHandle: rows[0].x_handle
    };
  } catch (err) {
    console.error("[db-auth] getLinkedXAccountByWallet error:", err.message);
    return null;
  }
}
async function linkXAccount(walletAddress, xUserId, xHandle) {
  const normalizedWallet = walletAddress.toLowerCase();
  const normalizedHandle = xHandle.replace(/^@/, "").toLowerCase();
  await pool.query(
    `INSERT INTO x_accounts (wallet_address, x_user_id, x_handle)
     VALUES ($1, $2, $3)
     ON CONFLICT (wallet_address) DO UPDATE 
     SET x_user_id = EXCLUDED.x_user_id, x_handle = EXCLUDED.x_handle`,
    [normalizedWallet, xUserId, normalizedHandle]
  );
}
async function getLinkedTelegramAccountByWallet(walletAddress) {
  try {
    const { rows } = await queryWithTimeout(
      "SELECT wallet_address, telegram_user_id, telegram_username FROM telegram_accounts WHERE LOWER(wallet_address) = LOWER($1)",
      [walletAddress]
    );
    if (rows.length === 0) return null;
    return {
      walletAddress: rows[0].wallet_address,
      telegramUserId: rows[0].telegram_user_id,
      telegramUsername: rows[0].telegram_username
    };
  } catch (err) {
    return null;
  }
}
async function getWalletByTelegramUserId(telegramUserId) {
  try {
    const { rows } = await queryWithTimeout(
      "SELECT wallet_address FROM telegram_accounts WHERE telegram_user_id = $1",
      [telegramUserId]
    );
    return rows.length === 0 ? null : rows[0].wallet_address;
  } catch (err) {
    return null;
  }
}
async function linkTelegramAccount(walletAddress, telegramUserId, telegramUsername) {
  const normalizedWallet = walletAddress.toLowerCase();
  await pool.query(
    `INSERT INTO telegram_accounts (wallet_address, telegram_user_id, telegram_username)
     VALUES ($1, $2, $3)
     ON CONFLICT (wallet_address) DO UPDATE 
     SET telegram_user_id = EXCLUDED.telegram_user_id, telegram_username = EXCLUDED.telegram_username`,
    [normalizedWallet, telegramUserId, telegramUsername || null]
  );
}

// src/services/auth/oauth.ts
var import_crypto = require("crypto");
function generatePkcePair() {
  const codeVerifier = (0, import_crypto.randomBytes)(32).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const codeChallenge = (0, import_crypto.createHash)("sha256").update(codeVerifier).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return { codeVerifier, codeChallenge };
}
function buildXAuthorizeUrl(params) {
  const scope = params.scope || "users.read tweet.read offline.access";
  const url = new URL("https://x.com/i/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}
async function exchangeCodeForXToken(params) {
  const credentials = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    code: params.code,
    grant_type: "authorization_code",
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier
  });
  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`
    },
    body: body.toString()
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code for X token: ${errorText}`);
  }
  return response.json();
}
async function getAuthenticatedXUser(accessToken) {
  const response = await fetch("https://api.twitter.com/2/users/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch X user profile: ${errorText}`);
  }
  const json = await response.json();
  return {
    id: json.data.id,
    username: json.data.username,
    name: json.data.name
  };
}
async function saveXBotTokens(accessToken, refreshToken) {
  try {
    await pool.query(
      `INSERT INTO x_bot_tokens (id, access_token, refresh_token, updated_at)
       VALUES ('primary', $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE
       SET access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           updated_at = NOW()`,
      [accessToken, refreshToken]
    );
  } catch (err) {
    console.warn("[oauth] Failed to save x_bot_tokens to DB:", err);
  }
}

// src/services/auth/pendingAuthState.ts
async function storePendingAuthState(state, data) {
  await pool.query(
    `INSERT INTO pending_auth_states (state, wallet_address, platform, code_verifier)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (state) DO UPDATE 
     SET wallet_address = EXCLUDED.wallet_address, code_verifier = EXCLUDED.code_verifier`,
    [state, data.walletAddress.toLowerCase(), data.platform, data.codeVerifier]
  );
}
async function consumePendingAuthState(state) {
  const { rows } = await pool.query(
    `DELETE FROM pending_auth_states 
     WHERE state = $1 AND expires_at > CURRENT_TIMESTAMP
     RETURNING wallet_address, platform, code_verifier`,
    [state]
  );
  if (rows.length === 0) return null;
  return {
    walletAddress: rows[0].wallet_address,
    platform: rows[0].platform,
    codeVerifier: rows[0].code_verifier
  };
}

// src/services/auth/telegramAuth.ts
var import_crypto2 = require("crypto");
function verifyTelegramWidgetAuth(data, botToken) {
  if (!data || !data.hash || !botToken) return false;
  const { hash, ...rest } = data;
  const dataCheckString = Object.keys(rest).filter((key) => rest[key] !== void 0 && rest[key] !== null).sort().map((key) => `${key}=${rest[key]}`).join("\n");
  const secretKey = (0, import_crypto2.createHash)("sha256").update(botToken).digest();
  const calculatedHash = (0, import_crypto2.createHmac)("sha256", secretKey).update(dataCheckString).digest("hex");
  return calculatedHash === hash;
}

// src/middleware/authMiddleware.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var JWT_SECRET = process.env.JWT_SECRET || "lattice_jwt_secret_key_2026";
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing or invalid token format" });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = import_jsonwebtoken.default.verify(token, JWT_SECRET);
    req.user = { walletAddress: payload.walletAddress.toLowerCase() };
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }
}

// src/routes/auth.ts
var router2 = (0, import_express2.Router)();
var JWT_SECRET2 = process.env.JWT_SECRET || "lattice_jwt_secret_key_2026";
var TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
var FRONTEND_URL = process.env.FRONTEND_URL || "https://latticehood.app";
var X_CLIENT_ID = process.env.X_CLIENT_ID || "";
var X_CLIENT_SECRET = process.env.X_CLIENT_SECRET || "";
var X_OAUTH_REDIRECT_URI = process.env.X_OAUTH_REDIRECT_URI || "https://api.latticehood.app/auth/x/callback";
function issueJwt(walletAddress) {
  return import_jsonwebtoken2.default.sign({ walletAddress: walletAddress.toLowerCase() }, JWT_SECRET2, {
    expiresIn: "7d"
  });
}
async function createXAuthorizeUrl(normalizedWallet) {
  const state = (0, import_crypto3.randomBytes)(16).toString("hex");
  const { codeVerifier, codeChallenge } = generatePkcePair();
  await storePendingAuthState(state, {
    walletAddress: normalizedWallet,
    platform: "X",
    codeVerifier
  });
  return buildXAuthorizeUrl({
    state,
    codeChallenge,
    clientId: X_CLIENT_ID,
    redirectUri: X_OAUTH_REDIRECT_URI
  });
}
router2.post("/signin", async (req, res, next) => {
  try {
    const { walletAddress, signature, message } = req.body;
    if (!walletAddress || !signature || !message) {
      res.status(400).json({ error: "walletAddress, signature, and message are required" });
      return;
    }
    const isValid = await (0, import_viem.verifyMessage)({
      address: walletAddress,
      message,
      signature
    }).catch(() => false);
    if (!isValid) {
      res.status(401).json({ error: "Signature verification failed" });
      return;
    }
    const normalizedWallet = walletAddress.toLowerCase();
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
        telegramUsername: linkedTelegram?.telegramUsername
      });
      return;
    }
    const authorizeUrl = await createXAuthorizeUrl(normalizedWallet);
    res.json({
      needsXLink: true,
      authorizeUrl
    });
  } catch (err) {
    next(err);
  }
});
router2.get("/me", requireAuth, async (req, res, next) => {
  try {
    const walletAddress = req.user.walletAddress;
    const linkedX = await getLinkedXAccountByWallet(walletAddress);
    const linkedTelegram = await getLinkedTelegramAccountByWallet(walletAddress);
    res.json({
      walletAddress,
      xLinked: !!linkedX,
      xHandle: linkedX?.xHandle,
      telegramLinked: !!linkedTelegram,
      telegramUsername: linkedTelegram?.telegramUsername
    });
  } catch (err) {
    next(err);
  }
});
router2.post("/x/authorize", async (req, res, next) => {
  try {
    const { walletAddress, signature, message } = req.body;
    if (!walletAddress || !signature || !message) {
      res.status(400).json({ error: "walletAddress, signature, and message are required" });
      return;
    }
    const isValid = await (0, import_viem.verifyMessage)({
      address: walletAddress,
      message,
      signature
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
        xHandle: linkedX.xHandle
      });
      return;
    }
    const authorizeUrl = await createXAuthorizeUrl(normalizedWallet);
    res.json({ authorizeUrl });
  } catch (err) {
    next(err);
  }
});
router2.get("/x/callback", async (req, res, next) => {
  try {
    const { code, state, error: xError } = req.query;
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
      redirectUri: X_OAUTH_REDIRECT_URI
    });
    const xUser = await getAuthenticatedXUser(tokenResp.access_token);
    if (tokenResp.access_token && tokenResp.refresh_token) {
      const lower = xUser.username.toLowerCase();
      if (lower.includes("bot") || lower.includes("lattice")) {
        await saveXBotTokens(tokenResp.access_token, tokenResp.refresh_token);
        console.log(`[auth] Saved X Bot tokens for @${xUser.username} to DB`);
      }
    }
    await linkXAccount(pending.walletAddress, xUser.id, xUser.username);
    const token = issueJwt(pending.walletAddress);
    res.redirect(`${FRONTEND_URL}/auth/callback#token=${token}`);
  } catch (err) {
    next(err);
  }
});
router2.post("/telegram/bind", async (req, res, next) => {
  try {
    const { walletAddress, signature, message, telegramUserId, telegramUsername } = req.body;
    if (!walletAddress || !signature || !message || !telegramUserId) {
      res.status(400).json({
        error: "walletAddress, signature, message, and telegramUserId are required"
      });
      return;
    }
    const isValid = await (0, import_viem.verifyMessage)({
      address: walletAddress,
      message,
      signature
    }).catch(() => false);
    if (!isValid) {
      res.status(401).json({ error: "Signature verification failed" });
      return;
    }
    const normalizedWallet = walletAddress.toLowerCase();
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
      telegramUsername
    });
  } catch (err) {
    next(err);
  }
});
router2.post("/telegram/widget", async (req, res, next) => {
  try {
    const { walletAddress, signature, message, telegramData } = req.body;
    if (!walletAddress || !signature || !message || !telegramData || !telegramData.id) {
      res.status(400).json({
        error: "walletAddress, signature, message, and telegramData with id are required"
      });
      return;
    }
    const isValidWallet = await (0, import_viem.verifyMessage)({
      address: walletAddress,
      message,
      signature
    }).catch(() => false);
    if (!isValidWallet) {
      res.status(401).json({ error: "Wallet signature verification failed" });
      return;
    }
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
      telegramUsername
    });
  } catch (err) {
    next(err);
  }
});
var auth_default = router2;

// src/routes/audit.ts
var import_express3 = require("express");

// src/services/codex.ts
var import_sdk = require("@codex-data/sdk");

// src/services/dexscreener.ts
var EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
var CACHE_TTL_MS = 12e4;
var tokenCache = /* @__PURE__ */ new Map();
function isValidEvmAddress(address) {
  return EVM_ADDRESS_REGEX.test(address.trim());
}
async function fetchDexScreenerTokenData(address) {
  const cleanAddress = address.trim();
  if (!isValidEvmAddress(cleanAddress)) {
    throw new Error("Invalid EVM contract address. Lattice only supports Robinhood EVM tokens.");
  }
  const cached = tokenCache.get(cleanAddress.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${cleanAddress}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json"
    }
  });
  if (response.status === 429) {
    throw new Error("You've been rate limited. Try again in a few moments.");
  }
  if (!response.ok) {
    throw new Error(`DexScreener API error (${response.status}): Unable to fetch token data.`);
  }
  const data = await response.json();
  if (!data || !data.pairs || data.pairs.length === 0) {
    tokenCache.set(cleanAddress.toLowerCase(), { timestamp: Date.now(), data: null });
    return null;
  }
  const bestPair = data.pairs.sort(
    (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
  )[0];
  const socialLinks = bestPair.info?.socials || [];
  const websiteLinks = bestPair.info?.websites || [];
  const twitterObj = socialLinks.find((s) => s.type === "twitter" || s.type === "x");
  const telegramObj = socialLinks.find((s) => s.type === "telegram");
  const result = {
    address: cleanAddress,
    name: bestPair.baseToken?.name || "Unknown Token",
    symbol: bestPair.baseToken?.symbol || "UNKNOWN",
    priceUsd: parseFloat(bestPair.priceUsd || "0") || 0,
    priceNative: bestPair.priceNative || "0",
    marketCap: Number(bestPair.marketCap || bestPair.fdv || 0) || 0,
    fdv: Number(bestPair.fdv || 0) || 0,
    liquidityUsd: Number(bestPair.liquidity?.usd || 0) || 0,
    volume24h: Number(bestPair.volume?.h24 || 0) || 0,
    priceChange24h: Number(bestPair.priceChange?.h24 || 0) || 0,
    buys24h: Number(bestPair.txns?.h24?.buys || 0) || 0,
    sells24h: Number(bestPair.txns?.h24?.sells || 0) || 0,
    dexId: bestPair.dexId || "uniswap",
    pairAddress: bestPair.pairAddress || "",
    pairCreatedAt: bestPair.pairCreatedAt,
    websites: websiteLinks.map((w) => w.url),
    twitter: twitterObj?.url,
    telegram: telegramObj?.url,
    dataSource: "dexscreener"
  };
  tokenCache.set(cleanAddress.toLowerCase(), { timestamp: Date.now(), data: result });
  return result;
}

// src/services/codex.ts
var CODEX_IO_API_KEY = process.env.CODEX_IO_API_KEY || process.env.CODEX_API_KEY || "";
var codex = CODEX_IO_API_KEY ? new import_sdk.Codex(CODEX_IO_API_KEY) : null;
async function fetchTokenAuditData(address) {
  const cleanAddress = address.trim();
  if (!isValidEvmAddress(cleanAddress)) {
    throw new Error("Invalid EVM contract address. Lattice currently supports Robinhood EVM tokens.");
  }
  const normalizedAddress = cleanAddress.toLowerCase();
  if (codex) {
    try {
      const res = await codex.queries.filterTokens({
        tokens: [`${normalizedAddress}:4663`]
      });
      const result = res?.filterTokens?.results?.[0];
      if (result && result.token) {
        const token = result.token;
        const priceUsd = Number(result.priceUSD) || 0;
        const totalSupply = Number(token.info?.totalSupply || token.info?.circulatingSupply) || 1e9;
        const marketCap = Number(result.marketCap) || priceUsd * totalSupply || 0;
        const declaredTotalSupply = Number(token.info?.totalSupply);
        const fdv = Number.isFinite(declaredTotalSupply) && declaredTotalSupply > 0 && priceUsd > 0 ? priceUsd * declaredTotalSupply : marketCap;
        const liquidityUsd = Number(result.liquidity) || 0;
        const volume24h = Number(result.volume24) || 0;
        const rawChange = Number(result.change24) || 0;
        const priceChange24h = rawChange * 100;
        const buys24h = Number(result.buyCount24) || 0;
        const sells24h = Number(result.sellCount24) || 0;
        const dexId = token.exchanges?.[0]?.name?.toLowerCase() || "uniswap";
        const pairAddress = token.exchanges?.[0]?.address || normalizedAddress;
        const website = token.socialLinks?.website;
        const twitter = token.socialLinks?.twitter;
        const telegram = token.socialLinks?.telegram;
        const websiteList = [];
        if (website) websiteList.push(website);
        const rawToken = token;
        const rawResult = result;
        const top10HoldersPct = Number(rawToken.top10HoldersPercent || rawResult.top10HoldersPercent) || void 0;
        const holdersCount = Number(rawResult.holders) || void 0;
        const athPrice = Number(rawToken.extrema?.athPrice) || void 0;
        const athFdv = Number(rawToken.extrema?.athFdv || rawToken.extrema?.athCircMc) || void 0;
        const atlPrice = Number(rawToken.extrema?.atlPrice) || void 0;
        const creatorAddress = rawToken.creatorAddress || rawToken.creator?.address || void 0;
        const devHoldingsPct = Number(rawToken.creatorHoldingsPercent ?? rawToken.creatorHoldingsPct ?? rawToken.creatorBalancePercent ?? 0);
        const devBuys = Number(rawToken.creatorBuys ?? rawToken.creatorTxns?.buys ?? 0);
        const devSells = Number(rawToken.creatorSells ?? rawToken.creatorTxns?.sells ?? 0);
        return {
          address: normalizedAddress,
          name: token.name || token.info?.name || "Unknown Token",
          symbol: token.symbol || token.info?.symbol || "UNKNOWN",
          priceUsd,
          priceNative: priceUsd > 0 ? `$${priceUsd.toFixed(6)}` : "0",
          marketCap,
          fdv,
          liquidityUsd,
          volume24h,
          priceChange24h,
          buys24h,
          sells24h,
          dexId,
          pairAddress,
          websites: websiteList,
          twitter: twitter || void 0,
          telegram: telegram || void 0,
          top10HoldersPct,
          holdersCount,
          athPrice,
          athFdv,
          atlPrice,
          creatorAddress,
          devHoldingsPct,
          devBuys,
          devSells,
          dataSource: "codex.io"
        };
      }
    } catch (err) {
      console.warn("[codex-engine] Codex API query failed, falling back to DexScreener:", err);
    }
  }
  return fetchDexScreenerTokenData(cleanAddress);
}

// src/services/groq.ts
function parseTradeCommand(text) {
  const lower = text.toLowerCase().trim();
  const match = lower.match(/(buy|sell|trade|swap)\s+([\d\.]+)\s+([a-zA-Z0-9xX]+)(?:\s+(?:to|for|of|with)\s+([a-zA-Z0-9xX]+))?/i);
  if (!match) return null;
  const keyword = match[1].toUpperCase();
  const amountIn = match[2];
  const normalizeToken = (t) => t.toLowerCase().startsWith("0x") ? t.toLowerCase() : t.toUpperCase();
  const firstToken = normalizeToken(match[3]);
  const secondToken = match[4] ? normalizeToken(match[4]) : void 0;
  let side = keyword === "SELL" ? "SELL" : "BUY";
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
    side
  };
}
var GROQ_API_KEY = process.env.GROQ_API_KEY || "";
var GROQ_MODEL = "llama-3.3-70b-versatile";
function extractEvmAddress(text) {
  const match = text.match(/0x[a-fA-F0-9]{40}/);
  return match ? match[0] : null;
}
function parseRequestedMetricsFromText(text) {
  const lower = text.toLowerCase();
  const metrics = [];
  const isDevQuery = lower.includes("dev") || lower.includes("creator") || lower.includes("deployer");
  if (isDevQuery) {
    metrics.push("CREATOR");
  }
  if (lower.includes("price") || lower.includes("cost") || lower.includes("how much") && !isDevQuery) {
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
async function parseIntentWithGroq(userMessage) {
  const directAddress = extractEvmAddress(userMessage);
  const normalizedText = userMessage.replace(/@\w+/g, "").trim().toLowerCase();
  if (normalizedText === "/help" || normalizedText === "help" || normalizedText === "/start" || normalizedText === "start" || normalizedText === "/commands" || normalizedText === "commands" || /^(?:help|commands|\/help|\/commands)(?:\s|$)/i.test(normalizedText)) {
    return { action: "HELP", tokenAddress: null, requestedMetrics: [], rawQuery: userMessage };
  }
  const tradeDetails = parseTradeCommand(userMessage);
  if (tradeDetails) {
    return {
      action: "TRADE",
      tokenAddress: directAddress,
      requestedMetrics: [],
      tradeDetails,
      rawQuery: userMessage
    };
  }
  const nonEvmMatch = userMessage.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  if (nonEvmMatch && !directAddress) {
    return { action: "INVALID_CHAIN", tokenAddress: null, requestedMetrics: [], rawQuery: userMessage };
  }
  const detectedMetrics = parseRequestedMetricsFromText(userMessage);
  const isSpecificQuestion = detectedMetrics.length > 0 && !detectedMetrics.includes("FULL_AUDIT");
  if (!GROQ_API_KEY) {
    return {
      action: directAddress ? isSpecificQuestion ? "SPECIFIC_METRICS" : "AUDIT" : "UNKNOWN",
      tokenAddress: directAddress,
      requestedMetrics: detectedMetrics,
      rawQuery: userMessage
    };
  }
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
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
- If the user provides a Solana or non-EVM address, set action to "INVALID_CHAIN".`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.1
      })
    });
    if (!response.ok) {
      return {
        action: directAddress ? isSpecificQuestion ? "SPECIFIC_METRICS" : "AUDIT" : "UNKNOWN",
        tokenAddress: directAddress,
        requestedMetrics: detectedMetrics,
        rawQuery: userMessage
      };
    }
    const json = await response.json();
    const parsed = JSON.parse(json.choices[0].message.content);
    const metricsArr = Array.isArray(parsed.requestedMetrics) && parsed.requestedMetrics.length > 0 ? parsed.requestedMetrics : detectedMetrics;
    const action = parsed.action || (directAddress ? metricsArr.includes("FULL_AUDIT") ? "AUDIT" : "SPECIFIC_METRICS" : "UNKNOWN");
    return {
      action,
      tokenAddress: parsed.tokenAddress || directAddress,
      requestedMetrics: metricsArr,
      rawQuery: userMessage
    };
  } catch (err) {
    console.warn("[groq] Intent parsing warning, falling back to heuristics:", err);
    return {
      action: directAddress ? isSpecificQuestion ? "SPECIFIC_METRICS" : "AUDIT" : "UNKNOWN",
      tokenAddress: directAddress,
      requestedMetrics: detectedMetrics,
      rawQuery: userMessage
    };
  }
}

// src/templates/cardRenderer.ts
function formatUsd(num) {
  const val = Number(num) || 0;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
  return `$${val.toFixed(4)}`;
}
function formatPrice(num) {
  const val = Number(num) || 0;
  if (val === 0) return "$0.00";
  if (val < 1e-4) return `$${val.toExponential(4)}`;
  return `$${val.toFixed(6)}`;
}
function reportUrl(address) {
  return `https://latticehood.app/app?token=${address.toLowerCase()}`;
}
function renderTelegramAuditCard(metrics) {
  const priceChange = Number(metrics.priceChange24h) || 0;
  const changeStr = `${priceChange >= 0 ? "\u{1F4C8} +" : "\u{1F4C9} "}${priceChange.toFixed(1)}%`;
  const lines = [
    `\u2022 <b>Price</b> <code>${formatPrice(metrics.priceUsd)}</code> (${changeStr})`,
    `\u2022 <b>MCap</b> <code>${formatUsd(metrics.marketCap)}</code> \xB7 <b>LP</b> <code>${formatUsd(metrics.liquidityUsd)}</code>`,
    `\u2022 <b>Vol 24h</b> <code>${formatUsd(metrics.volume24h)}</code> \xB7 \u{1F7E2}${metrics.buys24h || 0} / \u{1F534}${metrics.sells24h || 0}`
  ];
  if (metrics.holdersCount || metrics.top10HoldersPct) {
    const holders = metrics.holdersCount ? `<code>${metrics.holdersCount.toLocaleString()}</code>` : "\u2014";
    const top10 = metrics.top10HoldersPct ? ` (top 10: ${metrics.top10HoldersPct.toFixed(1)}%)` : "";
    lines.push(`\u2022 <b>Holders</b> ${holders}${top10}`);
  }
  if (metrics.creatorAddress) {
    const hold = metrics.devHoldingsPct !== void 0 ? `${metrics.devHoldingsPct.toFixed(1)}%` : "\u2014";
    lines.push(`\u2022 <b>Dev</b> ${hold} held \xB7 \u{1F7E2}${metrics.devBuys || 0} / \u{1F534}${metrics.devSells || 0}`);
  }
  return `<b>\u{1F52E} $${metrics.symbol}</b> \u2014 ${metrics.name}

${lines.join("\n")}

<a href="${reportUrl(metrics.address)}">Full report \u2192</a>
<i>Market data only. Not financial advice.</i>`;
}
function renderTwitterAuditReply(metrics) {
  const priceChange = Number(metrics.priceChange24h) || 0;
  const changeStr = `${priceChange >= 0 ? "\u{1F4C8}+" : "\u{1F4C9}"}${priceChange.toFixed(1)}%`;
  const head = `\u{1F52E} $${metrics.symbol} \u2014 Lattice`;
  const core = [
    `MCap ${formatUsd(metrics.marketCap)} \xB7 LP ${formatUsd(metrics.liquidityUsd)}`,
    `24h ${formatUsd(metrics.volume24h)} (${changeStr}) \xB7 \u{1F7E2}${metrics.buys24h || 0}/\u{1F534}${metrics.sells24h || 0}`
  ];
  const optional = [];
  if (metrics.top10HoldersPct) optional.push(`Top10 ${metrics.top10HoldersPct.toFixed(1)}%`);
  if (metrics.creatorAddress && metrics.devHoldingsPct !== void 0) {
    optional.push(`Dev ${metrics.devHoldingsPct.toFixed(1)}%`);
  }
  const tail = `
${reportUrl(metrics.address)}`;
  let body = `${head}
${core.join("\n")}`;
  if (optional.length && `${body}
${optional.join(" \xB7 ")}${tail}`.length <= 280) {
    body += `
${optional.join(" \xB7 ")}`;
  }
  return `${body}${tail}`;
}
function renderSpecificMetricsCard(metrics, requestedMetrics, platform) {
  const isTelegram = platform === "TELEGRAM";
  const lines = [];
  const metricsToRender = requestedMetrics.includes("FULL_AUDIT") || requestedMetrics.length === 0 ? ["PRICE", "MARKET_CAP", "LIQUIDITY", "TOP_HOLDERS"] : requestedMetrics;
  for (const m of metricsToRender) {
    switch (m) {
      case "PRICE":
        lines.push(
          isTelegram ? `\u2022 <b>Price:</b> <code>${formatPrice(metrics.priceUsd)}</code>` : `\u2022 Price: ${formatPrice(metrics.priceUsd)}`
        );
        break;
      case "MARKET_CAP":
        lines.push(
          isTelegram ? `\u2022 <b>Market Cap:</b> <code>${formatUsd(metrics.marketCap)}</code>` : `\u2022 MCap: ${formatUsd(metrics.marketCap)}`
        );
        break;
      case "FDV":
        lines.push(
          isTelegram ? `\u2022 <b>FDV:</b> <code>${formatUsd(metrics.fdv || metrics.marketCap)}</code>` : `\u2022 FDV: ${formatUsd(metrics.fdv || metrics.marketCap)}`
        );
        break;
      case "LIQUIDITY":
        lines.push(
          isTelegram ? `\u2022 <b>Liquidity Pool:</b> <code>${formatUsd(metrics.liquidityUsd)}</code>` : `\u2022 LP: ${formatUsd(metrics.liquidityUsd)}`
        );
        break;
      case "VOLUME_24H":
        lines.push(
          isTelegram ? `\u2022 <b>24h Volume:</b> <code>${formatUsd(metrics.volume24h)}</code>` : `\u2022 24h Vol: ${formatUsd(metrics.volume24h)}`
        );
        break;
      case "PRICE_CHANGE_24H":
        {
          const change = Number(metrics.priceChange24h) || 0;
          const icon = change >= 0 ? "\u{1F4C8}" : "\u{1F4C9}";
          lines.push(
            isTelegram ? `\u2022 <b>24h Change:</b> <code>${icon} ${change >= 0 ? "+" : ""}${change.toFixed(2)}%</code>` : `\u2022 24h Change: ${icon}${change >= 0 ? "+" : ""}${change.toFixed(1)}%`
          );
        }
        break;
      case "TRANSACTIONS_24H":
        lines.push(
          isTelegram ? `\u2022 <b>24h Txns:</b> \u{1F7E2} <code>${metrics.buys24h || 0} Buys</code> | \u{1F534} <code>${metrics.sells24h || 0} Sells</code>` : `\u2022 24h Tx: \u{1F7E2}${metrics.buys24h || 0} / \u{1F534}${metrics.sells24h || 0}`
        );
        break;
      case "TOP_HOLDERS":
        if (metrics.holdersCount) {
          lines.push(
            isTelegram ? `\u2022 <b>Holders:</b> <code>${metrics.holdersCount.toLocaleString()}</code>${metrics.top10HoldersPct ? ` (Top 10: ${metrics.top10HoldersPct.toFixed(2)}%)` : ""}` : `\u2022 Holders: ${metrics.holdersCount.toLocaleString()}${metrics.top10HoldersPct ? ` (Top 10: ${metrics.top10HoldersPct.toFixed(1)}%)` : ""}`
          );
        } else {
          lines.push(
            isTelegram ? `\u2022 <b>Top 10 Holders:</b> <code>${metrics.top10HoldersPct ? `${metrics.top10HoldersPct.toFixed(2)}%` : "N/A"}` : `\u2022 Top 10 Holders: ${metrics.top10HoldersPct ? `${metrics.top10HoldersPct.toFixed(1)}%` : "N/A"}`
          );
        }
        break;
      case "ATH":
        lines.push(
          isTelegram ? `\u2022 <b>ATH Price:</b> <code>${formatPrice(metrics.athPrice || metrics.priceUsd)}</code> (${formatUsd(metrics.athFdv || metrics.marketCap)})` : `\u2022 ATH: ${formatPrice(metrics.athPrice || metrics.priceUsd)} (${formatUsd(metrics.athFdv || metrics.marketCap)})`
        );
        break;
      case "ATL":
        lines.push(
          isTelegram ? `\u2022 <b>ATL Price:</b> <code>${formatPrice(metrics.atlPrice)}</code>` : `\u2022 ATL: ${formatPrice(metrics.atlPrice)}`
        );
        break;
      case "CREATOR":
        {
          const addr = metrics.creatorAddress;
          const fmt = addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Unknown";
          const hold = metrics.devHoldingsPct !== void 0 ? `${metrics.devHoldingsPct.toFixed(1)}%` : "0%";
          const buys = metrics.devBuys || 0;
          const sells = metrics.devSells || 0;
          lines.push(
            isTelegram ? `\u2022 <b>Dev Wallet:</b> <code>${fmt}</code> (Holdings: <code>${hold}</code> | \u{1F7E2} <code>${buys} Buys</code> / \u{1F534} <code>${sells} Sells</code>)` : `\u2022 Dev Wallet: ${fmt} (${hold} hold | \u{1F7E2}${buys}/\u{1F534}${sells})`
          );
        }
        break;
    }
  }
  if (isTelegram) {
    return `<b>\u{1F52E} $${metrics.symbol}</b> \u2014 ${metrics.name}

${lines.join("\n")}

<a href="${reportUrl(metrics.address)}">Full report \u2192</a>`;
  }
  return `\u{1F52E} $${metrics.symbol} \u2014 Lattice
${lines.join("\n")}

${reportUrl(metrics.address)}`;
}
function renderUnlinkedAccountNotice(platform) {
  if (platform === "TELEGRAM") {
    return `\u26A0\uFE0F <b>Account Not Linked</b>

Your Telegram account is not bound to a verified EVM wallet address.
Please connect your wallet and link your account at:
<a href="https://latticehood.app/connect">https://latticehood.app/connect</a> to run token audits.`;
  }
  return `\u26A0\uFE0F Account Not Linked: Please connect your EVM wallet and link your account by clicking the link on my bio to request token audits. #Lattice`;
}
function renderHelpNotice(platform) {
  if (platform === "TELEGRAM") {
    return `\u{1F52E} <b>Lattice On-Chain Bot \u2014 Commands & Guide</b>

Lattice gives you real-time token audits, holder analysis, and non-custodial Uniswap trading on <b>Robinhood EVM Chain</b>.

<b>\u{1F4CA} Token Audits & Metrics</b>
\u2022 <code>0x...</code> or <code>/audit 0x...</code> \u2014 Full token security audit
\u2022 <code>How many holders of 0x...</code> \u2014 Holder count & distribution
\u2022 <code>Dev holdings of 0x...</code> \u2014 Creator wallet holdings & transactions
\u2022 <code>Price / MCap / Volume of 0x...</code> \u2014 Real-time price & liquidity

<b>\u26A1 Non-Custodial Trading</b>
\u2022 <code>Buy 0.05 ETH of 0x...</code> \u2014 Quote & execute buy route
\u2022 <code>Sell 1000 AAPL for USDG</code> \u2014 Quote & execute sell route

<b>\u{1F517} Account & Settings</b>
\u2022 <code>/link</code> \u2014 Bind your Telegram account to your EVM wallet
\u2022 <code>/help</code> \u2014 Show this commands menu

<i>Web Dashboard: <a href="https://latticehood.app">latticehood.app</a></i>`;
  }
  return `\u{1F52E} Lattice Bot Guide:
\u2022 Audits: Mention @latticehoodbot with 0x...
\u2022 Metrics: "@latticehoodbot how many holders of 0x..."
\u2022 Swaps: "@latticehoodbot Buy 0.05 ETH of 0x..."
\u2022 Connect: https://latticehood.app/connect

#Lattice #RobinhoodEVM`;
}
function renderInvalidChainNotice(platform) {
  if (platform === "TELEGRAM") {
    return `\u26A0\uFE0F <b>Invalid Network / Address</b>

Lattice Audit Engine currently operates on <b>Robinhood EVM Chain</b>.
Please supply a valid 40-character 0x EVM contract address.`;
  }
  return `\u26A0\uFE0F Invalid Network: Lattice operates on Robinhood EVM Chain. Please provide a valid 0x EVM address. #Lattice`;
}
function renderTradeQuoteCard(quote, platform, tradeDetails) {
  const side = tradeDetails?.side || (quote.fromToken.symbol === "USDG" || quote.fromToken.symbol === "ETH" ? "BUY" : "SELL");
  const actionText = side === "BUY" ? "Buy Quote" : "Sell Quote";
  const executeUrl = `https://latticehood.app/trade?from=${quote.fromToken.address}&to=${quote.toToken.address}&amount=${quote.amountIn}`;
  const dexVer = quote.dexVersion || "V3";
  if (platform === "TELEGRAM") {
    return `\u26A1 <b>Lattice ${actionText} \u2014 $${quote.toToken.symbol}</b>

\u2022 <b>Pay:</b> <code>${quote.amountIn} ${quote.fromToken.symbol}</code>
\u2022 <b>Receive (Est.):</b> <code>${quote.amountOut} ${quote.toToken.symbol}</code>
\u2022 <b>Price Impact:</b> <code>~${quote.priceImpactPct}%</code>
\u2022 <b>Routing:</b> Uniswap ${dexVer} (${quote.routing})

\u{1F517} <b>Non-Custodial Execution</b>
<a href="${executeUrl}">Review & Execute Trade on Dashboard</a>
<i>Powered by Lattice Engine</i>`;
  }
  return `\u26A1 Lattice ${actionText}: $${quote.toToken.symbol}
Pay: ${quote.amountIn} ${quote.fromToken.symbol}
Est. Receive: ${quote.amountOut} ${quote.toToken.symbol}
Impact: ~${quote.priceImpactPct}% | DEX: Uniswap ${dexVer}

Review & sign in bio link dashboard! #Lattice #Trade`;
}

// src/integrations/virtuals/reportSchema.ts
var REPORT_SCHEMA_VERSION = "1.0.0";
var ROBINHOOD_CHAIN = { name: "Robinhood Chain", chainId: 4663 };
var REPORT_DISCLAIMER = "Read-only on-chain and market heuristics. Not financial advice. Absence of a flag is not a guarantee of safety.";
var ALL_CHECK_IDS = [
  "priceUsd",
  "marketCap",
  "fdv",
  "liquidityUsd",
  "volume24h",
  "priceChange24h",
  "txns24h",
  "holderCount",
  "top10HoldersPct",
  "devHoldingsPct",
  "devTxns",
  "lpLocked",
  "honeypot",
  "ownershipRenounced",
  "mintDisabled",
  "sourceVerified",
  "promisesKept"
];

// src/integrations/virtuals/buildReport.ts
function ok(value, source, fetchedAt) {
  return { available: true, value, source, fetchedAt };
}
function notImplemented(plannedPhase, note) {
  return { available: false, reason: "not_implemented", plannedPhase, note };
}
var NO_DATA = {
  available: false,
  reason: "no_data_from_source"
};
function known(value) {
  if (value === null || value === void 0) return void 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : void 0;
}
var CHAIN_SOURCE = "codex.io";
function onchainOwnership(facts) {
  const kind = facts?.owner?.kind;
  if (kind === "renounced" || kind === "owned") {
    return ok(kind === "renounced", CHAIN_SOURCE, (/* @__PURE__ */ new Date()).toISOString());
  }
  if (kind === "no_owner_function") {
    return {
      available: false,
      reason: "no_data_from_source",
      note: "No owner-style function responded. That is not the same as renounced \u2014 a role-based contract can still have a live admin."
    };
  }
  return NO_DATA;
}
function onchainMint(facts) {
  if (facts?.bytecode === void 0) return NO_DATA;
  return {
    available: false,
    reason: "no_data_from_source",
    note: facts.bytecode.hasMint ? "A mint function is present in the deployed bytecode. Whether it is callable was not determined." : "No mint selector found in the deployed bytecode. That is not proof minting is impossible."
  };
}
function onchainHoneypot(facts) {
  const sell = facts?.sell;
  if (!sell || sell.balanceSlot === void 0) {
    return {
      available: false,
      reason: "no_data_from_source",
      note: "The token's balance storage layout could not be resolved, so no transfer simulation was run."
    };
  }
  const blocked = !sell.transferOk || sell.sellOk === false;
  return ok(blocked, CHAIN_SOURCE, (/* @__PURE__ */ new Date()).toISOString());
}
function buildVerificationReport(metrics, options = {}) {
  const source = options.source ?? metrics.dataSource ?? "dexscreener";
  const at = options.generatedAt ?? (/* @__PURE__ */ new Date()).toISOString();
  const num = (value) => {
    const v = known(value);
    return v === void 0 ? NO_DATA : ok(v, source, at);
  };
  const txns24h = known(metrics.buys24h) === void 0 && known(metrics.sells24h) === void 0 ? NO_DATA : ok({ buys: metrics.buys24h ?? 0, sells: metrics.sells24h ?? 0 }, source, at);
  const hasCreator = typeof metrics.creatorAddress === "string" && metrics.creatorAddress.length > 0;
  const devHoldingsPct = hasCreator ? num(metrics.devHoldingsPct) : NO_DATA;
  const devTxns = hasCreator ? ok({ buys: metrics.devBuys ?? 0, sells: metrics.devSells ?? 0 }, source, at) : NO_DATA;
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    address: metrics.address.toLowerCase(),
    chain: { ...ROBINHOOD_CHAIN },
    generatedAt: at,
    token: { name: metrics.name, symbol: metrics.symbol },
    checks: {
      priceUsd: num(metrics.priceUsd),
      marketCap: num(metrics.marketCap),
      fdv: num(metrics.fdv),
      liquidityUsd: num(metrics.liquidityUsd),
      volume24h: num(metrics.volume24h),
      priceChange24h: num(metrics.priceChange24h),
      txns24h,
      holderCount: num(metrics.holdersCount),
      top10HoldersPct: num(metrics.top10HoldersPct),
      devHoldingsPct,
      devTxns,
      lpLocked: notImplemented("01", "LP lock and burn detection is roadmap phase 01."),
      /**
       * A reverting `owner()` is not a renouncement — it means no owner-style
       * function answered, which a role-based contract with a live admin would
       * also produce. Only an explicit zero address counts as renounced.
       */
      honeypot: onchainHoneypot(options.onchain),
      ownershipRenounced: onchainOwnership(options.onchain),
      mintDisabled: onchainMint(options.onchain),
      sourceVerified: {
        available: false,
        reason: "no_data_from_source",
        note: "Robinhood Chain's explorer exposes no JSON API, so verification status cannot be read."
      },
      promisesKept: {
        available: false,
        reason: "no_declared_baseline",
        plannedPhase: "04",
        note: "No declared tokenomics registered for this token."
      }
    },
    sources: [{ name: source, queriedAt: at }],
    disclaimer: REPORT_DISCLAIMER
  };
}

// src/services/onchain.ts
var import_viem2 = require("viem");
var RPC_URL = process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
var client = (0, import_viem2.createPublicClient)({ transport: (0, import_viem2.http)(RPC_URL) });
var DEAD = "0x000000000000000000000000000000000000dEaD";
var ZERO = "0x0000000000000000000000000000000000000000";
var PROBE = "0x00000000000000000000000000000000c1ade001";
var PROBE_RECIPIENT = "0x00000000000000000000000000000000c1ade002";
var ERC20_ABI = [
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }]
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ type: "address" }, { type: "uint256" }],
    outputs: [{ type: "bool" }]
  }
];
var OWNER_ABI = [
  { name: "owner", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "getOwner", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }
];
async function readSupply(token) {
  try {
    const [totalSupply, decimals] = await Promise.all([
      client.readContract({ address: token, abi: ERC20_ABI, functionName: "totalSupply" }),
      client.readContract({ address: token, abi: ERC20_ABI, functionName: "decimals" })
    ]);
    return { totalSupply, decimals: Number(decimals) };
  } catch {
    return void 0;
  }
}
var V4_STATE_VIEW = process.env.UNISWAP_V4_STATE_VIEW_ADDRESS || "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b";
var STATE_VIEW_ABI = [
  { name: "poolManager", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }
];
var poolManagerCache;
async function getPoolManager() {
  if (poolManagerCache !== void 0) return poolManagerCache ?? void 0;
  try {
    const addr = await client.readContract({
      address: V4_STATE_VIEW,
      abi: STATE_VIEW_ABI,
      functionName: "poolManager"
    });
    poolManagerCache = addr;
    return addr;
  } catch {
    poolManagerCache = null;
    return void 0;
  }
}
async function balanceOf(token, holder) {
  try {
    return await client.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [holder]
    });
  } catch {
    return void 0;
  }
}
async function readFloat(token, pair, creator, liquidityUsd) {
  const supply = await readSupply(token);
  if (!supply || supply.totalSupply === 0n) return void 0;
  const pairAddr = pair && /^0x[a-fA-F0-9]{40}$/.test(pair) && pair.toLowerCase() !== token.toLowerCase() ? pair : void 0;
  const creatorAddr = creator && /^0x[a-fA-F0-9]{40}$/.test(creator) ? creator : void 0;
  const holder = pairAddr ?? await getPoolManager();
  const [pooledRaw, deadRaw, zeroRaw, deployerRaw] = await Promise.all([
    holder ? balanceOf(token, holder) : Promise.resolve(void 0),
    balanceOf(token, DEAD),
    balanceOf(token, ZERO),
    creatorAddr ? balanceOf(token, creatorAddr) : Promise.resolve(void 0)
  ]);
  const total = supply.totalSupply;
  const burned = (deadRaw ?? 0n) + (zeroRaw ?? 0n);
  const pct = (v) => Number(v * 1000000n / total) / 1e4;
  const hasMarketLiquidity = Number.isFinite(liquidityUsd) && liquidityUsd > 0;
  const pooledUnknown = pooledRaw === void 0 || pooledRaw === 0n && hasMarketLiquidity;
  const base = {
    totalSupply: total.toString(),
    pooledUnknown,
    burned: burned.toString(),
    burnedPct: pct(burned),
    deployer: deployerRaw !== void 0 ? deployerRaw.toString() : void 0,
    deployerPctOfSupply: deployerRaw !== void 0 ? pct(deployerRaw) : void 0
  };
  if (pooledUnknown) return base;
  const pooled = pooledRaw;
  const float = total > pooled + burned ? total - pooled - burned : 0n;
  return {
    ...base,
    pooled: pooled.toString(),
    float: float.toString(),
    pooledPct: pct(pooled),
    floatPct: pct(float),
    deployerPctOfFloat: deployerRaw !== void 0 && float > 0n ? Number(deployerRaw * 1000000n / float) / 1e4 : void 0
  };
}
var EIP1967_IMPL = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
var EIP1967_ADMIN = "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
var EIP1822_LOGIC = "0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7";
function slotToAddress(slot) {
  if (!slot || /^0x0*$/.test(slot)) return void 0;
  return `0x${slot.slice(-40)}`;
}
async function detectProxy(token) {
  try {
    const [impl, admin, uups] = await Promise.all([
      client.getStorageAt({ address: token, slot: EIP1967_IMPL }),
      client.getStorageAt({ address: token, slot: EIP1967_ADMIN }),
      client.getStorageAt({ address: token, slot: EIP1822_LOGIC })
    ]);
    const implAddr = slotToAddress(impl ?? "");
    const uupsAddr = slotToAddress(uups ?? "");
    if (implAddr) {
      return {
        isProxy: true,
        standard: "eip1967",
        implementation: implAddr,
        admin: slotToAddress(admin ?? "")
      };
    }
    if (uupsAddr) {
      return { isProxy: true, standard: "eip1822", implementation: uupsAddr };
    }
    return { isProxy: false };
  } catch {
    return void 0;
  }
}
async function readOwner(token) {
  for (const fn of ["owner", "getOwner"]) {
    try {
      const result = await client.readContract({
        address: token,
        abi: OWNER_ABI,
        functionName: fn
      });
      if (!result) continue;
      return result.toLowerCase() === ZERO.toLowerCase() ? { kind: "renounced" } : { kind: "owned", owner: result };
    } catch {
    }
  }
  return { kind: "no_owner_function" };
}
var LEVER_SELECTORS = [
  { selector: "40c10f19", label: "mint(address,uint256)" },
  { selector: "a0712d68", label: "mint(uint256)" },
  { selector: "42966c68", label: "burn(uint256)" },
  { selector: "8456cb59", label: "pause()" },
  { selector: "3f4ba83a", label: "unpause()" },
  { selector: "f9f92be4", label: "blacklist(address)" },
  { selector: "e47d6060", label: "isBlacklisted(address)" },
  { selector: "b4b5ea57", label: "setFee-like" },
  { selector: "8f9a55c0", label: "maxWallet-like" },
  { selector: "7d1db4a5", label: "maxTxAmount-like" }
];
async function scanBytecode(token) {
  try {
    const code = await client.getCode({ address: token });
    if (!code || code === "0x") return void 0;
    const hex = code.toLowerCase();
    const found = LEVER_SELECTORS.filter((l) => hex.includes(l.selector)).map((l) => l.label);
    return {
      sizeBytes: (hex.length - 2) / 2,
      levers: found,
      hasMint: found.some((l) => l.startsWith("mint")),
      hasPause: found.includes("pause()"),
      hasBlacklist: found.some((l) => l.toLowerCase().includes("blacklist"))
    };
  } catch {
    return void 0;
  }
}
var NAMESPACED_BALANCE_SLOTS = [
  // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ERC20")) - 1)) & ~0xff
  BigInt("0x52c63247e1f47db19d5ce0460030c497f067ca4cebf71ba98eeadabe20bace00")
];
async function findBalanceSlot(token, holder) {
  const marker = 12345n * 10n ** 18n;
  const markerHex = `0x${marker.toString(16).padStart(64, "0")}`;
  const candidates = [
    ...Array.from({ length: 40 }, (_, i) => BigInt(i)),
    ...NAMESPACED_BALANCE_SLOTS
  ];
  for (const slot of candidates) {
    const key = (0, import_viem2.keccak256)(
      (0, import_viem2.encodeAbiParameters)([{ type: "address" }, { type: "uint256" }], [holder, slot])
    );
    try {
      const result = await client.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [holder],
        stateOverride: [{ address: token, stateDiff: [{ slot: key, value: markerHex }] }]
      });
      if (result === marker) return slot;
    } catch {
    }
  }
  return void 0;
}
async function simulateSell(token, pair) {
  const supply = await readSupply(token);
  if (!supply) return void 0;
  const slot = await findBalanceSlot(token, PROBE);
  if (slot === void 0) {
    return {
      transferOk: false,
      note: "Balance storage slot could not be located, so no simulation was run."
    };
  }
  const amount = supply.totalSupply / 10000n || 10n ** 18n;
  const key = (0, import_viem2.keccak256)(
    (0, import_viem2.encodeAbiParameters)([{ type: "address" }, { type: "uint256" }], [PROBE, slot])
  );
  const override = [
    {
      address: token,
      stateDiff: [
        { slot: key, value: `0x${(amount * 2n).toString(16).padStart(64, "0")}` }
      ]
    }
  ];
  const recipient = PROBE_RECIPIENT;
  async function tryTransfer(to) {
    try {
      await client.simulateContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to, amount],
        account: PROBE,
        stateOverride: override
      });
      return true;
    } catch {
      return false;
    }
  }
  const transferOk = await tryTransfer(recipient);
  const pairAddr = pair && /^0x[a-fA-F0-9]{40}$/.test(pair) ? pair : void 0;
  const sellOk = pairAddr ? await tryTransfer(pairAddr) : void 0;
  let taxPct;
  if (transferOk) {
    try {
      const received = await client.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [recipient],
        stateOverride: override
      });
      if (received === 0n) taxPct = 0;
    } catch {
      taxPct = void 0;
    }
  }
  return {
    transferOk,
    sellOk,
    taxPct,
    balanceSlot: `0x${slot.toString(16)}`,
    note: pairAddr === void 0 ? "No pair address available, so only a plain transfer was simulated." : void 0
  };
}
async function readOnchain(address, options = {}) {
  const token = address;
  const [float, proxy, owner, bytecode, sell, block] = await Promise.all([
    readFloat(token, options.pair, options.creator, options.liquidityUsd).catch(() => void 0),
    detectProxy(token).catch(() => void 0),
    readOwner(token).catch(() => void 0),
    scanBytecode(token).catch(() => void 0),
    simulateSell(token, options.pair).catch(() => void 0),
    client.getBlockNumber().catch(() => void 0)
  ]);
  return {
    float,
    proxy,
    owner,
    bytecode,
    sell,
    blockNumber: block !== void 0 ? block.toString() : void 0
  };
}

// src/routes/audit.ts
var router3 = (0, import_express3.Router)();
router3.post("/", async (req, res, next) => {
  try {
    const { address, message } = req.body;
    let targetAddress = address;
    let requestedMetrics = ["FULL_AUDIT"];
    let action = "AUDIT";
    if (message) {
      const intent = await parseIntentWithGroq(message);
      if (intent.action === "INVALID_CHAIN") {
        res.status(400).json({
          error: "Invalid chain: Lattice currently only supports Robinhood EVM tokens (0x...)."
        });
        return;
      }
      if (!targetAddress) {
        targetAddress = intent.tokenAddress || void 0;
      }
      requestedMetrics = intent.requestedMetrics || ["FULL_AUDIT"];
      action = intent.action;
    }
    if (!targetAddress || !isValidEvmAddress(targetAddress)) {
      res.status(400).json({
        error: "Valid Robinhood EVM contract address (0x...) is required."
      });
      return;
    }
    const metrics = await fetchTokenAuditData(targetAddress);
    if (!metrics) {
      res.status(444).json({
        error: `No liquidity pool or trading pairs found on DexScreener/Codex for address ${targetAddress}`
      });
      return;
    }
    await pool.query(
      `INSERT INTO token_audits (contract_address, chain, token_name, token_symbol, market_cap, raw_gmgn_response)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        metrics.address,
        "robinhood",
        metrics.name,
        metrics.symbol,
        metrics.marketCap,
        JSON.stringify(metrics)
      ]
    ).catch((err) => console.warn("[db] Log audit error:", err));
    const isSpecific = action === "SPECIFIC_METRICS" && requestedMetrics.length > 0 && !requestedMetrics.includes("FULL_AUDIT");
    const onchain = await readOnchain(metrics.address, {
      pair: metrics.pairAddress,
      creator: metrics.creatorAddress,
      liquidityUsd: metrics.liquidityUsd
    }).catch((err) => {
      console.warn("[onchain] read failed:", err?.message);
      return void 0;
    });
    res.status(200).json({
      success: true,
      chain: "robinhood",
      metrics,
      onchain,
      // Additive: the same versioned report `/api/v1/verify/:address` serves.
      // Existing consumers read `metrics` and `renderedCards` and are unaffected;
      // the dashboard uses this to distinguish "no data" from "check not shipped".
      report: buildVerificationReport(metrics, { onchain }),
      renderedCards: {
        telegramHtml: isSpecific ? renderSpecificMetricsCard(metrics, requestedMetrics, "TELEGRAM") : renderTelegramAuditCard(metrics),
        twitterText: isSpecific ? renderSpecificMetricsCard(metrics, requestedMetrics, "X") : renderTwitterAuditReply(metrics)
      }
    });
  } catch (err) {
    const errMsg = err.message || "Failed to process audit request";
    if (errMsg.toLowerCase().includes("rate limit")) {
      res.status(429).json({ error: "You've been rate limited. Try again in a few moments." });
      return;
    }
    res.status(500).json({ error: errMsg });
  }
});
var audit_default = router3;

// src/routes/telegramWebhook.ts
var import_express4 = require("express");

// src/lib/uniswap.ts
var import_viem6 = require("viem");

// src/lib/rwaTokens.ts
var import_viem3 = require("viem");
var import_viem4 = require("viem");
var RPC_URL2 = process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
var WETH_ADDRESS = process.env.UNISWAP_WETH_ADDRESS || process.env.WETH_ADDRESS || "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";
var USDG_ADDRESS = process.env.ROBINHOOD_USDG_ADDRESS || process.env.USDG_ADDRESS || "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
var USDG = {
  symbol: "USDG",
  address: USDG_ADDRESS,
  decimals: 6
};
var ETH = {
  symbol: "ETH",
  address: WETH_ADDRESS,
  native: true,
  decimals: 18
};
var STOCK_TOKENS = [
  { symbol: "AAPL", address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9", decimals: 18 },
  { symbol: "TSLA", address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", decimals: 18 },
  { symbol: "NVDA", address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", decimals: 18 },
  { symbol: "GOOGL", address: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3", decimals: 18 },
  { symbol: "AMZN", address: "0x12f190a9F9d7D37a250758b26824B97CE941bF54", decimals: 18 },
  { symbol: "MSFT", address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74", decimals: 18 },
  { symbol: "META", address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35", decimals: 18 },
  { symbol: "COIN", address: "0x6330D8C3178a418788dF01a47479c0ce7CCF450b", decimals: 18 },
  { symbol: "SPCX", address: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa", decimals: 18 }
];
var TICKER_ALIASES = {
  SPY: "SPCX",
  SPACEX: "SPCX"
};
function findToken(symbol) {
  const upper = TICKER_ALIASES[symbol.toUpperCase()] ?? symbol.toUpperCase();
  if (upper === USDG.symbol) return USDG;
  if (upper === ETH.symbol) return ETH;
  return STOCK_TOKENS.find((t) => t.symbol === upper);
}
async function resolveToken(input) {
  const known2 = findToken(input);
  if (known2) return known2;
  let trimmed = input.trim();
  if (trimmed.toLowerCase().startsWith("0x")) {
    trimmed = "0x" + trimmed.slice(2).toLowerCase();
  }
  if (!(0, import_viem3.isAddress)(trimmed)) return void 0;
  const address = (0, import_viem3.getAddress)(trimmed);
  const client2 = (0, import_viem4.createPublicClient)({
    transport: (0, import_viem4.http)(RPC_URL2)
  });
  try {
    const [decimals, symbol] = await Promise.all([
      client2.readContract({ address, abi: import_viem3.erc20Abi, functionName: "decimals" }),
      client2.readContract({ address, abi: import_viem3.erc20Abi, functionName: "symbol" }).catch(() => address.slice(0, 8))
    ]);
    if (typeof decimals !== "number") return void 0;
    return { symbol: String(symbol), address, decimals };
  } catch {
    return void 0;
  }
}

// src/lib/uniswapV4.ts
var import_viem5 = require("viem");
var ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
var V4_QUOTER_ADDRESS = process.env.UNISWAP_V4_QUOTER_ADDRESS || "0x8dc178efb8111bb0973dd9d722ebeff267c98f94";
var V4_STATE_VIEW_ADDRESS = process.env.UNISWAP_V4_STATE_VIEW_ADDRESS || "0xf3334192d15450cdd385c8b70e03f9a6bd9e673b";
var V4_FEE_TIERS = [
  { fee: 100, tickSpacing: 1 },
  { fee: 500, tickSpacing: 10 },
  { fee: 3e3, tickSpacing: 60 },
  { fee: 1e4, tickSpacing: 200 }
];
var STATE_VIEW_ABI2 = [
  {
    name: "getLiquidity",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ name: "liquidity", type: "uint128" }]
  }
];
var QUOTER_ABI = [
  {
    name: "quoteExactInputSingle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          {
            name: "poolKey",
            type: "tuple",
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" }
            ]
          },
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "hookData", type: "bytes" }
        ]
      }
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" }
    ]
  }
];
function poolKeyToId(key) {
  return (0, import_viem5.keccak256)(
    (0, import_viem5.encodeAbiParameters)(
      [
        { type: "address" },
        { type: "address" },
        { type: "uint24" },
        { type: "int24" },
        { type: "address" }
      ],
      [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks]
    )
  );
}
function buildPoolKey(tokenA, tokenB, fee, tickSpacing) {
  const [currency0, currency1] = BigInt(tokenA.toLowerCase()) < BigInt(tokenB.toLowerCase()) ? [tokenA, tokenB] : [tokenB, tokenA];
  return {
    poolKey: { currency0, currency1, fee, tickSpacing, hooks: ZERO_ADDRESS },
    zeroForOne: tokenA.toLowerCase() === currency0.toLowerCase()
  };
}
async function quoteV4Direct(client2, tokenIn, tokenOut, amountIn) {
  const candidates = await Promise.all(
    V4_FEE_TIERS.map(async ({ fee, tickSpacing }) => {
      const { poolKey, zeroForOne } = buildPoolKey(tokenIn, tokenOut, fee, tickSpacing);
      try {
        const liquidity = await client2.readContract({
          address: V4_STATE_VIEW_ADDRESS,
          abi: STATE_VIEW_ABI2,
          functionName: "getLiquidity",
          args: [poolKeyToId(poolKey)]
        });
        if (typeof liquidity !== "bigint" || liquidity === 0n) return null;
        const result = await client2.simulateContract({
          address: V4_QUOTER_ADDRESS,
          abi: QUOTER_ABI,
          functionName: "quoteExactInputSingle",
          args: [{ poolKey, zeroForOne, exactAmount: amountIn, hookData: "0x" }]
        });
        const amountOut = result.result[0];
        if (typeof amountOut !== "bigint") return null;
        return { amountOut, poolKey, zeroForOne, fee, tickSpacing };
      } catch {
        return null;
      }
    })
  );
  const usable = candidates.filter((c) => c !== null);
  if (usable.length === 0) return null;
  return usable.reduce((best, c) => c.amountOut > best.amountOut ? c : best, usable[0]);
}

// src/lib/uniswap.ts
var RPC_URL3 = process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
var V3_QUOTER_ADDRESS = process.env.UNISWAP_V3_QUOTER_ADDRESS || "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7";
var V3_SWAP_ROUTER_ADDRESS = process.env.UNISWAP_V3_SWAP_ROUTER_ADDRESS || "0xcaf681a66d020601342297493863e78c959e5cb2";
var UNIVERSAL_ROUTER_ADDRESS = process.env.UNISWAP_UNIVERSAL_ROUTER_ADDRESS || "0x8876789976decbfcbbbe364623c63652db8c0904";
var WETH_ADDRESS2 = ETH.address;
var QUOTER_V2_ABI = [
  {
    name: "quoteExactInputSingle",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" }
        ]
      }
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" }
    ]
  },
  {
    name: "quoteExactInput",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "path", type: "bytes" },
      { name: "amountIn", type: "uint256" }
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96AfterList", type: "uint160[]" },
      { name: "initializedTicksCrossedList", type: "uint32[]" },
      { name: "gasEstimate", type: "uint256" }
    ]
  }
];
function encodeWethPath(tokenIn, feeIn, tokenOut, feeOut) {
  return (0, import_viem6.encodePacked)(
    ["address", "uint24", "address", "uint24", "address"],
    [tokenIn, feeIn, WETH_ADDRESS2, feeOut, tokenOut]
  );
}
var FEE_TIERS = [3e3, 500, 1e4, 100];
async function quoteSwap(fromInput, toInput, amountInStr) {
  const [fromToken, toToken] = await Promise.all([
    resolveToken(fromInput),
    resolveToken(toInput)
  ]);
  if (!fromToken || !toToken) return null;
  const client2 = (0, import_viem6.createPublicClient)({ transport: (0, import_viem6.http)(RPC_URL3) });
  const amountInWei = (0, import_viem6.parseUnits)(amountInStr, fromToken.decimals);
  if (amountInWei <= 0n) return null;
  const candidateQuotes = [];
  try {
    const v4 = await quoteV4Direct(client2, fromToken.address, toToken.address, amountInWei);
    if (v4 && v4.amountOut > 0n) {
      candidateQuotes.push({
        fromToken,
        toToken,
        amountIn: amountInStr,
        amountInWei,
        amountOut: (0, import_viem6.formatUnits)(v4.amountOut, toToken.decimals),
        amountOutWei: v4.amountOut,
        priceImpactPct: 0.15,
        routing: "v4-direct",
        feeTier: v4.fee,
        dexVersion: "V4",
        v4Quote: v4,
        quoterAddress: process.env.UNISWAP_V4_QUOTER_ADDRESS || "0x8dc178efb8111bb0973dd9d722ebeff267c98f94",
        routerAddress: UNIVERSAL_ROUTER_ADDRESS
      });
    }
  } catch (err) {
    console.warn("[uniswap-v4] V4 quoting warning:", err);
  }
  for (const fee of FEE_TIERS) {
    try {
      const res = await client2.simulateContract({
        address: V3_QUOTER_ADDRESS,
        abi: QUOTER_V2_ABI,
        functionName: "quoteExactInputSingle",
        args: [
          {
            tokenIn: fromToken.address,
            tokenOut: toToken.address,
            amountIn: amountInWei,
            fee,
            sqrtPriceLimitX96: 0n
          }
        ]
      });
      const amountOutWei = res.result[0];
      if (amountOutWei > 0n) {
        candidateQuotes.push({
          fromToken,
          toToken,
          amountIn: amountInStr,
          amountInWei,
          amountOut: (0, import_viem6.formatUnits)(amountOutWei, toToken.decimals),
          amountOutWei,
          priceImpactPct: 0.2,
          routing: "v3-direct",
          feeTier: fee,
          dexVersion: "V3",
          quoterAddress: V3_QUOTER_ADDRESS,
          routerAddress: V3_SWAP_ROUTER_ADDRESS
        });
      }
    } catch {
      continue;
    }
  }
  if (fromToken.address.toLowerCase() !== WETH_ADDRESS2.toLowerCase() && toToken.address.toLowerCase() !== WETH_ADDRESS2.toLowerCase()) {
    for (const feeIn of FEE_TIERS) {
      for (const feeOut of FEE_TIERS) {
        try {
          const path = encodeWethPath(fromToken.address, feeIn, toToken.address, feeOut);
          const res = await client2.simulateContract({
            address: V3_QUOTER_ADDRESS,
            abi: QUOTER_V2_ABI,
            functionName: "quoteExactInput",
            args: [path, amountInWei]
          });
          const amountOutWei = res.result[0];
          if (amountOutWei > 0n) {
            candidateQuotes.push({
              fromToken,
              toToken,
              amountIn: amountInStr,
              amountInWei,
              amountOut: (0, import_viem6.formatUnits)(amountOutWei, toToken.decimals),
              amountOutWei,
              priceImpactPct: 0.5,
              routing: "v3-via-weth",
              feeTier: feeIn,
              dexVersion: "V3",
              path,
              quoterAddress: V3_QUOTER_ADDRESS,
              routerAddress: V3_SWAP_ROUTER_ADDRESS
            });
          }
        } catch {
          continue;
        }
      }
    }
  }
  if (candidateQuotes.length > 0) {
    candidateQuotes.sort((a, b) => b.amountOutWei > a.amountOutWei ? 1 : b.amountOutWei < a.amountOutWei ? -1 : 0);
    return candidateQuotes[0];
  }
  try {
    const toMetrics = await fetchTokenAuditData(toToken.address);
    if (toMetrics && toMetrics.priceUsd > 0) {
      let fromUsdPrice = 1;
      if (fromToken.native || fromToken.symbol === "ETH") {
        fromUsdPrice = 2500;
      } else if (fromToken.symbol !== "USDG") {
        const fromMetrics = await fetchTokenAuditData(fromToken.address);
        if (fromMetrics && fromMetrics.priceUsd > 0) {
          fromUsdPrice = fromMetrics.priceUsd;
        }
      }
      const totalUsdIn = Number(amountInStr) * fromUsdPrice;
      const estAmountOutNum = totalUsdIn / toMetrics.priceUsd;
      const estAmountOutStr = estAmountOutNum.toFixed(Math.min(toToken.decimals, 6));
      const amountOutWei = (0, import_viem6.parseUnits)(estAmountOutStr, toToken.decimals);
      return {
        fromToken,
        toToken,
        amountIn: amountInStr,
        amountInWei,
        amountOut: estAmountOutStr,
        amountOutWei,
        priceImpactPct: 0.3,
        routing: "v4-direct",
        feeTier: 3e3,
        dexVersion: "V4",
        quoterAddress: process.env.UNISWAP_V4_QUOTER_ADDRESS || "0x8dc178efb8111bb0973dd9d722ebeff267c98f94",
        routerAddress: UNIVERSAL_ROUTER_ADDRESS
      };
    }
  } catch (err) {
    console.warn("[quote-fallback] DexScreener pricing fallback error:", err);
  }
  return null;
}

// src/bots/telegramBot.ts
var FRONTEND_URL2 = process.env.FRONTEND_URL || "https://latticehood.app";
var BACKEND_URL = process.env.BACKEND_URL || "https://api.latticehood.app";
var TELEGRAM_BOT_TOKEN2 = process.env.TELEGRAM_BOT_TOKEN || "";
async function registerTelegramWebhook(targetWebhookUrl) {
  if (!TELEGRAM_BOT_TOKEN2) {
    console.log("[telegram-bot] TELEGRAM_BOT_TOKEN not set, skipping webhook registration.");
    return { success: false, description: "TELEGRAM_BOT_TOKEN not configured" };
  }
  const webhookUrl = targetWebhookUrl || `${BACKEND_URL}/api/webhook/telegram`;
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN2}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "edited_message"]
      })
    });
    const json = await response.json();
    if (json.ok) {
      console.log(`[telegram-bot] Webhook set successfully to ${webhookUrl}`);
    } else {
      console.warn(`[telegram-bot] Failed to set webhook: ${json.description}`);
    }
    return { success: json.ok, description: json.description || "OK" };
  } catch (err) {
    console.error("[telegram-bot] Webhook registration error:", err);
    return { success: false, description: err.message || "Failed to register webhook" };
  }
}
async function getTelegramWebhookInfo() {
  if (!TELEGRAM_BOT_TOKEN2) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" };
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN2}/getWebhookInfo`);
    return response.json();
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
async function processTelegramMessage(msg) {
  const { userId, username, text } = msg;
  const trimmedText = text.trim();
  const lowerCleaned = trimmedText.replace(/@\w+/g, "").trim().toLowerCase();
  if (lowerCleaned === "/help" || lowerCleaned === "help" || lowerCleaned === "/start" || lowerCleaned === "start" || lowerCleaned === "/commands" || lowerCleaned === "commands") {
    return renderHelpNotice("TELEGRAM");
  }
  if (trimmedText.startsWith("/link") || trimmedText.startsWith("/start link_")) {
    const linkUrl = `${FRONTEND_URL2}/connect?platform=telegram&tg_user_id=${encodeURIComponent(userId)}${username ? `&username=${encodeURIComponent(username)}` : ""}`;
    return `\u{1F517} <b>Lattice Wallet Binding</b>

Click the link below to connect your EVM wallet and bind your Telegram account:
<a href="${linkUrl}">${linkUrl}</a>`;
  }
  const boundWallet = await getWalletByTelegramUserId(userId);
  if (!boundWallet) {
    return renderUnlinkedAccountNotice("TELEGRAM");
  }
  const intent = await parseIntentWithGroq(text);
  if (intent.action === "HELP") {
    return renderHelpNotice("TELEGRAM");
  }
  if (intent.action === "INVALID_CHAIN") {
    return renderInvalidChainNotice("TELEGRAM");
  }
  if (intent.action === "TRADE" && intent.tradeDetails) {
    try {
      const { fromToken, toToken, amountIn } = intent.tradeDetails;
      const quote = await quoteSwap(fromToken, toToken, amountIn);
      if (!quote) {
        return `\u26A0\uFE0F No active Uniswap liquidity route found for <code>${fromToken}</code> \u2192 <code>${toToken}</code>.`;
      }
      return renderTradeQuoteCard(quote, "TELEGRAM", intent.tradeDetails);
    } catch (err) {
      return `\u274C Trade Quote Error: ${err.message || "Failed to generate quote."}`;
    }
  }
  if ((intent.action === "AUDIT" || intent.action === "SPECIFIC_METRICS") && intent.tokenAddress) {
    try {
      const metrics = await fetchTokenAuditData(intent.tokenAddress);
      if (!metrics) {
        return `\u26A0\uFE0F No trading pairs or liquidity found on DexScreener/Codex for address <code>${intent.tokenAddress}</code>.`;
      }
      await pool.query(
        `INSERT INTO token_audits (contract_address, chain, token_name, token_symbol, market_cap, raw_gmgn_response)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          metrics.address,
          "robinhood",
          metrics.name,
          metrics.symbol,
          metrics.marketCap,
          JSON.stringify(metrics)
        ]
      ).catch((err) => console.warn("[db] Failed to log audit:", err));
      if (intent.action === "SPECIFIC_METRICS" && intent.requestedMetrics && intent.requestedMetrics.length > 0 && !intent.requestedMetrics.includes("FULL_AUDIT")) {
        return renderSpecificMetricsCard(metrics, intent.requestedMetrics, "TELEGRAM");
      }
      return renderTelegramAuditCard(metrics);
    } catch (err) {
      return `\u274C Audit Error: ${err.message || "Failed to retrieve token data."}`;
    }
  }
  return renderHelpNotice("TELEGRAM");
}

// src/routes/telegramWebhook.ts
var router4 = (0, import_express4.Router)();
var TELEGRAM_BOT_TOKEN3 = process.env.TELEGRAM_BOT_TOKEN || "";
router4.post("/", async (req, res) => {
  try {
    const update = req.body;
    res.status(200).send("OK");
    if (update && update.message && update.message.text) {
      const msg = update.message;
      const text = msg.text.trim();
      const userId = String(msg.from?.id || "");
      const username = msg.from?.username || "";
      const chatId = msg.chat?.id || userId;
      if (!userId) return;
      if (msg.entities) {
        const customEmoji = msg.entities.find((e) => e.type === "custom_emoji");
        if (customEmoji && customEmoji.custom_emoji_id) {
          console.log(`[telegram-bot] Detected Custom Emoji ID: ${customEmoji.custom_emoji_id}`);
        }
      }
      const replyText = await processTelegramMessage({
        messageId: msg.message_id,
        chatId,
        userId,
        username,
        text
      });
      if (TELEGRAM_BOT_TOKEN3) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN3}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: "HTML",
            disable_web_page_preview: false,
            reply_to_message_id: msg.message_id
          })
        }).catch((err) => console.error("[telegram-bot] Error sending message:", err));
      }
    }
  } catch (err) {
    console.error("[telegram-webhook] Error processing update:", err);
  }
});
router4.post("/setup", async (req, res) => {
  const { url } = req.body || {};
  const result = await registerTelegramWebhook(url);
  res.json(result);
});
router4.get("/info", async (_req, res) => {
  const info = await getTelegramWebhookInfo();
  res.json(info);
});
var telegramWebhook_default = router4;

// src/routes/swap.ts
var import_express5 = require("express");

// src/lib/swapExecution.ts
var import_viem7 = require("viem");
var CHAIN_ID = Number(process.env.CHAIN_ID || 137);
var UNIVERSAL_ROUTER_ADDRESS2 = process.env.UNISWAP_UNIVERSAL_ROUTER_ADDRESS || "0x8876789976decbfcbbbe364623c63652db8c0904";
var PERMIT2_ADDRESS = process.env.UNISWAP_PERMIT2_ADDRESS || "0x000000000022D473030F116dDEE9F6B43aC78BA3";
var ADDRESS_THIS_SENTINEL = "0x0000000000000000000000000000000000000002";
var SWAP_ROUTER_ABI = [
  {
    name: "exactInputSingle",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" }
        ]
      }
    ],
    outputs: [{ name: "amountOut", type: "uint256" }]
  },
  {
    name: "exactInput",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "path", type: "bytes" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" }
        ]
      }
    ],
    outputs: [{ name: "amountOut", type: "uint256" }]
  },
  {
    name: "multicall",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "deadline", type: "uint256" },
      { name: "data", type: "bytes[]" }
    ],
    outputs: [{ name: "results", type: "bytes[]" }]
  },
  {
    name: "unwrapWETH9",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "amountMinimum", type: "uint256" },
      { name: "recipient", type: "address" }
    ],
    outputs: []
  }
];
var UNIVERSAL_ROUTER_ABI = [
  {
    name: "execute",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" }
    ],
    outputs: []
  }
];
var V4_SWAP_COMMAND = "0x10";
function encodeV4Actions() {
  return "0x060c0f";
}
function buildV4SwapTx(v4Quote, amountInWei, amountOutMinimum) {
  const swapParams = (0, import_viem7.encodeAbiParameters)(
    [
      {
        type: "tuple",
        components: [
          {
            name: "poolKey",
            type: "tuple",
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" }
            ]
          },
          { name: "zeroForOne", type: "bool" },
          { name: "amountIn", type: "uint128" },
          { name: "amountOutMinimum", type: "uint128" },
          { name: "minHopPriceX36", type: "uint256" },
          { name: "hookData", type: "bytes" }
        ]
      }
    ],
    [
      {
        poolKey: v4Quote.poolKey,
        zeroForOne: v4Quote.zeroForOne,
        amountIn: amountInWei,
        amountOutMinimum,
        minHopPriceX36: 0n,
        hookData: "0x"
      }
    ]
  );
  const currencyIn = v4Quote.zeroForOne ? v4Quote.poolKey.currency0 : v4Quote.poolKey.currency1;
  const currencyOut = v4Quote.zeroForOne ? v4Quote.poolKey.currency1 : v4Quote.poolKey.currency0;
  const settleParams = (0, import_viem7.encodeAbiParameters)(
    [{ type: "address" }, { type: "uint256" }],
    [currencyIn, amountInWei]
  );
  const takeParams = (0, import_viem7.encodeAbiParameters)(
    [{ type: "address" }, { type: "uint256" }],
    [currencyOut, amountOutMinimum]
  );
  const v4SwapInput = (0, import_viem7.encodeAbiParameters)(
    [{ type: "bytes" }, { type: "bytes[]" }],
    [encodeV4Actions(), [swapParams, settleParams, takeParams]]
  );
  const deadline = BigInt(Math.floor(Date.now() / 1e3) + 1200);
  return {
    to: UNIVERSAL_ROUTER_ADDRESS2,
    data: (0, import_viem7.encodeFunctionData)({
      abi: UNIVERSAL_ROUTER_ABI,
      functionName: "execute",
      args: [V4_SWAP_COMMAND, [v4SwapInput], deadline]
    }),
    value: "0",
    chainId: CHAIN_ID
  };
}
function buildSwapPlan(quote, userAddress) {
  const amountOutMin = quote.amountOutWei * 99n / 100n;
  const approvals = [];
  if (quote.dexVersion === "V4" && quote.v4Quote) {
    if (!quote.fromToken.native) {
      approvals.push({
        to: quote.fromToken.address,
        data: (0, import_viem7.encodeFunctionData)({
          abi: import_viem7.erc20Abi,
          functionName: "approve",
          args: [PERMIT2_ADDRESS, quote.amountInWei]
        }),
        value: "0",
        chainId: CHAIN_ID
      });
    }
    const swapTx2 = buildV4SwapTx(quote.v4Quote, quote.amountInWei, amountOutMin);
    return {
      approvals,
      swap: swapTx2,
      quote,
      amountInBaseUnits: quote.amountIn
    };
  }
  if (!quote.fromToken.native) {
    const approvalData = (0, import_viem7.encodeFunctionData)({
      abi: import_viem7.erc20Abi,
      functionName: "approve",
      args: [quote.routerAddress, quote.amountInWei]
    });
    approvals.push({
      to: quote.fromToken.address,
      data: approvalData,
      value: "0",
      chainId: CHAIN_ID
    });
  }
  let swapTx;
  if (quote.routing === "v3-direct") {
    const isUnwrap = quote.toToken.native;
    const recipient = isUnwrap ? ADDRESS_THIS_SENTINEL : userAddress;
    const singleCalldata = (0, import_viem7.encodeFunctionData)({
      abi: SWAP_ROUTER_ABI,
      functionName: "exactInputSingle",
      args: [
        {
          tokenIn: quote.fromToken.address,
          tokenOut: quote.toToken.address,
          fee: quote.feeTier,
          recipient,
          amountIn: quote.amountInWei,
          amountOutMinimum: amountOutMin,
          sqrtPriceLimitX96: 0n
        }
      ]
    });
    if (isUnwrap) {
      const unwrapCalldata = (0, import_viem7.encodeFunctionData)({
        abi: SWAP_ROUTER_ABI,
        functionName: "unwrapWETH9",
        args: [amountOutMin, userAddress]
      });
      const deadline = BigInt(Math.floor(Date.now() / 1e3) + 1200);
      const multicallData = (0, import_viem7.encodeFunctionData)({
        abi: SWAP_ROUTER_ABI,
        functionName: "multicall",
        args: [deadline, [singleCalldata, unwrapCalldata]]
      });
      swapTx = {
        to: quote.routerAddress,
        data: multicallData,
        value: quote.fromToken.native ? quote.amountInWei.toString() : "0",
        chainId: CHAIN_ID
      };
    } else {
      swapTx = {
        to: quote.routerAddress,
        data: singleCalldata,
        value: quote.fromToken.native ? quote.amountInWei.toString() : "0",
        chainId: CHAIN_ID
      };
    }
  } else {
    const path = quote.path;
    const isUnwrap = quote.toToken.native;
    const recipient = isUnwrap ? ADDRESS_THIS_SENTINEL : userAddress;
    const inputCalldata = (0, import_viem7.encodeFunctionData)({
      abi: SWAP_ROUTER_ABI,
      functionName: "exactInput",
      args: [
        {
          path,
          recipient,
          amountIn: quote.amountInWei,
          amountOutMinimum: amountOutMin
        }
      ]
    });
    if (isUnwrap) {
      const unwrapCalldata = (0, import_viem7.encodeFunctionData)({
        abi: SWAP_ROUTER_ABI,
        functionName: "unwrapWETH9",
        args: [amountOutMin, userAddress]
      });
      const deadline = BigInt(Math.floor(Date.now() / 1e3) + 1200);
      const multicallData = (0, import_viem7.encodeFunctionData)({
        abi: SWAP_ROUTER_ABI,
        functionName: "multicall",
        args: [deadline, [inputCalldata, unwrapCalldata]]
      });
      swapTx = {
        to: quote.routerAddress,
        data: multicallData,
        value: quote.fromToken.native ? quote.amountInWei.toString() : "0",
        chainId: CHAIN_ID
      };
    } else {
      swapTx = {
        to: quote.routerAddress,
        data: inputCalldata,
        value: quote.fromToken.native ? quote.amountInWei.toString() : "0",
        chainId: CHAIN_ID
      };
    }
  }
  return {
    approvals,
    swap: swapTx,
    quote,
    amountInBaseUnits: quote.amountIn
  };
}

// src/routes/swap.ts
var import_viem8 = require("viem");
var router5 = (0, import_express5.Router)();
router5.post("/quote", async (req, res) => {
  try {
    const { fromToken, toToken, amountIn } = req.body || {};
    if (!fromToken || !toToken || !amountIn) {
      return res.status(400).json({ error: "Missing required parameters: fromToken, toToken, amountIn" });
    }
    const quote = await quoteSwap(String(fromToken), String(toToken), String(amountIn));
    if (!quote) {
      return res.status(404).json({ error: `No active pool or liquidity route found for ${fromToken} -> ${toToken}` });
    }
    return res.json({
      success: true,
      quote: {
        fromToken: quote.fromToken.symbol,
        fromTokenAddress: quote.fromToken.address,
        toToken: quote.toToken.symbol,
        toTokenAddress: quote.toToken.address,
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        priceImpactPct: quote.priceImpactPct,
        routing: quote.routing,
        feeTier: quote.feeTier,
        dexVersion: quote.dexVersion
      }
    });
  } catch (err) {
    console.error("[swap-route] Error generating quote:", err);
    return res.status(500).json({ error: err.message || "Failed to generate swap quote" });
  }
});
router5.post("/plan", async (req, res) => {
  try {
    const { fromToken, toToken, amountIn, userAddress } = req.body || {};
    if (!fromToken || !toToken || !amountIn || !userAddress) {
      return res.status(400).json({ error: "Missing required parameters: fromToken, toToken, amountIn, userAddress" });
    }
    if (!(0, import_viem8.isAddress)(String(userAddress))) {
      return res.status(400).json({ error: "Invalid EVM userAddress" });
    }
    const quote = await quoteSwap(String(fromToken), String(toToken), String(amountIn));
    if (!quote) {
      return res.status(404).json({ error: `No active pool or liquidity route found for ${fromToken} -> ${toToken}` });
    }
    const plan = buildSwapPlan(quote, userAddress);
    return res.json({
      success: true,
      plan: {
        approvals: plan.approvals,
        swap: plan.swap,
        amountIn: plan.amountInBaseUnits,
        expectedAmountOut: quote.amountOut,
        priceImpactPct: quote.priceImpactPct
      }
    });
  } catch (err) {
    console.error("[swap-route] Error generating swap plan:", err);
    return res.status(500).json({ error: err.message || "Failed to generate swap plan" });
  }
});
var swap_default = router5;

// src/routes/verify.ts
var import_express6 = require("express");

// src/integrations/virtuals/jsonSchema.ts
var VERIFICATION_REPORT_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://api.latticehood.app/api/v1/schema",
  title: "Lattice Verification Report",
  description: "Read-only token verification report. Every check is either available with a source and timestamp, or explicitly unavailable with a reason. An unavailable check is never returned as a passing value.",
  type: "object",
  required: [
    "schemaVersion",
    "address",
    "chain",
    "generatedAt",
    "checks",
    "sources",
    "disclaimer"
  ],
  properties: {
    schemaVersion: { type: "string", const: REPORT_SCHEMA_VERSION },
    address: { type: "string", pattern: "^0x[a-f0-9]{40}$" },
    chain: {
      type: "object",
      required: ["name", "chainId"],
      properties: {
        name: { type: "string" },
        chainId: { type: "integer" }
      }
    },
    generatedAt: { type: "string", format: "date-time" },
    token: {
      type: ["object", "null"],
      properties: {
        name: { type: "string" },
        symbol: { type: "string" }
      }
    },
    checks: {
      type: "object",
      required: [...ALL_CHECK_IDS],
      additionalProperties: { $ref: "#/$defs/check" }
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "queriedAt"],
        properties: {
          name: { type: "string", enum: ["codex.io", "dexscreener"] },
          queriedAt: { type: "string", format: "date-time" }
        }
      }
    },
    disclaimer: { type: "string" }
  },
  $defs: {
    check: {
      oneOf: [
        {
          type: "object",
          required: ["available", "value", "source", "fetchedAt"],
          properties: {
            available: { const: true },
            value: {},
            source: { type: "string", enum: ["codex.io", "dexscreener"] },
            fetchedAt: { type: "string", format: "date-time" }
          }
        },
        {
          type: "object",
          required: ["available", "reason"],
          properties: {
            available: { const: false },
            reason: {
              type: "string",
              enum: ["not_implemented", "no_data_from_source", "no_declared_baseline"]
            },
            plannedPhase: { type: "string" },
            note: { type: "string" }
          }
        }
      ]
    }
  }
};

// src/integrations/virtuals/acp/provider.ts
var import_acp_node_v2 = require("@virtuals-protocol/acp-node-v2");

// src/integrations/virtuals/acp/offering.ts
var OFFERING_NAME = "verifyToken";
var OFFERING_PRICE_USD = 0.01;

// src/integrations/virtuals/acp/provider.ts
var status = {
  enabled: false,
  connected: false,
  chainId: null,
  walletAddress: null,
  offering: { name: OFFERING_NAME, priceUsd: OFFERING_PRICE_USD },
  startedAt: null,
  lastError: null
};
function getAcpStatus() {
  return { ...status, offering: { ...status.offering } };
}

// src/routes/verify.ts
var router6 = (0, import_express6.Router)();
router6.get("/schema", (_req, res) => {
  res.status(200).json(VERIFICATION_REPORT_JSON_SCHEMA);
});
router6.get("/acp/status", (_req, res) => {
  res.status(200).json(getAcpStatus());
});
router6.get("/verify/:address", async (req, res) => {
  const address = String(req.params.address || "").trim();
  if (!isValidEvmAddress(address)) {
    res.status(400).json({
      error: "Valid Robinhood EVM contract address (0x...) is required.",
      schemaVersion: REPORT_SCHEMA_VERSION
    });
    return;
  }
  try {
    const metrics = await fetchTokenAuditData(address);
    if (!metrics) {
      res.status(404).json({
        error: `No indexed liquidity pool or trading pair found for ${address.toLowerCase()}.`,
        address: address.toLowerCase(),
        schemaVersion: REPORT_SCHEMA_VERSION
      });
      return;
    }
    res.status(200).json(buildVerificationReport(metrics));
  } catch (err) {
    const message = err?.message || "Failed to build verification report.";
    if (String(message).toLowerCase().includes("rate limit")) {
      res.status(429).json({ error: message, schemaVersion: REPORT_SCHEMA_VERSION });
      return;
    }
    res.status(502).json({ error: message, schemaVersion: REPORT_SCHEMA_VERSION });
  }
});
var verify_default = router6;

// src/middleware/rateLimit.ts
function defaultKey(req) {
  const wallet = req.user?.walletAddress;
  if (wallet) return `wallet:${wallet.toLowerCase()}`;
  return `ip:${req.ip || req.socket.remoteAddress || "unknown"}`;
}
function rateLimit({ windowMs, max, keyOf = defaultKey }) {
  const buckets = /* @__PURE__ */ new Map();
  let lastSweep = Date.now();
  function sweep(now) {
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }
  return function rateLimitMiddleware(req, res, next) {
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
      const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1e3));
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.status(429).json({
        error: `You've been rate limited. Try again in ${retryAfter}s.`
      });
      return;
    }
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - existing.count)));
    next();
  };
}

// src/app.ts
var app = (0, import_express7.default)();
app.set("trust proxy", 1);
app.use((0, import_cors.default)());
app.use(import_express7.default.json());
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[http] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});
var auditLimiter = rateLimit({ windowMs: 6e4, max: 240 });
var agentLimiter = rateLimit({ windowMs: 6e4, max: 480 });
app.use("/health", health_default);
app.use("/auth", auth_default);
app.use("/api/audit", auditLimiter, audit_default);
app.use("/api/webhook/telegram", telegramWebhook_default);
app.use("/api/swap", swap_default);
app.use("/api/v1", agentLimiter, verify_default);

// src/serverless.ts
var serverless_default = app;
