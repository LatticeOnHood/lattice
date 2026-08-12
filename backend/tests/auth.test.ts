import { describe, expect, it } from "bun:test";
import request from "supertest";
import { app } from "../src/app";

describe("Authentication & Account Binding Routes", () => {
  it("POST /auth/signin should return 400 if required parameters are missing", async () => {
    const res = await request(app).post("/auth/signin").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /auth/signin should return 401 for an invalid signature", async () => {
    const res = await request(app).post("/auth/signin").send({
      walletAddress: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
      signature: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b",
      message: "Welcome to Lattice!",
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /auth/telegram/bind should return 400 if required fields are missing", async () => {
    const res = await request(app).post("/auth/telegram/bind").send({
      walletAddress: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
