import { createHmac, createHash } from "crypto";

export interface TelegramAuthData {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
}

/**
 * Validates Telegram Login Widget auth data payload using HMAC-SHA256
 * Spec: https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramWidgetAuth(data: Record<string, any>, botToken: string): boolean {
  if (!data || !data.hash || !botToken) return false;

  const { hash, ...rest } = data;

  // 1. Filter out null/undefined/empty and sort keys alphabetically
  const dataCheckString = Object.keys(rest)
    .filter((key) => rest[key] !== undefined && rest[key] !== null)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("\n");

  // 2. Secret key is SHA256 of botToken
  const secretKey = createHash("sha256").update(botToken).digest();

  // 3. Calculated hash is HMAC-SHA256 of dataCheckString using secretKey
  const calculatedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return calculatedHash === hash;
}

/**
 * Validates Telegram WebApp initData string using HMAC-SHA256
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
export function verifyTelegramInitData(initDataStr: string, botToken: string): boolean {
  if (!initDataStr || !botToken) return false;

  const urlParams = new URLSearchParams(initDataStr);
  const hash = urlParams.get("hash");
  if (!hash) return false;

  urlParams.delete("hash");

  // Sort keys alphabetically
  const dataCheckArr: string[] = [];
  urlParams.forEach((val, key) => {
    dataCheckArr.push(`${key}=${val}`);
  });
  dataCheckArr.sort();

  const dataCheckString = dataCheckArr.join("\n");

  // Secret key is HMAC-SHA256 of botToken with key "WebAppData"
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();

  const calculatedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return calculatedHash === hash;
}
