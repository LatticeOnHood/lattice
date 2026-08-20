import { describe, expect, it } from "bun:test";
import request from "supertest";
import { app } from "../src/app";
import { DexScreenerTokenMetrics } from "../src/services/dexscreener";
import { buildVerificationReport } from "../src/integrations/virtuals/buildReport";
import { evaluateReport } from "../src/integrations/virtuals/evaluator";
import { REPORT_SCHEMA_VERSION, isAvailable } from "../src/integrations/virtuals/reportSchema";

const AT = "2026-08-14T12:00:00.000Z";

function metrics(overrides: Partial<DexScreenerTokenMetrics> = {}): DexScreenerTokenMetrics {
  return {
    address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
    name: "Example Token",
    symbol: "EXMPL",
    priceUsd: 0.0042,
    priceNative: "$0.004200",
    marketCap: 4_200_000,
    fdv: 4_200_000,
    liquidityUsd: 310_000,
    volume24h: 88_000,
    priceChange24h: -3.5,
    buys24h: 120,
    sells24h: 90,
    dexId: "uniswap",
    pairAddress: "0xpair",
    dataSource: "codex.io",
    ...overrides,
  };
}

describe("buildVerificationReport — market checks", () => {
  it("marks indexed market data available with source and timestamp", () => {
    const report = buildVerificationReport(metrics(), { generatedAt: AT });

    expect(report.schemaVersion).toBe(REPORT_SCHEMA_VERSION);
    expect(report.chain).toEqual({ name: "Robinhood Chain", chainId: 4663 });
    expect(report.address).toBe("0x5fc5360d0400a0fd4f2af552add042d716f1d168");

    const liquidity = report.checks.liquidityUsd;
    expect(isAvailable(liquidity)).toBe(true);
    if (isAvailable(liquidity)) {
      expect(liquidity.value).toBe(310_000);
      expect(liquidity.source).toBe("codex.io");
      expect(liquidity.fetchedAt).toBe(AT);
    }

    const txns = report.checks.txns24h;
    if (isAvailable(txns)) {
      expect(txns.value).toEqual({ buys: 120, sells: 90 });
    }
  });

  it("keeps a genuine zero rather than treating it as missing data", () => {
    const report = buildVerificationReport(metrics({ liquidityUsd: 0 }), { generatedAt: AT });
    const liquidity = report.checks.liquidityUsd;

    expect(isAvailable(liquidity)).toBe(true);
    if (isAvailable(liquidity)) expect(liquidity.value).toBe(0);
  });

  it("attributes provenance to the indexer that answered", () => {
    const report = buildVerificationReport(metrics({ dataSource: "dexscreener" }), {
      generatedAt: AT,
    });

    expect(report.sources).toEqual([{ name: "dexscreener", queriedAt: AT }]);
  });
});

describe("buildVerificationReport — the no-handwaving rule", () => {
  it("never returns a passing value for a check it could not establish", () => {
    // No on-chain facts supplied: nothing here may resolve to a value at all.
    const report = buildVerificationReport(metrics(), { generatedAt: AT });

    for (const id of ["lpLocked", "honeypot", "ownershipRenounced", "mintDisabled", "sourceVerified"] as const) {
      expect(report.checks[id].available).toBe(false);
    }
  });

  it("still marks LP lock as unshipped rather than unknown", () => {
    const check = buildVerificationReport(metrics(), { generatedAt: AT }).checks.lpLocked;

    expect(check.available).toBe(false);
    if (!isAvailable(check)) {
      expect(check.reason).toBe("not_implemented");
      expect(check.plannedPhase).toBe("01");
    }
  });

  it("treats a missing owner function as unknown, never as renounced", () => {
    const report = buildVerificationReport(metrics(), {
      generatedAt: AT,
      onchain: { owner: { kind: "no_owner_function" } },
    });
    const check = report.checks.ownershipRenounced;

    // The trap this guards: a reverting owner() reads as "no owner", which is
    // not the same as ownership having been renounced.
    expect(check.available).toBe(false);
    if (!isAvailable(check)) expect(check.reason).toBe("no_data_from_source");
  });

  it("reports ownership renounced only when the owner is explicitly the zero address", () => {
    const renounced = buildVerificationReport(metrics(), {
      generatedAt: AT,
      onchain: { owner: { kind: "renounced" } },
    }).checks.ownershipRenounced;
    expect(renounced.available).toBe(true);
    if (isAvailable(renounced)) expect(renounced.value).toBe(true);

    const owned = buildVerificationReport(metrics(), {
      generatedAt: AT,
      onchain: { owner: { kind: "owned" } },
    }).checks.ownershipRenounced;
    expect(owned.available).toBe(true);
    if (isAvailable(owned)) expect(owned.value).toBe(false);
  });

  it("does not claim minting is impossible from a bytecode scan alone", () => {
    const check = buildVerificationReport(metrics(), {
      generatedAt: AT,
      onchain: { bytecode: { hasMint: false } },
    }).checks.mintDisabled;

    // Absence of a selector is evidence, not proof — it must stay unavailable.
    expect(check.available).toBe(false);
    if (!isAvailable(check)) expect(check.note).toContain("not proof");
  });

  it("flags a blocked transfer as honeypot-shaped once the layout resolved", () => {
    const blocked = buildVerificationReport(metrics(), {
      generatedAt: AT,
      onchain: { sell: { transferOk: false, balanceSlot: "0x0" } },
    }).checks.honeypot;
    expect(blocked.available).toBe(true);
    if (isAvailable(blocked)) expect(blocked.value).toBe(true);

    const clean = buildVerificationReport(metrics(), {
      generatedAt: AT,
      onchain: { sell: { transferOk: true, sellOk: true, balanceSlot: "0x0" } },
    }).checks.honeypot;
    expect(clean.available).toBe(true);
    if (isAvailable(clean)) expect(clean.value).toBe(false);
  });

  it("leaves honeypot unavailable when the balance slot could not be found", () => {
    const check = buildVerificationReport(metrics(), {
      generatedAt: AT,
      onchain: { sell: { transferOk: false } },
    }).checks.honeypot;

    // A failed simulation must not read as a failed sell test.
    expect(check.available).toBe(false);
  });

  it("reports promisesKept as having no declared baseline, not as a failure", () => {
    const report = buildVerificationReport(metrics(), { generatedAt: AT });
    const check = report.checks.promisesKept;

    expect(check.available).toBe(false);
    if (!isAvailable(check)) {
      expect(check.reason).toBe("no_declared_baseline");
      expect(check.plannedPhase).toBe("04");
    }
  });

  it("marks distribution data unavailable when the indexer omitted it", () => {
    const report = buildVerificationReport(metrics(), { generatedAt: AT });

    expect(report.checks.holderCount.available).toBe(false);
    expect(report.checks.top10HoldersPct.available).toBe(false);
    if (!isAvailable(report.checks.holderCount)) {
      expect(report.checks.holderCount.reason).toBe("no_data_from_source");
    }
  });

  it("suppresses a defaulted 0% dev holding when no creator wallet was identified", () => {
    const report = buildVerificationReport(metrics({ devHoldingsPct: 0, devBuys: 0, devSells: 0 }), {
      generatedAt: AT,
    });

    expect(report.checks.devHoldingsPct.available).toBe(false);
    expect(report.checks.devTxns.available).toBe(false);
  });

  it("reports dev holdings once a creator wallet is known", () => {
    const report = buildVerificationReport(
      metrics({ creatorAddress: "0xdead", devHoldingsPct: 4.2, devBuys: 3, devSells: 1 }),
      { generatedAt: AT }
    );

    const holdings = report.checks.devHoldingsPct;
    expect(isAvailable(holdings)).toBe(true);
    if (isAvailable(holdings)) expect(holdings.value).toBe(4.2);

    const txns = report.checks.devTxns;
    if (isAvailable(txns)) expect(txns.value).toEqual({ buys: 3, sells: 1 });
  });
});

describe("evaluateReport — the evidence gate", () => {
  const report = buildVerificationReport(
    metrics({ holdersCount: 2841, top10HoldersPct: 31.4 }),
    { generatedAt: AT }
  );
  const justAfter = new Date("2026-08-14T12:00:30.000Z");

  it("passes when every required check is available and fresh", () => {
    const result = evaluateReport(
      report,
      { require: ["liquidityUsd", "top10HoldersPct"], maxAgeSeconds: 300 },
      justAfter
    );

    expect(result.pass).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.stale).toEqual([]);
  });

  it("halts and names the unavailable checks", () => {
    const result = evaluateReport(
      report,
      { require: ["liquidityUsd", "honeypot", "lpLocked"] },
      justAfter
    );

    expect(result.pass).toBe(false);
    expect(result.missing).toEqual(["honeypot", "lpLocked"]);
    expect(result.reasons.some((r) => r.includes("not_implemented"))).toBe(true);
    expect(result.reasons.some((r) => r.includes("planned phase 01"))).toBe(true);
  });

  it("flags a required check that is available but stale", () => {
    const muchLater = new Date("2026-08-14T13:00:00.000Z");
    const result = evaluateReport(
      report,
      { require: ["liquidityUsd"], maxAgeSeconds: 300 },
      muchLater
    );

    expect(result.pass).toBe(false);
    expect(result.stale).toEqual(["liquidityUsd"]);
    expect(result.missing).toEqual([]);
  });

  it("rejects a schema major version the caller does not understand", () => {
    const result = evaluateReport(report, { expectSchemaMajor: 2 }, justAfter);

    expect(result.pass).toBe(false);
    expect(result.reasons[0]).toContain("Schema major version mismatch");
  });

  it("passes trivially when nothing is required", () => {
    expect(evaluateReport(report, {}, justAfter).pass).toBe(true);
  });
});

describe("GET /api/v1", () => {
  it("serves the JSON Schema for the report", async () => {
    const res = await request(app).get("/api/v1/schema");

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Lattice Verification Report");
    expect(res.body.properties.schemaVersion.const).toBe(REPORT_SCHEMA_VERSION);
    expect(res.body.properties.checks.required).toContain("honeypot");
  });

  it("rejects a malformed contract address without calling an indexer", async () => {
    const res = await request(app).get("/api/v1/verify/not-an-address");

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Robinhood EVM contract address");
  });
});
