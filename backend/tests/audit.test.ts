import { describe, expect, it } from "bun:test";
import request from "supertest";
import { app } from "../src/app";
import { isValidEvmAddress } from "../src/services/dexscreener";
import { extractEvmAddress } from "../src/services/groq";
import { processTelegramMessage } from "../src/bots/telegramBot";
import { processTwitterMention } from "../src/bots/twitterBot";
import { splitTweetContent } from "../src/templates/cardRenderer";

describe("EVM Address Validation & Parsing", () => {
  it("isValidEvmAddress should return true for valid 40-hex EVM addresses", () => {
    expect(isValidEvmAddress("0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168")).toBe(true);
    expect(isValidEvmAddress("0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73")).toBe(true);
  });

  it("isValidEvmAddress should return false for non-EVM or invalid addresses", () => {
    expect(isValidEvmAddress("invalid_address")).toBe(false);
    expect(isValidEvmAddress("SolanaAddress111111111111111111111111")).toBe(false);
  });

  it("extractEvmAddress should extract EVM 0x address from natural text", () => {
    const text = "Please audit token 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 thanks";
    expect(extractEvmAddress(text)).toBe("0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168");
  });
});

describe("Tweet Content Splitting for X Threads", () => {
  it("splitTweetContent should return 1 chunk if text <= 280 chars", () => {
    const text = "Short tweet under 280 chars.";
    const chunks = splitTweetContent(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it("splitTweetContent should split long text into thread chunks with suffix", () => {
    const longText = "Line 1: Audit report details for long token query.\n".repeat(10);
    const chunks = splitTweetContent(longText);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain("(continued audit in thread 🧵)");
    expect(chunks[0].length).toBeLessThanOrEqual(280);
  });
});

describe("POST /api/audit Route", () => {
  it("should return 400 for missing or invalid EVM address", async () => {
    const res = await request(app).post("/api/audit").send({ address: "invalid" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should return 400 when non-EVM address is passed in message", async () => {
    const res = await request(app).post("/api/audit").send({ message: "Check this SolanaAddress111111111111111111111111" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("1:1 Account Binding Bot Guard Authorization", () => {
  it("processTelegramMessage should return unlinked account notice for unlinked Telegram user", async () => {
    const response = await processTelegramMessage({
      messageId: 1,
      chatId: 100,
      userId: "unlinked_tg_user_999",
      text: "/audit 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
    });

    expect(response).toContain("Account Not Linked");
    expect(response).toContain("https://latticehood.app/connect");
  });

  it("processTwitterMention should return null (silently ignore) for unlinked X user", async () => {
    const response = await processTwitterMention({
      tweetId: "1001",
      authorXUserId: "unlinked_x_user_999",
      text: "@LatticeBot 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
    });

    expect(response).toBeNull();
  });
});
