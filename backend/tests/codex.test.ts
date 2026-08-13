import { describe, expect, it } from "bun:test";
import { fetchTokenAuditData } from "../src/services/codex";
import { isValidEvmAddress } from "../src/services/dexscreener";

describe("Codex API Audit Engine Service", () => {
  it("should return token audit metrics for valid Robinhood EVM address (EL GATO)", async () => {
    const gatoAddress = "0x3b7157B6409380E09A131b631dFb8dFD2781D9cc";
    expect(isValidEvmAddress(gatoAddress)).toBe(true);

    const metrics = await fetchTokenAuditData(gatoAddress);
    expect(metrics).not.toBeNull();
    if (metrics) {
      expect(metrics.address.toLowerCase()).toBe(gatoAddress.toLowerCase());
      expect(metrics.symbol).toBe("GATO");
      expect(metrics.priceUsd).toBeGreaterThan(0);
      expect(metrics.liquidityUsd).toBeGreaterThan(0);
      expect(metrics.buys24h).toBeGreaterThan(0);
    }
  });

  it("should reject non-EVM address gracefully", async () => {
    const invalidAddress = "invalid_non_evm_address";
    expect(isValidEvmAddress(invalidAddress)).toBe(false);
    expect(fetchTokenAuditData(invalidAddress)).rejects.toThrow();
  });
});
