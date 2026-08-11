import { describe, expect, it } from "bun:test";
import request from "supertest";
import { app } from "../src/app";

describe("GET /health", () => {
  it("should return status 200 with ok status and ISO timestamp", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("timestamp");
    expect(response.body).toHaveProperty("service", "lattice-backend");

    const timestamp = new Date(response.body.timestamp);
    expect(isNaN(timestamp.getTime())).toBe(false);
  });
});
