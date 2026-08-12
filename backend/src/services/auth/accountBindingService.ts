import { pool } from "../../db/index";

export interface XAccountBinding {
  walletAddress: string;
  xUserId: string;
  xHandle: string;
}

export interface TelegramAccountBinding {
  walletAddress: string;
  telegramUserId: string;
  telegramUsername?: string;
}

async function queryWithTimeout(text: string, params: any[], ms = 1000) {
  return Promise.race([
    pool.query(text, params),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Query timeout")), ms)
    ),
  ]);
}

/**
 * Get linked X account by wallet address (case-insensitive)
 */
export async function getLinkedXAccountByWallet(walletAddress: string): Promise<XAccountBinding | null> {
  try {
    const { rows } = await queryWithTimeout(
      "SELECT wallet_address, x_user_id, x_handle FROM x_accounts WHERE LOWER(wallet_address) = LOWER($1)",
      [walletAddress]
    );
    if (rows.length === 0) return null;
    return {
      walletAddress: rows[0].wallet_address,
      xUserId: rows[0].x_user_id,
      xHandle: rows[0].x_handle,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Get wallet address bound to an X User ID
 */
export async function getWalletByXUserId(xUserId: string): Promise<string | null> {
  try {
    const { rows } = await queryWithTimeout(
      "SELECT wallet_address FROM x_accounts WHERE x_user_id = $1",
      [xUserId]
    );
    return rows.length === 0 ? null : rows[0].wallet_address;
  } catch (err) {
    return null;
  }
}

/**
 * Get wallet address bound to an X handle (case-insensitive)
 */
export async function getWalletByXHandle(handle: string): Promise<string | null> {
  try {
    const normalized = handle.replace(/^@/, "").toLowerCase();
    const { rows } = await queryWithTimeout(
      "SELECT wallet_address FROM x_accounts WHERE LOWER(x_handle) = $1",
      [normalized]
    );
    return rows.length === 0 ? null : rows[0].wallet_address;
  } catch (err) {
    return null;
  }
}

/**
 * Bind/Link an X account to a verified EVM wallet address (Enforces 1:1 binding)
 */
export async function linkXAccount(
  walletAddress: string,
  xUserId: string,
  xHandle: string
): Promise<void> {
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

/**
 * Get linked Telegram account by wallet address
 */
export async function getLinkedTelegramAccountByWallet(walletAddress: string): Promise<TelegramAccountBinding | null> {
  try {
    const { rows } = await queryWithTimeout(
      "SELECT wallet_address, telegram_user_id, telegram_username FROM telegram_accounts WHERE LOWER(wallet_address) = LOWER($1)",
      [walletAddress]
    );
    if (rows.length === 0) return null;
    return {
      walletAddress: rows[0].wallet_address,
      telegramUserId: rows[0].telegram_user_id,
      telegramUsername: rows[0].telegram_username,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Get wallet address bound to a Telegram User ID
 */
export async function getWalletByTelegramUserId(telegramUserId: string): Promise<string | null> {
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

/**
 * Bind/Link a Telegram account to a verified EVM wallet address (Enforces 1:1 binding)
 */
export async function linkTelegramAccount(
  walletAddress: string,
  telegramUserId: string,
  telegramUsername?: string
): Promise<void> {
  const normalizedWallet = walletAddress.toLowerCase();
  await pool.query(
    `INSERT INTO telegram_accounts (wallet_address, telegram_user_id, telegram_username)
     VALUES ($1, $2, $3)
     ON CONFLICT (wallet_address) DO UPDATE 
     SET telegram_user_id = EXCLUDED.telegram_user_id, telegram_username = EXCLUDED.telegram_username`,
    [normalizedWallet, telegramUserId, telegramUsername || null]
  );
}
