import { describe, expect, it } from "bun:test";
import request from "supertest";
import { app } from "../src/app";
import { verifyTelegramWidgetAuth, verifyTelegramInitData } from "../src/services/auth/telegramAuth";

describe("Telegram Cryptographic Auth Verification", () => {
  it("verifyTelegramWidgetAuth should return false for invalid hash payload", () => {
    const invalidPayload = {
      id: 12345678,
      first_name: "Alice",
      username: "alice_crypto",
      auth_date: 1785148800,
      hash: "invalid_hash_string",
    };
    expect(verifyTelegramWidgetAuth(invalidPayload, "fake_bot_token")).toBe(false);
  });

  it("verifyTelegramInitData should return false for invalid initData string", () => {
    expect(verifyTelegramInitData("query_id=123&user=%7B%22id%22%3A123%7D&hash=invalid", "fake_bot_token")).toBe(false);
  });
});

describe("Telegram Webhook & Widget Endpoints", () => {
  it("POST /auth/telegram/widget should return 400 when missing required body fields", async () => {
    const res = await request(app).post("/auth/telegram/widget").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/webhook/telegram should return 200 OK fast ACK", async () => {
    const res = await request(app).post("/api/webhook/telegram").send({
      update_id: 10001,
      message: {
        message_id: 50,
        from: { id: 99999, username: "testuser" },
        chat: { id: 99999 },
        text: "/help",
      },
    });

    expect(res.status).toBe(200);
  });
});
